import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendShow, canAddShow, isConfirmed2026Season, nextShowNumber, showLabel } from '../showFlow';
import { activeScores } from '../appearanceRules';
import { isValidAppState } from '../utils';
import { showFlowFixture } from './showFlow.fixture';

test('existing show5/6 labels derive from the exact format marker; saved IDs/names/order stay untouched', () => {
  const state = showFlowFixture(6), season = state.seasons[0], before = structuredClone(state);
  assert.equal(showLabel(season, season.shows[3]), 'Show 4');
  assert.equal(showLabel(season, season.shows[4]), 'Halbfinale (Show 5)');
  assert.equal(showLabel(season, season.shows[5]), 'Finale (Show 6)');
  assert.deepEqual(state, before);
  season.seasonName = 'Umbenannt'; assert.equal(isConfirmed2026Season(season), true);
});

test('new finale appends exactly one raw Show6, keeps history/settlements intact and rejects queued seventh creation', () => {
  const state = showFlowFixture(), season = state.seasons[0], before = structuredClone(season);
  const next = appendShow(season, 'finale-id');
  assert.equal(next.activeShowId, 'finale-id');
  assert.deepEqual(next.shows.at(-1), { id: 'finale-id', name: 'Show 6', episodeNumber: 6 });
  assert.deepEqual(next.shows.slice(0, -1), season.shows);
  assert.equal(showLabel(next, next.shows.at(-1)!), 'Finale (Show 6)');
  assert.equal(canAddShow(next), false);
  assert.throws(() => appendShow(next, 'seventh'), /letzte Show.*weitere Show/);
  assert.deepEqual(next.masks, season.masks); assert.deepEqual(next.counterBets, season.counterBets);
  assert.deepEqual(season, before);
  assert.equal(next.masks.some(mask => !mask.isRevealed), true, 'Starting Finale never closes or reveals the season');
});

test('existing historical show7 survives display and rejects only further additions for this format', () => {
  const season = showFlowFixture(7).seasons[0], before = structuredClone(season);
  assert.equal(showLabel(season, season.shows[6]), 'Show 7');
  assert.equal(canAddShow(season), false);
  assert.throws(() => appendShow(season, 'eighth'));
  assert.deepEqual(season, before);
  season.activeShowId = 's4'; assert.equal(canAddShow(season), false, 'Selecting old show does not reopen creation');
});

test('other seasons stay unlimited: name/year, classic rules and manual appearance rules alone do not impose format', () => {
  for (const mode of ['classic', 'manual', 'unmarked'] as const) {
    const season = showFlowFixture(6).seasons[0];
    if (mode === 'classic') season.ruleset = 'classic-v1';
    else if (mode === 'manual') delete season.appearanceRules!.automatic;
    else { delete season.ruleset; delete season.appearanceRules; }
    assert.equal(isConfirmed2026Season(season), false);
    season.shows[4].name = 'Eigener Titel';
    assert.equal(showLabel(season, season.shows[4]), 'Eigener Titel');
    assert.equal(appendShow(season, 'allowed-seven').shows.at(-1)!.episodeNumber, 7);
  }
});

test('show numbering uses maximum stored episode, not active selection or array order', () => {
  const season = showFlowFixture().seasons[0];
  season.shows.reverse(); season.activeShowId = 's1';
  assert.equal(nextShowNumber(season), 6);
  season.shows = []; assert.equal(nextShowNumber(season), 1);
});

test('display copies, finale start and JSON roundtrip preserve existing awarded results exactly', () => {
  const state = showFlowFixture(), season = state.seasons[0];
  const before = activeScores(season, state.players);
  assert.deepEqual(before.scores.map(row => row.totalScore), [160, 64]);
  const display = { ...season, shows: season.shows.map(show => ({ ...show, name: showLabel(season, show) })) };
  assert.deepEqual(activeScores(display, state.players), before);
  const next = { ...state, seasons: [appendShow(season, 'finale')] };
  const roundtrip = JSON.parse(JSON.stringify(next));
  assert.equal(isValidAppState(roundtrip), true);
  assert.deepEqual(activeScores(roundtrip.seasons[0], roundtrip.players), before);
  assert.deepEqual(roundtrip.seasons[0].masks, season.masks);
});
