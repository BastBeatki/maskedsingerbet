import document from './data/promi-catalog-2026-09-30.json';
import manifest from './data/promi-image-manifest.json';

export interface Participation {
  readonly season: number;
  readonly mask_name: string;
  readonly celebrity_name: string | null;
  readonly placement: number | null;
  readonly result: string;
  readonly reveal_episode: number | null;
  readonly reveal_date: string | null;
  readonly special_case: string | null;
  readonly notes: string | null;
  readonly primary_source: string;
  readonly secondary_source: string;
}
export const participationKey = (row: Participation) => JSON.stringify([row.season, row.mask_name, row.celebrity_name]);
export const maskKey = (row: Participation) => JSON.stringify([row.season, row.mask_name]);
export const normalizeSearchText = (text: unknown) => String(text ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('de-DE').trim();

export function extractCatalog(value: unknown) {
  const data = value as typeof document;
  if (!data || data._record_count !== 134 || !Array.isArray(data.records) || data.records.length !== 134) {
    throw new Error('Katalog unvollständig: Erwartet werden 134 Teilnahmezeilen.');
  }
  for (const row of data.records) {
    if (!row || !Number.isInteger(row.season) || typeof row.mask_name !== 'string' ||
      !['result', 'primary_source', 'secondary_source'].every(key => typeof row[key] === 'string') ||
      !['celebrity_name', 'reveal_date', 'special_case', 'notes'].every(key => row[key] === null || typeof row[key] === 'string') ||
      !['placement', 'reveal_episode'].every(key => row[key] === null || typeof row[key] === 'number')) {
      throw new Error('Ungültige Teilnahmezeile im Katalog.');
    }
  }
  const rows: readonly Participation[] = Object.freeze(data.records.map(row => Object.freeze({ ...row })));
  if (new Set(rows.map(participationKey)).size !== rows.length) throw new Error('Doppelte Teilnahmeidentität.');
  return Object.freeze({ asOf: data._as_of, notice: data._reconstruction_notice, rows });
}
export const getCatalog = () => extractCatalog(document);

export function filterCatalog(rows: readonly Participation[], query = '', season = 'all') {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  return rows.filter(row => season === 'all' || String(row.season) === season).filter(row => {
    const haystack = normalizeSearchText(`${row.celebrity_name ?? ''} ${row.mask_name}`);
    return terms.every(term => haystack.includes(term));
  }).sort((a, b) => b.season - a.season || (a.placement ?? Infinity) - (b.placement ?? Infinity) ||
    a.mask_name.localeCompare(b.mask_name, 'de-DE'));
}

export interface ImageAsset {
  readonly src: string; readonly source: string; readonly rights: string;
  readonly licenseUrl: string; readonly author: string; readonly authorUrl: string;
  readonly title: string; readonly changes: string; readonly licenseStatus: 'FILE_LICENSE_REVIEWED';
}
export function resolveImageAsset(value: unknown): ImageAsset | null {
  if (!value || typeof value !== 'object') return null;
  const asset = value as Record<string, unknown>;
  // Reject incomplete/unreviewed entries without affecting the read-only catalog or game.
  if (asset.licenseStatus !== 'FILE_LICENSE_REVIEWED' || typeof asset.src !== 'string' ||
    !/^\/catalog-images\/[a-z0-9-]+\.webp$/.test(asset.src) ||
    !['source', 'licenseUrl', 'authorUrl'].every(key => typeof asset[key] === 'string' && /^https:\/\/[^\s]+$/.test(asset[key] as string)) ||
    !['rights', 'author', 'title', 'changes'].every(key => typeof asset[key] === 'string' && (asset[key] as string).trim())) return null;
  return value as ImageAsset;
}
export function catalogImages(row: Participation): { mask: ImageAsset | null; celebrity: ImageAsset | null } {
  // The manifest is separate from user data. Duo/special-case rows share a mask, not a person image.
  const masks: Record<string, unknown> = manifest.masks;
  const celebrities: Record<string, unknown> = manifest.celebrities;
  return { mask: resolveImageAsset(masks[maskKey(row)]),
    celebrity: row.celebrity_name === null ? null : resolveImageAsset(celebrities[participationKey(row)]) };
}
