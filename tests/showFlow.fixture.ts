import type { AppState, Season } from '../types';
import { createAutomatic, S13_GROUPS } from '../appearanceAuto';
import { automaticPlan, settleMask } from '../appearanceRules';

// Entirely synthetic, with public mask names from the existing format definition.
export function showFlowFixture(through = 5): AppState {
  const players = [{ id: 'a', name: 'Test A', color: '#00aaaa' }, { id: 'b', name: 'Test B', color: '#8855cc' }];
  const season: Season = {
    id: 'synthetic-2026', seasonName: 'Staffel 2026 · UI-Test', playerIds: ['a', 'b'],
    shows: Array.from({ length: through }, (_, i) => ({ id: `s${i + 1}`, name: `Show ${i + 1}`, episodeNumber: i + 1 })),
    activeShowId: `s${through}`, counterBets: [],
    masks: S13_GROUPS.flatMap((names, g) => names.map((name, i) => ({
      id: `m${g}${i}`, name, isRevealed: i < 2,
      ...(i < 2 ? { revealedCelebrity: `Testpromi ${g}${i}`, revealedInShowId: `s${g + 1}` } : {}),
      tips: {
        a: [{ celebrityName: `Testpromi ${g}${i}`, showId: `s${i < 2 ? g + 1 : Math.min(through, 5)}`, createdAt: 100 + g * 10 + i }],
        b: [{ celebrityName: `Testpromi ${g}${i}`, showId: `s${g + 1}`, createdAt: 200 + g * 10 + i }]
      }
    })))
  };
  const auto = createAutomatic(season);
  season.ruleset = 's13-appearances-v1';
  season.appearanceRules = { activatedAt: 1, appearances: {}, automatic: auto };
  season.appearanceRules.appearances = automaticPlan(season, auto);
  season.masks = season.masks.map(mask => mask.isRevealed ? { ...mask, settlement: settleMask(season, mask, players, true, 1234) } : mask);
  return { players, seasons: [season] };
}
