import type { Mask, Season } from './types';
import { appearanceEpisodes, automaticWarnings } from './appearanceAuto';
import { validAppearanceList } from './appearanceSchedule';
import { isConfirmed2026Season } from './showFlow';

export interface ParticipantView {
  episode: 5 | 6;
  state: 'known' | 'pending' | 'unknown';
  masks: Mask[];
}

// Read-only projection of the existing format and frozen histories, never a second roster.
// Tips can precede an appearance: they are deliberately NOT evidence that a show started.
export function showParticipants(season: Season): ParticipantView[] {
  if (!isConfirmed2026Season(season)) return [];
  const auto = season.appearanceRules!.automatic!;
  const episodeOf = (id: string | null | undefined) => season.shows.find(s => s.id === id)?.episodeNumber;
  const reached = Math.max(episodeOf(season.activeShowId) ?? 0,
    ...season.masks.filter(m => m.isRevealed).map(m => episodeOf(m.revealedInShowId) ?? 0));
  const unique = new Set(season.masks.map(m => m.id)).size === season.masks.length &&
    new Set(season.shows.map(s => s.id)).size === season.shows.length &&
    new Set(season.shows.map(s => s.episodeNumber)).size === season.shows.length;
  return ([5, 6] as const).map(episode => {
    const view: ParticipantView = { episode, state: 'pending', masks: [] };
    if (reached < episode) return view;
    view.state = 'unknown';
    if (!unique || !season.shows.some(s => s.episodeNumber === episode) || automaticWarnings(season).length) return view;
    const masks: Mask[] = [];
    for (const mask of season.masks) {
      const debut = auto.debuts[mask.id];
      if (!Number.isInteger(debut) || debut < 1 || debut > 4) return view;
      const reveal = episodeOf(mask.revealedInShowId);
      if (mask.isRevealed && (!mask.settlement || !reveal)) return view;
      let appearances: number[] | undefined;
      try { appearances = appearanceEpisodes(season, mask); } catch { return view; }
      if (!validAppearanceList(appearances) || appearances.some(n => n > 6) ||
          (mask.isRevealed && (!appearances.includes(reveal!) || appearances.some(n => n > reveal!)))) return view;
      if (appearances.includes(episode)) masks.push(mask); // Original object and ID, including later reveals.
    }
    return { ...view, state: 'known', masks };
  });
}
