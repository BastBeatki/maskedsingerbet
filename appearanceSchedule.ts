import type { Show } from './types';

export function validAppearanceList(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.every((n, i) =>
    Number.isSafeInteger(n) && n >= 1 && (i === 0 || n > value[i - 1]));
}

// A prediction before debut uses the first basis, without inventing an appearance.
export function matchesAppearanceShow(episodes: unknown, show: Show | undefined): boolean {
  return validAppearanceList(episodes) && !!show &&
    (show.episodeNumber < episodes[0] || episodes.includes(show.episodeNumber));
}
