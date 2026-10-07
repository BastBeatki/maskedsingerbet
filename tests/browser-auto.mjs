import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.JARVIS_PLAYWRIGHT_PACKAGE || 'playwright');
const [artifacts, base = 'http://127.0.0.1:4317'] = process.argv.slice(2);
assert.match(base, /^http:\/\/(127\.0\.0\.1|192\.168\.\d+\.\d+):\d+$/);
fs.mkdirSync(artifacts, { recursive: true });
const groups = [['Bubble','Emily Wau','Professor Dr. Dr. Schweinstein','Momo'],['Erdbär','MR. MIC','Hippo Jones','Perla'],['Cosma','P.S','Yeti Cat','Luigi Eishörnchen'],['Wild Thing','Three Sixty','Groovy','Fernando El Toro']];
const raw = { players: [{ id: 'a', name: 'A', color: '#123456' }], seasons: [{ id: 's', seasonName: 'Auto2026', playerIds: ['a'], activeShowId: 's4', counterBets: [],
  shows: [1,2,3,4,5,6].map(n => ({id: `s${n}`, name: `Show ${n}`, episodeNumber: n})),
  masks: groups.flatMap((group,g) => group.map((name,i) => ({id:`m${g}${i}`, name, tips:{}, isRevealed:g<3&&i<2, ...(g<3&&i<2?{revealedCelebrity:'X',revealedInShowId:`s${g+1}`}:{})}))) }] };
const browser = await chromium.launch({ executablePath: process.env.JARVIS_BROWSER_EXECUTABLE, headless: true });
const ctx = await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true}); const page = await ctx.newPage(), errors=[], results=[];
page.setDefaultTimeout(15000); page.on('dialog',d=>d.accept()); page.on('pageerror',e=>errors.push(e.message));
async function state() {return page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('MaskedSingerTipperDB',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('appStateStore','readonly'),q=tx.objectStore('appStateStore').get('mainState');let s;q.onsuccess=()=>s=q.result;tx.oncomplete=()=>{db.close();resolve(s)};};}));}
async function committed(predicate){for(let i=0;i<80;i++){const s=await state();if(predicate(s))return s;await page.waitForTimeout(100);}throw new Error('Not committed');}
async function home(){await page.getByRole('button',{name:'‹ Zurück zur Übersicht',exact:true}).click();}
async function game(){await page.getByRole('heading',{name:'Auto2026',exact:true}).click();}
async function load(value){await page.locator('#import-file-input').setInputFiles({name:'synthetic-auto.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});await committed(s=>JSON.stringify(s)===JSON.stringify(value));}
async function show(n){await page.getByLabel('Aktuelle Show',{exact:true}).selectOption(`s${n}`);await committed(s=>s.seasons[0].activeShowId===`s${n}`);}
async function tip(mask, name){await page.getByRole('button',{name:`A: Tipps für ${mask.name}`,exact:true}).click();const d=page.getByRole('dialog');await d.getByPlaceholder(/Tipp #/).fill(name);await d.getByRole('button',{name:'Tipp hinzufügen',exact:true}).click();await d.getByRole('button',{name:'Schließen',exact:true}).click();await committed(s=>s.seasons[0].masks.find(m=>m.id===mask.id).tips.a?.at(-1)?.celebrityName===name);}
async function reveal(mask, expected){const card=page.getByRole('heading',{name:mask.name,exact:true}).locator('../../..');await card.getByRole('button',{name:'Demaskieren',exact:true}).click();await page.getByLabel('Name des Promis',{exact:true}).fill('X');await page.getByRole('button',{name:'Identität demaskieren',exact:true}).click();const s=await committed(s=>!!s.seasons[0].masks.find(m=>m.id===mask.id).settlement);assert.equal(s.seasons[0].masks.find(m=>m.id===mask.id).settlement.result.scores[0].totalScore,expected);return s;}
try{
 await page.goto(base,{waitUntil:'networkidle'});await load(raw);await page.getByRole('button',{name:'Einstellungen',exact:true}).click();
 assert.equal(await page.getByLabel(/^Auftritts-Shows:/).count(),0);
 await page.getByRole('button',{name:'Wertungsvorschau berechnen'}).click();await page.getByRole('region',{name:'Wertungsvorschau'}).waitFor();assert.deepEqual(await state(),raw);
 await page.getByRole('button',{name:'S13-Wertung in dieser Staffel aktivieren'}).click();await committed(s=>!!s.seasons[0].appearanceRules?.automatic);
 await home();await game();await page.getByText('S13-Automatik aktiv',{exact:true}).waitFor();
 const masks=raw.seasons[0].masks, wild=masks.find(m=>m.name==='Wild Thing');
 await show(2);await tip(wild,'X');await show(4);await tip(wild,'Falsch');
 await reveal(masks.find(m=>m.name==='Groovy'),0);await reveal(masks.find(m=>m.name==='Fernando El Toro'),0);
 const after4=await state();assert.equal(after4.seasons[0].masks.filter(m=>!m.isRevealed).length,8);
 await show(5);const survivors=after4.seasons[0].masks.filter(m=>!m.isRevealed), eliminated=survivors.slice(0,3);
 for(const m of survivors)await tip(m,eliminated.some(e=>e.id===m.id)?'X':'Falsch5');
 for(const m of eliminated){const s=await reveal(m,18);assert.deepEqual(s.seasons[0].appearanceRules.appearances[m.id],[Number(m.id[1])+1,5]);}
 await show(6);let finalState=await state();const finalists=finalState.seasons[0].masks.filter(m=>!m.isRevealed);assert.equal(finalists.length,5);
 for(const m of finalists){if(m.id!==wild.id)await tip(m,'X');finalState=await reveal(m,m.id===wild.id?20:16);assert.deepEqual(finalState.seasons[0].appearanceRules.appearances[m.id],[Number(m.id[1])+1,5,6]);}
 assert.equal(finalState.seasons[0].masks.reduce((n,m)=>n+m.settlement.result.scores[0].totalScore,0),138);
 assert.equal(finalState.seasons[0].masks.find(m=>m.id===wild.id).tips.a[0].showId,'s2');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(artifacts,'final-phone.png'),fullPage:false});
 await home();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export',exact:true}).click();const download=await pending,file=path.join(artifacts,'synthetic-export.json');await download.saveAs(file);assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),finalState);
 await page.reload({waitUntil:'networkidle'});assert.deepEqual(await state(),finalState);await load(raw);await load(finalState);await page.reload({waitUntil:'networkidle'});assert.deepEqual(await state(),finalState);
 // A reported skipped semifinal: only the selected mask gets an override; past ledgers stay unchanged.
 await load(after4);await game();await show(6);await home();await page.getByRole('button',{name:'Einstellungen',exact:true}).click();await page.getByText('Erweitert / Auftritte korrigieren',{exact:true}).click();await page.getByLabel('Auftritts-Shows: Three Sixty',{exact:true}).fill('4, 6');await page.getByRole('button',{name:'Auftrittsfolge speichern',exact:true}).click();
 const corrected=await committed(s=>!!s.seasons[0].appearanceRules.automatic.overrides.m31);assert.deepEqual(corrected.seasons[0].appearanceRules.automatic.overrides,{m31:[4,6]});
 assert.deepEqual(corrected.seasons[0].masks.filter(m=>m.isRevealed),after4.seasons[0].masks.filter(m=>m.isRevealed));await home();await game();const three=masks.find(m=>m.name==='Three Sixty');await tip(three,'X');await reveal(three,18);
 assert.deepEqual(errors,[]);results.push({result:'PASS',story:'automatic Show4/5/6: 4 debuts, 2 reveals, 8 semifinalists, arbitrary 3 reveals, 5 finalists; basis20/18/16; actual pre-debut data; export/import/reload; advanced skip override18, frozen ledgers'});console.log(JSON.stringify(results[0]));
}catch(error){results.push({result:'FAIL',error:String(error)});await page.screenshot({path:path.join(artifacts,'failure.png'),fullPage:true});throw error;}
finally{fs.writeFileSync(path.join(artifacts,'results.json'),JSON.stringify(results,null,2));await browser.close();}
