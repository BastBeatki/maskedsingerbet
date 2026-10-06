import type { Season, RevealAudit } from './types';

const record = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const time = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);
const version = (v: unknown) => v === 'classic-v1' || v === 'tournament-v1';
const lookup = (v: unknown, predicate: (v: any) => boolean) => record(v) && Object.values(v).every(predicate);
const tipShape = (t: any) => record(t) && typeof t.celebrityName === 'string' && typeof t.showId === 'string' && time(t.createdAt) &&
  (t.isFinal === undefined || typeof t.isFinal === 'boolean');
const opShape = (o: any) => record(o) && typeof o.id === 'string' && typeof o.showId === 'string' && time(o.openedAt);
const betShape = (b: any) => record(b) && ['id', 'showId', 'maskId', 'bettorPlayerId', 'targetPlayerId'].every(k => typeof b[k] === 'string') &&
  integer(b.targetTipIndex) && b.targetTipIndex >= 0;
const showShape = (s: any) => record(s) && typeof s.id === 'string' && typeof s.name === 'string' && typeof s.episodeNumber === 'number' && Number.isFinite(s.episodeNumber);
function validAudit(a: any): a is RevealAudit {
  if (!record(a) || a.schema !== 1 || !version(a.ruleset) || !time(a.revealedAt) || typeof a.actualCelebrity !== 'string' || !a.actualCelebrity.trim() ||
      !Array.isArray(a.players) || !record(a.evidence) || !record(a.evidence.tips) || !Array.isArray(a.evidence.opportunities) ||
      !Array.isArray(a.evidence.counterBets) || !Array.isArray(a.evidence.shows) || !lookup(a.tipPoints, integer) ||
      !lookup(a.counterBetPoints, v => record(v) && integer(v.bettor) && integer(v.target))) return false;
  if (!Object.values(a.evidence.tips).every(tips => Array.isArray(tips) && tips.every(tipShape)) ||
      !a.evidence.opportunities.every(opShape) || !a.evidence.counterBets.every(betShape) || !a.evidence.shows.every(showShape)) return false;
  if (new Set(a.players.map((p: any) => p?.playerId)).size !== a.players.length) return false;
  return a.players.every((p: any) => record(p) && typeof p.playerId === 'string' && typeof p.playerName === 'string' &&
    typeof p.correct === 'boolean' && (p.tipIndex === null || integer(p.tipIndex) && p.tipIndex >= 0) &&
    [p.tipPoints, p.counterBetPoints, p.total, p.wonCounterBets].every(integer) && p.wonCounterBets >= 0 &&
    p.total === p.tipPoints + p.counterBetPoints && typeof p.explanation === 'string' && Array.isArray(p.components) &&
    p.components.every((c: any) => record(c) && typeof c.label === 'string' && integer(c.points)) &&
    p.components.reduce((sum: number, c: any) => sum + c.points, 0) === p.total);
}

// Called after the original legacy-shape checks. Never upgrades or rewrites a save.
export function validRulesetData(season: Season): boolean {
  if (season.ruleset !== undefined && !version(season.ruleset)) return false;
  if (season.tournamentTransition !== undefined && (!record(season.tournamentTransition) ||
    typeof season.tournamentTransition.sourceSeasonId !== 'string' || season.tournamentTransition.sourceSeasonId === season.id ||
    !time(season.tournamentTransition.preparedAt) || season.ruleset !== 'tournament-v1')) return false;
  if (season.legacyOpenCounterBets !== undefined && (!Array.isArray(season.legacyOpenCounterBets) || !season.legacyOpenCounterBets.every(betShape))) return false;
  for (const mask of season.masks) {
    const ops = mask.opportunities ?? [];
    if (!Array.isArray(ops) || new Set(ops.map(o => o?.id)).size !== ops.length) return false;
    if (!ops.every((o, i) => record(o) && typeof o.id === 'string' && !!o.id && time(o.openedAt) &&
      season.shows.some(s => s.id === o.showId) && (i === 0 || o.openedAt >= ops[i - 1].openedAt))) return false;
    if (mask.scoringAudit !== undefined && (!validAudit(mask.scoringAudit) || !mask.isRevealed ||
      mask.scoringAudit.actualCelebrity !== mask.revealedCelebrity)) return false;
    if (mask.priorChanceCount !== undefined && (!integer(mask.priorChanceCount) || mask.priorChanceCount < 0 || mask.priorChanceCount > 1000)) return false;
    if (mask.legacyTips !== undefined && (!record(mask.legacyTips) || !Object.values(mask.legacyTips).every(t => Array.isArray(t) && t.every(tipShape)))) return false;
    if (season.ruleset !== 'tournament-v1') continue;
    if (!season.shows.every(showShape) || season.counterBets.some(b => !betShape(b) || !season.masks.some(m => m.id === b.maskId))) return false;
    if (mask.isRevealed && (!mask.scoringAudit || mask.scoringAudit.ruleset !== 'tournament-v1' && !season.tournamentTransition)) return false;
    if (mask.isRevealed && mask.scoringAudit?.ruleset === 'classic-v1' && season.tournamentTransition) continue;
    if (season.tournamentTransition && mask.priorChanceCount === undefined && (ops.length || Object.values(mask.tips).some(t => t.length))) return false;
    for (const tips of Object.values(mask.tips)) {
      for (let i = 0; i < tips.length; i++) {
        const tip = tips[i];
        const op = ops.find(o => o.id === tip.opportunityId);
        if (!op || !season.shows.some(s => s.id === tip.showId) || !time(tip.createdAt) || tip.createdAt < op.openedAt ||
          !tip.celebrityName.trim() || typeof tip.isFinal !== 'boolean' || tips.slice(0, i).some(t => t.isFinal)) return false;
        if (tip.isFinal) {
          const finalOp = ops.find(o => o.id === tip.finalOpportunityId);
          if (!finalOp || !time(tip.finalizedAt) || tip.finalizedAt < tip.createdAt || tip.finalizedAt < finalOp.openedAt ||
            ops.indexOf(finalOp) < ops.indexOf(op)) return false;
        } else if (tip.finalizedAt !== undefined || tip.finalOpportunityId !== undefined) return false;
        if (mask.scoringAudit && (tip.createdAt > mask.scoringAudit.revealedAt || (tip.finalizedAt ?? 0) > mask.scoringAudit.revealedAt)) return false;
      }
    }
    for (const bet of season.counterBets.filter(b => b.maskId === mask.id)) {
      const op = ops.find(o => o.id === bet.opportunityId);
      const target = mask.tips[bet.targetPlayerId]?.[bet.targetTipIndex];
      if (!op || !season.shows.some(s => s.id === bet.showId) || !time(bet.createdAt) || bet.createdAt < op.openedAt ||
        typeof bet.targetWasFinal !== 'boolean' || !integer(bet.targetTipIndex) || bet.targetTipIndex < 0 || !target ||
        bet.createdAt < target.createdAt || ops.findIndex(o => o.id === target.opportunityId) > ops.indexOf(op) ||
        bet.bettorPlayerId === bet.targetPlayerId ||
        mask.scoringAudit && bet.createdAt > mask.scoringAudit.revealedAt) return false;
    }
    if (mask.scoringAudit) {
      const evidence = mask.scoringAudit.evidence;
      if (JSON.stringify(evidence.tips) !== JSON.stringify(mask.tips) || JSON.stringify(evidence.opportunities) !== JSON.stringify(ops) ||
        JSON.stringify(evidence.counterBets) !== JSON.stringify(season.counterBets.filter(b => b.maskId === mask.id)) || evidence.priorChanceCount !== mask.priorChanceCount) return false;
    }
  }
  return true;
}
