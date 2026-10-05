import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { initializeStorage, saveStateDB, loadStateDB, clearStateDB, DB_NAME, DB_VERSION, STORE_NAME, STATE_KEY, APP_STORAGE_KEY } from '../storage';

const state = { players: [{ id: 'p', name: 'Player', color: '#123456' }], seasons: [] };
function memoryStorage(value: string | null = null) {
  let current = value;
  return { getItem: () => current, removeItem: () => { current = null; }, value: () => current } as any;
}
function dependencies(stored: unknown, legacy: string | null = null) {
  const storage = memoryStorage(legacy), writes: unknown[] = [];
  return { storage, writes, load: async () => stored, save: async (value: unknown) => { writes.push(value); } };
}

test('valid IndexedDB data wins and is not rewritten at startup', async () => {
  const deps = dependencies(state, 'not JSON');
  assert.deepEqual((await initializeStorage(deps)).state, state);
  assert.equal(deps.writes.length, 0);
  assert.equal(deps.storage.value(), 'not JSON');
});
for (const invalid of [null, false, 0, {}, { players: [], seasons: [{ id: 'broken' }] }]) {
  test(`invalid persisted value ${JSON.stringify(invalid)} fails closed`, async () => {
    const deps = dependencies(invalid, JSON.stringify(state));
    await assert.rejects(initializeStorage(deps), /ungültig/);
    assert.equal(deps.writes.length, 0);
    assert.notEqual(deps.storage.value(), null);
  });
}
test('failed read neither falls back nor writes defaults', async () => {
  const deps = dependencies(undefined, JSON.stringify(state));
  deps.load = async () => { throw new Error('read failed'); };
  await assert.rejects(initializeStorage(deps), /read failed/);
  assert.equal(deps.writes.length, 0);
  assert.notEqual(deps.storage.value(), null);
});
test('denied localStorage access is an async failure, not an uncaught effect exception', async () => {
  globalThis.indexedDB = new IDBFactory();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('storage access denied'); } });
  const pending = initializeStorage();
  await assert.rejects(pending, /storage access denied/);
  delete (globalThis as any).localStorage;
});
test('valid IndexedDB data remains usable when the legacy storage API is denied', async () => {
  globalThis.indexedDB = new IDBFactory();
  await saveStateDB(state);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('storage access denied'); } });
  assert.deepEqual((await initializeStorage()).state, state);
  delete (globalThis as any).localStorage;
});
test('empty new store initializes without an automatic write', async () => {
  const deps = dependencies(undefined);
  assert.deepEqual((await initializeStorage(deps)).state, { players: [], seasons: [] });
  assert.equal(deps.writes.length, 0);
});
test('malformed legacy JSON remains intact', async () => {
  const deps = dependencies(undefined, '{broken');
  await assert.rejects(initializeStorage(deps));
  assert.equal(deps.storage.value(), '{broken');
  assert.equal(deps.writes.length, 0);
});
test('failed migration commit keeps the original legacy source', async () => {
  const deps = dependencies(undefined, JSON.stringify(state));
  deps.save = async () => { throw new Error('quota'); };
  await assert.rejects(initializeStorage(deps), /quota/);
  assert.equal(deps.storage.value(), JSON.stringify(state));
});
test('legacy source is removed only after actual IndexedDB commit and readback', async () => {
  globalThis.indexedDB = new IDBFactory();
  const storage = memoryStorage(JSON.stringify(state));
  let checkedCommitted = false;
  const result = await initializeStorage({ load: loadStateDB, storage, save: async value => {
    assert.notEqual(storage.value(), null);
    await saveStateDB(value);
    assert.deepEqual(await loadStateDB(), state);
    checkedCommitted = true;
    assert.notEqual(storage.value(), null);
  } });
  assert.equal(checkedCommitted, true);
  assert.equal(storage.value(), null);
  assert.deepEqual(result.state, state);
});
test('old embedded players migrate without mutating the source object', async () => {
  const old = { seasons: [{ id: 's', seasonName: 'Old', players: state.players, masks: [], shows: [], activeShowId: null, counterBets: [] }] };
  const deps = dependencies(undefined, JSON.stringify(old));
  const result = await initializeStorage(deps);
  assert.deepEqual(result.state.players, state.players);
  assert.deepEqual(result.state.seasons[0].playerIds, ['p']);
  assert.equal('players' in result.state.seasons[0], false);
  assert.equal('players' in old.seasons[0], true);
});
test('cleanup failure is visible and does not discard the committed state', async () => {
  const deps = dependencies(undefined, JSON.stringify(state));
  deps.storage.removeItem = () => { throw new Error('denied'); };
  const result = await initializeStorage(deps);
  assert.deepEqual(result.state, state);
  assert.match(result.warning!, /bleibt erhalten/);
});
test('queued writes keep newest state and reset waits for older saves', async () => {
  globalThis.indexedDB = new IDBFactory();
  await Promise.all([saveStateDB(state), saveStateDB({ ...state, players: [] })]);
  assert.deepEqual(await loadStateDB(), { players: [], seasons: [] });
  await Promise.all([saveStateDB(state), clearStateDB()]);
  assert.equal(await loadStateDB(), undefined);
  // Schema contract is unchanged.
  assert.deepEqual([DB_NAME, DB_VERSION, STORE_NAME, STATE_KEY, APP_STORAGE_KEY],
    ['MaskedSingerTipperDB', 1, 'appStateStore', 'mainState', 'maskedSingerTipperApp']);
});
test('a failed write does not poison subsequent queued saves', async () => {
  globalThis.indexedDB = new IDBFactory();
  await assert.rejects(saveStateDB({ ...state, bad: () => {} } as any));
  await saveStateDB(state);
  assert.deepEqual(await loadStateDB(), state);
});
