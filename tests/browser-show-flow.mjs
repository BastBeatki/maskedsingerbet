// Isolated browser/profile, explicit synthetic fixture only; never use a real user export.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.JARVIS_PLAYWRIGHT_PACKAGE || 'playwright');
const [input, output, base = 'http://127.0.0.1:4320'] = process.argv.slice(2);
assert.ok(input && output); assert.match(base, /^http:\/\/(127\.0\.0\.1|192\.168\.\d+\.\d+):\d+$/);
const fixture = JSON.parse(fs.readFileSync(input, 'utf8'));
assert.equal(fixture.seasons[0].id, 'synthetic-2026');
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.JARVIS_BROWSER_EXECUTABLE, headless: true });
const context = await browser.newContext({ acceptDownloads: true });
await context.addInitScript(() => {
  window.testWrites = 0;
  const put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (...args) { window.testWrites++; return put.apply(this, args); };
});
const page = await context.newPage(), errors = [], dialogs = [], results = [];
let acceptStart = false;
page.on('pageerror', e => errors.push(e.message));
page.on('dialog', async d => {
  dialogs.push({ type: d.type(), message: d.message(), accepted: d.type() !== 'confirm' || acceptStart });
  if (d.type() === 'confirm' && !acceptStart) await d.dismiss(); else await d.accept();
});
const state = () => page.evaluate(() => new Promise((resolve, reject) => {
  const request = indexedDB.open('MaskedSingerTipperDB', 1);
  request.onerror = () => reject(request.error);
  request.onsuccess = () => {
    const db = request.result, tx = db.transaction('appStateStore', 'readonly'), q = tx.objectStore('appStateStore').get('mainState');
    let value; q.onsuccess = () => value = q.result;
    tx.oncomplete = () => { db.close(); resolve(value); };
  };
}));
async function committed(expected) {
  for (let i = 0; i < 80; i++) {
    const current = await state(); if (expected(current)) return current;
    await page.waitForTimeout(50);
  }
  throw new Error('Synthetic state not committed');
}
async function importFixture(value) {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('#import-file-input').setInputFiles({ name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)) });
  await committed(s => JSON.stringify(s) === JSON.stringify(value));
}
async function exportFixture() {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export – Spieledaten sichern', exact: true }).click()]);
  return JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
}
const select = () => page.getByRole('combobox', { name: 'Aktuelle Show', exact: true });
async function enterGame() { await page.getByRole('heading', { name: fixture.seasons[0].seasonName, exact: true }).click(); await select().waitFor(); }
try {
  await page.setViewportSize({ width: 1024, height: 1366 });
  await importFixture(fixture); await enterGame();
  assert.equal(await select().locator('option:checked').textContent(), 'Halbfinale (Show 5)');
  assert.equal(await page.getByRole('button', { name: 'Finale starten', exact: true }).isEnabled(), true);
  const before = await state(), writes = await page.evaluate(() => window.testWrites);
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1366 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(output, `semifinal-${width}.png`), fullPage: true });
  }
  // Tip history gets derived titles too; its display never rewrites raw show names.
  await page.getByRole('button', { name: 'Test A: Tipps für Momo', exact: true }).click();
  await page.getByRole('dialog', { name: 'Tipps für Momo', exact: true }).getByText('Getippt in: Halbfinale (Show 5)', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  assert.deepEqual(await state(), before);
  assert.equal(await page.evaluate(() => window.testWrites), writes);
  await page.getByRole('button', { name: 'Finale starten', exact: true }).click();
  assert.match(dialogs.at(-1).message, /^Finale \(Show 6\) starten\?/);
  assert.deepEqual(await state(), before, 'Cancel does not start a show');
  acceptStart = true;
  // Two native click events in the same turn exercise the functional creation guard.
  await page.getByRole('button', { name: 'Finale starten', exact: true }).evaluate(button => { button.click(); button.click(); });
  const after = await committed(s => s?.seasons[0]?.shows.length === 6);
  assert.deepEqual(after.seasons[0].shows.slice(0, 5), before.seasons[0].shows);
  assert.deepEqual(after.seasons[0].masks, before.seasons[0].masks);
  assert.deepEqual(after.seasons[0].counterBets, before.seasons[0].counterBets);
  assert.deepEqual(after.players, before.players);
  assert.equal(after.seasons[0].shows[5].name, 'Show 6');
  assert.equal(await select().locator('option:checked').textContent(), 'Finale (Show 6)');
  assert.equal(await page.getByRole('button', { name: 'Keine weitere Show', exact: true }).isDisabled(), true);
  const finalWrites = await page.evaluate(() => window.testWrites);
  await select().selectOption('s4');
  assert.equal(await page.getByRole('button', { name: 'Keine weitere Show', exact: true }).isDisabled(), true);
  await select().selectOption(after.seasons[0].activeShowId);
  await committed(s => s.seasons[0].activeShowId === after.seasons[0].activeShowId);
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1366 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(output, `finale-${width}.png`), fullPage: true });
    results.push({ width, finale: true, showCount: (await state()).seasons[0].shows.length });
  }
  await page.getByRole('button', { name: '‹ Zurück zur Übersicht', exact: true }).click();
  const exported = await exportFixture();
  assert.deepEqual(exported, await state());
  await page.reload({ waitUntil: 'networkidle' }); await enterGame();
  assert.equal(await select().locator('option:checked').textContent(), 'Finale (Show 6)');
  assert.deepEqual((await state()).seasons[0].masks, fixture.seasons[0].masks);
  await page.getByRole('button', { name: '‹ Zurück zur Übersicht', exact: true }).click();
  // The season-specific settings list also uses derived labels.
  const card = page.locator('div.group').filter({ has: page.getByRole('heading', { name: fixture.seasons[0].seasonName, exact: true }) });
  await card.hover(); await card.locator('button').first().click();
  await page.getByText('Manage Shows', { exact: true }).waitFor();
  await page.getByText('Halbfinale (Show 5)', { exact: true }).waitFor();
  await page.getByText('Finale (Show 6)', { exact: true }).waitFor();
  // No effect on a generic other season, even when its name contains 2026.
  const other = structuredClone(fixture); delete other.seasons[0].ruleset; delete other.seasons[0].appearanceRules;
  other.seasons[0].masks = []; other.seasons[0].shows.push({ id: 's6', name: 'Mein eigener Schluss', episodeNumber: 6 }); other.seasons[0].activeShowId = 's6';
  await importFixture(other); await enterGame();
  assert.equal(await select().locator('option:checked').textContent(), 'Mein eigener Schluss');
  await page.getByRole('button', { name: 'Neue Show starten', exact: true }).click();
  const seventh = await committed(s => s.seasons[0].shows.length === 7);
  assert.equal(seventh.seasons[0].shows[6].episodeNumber, 7);
  // Put the synthetic semifinal fixture back for screenshots of earlier rounds.
  const prior = structuredClone(fixture); prior.seasons[0].shows = prior.seasons[0].shows.slice(0, 4); prior.seasons[0].activeShowId = 's4';
  prior.seasons[0].masks = []; prior.seasons[0].appearanceRules.automatic.debuts = {}; prior.seasons[0].appearanceRules.automatic.deviationConfirmed = true;
  await importFixture(prior); await enterGame();
  await page.getByRole('button', { name: 'Halbfinale starten', exact: true }).click();
  assert.match(dialogs.at(-1).message, /^Halbfinale \(Show 5\) starten\?/);
  await committed(s => s.seasons[0].shows.length === 5);
  assert.equal(await select().locator('option:checked').textContent(), 'Halbfinale (Show 5)');
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ passed: true, results, dialogs, pageErrors: errors, originalSyntheticState: fixture.seasons[0].id, noRealUserData: true, exportRoundtrip: true, finalWrites }, null, 2));
  console.log('PASS: semifinal/finale labels+history/settings, start/cancel/double-click, no show7, other season allows show7, unchanged masks/settlements, export/reload, 1024/390 layouts.');
} finally { await context.close(); await browser.close(); }
