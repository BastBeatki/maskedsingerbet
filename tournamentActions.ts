import type { Season, Tip, Player, RulesetVersion } from './types';
import { buildRevealAudit, canChangeRuleset, rulesetOf } from './rulesets';

// Explicit new game/epoch. Never mutate or reinterpret the original save.
export function prepareTournamentCopy(source: Season, players: Player[], id: string, at: number): Season {
  if (rulesetOf(source) !== 'classic-v1') throw new Error('Diese Kopie ist für einen bisherigen CLASSIC-Spielstand gedacht.');
  const copy = structuredClone(source);
  const openIds = new Set(copy.masks.filter(m => !m.isRevealed).map(m => m.id));
  copy.masks = copy.masks.map(mask => mask.isRevealed ? { ...mask,
    scoringAudit: buildRevealAudit(source, mask, players, mask.scoringAudit?.revealedAt ?? 0, 'classic-v1') } : {
    ...mask, tips: {}, legacyTips: mask.tips, opportunities: [], priorChanceCount: undefined,
  });
  copy.legacyOpenCounterBets = copy.counterBets.filter(b => openIds.has(b.maskId));
  copy.counterBets = copy.counterBets.filter(b => !openIds.has(b.maskId));
  return { ...copy, id, seasonName: `${source.seasonName} · Turnier-Kopie`, ruleset: 'tournament-v1',
    tournamentTransition: { sourceSeasonId: source.id, preparedAt: at } };
}
export function setPriorChances(season: Season, maskId: string, count: number): Season {
  const mask = season.masks.find(m => m.id === maskId);
  if (!season.tournamentTransition || !mask || mask.isRevealed || mask.opportunities?.length || Object.values(mask.tips).some(t => t.length))
    throw new Error('Vergangene Ratechancen nur vor dem ersten neuen Turnierereignis festlegen.');
  if (!Number.isSafeInteger(count) || count < 0 || count > 1000) throw new Error('Ratechancen als ganze Zahl von 0 bis 1000 angeben.');
  return { ...season, masks: season.masks.map(m => m.id === maskId ? { ...m, priorChanceCount: count } : m) };
}

export function changeRuleset(season: Season, version: RulesetVersion): Season {
  if (!canChangeRuleset(season)) throw new Error('Regelwechsel nur vor dem ersten Tipp oder der ersten Enthüllung. Alte Rate-/Finalzeiten fehlen; vorhandene Spielstände bleiben erhalten.');
  return { ...season, ruleset: version };
}
export function openOpportunity(season: Season, maskId: string, id: string, at: number): Season {
  if (!season.activeShowId || !season.shows.some(s => s.id === season.activeShowId)) throw new Error('Zuerst eine Show auswählen.');
  const mask = season.masks.find(m => m.id === maskId);
  if (!mask || mask.isRevealed) throw new Error('Maske nicht offen.');
  if (season.tournamentTransition && mask.priorChanceCount === undefined) throw new Error('Zuerst die tatsächlich vergangenen Ratechancen dieser Maske festlegen (0 bei Debüt).');
  const ops = mask.opportunities ?? [];
  if (!Number.isFinite(at) || at < 0 || !id || ops.some(op => op.id === id)) throw new Error('Ungültige Ratechance.');
  if (ops.length && at < ops[ops.length - 1].openedAt) throw new Error('Uhrzeit liegt vor der letzten Ratechance.');
  if (ops.length && season.shows.find(s => s.id === season.activeShowId)!.episodeNumber <
    season.shows.find(s => s.id === ops[ops.length - 1].showId)!.episodeNumber) throw new Error('Keine neue Ratechance in einer früheren Show.');
  return { ...season, masks: season.masks.map(m => m.id === maskId ? { ...m,
    opportunities: [...ops, { id, openedAt: at, showId: season.activeShowId! }] } : m) };
}
export function submitTournamentTip(season: Season, maskId: string, playerId: string, name: string, final: boolean, at: number): Season {
  const mask = season.masks.find(m => m.id === maskId);
  if (!mask || mask.isRevealed || !season.playerIds.includes(playerId)) throw new Error('Maske oder Spieler nicht zum Tippen verfügbar.');
  const op = mask.opportunities?.at(-1);
  const activeShow = season.shows.find(s => s.id === season.activeShowId);
  if (!op || !activeShow) throw new Error('Für diese Maske zuerst eine Ratechance starten und eine Show auswählen.');
  if (activeShow.episodeNumber < season.shows.find(s => s.id === op.showId)!.episodeNumber) throw new Error('Keine neuen Tipps in einer früheren Show.');
  const tips = mask.tips[playerId] ?? [];
  const last = tips.at(-1);
  if (tips.some(t => t.isFinal)) throw new Error('Finaler Tipp ist gesperrt.');
  if (!name.trim()) throw new Error('Namen eingeben.');
  if (!Number.isFinite(at) || at < op.openedAt || (last && at < last.createdAt)) throw new Error('Tippzeit liegt vor der Ratechance oder dem letzten Tipp.');
  const unchanged = last && last.celebrityName.trim().toLowerCase() === name.trim().toLowerCase();
  if (unchanged && !final) return season;
  // A lock is a new event, but cannot backdate its risk bonus to the earlier guess.
  const tip: Tip = { celebrityName: name.trim(), showId: unchanged ? last.showId : season.activeShowId!,
    createdAt: unchanged ? last.createdAt : at, opportunityId: unchanged ? last.opportunityId : op.id,
    isFinal: final, ...(final ? { finalizedAt: at, finalOpportunityId: op.id } : {}) };
  return { ...season, masks: season.masks.map(m => m.id === maskId ? { ...m,
    tips: { ...m.tips, [playerId]: [...tips, tip] } } : m) };
}
export function settleTournamentMask(season: Season, maskId: string, name: string, image: string | undefined, players: Player[], at: number): Season {
  const old = season.masks.find(m => m.id === maskId);
  if (!old || old.isRevealed || !name.trim()) throw new Error('Maske bereits enthüllt oder Name fehlt.');
  if (!season.activeShowId || !season.shows.some(s => s.id === season.activeShowId)) throw new Error('Zuerst die Enthüllungsshow auswählen.');
  const latest = old.opportunities?.at(-1);
  // A direct reveal may bring no new information/appearance. Never fabricate a ratechance for it.
  const lastEvent = Math.max(latest?.openedAt ?? 0, ...Object.values(old.tips).flat().map(t => t.finalizedAt ?? t.createdAt),
    ...season.counterBets.filter(b => b.maskId === maskId).map(b => b.createdAt ?? 0));
  if (!Number.isFinite(at) || at < lastEvent) throw new Error('Enthüllungszeit liegt vor einem gespeicherten Ereignis.');
  const mask = { ...old, isRevealed: true, revealedCelebrity: name.trim(), ...(image !== undefined ? { celebrityImageUrl: image } : {}),
    revealedInShowId: season.activeShowId };
  const audit = buildRevealAudit(season, mask, players, at, 'tournament-v1');
  return { ...season, masks: season.masks.map(m => m.id === maskId ? { ...mask, scoringAudit: audit } : m) };
}
