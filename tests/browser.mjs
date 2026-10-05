import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

// Uses an already isolated, agent-browser-verified local browser. No production URL.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.JARVIS_PLAYWRIGHT_PACKAGE || 'playwright');
const [endpoint, backupPath, artifactPath] = process.argv.slice(2);
assert.match(endpoint ?? '', /^ws:\/\/127\.0\.0\.1:/);
assert.ok(backupPath && artifactPath, 'Usage: browser.mjs <local-cdp-url> <repaired-export> <artifact-dir>');
const url = 'http://127.0.0.1:4317';
const browser = await chromium.connectOverCDP(endpoint);
const results = [];
const fixture = {
  players: [{ id: 'p', name: 'Testspieler', color: '#123456' }],
  seasons: [{ id: 's', seasonName: 'Browser Test', playerIds: ['p'], shows: [{ id: 'show', name: 'Show 1', episodeNumber: 1 }], activeShowId: 'show', counterBets: [],
    masks: [{ id: 'mask', name: 'Testmaske', isRevealed: false, tips: { p: [{ celebrityName: 'Testname', showId: 'show', createdAt: 1000, isFinal: false }] } }] }],
};
async function writeState(page, value) {
  await page.evaluate(value => new Promise((resolve, reject) => {
    const request = indexedDB.open('MaskedSingerTipperDB', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('appStateStore');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('appStateStore', 'readwrite');
      tx.objectStore('appStateStore').put(value, 'mainState');
      tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }), value);
}
async function readState(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('MaskedSingerTipperDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('appStateStore', 'readonly');
      const read = tx.objectStore('appStateStore').get('mainState');
      read.onsuccess = () => { db.close(); resolve(read.result); }; read.onerror = () => reject(read.error);
    };
  }));
}
async function check(name, fn, init) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await fn(page);
    assert.deepEqual(errors, [], 'No uncaught application errors');
    results.push({ name, result: 'PASS' });
    console.log('PASS ' + name);
  } catch (error) {
    await page.screenshot({ path: path.join(artifactPath, 'failure.png') }).catch(() => {});
    results.push({ name, result: 'FAIL', error: String(error) });
    throw error;
  } finally { await context.close(); }
}
try {
  await check('mobile catalog, search, season filter and read-only navigation', async page => {
    await page.getByRole('button', { name: 'Promi-Check · Katalog' }).click();
    assert.equal(await page.locator('[data-testid=participation]').count(), 134);
    assert.equal(await readState(page), undefined);
    await page.getByLabel('Promi oder Maske suchen').fill('bulent');
    assert.equal(await page.locator('[data-testid=participation]').count(), 1);
    await page.getByLabel('Promi oder Maske suchen').fill('');
    await page.getByLabel('Staffel', { exact: true }).selectOption('13');
    assert.equal(await page.locator('[data-testid=participation]').count(), 12);
    assert.equal(await page.getByText('Noch nicht enthüllt', { exact: true }).count(), 8);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(artifactPath, 'mobile-season13.png') });
    await page.getByRole('button', { name: 'Zurück zur Startseite' }).click();
    assert.equal(await readState(page), undefined);
  });
  await check('failed catalog image renders fallback without an application error', async page => {
    await page.evaluate(async () => {
      const [{ CatalogImage }, ReactModule, ReactDOMModule] = await Promise.all([
        import('/components/PromiCheckView.tsx'), import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js')]);
      const root = document.createElement('div'); document.body.appendChild(root);
      const React = ReactModule.default ?? ReactModule;
      const ReactDOM = ReactDOMModule.default ?? ReactDOMModule;
      ReactDOM.createRoot(root).render(React.createElement(CatalogImage, { src: '/missing-test-image.png', label: 'Testbild' }));
    });
    await page.getByRole('img', { name: 'Testbild: kein Bild verfügbar' }).waitFor();
  });
  await check('repaired backup imports, survives reload and exports without any content loss', async page => {
    const expected = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    await page.locator('#import-file-input').setInputFiles(backupPath);
    await page.getByRole('heading', { name: 'Staffel 2026', exact: true }).waitFor();
    await page.waitForFunction(async () => {
      const request = indexedDB.open('MaskedSingerTipperDB', 1);
      return new Promise(resolve => { request.onsuccess = () => {
        const db = request.result, read = db.transaction('appStateStore', 'readonly').objectStore('appStateStore').get('mainState');
        read.onsuccess = () => { db.close(); resolve(read.result?.seasons?.length === 2); };
      }; });
    });
    assert.deepEqual(await readState(page), expected);
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Staffel 2026', exact: true }).waitFor();
    assert.deepEqual(await readState(page), expected);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const download = await downloadPromise;
    const exported = path.join(artifactPath, 'isolated-roundtrip-export.json');
    await download.saveAs(exported);
    assert.deepEqual(JSON.parse(fs.readFileSync(exported, 'utf8')), expected);
    await page.getByRole('heading', { name: 'Staffel 2026', exact: true }).click();
    await page.getByRole('heading', { name: 'Cosma', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(artifactPath, 'mobile-game.png') });
    const reportPath = path.join(artifactPath, 'REPAIR_REPORT.json');
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    report.isolatedBrowserImport = { result: 'PASS', persistedReadback: 'deep equal', reloadReadback: 'deep equal', exportedReadback: 'deep equal', exported, exportSha256: crypto.createHash('sha256').update(fs.readFileSync(exported)).digest('hex') };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  });
  await check('invalid IndexedDB state blocks editing and never overwrites stored data', async page => {
    const invalid = { sentinel: 'DO NOT OVERWRITE', seasons: 'invalid' };
    await writeState(page, invalid);
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Spielstand konnte nicht sicher geladen werden' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Erstellen', exact: true }).count(), 0);
    assert.deepEqual(await readState(page), invalid);
  });
  await check('failed database load is visible and never writes a default state', async page => {
    await page.getByRole('heading', { name: 'Spielstand konnte nicht sicher geladen werden' }).waitFor();
    assert.match(await page.getByRole('alert').innerText(), /simulated read failure/);
    assert.equal(await page.evaluate(() => window.__writeCalls), 0);
  }, () => {
    window.__writeCalls = 0;
    IDBObjectStore.prototype.put = () => { window.__writeCalls++; throw new Error('must not write'); };
    indexedDB.open = () => { throw new Error('simulated read failure'); };
  });
  await check('browser-denied localStorage access fails visibly without a default write', async page => {
    await page.getByRole('heading', { name: 'Spielstand konnte nicht sicher geladen werden' }).waitFor();
    assert.match(await page.getByRole('alert').innerText(), /simulated storage denial/);
    assert.equal(await page.evaluate(() => window.__writeCalls), 0);
    assert.equal(await readState(page), undefined);
  }, () => {
    window.__writeCalls = 0;
    IDBObjectStore.prototype.put = () => { window.__writeCalls++; throw new Error('must not write'); };
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('simulated storage denial'); } });
  });
  await check('valid existing IndexedDB state loads despite denied legacy storage access', async page => {
    await writeState(page, fixture);
    await page.context().addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('simulated storage denial'); } });
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Browser Test', exact: true }).waitFor();
    assert.deepEqual(await readState(page), fixture);
  });
  await check('failed legacy migration commit preserves its source and blocks editing', async page => {
    await page.getByRole('heading', { name: 'Spielstand konnte nicht sicher geladen werden' }).waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('maskedSingerTipperApp')), '{"players":[],"seasons":[]}');
    assert.equal(await readState(page), undefined);
  }, () => {
    localStorage.setItem('maskedSingerTipperApp', '{"players":[],"seasons":[]}');
    IDBObjectStore.prototype.put = () => { throw new DOMException('simulated quota failure', 'QuotaExceededError'); };
  });
  await check('failed autosave is visible; explicit retry saves retained state', async page => {
    await page.getByRole('button', { name: 'Erstellen', exact: true }).waitFor();
    await page.evaluate(() => {
      window.__originalPut = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = () => { throw new DOMException('simulated quota failure', 'QuotaExceededError'); };
    });
    await page.getByPlaceholder('Season Name').fill('Unsaved Test');
    await page.getByRole('button', { name: 'Erstellen', exact: true }).click();
    await page.getByRole('alert').waitFor();
    assert.match(await page.getByRole('alert').innerText(), /Nicht gespeichert/);
    assert.equal(await readState(page), undefined);
    await page.evaluate(() => { IDBObjectStore.prototype.put = window.__originalPut; });
    await page.getByRole('button', { name: 'Speicherung erneut versuchen' }).click();
    await page.getByRole('alert').waitFor({ state: 'hidden' });
    assert.equal((await readState(page)).seasons[0].seasonName, 'Unsaved Test');
  });
  await check('existing final-tip control reaches the hook and persists only its final flag', async page => {
    await writeState(page, fixture);
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Browser Test', exact: true }).click();
    await page.locator('div.cursor-pointer').filter({ has: page.locator('[title="Testname"]') }).last().click();
    await page.getByRole('button', { name: '(Zu Final ändern)', exact: true }).click();
    await page.getByText('Dein finaler Tipp ist gesperrt!', { exact: true }).waitFor();
    await page.waitForFunction(async () => {
      const request = indexedDB.open('MaskedSingerTipperDB', 1);
      return new Promise(resolve => { request.onsuccess = () => {
        const db = request.result, read = db.transaction('appStateStore', 'readonly').objectStore('appStateStore').get('mainState');
        read.onsuccess = () => { db.close(); resolve(read.result?.seasons?.[0]?.masks?.[0]?.tips?.p?.[0]?.isFinal === true); };
      }; });
    });
    const expected = structuredClone(fixture); expected.seasons[0].masks[0].tips.p[0].isFinal = true;
    assert.deepEqual(await readState(page), expected);
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Browser Test', exact: true }).waitFor();
    assert.deepEqual(await readState(page), expected);
  });
} finally {
  fs.writeFileSync(path.join(artifactPath, 'BROWSER_TEST_RESULTS.json'), JSON.stringify(results, null, 2) + '\n');
  await browser.close();
}
