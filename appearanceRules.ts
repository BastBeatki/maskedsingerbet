import { Mask, MaskSettlement, Player, Season, Show } from './types';
import { calculateClassicScores, getPointsForShow, isValidSeason, ScoreCalculationResult } from './utils';

export const isAppearanceSeason = (season: Season) => season.ruleset === 's13-appearances-v1';
export function appearanceNumber(season: Season, mask: Mask, show: Show): number {
  const index = season.appearanceRules?.appearances[mask.id]?.indexOf(show.episodeNumber) ?? -1;
  if (index < 0) throw new Error(`Auftrittsfolge für ${mask.name} in ${show.name} fehlt. Bitte in den Einstellungen bestätigen.`);
  return index + 1;
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
      .filter(t => t.show && t.tip.celebrityName.trim().toLowerCase() === mask.revealedCelebrity?.trim().toLowerCase())
      .sort((a, b) => a.show!.episodeNumber - b.show!.episodeNumber || a.tip.createdAt - b.tip.createdAt);
    const first = correct[0];
    if (!first) { descriptions[score.playerId] = 'Kein richtiger Tipp: 0 Tipppunkte.'; continue; }
    // Preserve the historical timestamp-based slot lookup, even for legacy duplicate timestamps.
    const slot = tips.findIndex(t => t.createdAt === first.tip.createdAt);
    const final = first.tip.isFinal || correct.some(t => t.tip.isFinal && t.show!.episodeNumber === first.show!.episodeNumber);
    const multiplier = final ? slot === 0 ? 1.8 : slot === 1 ? 1.5 : 1 : 1;
    const n = appearances ? appearanceNumber(season, mask, first.show!) : first.show!.episodeNumber;
    const allCorrect = players.filter(p => season.playerIds.includes(p.id)).flatMap(p => (mask.tips[p.id] || []).map(tip => ({ playerId: p.id, tip, show: season.shows.find(s => s.id === tip.showId) })))
      .filter(t => t.show && t.tip.celebrityName.trim().toLowerCase() === mask.revealedCelebrity?.trim().toLowerCase())
      .sort((a, b) => a.show!.episodeNumber - b.show!.episodeNumber || a.tip.createdAt - b.tip.createdAt);
    const pioneer = allCorrect[0]?.playerId === score.playerId && allCorrect[0]?.tip.createdAt === first.tip.createdAt;
    descriptions[score.playerId] = `${appearances ? 'Auftritt' : 'Show'} ${n}: Basis ${getPointsForShow(n)} · Tipp-Slot ${slot + 1} · ${final ? 'Final' : 'offen'} ×${multiplier.toString().replace('.', ',')} · ${pioneer ? 'erster Treffer: 100 %' : 'späterer Treffer: 40 %'} → gerundet ${score.score} Tipppunkte.`;
  }
  return descriptions;
}
export function settleMask(season: Season, mask: Mask, players: Player[], appearances: boolean, at: number): MaskSettlement {
  const result = simulatedMask(season, mask, players, appearances);
  return JSON.parse(JSON.stringify({ schema: 1, ruleset: appearances ? 's13-appearances-v1' : 'classic-v1', settledAt: at,
    actualCelebrity: mask.revealedCelebrity || '', result, explanations: explainMask(season, mask, players, appearances, result) }));
}
export function validateAppearancePlan(season: Season, plan: Record<string, number[]>): void {
  for (const mask of season.masks.filter(m => !m.isRevealed)) {
    const episodes = plan[mask.id];
    if (!Array.isArray(episodes) || !episodes.length || episodes.some((n, i) => !Number.isSafeInteger(n) || n < 1 || (i > 0 && n <= episodes[i - 1])))
      throw new Error(`Für ${mask.name} die Auftritts-Shows aufsteigend angeben (z. B. 4, 5, 6).`);
    const referenced = Object.values(mask.tips).flat().map(t => t.showId);
    if (referenced.some(id => !season.shows.some(s => s.id === id && episodes.includes(s.episodeNumber))))
      throw new Error(`Alte Tipps von ${mask.name} liegen außerhalb der bestätigten Auftrittsfolge. Keine automatische Umdeutung.`);
  }
}
export function activateAppearances(season: Season, players: Player[], plan: Record<string, number[]>, now = Date.now()): Season {
  if (isAppearanceSeason(season)) throw new Error('Das Regelwerk ist bereits aktiviert.');
  validateAppearancePlan(season, plan);
  const activated: Season = { ...season, ruleset: 's13-appearances-v1', appearanceRules: { activatedAt: now, appearances: structuredClone(plan) },
    masks: season.masks.map(m => m.isRevealed ? { ...m, settlement: settleMask(season, m, players, false, 0) } : m) };
  if (!isValidSeason(activated)) throw new Error('Dieser Spielstand lässt sich nicht sicher aktivieren. Original bleibt unverändert.');
  return activated;
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
  if (isAppearanceSeason(season)) appearanceNumber(season, season.masks.find(m => m.id === maskId)!, season.shows.find(s => s.id === season.activeShowId)!);
}
