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
const costumeNames = JSON.parse(fs.readFileSync(new URL('../data/promi-catalog-2026-09-30.json', import.meta.url))).records.filter(r => r.season === 13).map(r => r.mask_name);
const remoteHosts = /^https:\/\/(?:mim\.p7s1\.io|img\.joyn\.de|c\.nau\.ch|www\.24rhein\.de|www\.connect-living\.de)\//;
const tinyImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJ1kAAAAASUVORK5CYII=';
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
  await check('all ten season-1 remote costumes decode; blocked sender and publisher URLs fall back without writes', async page => {
    await catalog(page);
    await page.getByLabel('Staffel', { exact: true }).selectOption('1');
    assert.equal(await page.locator('[data-testid=participation]').count(), 10);
    const images = page.locator('[data-testid=participation] img');
    assert.equal(await images.count(), 10);
    for (const img of await images.all()) {
      await img.scrollIntoViewIfNeeded();
      await page.waitForFunction(el => el.complete && el.naturalWidth > 0, await img.elementHandle());
    }
    assert.equal(await page.getByText('Temporäres externes Bild · Rechte ungeklärt').count(), 10);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.getByRole('heading', { name: 'Promi-Check', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(artifacts, 'mobile-season1-costumes.png'), fullPage: true });
    await page.route(remoteHosts, route => route.abort());
    await page.reload({ waitUntil: 'networkidle' }); await catalog(page);
    await page.getByLabel('Staffel', { exact: true }).selectOption('1');
    for (const name of ['Astronaut', 'Engel', 'Kudu', 'Monster', 'Kakadu', 'Grashüpfer', 'Panther', 'Eichhörnchen', 'Schmetterling', 'Oktopus']) {
      const fallback = page.getByRole('img', { name: name + ': kein Bild verfügbar', exact: true });
      await page.getByRole('heading', { name, exact: true }).scrollIntoViewIfNeeded();
      await fallback.waitFor();
    }
    assert.equal(await state(page), undefined);
    assert.equal(await page.evaluate(() => window.catalogWrites), 0);
    await page.getByLabel('Staffel', { exact: true }).selectOption('2');
    assert.equal(await page.locator('[data-testid=participation]').count(), 10);
    await page.getByLabel('Staffel', { exact: true }).selectOption('3');
    assert.equal(await page.locator('[data-testid=participation]').count(), 11);
  });
  await check('season-2 and season-3 costumes decode; shared duo image and complete remote failure preserve read-only behavior', async page => {
    await catalog(page);
    for (const [season, rows, images] of [['2', 10, 10], ['3', 11, 11]]) {
      await page.getByLabel('Staffel', { exact: true }).selectOption(season);
      assert.equal(await page.locator('[data-testid=participation]').count(), rows);
      const assets = page.locator('[data-testid=participation] img');
      assert.equal(await assets.count(), images);
      for (const img of await assets.all()) {
        await img.scrollIntoViewIfNeeded();
        await page.waitForFunction(el => el.complete && el.naturalWidth > 0, await img.elementHandle());
      }
      assert.equal(await page.getByText('Temporäres externes Bild · Rechte ungeklärt').count(), images);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.getByRole('heading', { name: 'Promi-Check', exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(artifacts, 'mobile-season' + season + '-costumes.png'), fullPage: true });
    }
    const duo = page.getByRole('img', { name: 'Erdmännchen', exact: true });
    assert.equal(await duo.count(), 2);
    assert.equal(await duo.nth(0).getAttribute('src'), await duo.nth(1).getAttribute('src'));
    await page.route(remoteHosts, route => route.abort());
    await page.reload({ waitUntil: 'networkidle' }); await catalog(page);
    for (const [season, fallbacks] of [['2', 20], ['3', 22]]) {
      await page.getByLabel('Staffel', { exact: true }).selectOption(season);
      for (const card of await page.locator('[data-testid=participation]').all()) {
        await card.scrollIntoViewIfNeeded();
        await card.locator('img').waitFor({ state: 'detached' });
      }
      assert.equal(await page.getByRole('img', { name: /: kein Bild verfügbar$/ }).count(), fallbacks);
    }
    assert.equal(await state(page), undefined);
    assert.equal(await page.evaluate(() => window.catalogWrites), 0);
  });
  await check('all ten season-4 costumes decode on mobile and desktop; failure falls back without writes', async page => {
    await catalog(page);
    await page.getByLabel('Staffel', { exact: true }).selectOption('4');
    assert.equal(await page.locator('[data-testid=participation]').count(), 10);
    const assets = page.locator('[data-testid=participation] img');
    assert.equal(await assets.count(), 10);
    for (const img of await assets.all()) {
      await img.scrollIntoViewIfNeeded();
      await page.waitForFunction(el => el.complete && el.naturalWidth > 0, await img.elementHandle());
    }
    assert.equal(await page.getByText('Temporäres externes Bild · Rechte ungeklärt').count(), 10);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.getByRole('heading', { name: 'Promi-Check', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(artifacts, 'mobile-season4-costumes.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(artifacts, 'desktop-season4-costumes.png'), fullPage: true });
    await page.route(remoteHosts, route => route.abort());
    await page.reload({ waitUntil: 'networkidle' }); await catalog(page);
    await page.getByLabel('Staffel', { exact: true }).selectOption('4');
    for (const card of await page.locator('[data-testid=participation]').all()) {
      await card.scrollIntoViewIfNeeded();
      await card.locator('img').waitFor({ state: 'detached' });
    }
    assert.equal(await page.getByRole('img', { name: /: kein Bild verfügbar$/ }).count(), 20);
    assert.equal(await state(page), undefined);
    assert.equal(await page.evaluate(() => window.catalogWrites), 0);
  });
  await check('season-5 to season-7 costumes decode on mobile and desktop; full remote failure stays read-only', async page => {
    await catalog(page);
    for (const [season, total] of [['5', 10], ['6', 10], ['7', 9]]) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByLabel('Staffel', { exact: true }).selectOption(season);
      assert.equal(await page.locator('[data-testid=participation]').count(), total);
      const assets = page.locator('[data-testid=participation] img');
      assert.equal(await assets.count(), total);
      for (const img of await assets.all()) {
        await img.scrollIntoViewIfNeeded();
        await page.waitForFunction(el => el.complete && el.naturalWidth > 0, await img.elementHandle());
      }
      assert.equal(await page.getByText('Temporäres externes Bild · Rechte ungeklärt').count(), total);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.getByRole('heading', { name: 'Promi-Check', exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(artifacts, 'mobile-season' + season + '-costumes.png'), fullPage: true });
      await page.setViewportSize({ width: 1440, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(artifacts, 'desktop-season' + season + '-costumes.png'), fullPage: true });
    }
    assert.equal(await state(page), undefined);
    assert.equal(await page.evaluate(() => window.catalogWrites), 0);
    await page.route(remoteHosts, route => route.abort());
    await page.reload({ waitUntil: 'networkidle' }); await catalog(page);
    for (const [season, fallbacks] of [['5', 20], ['6', 20], ['7', 18]]) {
      await page.getByLabel('Staffel', { exact: true }).selectOption(season);
      for (const card of await page.locator('[data-testid=participation]').all()) {
        await card.scrollIntoViewIfNeeded();
        await card.locator('img').waitFor({ state: 'detached' });
      }
      assert.equal(await page.getByRole('img', { name: /: kein Bild verfügbar$/ }).count(), fallbacks);
    }
    assert.equal(await state(page), undefined);
    assert.equal(await page.evaluate(() => window.catalogWrites), 0);
  });
  await check('season-8 and season-9 costumes decode on mobile and desktop; remote failure preserves state and alias key', async page => {
    await catalog(page);
    for (const season of ['8', '9']) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByLabel('Staffel', { exact: true }).selectOption(season);
      assert.equal(await page.locator('[data-testid=participation]').count(), 9);
      const images = page.locator('[data-testid=participation] img');
      assert.equal(await images.count(), 9);
      for (const img of await images.all()) {
        await img.scrollIntoViewIfNeeded();
        await page.waitForFunction(el => el.complete && el.naturalWidth > 0, await img.elementHandle());
      }
      assert.equal(await page.getByText('Temporäres externes Bild · Rechte ungeklärt').count(), 9);
      if (season === '8') assert.equal(await page.getByRole('img', { name: 'Diamantula / Mystica', exact: true }).count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.getByRole('heading', { name: 'Promi-Check', exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(artifacts, 'mobile-season' + season + '-costumes.png'), fullPage: true });
      await page.setViewportSize({ width: 1440, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(artifacts, 'desktop-season' + season + '-costumes.png'), fullPage: true });
    }
    await page.route(remoteHosts, route => route.abort());
    await page.reload({ waitUntil: 'networkidle' }); await catalog(page);
    for (const season of ['8', '9']) {
      await page.getByLabel('Staffel', { exact: true }).selectOption(season);
      for (const card of await page.locator('[data-testid=participation]').all()) {
        await card.scrollIntoViewIfNeeded();
        await card.locator('img').waitFor({ state: 'detached' });
      }
      assert.equal(await page.getByRole('img', { name: /: kein Bild verfügbar$/ }).count(), 18);
    }
    assert.equal(await state(page), undefined);
    assert.equal(await page.evaluate(() => window.catalogWrites), 0);
  });
  await check('season-10 including Elgonia, shared duo and recurring costume decode; remote failure stays read-only', async page => {
    await catalog(page);
    await page.getByLabel('Staffel', { exact: true }).selectOption('10');
    assert.equal(await page.locator('[data-testid=participation]').count(), 15);
    assert.equal(await page.locator('[data-testid=participation] img').count(), 15);
    assert.equal(await page.getByRole('img', { name: 'Flip-Flop', exact: true }).count(), 2);
    assert.equal(await page.getByRole('img', { name: 'Mysterium', exact: true }).count(), 6);
    assert.equal(await page.getByRole('img', { name: 'Elgonia', exact: true }).count(), 1);
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const img of await page.locator('[data-testid=participation] img').all()) {
        await img.scrollIntoViewIfNeeded();
        await page.waitForFunction(el => el.complete && el.naturalWidth > 0, await img.elementHandle());
      }
      assert.equal(await page.getByText('Temporäres externes Bild · Rechte ungeklärt').count(), 15);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.getByRole('heading', { name: 'Promi-Check', exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(artifacts, (width === 390 ? 'mobile' : 'desktop') + '-season10-costumes.png'), fullPage: true });
    }
    await page.route(remoteHosts, route => route.abort());
    await page.reload({ waitUntil: 'networkidle' }); await catalog(page);
    await page.getByLabel('Staffel', { exact: true }).selectOption('10');
    for (const card of await page.locator('[data-testid=participation]').all()) {
      await card.scrollIntoViewIfNeeded(); await card.locator('img').waitFor({ state: 'detached' });
    }
    assert.equal(await page.getByRole('img', { name: /: kein Bild verfügbar$/ }).count(), 30);
    assert.equal(await state(page), undefined);
    assert.equal(await page.evaluate(() => window.catalogWrites), 0);
  });
  await check('season-11 ten costumes decode on mobile and desktop; complete remote failure remains read-only', async page => {
    await catalog(page);
    await page.getByLabel('Staffel', { exact: true }).selectOption('11');
    assert.equal(await page.locator('[data-testid=participation]').count(), 10);
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const images = page.locator('[data-testid=participation] img');
      assert.equal(await images.count(), 10);
      for (const img of await images.all()) {
        await img.scrollIntoViewIfNeeded();
        await page.waitForFunction(el => el.complete && el.naturalWidth > 0, await img.elementHandle());
      }
      assert.equal(await page.getByText('Temporäres externes Bild · Rechte ungeklärt').count(), 10);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.getByRole('heading', { name: 'Promi-Check', exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(artifacts, width + '-season11-costumes.png'), fullPage: true });
    }
    await page.route(remoteHosts, route => route.abort());
    await page.reload({ waitUntil: 'networkidle' }); await catalog(page);
    await page.getByLabel('Staffel', { exact: true }).selectOption('11');
    for (const row of await page.locator('[data-testid=participation]').all()) {
      await row.scrollIntoViewIfNeeded();
      await row.getByRole('img', { name: /: kein Bild verfügbar$/ }).last().waitFor();
    }
    assert.equal(await page.getByRole('img', { name: /: kein Bild verfügbar$/ }).count(), 20);
    assert.equal(await page.locator('[data-testid=participation] img').count(), 0);
    assert.equal(await state(page), undefined);
    assert.equal(await page.evaluate(() => window.catalogWrites), 0);
  });
  await check('synthetic twelve existing costumes render read-only, export and reload preserve every field', async page => {
    const costumes = structuredClone(fixture);
    costumes.seasons[0].seasonName = 'Staffel 2026';
    costumes.seasons[0].masks = costumeNames.map((name, i) => ({ id: 'costume' + i,
      name: name === 'Mr. Mic' ? 'MR. MIC' : name === 'P.S.' ? 'P.S' : name,
      imageUrl: tinyImage, isRevealed: false, tips: {} }));
    await page.locator('#import-file-input').setInputFiles({ name: 'synthetic-costumes.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(costumes)) });
    await page.getByRole('heading', { name: 'Staffel 2026', exact: true }).waitFor();
    await page.waitForFunction(() => window.catalogWrites >= 1);
    const writes = await page.evaluate(() => window.catalogWrites);
    await catalog(page);
    assert.equal(await page.locator('[data-testid=participation] img').count(), 16);
    for (const name of costumeNames) {
      const img = page.getByRole('img', { name, exact: true }); await img.scrollIntoViewIfNeeded();
      await page.waitForFunction(el => el.complete && el.naturalWidth > 0, await img.elementHandle());
    }
    assert.equal(await page.getByText('Bild aus deinem Spielstand · Rechte ungeklärt', { exact: true }).count(), 12);
    assert.equal(await page.getByText('Noch nicht enthüllt', { exact: true }).count(), 8);
    assert.equal(await page.evaluate(() => window.catalogWrites), writes);
    assert.deepEqual(await state(page), costumes);
    await page.getByRole('button', { name: 'Zurück zur Startseite' }).click();
    const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export', exact: true }).click();
    const stream = await (await pending).createReadStream(); const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString('utf8')), costumes);
    await page.reload({ waitUntil: 'networkidle' }); await catalog(page);
    assert.equal(await page.locator('[data-testid=participation] img').count(), 16);
    assert.deepEqual(await state(page), costumes);
    assert.equal(await page.evaluate(() => window.catalogWrites), 0);
  });
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
