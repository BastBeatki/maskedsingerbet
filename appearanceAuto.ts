import type { Mask, Season, S13Automatic } from './types';
import { validAppearanceList } from './appearanceSchedule';

// Confirmed handoff 022, 07.10.2026. Applied ONLY by explicit season activation.
export const S13_GROUPS = [
  ['Bubble', 'Emily Wau', 'Professor Dr. Dr. Schweinstein', 'Momo'],
  ['Erdbär', 'MR. MIC', 'Hippo Jones', 'Perla'],
  ['Cosma', 'P.S', 'Yeti Cat', 'Luigi Eishörnchen'],
  ['Wild Thing', 'Three Sixty', 'Groovy', 'Fernando El Toro'],
] as const;
const key = (name: string) => name.trim().toLocaleLowerCase('de').replace(/[.\s]/g, '');
export function confirmedDebut(name: string): number | undefined {
  const group = S13_GROUPS.findIndex(names => names.some(n => key(n) === key(name)));
  return group < 0 ? undefined : group + 1;
}
export function createAutomatic(season: Season): S13Automatic {
  const debuts: Record<string, number> = {};
  const names = new Set<string>();
  for (const mask of season.masks) {
    const debut = confirmedDebut(mask.name);
    if (!debut || names.has(key(mask.name))) throw new Error(`S13-Zuordnung für ${mask.name} ist unklar. Unter „Erweitert / Auftritte korrigieren“ prüfen.`);
    names.add(key(mask.name)); debuts[mask.id] = debut;
  }
  return { version: 's13-2026-v1', debuts, overrides: {} };
}
export function progressEpisode(season: Season): number {
  const refs = [season.activeShowId, ...season.masks.map(m => m.revealedInShowId),
    ...season.masks.flatMap(m => Object.values(m.tips).flat().map(t => t.showId))];
  return Math.max(0, ...season.shows.filter(s => refs.includes(s.id)).map(s => s.episodeNumber));
}
export function appearanceEpisodes(season: Season, mask: Mask): number[] | undefined {
  const rules = season.appearanceRules, auto = rules?.automatic;
  if (!auto || mask.settlement) return rules?.appearances[mask.id]; // immutable historical schedule
  if (auto.overrides[mask.id]) return auto.overrides[mask.id];
  const debut = auto.debuts[mask.id];
  if (!debut) return undefined;
  const reveal = season.shows.find(s => s.id === mask.revealedInShowId)?.episodeNumber;
  if (mask.isRevealed && (!reveal || (reveal !== debut && reveal !== 5 && reveal !== 6)))
    throw new Error(`Enthüllungs-Show von ${mask.name} weicht vom S13-Format ab. Auftritte erweitert korrigieren.`);
  const through = reveal ?? progressEpisode(season);
  return [debut, ...(through >= 5 ? [5] : []), ...(through >= 6 ? [6] : [])];
}
export function automaticWarnings(season: Season): string[] {
  const auto = season.appearanceRules?.automatic;
  if (!auto) return [];
  const warnings: string[] = [];
  const progress = progressEpisode(season);
  for (const m of season.masks) if (!auto.debuts[m.id] && !auto.overrides[m.id]) warnings.push(`Unbekannte Debütgruppe: ${m.name}.`);
  if (progress > 6) warnings.push('Das bestätigte Format endet mit Show 6.');
  for (let debut = 1; debut <= 4; debut++) {
    if (progress <= debut) continue; // currently playing, not yet finished
    const group = season.masks.filter(m => auto.debuts[m.id] === debut);
    const revealed = group.filter(m => m.isRevealed && season.shows.find(s => s.id === m.revealedInShowId)?.episodeNumber === debut);
    if (group.length !== 4 || revealed.length !== 2) warnings.push(`Show ${debut}: erwartet 4 Debüts / 2 Enthüllungen, gespeichert ${group.length} / ${revealed.length}.`);
  }
  return warnings;
}
export function assertAutomaticReady(season: Season): void {
  if (!season.appearanceRules?.automatic || season.appearanceRules.automatic.deviationConfirmed) return;
  const warnings = automaticWarnings(season);
  if (warnings.length) throw new Error(`S13-Format prüfen: ${warnings.join(' ')} Unter „Erweitert / Auftritte korrigieren“ die Daten korrigieren oder die abweichende Besetzung bestätigen.`);
}
export function validAutomatic(value: any, season: Season): boolean {
  if (value === undefined) return true;
  if (!value || value.version !== 's13-2026-v1' || !value.debuts || !value.overrides ||
    typeof value.debuts !== 'object' || Array.isArray(value.debuts) || typeof value.overrides !== 'object' || Array.isArray(value.overrides) ||
    (value.deviationConfirmed !== undefined && typeof value.deviationConfirmed !== 'boolean')) return false;
  return Object.values(value.debuts).every(n => Number.isInteger(n) && Number(n) >= 1 && Number(n) <= 4) &&
    Object.values(value.overrides).every(validAppearanceList) &&
    season.masks.every(m => value.debuts[m.id] !== undefined || value.overrides[m.id] !== undefined ||
      (!m.isRevealed && Object.values(m.tips).every(tips => tips.length === 0) && !season.counterBets.some(cb => cb.maskId === m.id)));
}
