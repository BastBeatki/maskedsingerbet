import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.JARVIS_PLAYWRIGHT_PACKAGE || 'playwright');
const [input, artifacts, base, mode = 'new', expected = 'fixed'] = process.argv.slice(2);
assert.match(base, /^http:\/\/(?:127\.0\.0\.1|192\.168\.\d+\.\d+):\d+$|^https:\/\/maskedsingerbet\.vercel\.app\/?$/);
fs.mkdirSync(artifacts, { recursive: true });
const bytes = fs.readFileSync(input), originalHash = crypto.createHash('sha256').update(bytes).digest('hex');
const original = JSON.parse(bytes), rows = JSON.parse(fs.readFileSync(new URL('../data/promi-catalog-2026-09-30.json', import.meta.url))).records.filter(r => r.season === 12);
const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const maskName = s => normalize(s) === 'smile' ? 'smiley' : normalize(s);
const rawSeason = original.seasons.find(s => s.seasonName === 'Staffel 2025');
const sourceImages = new Map(rows.map(row => { const m = rawSeason.masks.find(m => maskName(m.name) === maskName(row.mask_name)); return [row.mask_name, [m.imageUrl, m.celebrityImageUrl]]; }));
const browser = await chromium.launch({ executablePath: process.env.JARVIS_BROWSER_EXECUTABLE, headless: true }), results = [];
async function state(page) { return page.evaluate(() => new Promise(resolve => { const r = indexedDB.open('MaskedSingerTipperDB', 1); r.onsuccess = () => { const db = r.result, tx = db.transaction('appStateStore', 'readonly'), q = tx.objectStore('appStateStore').get('mainState'); let value; q.onsuccess = () => value = q.result; tx.oncomplete = () => { db.close(); resolve(value); }; }; })); }
async function inspect(page, root, label, width) {
  const cards = root.locator('[data-testid="participation"]'); assert.equal(await cards.count(), 9);
  for (const row of rows) {
    const card = cards.filter({ has: page.getByRole('heading', { name: row.mask_name, exact: true }) }); assert.equal(await card.count(), 1);
    await card.scrollIntoViewIfNeeded();
    if (expected === 'missing') { assert.equal(await card.locator('img').count(), 0); continue; }
    const imgs = card.locator('img'); assert.equal(await imgs.count(), 2);
    await page.waitForFunction(el => [...el.querySelectorAll('img')].every(i => i.complete && i.naturalWidth > 0), await card.elementHandle());
    const actual = await imgs.evaluateAll(nodes => nodes.map(n => n.getAttribute('src')));
    assert.deepEqual([...actual].sort(), [...sourceImages.get(row.mask_name)].sort());
    assert.equal(await card.getByText('Bild aus deinem Spielstand · Rechte ungeklärt', { exact: true }).count(), 2);
    if (width === 1440) await card.screenshot({ path: path.join(artifacts, `${label}-${row.mask_name.replace(/[^a-z0-9]/gi, '')}.png`) });
  }
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  if (root !== page) { assert.equal(await root.evaluate(el => el.scrollWidth > el.clientWidth), false); await root.evaluate(el => el.scrollTop = 0); }
  else await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: path.join(artifacts, `${label}-${width}.png`), fullPage: true });
}
try { for (const width of expected === 'missing' ? [1440] : [390, 1440]) {
  const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1800 }, acceptDownloads: true }), page = await ctx.newPage(), errors = [], uploads = [];
  page.on('dialog', d => d.accept()); page.on('pageerror', e => errors.push(e.message)); page.setDefaultTimeout(15000);
  await ctx.route('**/*', async route => { const r = route.request(); if (r.method() !== 'GET' || ['xhr', 'fetch'].includes(r.resourceType())) { uploads.push(r.url()); await route.abort(); } else await route.continue(); });
  try {
    await page.goto(base, { waitUntil: 'networkidle' }); await page.locator('#import-file-input').setInputFiles(input);
    for (let n = 0; n < 100 && JSON.stringify(await state(page)) !== JSON.stringify(original); n++) await page.waitForTimeout(100);
    assert.equal(JSON.stringify(await state(page)), JSON.stringify(original));
    await page.getByRole('button', { name: 'Promi-Check · Katalog', exact: true }).click(); await page.getByLabel('Staffel', { exact: true }).selectOption('12');
    await inspect(page, page, 'home', width);
    // All remaining seasons keep their established costume coverage/optional fallbacks.
    for (const season of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13]) {
      await page.getByLabel('Staffel', { exact: true }).selectOption(String(season)); const card = page.locator('[data-testid="participation"]').first(); await card.scrollIntoViewIfNeeded();
      const costume = card.locator('img').first(); await costume.waitFor(); await page.waitForFunction(el => el.complete && el.naturalWidth > 0, await costume.elementHandle());
    }
    await page.getByRole('button', { name: 'Zurück zur Startseite', exact: true }).click();
    if (mode === 'new' && expected === 'fixed') {
      await page.getByRole('heading', { name: 'Staffel 2026', exact: true }).click();
      await page.getByRole('button', { name: 'Promi-Check', exact: true }).click(); let dialog = page.getByRole('dialog', { name: 'Promi-Check im Spiel', exact: true });
      await dialog.getByLabel('Staffel', { exact: true }).selectOption('12'); await inspect(page, dialog, 'global', width); await dialog.getByRole('button', { name: 'Promi-Check schließen', exact: true }).click();
      const perla = page.locator('[data-mask-id]').filter({ has: page.getByRole('heading', { name: 'Perla', exact: true }) }); await perla.getByRole('button', { name: 'BastBeat: Tipps für Perla', exact: true }).click();
      const tip = page.getByRole('dialog', { name: 'Tipps für Perla', exact: true }); await tip.getByRole('button', { name: 'Promi prüfen', exact: true }).first().click();
      dialog = page.getByRole('dialog', { name: 'Promi-Check im Spiel', exact: true }); await dialog.getByLabel('Promi oder Maske suchen', { exact: true }).fill(''); await dialog.getByRole('button', { name: 'Suchen', exact: true }).click(); await dialog.getByLabel('Staffel', { exact: true }).selectOption('12'); await inspect(page, dialog, 'tip', width); await dialog.getByRole('button', { name: 'Promi-Check schließen', exact: true }).click(); await tip.getByRole('button', { name: 'Schließen', exact: true }).click(); await page.getByRole('button', { name: '‹ Zurück zur Übersicht', exact: true }).click();
    }
    assert.equal(JSON.stringify(await state(page)), JSON.stringify(original)); await page.reload({ waitUntil: 'networkidle' }); assert.equal(JSON.stringify(await state(page)), JSON.stringify(original)); assert.deepEqual(errors, []); assert.deepEqual(uploads, []);
    results.push({ result: 'PASS', base, mode, expected, width, s12Masks: expected === 'fixed' ? 9 : 0, s12People: expected === 'fixed' ? 9 : 0, identicalSourcesAndSave: true, otherSeasons: '1-11 and13 sampled', noUploadsOrPageErrors: true }); console.log(JSON.stringify(results.at(-1)));
  } finally { await ctx.close(); }
} } finally { await browser.close(); assert.equal(crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex'), originalHash); fs.writeFileSync(path.join(artifacts, 'results.json'), JSON.stringify({ originalHash, results }, null, 2)); }
