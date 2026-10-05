import type { AppState, Player } from './types';
import { isValidAppState } from './utils';

// Existing persisted contract: do not rename or bump the database schema.
export const DB_NAME = 'MaskedSingerTipperDB';
export const DB_VERSION = 1;
export const STORE_NAME = 'appStateStore';
export const STATE_KEY = 'mainState';
export const APP_STORAGE_KEY = 'maskedSingerTipperApp';
export const LEGACY_STORAGE_KEY = 'maskedSingerTipperState';
export const createDefaultState = (): AppState => ({ seasons: [], players: [] });

const getDb = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onerror = () => reject(request.error ?? new Error('IndexedDB konnte nicht geöffnet werden.'));
  request.onblocked = () => reject(new Error('Datenbank blockiert. Andere App-Tabs schließen und erneut laden.'));
  request.onsuccess = () => resolve(request.result);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
  };
});

export const loadStateDB = async (): Promise<unknown> => {
  const db = await getDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(STATE_KEY);
      let result: unknown;
      request.onsuccess = () => { result = request.result; };
      tx.oncomplete = () => resolve(result);
      tx.onabort = tx.onerror = () => reject(tx.error ?? request.error ?? new Error('Laden fehlgeschlagen.'));
    });
  } finally { db.close(); }
};

const write = async (state?: AppState): Promise<void> => {
  const db = await getDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('Speichertransaktion fehlgeschlagen.'));
      const store = tx.objectStore(STORE_NAME);
      if (state === undefined) store.clear(); else store.put(state, STATE_KEY);
    });
  } finally { db.close(); }
};

// Serialize writes, including resets; an older pending save must never win over a newer state.
let writeQueue: Promise<void> = Promise.resolve();
const enqueue = (operation: () => Promise<void>) => {
  const result = writeQueue.then(operation);
  writeQueue = result.catch(() => {});
  return result;
};
export const saveStateDB = (state: AppState) => enqueue(() => write(state));
export const clearStateDB = () => enqueue(() => write());

export function migrateLegacy(value: unknown): AppState {
  const parsed = structuredClone(value) as any;
  if (parsed && Array.isArray(parsed.seasons) && !parsed.players) {
    const players = new Map<string, Player>();
    for (const season of parsed.seasons) {
      if (!Array.isArray(season.players)) throw new Error('Ungültige Legacy-Spielerstruktur.');
      for (const player of season.players) if (!players.has(player.id)) players.set(player.id, player);
      season.playerIds = season.players.map((player: Player) => player.id);
      delete season.players;
    }
    parsed.players = Array.from(players.values());
  }
  if (!isValidAppState(parsed)) throw new Error('Gespeicherte Legacy-Daten sind ungültig; die Quelle bleibt erhalten.');
  return parsed;
}

interface StorageDependencies {
  load: () => Promise<unknown>;
  save: (state: AppState) => Promise<void>;
  storage: Pick<Storage, 'getItem' | 'removeItem'>;
}
export async function initializeStorage(overrides?: StorageDependencies): Promise<{ state: AppState; warning: string | null }> {
  // Accessing localStorage itself can throw (browser privacy/security settings).
  // Keep that access inside the async function so the hook receives a rejection.
  const load = overrides?.load ?? loadStateDB;
  const save = overrides?.save ?? saveStateDB;
  const stored = await load();
  // Only absence permits migration/defaults. Corruption or a read error must fail closed.
  if (stored !== undefined) {
    if (!isValidAppState(stored)) throw new Error('Gespeicherter Spielstand ist ungültig. Nichts wurde überschrieben.');
    return { state: stored, warning: null };
  }
  const storage = overrides?.storage ?? localStorage;
  const saved = storage.getItem(APP_STORAGE_KEY);
  if (saved === null) return { state: createDefaultState(), warning: null };
  const state = migrateLegacy(JSON.parse(saved));
  await save(state); // Resolves at transaction.oncomplete, not request.onsuccess.
  let warning: string | null = null;
  try { storage.removeItem(APP_STORAGE_KEY); }
  catch { warning = 'Spielstand gespeichert; alte Datenquelle konnte nicht entfernt werden und bleibt erhalten.'; }
  return { state, warning };
}
