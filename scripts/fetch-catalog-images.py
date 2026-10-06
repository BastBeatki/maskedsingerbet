"""Fetch a reviewed Commons batch, verify its recorded license, then update the existing manifest.

Developer tool only: Python 3 + Pillow. No network calls or Python in the app.
Usage: python scripts/fetch-catalog-images.py data/image-batches/season13.json
An explicit reviewed mapping is required; search results are never auto-published.
"""
import hashlib
import html
import io
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
UA = 'JarvisCatalogImages/1.0 (https://github.com/BastBeatki/maskedsingerbet)'

def fetch(url):
    if urlparse(url).scheme != 'https' or urlparse(url).hostname not in {
        'commons.wikimedia.org', 'upload.wikimedia.org', 'thumb.wikimedia.org'
    }:
        raise ValueError('Unapproved source host')
    with urlopen(Request(url, headers={'User-Agent': UA}), timeout=25) as response:
        if urlparse(response.url).hostname not in {'commons.wikimedia.org', 'upload.wikimedia.org', 'thumb.wikimedia.org'}:
            raise ValueError('Unapproved redirect')
        content = response.read(12_000_001)
        if len(content) > 12_000_000:
            raise ValueError('Image/metadata exceeds download limit')
        return content

def plain(value):
    return html.unescape(re.sub('<[^>]+>', '', value)).strip()

def main():
    batch_path = Path(sys.argv[1]).resolve()
    batch = json.loads(batch_path.read_text(encoding='utf-8'))
    manifest_path = ROOT / 'data/promi-image-manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    rows = json.loads((ROOT / 'data/promi-catalog-2026-09-30.json').read_text(encoding='utf-8'))['records']
    output = ROOT / 'public/catalog-images'
    output.mkdir(parents=True, exist_ok=True)
    prepared = []
    for entry in batch['assets']:
        assert entry['identityReviewed'] is True and entry['licenseReviewed'] is True
        assert any(r['celebrity_name'] == entry['name'] for r in rows)
        assert re.fullmatch('[a-z0-9-]+', entry['id'])
        api = 'https://commons.wikimedia.org/w/api.php?' + urlencode({
            'action': 'query', 'format': 'json', 'titles': entry['file'], 'prop': 'imageinfo',
            'iiprop': 'url|extmetadata|sha1', 'iiurlwidth': 512,
        })
        pages = json.loads(fetch(api))['query']['pages']
        info = next(iter(pages.values()))['imageinfo'][0]
        if info['sha1'] != entry['expectedOriginalSha1']:
            raise ValueError(f"Source image revision changed for {entry['name']}; review it again")
        metadata = info['extmetadata']
        value = lambda key: plain(metadata.get(key, {}).get('value', ''))
        license_url = value('LicenseUrl').replace('http://', 'https://')
        # Exact license URL from the reviewed file page; stop on changed/ambiguous licensing.
        if license_url.rstrip('/') != entry['licenseUrl'].rstrip('/'):
            raise ValueError(f"License changed for {entry['name']}: {license_url}")
        if value('LicenseShortName') != entry['license']:
            raise ValueError('License name does not match reviewed source')
        assert value('Artist') and info['descriptionurl'].startswith('https://commons.wikimedia.org/wiki/File:')
        download_url = info.get('thumburl', info['url'])
        raw = fetch(download_url)
        image = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert('RGB')
        image.thumbnail((512, 512), Image.Resampling.LANCZOS)
        encoded = io.BytesIO()
        image.save(encoded, 'WEBP', quality=82, method=6)
        content = encoded.getvalue()
        assert len(content) <= 180_000
        asset = {
            'src': f"/catalog-images/{entry['id']}.webp", 'source': info['descriptionurl'],
            'rights': entry['license'], 'licenseUrl': entry['licenseUrl'],
            'author': entry['author'], 'authorUrl': entry['authorUrl'], 'title': info.get('title', entry['file'][5:]),
            'changes': 'Auf maximal 512 px verkleinert, als WebP komprimiert; kein zusätzlicher Ausschnitt.',
            'licenseStatus': 'FILE_LICENSE_REVIEWED', 'reviewedAt': batch['reviewedAt'],
            'downloadedAt': datetime.now(timezone.utc).isoformat(),
            'description': value('ImageDescription'), 'commonsArtist': value('Artist'),
            'originalSha1': info['sha1'], 'sha256': hashlib.sha256(content).hexdigest(),
            'width': image.width, 'height': image.height, 'bytes': len(content),
            'downloadSource': download_url,
        }
        prepared.append((entry, asset, content))
        print(f"Prepared {entry['name']}: {image.width}x{image.height}, {len(content)} bytes", flush=True)
    # Manifest changes only once the entire reviewed batch has passed validation/download.
    for entry, asset, content in prepared:
        (output / f"{entry['id']}.webp").write_bytes(content)
        for row in rows:
            if row['celebrity_name'] == entry['name']:
                key = json.dumps([row['season'], row['mask_name'], row['celebrity_name']], ensure_ascii=False, separators=(',', ':'))
                assert key in manifest['celebrities']
                manifest['celebrities'][key] = asset
    manifest['version'] = 2
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"Installed {len(prepared)} reviewed assets; catalog and game state unchanged.")

if __name__ == '__main__':
    main()
