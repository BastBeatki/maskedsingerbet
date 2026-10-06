import type { Season, Player, Mask, RevealAudit, PlayerMaskAudit, RateOpportunity, RulesetVersion } from './types';
import { calculateClassicScores, type ScoreCalculationResult } from './utils';

export const rulesetOf = (season: Season): RulesetVersion => season.ruleset ?? 'classic-v1';
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
export const opportunityValue = (index: number) => Math.max(8, 20 - 4 * (index - 1));
export const lateDiscount = (at: number, opportunity: RateOpportunity) =>
  Math.min(3, Math.floor(Math.max(0, at - opportunity.openedAt) / (15 * 60_000)));

// No invented timing: missing evidence produces an explicit unavailable comparison.
export function tournamentEvidenceMissing(season: Season, mask: Mask): boolean {
  const ops = mask.opportunities ?? [];
  return season.playerIds.some(id => (mask.tips[id] ?? []).some(tip =>
    !ops.some(op => op.id === tip.opportunityId) ||
    (tip.isFinal && (tip.finalizedAt === undefined || !ops.some(op => op.id === tip.finalOpportunityId))))) ||
    season.counterBets.some(bet => bet.maskId === mask.id &&
      (bet.createdAt === undefined || typeof bet.targetWasFinal !== 'boolean' || !ops.some(op => op.id === bet.opportunityId)));
}

export function buildRevealAudit(season: Season, mask: Mask, players: Player[], revealedAt: number,
  version: RulesetVersion = rulesetOf(season)): RevealAudit {
  if (!mask.isRevealed || !mask.revealedCelebrity?.trim()) throw new Error('Enthüllung fehlt.');
  if (version === 'tournament-v1' && tournamentEvidenceMissing(season, mask)) throw new Error('Ratezeiten fehlen.');
  const included = players.filter(player => season.playerIds.includes(player.id));
  const ops = mask.opportunities ?? [];
  const tipPoints: RevealAudit['tipPoints'] = {};
  const counterBetPoints: RevealAudit['counterBetPoints'] = {};
  const classic = version === 'classic-v1' ? calculateClassicScores({ ...season, masks: [mask] }, players) : null;
  const rows: PlayerMaskAudit[] = included.map(player => {
    const tips = mask.tips[player.id] ?? [];
    const row: PlayerMaskAudit = { playerId: player.id, playerName: player.name, correct: false,
      tipIndex: null, tipPoints: 0, counterBetPoints: 0, total: 0, wonCounterBets: 0, components: [], explanation: '' };
    if (classic) {
      const sorted = tips.map((tip, index) => ({ tip, index, show: season.shows.find(s => s.id === tip.showId) }))
        .filter(t => t.show && same(t.tip.celebrityName, mask.revealedCelebrity!))
        .sort((a, b) => a.show!.episodeNumber - b.show!.episodeNumber || a.tip.createdAt - b.tip.createdAt);
      const first = sorted[0];
      const score = classic.scores.find(s => s.playerId === player.id)!;
      row.correct = score.correctMasks > 0;
      row.tipPoints = score.score;
      row.wonCounterBets = score.wonCounterBets;
      if (first) {
        row.tipIndex = tips.findIndex(t => t.createdAt === first.tip.createdAt);
        const ep = first.show!.episodeNumber;
        const base = ep <= 1 ? 20 : ep === 2 ? 18 : ep === 3 ? 16 : ep === 4 ? 14 : ep === 5 ? 12 : 10;
        const final = first.tip.isFinal || sorted.some(t => t.tip.isFinal && t.show!.episodeNumber === ep);
        const multiplier = final && row.tipIndex === 0 ? 1.8 : final && row.tipIndex === 1 ? 1.5 : 1;
        const boosted = Math.round(base * multiplier);
        row.components.push({ label: `Grundwert Show ${ep}`, points: base },
          { label: 'Final-Bonus (einschließlich Same-Show-Upgrade)', points: boosted - base },
          { label: 'Pionier-/40%-Wertung einschließlich Rundung', points: row.tipPoints - boosted });
        row.explanation = `Erster richtiger historischer Tipp: „${first.tip.celebrityName}“, ${first.show!.name}. Spätere Tippwechsel löschen den Treffer in CLASSIC nicht.`;
      } else row.explanation = tips.length ? 'Kein richtiger Tipp mit gültiger Show. CLASSIC bestraft falsche Tipps nicht.' : 'Kein Tipp: 0 Tipp-Punkte.';
      Object.assign(tipPoints, classic.tipPoints);
    } else {
      const index = tips.length - 1;
      const tip = tips[index];
      let changes = 0;
      for (let i = 1; i < tips.length; i++) if (!same(tips[i - 1].celebrityName, tips[i].celebrityName)) changes++;
      if (tip) {
        row.tipIndex = index;
        row.correct = same(tip.celebrityName, mask.revealedCelebrity!);
        const op = ops.find(o => o.id === tip.opportunityId)!;
        const ordinal = (mask.priorChanceCount ?? 0) + ops.indexOf(op) + 1;
        const value = opportunityValue(ordinal);
        const late = lateDiscount(tip.createdAt, op);
        if (row.correct) {
          row.components.push({ label: 'Grundwert', points: 20 },
            { label: `Ratechance ${ordinal}`, points: value - 20 },
            { label: 'Zeitabschlag (15/30/45 Minuten; maximal 3)', points: late ? -late : 0 });
          if (tip.isFinal) {
            const finalOp = ops.find(o => o.id === tip.finalOpportunityId)!;
            const finalValue = opportunityValue((mask.priorChanceCount ?? 0) + ops.indexOf(finalOp) + 1) - lateDiscount(tip.finalizedAt!, finalOp);
            row.components.push({ label: 'Final-Risiko-Bonus zum tatsächlichen Sperrzeitpunkt', points: Math.floor(6 * finalValue / 20) });
          }
        } else row.components.push({ label: tip.isFinal ? 'Falscher finaler Tipp' : 'Falscher offener Tipp', points: tip.isFinal ? -6 : -2 });
        row.explanation = `Letzter Tipp zählt: „${tip.celebrityName}“, Ratechance ${ordinal}, ${new Date(tip.createdAt).toLocaleString('de-DE')}. ${row.correct ? 'Richtig.' : 'Falsch.'}`;
      } else row.explanation = 'Kein Tipp: 0 Tipp-Punkte. Keine zusätzliche Strafe fürs Abwarten.';
      row.components.push({ label: `${changes} Identitätswechsel (gleiche Namen zählen nicht)`, points: changes ? -changes : 0 });
      row.tipPoints = row.components.reduce((sum, item) => sum + item.points, 0);
      if (tip) tipPoints[`${mask.id}-${player.id}-${index}`] = row.tipPoints;
    }
    return row;
  });

  for (const bet of season.counterBets.filter(b => b.maskId === mask.id)) {
    const bettor = rows.find(row => row.playerId === bet.bettorPlayerId);
    const target = rows.find(row => row.playerId === bet.targetPlayerId);
    const targetTip = mask.tips[bet.targetPlayerId]?.[bet.targetTipIndex];
    if (!bettor || !target || !targetTip) continue;
    let result = classic?.counterBetPoints[bet.id];
    if (!classic) {
      const targetOp = ops.findIndex(o => o.id === targetTip.opportunityId);
      const betOp = ops.findIndex(o => o.id === bet.opportunityId);
      const decay = Math.max(0, 1 - Math.max(0, betOp - targetOp) * .15);
      const correct = same(targetTip.celebrityName, mask.revealedCelebrity!);
      const final = bet.targetWasFinal === true;
      result = correct ? { bettor: Math.round((final ? -3 : -2) * decay), target: 0 } :
        { bettor: Math.round((final ? 5 : 3) * decay), target: Math.round((final ? -3 : -2) * decay) };
      if (!correct && result.bettor > 0) bettor.wonCounterBets++;
    }
    if (!result) continue;
    // JSON has no negative zero; normalize audit fields without changing the CLASSIC engine.
    result = { bettor: result.bettor || 0, target: result.target || 0 };
    counterBetPoints[bet.id] = result;
    const correct = same(targetTip.celebrityName, mask.revealedCelebrity!);
    bettor.components.push({ label: `Gegenwette auf ${target.playerName}: „${targetTip.celebrityName}“ ${correct ? 'war richtig' : 'war falsch'}`, points: result.bettor });
    target.components.push({ label: `Gegenwette von ${bettor.playerName}: „${targetTip.celebrityName}“ ${correct ? 'war richtig' : 'war falsch'}`, points: result.target });
    bettor.counterBetPoints += result.bettor;
    target.counterBetPoints += result.target;
  }
  rows.forEach(row => { row.total = row.tipPoints + row.counterBetPoints; });
  return { schema: 1, ruleset: version, revealedAt, actualCelebrity: mask.revealedCelebrity,
    players: rows, tipPoints, counterBetPoints,
    evidence: structuredClone({ tips: mask.tips, opportunities: ops, counterBets: season.counterBets.filter(b => b.maskId === mask.id), shows: season.shows,
      ...(mask.priorChanceCount !== undefined ? { priorChanceCount: mask.priorChanceCount } : {}) }) };
}

// CLASSIC keeps its exact original calculator. TOURNAMENT settles once at manual reveal.
export function calculateActiveScores(season: Season, players: Player[]): ScoreCalculationResult {
  if (rulesetOf(season) === 'classic-v1') return calculateClassicScores(season, players);
  const result: ScoreCalculationResult = { scores: players.filter(p => season.playerIds.includes(p.id)).map(p => ({
    playerId: p.id, name: p.name, color: p.color, score: 0, counterBetPoints: 0, totalScore: 0, correctMasks: 0, wonCounterBets: 0 })),
    tipPoints: {}, counterBetPoints: {}, playerMaskPoints: {} };
  for (const mask of season.masks.filter(m => m.isRevealed)) {
    const audit = mask.scoringAudit;
    if (!audit) continue; // Validation rejects tournament saves with unsettled revealed masks.
    Object.assign(result.tipPoints, audit.tipPoints);
    Object.assign(result.counterBetPoints, audit.counterBetPoints);
    for (const row of audit.players) {
      const player = result.scores.find(p => p.playerId === row.playerId);
      if (!player) continue;
      player.score += row.tipPoints;
      player.counterBetPoints += row.counterBetPoints;
      player.correctMasks += Number(row.correct);
      player.wonCounterBets += row.wonCounterBets;
      result.playerMaskPoints[`${mask.id}-${row.playerId}`] = row.total;
    }
  }
  result.scores.forEach(p => { p.totalScore = p.score + p.counterBetPoints; });
  result.scores.sort((a, b) => b.totalScore - a.totalScore);
  return result;
}

export function canChangeRuleset(season: Season): boolean {
  return !season.tournamentTransition && !season.counterBets.length && season.masks.every(m => !m.isRevealed && Object.values(m.tips).every(t => !t.length));
}
