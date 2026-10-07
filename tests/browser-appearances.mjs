import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.JARVIS_PLAYWRIGHT_PACKAGE || 'playwright');
const [endpoint, artifacts, base = 'http://127.0.0.1:4317'] = process.argv.slice(2);
assert.match(endpoint ?? '', /^ws:\/\/127\.0\.0\.1:/); assert.match(base, /^http:\/\/127\.0\.0\.1:\d+$/);
fs.mkdirSync(artifacts, { recursive: true });
const browser = await chromium.connectOverCDP(endpoint), results = [];
const fixture = { players: [{ id: 'a', name: 'Früh', color: '#123456' }, { id: 'b', name: 'Spät', color: '#654321' }],
  seasons: [{ id: 's', seasonName: 'S13 Browsertest', playerIds: ['a', 'b'], activeShowId: 's4',
    shows: [1, 2, 3, 4, 5, 6].map(n => ({ id: `s${n}`, name: `Show ${n}`, episodeNumber: n })),
    counterBets: [{ id: 'oldbet', maskId: 'old', showId: 's3', bettorPlayerId: 'b', targetPlayerId: 'a', targetTipIndex: 0 }],
    masks: [{ id: 'm', name: 'Testmaske', tips: { a: [{ celebrityName: 'Richtig', showId: 's4', createdAt: 100, isFinal: false }] }, isRevealed: false },
      { id: 'old', name: 'Altmaske', tips: { a: [{ celebrityName: 'Alt', showId: 's1', createdAt: 10 }] }, isRevealed: true, revealedCelebrity: 'Alt', revealedInShowId: 's1' }] }] };
async function state(page) { return page.evaluate(() => new Promise((resolve, reject) => {
  const r = indexedDB.open('MaskedSingerTipperDB', 1); r.onerror = () => reject(r.error);
  r.onsuccess = () => { const db = r.result, tx = db.transaction('appStateStore', 'readonly'); const read = tx.objectStore('appStateStore').get('mainState'); let value;
    read.onsuccess = () => { value = read.result; }; tx.oncomplete = () => { db.close(); resolve(value); }; tx.onabort = () => reject(tx.error); };
})); }
async function committed(page, predicate) { for (let i = 0; i < 40; i++) { const s = await state(page); if (predicate(s)) return s; await page.waitForTimeout(100); } throw new Error('State not committed'); }
async function importState(page, value) { await page.locator('#import-file-input').setInputFiles({ name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)) }); await committed(page, s => JSON.stringify(s) === JSON.stringify(value)); }
async function game(page) { await page.getByRole('heading', { name: 'S13 Browsertest', exact: true }).click(); }
async function home(page) { await page.getByRole('button', { name: '‹ Zurück zur Übersicht', exact: true }).click(); }
async function addTip(page, name, final = false) {
  await page.getByRole('button', { name: 'Spät: Tipps für Testmaske', exact: true }).click();
  const d = page.getByRole('dialog'); await d.getByPlaceholder(/Tipp #/).fill(name);
  if (final) await d.locator('#final-tip-checkbox').check();
  await d.getByRole('button', { name: 'Tipp hinzufügen', exact: true }).click(); await d.getByRole('button', { name: 'Schließen' }).click();
}
async function check(name, fn, viewport = { width: 390, height: 844 }, debug = true) {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true });
  await ctx.addInitScript(() => { window.testWrites = 0; const original = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function (...args) { window.testWrites++; return original.apply(this, args); }; });
  const page = await ctx.newPage(), errors = []; page.setDefaultTimeout(10000); page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  try { await page.goto(base + (debug ? '/?rulesetDebug=1' : '/'), { waitUntil: 'networkidle' }); await fn(page); assert.deepEqual(errors, []); results.push({ name, result: 'PASS' }); console.log('PASS ' + name); }
  catch (error) { results.push({ name, result: 'FAIL', error: String(error) }); await page.screenshot({ path: path.join(artifacts, 'failure.png'), fullPage: true }); throw error; }
  finally { await ctx.close(); }
}
let settled;
try {
  await check('phone: explicit same-season activation preserves historical results/open tips; 3 slots/third final/counterbet/reveal/audit/comparison/export/reload', async page => {
    await importState(page, fixture); await page.getByRole('button', { name: 'Einstellungen', exact: true }).click();
    await page.getByRole('button', { name: 'S13-Wertung in dieser Staffel aktivieren' }).click();
    await page.getByRole('alert').waitFor(); assert.deepEqual(await state(page), fixture);
    await page.getByLabel('Auftritts-Shows: Testmaske', { exact: true }).fill('4, 5, 6');
    await page.getByRole('button', { name: 'S13-Wertung in dieser Staffel aktivieren' }).click();
    const enabled = await committed(page, s => s?.seasons[0].ruleset === 's13-appearances-v1');
    assert.equal(enabled.seasons.length, 1); assert.equal(enabled.seasons[0].id, 's'); assert.deepEqual(enabled.seasons[0].masks[0].tips, fixture.seasons[0].masks[0].tips);
    assert.equal(enabled.seasons[0].masks[1].settlement.result.scores.find(p => p.playerId === 'a').totalScore, 20);
    assert.equal(enabled.seasons[0].masks[1].settlement.result.scores.find(p => p.playerId === 'b').totalScore, -1);
    await home(page); await game(page);
    assert.equal(await page.getByRole('button', { name: /Ratechance/ }).count(), 0);
    await addTip(page, 'Falsch');
    await page.getByRole('button', { name: 'Gegenwetten', exact: true }).first().click();
    const d = page.getByRole('dialog'); await d.locator('select').nth(0).selectOption('a'); await d.locator('select').nth(1).selectOption('b');
    await d.getByRole('button', { name: 'Dagegen wetten', exact: true }).click(); await d.getByRole('button', { name: 'Schließen' }).click();
    await addTip(page, 'Auch falsch'); await addTip(page, 'Richtig');
    await page.getByRole('button', { name: 'Spät: Tipps für Testmaske', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Tipp hinzufügen', exact: true }).count(), 0);
    // Existing CLASSIC UI permits a third-slot final toggle, with multiplier 1.
    await page.getByRole('button', { name: '(Zu Final ändern)', exact: true }).click(); await page.getByRole('button', { name: 'Schließen' }).click();
    await page.getByRole('button', { name: 'Demaskieren', exact: true }).click(); await page.getByLabel('Name des Promis', { exact: true }).fill('Richtig'); await page.getByRole('button', { name: 'Identität demaskieren', exact: true }).click();
    settled = await committed(page, s => !!s?.seasons[0].masks[0].settlement);
    assert.equal(settled.seasons[0].masks[0].tips.b.length, 3);
    const audit = settled.seasons[0].masks[0].settlement;
    assert.deepEqual(audit.result.scores.map(p => [p.playerId, p.totalScore]), [['a', 23], ['b', 6]]);
    await page.getByRole('heading', { name: 'Abrechnung: Testmaske', exact: true }).waitFor();
    await page.getByText('Regelvergleich (nur lesen)', { exact: true }).first().click();
    assert.equal(await page.getByRole('cell', { name: '17', exact: true }).count(), 1); // CLASSIC A 14+3
    assert.equal(await page.getByRole('cell', { name: '23', exact: true }).count(), 1);
    assert.equal(await page.getByRole('cell', { name: '4', exact: true }).count(), 1); // CLASSIC B round(14*.4)-2
    const before = await state(page), writes = await page.evaluate(() => window.testWrites);
    await page.getByText('Regelvergleich (nur lesen)', { exact: true }).first().click(); assert.deepEqual(await state(page), before); assert.equal(await page.evaluate(() => window.testWrites), writes);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(artifacts, 'phone-audit.png'), fullPage: true });
    await home(page); const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export', exact: true }).click(); const download = await pending;
    const file = path.join(artifacts, 'synthetic-export.json'); await download.saveAs(file); assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), settled);
    await page.reload({ waitUntil: 'networkidle' }); await game(page); assert.equal(await page.evaluate(() => window.testWrites), 0); assert.deepEqual(await state(page), settled);
  });
  await check('iPad: settled export imports exactly; audit, protected schedule/history, readonly comparison and reload', async page => {
    await importState(page, settled); await game(page); await page.getByRole('heading', { name: 'Abrechnung: Testmaske', exact: true }).waitFor();
    await page.getByText('Regelvergleich (nur lesen)', { exact: true }).first().click(); assert.deepEqual(await state(page), settled);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); await page.screenshot({ path: path.join(artifacts, 'ipad-audit.png'), fullPage: true });
    await home(page); await page.getByRole('button', { name: 'Einstellungen', exact: true }).click(); assert.equal(await page.getByLabel('Auftritts-Shows: Testmaske', { exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Auftrittsfolge speichern' }).click();
    await committed(page, s => !!s?.seasons[0].masks[0].settlement); assert.deepEqual((await state(page)).seasons[0].masks[0].settlement, settled.seasons[0].masks[0].settlement);
  }, { width: 1024, height: 1366 });
  await check('old unversioned CLASSIC saves: normal three slots, final toggle/unmark, no automatic rules conversion', async page => {
    await importState(page, fixture); await game(page); await addTip(page, 'Falsch', true);
    await page.getByRole('button', { name: 'Spät: Tipps für Testmaske', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Tipp hinzufügen', exact: true }).count(), 0);
    await page.getByRole('button', { name: '(Nicht mehr Final machen)', exact: true }).click(); await page.getByRole('button', { name: 'Schließen' }).click();
    await addTip(page, 'Richtig'); const current = await committed(page, s => s?.seasons[0].masks[0].tips.b?.length === 2);
    assert.equal(current.seasons[0].ruleset, undefined); assert.equal(current.seasons[0].masks[1].settlement, undefined);
    assert.equal(await page.getByText('Regelvergleich (nur lesen)', { exact: true }).count(), 0);
  }, { width: 390, height: 660 }, false);
  await check('bad version/ledger import rejected without replacing current save', async page => {
    await importState(page, fixture);
    for (const bad of [{ ...fixture, seasons: [{ ...fixture.seasons[0], ruleset: 'tournament-v1' }] }, (() => { const bad = structuredClone(settled); bad.seasons[0].masks[0].settlement.result.scores[0].totalScore++; return bad; })()]) {
      await page.locator('#import-file-input').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bad)) });
      assert.deepEqual(await state(page), fixture);
    }
  });
} finally { fs.writeFileSync(path.join(artifacts, 'browser-results.json'), JSON.stringify(results, null, 2)); await browser.close(); }
