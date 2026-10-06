import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.JARVIS_PLAYWRIGHT_PACKAGE || 'playwright');
const [endpoint, artifacts, base = 'http://127.0.0.1:4317'] = process.argv.slice(2);
assert.match(endpoint ?? '', /^ws:\/\/127\.0\.0\.1:/);
assert.match(base, /^http:\/\/127\.0\.0\.1:\d+$/);
assert.ok(artifacts); fs.mkdirSync(artifacts, { recursive: true });
const browser = await chromium.connectOverCDP(endpoint);
const results = [], T = 1_000_000, min = 60_000;
const fixture = { players: [{ id: 'a', name: 'Früh', color: '#123456' }, { id: 'b', name: 'Spät', color: '#654321' }],
  seasons: [{ id: 's', seasonName: 'Turnier Browser Test', playerIds: ['a', 'b'], activeShowId: 'show',
    shows: [{ id: 'show', name: 'Show 4', episodeNumber: 4 }], counterBets: [],
    masks: [{ id: 'm', name: 'Testmaske', tips: {}, isRevealed: false }] }] };
async function state(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const r = indexedDB.open('MaskedSingerTipperDB', 1);
    r.onerror = () => reject(r.error);
    r.onsuccess = () => { const db = r.result; const tx = db.transaction('appStateStore', 'readonly');
      const read = tx.objectStore('appStateStore').get('mainState'); let value;
      read.onsuccess = () => { value = read.result; };
      tx.oncomplete = () => { db.close(); resolve(value); }; tx.onabort = () => reject(tx.error); };
  }));
}
async function committed(page, predicate) {
  for (let i = 0; i < 30; i++) { const s = await state(page); if (predicate(s)) return s; await page.waitForTimeout(100); }
  throw new Error('Expected state not committed');
}
async function importState(page, value) {
  await page.locator('#import-file-input').setInputFiles({ name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)) });
  await committed(page, s => JSON.stringify(s) === JSON.stringify(value));
}
async function game(page) { await page.getByRole('heading', { name: 'Turnier Browser Test', exact: true }).click(); }
async function home(page) { await page.getByRole('button', { name: '‹ Zurück zur Übersicht', exact: true }).click(); }
async function saveTip(page, player, name, at, final = false) {
  await page.evaluate(at => { window.testNow = at; }, at);
  await page.getByRole('button', { name: `${player}: Tipps für Testmaske`, exact: true }).click();
  const d = page.getByRole('dialog');
  await d.getByPlaceholder(/Tipp #/).fill(name);
  if (final) await d.locator('#final-tip-checkbox').check();
  await d.getByRole('button', { name: 'Tipp hinzufügen', exact: true }).click();
  await d.getByRole('button', { name: 'Schließen', exact: true }).click();
}
async function check(name, fn, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true });
  await ctx.addInitScript(() => {
    window.testNow = 1_000_000; Date.now = () => window.testNow;
    window.testWrites = 0;
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) { window.testWrites++; return original.apply(this, args); };
  });
  const page = await ctx.newPage(); page.setDefaultTimeout(10000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  try { await page.goto(`${base}/?rulesetDebug=1`, { waitUntil: 'networkidle' });
    await fn(page); assert.deepEqual(errors, []);
    results.push({ name, result: 'PASS' }); console.log('PASS ' + name);
  } catch (error) {
    results.push({ name, result: 'FAIL', error: String(error) });
    await page.screenshot({ path: path.join(artifacts, 'failure.png'), fullPage: true }); throw error;
  } finally { await ctx.close(); }
}
try {
  await check('mobile Promi fallback: verified person article, preferred local portrait, unknown identity has no link; no writes', async page => {
    await page.getByRole('button', { name: 'Promi-Check · Katalog' }).click();
    const search = page.getByLabel('Promi oder Maske suchen');
    await search.fill('Bülent Ceylan');
    const link = page.getByRole('link', { name: 'Infos & Bild ansehen ↗', exact: true });
    assert.equal(await link.getAttribute('href'), 'https://de.wikipedia.org/wiki/B%C3%BClent_Ceylan');
    assert.equal(await link.getAttribute('target'), '_blank');
    assert.equal(await link.getAttribute('rel'), 'noopener noreferrer');
    await search.fill('Isabel Edvardsson');
    assert.equal(await page.getByRole('link', { name: 'Infos & Bild ansehen ↗' }).count(), 0);
    const portrait = page.getByRole('img', { name: 'Isabel Edvardsson', exact: true });
    await portrait.scrollIntoViewIfNeeded(); await page.waitForFunction(el => el.complete && el.naturalWidth > 0, await portrait.elementHandle());
    await search.fill(''); await page.getByLabel('Staffel', { exact: true }).selectOption('13');
    assert.equal(await page.getByRole('link', { name: 'Infos & Bild ansehen ↗' }).count(), 0);
    assert.equal(await page.getByText('Noch nicht enthüllt', { exact: true }).count(), 8);
    assert.equal(await page.evaluate(() => window.testWrites), 0);
    await page.screenshot({ path: path.join(artifacts, 'mobile-promi-links.png'), fullPage: true });
  });
  let settled;
  await check('phone UI → opportunity/tips/counterbet/manual reveal → committed audit → readonly comparison/reload/export', async page => {
    await importState(page, fixture);
    await page.getByRole('button', { name: 'Einstellungen', exact: true }).click();
    await page.getByLabel('Regelwerk', { exact: true }).selectOption('tournament-v1');
    await committed(page, s => s.seasons[0].ruleset === 'tournament-v1');
    await home(page); await game(page);
    await page.getByRole('button', { name: 'Früh: Tipps für Testmaske' }).click();
    assert.equal(await page.getByRole('button', { name: 'Tipp hinzufügen', exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Schließen', exact: true }).click();
    await page.getByRole('button', { name: 'Ratechance starten', exact: true }).click();
    await saveTip(page, 'Früh', 'Richtig', T, true);
    await saveTip(page, 'Spät', 'Falsch', T + min);
    await page.getByRole('button', { name: 'Gegenwetten', exact: true }).click();
    const d = page.getByRole('dialog');
    await d.locator('select').nth(0).selectOption('a'); await d.locator('select').nth(1).selectOption('b');
    await d.getByRole('button', { name: 'Dagegen wetten', exact: true }).click();
    await d.getByRole('button', { name: 'Schließen', exact: true }).click();
    await saveTip(page, 'Spät', 'Richtig', T + 45 * min);
    await page.evaluate(at => { window.testNow = at; }, T + 120 * min);
    await page.getByRole('button', { name: 'Demaskieren', exact: true }).click();
    await page.getByLabel('Name des Promis', { exact: true }).fill('Richtig');
    await page.getByRole('button', { name: 'Identität demaskieren', exact: true }).click();
    settled = await committed(page, s => !!s.seasons[0].masks[0].scoringAudit);
    assert.deepEqual(settled.seasons[0].masks[0].scoringAudit.players.map(p => [p.playerId, p.total]), [['a', 29], ['b', 14]]);
    await page.getByText('Punkte erklären · tournament-v1', { exact: true }).click();
    assert.equal(await page.getByRole('heading', { name: 'Früh: +29 Punkte', exact: true }).count(), 1);
    assert.equal(await page.getByRole('heading', { name: 'Spät: +14 Punkte', exact: true }).count(), 1);
    assert.equal(await page.getByText('Früh: CLASSIC +28 · TOURNAMENT +29', { exact: true }).count(), 1);
    assert.equal(await page.getByText('Spät: CLASSIC +4 · TOURNAMENT +14', { exact: true }).count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(artifacts, 'phone-scoring-audit.png'), fullPage: true });
    await page.reload({ waitUntil: 'networkidle' }); await game(page);
    assert.equal(await page.evaluate(() => window.testWrites), 0);
    assert.deepEqual(await state(page), settled);
    await home(page);
    const downloaded = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export', exact: true }).click();
    const download = await downloaded; const file = path.join(artifacts, 'synthetic-roundtrip-export.json'); await download.saveAs(file);
    assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), settled);
  });
  await check('iPad reload/import audit and locked rule version', async page => {
    await importState(page, settled); await game(page);
    await page.getByText('Punkte erklären · tournament-v1', { exact: true }).click();
    assert.equal(await page.getByRole('heading', { name: 'Früh: +29 Punkte', exact: true }).count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(artifacts, 'ipad-scoring-audit.png'), fullPage: true });
    await home(page); await page.getByRole('button', { name: 'Einstellungen', exact: true }).click();
    assert.equal(await page.getByLabel('Regelwerk', { exact: true }).isDisabled(), true);
    assert.deepEqual(await state(page), settled);
  }, { width: 1024, height: 1366 });
  await check('phone long tip history scrolls; later-show final lock records actual time and cannot be undone', async page => {
    const seed = structuredClone(fixture); seed.seasons[0].ruleset = 'tournament-v1';
    await importState(page, seed); await game(page);
    await page.getByRole('button', { name: 'Ratechance starten', exact: true }).click();
    for (let i = 0; i < 4; i++) await saveTip(page, 'Früh', `Falsch${i}`, T + i * min);
    await saveTip(page, 'Früh', 'Richtig', T + 4 * min);
    await page.getByRole('button', { name: 'Neue Show starten', exact: true }).click();
    await page.evaluate(at => { window.testNow = at; }, T + 7 * 86400_000);
    await page.getByRole('button', { name: 'Ratechance starten', exact: true }).click();
    await page.getByRole('button', { name: 'Früh: Tipps für Testmaske', exact: true }).click();
    const d = page.getByRole('dialog');
    const box = await d.boundingBox(); assert.ok(box.height <= 628);
    await d.getByRole('button', { name: '(Zu Final ändern)', exact: true }).click();
    assert.equal(await d.getByRole('button', { name: '(Nicht mehr Final machen)', exact: true }).count(), 0);
    assert.equal(await d.getByRole('button', { name: 'Tipp hinzufügen', exact: true }).count(), 0);
    const s = await committed(page, s => s.seasons[0].masks[0].tips.a.at(-1).isFinal);
    const final = s.seasons[0].masks[0].tips.a.at(-1);
    assert.equal(final.createdAt, T + 4 * min);
    assert.equal(final.finalizedAt, T + 7 * 86400_000);
    assert.notEqual(final.opportunityId, final.finalOpportunityId);
    await page.screenshot({ path: path.join(artifacts, 'phone-long-history.png'), fullPage: true });
  }, { width: 390, height: 660 });
  await check('existing unversioned S12 remains unchanged and comparison marks missing timing UNKNOWN', async page => {
    const classic = structuredClone(fixture);
    classic.seasons[0].masks[0] = { ...classic.seasons[0].masks[0], isRevealed: true, revealedCelebrity: 'Richtig', revealedInShowId: 'show',
      tips: { a: [{ celebrityName: 'Richtig', createdAt: T, showId: 'show' }], b: [{ celebrityName: 'Richtig', createdAt: T + 1, showId: 'show' }] } };
    await importState(page, classic); await game(page);
    assert.equal(await page.getByText('Früh: CLASSIC +14 · TOURNAMENT UNKNOWN – Rate-/Sperrzeiten fehlen', { exact: true }).count(), 1);
    assert.deepEqual(await state(page), classic);
    await home(page); await page.getByRole('button', { name: 'Einstellungen', exact: true }).click();
    assert.equal(await page.getByLabel('Regelwerk', { exact: true }).isDisabled(), true);
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.evaluate(() => window.testWrites), 0); assert.deepEqual(await state(page), classic);
  });
  await check('unknown future rule import does not replace current save', async page => {
    await importState(page, fixture);
    const invalid = structuredClone(fixture); invalid.seasons[0].ruleset = 'tournament-v99';
    await page.locator('#import-file-input').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(invalid)) });
    await page.waitForTimeout(200); assert.deepEqual(await state(page), fixture);
  });
  await check('normal page keeps debug simulation hidden', async page => {
    await importState(page, settled); await page.goto(base, { waitUntil: 'networkidle' }); await game(page);
    assert.equal(await page.getByRole('heading', { name: 'Regelvergleich · nur Simulation', exact: true }).count(), 0);
    assert.deepEqual(await state(page), settled);
  });
  await check('explicit test-copy transition keeps CLASSIC original, freezes old points, requires observed prior chances and new tip confirmation', async page => {
    const old = structuredClone(fixture);
    old.seasons[0].masks[0].tips = { a: [{ celebrityName: 'Richtig', showId: 'show', createdAt: T, isFinal: true }] };
    old.seasons[0].masks.push({ id: 'settled', name: 'Archivmaske', isRevealed: true, revealedCelebrity: 'Archiv',
      tips: { a: [{ celebrityName: 'Archiv', showId: 'show', createdAt: T, isFinal: false }] } });
    await importState(page, old);
    await page.getByRole('button', { name: 'Einstellungen', exact: true }).click();
    await page.getByRole('button', { name: 'Turnier-Testkopie erstellen', exact: true }).click();
    const created = await committed(page, s => s.seasons.length === 2);
    assert.deepEqual(created.seasons[0], old.seasons[0]);
    assert.equal(created.seasons[1].masks[1].scoringAudit.players.find(p => p.playerId === 'a').total, 14);
    assert.equal(created.seasons[1].masks[1].scoringAudit.ruleset, 'classic-v1');
    await page.getByRole('heading', { name: 'Turnier Browser Test · Turnier-Kopie', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Ratechance starten', exact: true }).isDisabled(), true);
    await page.getByLabel('Testmaske: Vergangene Ratechancen', { exact: true }).fill('1');
    await page.getByRole('button', { name: 'Vergangene Ratechancen festlegen', exact: true }).click();
    await page.getByRole('button', { name: 'Ratechance starten', exact: true }).click();
    await page.getByText('Alte Tipps ansehen und neu bestätigen', { exact: true }).click();
    await page.getByRole('button', { name: 'Als neuen finalen Tipp bestätigen', exact: true }).click();
    const confirmed = await committed(page, s => !!s.seasons[1].masks[0].tips.a?.[0]?.isFinal);
    assert.deepEqual(confirmed.seasons[0], old.seasons[0]);
    assert.equal(confirmed.seasons[1].masks[0].tips.a[0].finalizedAt, T);
    assert.deepEqual(confirmed.seasons[1].masks[0].legacyTips, old.seasons[0].masks[0].tips);
    await page.getByRole('button', { name: 'Demaskieren', exact: true }).click();
    await page.getByLabel('Name des Promis', { exact: true }).fill('Richtig');
    await page.getByRole('button', { name: 'Identität demaskieren', exact: true }).click();
    const end = await committed(page, s => !!s.seasons[1].masks[0].scoringAudit);
    assert.equal(end.seasons[1].masks[0].scoringAudit.players.find(p => p.playerId === 'a').total, 20);
    assert.deepEqual(end.seasons[0], old.seasons[0]);
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.evaluate(() => window.testWrites), 0);
    assert.deepEqual(await state(page), end);
    await page.getByRole('heading', { name: 'Turnier Browser Test', exact: true }).click();
    assert.equal(await page.getByText('classic-v1', { exact: true }).count(), 1);
  });
} finally {
  fs.writeFileSync(path.join(artifacts, 'browser-rulesets-results.json'), JSON.stringify(results, null, 2));
  await browser.close();
}
