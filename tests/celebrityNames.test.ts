import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCelebrityName, tipMatchesCelebrity, validNameResolution } from '../celebrityNames';
import { filterCatalog, getCatalog } from '../catalog';
import { calculateClassicScores, isValidAppState } from '../utils';
import { activateAppearances, activeScores, settleMask, explainMask } from '../appearanceRules';
import type { Season, Tip } from '../types';

const makeTip = (raw: string, modern = true): Tip => ({ celebrityName: raw, createdAt: 42, showId: 's1', ...(modern ? { nameResolution: resolveCelebrityName(raw, ['Mathias Mester']) } : {}) });
for (const raw of ['BÜLENT CEYLAN', '  Bülent   Ceylan  ', 'Bulent-Ceylan.', 'Ceylan Bülent']) test(`normalization safely resolves ${raw}`, () => {
  const r = resolveCelebrityName(raw); assert.equal(r.status, 'resolved'); assert.equal(r.canonicalName, 'Bülent Ceylan');
  const tip = { ...makeTip(raw), nameResolution: r }; assert.equal(tipMatchesCelebrity(tip, 'Bülent Ceylan'), true); assert.equal(tip.celebrityName, raw); assert.ok(validNameResolution(tip));
});
test('umlaut transliterations and diacritics keep a full canonical name; duplicate casing from game context is one identity', () => {
  assert.equal(resolveCelebrityName('joerg mueller', ['Jörg Müller']).canonicalName, 'Jörg Müller');
  assert.equal(resolveCelebrityName('bulent ceylan', ['BÜLENT CEYLAN']).canonicalName, 'Bülent Ceylan');
});
test('one-edit full names, including Mathias/Matthias example and short exact first names; no partial/initial/two-edit awards', () => {
  assert.equal(resolveCelebrityName('Matthias Mester', ['Mathias Mester']).canonicalName, 'Mathias Mester');
  assert.equal(resolveCelebrityName('Max Mutke').canonicalName, 'Max Mutzke');
  assert.equal(resolveCelebrityName('Bulent Ceylan').method, 'normalized');
  for (const raw of ['Mester', 'M. Mester', 'Matxxx Mester']) assert.notEqual(resolveCelebrityName(raw, ['Mathias Mester']).status, 'resolved');
});
test('close runners-up stay ambiguous, even when one candidate is a bit nearer; exact distinct names are not merged', () => {
  const names = ['Mathias Mester', 'Matthias Mester'];
  assert.equal(resolveCelebrityName('Matias Mester', names).status, 'ambiguous');
  const resolution = resolveCelebrityName('Anna Meyer', ['Anna Meier', 'Anna Mayer']); assert.equal(resolution.status, 'ambiguous');
  assert.equal(tipMatchesCelebrity({ ...makeTip('Anna Meyer'), nameResolution: resolution }, 'Anna Meier'), false);
  assert.equal(resolveCelebrityName('Matthias Mester', names).canonicalName, 'Matthias Mester');
});
test('legacy typo stays wrong; only opt-in new tips resolve, with unchanged earliest/final/counterbet math and original text', () => {
  const players = [{ id: 'a', name: 'A', color: '#123456' }, { id: 'b', name: 'B', color: '#654321' }];
  const s: Season = { id: 's', seasonName: '13', playerIds: ['a', 'b'], shows: [{ id: 's1', name: 'Show 1', episodeNumber: 1 }], activeShowId: 's1',
    masks: [{ id: 'm', name: 'Maske', tips: { a: [makeTip('Matthias Mester', false)] }, isRevealed: true, revealedCelebrity: 'Mathias Mester', revealedInShowId: 's1' }],
    counterBets: [{ id: 'cb', maskId: 'm', bettorPlayerId: 'b', targetPlayerId: 'a', targetTipIndex: 0, showId: 's1' }] };
  assert.deepEqual(calculateClassicScores(s, players).scores.map(r => [r.playerId, r.totalScore]), [['b', 3], ['a', -2]]);
  const historical = activateAppearances(s, players, { m: [1] }); const frozen = JSON.stringify(historical);
  assert.deepEqual(activeScores(historical, players).scores.map(r => [r.playerId, r.totalScore]), [['b', 3], ['a', -2]]); assert.equal(JSON.stringify(historical), frozen);
  s.masks[0].tips.a = [makeTip('  Matthias   Mester  ')]; const result = calculateClassicScores(s, players);
  assert.deepEqual(result.scores.map(r => [r.playerId, r.totalScore]), [['a', 20], ['b', -2]]);
  assert.match(explainMask(s, s.masks[0], players, false, result).a, /100 %.*20 Tipppunkte/);
  const settled = settleMask(s, s.masks[0], players, false, 123); assert.equal(settled.result.scores[0].totalScore, 20);
  assert.equal(s.masks[0].tips.a[0].celebrityName, '  Matthias   Mester  '); assert.ok(isValidAppState({ players, seasons: [s] }));
  assert.ok(isValidAppState(JSON.parse(JSON.stringify({ players, seasons: [s] }))));
});
test('new unknown name can resolve against an authoritative later reveal; ambiguous or conflicting identities never get fuzzy credit', () => {
  const raw = makeTip('Matthias Mester'); raw.nameResolution = resolveCelebrityName(raw.celebrityName);
  assert.equal(raw.nameResolution.status, 'unknown'); assert.equal(tipMatchesCelebrity(raw, 'Mathias Mester'), true);
  const conflicting = makeTip('Stefan Mrosss'); conflicting.nameResolution = resolveCelebrityName(conflicting.celebrityName);
  assert.equal(tipMatchesCelebrity(conflicting, 'Stefan Mrosst'), false);
  assert.equal(validNameResolution({ ...raw, nameResolution: { version: 'unsupported', status: 'unknown' } }), false);
  assert.equal(validNameResolution({ ...raw, nameResolution: { version: 'catalog-names-v1', status: 'resolved', canonicalName: 'Völlig Andere', method: 'fuzzy' } }), false);
});
test('shared catalog search supports punctuation, swapped names, partials, fuzzy and mask/season AND; exact ranks before fuzzy', () => {
  const rows = getCatalog().rows;
  for (const query of ['BÜLENT   CEYLAN', 'Bulent-Ceylan.', 'Ceylan Bülent', 'Ceylan', 'Bulent Ceylann']) assert.ok(filterCatalog(rows, query).some(r => r.celebrity_name === 'Bülent Ceylan'));
  assert.equal(filterCatalog(rows, 'Max Astronaut')[0].mask_name, 'Astronaut');
  assert.ok(filterCatalog(rows, 'Staffel 13').every(r => r.season === 13));
  assert.ok(filterCatalog(rows, 'P.S')[0].mask_name.includes('P.S'));
  assert.equal(filterCatalog(rows, 'Max Mutzke')[0].celebrity_name, 'Max Mutzke');
  assert.equal(filterCatalog(rows, 'zzzz nobody unknown').length, 0);
});
