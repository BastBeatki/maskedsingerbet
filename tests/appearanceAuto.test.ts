import { test } from 'node:test';
import assert from 'node:assert/strict';
import { S13_GROUPS, appearanceEpisodes, assertAutomaticReady, automaticWarnings, createAutomatic } from '../appearanceAuto';
import { activeScores, appearanceNumber, automaticPlan, configureAppearanceMode, previewAppearanceMode, settleMask } from '../appearanceRules';
import { isValidAppState } from '../utils';
import { Season } from '../types';
const players = [{ id: 'a', name: 'A', color: '#123456' }];
function fixture(): Season {
  return { id: 's', seasonName: '2026', playerIds: ['a'], activeShowId: 's4', counterBets: [],
    shows: [1, 2, 3, 4, 5, 6].map(n => ({ id: `s${n}`, name: `Show ${n}`, episodeNumber: n })),
    masks: S13_GROUPS.flatMap((group, g) => group.map((name, i) => ({ id: `m${g}${i}`, name, tips: {},
      isRevealed: g < 3 && i < 2, ...(g < 3 && i < 2 ? { revealedCelebrity: 'X', revealedInShowId: `s${g + 1}` } : {}) }))) };
}
function activate(s: Season) { const auto = createAutomatic(s); return configureAppearanceMode(s, players, automaticPlan(s, auto), auto); }
function reveal(s: Season, id: string): Season {
  const mask = { ...s.masks.find(m => m.id === id)!, isRevealed: true, revealedCelebrity: 'X', revealedInShowId: s.activeShowId! };
  const eps = appearanceEpisodes(s, mask)!;
  return { ...s, masks: s.masks.map(m => m.id === id ? { ...mask, settlement: settleMask(s, mask, players, true, 123) } : m),
    appearanceRules: { ...s.appearanceRules!, appearances: { ...s.appearanceRules!.appearances, [id]: eps } } };
}
test('four Show4 debuts; two reveal; eight survivors enter Show5; arbitrary reveals yield remaining Show6 participants', () => {
  let s = activate(fixture());
  assert.deepEqual(automaticWarnings(s), []);
  for (const m of s.masks.filter(m => m.id.startsWith('m3'))) assert.equal(appearanceNumber(s, m, s.shows[3]), 1);
  s = reveal(reveal(s, 'm30'), 'm31');
  s = { ...s, activeShowId: 's5' }; assertAutomaticReady(s);
  assert.equal(s.masks.filter(m => !m.isRevealed).length, 8);
  for (const m of s.masks.filter(m => !m.isRevealed)) assert.equal(appearanceNumber(s, m, s.shows[4]), 2);
  // Three reveals, not a preconfigured finalist count.
  for (const id of ['m02', 'm12', 'm22']) s = reveal(s, id);
  const historical = structuredClone(s.masks.filter(m => m.isRevealed));
  s = { ...s, activeShowId: 's6' };
  assert.equal(s.masks.filter(m => !m.isRevealed).length, 5);
  for (const m of s.masks.filter(m => !m.isRevealed)) assert.equal(appearanceNumber(s, m, s.shows[5]), 3);
  assert.deepEqual(s.masks.filter(m => m.isRevealed), historical);
  assert.deepEqual(appearanceEpisodes(s, s.masks.find(m => m.id === 'm02')!), [1, 5]);
  assert.ok(isValidAppState({ players, seasons: [s] }));
  assert.ok(isValidAppState(JSON.parse(JSON.stringify({ players, seasons: [s] }))));
});
test('pre-debut basis20 preserves real show/timestamp and early hit through final; repeated same-show tips do not add appearances', () => {
  const raw = fixture(); raw.masks.find(m => m.id === 'm32')!.tips = { a: [{ celebrityName: 'X', showId: 's1', createdAt: 42 }, { celebrityName: 'X', showId: 's4', createdAt: 43 }] };
  const before = JSON.stringify(raw); let s = activate(raw);
  assert.equal(JSON.stringify(raw), before);
  assert.equal(appearanceNumber(s, s.masks.find(m => m.id === 'm32')!, s.shows[0]), 1);
  s = reveal(reveal(s, 'm30'), 'm31'); s.activeShowId = 's6'; s = reveal(s, 'm32');
  assert.equal(activeScores(s, players).scores[0].totalScore, 20);
  assert.deepEqual(appearanceEpisodes(s, s.masks.find(m => m.id === 'm32')!), [4, 5, 6]);
});
test('detected format deviations block awards until explicitly confirmed; skipped-show override changes final basis to18', () => {
  let s = activate(fixture()); s.activeShowId = 's5';
  assert.match(automaticWarnings(s).join(' '), /Show 4/); assert.throws(() => assertAutomaticReady(s), /Format prüfen/);
  const auto = { ...s.appearanceRules!.automatic!, deviationConfirmed: true, overrides: { m32: [4, 6] } };
  s = configureAppearanceMode(s, players, automaticPlan(s, auto), auto);
  assertAutomaticReady(s); assert.throws(() => appearanceNumber(s, s.masks.find(m => m.id === 'm32')!, s.shows[4]));
  s.activeShowId = 's6'; assert.equal(appearanceNumber(s, s.masks.find(m => m.id === 'm32')!, s.shows[5]), 2);
  s.masks.find(m => m.id === 'm32')!.tips = { a: [{ celebrityName: 'X', showId: 's6', createdAt: 42 }] };
  s = reveal(s, 'm32'); assert.equal(activeScores(s, players).scores[0].totalScore, 18);
});
test('legacy021 migration preserves ledgers; no automatic namematching in CLASSIC; immutable ID mapping survives rename', () => {
  const raw = fixture(); assert.equal(raw.appearanceRules, undefined);
  let s = activate(raw); const auto = s.appearanceRules!.automatic!;
  delete s.appearanceRules!.automatic; const ledgers = JSON.stringify(s.masks);
  const p = previewAppearanceMode(s, players, automaticPlan(s, auto), auto);
  assert.deepEqual(p.old, p.next); s = configureAppearanceMode(s, players, automaticPlan(s, auto), auto);
  assert.equal(JSON.stringify(s.masks), ledgers);
  const m = s.masks.find(m => m.id === 'm32')!; m.name = 'Mein Spitzname'; assert.equal(appearanceNumber(s, m, s.shows[3]), 1);
  assert.ok(isValidAppState({ players, seasons: [s] }));
  const malformed = structuredClone(s); (malformed.appearanceRules!.automatic as any).version = 'unknown';
  assert.equal(isValidAppState({ players, seasons: [malformed] }), false);
});
test('foreign/missing debut or wrong historical reveal cannot quietly receive automatic awards', () => {
  const s = fixture(); s.masks[0].revealedInShowId = 's2';
  assert.throws(() => activate(s), /Enthüllungs-Show/);
  s.masks[0].name = 'Unbekannt'; assert.throws(() => createAutomatic(s), /unklar/);
});
