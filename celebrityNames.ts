import catalog from './data/promi-catalog-2026-09-30.json';
import type { Tip } from './types';

export const normalizeName = (value: unknown) => String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '')
  .toLocaleLowerCase('de-DE').replace(/ß/g, 'ss').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
const words = (s: string) => normalizeName(s).split(' ').filter(Boolean).sort();
const nameKeys = (s: string) => [words(s).join(' '), words(s.replace(/ä/gi, 'ae').replace(/ö/gi, 'oe').replace(/ü/gi, 'ue')).join(' ')];
const sameName = (a: string, b: string) => nameKeys(a).some(k => k && nameKeys(b).includes(k));
export function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
}
const catalogNames = [...new Set(catalog.records.flatMap(r => r.celebrity_name ? [r.celebrity_name] : []))];
export type NameResolution = { version: 'catalog-names-v1'; status: 'resolved' | 'ambiguous' | 'unknown'; canonicalName?: string; method?: 'exact' | 'normalized' | 'fuzzy' };
export function resolveCelebrityName(raw: string, knownNames: readonly string[] = []): NameResolution {
  const candidates = [...new Map([...knownNames, ...catalogNames].filter(Boolean).map(n => [words(n).join(' '), n])).values()];
  const exact = candidates.filter(n => n === raw.trim());
  if (exact.length === 1) return { version: 'catalog-names-v1', status: 'resolved', canonicalName: exact[0], method: 'exact' };
  const normalized = candidates.filter(n => sameName(raw, n));
  if (normalized.length === 1) return { version: 'catalog-names-v1', status: 'resolved', canonicalName: normalized[0], method: 'normalized' };
  if (normalized.length > 1) return { version: 'catalog-names-v1', status: 'ambiguous' };
  const tokens = words(raw);
  // Scoring deliberately requires a full name, long tokens, one edit and a clear runner-up gap.
  if (tokens.length < 2 || tokens.some(t => t.length < 2) || tokens.join('').length < 8) return { version: 'catalog-names-v1', status: 'unknown' };
  const nearby = candidates.map(name => {
    const other = words(name);
    if (other.join('').length < 9) return { name, distance: Infinity };
    const distance = other.length === tokens.length ? tokens.reduce((n, t, i) => { if (Math.abs(t.length - other[i].length) > 2) return Infinity; const edit = editDistance(t, other[i]); return n + (edit && Math.min(t.length, other[i].length) < 5 ? Infinity : edit); }, 0) : Infinity;
    return { name, distance };
  }).filter(c => c.distance <= 2).sort((a, b) => a.distance - b.distance);
  if (nearby.length === 1 && nearby[0].distance <= 1) return { version: 'catalog-names-v1', status: 'resolved', canonicalName: nearby[0].name, method: 'fuzzy' };
  return { version: 'catalog-names-v1', status: nearby.length ? 'ambiguous' : 'unknown' };
}
export function validNameResolution(tip: any): boolean {
  const r = tip.nameResolution;
  if (r === undefined) return true;
  if (!r || r.version !== 'catalog-names-v1' || !['resolved', 'ambiguous', 'unknown'].includes(r.status)) return false;
  if (r.status !== 'resolved') return r.canonicalName === undefined && r.method === undefined;
  if (typeof r.canonicalName !== 'string' || !r.canonicalName.trim()) return false;
  const checked = resolveCelebrityName(tip.celebrityName, [r.canonicalName]);
  return checked.status === 'resolved' && checked.canonicalName === r.canonicalName && checked.method === r.method;
}
export function tipMatchesCelebrity(tip: Tip, actual: string, knownNames: readonly string[] = []): boolean {
  if (!tip.nameResolution) return tip.celebrityName.trim().toLowerCase() === actual.trim().toLowerCase();
  if (!validNameResolution(tip)) return false;
  if (sameName(tip.celebrityName, actual)) return true;
  if (tip.nameResolution.status === 'ambiguous') return false;
  const resolution = resolveCelebrityName(tip.celebrityName, [...knownNames, actual, ...(tip.nameResolution.canonicalName ? [tip.nameResolution.canonicalName] : [])]);
  return resolution.status === 'resolved' && sameName(resolution.canonicalName!, actual);
}
// Search is intentionally more permissive than identity resolution and never awards points.
export function catalogSearchRank(query: string, celebrity: string | null, mask: string, season: number): number {
  const terms = normalizeName(query).split(' ').filter(Boolean);
  if (!terms.length) return 0;
  if ((celebrity && sameName(query, celebrity)) || sameName(query, mask)) return 0;
  const haystack = normalizeName(`${celebrity ?? ''} ${mask} Staffel ${season}`).split(' ');
  const exactTerm = (term: string) => haystack.some(w => /^\d+$/.test(term) ? w === term : w.includes(term));
  if (terms.every(exactTerm)) return 1;
  return terms.every(term => exactTerm(term) || (term.length >= 4 && haystack.some(w => Math.abs(term.length - w.length) <= 2 && editDistance(term, w) <= (term.length >= 7 ? 2 : 1)))) ? 2 : Infinity;
}
