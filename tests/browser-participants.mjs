// New disposable Chromium profile, local origin only, exclusively synthetic demo009.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.JARVIS_PLAYWRIGHT_PACKAGE || 'playwright');
const [output,base='http://127.0.0.1:4328']=process.argv.slice(2);
assert.ok(output);assert.match(base,/^http:\/\/(127\.0\.0\.1|192\.168\.\d+\.\d+):4328$/);
fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.JARVIS_BROWSER_EXECUTABLE,headless:true});
const context=await browser.newContext({viewport:{width:1024,height:1366},acceptDownloads:true});
await context.addInitScript(()=>{
  window.participantWrites=0;
  for(const method of ['put','add','delete','clear']){
    const original=IDBObjectStore.prototype[method];
    IDBObjectStore.prototype[method]=function(...args){window.participantWrites++;return original.apply(this,args)};
  }
});
const page=await context.newPage(),errors=[],dialogs=[],requests=[];
let acceptStart=false;
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))requests.push({url:r.url(),method:r.method()})});
page.on('dialog',async d=>{dialogs.push(d.message());if(d.type()==='confirm'&&!acceptStart)await d.dismiss();else await d.accept()});
const state=()=>page.evaluate(()=>new Promise((resolve,reject)=>{
  const r=indexedDB.open('MaskedSingerTipperDB',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('appStateStore','readonly'),q=tx.objectStore('appStateStore').get('mainState');let result;q.onsuccess=()=>result=q.result;tx.oncomplete=()=>{db.close();resolve(result)}};
}));
async function committed(predicate){for(let i=0;i<80;i++){const value=await state();if(predicate(value))return value;await page.waitForTimeout(50)}throw Error('Expected synthetic commit missing')}
const section=n=>page.getByRole('region',{name:`Teilnehmer Show ${n}`,exact:true});
const canonical=id=>page.locator(`[data-mask-id="${id}"]`);
async function enter(){await page.getByRole('heading',{name:'SHOW 5 + 6 – DEMO',exact:true}).click();await page.getByRole('combobox',{name:'Aktuelle Show'}).waitFor()}
async function counts(half,final){assert.equal(await page.locator('[data-mask-id]').count(),16);assert.equal(await section(5).locator('[data-participant-mask-id]').count(),half);assert.equal(await section(6).locator('[data-participant-mask-id]').count(),final)}
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
async function reveal(id,photo=false,cancel=false){
  await canonical(id).getByRole('button',{name:'Demaskieren',exact:true}).click();
  const modal=page.getByRole('dialog');
  if(photo)await modal.locator('input[type="file"]').setInputFiles({name:'synthetic-pixel.png',mimeType:'image/png',buffer:png});
  await modal.getByLabel('Name des Promis',{exact:true}).fill(`Testpromi ${id.slice(1)}`);
  if(cancel){await modal.getByRole('button',{name:'Schließen',exact:true}).click();return}
  await modal.getByRole('button',{name:'Identität demaskieren',exact:true}).click();
  await committed(s=>s.seasons[0].masks.find(m=>m.id===id).isRevealed);
}
async function unchangedNavigation(){
  const before=await state(),writes=await page.evaluate(()=>window.participantWrites);
  for(const n of [5,6]){
    const links=section(n).getByRole('link');
    if(await links.count()){
      await links.first().click();
      assert.match(await page.evaluate(()=>document.activeElement.id),/^canonical-mask-/);
      assert.equal(await page.getByRole('dialog').count(),0);
    }
    await section(n).locator('summary').click();await section(n).locator('summary').click();
  }
  assert.deepEqual(await state(),before);assert.equal(await page.evaluate(()=>window.participantWrites),writes);
}
try{
  await page.goto(base+'/participants-demo.html',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'SHOW 5 + 6 – DEMO laden',exact:true}).click();await enter();
  const initial=await state();assert.equal(initial.seasons[0].id,'participants-demo-009');
  await counts(8,0);await section(6).getByText('Teilnehmer noch offen',{exact:true}).waitFor();
  assert.equal(await section(5).getByRole('button').count(),0);await unchangedNavigation();
  await page.getByRole('button',{name:'Finale starten',exact:true}).click();assert.deepEqual(await state(),initial,'Cancelled start preserves data');
  await reveal('m02',true,true);assert.deepEqual(await state(),initial,'Photo/reveal cancellation preserves all data');
  for(const id of ['m02','m12','m22'])await reveal(id,id==='m02');
  await counts(8,0);await section(5).getByText('Testpromi 02',{exact:true}).waitFor();
  acceptStart=true;
  await page.getByRole('button',{name:'Finale starten',exact:true}).evaluate(b=>{b.click();b.click()});
  await committed(s=>s.seasons[0].shows.length===6);await counts(8,5);
  assert.equal(await page.getByRole('button',{name:'Keine weitere Show',exact:true}).isDisabled(),true);
  const beforeFinal=await state(),ids=beforeFinal.seasons[0].masks.map(m=>m.id);
  await reveal('m03',true);
  const afterFinal=await state();await counts(8,5);
  for(const n of [5,6]){
    const copy=section(n).locator('[data-participant-mask-id="m03"]');
    await copy.getByText('Testpromi 03',{exact:true}).waitFor();await copy.getByText('Enthüllt',{exact:true}).waitFor();
    assert.ok((await copy.locator('img').getAttribute('src')).startsWith('data:image/'));
    const mask=afterFinal.seasons[0].masks.find(m=>m.id==='m03');
    for(const p of afterFinal.players)assert.ok((await copy.innerText()).includes(`${mask.settlement.result.playerMaskPoints[`m03-${p.id}`]} P.`));
  }
  const restored=structuredClone(afterFinal);restored.seasons[0].masks=restored.seasons[0].masks.map(m=>m.id==='m03'?beforeFinal.seasons[0].masks.find(x=>x.id==='m03'):m);
  restored.seasons[0].appearanceRules.appearances.m03=beforeFinal.seasons[0].appearanceRules.appearances.m03;
  assert.deepEqual(restored,beforeFinal,'Only one canonical mask/ledger and frozen appearance change');
  assert.deepEqual(afterFinal.seasons[0].masks.map(m=>m.id),ids);
  assert.equal(await page.getByRole('main',{name:'Siegerehrung',exact:true}).count(),0);
  await unchangedNavigation();
  for(const width of [1024,390]){
    await page.setViewportSize({width,height:width===390?844:1366});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await section(5).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`participants-${width}.png`)});
    await section(6).screenshot({path:path.join(output,`finalists-${width}.png`)});
  }
  await page.reload({waitUntil:'networkidle'});await enter();await counts(8,5);assert.deepEqual(await state(),afterFinal);
  await unchangedNavigation();
  for(const id of ['m13','m23','m32','m33'])await reveal(id);
  const complete=await state();await counts(8,5);assert.ok(complete.seasons[0].masks.every(m=>m.isRevealed&&m.settlement));
  assert.equal(await page.locator('[data-season-winner]').count(),0);
  assert.equal(await page.getByRole('button',{name:'Siegerehrung starten',exact:true}).isDisabled(),true);
  const writes=await page.evaluate(()=>window.participantWrites);
  await page.getByRole('checkbox',{name:'Die Besetzung ist vollständig erfasst und das TV-Finale ist beendet.',exact:true}).check();
  await page.getByRole('button',{name:'Siegerehrung starten',exact:true}).click();
  await page.getByRole('main',{name:'Siegerehrung',exact:true}).waitFor();
  await page.getByRole('button',{name:'Animation überspringen',exact:true}).click();
  await page.getByRole('button',{name:'‹ Zurück zur Staffel',exact:true}).click();
  assert.ok(await page.locator('[data-season-winner]').count()>0);await counts(8,5);await unchangedNavigation();
  assert.deepEqual(await state(),complete);assert.equal(await page.evaluate(()=>window.participantWrites),writes);
  await page.getByRole('button',{name:'‹ Zurück zur Übersicht',exact:true}).click();
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Export – Spieledaten sichern',exact:true}).click()]);
  assert.deepEqual(JSON.parse(fs.readFileSync(await download.path(),'utf8')),complete);
  await page.goto(base+'/participants-demo.html');await page.getByRole('button',{name:'SHOW 5 + 6 – DEMO laden',exact:true}).click();
  await page.getByText('Ein Spielstand ist bereits vorhanden. Er bleibt unverändert.',{exact:true}).waitFor();assert.deepEqual(await state(),complete);
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,canonicalCount:16,semifinalCount:8,finalCount:5,duplicateLedgers:0,presentationWrites:0,pageErrors:errors,nonGetRequests:requests,exportExact:true,syntheticOnly:true,localOrigin:base,dialogs,viewports:[1024,390]},null,2));
  console.log('PASS: canonical16/half8/final5; real reveal/photo/cancel -> all views; stable historical rosters; one ledger; no presentation writes; reload/export; manual ceremony/winner; show7 guard; 1024/390; bootstrap refuses overwrite.');
}catch(e){await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({errors,dialogs,state:await state()},null,2));throw e}
finally{await context.close();await browser.close()}
