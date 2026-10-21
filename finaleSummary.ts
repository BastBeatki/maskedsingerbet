import type { Player, PlayerScore, Season } from './types';
import { activeScores } from './appearanceRules';
import { isValidAppState } from './utils';
import { isConfirmed2026Season } from './showFlow';

export interface RankedPlayer extends PlayerScore { rank: number }
export interface ShowAllocation { episode: number; delta: Record<string, number>; cumulative: Record<string, number> }

/** Ephemeral UI acknowledgement only. Never persist this snapshot or treat it as game status. */
export function verifiedFinalRevision(season: Season, players: Player[]): string | null {
  return finaleReadiness(season, players).ready ? JSON.stringify({ season, players }) : null;
}

/** Read-only and fail closed. Readiness describes recorded data, not knowledge of the TV broadcast. */
export function finaleReadiness(season: Season, players: Player[]): { ready: boolean; reasons: string[]; finalMaskIds: string[] } {
  const reasons: string[] = [];
  const auto = season.appearanceRules?.automatic;
  if (!isConfirmed2026Season(season)) reasons.push('Für dieses Regelwerk ist keine verifizierte Finale-Erkennung verfügbar.');
  try {
    if (!isValidAppState({ seasons: [season], players })) reasons.push('Der Spielstand oder eine gespeicherte Abrechnung ist unvollständig bzw. widersprüchlich.');
  } catch { reasons.push('Der Spielstand kann nicht sicher geprüft werden.'); }
  if (season.masks.length !== 16 || [1, 2, 3, 4].some(group => season.masks.filter(m => auto?.debuts?.[m.id] === group).length !== 4))
    reasons.push('Die vollständige Besetzung mit 16 Masken in vier Debütgruppen ist nicht belegt.');
  if (season.shows.length !== 6 || [1, 2, 3, 4, 5, 6].some(n => season.shows.filter(s => s.episodeNumber === n).length !== 1))
    reasons.push('Die sechs Shows dieser Staffel sind nicht vollständig und eindeutig erfasst.');
  if (!season.playerIds.length || new Set(season.playerIds).size !== season.playerIds.length || season.playerIds.some(id => players.filter(p => p.id === id).length !== 1))
    reasons.push('Die Mitspieler sind nicht vollständig und eindeutig zugeordnet.');
  const pending = season.masks.filter(m => !m.isRevealed || !m.revealedCelebrity?.trim() || !m.settlement);
  if (pending.length) reasons.push(`${pending.length} ${pending.length === 1 ? 'Maske ist' : 'Masken sind'} noch nicht vollständig enthüllt und abgerechnet.`);
  const finalMaskIds = season.masks.filter(m => m.isRevealed && season.shows.find(s => s.id === m.revealedInShowId)?.episodeNumber === 6).map(m => m.id);
  if (!finalMaskIds.length) reasons.push('Eine abgerechnete Finalmaske in Show 6 ist noch nicht belegt.');
  if (season.masks.some(m => m.isRevealed && (!season.shows.some(s => s.id === m.revealedInShowId) || m.settlement?.ruleset !== 's13-appearances-v1' || !Array.isArray(m.settlement?.result?.scores) || season.playerIds.some(id => !m.settlement?.result?.scores?.some(row => row.playerId === id)))))
    reasons.push('Für mindestens eine Enthüllung fehlen eine Show-Zuordnung oder vollständige S13-Spielerabrechnungen.');
  return { ready: reasons.length === 0, reasons, finalMaskIds };
}

export function rankedFinalScores(season: Season, players: Player[]): RankedPlayer[] {
  const rows = activeScores(season, players).scores;
  return rows.map((row, i) => ({ ...row, rank: i && row.totalScore === rows[i - 1].totalScore ? rows.findIndex(r => r.totalScore === row.totalScore) + 1 : i + 1 }));
}

/** Allocation of current immutable ledgers, deliberately NOT historical live leaderboard snapshots. */
export function showAllocations(season: Season): ShowAllocation[] | null {
  if (season.masks.some(m => !m.settlement || !season.shows.some(s => s.id === m.revealedInShowId))) return null;
  const totals = Object.fromEntries(season.playerIds.map(id => [id, 0]));
  return [...season.shows].sort((a, b) => a.episodeNumber - b.episodeNumber).map(show => {
    const delta = Object.fromEntries(season.playerIds.map(id => [id, 0]));
    for (const mask of season.masks.filter(m => m.revealedInShowId === show.id)) {
      for (const id of season.playerIds) {
        const row = mask.settlement!.result.scores.find(r => r.playerId === id);
        if (!row || !Number.isSafeInteger(row.totalScore)) return null;
        delta[id] += row.totalScore;
      }
    }
    for (const id of season.playerIds) totals[id] += delta[id];
    return { episode: show.episodeNumber, delta, cumulative: { ...totals } };
  }).reduce<ShowAllocation[] | null>((rows, row) => rows && row ? [...rows, row] : null, []);
}

export function finaleSummary(season: Season, players: Player[]) {
  const readiness = finaleReadiness(season, players);
  if (!readiness.ready) return { readiness, rankings: [] as RankedPlayer[], allocation: null, exclusive: [] as { mask: string; playerId: string }[] };
  const rankings = rankedFinalScores(season, players);
  const exclusive = season.masks.flatMap(mask => {
    if (season.playerIds.length < 2 || season.playerIds.some(id => !(mask.tips[id]?.length))) return [];
    const hits = mask.settlement!.result.scores.filter(row => row.correctMasks === 1);
    return hits.length === 1 ? [{ mask: mask.name, playerId: hits[0].playerId }] : [];
  });
  return { readiness, rankings, allocation: showAllocations(season), exclusive };
}
