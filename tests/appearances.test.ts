import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { activateAppearances, activeScores, appearanceNumber, assertOpenAppearance, explainMask, settleMask, simulatedMask, updateAppearancePlan } from '../appearanceRules';
import { calculateScores, getPointsForShow, isValidAppState } from '../utils';
import { initializeStorage, loadStateDB, saveStateDB } from '../storage';
import { Mask, Season } from '../types';

const players = [{ id: 'a', name: 'A', color: '#123456' }, { id: 'b', name: 'B', color: '#654321' }];
const tip = (name = 'Richtig', show = 4, at = 100, final = false) => ({ celebrityName: name, showId: `s${show}`, createdAt: at, isFinal: final });
function fixture(): Season {
  return { id: 'season', seasonName: 'Staffel 13', playerIds: ['a', 'b'], activeShowId: 's4',
    shows: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ({ id: `s${n}`, name: `Show ${n}`, episodeNumber: n })), counterBets: [],
    masks: [{ id: 'm', name: 'Maske', tips: { a: [tip()] }, isRevealed: false }] };
}
function revealed(season: Season): Mask { return { ...season.masks[0], isRevealed: true, revealedCelebrity: 'Richtig', revealedInShowId: season.activeShowId! }; }
const plan = { m: [4, 5, 6, 7, 8, 9] };
for (const debut of [1, 2, 3, 4]) for (const slot of [1, 2, 3]) for (const final of [false, true]) {
  test(`debut ${debut}, slot ${slot}, final ${final}: shared CLASSIC factors with first-appearance basis`, () => {
    const s = fixture(); s.masks[0].tips.a = [...Array.from({ length: slot - 1 }, (_, i) => tip('Falsch', debut, i)), tip('Richtig', debut, 100, final)];
    const enabled = activateAppearances(s, players, { m: [debut, 5, 6] });
    const score = simulatedMask(enabled, revealed(enabled), players, true).scores.find(r => r.playerId === 'a')!;
    assert.equal(score.score, Math.round(20 * (final ? slot === 1 ? 1.8 : slot === 2 ? 1.5 : 1 : 1)));
  });
}
test('early open pioneer beats late third-slot final: 20 vs 8, no extra change penalty', () => {
  const s = fixture(); s.masks[0].tips.b = [tip('Falsch', 4, 110), tip('Andere', 4, 120), tip('Richtig', 4, 130, true)];
  const enabled = activateAppearances(s, players, plan), rows = simulatedMask(enabled, revealed(enabled), players, true).scores;
  assert.equal(rows.find(r => r.playerId === 'a')!.score, 20); assert.equal(rows.find(r => r.playerId === 'b')!.score, 8);
});
test('same-show final upgrade uses the original discovery slot, old later wrong tip does not remove a hit', () => {
  const s = fixture(); s.masks[0].tips.a = [tip(), tip('Richtig', 4, 120, true), tip('Falsch', 5, 200)];
  const enabled = activateAppearances(s, players, plan); assert.equal(simulatedMask(enabled, revealed(enabled), players, true).scores[0].score, 36);
});
test('second-slot final follower uses 40 percent: round(20 * 1.5 * .4) = 12', () => {
  const s = fixture(); s.masks[0].tips.b = [tip('Falsch', 4, 1), tip('Richtig', 4, 110, true)];
  const enabled = activateAppearances(s, players, plan); assert.equal(simulatedMask(enabled, revealed(enabled), players, true).scores.find(r => r.playerId === 'b')!.score, 12);
});
for (const [show, expected] of [[4, 20], [5, 18], [6, 16], [7, 14], [8, 12], [9, 10]]) test(`mask appearance at show ${show} gives ${expected}, including semifinal/final`, () => {
  const s = fixture(); s.masks[0].tips.a = [tip('Richtig', show)];
  const enabled = activateAppearances(s, players, plan); assert.equal(simulatedMask(enabled, revealed(enabled), players, true).scores[0].score, expected);
});
test('early first-show hit remains worth 20 when mask reaches the final', () => {
  const enabled = activateAppearances(fixture(), players, plan); enabled.activeShowId = 's6';
  assert.equal(simulatedMask(enabled, revealed(enabled), players, true).scores[0].score, 20);
});
test('counterbets in another masks show remain allowed; direct reveal requires no invented appearance', () => {
  const s = fixture(); s.masks[0].tips.a = [tip('Richtig', 1)];
  s.counterBets = [{ id: 'between', maskId: 'm', showId: 's4', bettorPlayerId: 'b', targetPlayerId: 'a', targetTipIndex: 0 }];
  const enabled = activateAppearances(s, players, { m: [1, 5, 6] });
  const audit = settleMask(enabled, revealed(enabled), players, true, 1000);
  assert.deepEqual(audit.result.counterBetPoints, calculateScores({ ...s, masks: [revealed(s)] }, players).counterBetPoints);
  assert.equal(audit.result.scores.find(row => row.playerId === 'a')!.score, 20);
});
test('passing shows of OTHER masks never changes this mask basis; skipped shows can be configured', () => {
  const s = fixture(); s.masks[0].tips.a = [tip('Richtig', 6)];
  const enabled = activateAppearances(s, players, { m: [4, 6] }); assert.equal(simulatedMask(enabled, revealed(enabled), players, true).scores[0].score, 18);
});
for (const final of [false, true]) for (const correct of [false, true]) test(`counterbets retain original show decay, correct=${correct}, final=${final}`, () => {
  const s = fixture(); s.masks[0].tips.a = [tip(correct ? 'Richtig' : 'Falsch', 1, 100, final)];
  s.counterBets = [{ id: 'bet', showId: 's5', maskId: 'm', bettorPlayerId: 'b', targetPlayerId: 'a', targetTipIndex: 0 }];
  const enabled = activateAppearances(s, players, { m: [1, 5, 6] }), m = revealed(enabled);
  assert.deepEqual(simulatedMask(enabled, m, players, true).counterBetPoints, simulatedMask(enabled, m, players, false).counterBetPoints);
  assert.deepEqual(simulatedMask(enabled, m, players, true).counterBetPoints.bet,
    correct ? { bettor: Math.round((final ? -3 : -2) * .4), target: 0 } : { bettor: Math.round((final ? 5 : 3) * .4), target: Math.round((final ? -3 : -2) * .4) });
});
test('activation preserves season ID, open tip slots, old counterbets and ALL historical score maps', () => {
  const s = fixture(); const past = { ...revealed(s), id: 'past', tips: { a: [tip('Richtig', 1)] }, revealedInShowId: 's1' };
  s.masks.push(past); s.counterBets.push({ id: 'past-bet', maskId: 'past', showId: 's3', bettorPlayerId: 'b', targetPlayerId: 'a', targetTipIndex: 0 });
  const before = structuredClone(s), old = calculateScores(s, players), enabled = activateAppearances(s, players, plan);
  assert.deepEqual(s, before); assert.equal(enabled.id, s.id); assert.deepEqual(enabled.masks[0], s.masks[0]); assert.deepEqual(enabled.counterBets, s.counterBets);
  assert.deepEqual(activeScores(enabled, players), old); assert.equal(enabled.masks[1].settlement?.settledAt, 0);
});
test('existing open correct tips retain their REAL show but acquire confirmed mask-relative basis when later revealed', () => {
  const s = fixture(); s.masks[0].tips.a = [tip('Richtig', 2)];
  const enabled = activateAppearances(s, players, { m: [2, 5, 6] }); enabled.activeShowId = 's5';
  const m = revealed(enabled); m.settlement = settleMask(enabled, m, players, true, 999); enabled.masks = [m];
  assert.equal(activeScores(enabled, players).scores[0].score, 20); assert.equal(m.tips.a[0].showId, 's2');
});
test('one-time reveal ledger is stable across render, reload, export/import and schedule updates', async () => {
  globalThis.indexedDB = new IDBFactory(); const enabled = activateAppearances(fixture(), players, plan), m = revealed(enabled);
  m.settlement = settleMask(enabled, m, players, true, 1000); enabled.masks = [m];
  const state = { players, seasons: [enabled] }, json = JSON.stringify(state);
  assert.ok(isValidAppState(JSON.parse(json))); await saveStateDB(state); assert.deepEqual(await loadStateDB(), state);
  const before = activeScores(enabled, players); assert.deepEqual(activeScores(updateAppearancePlan(enabled, {}), players), before);
  assert.deepEqual(activeScores(enabled, players), before); assert.equal(JSON.stringify(state), json);
  assert.throws(() => assertOpenAppearance(enabled, 'm'), /Abgerechnete/);
});
test('read-only comparison never writes or changes data: classic 14 vs S13 20 on exact same tips', () => {
  const enabled = activateAppearances(fixture(), players, plan), m = revealed(enabled), before = JSON.stringify(enabled);
  assert.equal(simulatedMask(enabled, m, players, false).scores[0].score, 14); assert.equal(simulatedMask(enabled, m, players, true).scores[0].score, 20);
  assert.equal(JSON.stringify(enabled), before);
  assert.match(explainMask(enabled, m, players, true, simulatedMask(enabled, m, players, true)).a, /Basis 20.*Slot 1.*100 %/);
});
test('unversioned and explicitly CLASSIC old saves load without rewrite; unknown tournament version rejected', async () => {
  for (const ruleset of [undefined, 'classic-v1'] as const) {
    const s = fixture(); if (ruleset) s.ruleset = ruleset; const state = { players, seasons: [s] }, writes: any[] = [];
    assert.ok(isValidAppState(state)); assert.equal((await initializeStorage({ load: async () => state, save: async value => { writes.push(value); }, storage: { getItem: () => null } as any })).state, state); assert.equal(writes.length, 0);
  }
  assert.equal(isValidAppState({ players, seasons: [{ ...fixture(), ruleset: 'tournament-v1' }] }), false);
});
test('unknown debuts, missing/mismatching histories and duplicate shows fail without reinterpretation', () => {
  const s = fixture(), before = JSON.stringify(s);
  for (const config of [{}, { m: [5, 6] }, { m: [4, 4] }, { m: [0, 4] }]) assert.throws(() => activateAppearances(s, players, config));
  s.shows.push({ id: 'duplicate', name: 'Show 4 duplicate', episodeNumber: 4 }); assert.throws(() => activateAppearances(s, players, plan), /nicht sicher/);
  s.shows.pop(); assert.equal(JSON.stringify(s), before);
  const enabled = activateAppearances(s, players, plan); assert.throws(() => appearanceNumber(enabled, enabled.masks[0], { id: 'x', name: 'Andere Show', episodeNumber: 2 }));
});
test('corrupt rules and reveal ledger fail closed', () => {
  const enabled = activateAppearances(fixture(), players, plan), m = revealed(enabled); m.settlement = settleMask(enabled, m, players, true, 1000); enabled.masks = [m];
  const valid = { players, seasons: [enabled] }; assert.ok(isValidAppState(valid));
  const bad = structuredClone(valid); bad.seasons[0].masks[0].settlement!.result.scores[0].totalScore++; assert.equal(isValidAppState(bad), false);
  const missing = structuredClone(valid); delete missing.seasons[0].masks[0].settlement; assert.equal(isValidAppState(missing), false);
  const mapBad = structuredClone(valid); mapBad.seasons[0].masks[0].settlement!.result.tipPoints['m-a-0']++; assert.equal(isValidAppState(mapBad), false);
});
test('CLASSIC baseline includes stable timestamp ties and all six base tiers', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 9].map(getPointsForShow), [20, 18, 16, 14, 12, 10, 10]);
  const s = fixture(); s.masks[0].tips.b = [tip()]; s.masks = [revealed(s)];
  assert.deepEqual(calculateScores(s, players).scores.map(s => s.score), [14, 6]);
});
