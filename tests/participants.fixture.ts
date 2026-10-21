import type { AppState, Mask, Season } from '../types';
import { showFlowFixture } from './showFlow.fixture';
import { appearanceEpisodes } from '../appearanceAuto';
import { automaticPlan, settleMask } from '../appearanceRules';

export function revealParticipant(state: AppState, id: string, episode: number, image?: string): void {
  const season = state.seasons[0];
  const old = season.masks.find(m => m.id === id)!;
  const mask: Mask = { ...old, isRevealed: true, revealedCelebrity: `Testpromi ${id.slice(1)}`,
    revealedInShowId: `s${episode}`, ...(image ? { celebrityImageUrl: image } : {}) };
  const appearances = appearanceEpisodes(season, mask)!;
  mask.settlement = settleMask(season, mask, state.players, true, 1234 + episode);
  season.appearanceRules!.appearances[id] = appearances;
  season.masks = season.masks.map(m => m.id === id ? mask : m);
}

export function participantsFixture(episode: 4 | 5 | 6 = 5): AppState {
  const state = showFlowFixture(5), season = state.seasons[0];
  season.id = 'participants-demo-009'; season.seasonName = 'SHOW 5 + 6 – DEMO';
  if (episode === 4) {
    season.shows = season.shows.filter(s => s.episodeNumber <= 4); season.activeShowId = 's4';
    for (const m of season.masks.filter(m => !m.isRevealed)) m.tips.a[0].showId = `s${season.appearanceRules!.automatic!.debuts[m.id]}`;
    season.appearanceRules!.appearances = automaticPlan(season);
  }
  if (episode === 6) {
    for (const id of ['m02', 'm12', 'm22']) revealParticipant(state, id, 5);
    season.shows.push({ id: 's6', name: 'Show 6', episodeNumber: 6 }); season.activeShowId = 's6';
  }
  return state;
}
