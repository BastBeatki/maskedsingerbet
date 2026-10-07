// Explicit local file only; no private save is bundled, uploaded or served.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.JARVIS_PLAYWRIGHT_PACKAGE || 'playwright');
const [input, artifacts, base = 'http://127.0.0.1:4317'] = process.argv.slice(2);
assert.ok(input && artifacts); assert.match(base, /^http:\/\/(127\.0\.0\.1|192\.168\.\d+\.\d+):\d+$/);
const bytes = fs.readFileSync(input), hash = value => crypto.createHash('sha256').update(value).digest('hex');
const original = JSON.parse(bytes), target = original.seasons.find(s => s.seasonName === 'Staffel 2026');
assert.equal(target.appearanceRules.automatic.version, 's13-2026-v1'); assert.equal(target.masks.length, 12);
fs.mkdirSync(artifacts, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.JARVIS_BROWSER_EXECUTABLE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => { window.testWrites = 0; const originalPut = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function(...args) { window.testWrites++; return originalPut.apply(this, args); }; });
const page = await ctx.newPage(), errors = [], requests = [], results = []; page.setDefaultTimeout(15000);
page.on('dialog', d => d.accept()); page.on('pageerror', e => errors.push(e.message)); page.on('request', r => { if (r.method() !== 'GET') requests.push(r.method()); });
async function state() { return page.evaluate(() => new Promise((resolve, reject) => { const r = indexedDB.open('MaskedSingerTipperDB', 1); r.onerror = () => reject(r.error); r.onsuccess = () => { const db = r.result, tx = db.transaction('appStateStore', 'readonly'), q = tx.objectStore('appStateStore').get('mainState'); let value; q.onsuccess = () => value = q.result; tx.oncomplete = () => { db.close(); resolve(value); }; }; })); }
async function committed(predicate) { for(let i=0;i<80;i++) { const s=await state(); if(predicate(s)) return s; await page.waitForTimeout(100); } throw new Error('Not committed'); }
const group = n => page.getByRole('region', { name: `Debütshow ${n}`, exact: true });
const card = name => page.locator('[data-mask-id]').filter({ has: page.getByRole('heading', { name, exact: true }) });
const detail = name => page.locator('details').filter({ has: page.getByRole('heading', { name: `Abrechnung: ${name}`, exact: true, includeHidden: true }) });
const scores = s => s.seasons.find(x=>x.id===target.id).masks.filter(m=>m.isRevealed).reduce((totals,m) => { for(const row of m.settlement.result.scores) totals[row.name] = (totals[row.name] || 0) + row.totalScore; return totals; }, {});
try {
  await page.goto(base, { waitUntil: 'networkidle' }); await page.locator('#import-file-input').setInputFiles(input);
  await committed(s => JSON.stringify(s) === JSON.stringify(original));
  await page.getByRole('heading', { name: target.seasonName, exact: true }).click();
  assert.deepEqual(scores(await state()), { BastBeat: 41, 'Schütti': 21, Schum: 0 });
  for(let n=1;n<=4;n++) { await group(n).waitFor(); assert.equal(await group(n).getByRole('heading', { level: 3 }).count(), 4); }
  assert.equal(await page.locator('[data-mask-id]').count(), 12); assert.equal(await page.getByRole('button', { name: /^Maske anlegen:/ }).count(), 4);
  for(const name of ['Professor Dr. Dr. Schweinstein','Momo','Erdbär','MR. MIC','P.S','Yeti Cat']) await card(name).getByText('Halbfinale', {exact:true}).waitFor();
  for(const m of target.masks.filter(m=>m.isRevealed)) { await card(m.name).getByText('Enthüllt',{exact:true}).waitFor(); assert.equal(await detail(m.name).getAttribute('open'), null); }
  assert.equal(await page.getByText('Finale',{exact:true}).count(),0);
  const before = JSON.stringify(await state()), writes = await page.evaluate(()=>window.testWrites);
  await detail('Bubble').locator('summary').first().click(); await detail('Perla').locator('summary').first().click();
  assert.notEqual(await detail('Bubble').getAttribute('open'),null); assert.notEqual(await detail('Perla').getAttribute('open'),null);
  await detail('Bubble').locator('summary').first().click(); assert.equal(await detail('Bubble').getAttribute('open'),null); assert.notEqual(await detail('Perla').getAttribute('open'),null);
  const perla = target.masks.find(m => m.name === 'Perla');
  const loser = perla.settlement.result.scores.find(row => row.counterBetPoints === -2);
  const winner = perla.settlement.result.scores.find(row => row.counterBetPoints === 3);
  assert.equal(loser.correctMasks, 0);
  const betLoser = detail('Perla').locator(`[data-score-summary="${loser.playerId}"]`); await betLoser.waitFor(); assert.match(await betLoser.textContent(), /keine Tipppunkte.*2 Punkte ab/);
  assert.match(await detail('Perla').locator(`[data-score-summary="${winner.playerId}"]`).textContent(), /vollen Basiswert.*zusätzlich 3 Punkte/);
  await detail('Hippo Jones').locator('summary').first().click();
  const hippo = target.masks.find(m=>m.name==='Hippo Jones');
  for(const row of hippo.settlement.result.scores) { const summary=detail('Hippo Jones').locator(`[data-score-summary="${row.playerId}"]`); await summary.waitFor(); if(row.correctMasks) { if(hippo.settlement.explanations[row.playerId].includes('100 %')) assert.match(await summary.textContent(), /vollen Basiswert/); else assert.match(await summary.textContent(), /reduzierten Anteil/); } }
  assert.equal(JSON.stringify(await state()), before); assert.equal(await page.evaluate(()=>window.testWrites), writes);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await card('Momo').screenshot({path:path.join(artifacts,'phone-momo.png')}); await detail('Perla').screenshot({path:path.join(artifacts,'phone-explanation.png')});
  await page.setViewportSize({width:1024,height:1366}); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await group(4).screenshot({path:path.join(artifacts,'ipad-show4-placeholders.png')});
  // The four future masks use the existing explicit add action; display alone adds none.
  for(const name of ['Wild Thing','Three Sixty','Groovy','Fernando El Toro']) await page.getByRole('button',{name:`Maske anlegen: ${name}`,exact:true}).click();
  const expanded=await committed(s=>s.seasons.find(x=>x.id===target.id).masks.length===16);
  assert.deepEqual(expanded.players, original.players);
  const expandedSeason=expanded.seasons.find(x=>x.id===target.id); assert.deepEqual(expandedSeason.masks.slice(0,12),target.masks);
  assert.deepEqual(expanded.seasons.find(x=>x.id!==target.id),original.seasons.find(x=>x.id!==target.id));
  for(let n=1;n<=4;n++) assert.equal(await group(n).locator('[data-mask-id]').count(),4);
  assert.equal(new Set(await page.locator('[data-mask-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.maskId))).size,16);
  assert.deepEqual(scores(expanded), { BastBeat: 41, 'Schütti': 21, Schum: 0 });
  for(const n of [1,3,2]) { await page.getByLabel('Aktuelle Show',{exact:true}).selectOption(target.shows.find(s=>s.episodeNumber===n).id); await committed(s=>s.seasons.find(x=>x.id===target.id).activeShowId===target.shows.find(s=>s.episodeNumber===n).id); for(let g=1;g<=4;g++) assert.equal(await group(g).locator('[data-mask-id]').count(),4); await group(n).getByText('Aktiv',{exact:true}).waitFor(); }
  await group(3).screenshot({path:path.join(artifacts,'ipad-group.png')});
  const current=await state(); await page.reload({waitUntil:'networkidle'}); await page.getByRole('heading',{name:target.seasonName,exact:true}).click(); assert.deepEqual(await state(),current);
  for(const m of target.masks.filter(m=>m.isRevealed)) assert.equal(await detail(m.name).getAttribute('open'),null);
  assert.deepEqual(errors,[]); assert.deepEqual(requests,[]); assert.equal(hash(fs.readFileSync(input)),hash(bytes));
  results.push({result:'PASS',story:'real022 compatible save,41/21/0; six semifinals/six reveals/no premature final; independent closed explanations, correct plain-language summary, no writes on toggle; four stable groups with four slots, explicit missing-mask add uses existing action, no duplicates/hidden groups across active shows; mobile/iPad/reload/no upload'}); console.log(JSON.stringify(results[0]));
} catch(error) { results.push({result:'FAIL',error:String(error)}); await page.screenshot({path:path.join(artifacts,'failure.png'),fullPage:true}); throw error; }
finally { fs.writeFileSync(path.join(artifacts,'results.json'),JSON.stringify(results,null,2)); await browser.close(); }
