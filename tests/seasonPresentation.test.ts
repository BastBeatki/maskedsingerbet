import { test } from 'node:test';
import assert from 'node:assert/strict';
import { debutGroups, maskStatus, simpleScoreSummary } from '../seasonPresentation';
import { S13_GROUPS, createAutomatic } from '../appearanceAuto';
import type { PlayerScore, Season } from '../types';

function fixture(): Season {
  const season: Season = { id: 's', seasonName: '2026', playerIds: [], activeShowId: 's3', counterBets: [],
    shows: [1, 2, 3, 4, 5, 6].map(n => ({ id: `s${n}`, name: `Show ${n}`, episodeNumber: n })),
    masks: S13_GROUPS.flatMap((names, g) => names.map((name, i) => ({ id: `m${g}${i}`, name, tips: {}, isRevealed: g < 3 && i < 2, ...(g < 3 && i < 2 ? { revealedInShowId: `s${g + 1}` } : {}) }))) };
  season.appearanceRules = { activatedAt: 1, appearances: {}, automatic: createAutomatic(season) }; return season;
}
test('qualifiers derive from completed debut groups even when an older active show is selected; no premature finalist badge', () => {
  const s = fixture(); s.activeShowId = 's2';
  assert.equal(s.masks.filter(m => maskStatus(s, m) === 'Halbfinale').length, 6);
  assert.equal(s.masks.filter(m => maskStatus(s, m) === 'Enthüllt').length, 6);
  assert.equal(maskStatus(s, s.masks.find(m => m.name === 'Momo')!), 'Halbfinale');
  s.activeShowId = 's4';
  for (const m of s.masks.filter(m => m.id === 'm30' || m.id === 'm31')) { m.isRevealed = true; m.revealedInShowId = 's4'; }
  assert.equal(s.masks.filter(m => maskStatus(s, m) === 'Halbfinale').length, 8);
  s.activeShowId = 's5'; assert.equal(maskStatus(s, s.masks.find(m => m.name === 'Momo')!), 'Halbfinale');
  s.activeShowId = 's6'; assert.equal(maskStatus(s, s.masks.find(m => m.name === 'Momo')!), 'Finale');
});
test('four stable debut groups, no duplicates/filtering, rename stays in group; missing display slots never change records', () => {
  const s = fixture(); const before = JSON.stringify(s);
  for (const show of s.shows) { const selected = { ...s, activeShowId: show.id }; const groups = debutGroups(selected);
    assert.deepEqual(groups.map(g => g.masks.length), [4, 4, 4, 4]);
    assert.equal(new Set(groups.flatMap(g => g.masks.map(m => m.id))).size, 16);
  }
  assert.equal(JSON.stringify(s), before);
  s.masks[0].name = 'Neuer Name'; assert.equal(debutGroups(s)[0].masks[0].id, 'm00'); assert.deepEqual(debutGroups(s)[0].missing, []);
  s.masks = s.masks.slice(0, 12); const original = JSON.stringify(s);
  assert.deepEqual(debutGroups(s)[3].missing, [...S13_GROUPS[3]]); assert.equal(JSON.stringify(s), original);
  delete s.appearanceRules; assert.equal(debutGroups(s).length, 1); assert.equal(maskStatus(s, s.masks[3]), undefined);
});
const row: PlayerScore = { playerId: 'a', name: 'A', color: '#123456', score: 20, totalScore: 20, counterBetPoints: 0, correctMasks: 1, wonCounterBets: 0 };
test('simple summaries reflect awarded pioneer/follower, final bonus, absent/wrong tips and positive/negative bet components', () => {
  assert.match(simpleScoreSummary(row, 'Auftritt 1: erster Treffer: 100 %'), /vollen Basiswert/);
  assert.match(simpleScoreSummary(row, 'späterer Treffer: 40 %'), /reduzierten Anteil/);
  assert.match(simpleScoreSummary(row, 'Final ×1,8'), /Finaltipp erhöht/);
  assert.doesNotMatch(simpleScoreSummary(row, 'Final ×1'), /Finaltipp erhöht/);
  assert.match(simpleScoreSummary({ ...row, correctMasks: 0, score: 0, counterBetPoints: -2, totalScore: -2 }, ''), /keine Tipppunkte.*2 Punkte ab/);
  assert.match(simpleScoreSummary({ ...row, counterBetPoints: 3, totalScore: 23 }, ''), /zusätzlich 3 Punkte/);
  assert.doesNotMatch(simpleScoreSummary(row, 'Legacy'), /reduzierten|vollen/);
});
