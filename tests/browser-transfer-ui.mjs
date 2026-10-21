// Uses a fresh, non-persistent browser context and synthetic data only.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.JARVIS_PLAYWRIGHT_PACKAGE || 'playwright');
const [base = 'http://127.0.0.1:4318', output = 'artifacts/import-export-ui-20261021'] = process.argv.slice(2);
assert.match(base, /^http:\/\/(127\.0\.0\.1|192\.168\.\d+\.\d+):\d+$/);
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.JARVIS_BROWSER_EXECUTABLE, headless: true });
const context = await browser.newContext({ acceptDownloads: true });
await context.addInitScript(() => {
  window.transferTestWrites = 0;
  const put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (...args) { window.transferTestWrites++; return put.apply(this, args); };
});
const page = await context.newPage();
const errors = [], results = [], dialogs = [];
page.on('pageerror', e => errors.push(e.message));
page.on('dialog', async d => { dialogs.push(d.message()); await d.accept(); });
const state = () => page.evaluate(() => new Promise((resolve, reject) => {
  const r = indexedDB.open('MaskedSingerTipperDB', 1);
  r.onerror = () => reject(r.error);
  r.onsuccess = () => {
    const db = r.result, tx = db.transaction('appStateStore', 'readonly');
    const q = tx.objectStore('appStateStore').get('mainState');
    let value; q.onsuccess = () => { value = q.result; };
    tx.oncomplete = () => { db.close(); resolve(value ?? null); };
    tx.onerror = () => reject(tx.error);
  };
}));
async function downloadState() {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export – Spieledaten sichern', exact: true }).click()
  ]);
  assert.match(download.suggestedFilename(), /^masked-singer-tipper_ALL-DATA_\d{4}-\d{2}-\d{2}\.json$/);
  return JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
}
try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Verwaltung & Daten', exact: true }).waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('.home-management__art')].every(i => i.complete && i.naturalWidth > 0));
  assert.equal(await state(), null, 'Opening Home must not persist a default game');
  for (const [width, height] of [[1440, 1000], [1024, 1366], [768, 1024], [390, 844], [320, 740]]) {
    await page.setViewportSize({ width, height });
    const layout = await page.evaluate(() => {
      const a = document.querySelector('.home-management__transfer--import').getBoundingClientRect();
      const b = document.querySelector('.home-management__transfer--export').getBoundingClientRect();
      return { a: { x: a.x, y: a.y, w: a.width, h: a.height }, b: { x: b.x, y: b.y, w: b.width, h: b.height }, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.equal(layout.overflow, false, `${width}: document overflow`);
    assert.ok(Math.abs(layout.a.w - layout.b.w) < 1 && Math.abs(layout.a.h - layout.b.h) < 1, 'Equal tiles');
    if (width >= 480) assert.ok(layout.a.x < layout.b.x && Math.abs(layout.a.y - layout.b.y) < 1, 'Import left, export right');
    else assert.ok(layout.a.y < layout.b.y, 'Import before export');
    assert.equal(await page.locator('.home-management__title').allTextContents().then(t => t.join(',')), 'IMPORT,EXPORT');
    await page.screenshot({ path: path.join(output, `home-${width}.png`), fullPage: true });
    results.push({ viewport: width, layout });
  }
  // Keyboard activates the actual native file input; cancelling does not write data.
  await page.locator('#import-file-input').focus();
  assert.equal(await page.locator('#import-file-input').evaluate(e => e === document.activeElement), true);
  assert.equal(await page.locator('.home-management__transfer--import').evaluate(e => getComputedStyle(e).outlineStyle), 'solid');
  const [keyboardChooser] = await Promise.all([page.waitForEvent('filechooser'), page.keyboard.press('Enter')]);
  assert.equal(keyboardChooser.isMultiple(), false);
  assert.deepEqual(await downloadState(), { seasons: [], players: [] });
  assert.equal(await page.evaluate(() => window.transferTestWrites), 0, 'Export and chooser must not write');
  const fixture = {
    players: [{ id: 'synthetic-player', name: 'UI Test', color: '#00ccaa' }],
    seasons: [{ id: 'synthetic-season', seasonName: 'Synthetischer UI-Test', playerIds: ['synthetic-player'], masks: [], shows: [], counterBets: [], activeShowId: null }]
  };
  // Exercise the visible Import tile rather than bypassing its label association.
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('.home-management__transfer--import').click()]);
  await chooser.setFiles({ name: 'synthetic-transfer.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  await page.waitForFunction(() => document.body.textContent.includes('Synthetischer UI-Test'));
  for (let i = 0; i < 40 && JSON.stringify(await state()) !== JSON.stringify(fixture); i++) await page.waitForTimeout(50);
  assert.deepEqual(await state(), fixture, 'Native chooser imports and commits the exact fixture');
  assert.deepEqual(await downloadState(), fixture, 'Export keeps all JSON fields and values');
  await page.reload({ waitUntil: 'networkidle' });
  assert.deepEqual(await state(), fixture, 'Reload keeps the fixture');
  const writes = await page.evaluate(() => window.transferTestWrites);
  await downloadState();
  assert.equal(await page.evaluate(() => window.transferTestWrites), writes, 'Export is read only');
  // Bad JSON and structurally invalid JSON must preserve the committed fixture.
  for (const value of ['{broken', '{"unexpected":true}']) {
    await page.locator('#import-file-input').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(value) });
    await page.waitForTimeout(150);
    assert.deepEqual(await state(), fixture);
    assert.equal(await page.locator('#import-file-input').inputValue(), '', 'Chooser resets after reading');
  }
  // Verify navigation in the harmonized block still reaches each original view.
  for (const label of ['Promi-Check · Katalog', 'Stammdaten', 'Spielregeln']) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.locator('.home-management').waitFor({ state: 'detached' });
    await page.screenshot({ path: path.join(output, `navigation-${label.startsWith('Promi') ? 'catalog' : label}.png`), fullPage: true });
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.home-management').waitFor();
    assert.deepEqual(await state(), fixture);
  }
  // A missing decoration must leave real text, labels and actions intact.
  await page.route('**/ui/*-mask.webp', route => route.abort());
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.getByText('Spieledaten einlesen', { exact: true }).isVisible(), true);
  assert.equal(await page.getByText('Spieledaten sichern', { exact: true }).isVisible(), true);
  assert.deepEqual(await downloadState(), fixture);
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, 'browser-results.json'), JSON.stringify({ passed: true, results, dialogs, pageErrors: errors, syntheticOnly: true }, null, 2));
  console.log('PASS: 5 responsive widths, keyboard/native chooser, exact import/export/reload, invalid-file preservation, navigation, missing-art fallback; no page errors.');
} finally { await context.close(); await browser.close(); }
