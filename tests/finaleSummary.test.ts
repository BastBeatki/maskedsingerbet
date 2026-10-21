import { test } from 'node:test';
import assert from 'node:assert/strict';
import { finaleReadiness, finaleSummary, rankedFinalScores, showAllocations, verifiedFinalRevision } from '../finaleSummary';
import { isValidAppState } from '../utils';
import { ceremonyFixture } from './ceremony.fixture';

test('synthetic demo is valid, has exactly one open mask and cannot celebrate merely because Show6 is active', () => {
  const state = ceremonyFixture(); assert.equal(isValidAppState(state), true);
  assert.equal(state.seasons[0].masks.filter(m => !m.isRevealed).length, 1);
  const result = finaleSummary(state.seasons[0], state.players);
  assert.equal(result.readiness.ready, false); assert.deepEqual(result.rankings, []);
  assert.match(result.readiness.reasons.join(' '), /1 Maske/);
});
test('complete recorded roster and valid ledgers admit final view without changing state or official points', () => {
  const state = ceremonyFixture(true), before = JSON.stringify(state);
  assert.equal(isValidAppState(state), true);
  const result = finaleSummary(state.seasons[0], state.players);
  assert.equal(result.readiness.ready, true); assert.equal(result.readiness.finalMaskIds.length, 4);
  assert.deepEqual(result.rankings.map(p => [p.playerId, p.totalScore, p.rank]), [['demo-b', 288, 1], ['demo-a', 247, 2], ['demo-c', 16, 3]]);
  assert.equal(JSON.stringify(state), before);
});
test('damaged, incomplete, unmarked, duplicated and non-final records fail closed', () => {
  for (const mutate of [
    (s: ReturnType<typeof ceremonyFixture>) => { s.seasons[0].masks.pop(); },
    s => { delete s.seasons[0].masks[0].settlement; },
    s => { s.seasons[0].masks[0].settlement!.actualCelebrity = 'wrong'; },
    s => { s.seasons[0].masks[0].settlement!.result.scores[0].totalScore++; },
    s => { s.seasons[0].shows.pop(); },
    s => { s.seasons[0].masks.forEach(m => { if (m.revealedInShowId === 'demo-show-6') m.revealedInShowId = 'demo-show-5'; }); },
    s => { s.seasons[0].playerIds.push('missing'); },
    s => { s.seasons[0].masks[0].id = s.seasons[0].masks[1].id; },
    s => { delete s.seasons[0].appearanceRules!.automatic; }
  ] as ((s: ReturnType<typeof ceremonyFixture>) => void)[]) {
    const state = ceremonyFixture(true); mutate(state);
    assert.equal(finaleReadiness(state.seasons[0], state.players).ready, false);
  }
});
test('ties share the official rank and all top players; no invented tiebreak', () => {
  const state = ceremonyFixture(true, true); assert.equal(isValidAppState(state), true);
  assert.equal(finaleReadiness(state.seasons[0], state.players).ready, true);
  assert.deepEqual(rankedFinalScores(state.seasons[0], state.players).map(p => [p.totalScore, p.rank]), [[0, 1], [0, 1], [0, 1]]);
});

test('UI acknowledgement is bound to the exact verified season, participants and settlement revision', () => {
  const state = ceremonyFixture(true), season = state.seasons[0];
  const revision = verifiedFinalRevision(season, state.players);
  assert.ok(revision);
  assert.equal(verifiedFinalRevision(structuredClone(season), structuredClone(state.players)), revision);
  season.seasonName += ' corrected';
  assert.notEqual(verifiedFinalRevision(season, state.players), revision);
  season.masks[0].isRevealed = false;
  assert.equal(verifiedFinalRevision(season, state.players), null);
  const damaged = ceremonyFixture(true);
  Reflect.deleteProperty(damaged.seasons[0].appearanceRules!.automatic!, 'debuts');
  assert.equal(verifiedFinalRevision(damaged.seasons[0], damaged.players), null);
});
test('chart allocates frozen results to reveal shows, never tips backwards to when they were submitted', () => {
  const state = ceremonyFixture(true), season = state.seasons[0], before = JSON.stringify(state);
  const rows = showAllocations(season)!;
  assert.deepEqual(rows.map(r => r.cumulative['demo-a']), [40, 37, 109, 106, 250, 247]);
  assert.deepEqual(rows.map(r => r.cumulative['demo-b']), [6, 78, 75, 147, 144, 288]);
  assert.deepEqual(rows.map(r => r.cumulative['demo-c']), [8, 8, 16, 16, 16, 16]);
  // All show5-winning tips were placed before show5: their points are still awarded only in show5.
  assert.equal(rows[4].delta['demo-a'], 144);
  assert.equal(JSON.stringify(state), before);
  delete season.masks[0].revealedInShowId; assert.equal(showAllocations(season), null);
});
test('unknown historical times never become made-up snapshot times; missing tip comparisons are excluded', () => {
  const state = ceremonyFixture(true), season = state.seasons[0];
  season.masks.forEach(m => { m.settlement!.settledAt = 0; });
  const result = finaleSummary(season, state.players);
  assert.equal(result.readiness.ready, true); assert.equal(result.allocation!.length, 6);
  assert.deepEqual(result.exclusive, [{ mask: 'Demo-Kupfer', playerId: 'demo-b' }]);
});
