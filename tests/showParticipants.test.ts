import { test } from 'node:test';
import assert from 'node:assert/strict';
import { showParticipants } from '../showParticipants';
import { activeScores } from '../appearanceRules';
import { isValidAppState } from '../utils';
import { participantsFixture, revealParticipant } from './participants.fixture';

test('before start, future plans and even early tips do not invent semifinal/final participants', () => {
  const state = participantsFixture(4), s = state.seasons[0];
  assert.ok(isValidAppState(state));
  s.shows.push({ id:'s6', name:'Future show', episodeNumber:6 });
  s.masks[2].tips.a.push({ celebrityName:'Early prediction', showId:'s6', createdAt:9876 });
  s.appearanceRules!.automatic!.overrides.m02 = [1,5,6];
  assert.deepEqual(showParticipants(s).map(v => [v.state,v.masks.length]), [['pending',0],['pending',0]]);
});

test('16 canonical masks, 8 semifinal views, then 5 final views after THREE real stored eliminations', () => {
  const state = participantsFixture(), s = state.seasons[0];
  assert.ok(isValidAppState(state));
  assert.deepEqual(showParticipants(s).map(v => [v.state,v.masks.length]), [['known',8],['pending',0]]);
  const final = participantsFixture(6); assert.ok(isValidAppState(final));
  const views = showParticipants(final.seasons[0]);
  assert.deepEqual(views.map(v=>v.masks.length), [8,5]);
  for(const v of views) for(const m of v.masks) assert.equal(m, final.seasons[0].masks.find(x=>x.id===m.id));
  assert.equal(final.seasons[0].masks.length,16);
});

test('final reveal/photo preserves historical participation, one ledger and exact reload/export state', () => {
  const state = participantsFixture(6), s = state.seasons[0];
  const beforeIds = s.masks.map(m=>m.id), tips = JSON.stringify(s.masks.map(m=>m.tips));
  revealParticipant(state,'m03',6,'data:image/png;base64,c3ludGhldGlj');
  const expected = JSON.stringify(state), points = activeScores(s,state.players);
  for(let i=0;i<3;i++) {
    const views = showParticipants(s);
    assert.deepEqual(views.map(v=>v.masks.length),[8,5]);
    for(const v of views) assert.equal(v.masks.find(m=>m.id==='m03'),s.masks.find(m=>m.id==='m03'));
  }
  const reloaded = JSON.parse(expected);
  assert.ok(isValidAppState(reloaded));
  assert.deepEqual(showParticipants(reloaded.seasons[0]),showParticipants(s));
  assert.deepEqual(activeScores(s,state.players),points);
  assert.equal(s.masks.filter(m=>m.id==='m03' && m.settlement).length,1);
  assert.deepEqual(s.masks.map(m=>m.id),beforeIds); assert.equal(JSON.stringify(s.masks.map(m=>m.tips)),tips);
  assert.equal(JSON.stringify(state),expected);
});

test('explicit skipped-appearance override wins over survivor assumptions, no fixed finalist count', () => {
  const s = participantsFixture(6).seasons[0];
  s.appearanceRules!.automatic!.overrides.m03 = [1,6];
  s.appearanceRules!.automatic!.overrides.m13 = [2,5];
  const views = showParticipants(s);
  assert.equal(views[0].masks.length,7); assert.equal(views[1].masks.length,4);
  assert.ok(!views[0].masks.some(m=>m.id==='m03')); assert.ok(views[1].masks.some(m=>m.id==='m03'));
  assert.ok(!views[1].masks.some(m=>m.id==='m13'));
});

test('frozen history wins over later open-mask override and remains after all reveals', () => {
  const state=participantsFixture(6), s=state.seasons[0];
  s.appearanceRules!.automatic!.overrides.m02=[1,6];
  for(const m of s.masks.filter(m=>!m.isRevealed)) revealParticipant(state,m.id,6);
  assert.deepEqual(showParticipants(s).map(v=>v.masks.length),[8,5]);
  assert.ok(showParticipants(s)[0].masks.some(m=>m.id==='m02'));
  assert.ok(!showParticipants(s)[1].masks.some(m=>m.id==='m02'));
});

test('unknown histories, malformed schedules, duplicate IDs and format warnings fail closed', () => {
  for(const change of [
    s=>{ delete s.appearanceRules.appearances.m00; },
    s=>{ s.appearanceRules.appearances.m00=[1,6]; },
    s=>{ s.appearanceRules.automatic.overrides.m03=[1,5,5]; },
    s=>{ s.masks.push(s.masks[0]); },
    s=>{ s.shows.push({...s.shows[0],id:'duplicate'}); },
    s=>{ delete s.masks[0].revealedInShowId; },
    s=>{ s.appearanceRules.automatic.debuts.m03=undefined; },
  ] as Array<(s:any)=>void>) {
    const s=participantsFixture(6).seasons[0]; change(s);
    assert.deepEqual(showParticipants(s).map(v=>[v.state,v.masks.length]),[['unknown',0],['unknown',0]]);
  }
});

test('legacy/other formats receive no new generic semifinal/final rule', () => {
  const s=participantsFixture().seasons[0]; s.ruleset='classic-v1'; assert.deepEqual(showParticipants(s),[]);
  s.ruleset='s13-appearances-v1'; delete s.appearanceRules!.automatic; assert.deepEqual(showParticipants(s),[]);
});

test('selecting an older show never erases revealed final participation; no invented start history', () => {
  const state=participantsFixture(6),s=state.seasons[0];
  s.activeShowId='s4';
  assert.equal(showParticipants(s)[1].state,'pending');
  revealParticipant(state,'m03',6);
  assert.deepEqual(showParticipants(s).map(v=>v.masks.length),[8,5]);
});
