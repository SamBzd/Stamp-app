const { chromium } = require(process.env.STAMP_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = process.env.STAMP_CAPTURE_DIR || __dirname;
const preview = process.env.STAMP_PREVIEW_URL || 'http://127.0.0.1:5174';
fs.mkdirSync(out, { recursive:true });
(async()=>{
 const browser = await chromium.launch({headless:true, executablePath:process.env.STAMP_CHROMIUM_EXECUTABLE});
 try {
  const p = await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/api/**',r=>r.request().method()==='GET'?r.continue():r.abort());
  const shot=name=>p.screenshot({path:`${out}/${name}.png`});
  const specs=[
   {path:'/clients',empty:'.client-placeholder',content:'#clients-list-content',row:'.client-list-item',open:'#client-open-1'},
   {path:'/commandes/hors-kit',empty:'.commande-placeholder',content:'#commandes-list-content',row:'.commande-open',open:'#commande-open-3'},
   {path:'/catalogues',empty:'.catalogue-detail-placeholder',content:'.catalogue-list-content',row:'.catalogue-open',open:'.catalogue-open'},
  ];
  for(const width of [1280,1024]) {
   await p.setViewportSize({width,height:800});
   for(const s of specs) {
    await p.goto(preview+s.path);await p.locator(s.row).first().waitFor();
    const compact=await p.locator(s.empty).evaluate(e=>{const r=e.getBoundingClientRect(),dock=document.querySelector('.dock-wrapper').getBoundingClientRect();return r.height<220&&r.bottom<dock.top-100;});assert.ok(compact,s.path);
    // A short list reserves no empty strip on the right of its coloured rows.
    const geometry=await p.locator(s.content).evaluate((e,row)=>{const r=e.getBoundingClientRect(),child=e.querySelector(row).getBoundingClientRect();return {right:r.right,rowRight:child.right,short:e.scrollHeight<=e.clientHeight};},s.row);
    if(geometry.short)assert.ok(Math.abs(geometry.right-geometry.rowRight)<1,JSON.stringify({path:s.path,...geometry}));
    await shot(`vide-${s.path.split('/')[1]}-${width}`);
    await p.locator(s.open).first().click();await p.locator('.slide-panel').waitFor();
    assert.equal(await p.locator(s.empty).count(),0);
    await shot(`selection-${s.path.split('/')[1]}-${width}`);
    await p.locator('.slide-panel-close').click();await p.locator(s.empty).waitFor();
    assert.ok(await p.locator(s.empty).evaluate(e=>e.getBoundingClientRect().height<220));
   }
  }
  for(const [width,height] of [[1280,800],[1024,768],[375,800],[800,375]]) {
   await p.setViewportSize({width,height});await p.goto(preview+'/commandes/hors-kit');await p.locator('#commandes-create-hors-kit').click();
   const field=p.locator('.date-field');await field.waitFor();
   assert.ok(await field.evaluate(e=>Math.abs(e.getBoundingClientRect().width-e.closest('form').getBoundingClientRect().width)<1));
   await shot(`champ-hors-kit-${width}`);
   const date=p.locator('.date-input');await date.click();await p.locator('.calendar-expansion').waitFor();
   assert.ok(await p.locator('.calendar-expansion').evaluate(e=>e.getBoundingClientRect().width>250));
   await p.locator('.calendar-grid button').filter({hasText:/^15$/}).first().focus();
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await shot(`hors-kit-${width}`);await p.keyboard.press('Enter');await p.locator('.calendar-expansion').waitFor({state:'hidden'});
   await p.goto(preview+'/stocks');await p.locator('.kanban').waitFor();
   for(const selected of ['fournitures','bilan']) {
    const tab=p.locator(`#${selected}-tab`);await tab.click();
    await p.waitForFunction(id=>{const e=document.getElementById(id);return e?.getAttribute('aria-selected')==='true'&&getComputedStyle(e).backgroundColor===getComputedStyle(document.querySelector('.atelier-header')).backgroundColor;},`${selected}-tab`);
    const visible=await tab.evaluate(e=>{const r=e.getBoundingClientRect(),c=getComputedStyle(e);return {rect:r.toJSON(),bg:c.backgroundColor,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),ok:r.top>=0&&r.bottom<innerHeight&&r.height>=44&&c.backgroundColor!=='rgba(0, 0, 0, 0)'&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});assert.ok(visible.ok,JSON.stringify({selected,width,...visible}));
    await shot(`onglet-${selected}-${width}`);
   }
   await p.locator('#bilan-tab').press('ArrowLeft');assert.ok(await p.locator('#fournitures-tab').evaluate(e=>e===document.activeElement));
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  assert.deepEqual(errors,[]);
  console.log('OK : panneaux sans sélection compacts, lignes courtes jusqu’au bord, ouverture/fermeture du détail, date hors kit pleine largeur, calendrier sélectionnable et onglets visibles au clavier, desktop/mobile/paysage. Aucune écriture API.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
