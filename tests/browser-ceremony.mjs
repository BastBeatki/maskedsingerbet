// Local isolated profiles and synthetic demo only. Never accepts a private export as input.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.JARVIS_PLAYWRIGHT_PACKAGE || 'playwright');
const [output, base = 'http://127.0.0.1:4324'] = process.argv.slice(2);
assert.ok(output); assert.match(base, /^http:\/\/(127\.0\.0\.1|192\.168\.\d+\.\d+):(4324|4326)$/);
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.JARVIS_BROWSER_EXECUTABLE, headless: true });
const context = await browser.newContext({ viewport: { width: 1024, height: 1366 }, acceptDownloads: true });
await context.addInitScript(() => {
  window.ceremonyWrites = 0;
  const put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (...args) { window.ceremonyWrites++; return put.apply(this, args); };
});
const page = await context.newPage(), errors = [], results = [], dialogs = [];
page.on('pageerror', e => errors.push(e.message));
page.on('dialog', d => { dialogs.push(d.message()); return d.accept(); });
const state = () => page.evaluate(() => new Promise((resolve, reject) => {
  const request = indexedDB.open('MaskedSingerTipperDB', 1);
  request.onerror = () => reject(request.error);
  request.onsuccess = () => { const db = request.result, tx = db.transaction('appStateStore', 'readonly'), q = tx.objectStore('appStateStore').get('mainState'); let value; q.onsuccess = () => value = q.result; tx.oncomplete = () => { db.close(); resolve(value); }; };
}));
const ceremony = () => page.getByRole('main', { name: 'Siegerehrung', exact: true });
async function enterGame() { await page.getByRole('heading', { name: 'FINALE – DEMO', exact: true }).click(); await page.getByRole('combobox', { name: 'Aktuelle Show' }).waitFor(); }
async function startCeremony() {
  await page.getByRole('checkbox', { name: 'Die Besetzung ist vollständig erfasst und das TV-Finale ist beendet.', exact: true }).check();
  await page.getByRole('button', { name: 'Siegerehrung starten', exact: true }).click();
  await ceremony().waitFor();
}
try {
  assert.equal((await fetch(base + '/finale-demo.html')).status, 200);
  await page.goto(base + '/finale-demo.html', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'FINALE – DEMO laden', exact: true }).click();
  await enterGame();
  assert.equal(await page.locator('[data-mask-id]').count(), 16);
  assert.equal(await page.locator('[data-season-winner]').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Siegerehrung starten', exact: true }).isDisabled(), true);
  const before = await state(); assert.equal(before.seasons[0].masks.filter(m => !m.isRevealed).length, 1);
  await page.locator('#start-ceremony').evaluate(b => b.click()); assert.equal(await ceremony().count(), 0);
  const card = page.locator('[data-mask-id="demo-mask-16"]');
  await card.getByRole('button', { name: 'Demaskieren', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Demaskiere Demo-Nova', exact: true });
  await modal.getByLabel('Name des Promis', { exact: true }).fill('Demo-Promi 16');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  await modal.locator('input[type="file"]').setInputFiles({ name: 'synthetic-pixel.png', mimeType: 'image/png', buffer: png });
  assert.equal(await ceremony().count(), 0, 'Image selection must not trigger any ceremony');
  await modal.getByRole('button', { name: 'Schließen', exact: true }).click();
  assert.deepEqual(await state(), before, 'Cancelled reveal/photo selection preserves data');
  await card.getByRole('button', { name: 'Demaskieren', exact: true }).click();
  await modal.getByLabel('Name des Promis', { exact: true }).fill('Demo-Promi 16');
  await modal.locator('input[type="file"]').setInputFiles({ name: 'synthetic-pixel.png', mimeType: 'image/png', buffer: png });
  // Wait until the existing modal's open/reset effect and image update have committed before typing.
  await modal.getByLabel('Name des Promis', { exact: true }).fill('Demo-Promi 16');
  assert.equal(await modal.getByLabel('Name des Promis', { exact: true }).inputValue(), 'Demo-Promi 16');
  await modal.getByRole('button', { name: 'Identität demaskieren', exact: true }).click();
  let completed;
  for (let i = 0; i < 80; i++) { completed = await state(); if (completed.seasons[0].masks.every(m => m.isRevealed && m.settlement)) break; await page.waitForTimeout(50); }
  assert.ok(completed.seasons[0].masks.every(m => m.isRevealed && m.settlement));
  assert.equal(await ceremony().count(), 0, 'Final reveal must not open an overlay/view');
  assert.equal(await page.locator('[data-season-winner]').count(), 0, 'Complete data alone must not reveal a winner');
  assert.equal(await page.getByRole('button', { name: 'Siegerehrung starten', exact: true }).isDisabled(), true, 'Human completeness confirmation required');
  const expected = structuredClone(completed); expected.seasons[0].masks[15] = before.seasons[0].masks[15];
  assert.deepEqual(expected, before, 'Only legitimate last synthetic reveal/ledger changes');
  await page.getByRole('checkbox', { name: 'Die Besetzung ist vollständig erfasst und das TV-Finale ist beendet.', exact: true }).check();
  const writes = await page.evaluate(() => window.ceremonyWrites);
  // Multiple clicks must never write game state or produce duplicate instances.
  await page.getByRole('button', { name: 'Siegerehrung starten', exact: true }).evaluate(b => { b.click(); b.click(); });
  await ceremony().waitFor(); assert.equal(await ceremony().count(), 1);
  await page.getByRole('button', { name: 'Animation überspringen', exact: true }).click();
  await page.getByRole('heading', { name: 'Das Finale ist entschieden.', exact: true }).waitFor();
  assert.equal(await page.locator('.ceremony-winner').textContent(), 'Schütti [Demo]');
  assert.deepEqual(await page.locator('.ceremony-score-table tbody tr td:last-child').allTextContents(), ['288', '247', '16']);
  await page.getByRole('heading', { name: 'Abrechnung nach Shows', exact: true }).waitFor();
  assert.equal(await page.getByText(/Keine historischen Live-Snapshots/).count() > 0, true);
  for (const [width, height] of [[1024, 1366], [390, 844]]) {
    await page.setViewportSize({ width, height });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(output, `ceremony-${width}.png`), fullPage: true });
    results.push({ width, noOverflow: true });
  }
  await page.getByRole('button', { name: '‹ Zurück zur Staffel', exact: true }).click();
  assert.equal(await ceremony().count(), 0); assert.deepEqual(await state(), completed);
  assert.equal(await page.locator('[data-season-winner]').count(), 1);
  assert.match(await page.locator('[data-season-winner]').innerText(), /Schütti \[Demo\][\s\S]*Staffelsieger/i);
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1366 });
    await page.locator('[data-season-winner]').scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(output, `leaderboard-${width}.png`) });
  }
  await startCeremony();
  await page.locator('.ceremony--arriving').waitFor({ state: 'detached', timeout: 4200 });
  assert.deepEqual(await state(), completed, 'Natural 2.8s intro completion never writes');
  await page.getByRole('button', { name: '‹ Zurück zur Staffel', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startCeremony();
  assert.equal(await page.getByRole('button', { name: 'Animation überspringen', exact: true }).count(), 0);
  assert.equal(await page.locator('.ceremony-hero').evaluate(e => getComputedStyle(e).animationName), 'none');
  assert.deepEqual(await state(), completed);
  assert.equal(await page.evaluate(() => window.ceremonyWrites), writes, 'Presentation/navigation/animation must cause zero writes');
  await page.reload({ waitUntil: 'networkidle' }); await enterGame();
  assert.equal(await ceremony().count(), 0, 'Reload never opens ceremony automatically');
  assert.equal(await page.locator('[data-season-winner]').count(), 0, 'Reload requires a fresh conscious ceremony start');
  assert.deepEqual(await state(), completed);
  await startCeremony(); assert.equal(await page.locator('.ceremony-winner').textContent(), 'Schütti [Demo]');
  assert.deepEqual(await state(), completed);
  // Revisit demo bootstrap on a nonempty database: it must refuse to replace the finished state.
  await page.goto(base + '/finale-demo.html');
  await page.getByRole('button', { name: 'FINALE – DEMO laden', exact: true }).click();
  await page.getByText('Ein Spielstand ist bereits vorhanden.', { exact: false }).waitFor();
  assert.deepEqual(await state(), completed);
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ passed: true, results, pageErrors: errors, noRealData: true, photoCancelSafe: true, manualOnly: true, presentationWrites: 0, totals: [288, 247, 16] }, null, 2));
  console.log('PASS: last synthetic reveal/photo/cancel; no auto ceremony; explicit confirmation/manual start; official totals288/247/16; repeated open/skip/close/reload zero writes; reduced motion; 1024/390; bootstrap refuses overwrite.');
} catch (error) {
  await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true });
  fs.writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ dialogs, errors, current: await state() }, null, 2));
  console.log('Captured dialogs:', dialogs); throw error;
} finally { await context.close(); await browser.close(); }
