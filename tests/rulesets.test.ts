import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import type { Season, Player } from '../types';
import { rulesetOf, buildRevealAudit, calculateActiveScores, lateDiscount, opportunityValue, tournamentEvidenceMissing } from '../rulesets';
import { changeRuleset, openOpportunity, submitTournamentTip, settleTournamentMask, prepareTournamentCopy, setPriorChances } from '../tournamentActions';
import { calculateClassicScores, isValidAppState } from '../utils';
import { saveStateDB, loadStateDB, initializeStorage } from '../storage';

const players: Player[] = [{ id: 'a', name: 'Früh', color: '#123456' }, { id: 'b', name: 'Spät', color: '#654321' }];
const T = 1_000_000, min = 60_000;
function fresh(ep = 4): Season {
  return { id: 's', seasonName: 'Test', ruleset: 'tournament-v1', playerIds: ['a', 'b'],
    shows: [{ id: 'show', name: `Show ${ep}`, episodeNumber: ep }], activeShowId: 'show', counterBets: [],
    masks: [{ id: 'm', name: 'Maske', isRevealed: false, tips: {} }] };
}
function opened(ep = 4) { return openOpportunity(fresh(ep), 'm', 'op1', T); }
function tip(s: Season, id: string, name = 'Richtig', at = T, final = false) { return submitTournamentTip(s, 'm', id, name, final, at); }
function reveal(s: Season, at = T + 120 * min) { return settleTournamentMask(s, 'm', 'Richtig', undefined, players, at); }
function values(s: Season) { return Object.fromEntries(calculateActiveScores(s, players).scores.map(p => [p.playerId, p.totalScore])); }
function next(s: Season, ep = 5, at = T + 7 * 86400_000): Season {
  const show = { id: `show${ep}`, name: `Show ${ep}`, episodeNumber: ep };
  return openOpportunity({ ...s, shows: [...s.shows, show], activeShowId: show.id }, 'm', `op${ep}`, at);
}

test('late-debut masks have exactly the same starting value in prelim 1 and 4', () => {
  assert.deepEqual(values(reveal(tip(opened(1), 'a'))), { a: 20, b: 0 });
  assert.deepEqual(values(reveal(tip(opened(4), 'a'))), { a: 20, b: 0 });
});
test('all players score their own early/late guess without 40% follower reduction', () => {
  assert.deepEqual(values(reveal(tip(tip(opened(), 'a'), 'b', 'Richtig', T + 45 * min))), { a: 20, b: 17 });
});
test('ordinary tip immediately before reveal gets regular delay discount, no special punishment', () => {
  assert.deepEqual(values(reveal(tip(opened(), 'b', 'Richtig', T + 120 * min - 1))), { a: 0, b: 17 });
});
test('15/30/45 minute thresholds and bounded waiting discount are reproducible', () => {
  const op = opened().masks[0].opportunities![0];
  assert.deepEqual([0, 15 * min - 1, 15 * min, 30 * min, 45 * min, 7 * 86400_000].map(dt => lateDiscount(T + dt, op)), [0, 0, 1, 2, 3, 3]);
  assert.deepEqual([1, 2, 3, 4, 5, 99].map(opportunityValue), [20, 16, 12, 8, 8, 8]);
});
test('different early final locks grant personal risk bonuses', () => {
  assert.deepEqual(values(reveal(tip(tip(opened(), 'a', 'Richtig', T, true), 'b', 'Richtig', T + 45 * min, true))), { a: 26, b: 22 });
});
test('late lock retains early correct identity but does not backdate the final risk bonus', () => {
  const s = tip(tip(opened(), 'a'), 'a', ' Richtig ', T + 45 * min, true);
  assert.equal(s.masks[0].tips.a[1].createdAt, T);
  assert.equal(s.masks[0].tips.a[1].finalizedAt, T + 45 * min);
  assert.equal(values(reveal(s)).a, 25);
  assert.throws(() => tip(s, 'a', 'Anders', T + 46 * min), /gesperrt/);
});
test('same identity on a later opportunity retains discovery timing, lock uses new opportunity', () => {
  const at = T + 7 * 86400_000;
  const s = tip(next(tip(opened(), 'a')), 'a', 'Richtig', at, true);
  assert.equal(s.masks[0].tips.a[1].opportunityId, 'op1');
  assert.equal(s.masks[0].tips.a[1].finalOpportunityId, 'op5');
  assert.equal(values(reveal(s, at + 60 * min)).a, 24);
});
test('changing from correct to wrong removes the old hit; returning resets timing and costs each change', () => {
  const wrong = tip(tip(opened(), 'a'), 'a', 'Falsch', T + min);
  assert.equal(values(reveal(wrong)).a, -3);
  const back = tip(wrong, 'a', 'Richtig', T + 45 * min);
  assert.equal(values(reveal(back)).a, 15);
});
test('no tip costs zero; wrong ordinary -2 and wrong final -6', () => {
  assert.deepEqual(values(reveal(tip(tip(opened(), 'a', 'Falsch'), 'b', 'Falsch', T, true))), { a: -2, b: -6 });
});
test('more than three ordinary tips allowed until reveal, immutable history cannot erase change cost', () => {
  let s = opened();
  for (let i = 0; i < 4; i++) s = tip(s, 'a', `Falsch${i}`, T + i * min);
  s = tip(s, 'a', 'Richtig', T + 5 * min, true);
  assert.equal(values(reveal(s)).a, 22);
  assert.equal(s.masks[0].tips.a.length, 5);
});
test('prelim exit, semifinalist and finalist preserve original early value; later guesses lose opportunity points', () => {
  const early = tip(opened(), 'a');
  assert.equal(values(reveal(early)).a, 20);
  const semifinal = next(early);
  const final = next(semifinal, 6, T + 14 * 86400_000);
  assert.equal(values(reveal(final, T + 15 * 86400_000)).a, 20);
  assert.equal(values(reveal(tip(final, 'b', 'Richtig', T + 14 * 86400_000), T + 15 * 86400_000)).b, 12);
});
test('unknown future episode and extra appearances need no hard-coded TV plan', () => {
  let s = next(opened(), 27, T + 2 * 86400_000);
  s = openOpportunity(s, 'm', 'extra-round', T + 2 * 86400_000 + 30 * min);
  s = tip(s, 'a', 'Richtig', T + 2 * 86400_000 + 30 * min);
  assert.equal(values(reveal(s, T + 3 * 86400_000)).a, 12);
});
test('ratechance guard rejects absent active show, revealed mask, duplicate id and backwards clock/show', () => {
  assert.throws(() => tip(fresh(), 'a'), /Ratechance/);
  assert.throws(() => openOpportunity({ ...fresh(), activeShowId: null }, 'm', 'op', T), /Show/);
  assert.throws(() => openOpportunity(opened(), 'm', 'op1', T), /Ungültig/);
  assert.throws(() => openOpportunity(opened(), 'm', 'other', T - 1), /Uhrzeit/);
  const after = next(opened());
  assert.throws(() => openOpportunity({ ...after, activeShowId: 'show' }, 'm', 'older', T + 8 * 86400_000), /früheren/);
  assert.throws(() => tip(reveal(opened()), 'a'), /nicht zum Tippen/);
});
test('settlement requires manual valid reveal and happens once', () => {
  const s = reveal(tip(opened(), 'a'));
  assert.throws(() => reveal(s), /bereits/);
  assert.throws(() => reveal(tip(opened(), 'a', 'Richtig', T + 200 * min)), /Enthüllungszeit/);
  const original = structuredClone(s);
  for (let i = 0; i < 3; i++) { calculateActiveScores(s, players); buildRevealAudit(s, s.masks[0], players, T + 120 * min, 'classic-v1'); }
  assert.deepEqual(s, original);
  const row = s.masks[0].scoringAudit!.players[0];
  assert.equal(row.components.reduce((sum, c) => sum + c.points, 0), row.total);
});
test('counterbets use immutable targeted tip and final state at bet time, opportunity decay', () => {
  let s = tip(opened(), 'a', 'Falsch');
  s = { ...s, counterBets: [{ id: 'cb', showId: 'show', maskId: 'm', bettorPlayerId: 'b', targetPlayerId: 'a', targetTipIndex: 0,
    opportunityId: 'op1', createdAt: T + min, targetWasFinal: false }] };
  s = tip(s, 'a', 'Richtig', T + 2 * min, true);
  const settled = reveal(s);
  assert.deepEqual(settled.masks[0].scoringAudit!.counterBetPoints.cb, { bettor: 3, target: -2 });
  assert.deepEqual(values(settled), { a: 23, b: 3 });
  assert.equal(calculateActiveScores(settled, players).scores.find(p => p.playerId === 'b')!.wonCounterBets, 1);
  assert.equal(isValidAppState({ players, seasons: [settled] }), true);
});
test('wrong counterbet against a correct final costs -3; normal stale counterbet decays by mask opportunities', () => {
  const at = T + 14 * 86400_000;
  let s = next(next(tip(opened(), 'a', 'Richtig', T, true)), 6, at);
  s.counterBets = [{ id: 'cb', showId: 'show6', maskId: 'm', bettorPlayerId: 'b', targetPlayerId: 'a', targetTipIndex: 0,
    opportunityId: 'op6', createdAt: at, targetWasFinal: true }];
  assert.deepEqual(reveal(s, at + min).masks[0].scoringAudit!.counterBetPoints.cb, { bettor: -2, target: 0 });
  const early = tip(opened(), 'a', 'Richtig', T, true);
  early.counterBets = [{ ...s.counterBets[0], showId: 'show', opportunityId: 'op1', createdAt: T }];
  assert.deepEqual(reveal(early).masks[0].scoringAudit!.counterBetPoints.cb, { bettor: -3, target: 0 });
});
test('unversioned old S12 remains CLASSIC byte-for-byte and has no fabricated tournament timing', () => {
  const s = fresh(1); delete s.ruleset;
  s.masks[0] = { ...s.masks[0], isRevealed: true, revealedCelebrity: 'Richtig', tips: {
    a: [{ celebrityName: 'Richtig', createdAt: T, showId: 'show' }, { celebrityName: 'Falsch', createdAt: T + 1, showId: 'show' }],
    b: [{ celebrityName: 'Richtig', createdAt: T + 2, showId: 'show' }] } };
  const before = JSON.stringify(s);
  assert.equal(rulesetOf(s), 'classic-v1');
  assert.deepEqual(values(s), { a: 20, b: 8 });
  assert.deepEqual(calculateActiveScores(s, players), calculateClassicScores(s, players));
  assert.equal(tournamentEvidenceMissing(s, s.masks[0]), true);
  assert.throws(() => buildRevealAudit(s, s.masks[0], players, T, 'tournament-v1'), /Ratezeiten/);
  assert.equal(JSON.stringify(s), before);
  assert.equal(isValidAppState({ players, seasons: [s] }), true);
});
test('CLASSIC exact base ladder, final slot and same-show upgrade remain reproducible', () => {
  for (const [ep, expected] of [[1, 20], [2, 18], [3, 16], [4, 14], [5, 12], [6, 10], [19, 10]]) {
    const s = fresh(ep); s.ruleset = 'classic-v1';
    s.masks[0].isRevealed = true; s.masks[0].revealedCelebrity = 'Richtig';
    s.masks[0].tips.a = [{ celebrityName: 'Richtig', showId: 'show', createdAt: T }];
    assert.equal(values(s).a, expected);
    s.masks[0].tips.a.push({ celebrityName: 'Richtig', showId: 'show', createdAt: T + 1, isFinal: true });
    assert.equal(values(s).a, Math.round(expected * 1.8));
  }
});
test('ruleset selection is reversible before tips, locked afterward; season label never auto-selects rules', () => {
  let s = fresh(); delete s.ruleset; s.seasonName = 'Staffel 13';
  assert.equal(rulesetOf(s), 'classic-v1');
  s = changeRuleset(s, 'tournament-v1');
  assert.equal(changeRuleset(s, 'classic-v1').ruleset, 'classic-v1');
  assert.throws(() => changeRuleset(tip(openOpportunity(s, 'm', 'op1', T), 'a'), 'classic-v1'), /Regelwechsel/);
});
test('persisted audit, event timing and points survive JSON export/import, IndexedDB reload without startup rewrite', async () => {
  globalThis.indexedDB = new IDBFactory();
  const state = { players, seasons: [reveal(tip(tip(opened(), 'a', 'Richtig', T, true), 'b', 'Falsch'))] };
  const imported = JSON.parse(JSON.stringify(state));
  assert.equal(isValidAppState(imported), true);
  await saveStateDB(imported);
  assert.deepEqual(await loadStateDB(), imported);
  let writes = 0;
  const loaded = await initializeStorage({ load: loadStateDB, save: async () => { writes++; }, storage: { getItem: () => null, removeItem: () => {} } });
  assert.equal(writes, 0);
  assert.deepEqual(loaded.state, imported);
  assert.deepEqual(values(loaded.state.seasons[0]), { a: 26, b: -2 });
});
test('unknown rule versions, missing/future timing and malformed audit fail closed on import', () => {
  const valid = { players, seasons: [reveal(tip(opened(), 'a'))] };
  const mutations = [
    (s: any) => { s.ruleset = 'tournament-v2'; },
    (s: any) => { delete s.masks[0].scoringAudit; },
    (s: any) => { s.masks[0].tips.a[0].createdAt = Infinity; },
    (s: any) => { s.masks[0].tips.a[0].opportunityId = 'missing'; },
    (s: any) => { s.masks[0].scoringAudit.players[0].total++; },
    (s: any) => { s.masks[0].scoringAudit.players[0].components[0].points++; },
    (s: any) => { s.masks[0].opportunities[0].showId = 'missing'; },
    (s: any) => { s.masks[0].scoringAudit.evidence.tips = {}; },
  ];
  for (const mutate of mutations) {
    const state = structuredClone(valid); mutate(state.seasons[0]);
    assert.equal(isValidAppState(state), false);
  }
});

test('explicit transition copy freezes old CLASSIC settlements and archives open tips/bets without changing original', () => {
  const source = fresh(); delete source.ruleset;
  source.masks[0] = { ...source.masks[0], isRevealed: true, revealedCelebrity: 'Richtig', tips: {
    a: [{ celebrityName: 'Richtig', showId: 'show', createdAt: T, isFinal: true }],
    b: [{ celebrityName: 'Richtig', showId: 'show', createdAt: T + 1, isFinal: false }] } };
  source.masks.push({ id: 'open', name: 'Halbfinalist', isRevealed: false,
    tips: { a: [{ celebrityName: 'Vorheriger Tipp', showId: 'show', createdAt: T, isFinal: false }] } });
  source.counterBets.push({ id: 'old-bet', maskId: 'open', showId: 'show', bettorPlayerId: 'b', targetPlayerId: 'a', targetTipIndex: 0 });
  const before = structuredClone(source);
  let copy = prepareTournamentCopy(source, players, 'copy', T + 86400_000);
  assert.deepEqual(source, before);
  assert.deepEqual(values(copy), values(source));
  assert.equal(copy.masks[0].scoringAudit!.ruleset, 'classic-v1');
  assert.equal(copy.masks[0].scoringAudit!.revealedAt, 0); // Unknown old reveal time remains unknown.
  assert.deepEqual(copy.masks[1].legacyTips, source.masks[1].tips);
  assert.deepEqual(copy.masks[1].tips, {});
  assert.deepEqual(copy.legacyOpenCounterBets, source.counterBets);
  assert.deepEqual(copy.counterBets, []);
  assert.equal(isValidAppState({ players, seasons: [source, copy] }), true);
  assert.throws(() => openOpportunity(copy, 'open', 'new', T + 86400_000), /vergangenen/);
  copy = setPriorChances(copy, 'open', 1);
  copy = openOpportunity(copy, 'open', 'new', T + 86400_000);
  copy = submitTournamentTip(copy, 'open', 'a', 'Richtig', true, T + 86400_000);
  copy = settleTournamentMask(copy, 'open', 'Richtig', undefined, players, T + 86400_000 + min);
  assert.equal(copy.masks[1].scoringAudit!.players.find(p => p.playerId === 'a')!.total, 20); // Chance 2: 16 + 4 final.
  assert.equal(copy.masks[1].scoringAudit!.evidence.priorChanceCount, 1);
  assert.equal(values(copy).a, values(source).a + 20);
  assert.equal(isValidAppState(JSON.parse(JSON.stringify({ players, seasons: [source, copy] }))), true);
  assert.deepEqual(source, before);
  assert.throws(() => setPriorChances(copy, 'open', 0), /ersten neuen/);
});
test('transition setup distinguishes debut (chance 1) from prior performer (chance 2); no guessed chronology', () => {
  const source = fresh(); source.ruleset = 'classic-v1';
  let debut = prepareTournamentCopy(source, players, 'debut-copy', T);
  let known = prepareTournamentCopy(source, players, 'known-copy', T);
  debut = setPriorChances(debut, 'm', 0); known = setPriorChances(known, 'm', 1);
  assert.equal(values(reveal(tip(openOpportunity(debut, 'm', 'new', T), 'a'))).a, 20);
  assert.equal(values(reveal(tip(openOpportunity(known, 'm', 'new', T), 'a'))).a, 16);
  for (const count of [-1, .5, Infinity, 1001]) assert.throws(() => setPriorChances(prepareTournamentCopy(source, players, 'copy', T), 'm', count), /ganze Zahl/);
});
test('direct later-show reveal and last-minute guessing require no fabricated additional appearance', () => {
  let s = tip(opened(), 'a');
  s = { ...s, shows: [...s.shows, { id: 'direct', name: 'Direktenthüllung', episodeNumber: 7 }], activeShowId: 'direct' };
  const at = T + 7 * 86400_000;
  s = tip(s, 'b', 'Richtig', at);
  assert.equal(s.masks[0].opportunities!.length, 1);
  assert.equal(s.masks[0].tips.b[0].showId, 'direct');
  s = reveal(s, at + 1);
  assert.deepEqual(values(s), { a: 20, b: 17 });
  assert.equal(isValidAppState({ players, seasons: [s] }), true);
  const noTips = reveal(fresh());
  assert.deepEqual(values(noTips), { a: 0, b: 0 });
  assert.equal(isValidAppState({ players, seasons: [noTips] }), true);
});
