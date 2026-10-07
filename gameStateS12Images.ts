import { getCatalog, maskKey, participationKey, type ImageAsset } from './catalog';
import type { Season } from './types';

// Existing private save images stay local. These aliases affect display mapping only.
const normalize = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const maskName = (name: string) => normalize(name) === 'smile' ? 'smiley' : normalize(name);
const embeddedImage = (src: unknown): src is string => typeof src === 'string' && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(src);
const image = (src: string, title: string): ImageAsset => ({ src, title, source: '', rights: 'Rechte ungeklärt', licenseUrl: '', author: '', authorUrl: '',
  changes: 'Unverändert aus deinem lokalen Spielstand', sourceType: 'USER_GAMESTATE', licenseStatus: 'RIGHTS_UNRESOLVED' });

export function gameStateS12Images(seasons: readonly Season[]): { masks: ReadonlyMap<string, ImageAsset>; celebrities: ReadonlyMap<string, ImageAsset> } {
  const masks = new Map<string, ImageAsset>(), celebrities = new Map<string, ImageAsset>();
  const rows = getCatalog().rows.filter(row => row.season === 12);
  const canonical = new Set(rows.map(row => maskName(row.mask_name)));
  const candidates = seasons.filter(season => ['Staffel 2025', 'Staffel 12'].includes(season.seasonName) &&
    new Set(season.masks.map(mask => maskName(mask.name)).filter(name => canonical.has(name))).size >= 7);
  if (candidates.length !== 1) return { masks, celebrities };
  for (const row of rows) {
    const matches = candidates[0].masks.filter(mask => maskName(mask.name) === maskName(row.mask_name));
    if (matches.length !== 1) continue;
    const mask = matches[0];
    if (embeddedImage(mask.imageUrl)) masks.set(maskKey(row), image(mask.imageUrl, row.mask_name));
    const actual = normalize(mask.revealedCelebrity ?? '');
    const samePerson = actual === normalize(row.celebrity_name ?? '') ||
      (row.mask_name === 'Dude' && row.celebrity_name === 'Evil Jared Hasselhoff' && actual === 'jaredeviljaredhasselhoff');
    if (mask.isRevealed && row.celebrity_name && samePerson && embeddedImage(mask.celebrityImageUrl)) {
      celebrities.set(participationKey(row), image(mask.celebrityImageUrl, row.celebrity_name));
    }
  }
  return { masks, celebrities };
}
