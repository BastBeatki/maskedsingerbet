// Additive validation: unversioned CLASSIC saves retain their existing contract.
export function validAppearanceRules(season: any): boolean {
  if (season.ruleset !== undefined && season.ruleset !== 'classic-v1' && season.ruleset !== 's13-appearances-v1') return false;
  if (season.ruleset !== 's13-appearances-v1') return season.appearanceRules === undefined && season.masks.every((m: any) => m.settlement === undefined);
  const rules = season.appearanceRules;
  if (!rules || !Number.isFinite(rules.activatedAt) || rules.activatedAt <= 0 || !rules.appearances || typeof rules.appearances !== 'object' || Array.isArray(rules.appearances)) return false;
  if (new Set(season.masks.map((m: any) => m.id)).size !== season.masks.length || new Set(season.shows.map((s: any) => s.id)).size !== season.shows.length || new Set(season.shows.map((s: any) => s.episodeNumber)).size !== season.shows.length) return false;
  for (const mask of season.masks) {
    if (Object.values(mask.tips).some((tips: any) => tips.length > 3)) return false;
    if (!mask.isRevealed) {
      if (mask.settlement !== undefined) return false;
      const eps = rules.appearances[mask.id];
      // A newly created mask can be configured in settings before playing.
      if (eps === undefined && Object.values(mask.tips).every((tips: any) => tips.length === 0) && !season.counterBets.some((cb: any) => cb.maskId === mask.id)) continue;
      if (!Array.isArray(eps) || !eps.length || eps.some((n: any, i: number) => !Number.isSafeInteger(n) || n < 1 || (i > 0 && n <= eps[i - 1]))) return false;
      const refs = Object.values(mask.tips).flat().map((t: any) => t.showId);
      if (refs.some(id => !season.shows.some((s: any) => s.id === id && eps.includes(s.episodeNumber)))) return false;
      continue;
    }
    const audit = mask.settlement, r = audit?.result;
    if (!audit || audit.schema !== 1 || !['classic-v1', 's13-appearances-v1'].includes(audit.ruleset) || !Number.isFinite(audit.settledAt) || audit.settledAt < 0 || audit.actualCelebrity !== (mask.revealedCelebrity || '') || !r || !Array.isArray(r.scores) || !audit.explanations) return false;
    if (new Set(r.scores.map((s: any) => s.playerId)).size !== r.scores.length) return false;
    for (const field of ['tipPoints', 'counterBetPoints', 'playerMaskPoints']) if (!r[field] || typeof r[field] !== 'object' || Array.isArray(r[field])) return false;
    if (Object.values(r.tipPoints).some(n => !Number.isSafeInteger(n)) || Object.values(r.playerMaskPoints).some(n => !Number.isSafeInteger(n)) || Object.values(r.counterBetPoints).some((cb: any) => !cb || !Number.isSafeInteger(cb.bettor) || !Number.isSafeInteger(cb.target))) return false;
    for (const row of r.scores) {
      if (typeof row.playerId !== 'string' || typeof row.name !== 'string' || typeof row.color !== 'string' || typeof audit.explanations[row.playerId] !== 'string' || ['score', 'counterBetPoints', 'totalScore', 'correctMasks', 'wonCounterBets'].some(key => !Number.isSafeInteger(row[key])) || row.totalScore !== row.score + row.counterBetPoints || (r.playerMaskPoints[`${mask.id}-${row.playerId}`] || 0) !== row.totalScore || ![0, 1].includes(row.correctMasks) || row.wonCounterBets < 0) return false;
      if (!season.playerIds.includes(row.playerId)) return false;
      const tips = mask.tips[row.playerId] || [];
      const tipTotal = tips.reduce((total: number, _tip: any, i: number) => total + (r.tipPoints[`${mask.id}-${row.playerId}-${i}`] || 0), 0);
      let betTotal = 0, won = 0;
      for (const cb of season.counterBets.filter((cb: any) => cb.maskId === mask.id)) {
        const points = r.counterBetPoints[cb.id];
        if (!points) continue; // Historical CLASSIC skips references that were already deleted.
        if (cb.bettorPlayerId === row.playerId) { betTotal += points.bettor; if (points.bettor > 0) won++; }
        if (cb.targetPlayerId === row.playerId) betTotal += points.target;
      }
      if (tipTotal !== row.score || betTotal !== row.counterBetPoints || won !== row.wonCounterBets) return false;
    }
    const tipKeys = new Set(Object.entries(mask.tips).flatMap(([id, tips]: [string, any]) => tips.map((_tip: any, i: number) => `${mask.id}-${id}-${i}`)));
    if (Object.keys(r.tipPoints).some(key => !tipKeys.has(key)) || Object.keys(r.playerMaskPoints).some(key => !r.scores.some((row: any) => key === `${mask.id}-${row.playerId}`)) || Object.keys(r.counterBetPoints).some(id => !season.counterBets.some((cb: any) => cb.id === id && cb.maskId === mask.id))) return false;
  }
  return true;
}
