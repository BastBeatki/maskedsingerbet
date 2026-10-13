import { Mask, MaskSettlement, Player, Season, Show, S13Automatic } from './types';
import { calculateClassicScores, getPointsForShow, isValidSeason, ScoreCalculationResult } from './utils';
import { matchesAppearanceShow, validAppearanceList } from './appearanceSchedule';
import { appearanceEpisodes, assertAutomaticReady, createAutomatic } from './appearanceAuto';
import { tipMatchesCelebrity } from './celebrityNames';

export const isAppearanceSeason = (season: Season) => season.ruleset === 's13-appearances-v1';
export function appearanceNumber(season: Season, mask: Mask, show: Show): number {
  const episodes = appearanceEpisodes(season, mask);
  const known = season.shows.find(s => s.id === show.id && s.episodeNumber === show.episodeNumber);
  if (!matchesAppearanceShow(episodes, known)) throw new Error(`Kein bestätigter Auftritt für ${mask.name} in ${show.name}. Bei einer Formatabweichung unter „Erweitert / Auftritte korrigieren“ prüfen.`);
  return show.episodeNumber < episodes![0] ? 1 : episodes!.indexOf(show.episodeNumber) + 1;
}
export function simulatedMask(season: Season, mask: Mask, players: Player[], appearances: boolean): ScoreCalculationResult {
  return calculateClassicScores({ ...season, masks: [mask] }, players,
    appearances ? (m, show) => appearanceNumber(season, m, show) : undefined);
}

// Explanations use the same earliest-correct/final-upgrade selection as CLASSIC;
// awarded points always come from the shared engine, never from this prose.
export function explainMask(season: Season, mask: Mask, players: Player[], appearances: boolean, result: ScoreCalculationResult): Record<string, string> {
  const descriptions: Record<string, string> = {};
  for (const score of result.scores) {
    const tips = mask.tips[score.playerId] || [];
    const correct = tips.map((tip, index) => ({ tip, index, show: season.shows.find(s => s.id === tip.showId) }))
      .filter(t => t.show && tipMatchesCelebrity(t.tip, mask.revealedCelebrity || '', season.masks.flatMap(m => m.revealedCelebrity ? [m.revealedCelebrity] : [])))
      .sort((a, b) => a.show!.episodeNumber - b.show!.episodeNumber || a.tip.createdAt - b.tip.createdAt);
    const first = correct[0];
    if (!first) { descriptions[score.playerId] = 'Kein richtiger Tipp: 0 Tipppunkte.'; continue; }
    // Preserve the historical timestamp-based slot lookup, even for legacy duplicate timestamps.
    const slot = tips.findIndex(t => t.createdAt === first.tip.createdAt);
    const final = first.tip.isFinal || correct.some(t => t.tip.isFinal && t.show!.episodeNumber === first.show!.episodeNumber);
    const multiplier = final ? slot === 0 ? 1.8 : slot === 1 ? 1.5 : 1 : 1;
    const n = appearances ? appearanceNumber(season, mask, first.show!) : first.show!.episodeNumber;
    const allCorrect = players.filter(p => season.playerIds.includes(p.id)).flatMap(p => (mask.tips[p.id] || []).map(tip => ({ playerId: p.id, tip, show: season.shows.find(s => s.id === tip.showId) })))
      .filter(t => t.show && tipMatchesCelebrity(t.tip, mask.revealedCelebrity || '', season.masks.flatMap(m => m.revealedCelebrity ? [m.revealedCelebrity] : [])))
      .sort((a, b) => a.show!.episodeNumber - b.show!.episodeNumber || a.tip.createdAt - b.tip.createdAt);
    const pioneer = allCorrect[0]?.playerId === score.playerId && allCorrect[0]?.tip.createdAt === first.tip.createdAt;
    descriptions[score.playerId] = `${appearances ? 'Auftritt' : 'Show'} ${n}: Basis ${getPointsForShow(n)} · Tipp-Slot ${slot + 1} · ${final ? 'Final' : 'offen'} ×${multiplier.toString().replace('.', ',')} · ${pioneer ? 'erster Treffer: 100 %' : 'späterer Treffer: 40 %'} → gerundet ${score.score} Tipppunkte.`;
  }
  return descriptions;
}
export function settleMask(season: Season, mask: Mask, players: Player[], appearances: boolean, at: number): MaskSettlement {
  if (appearances && !validAppearanceList(appearanceEpisodes(season, mask)))
    throw new Error(`Auftrittsfolge für ${mask.name} fehlt. Bitte vor der Abrechnung bestätigen.`);
  const result = simulatedMask(season, mask, players, appearances);
  return JSON.parse(JSON.stringify({ schema: 1, ruleset: appearances ? 's13-appearances-v1' : 'classic-v1', settledAt: at,
    actualCelebrity: mask.revealedCelebrity || '', result, explanations: explainMask(season, mask, players, appearances, result) }));
}
export function validateAppearancePlan(season: Season, plan: Record<string, number[]>, includeHistory = false): void {
  for (const mask of season.masks.filter(m => includeHistory || !m.isRevealed)) {
    const episodes = plan[mask.id];
    if (!validAppearanceList(episodes))
      throw new Error(`Für ${mask.name} die Auftritts-Shows aufsteigend angeben (z. B. 4, 5, 6).`);
    if (mask.isRevealed) {
      const reveal = season.shows.find(s => s.id === mask.revealedInShowId);
      if (!reveal || episodes.some(n => n > reveal.episodeNumber || !season.shows.some(s => s.episodeNumber === n)))
        throw new Error(`Historische Auftritte von ${mask.name} müssen bekannte Shows bis zur Enthüllung sein.`);
    }
    const referenced = Object.values(mask.tips).flat().map(t => t.showId);
    if (referenced.some(id => !matchesAppearanceShow(episodes, season.shows.find(s => s.id === id))))
      throw new Error(`Alte Tipps von ${mask.name} liegen außerhalb der bestätigten Auftrittsfolge. Keine automatische Umdeutung.`);
  }
}
export function activateAppearances(season: Season, players: Player[], plan: Record<string, number[]>, now = Date.now(), history: 'preserve-classic' | 'revalue-s13' = 'preserve-classic', automatic?: S13Automatic): Season {
  if (isAppearanceSeason(season)) throw new Error('Das Regelwerk ist bereits aktiviert.');
  validateAppearancePlan(season, plan, history === 'revalue-s13');
  const activated: Season = { ...season, ruleset: 's13-appearances-v1', appearanceRules: { activatedAt: now, appearances: structuredClone(plan), ...(automatic ? { automatic: structuredClone(automatic) } : {}) },
    masks: season.masks };
  // Historical reveal time remains unknown (0). The new activation time is separate.
  activated.masks = season.masks.map(m => m.isRevealed ? { ...m, settlement: settleMask(activated, m, players, history === 'revalue-s13', 0) } : m);
  if (!isValidSeason(activated)) throw new Error('Dieser Spielstand lässt sich nicht sicher aktivieren. Original bleibt unverändert.');
  return activated;
}
export function automaticPlan(season: Season, automatic = createAutomatic(season)): Record<string, number[]> {
  const candidate: Season = { ...season, appearanceRules: { activatedAt: season.appearanceRules?.activatedAt || Date.now(), appearances: season.appearanceRules?.appearances || {}, automatic } };
  return Object.fromEntries(season.masks.map(m => {
    const episodes = appearanceEpisodes(candidate, m);
    if (!validAppearanceList(episodes)) throw new Error(`Auftrittszuordnung fehlt: ${m.name}. Erweitert korrigieren.`);
    return [m.id, episodes];
  }));
}
export function configureAppearanceMode(season: Season, players: Player[], plan: Record<string, number[]>, automatic?: S13Automatic): Season {
  if (!isAppearanceSeason(season)) return activateAppearances(season, players, plan, Date.now(), 'revalue-s13', automatic);
  const updated = updateAppearancePlan(season, plan);
  const rules = { ...updated.appearanceRules! };
  if (automatic) rules.automatic = structuredClone(automatic); else delete rules.automatic;
  const next = { ...updated, appearanceRules: rules };
  if (!isValidSeason(next)) throw new Error('Auftrittskorrektur passt nicht zum gespeicherten Stand.');
  return next;
}
export function previewAppearanceMode(season: Season, players: Player[], plan: Record<string, number[]>, automatic?: S13Automatic) {
  const next = configureAppearanceMode(season, players, plan, automatic);
  return { old: activeScores(season, players), next: activeScores(next, players) };
}
export function previewAppearanceActivation(season: Season, players: Player[], plan: Record<string, number[]>): { old: ScoreCalculationResult; next: ScoreCalculationResult } {
  const activated = activateAppearances(season, players, plan, Date.now(), 'revalue-s13');
  return { old: calculateClassicScores(season, players), next: activeScores(activated, players) };
}
export function updateAppearancePlan(season: Season, plan: Record<string, number[]>): Season {
  validateAppearancePlan(season, plan);
  // Settled masks retain both their schedule and their ledger.
  return { ...season, appearanceRules: { ...season.appearanceRules!, appearances: {
    ...plan, ...Object.fromEntries(season.masks.filter(m => m.isRevealed).map(m => [m.id, season.appearanceRules?.appearances[m.id] || []])) } } };
}
export function activeScores(season: Season, players: Player[]): ScoreCalculationResult {
  if (!isAppearanceSeason(season)) return calculateClassicScores(season, players);
  const scores = players.filter(p => season.playerIds.includes(p.id)).map(p => ({ playerId: p.id, name: p.name, color: p.color,
    score: 0, counterBetPoints: 0, totalScore: 0, correctMasks: 0, wonCounterBets: 0 }));
  const result: ScoreCalculationResult = { scores, tipPoints: {}, counterBetPoints: {}, playerMaskPoints: {} };
  for (const mask of season.masks.filter(m => m.isRevealed)) {
    if (!mask.settlement) throw new Error(`Gespeicherte Abrechnung fehlt: ${mask.name}`);
    const settled = mask.settlement.result;
    for (const score of scores) {
      const row = settled.scores.find(s => s.playerId === score.playerId);
      if (row) for (const key of ['score', 'counterBetPoints', 'totalScore', 'correctMasks', 'wonCounterBets'] as const) score[key] += row[key];
    }
    Object.assign(result.tipPoints, settled.tipPoints); Object.assign(result.counterBetPoints, settled.counterBetPoints);
    Object.assign(result.playerMaskPoints, settled.playerMaskPoints);
  }
  scores.sort((a, b) => b.totalScore - a.totalScore);
  return result;
}

export function assertOpenMask(season: Season, maskId: string): void {
  if (!isAppearanceSeason(season)) return;
  const mask = season.masks.find(m => m.id === maskId);
  if (!mask || mask.isRevealed) throw new Error('Abgerechnete Masken bleiben unverändert.');
  const show = season.shows.find(s => s.id === season.activeShowId);
  if (!show) throw new Error('Bitte eine Show auswählen.');
}
export function assertOpenAppearance(season: Season, maskId: string): void {
  assertOpenMask(season, maskId);
  assertAutomaticReady(season);
  if (isAppearanceSeason(season)) appearanceNumber(season, season.masks.find(m => m.id === maskId)!, season.shows.find(s => s.id === season.activeShowId)!);
}
