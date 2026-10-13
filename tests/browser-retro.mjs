// Opt-in local test only: input path is explicit; no backup is bundled or served.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.JARVIS_PLAYWRIGHT_PACKAGE || 'playwright');
const [input, artifacts, base = 'http://127.0.0.1:4317', mode = 'automatic'] = process.argv.slice(2);
assert.ok(input && artifacts); assert.match(base, /^http:\/\/(127\.0\.0\.1|192\.168\.\d+\.\d+):\d+$/);
fs.mkdirSync(artifacts, { recursive: true });
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
const hash = value => crypto.createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(canonical(value)) ?? 'undefined').digest('hex');
const raw = fs.readFileSync(input), originalHash = hash(raw), original = JSON.parse(raw.toString('utf8'));
const target = original.seasons.find(s => s.seasonName === 'Staffel 2026'); assert.ok(target);
// Historical appearances only, from handoff020/021 and official Joyn episode metadata.
// No future semifinals/final appearances are inferred for surviving masks.
const debut = { Bubble: 1, 'Emily Wau': 1, 'Professor Dr. Dr. Schweinstein': 1, Momo: 1,
  'Erdbär': 2, 'MR. MIC': 2, 'Hippo Jones': 2, Perla: 2, Cosma: 3, 'P.S': 3, 'Yeti Cat': 3, 'Luigi Eishörnchen': 3 };
assert.equal(target.masks.length, Object.keys(debut).length);
const browser = await chromium.launch({ executablePath: process.env.JARVIS_BROWSER_EXECUTABLE, headless: true });
const results = [];
async function state(page) { return page.evaluate(() => new Promise((resolve, reject) => {
  const request = indexedDB.open('MaskedSingerTipperDB', 1); request.onerror = () => reject(request.error);
  request.onsuccess = () => { const db = request.result, tx = db.transaction('appStateStore', 'readonly'); const r = tx.objectStore('appStateStore').get('mainState'); let value;
    r.onsuccess = () => { value = r.result; }; tx.oncomplete = () => { db.close(); resolve(value); }; tx.onabort = () => reject(tx.error); };
})); }
async function committed(page, predicate) { for (let i = 0; i < 60; i++) { const s = await state(page); if (predicate(s)) return s; await page.waitForTimeout(100); } throw new Error('State not committed'); }
async function importValue(page, value) { await page.locator('#import-file-input').setInputFiles({ name: 'local-test-save.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)) }); await committed(page, s => hash(s) === hash(value)); }
const season = s => s.seasons.find(x => x.id === target.id);
function unchangedRecords(s) { const copy = structuredClone(s), current = season(copy); delete current.ruleset; delete current.appearanceRules; current.masks.forEach(m => delete m.settlement); assert.equal(hash(copy), hash(original), 'All original seasons/players/tips/bets/images/show references stay identical'); }
async function assertBoard(page, expected) {
  const board = page.getByRole('heading', { name: 'Gesamt-Leaderboard', exact: true }).locator('..');
  for (const [name, points] of Object.entries(expected)) { const card = board.locator('div.bg-background').filter({ has: page.getByText(name, { exact: true }) }); await card.getByText('Punkte', { exact: true }).locator('..').getByText(String(points), { exact: true }).waitFor(); }
}
const ctx = await browser.newContext({ viewport: { width: 1024, height: 1366 }, acceptDownloads: true });
await ctx.addInitScript(() => { window.testWrites = 0; const put = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function (...args) { window.testWrites++; return put.apply(this, args); }; });
const page = await ctx.newPage(), errors = [], dialogs = [], requests = []; page.setDefaultTimeout(15000);
page.on('pageerror', e => errors.push(e.message));
page.on('request', r => { if (r.method() !== 'GET') requests.push({ method: r.method(), url: r.url() }); });
let acceptConfirm = true;
page.on('dialog', d => { dialogs.push({ type: d.type(), message: d.message() }); return d.type() === 'confirm' && !acceptConfirm ? d.dismiss() : d.accept(); });
try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await importValue(page, original); assert.equal(hash(await state(page)), hash(original));
  await page.getByRole('heading', { name: target.seasonName, exact: true }).click(); await assertBoard(page, { BastBeat: 35, 'Schütti': 17, Schum: 0 });
  await page.getByRole('button', { name: '‹ Zurück zur Übersicht', exact: true }).click();
  await page.getByRole('heading', { name: target.seasonName, exact: true }).locator('../..').getByRole('button', { name: 'Einstellungen', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'S13-Wertung in dieser Staffel aktivieren' }).isEnabled(), false);
  if (mode === 'manual') {
  await page.getByText('Erweitert / Auftritte korrigieren', { exact: true }).click();
  await page.getByLabel('Manuelle Auftrittsfolgen verwenden').check();
  await page.getByRole('button', { name: 'Wertungsvorschau berechnen' }).click(); await page.getByRole('alert').waitFor();
  assert.equal(hash(await state(page)), hash(original));
  for (const m of target.masks) { assert.ok(debut[m.name]); await page.getByLabel(`Auftritts-Shows: ${m.name}`, { exact: true }).fill(String(debut[m.name])); }
  } else {
    assert.equal(await page.locator('details').filter({ has: page.getByText('Erweitert / Auftritte korrigieren', { exact: true }) }).getAttribute('open'), null);
    assert.equal(await page.getByLabel(/^Auftritts-Shows:/).count(), 0);
  }
  const writesBefore = await page.evaluate(() => window.testWrites);
  await page.getByRole('button', { name: 'Wertungsvorschau berechnen' }).click();
  const preview = page.getByRole('region', { name: 'Wertungsvorschau' }); await preview.waitFor();
  for (const [name, old, next, delta] of [['BastBeat', 35, 41, '+6'], ['Schütti', 17, 21, '+4'], ['Schum', 0, 0, '0']]) {
    const cells = await preview.getByRole('row').filter({ has: page.getByRole('rowheader', { name, exact: true }) }).getByRole('cell').allTextContents();
    assert.deepEqual(cells, [String(old), String(next), delta]);
  }
  assert.equal(hash(await state(page)), hash(original)); assert.equal(await page.evaluate(() => window.testWrites), writesBefore);
  if (mode === 'manual') {
  // Changing a schedule invalidates the previous preview; no stale confirmation.
  await page.getByLabel('Auftritts-Shows: Perla', { exact: true }).fill('2, 3');
  assert.equal(await page.getByRole('region', { name: 'Wertungsvorschau' }).count(), 0);
  assert.equal(await page.getByRole('button', { name: 'S13-Wertung in dieser Staffel aktivieren' }).isEnabled(), false);
  await page.getByRole('button', { name: 'Wertungsvorschau berechnen' }).click(); await page.getByRole('alert').waitFor();
  assert.equal(hash(await state(page)), hash(original));
  await page.getByLabel('Auftritts-Shows: Perla', { exact: true }).fill('2'); await page.getByRole('button', { name: 'Wertungsvorschau berechnen' }).click();
  }
  acceptConfirm = false; await page.getByRole('button', { name: 'S13-Wertung in dieser Staffel aktivieren' }).click();
  assert.equal(hash(await state(page)), hash(original)); assert.equal(await page.evaluate(() => window.testWrites), writesBefore);
  acceptConfirm = true; await page.getByRole('button', { name: 'S13-Wertung in dieser Staffel aktivieren' }).click();
  const activated = await committed(page, s => season(s)?.ruleset === 's13-appearances-v1'); unchangedRecords(activated);
  const current = season(activated); assert.equal(current.id, target.id); assert.equal(current.appearanceRules.activatedAt > 0, true);
  if (mode !== 'manual') assert.equal(current.appearanceRules.automatic.version, 's13-2026-v1');
  for (const m of current.masks) {
    assert.deepEqual(current.appearanceRules.appearances[m.id], [debut[m.name]]);
    if (m.isRevealed) { assert.equal(m.settlement.ruleset, 's13-appearances-v1'); assert.equal(m.settlement.settledAt, 0); }
    else assert.equal(m.settlement, undefined);
  }
  for (const [name, points] of [['BastBeat', 41], ['Schütti', 21], ['Schum', 0]]) {
    const player = original.players.find(p => p.name === name);
    const sum = current.masks.filter(m => m.isRevealed).reduce((n, m) => n + m.settlement.result.scores.find(r => r.playerId === player.id).totalScore, 0);
    assert.equal(sum, points);
  }
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: path.join(artifacts, 'ipad-activated.png'), fullPage: true });
  // Open schedule remains editable; only a confirmed historical show is saved.
  if (mode === 'manual') {
  await page.getByLabel('Manuelle Auftrittsfolgen verwenden').check();
  await page.getByLabel('Auftritts-Shows: Yeti Cat', { exact: true }).fill('3'); await page.getByRole('button', { name: 'Auftrittsfolge speichern' }).click();
  const afterSchedule = await committed(page, s => season(s)?.appearanceRules?.appearances[current.masks.find(m => m.name === 'Yeti Cat').id]?.[0] === 3);
  assert.equal(hash(afterSchedule), hash(activated));
  }
  await page.getByRole('button', { name: '‹ Zurück zur Übersicht', exact: true }).click();
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export', exact: true }).click();
  const downloaded = await pending, exportPath = path.join(artifacts, 'activated-test-copy.json'); await downloaded.saveAs(exportPath);
  const exported = JSON.parse(fs.readFileSync(exportPath, 'utf8')); assert.equal(hash(exported), hash(activated));
  await page.reload({ waitUntil: 'networkidle' }); assert.equal(hash(await state(page)), hash(activated)); assert.equal(await page.evaluate(() => window.testWrites), 0);
  await page.getByRole('heading', { name: target.seasonName, exact: true }).click(); await assertBoard(page, { BastBeat: 41, 'Schütti': 21, Schum: 0 });
  await page.setViewportSize({ width: 390, height: 844 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: path.join(artifacts, 'phone-leaderboard.png'), fullPage: true });
  await page.getByRole('button', { name: '‹ Zurück zur Übersicht', exact: true }).click();
  // Restore original, then import the activated export again through the real import UI.
  await importValue(page, original); await importValue(page, exported); unchangedRecords(await state(page));
  await page.reload({ waitUntil: 'networkidle' }); assert.equal(hash(await state(page)), hash(activated));
  if (mode !== 'manual') {
    // Existing 021 saves switch explicitly to automation, without changing ledgers/raw records.
    const legacy = structuredClone(exported); delete season(legacy).appearanceRules.automatic;
    await importValue(page, legacy);
    await page.getByRole('heading', { name: target.seasonName, exact: true }).locator('../..').getByRole('button', { name: 'Einstellungen', exact: true }).click();
    await page.getByRole('button', { name: 'Wertungsvorschau berechnen' }).click();
    await page.getByRole('button', { name: 'S13-Automatik einschalten', exact: true }).click();
    const upgraded = await committed(page, s => !!season(s)?.appearanceRules?.automatic);
    const comparable = structuredClone(upgraded); delete season(comparable).appearanceRules.automatic;
    assert.equal(hash(comparable), hash(legacy));
    await page.reload({ waitUntil: 'networkidle' }); assert.equal(hash(await state(page)), hash(upgraded));
  }
  assert.deepEqual(errors, []); assert.deepEqual(requests, [], 'No imported state is posted to a server');
  assert.equal(hash(fs.readFileSync(input)), originalHash);
  assert.equal(dialogs.filter(d => d.type === 'confirm').length >= 2, true);
  results.push({ result: 'PASS', mode, story: 'real repaired export: import, preview/read-only/cancel, S13 migration 41/21/0, unchanged records/S12, export/import/reload, iPad/phone; automatic mode also upgrades021 unchanged', inputSha256: originalHash, confirmedTotals: { BastBeat: 41, 'Schütti': 21, Schum: 0 }, originalUnchanged: true, noStateUpload: true });
  console.log(JSON.stringify(results[0]));
} catch (error) { results.push({ result: 'FAIL', error: String(error) }); await page.screenshot({ path: path.join(artifacts, 'failure.png'), fullPage: true }); throw error; }
finally { fs.writeFileSync(path.join(artifacts, 'results.json'), JSON.stringify(results, null, 2)); await browser.close(); }
