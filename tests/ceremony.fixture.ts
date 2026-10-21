import type { AppState, Season } from '../types';
import { automaticPlan, settleMask } from '../appearanceRules';

export const DEMO_LAST_CELEBRITY = 'Demo-Promi 16';
export function ceremonyFixture(complete = false, tie = false): AppState {
  const players = [
    { id: 'demo-a', name: 'Basti [Demo]', color: '#55d9f3' },
    { id: 'demo-b', name: 'Schütti [Demo]', color: '#b28aff' },
    { id: 'demo-c', name: 'Schum [Demo]', color: '#e8c47c' }
  ];
  const names = ['Prisma', 'Orbit', 'Pixel', 'Echo', 'Kupfer', 'Wolke', 'Komet', 'Mosaik', 'Funkel', 'Nebel', 'Spektrum', 'Impuls', 'Quarz', 'Faser', 'Welle', 'Nova'];
  const season: Season = { id: 'ceremony-demo-007', seasonName: 'FINALE – DEMO', playerIds: players.map(p => p.id),
    shows: [1, 2, 3, 4, 5, 6].map(n => ({ id: `demo-show-${n}`, name: `Show ${n}`, episodeNumber: n })),
    activeShowId: 'demo-show-6', ruleset: 's13-appearances-v1', masks: [], counterBets: [],
    appearanceRules: { activatedAt: 1700000000000, appearances: {}, automatic: { version: 's13-2026-v1', debuts: {}, overrides: {} } }
  };
  for (let i = 0; i < 16; i++) {
    const debut = Math.floor(i / 4) + 1, reveal = i % 4 < 2 ? debut : i % 4 === 2 ? 5 : 6;
    const correct = `Demo-Promi ${i + 1}`;
    const winner = reveal === 1 || reveal === 3 || reveal === 5 ? 'demo-a' : 'demo-b';
    const revealed = complete || i !== 15;
    const tips: Season['masks'][number]['tips'] = {};
    for (const [index, player] of players.entries()) {
      if (index === 2 && ![0, 4, 8].includes(i)) continue;
      const hit = !tie && (player.id === winner || (i === 0 && index === 1) || (index === 2 && [0, 8].includes(i)));
      tips[player.id] = [{ celebrityName: hit ? correct : `Demo-Irrtum ${index + 1}-${i + 1}`, showId: `demo-show-${debut}`,
        createdAt: 1700000000000 + debut * 86400000 + i * 1000 + index * 10, isFinal: !tie && player.id === winner && reveal !== 1 }];
    }
    season.masks.push({ id: `demo-mask-${i + 1}`, name: `Demo-${names[i]}`, tips, isRevealed: revealed,
      ...(revealed ? { revealedCelebrity: correct, revealedInShowId: `demo-show-${reveal}` } : {}) });
    season.appearanceRules!.automatic!.debuts[`demo-mask-${i + 1}`] = debut;
  }
  if (!tie) for (const [index, bettor, target] of [[1, 'demo-b', 'demo-a'], [4, 'demo-a', 'demo-b'], [8, 'demo-b', 'demo-a'], [12, 'demo-a', 'demo-b'], [14, 'demo-b', 'demo-a'], [15, 'demo-a', 'demo-b']] as const) {
    const debut = Math.floor(index / 4) + 1;
    season.counterBets.push({ id: `demo-bet-${index}`, maskId: `demo-mask-${index + 1}`, showId: `demo-show-${debut}`, bettorPlayerId: bettor, targetPlayerId: target, targetTipIndex: 0 });
  }
  season.appearanceRules!.appearances = automaticPlan(season, season.appearanceRules!.automatic!);
  season.masks = season.masks.map(mask => mask.isRevealed ? { ...mask, settlement: settleMask(season, mask, players, true,
    1700000000000 + season.shows.find(s => s.id === mask.revealedInShowId)!.episodeNumber * 86400000 + Number(mask.id.split('-').at(-1)) * 10000) } : mask);
  return { players, seasons: [season] };
}
