import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Explicit local CDP only. All contexts are fresh; fixtures are synthetic, never user backups.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.JARVIS_PLAYWRIGHT_PACKAGE || 'playwright');
const [endpoint, artifacts, baseUrl = 'http://127.0.0.1:4317'] = process.argv.slice(2);
assert.match(endpoint ?? '', /^ws:\/\/127\.0\.0\.1:/);
assert.match(baseUrl, /^http:\/\/127\.0\.0\.1:\d+$/);
assert.ok(artifacts);
fs.mkdirSync(artifacts, { recursive: true });
const browser = await chromium.connectOverCDP(endpoint);
const results = [];
const fixture = {
  players: [{ id: 'p', name: 'Testspieler', color: '#123456' }],
  seasons: [{ id: 's', seasonName: 'Bildtest', playerIds: ['p'],
    shows: [{ id: 'show', name: 'Show 1', episodeNumber: 1 }], activeShowId: 'show', counterBets: [],
    masks: [{ id: 'mask', name: 'Testmaske', isRevealed: false,
      tips: { p: [{ celebrityName: 'Testname', showId: 'show', createdAt: 1000, isFinal: false }] } }] }],
};
async function state(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('MaskedSingerTipperDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const read = db.transaction('appStateStore', 'readonly').objectStore('appStateStore').get('mainState');
      read.onsuccess = () => { db.close(); resolve(read.result); }; read.onerror = () => reject(read.error);
    };
  }));
}
async function catalog(page) {
  await page.getByRole('button', { name: 'Promi-Check · Katalog' }).click();
  await page.getByLabel('Staffel', { exact: true }).selectOption('13');
  assert.equal(await page.locator('[data-testid=participation]').count(), 12);
}
async function check(name, fn, options = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ...options });
  await context.addInitScript(() => {
    window.catalogWrites = 0;
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) { window.catalogWrites++; return original.apply(this, args); };
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await fn(page);
    assert.deepEqual(errors, [], 'No uncaught app errors');
    results.push({ name, result: 'PASS' }); console.log('PASS ' + name);
  } catch (error) {
    results.push({ name, result: 'FAIL', error: String(error) });
    await page.screenshot({ path: path.join(artifacts, 'failure.png') }); throw error;
  } finally { await context.close(); }
}
try {
  await check('mobile: four real images and credits, eight unknowns, search, no game-state writes', async page => {
    await catalog(page);
    assert.equal(await page.getByText('Noch nicht enthüllt', { exact: true }).count(), 8);
    const images = page.locator('[data-testid=participation] img');
    assert.equal(await images.count(), 4);
    for (const img of await images.all()) {
      await img.scrollIntoViewIfNeeded();
      await page.waitForFunction(el => el.complete && el.naturalWidth > 0, await img.elementHandle());
    }
    assert.equal(await page.getByRole('link', { name: 'Quelle', exact: true }).count(), 4);
    assert.equal(await state(page), undefined);
    assert.equal(await page.evaluate(() => window.catalogWrites), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.getByRole('heading', { name: 'Promi-Check', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(artifacts, 'mobile-season13.png'), fullPage: true });
    await page.getByLabel('Promi oder Maske suchen').fill('zucker');
    assert.equal(await page.locator('[data-testid=participation]').count(), 1);
    await page.getByLabel('Promi oder Maske suchen').fill('');
    await page.getByLabel('Staffel', { exact: true }).selectOption('all');
    await page.getByLabel('Promi oder Maske suchen').fill('bulent');
    assert.equal(await page.locator('[data-testid=participation]').count(), 1);
    await page.getByRole('button', { name: 'Zurück zur Startseite' }).click();
    assert.equal(await state(page), undefined);
    assert.equal(await page.evaluate(() => window.catalogWrites), 0);
  });
  await check('broken local image falls back and reload recovers after network repair', async page => {
    await page.route('**/catalog-images/isabel-edvardsson.webp', route => route.abort());
    await catalog(page);
    await page.getByRole('img', { name: 'Isabel Edvardsson: kein Bild verfügbar', exact: true }).waitFor();
    assert.equal(await page.locator('[data-testid=participation]').count(), 12);
    await page.unroute('**/catalog-images/isabel-edvardsson.webp');
    await page.reload({ waitUntil: 'networkidle' }); await catalog(page);
    const image = page.getByRole('img', { name: 'Isabel Edvardsson', exact: true });
    await image.scrollIntoViewIfNeeded();
    await page.waitForFunction(el => el.complete && el.naturalWidth > 0, await image.elementHandle());
    assert.equal(await state(page), undefined);
  });
  await check('synthetic import, catalog, Home/Game/Settings, export and final-tip persistence', async page => {
    await page.locator('#import-file-input').setInputFiles({ name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
    await page.getByRole('heading', { name: 'Bildtest', exact: true }).waitFor();
    await page.waitForFunction(() => window.catalogWrites >= 1);
    assert.deepEqual(await state(page), fixture);
    const writes = await page.evaluate(() => window.catalogWrites);
    await catalog(page); await page.getByRole('button', { name: 'Zurück zur Startseite' }).click();
    assert.deepEqual(await state(page), fixture);
    assert.equal(await page.evaluate(() => window.catalogWrites), writes);
    await page.getByTitle('Einstellungen', { exact: true }).click();
    await page.getByRole('heading', { name: 'Einstellungen: Bildtest', exact: true }).waitFor();
    await page.getByRole('button', { name: '‹ Zurück zur Übersicht', exact: true }).click();
    await page.getByRole('button', { name: 'Stammdaten', exact: true }).click();
    await page.getByRole('heading', { name: 'Stammdaten-Verwaltung', exact: true }).waitFor();
    await page.getByRole('button', { name: '‹ Zurück zur Übersicht', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const stream = await (await pending).createReadStream(); const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString('utf8')), fixture);
    await page.getByRole('heading', { name: 'Bildtest', exact: true }).click();
    await page.getByRole('heading', { name: 'Testmaske', exact: true }).waitFor();
    await page.locator('div.cursor-pointer').filter({ has: page.locator('[title="Testname"]') }).last().click();
    await page.getByRole('button', { name: '(Zu Final ändern)', exact: true }).click();
    await page.getByText('Dein finaler Tipp ist gesperrt!', { exact: true }).waitFor();
    await page.waitForFunction(previous => window.catalogWrites > previous, writes);
    const expected = structuredClone(fixture); expected.seasons[0].masks[0].tips.p[0].isFinal = true;
    assert.deepEqual(await state(page), expected);
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Bildtest', exact: true }).waitFor();
    assert.deepEqual(await state(page), expected);
  });
  await check('invalid imported data leaves existing stored state intact', async page => {
    await page.locator('#import-file-input').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"players":[],"seasons":[{"id":"broken"}]}') });
    assert.equal(await state(page), undefined);
    assert.equal(await page.evaluate(() => window.catalogWrites), 0);
    await page.getByRole('button', { name: 'Promi-Check · Katalog' }).click();
    assert.equal(await page.locator('[data-testid=participation]').count(), 134);
  });
  await check('desktop catalog renders images with no overflow or error overlay', async page => {
    await catalog(page);
    await page.screenshot({ path: path.join(artifacts, 'desktop-season13.png'), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await page.locator('vite-error-overlay').count(), 0);
  }, { viewport: { width: 1440, height: 1000 } });
} finally {
  fs.writeFileSync(path.join(artifacts, 'BROWSER_IMAGE_RESULTS.json'), JSON.stringify(results, null, 2) + '\n');
  await browser.close();
}
