import type { Season, Show } from './types';

// The explicit format marker survives renaming; a season name or year alone is not an identity.
export const isConfirmed2026Season = (season: Season): boolean =>
  season.ruleset === 's13-appearances-v1' && season.appearanceRules?.automatic?.version === 's13-2026-v1';

export function showLabel(season: Season, show: Show): string {
  if (isConfirmed2026Season(season)) {
    if (show.episodeNumber === 5) return 'Halbfinale (Show 5)';
    if (show.episodeNumber === 6) return 'Finale (Show 6)';
  }
  return show.name;
}

export const nextShowNumber = (season: Season): number =>
  season.shows.length ? Math.max(...season.shows.map(show => show.episodeNumber)) + 1 : 1;

export const canAddShow = (season: Season): boolean =>
  !isConfirmed2026Season(season) || nextShowNumber(season) <= 6;

// Called inside the functional state updater: even queued/double invocations see the latest shows.
export function appendShow(season: Season, id: string): Season {
  if (!canAddShow(season)) throw new Error('Finale (Show 6) ist die letzte Show dieser Staffel. Eine weitere Show kann nicht angelegt werden.');
  const episodeNumber = nextShowNumber(season);
  const show: Show = { id, name: `Show ${episodeNumber}`, episodeNumber };
  return { ...season, shows: [...season.shows, show], activeShowId: show.id };
}
