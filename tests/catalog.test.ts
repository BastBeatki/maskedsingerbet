import { test } from 'node:test';
import assert from 'node:assert/strict';
import document from '../data/promi-catalog-2026-09-30.json';
import manifest from '../data/promi-image-manifest.json';
import { extractCatalog, getCatalog, filterCatalog, participationKey, maskKey, catalogImages, resolveImageAsset } from '../catalog';
import fs from 'node:fs';
import crypto from 'node:crypto';

test('all 134 original rows, all fields and unknown identities survive the adapter', () => {
  const catalog = getCatalog();
  assert.deepEqual(catalog.rows, document.records);
  assert.equal(catalog.asOf, '2026-09-30');
  assert.equal(catalog.rows.filter(row => row.celebrity_name === null).length, 8);
  assert.ok(Object.isFrozen(catalog.rows) && catalog.rows.every(Object.isFrozen));
});
test('participation keys stay unique; shared mask keys preserve duo/special cases', () => {
  const rows = getCatalog().rows;
  assert.equal(new Set(rows.map(participationKey)).size, 134);
  assert.equal(new Set(rows.map(maskKey)).size, 127);
  assert.equal(filterCatalog(rows, 'mysterium', '10').length, 6);
});
test('search supports accent-insensitive names, masks and AND terms', () => {
  const rows = getCatalog().rows;
  assert.ok(filterCatalog(rows, 'bulent').some(row => row.celebrity_name === 'Bülent Ceylan'));
  assert.equal(filterCatalog(rows, 'max astronaut').length, 1);
  assert.equal(filterCatalog(rows, 'nothing-matches').length, 0);
});
test('season filter keeps all known and unknown season-13 rows', () => {
  assert.equal(filterCatalog(getCatalog().rows, '', '13').length, 12);
  assert.ok(filterCatalog(getCatalog().rows, '', '1').every(row => row.season === 1));
});
test('filter and sorting never mutate the source order or content', () => {
  const rows = getCatalog().rows;
  const before = JSON.stringify(rows);
  filterCatalog(rows, '', 'all');
  assert.equal(JSON.stringify(rows), before);
});
test('manifest covers every mask and participation with explicit optional fallbacks', () => {
  assert.equal(Object.keys(manifest.masks).length, 127);
  assert.equal(Object.keys(manifest.celebrities).length, 134);
  for (const row of getCatalog().rows) {
    assert.ok(Object.hasOwn(manifest.masks, maskKey(row)));
    assert.ok(Object.hasOwn(manifest.celebrities, participationKey(row)));
    if (row.celebrity_name === null) assert.equal(catalogImages(row).celebrity, null);
  }
});

test('reviewed first batch covers all four known season-13 people; unknown people stay unknown', () => {
  const rows = getCatalog().rows.filter(row => row.season === 13);
  assert.equal(rows.filter(row => row.celebrity_name !== null).length, 4);
  for (const row of rows) {
    assert.equal(Boolean(catalogImages(row).celebrity), row.celebrity_name !== null);
    assert.equal(catalogImages(row).mask, null);
  }
});

test('all installed image files match their hashes and have complete credit/license information', () => {
  const assets = Object.values(manifest.celebrities).filter(Boolean);
  assert.equal(assets.length, 4);
  for (const asset of assets) {
    assert.ok(resolveImageAsset(asset));
    const bytes = fs.readFileSync(new URL('../public' + asset!.src, import.meta.url));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), asset!.sha256);
    assert.equal(bytes.length, asset!.bytes);
    assert.ok(bytes.length < 180_000 && asset!.width <= 512 && asset!.height <= 512);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  }
});

test('missing, unreviewed or unsafe image entries resolve to a fallback', () => {
  const asset = Object.values(manifest.celebrities).find(Boolean)!;
  for (const invalid of [null, 'broken', {}, { ...asset, author: '' }, { ...asset, licenseStatus: 'UNVERIFIED' },
    { ...asset, src: 'https://example.com/image.webp' }, { ...asset, src: '/catalog-images/../secret.webp' },
    { ...asset, licenseUrl: 'javascript:alert(1)' }]) assert.equal(resolveImageAsset(invalid), null);
});
test('truncated data or inconsistent record-count metadata fails visibly', () => {
  assert.throws(() => extractCatalog({ ...document, records: document.records.slice(1) }));
  assert.throws(() => extractCatalog({ ...document, _record_count: 133 }));
});
test('missing fields and duplicate participation identities are rejected', () => {
  const bad = structuredClone(document);
  delete (bad.records[0] as any).primary_source;
  assert.throws(() => extractCatalog(bad));
  assert.throws(() => extractCatalog({ ...document, records: document.records.map((row, index) => index === 1 ? document.records[0] : row) }));
});
