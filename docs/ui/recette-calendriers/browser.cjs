const { chromium } = require(process.env.STAMP_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = process.env.STAMP_CAPTURE_DIR || __dirname;
const preview = process.env.STAMP_PREVIEW_URL || 'http://127.0.0.1:5174';
fs.mkdirSync(out, { recursive: true });
(async () => {
 const browser = await chromium.launch({ headless: true, executablePath: process.env.STAMP_CHROMIUM_EXECUTABLE });
 try {
  const p = await browser.newPage({ viewport: { width:1280, height:800 }, reducedMotion:'reduce' });
  p.setDefaultTimeout(10000);
  const errors=[], writes=[];let hold=false,release;
  p.on('pageerror',e=>errors.push(e.message));
  p.on('dialog',d=>d.accept());
  // GET sur la base de démonstration locale ; toutes les écritures sont interceptées.
  await p.route('**/api/**',async r=>{
   if(r.request().method()==='GET') return r.continue();
   writes.push({path:new URL(r.request().url()).pathname, data:r.request().postDataJSON()});
   if(hold) await new Promise(resolve=>release=resolve);
   return r.fulfill({status:500,json:{error:'Erreur simulée : aucune donnée enregistrée'}});
  });
  const calendar=()=>p.locator('.calendar-expansion');
  const date=label=>p.locator('.form-panel').getByRole('button',{name:new RegExp(`^${label} `)});
  const capture=name=>p.screenshot({path:`${out}/${name}.png`});
  const typeDate=async value=>{await calendar().getByLabel('Saisir une date (JJ/MM/AAAA)').fill(value);await calendar().getByRole('button',{name:'Valider',exact:true}).click();};
  await p.goto(`${preview}/clients`);await p.locator('#clients-create').click();
  const birth=date('Date de naissance');
  await birth.click({position:{x:12,y:20}});await calendar().waitFor();
  assert.ok(await birth.evaluate(e=>e===document.activeElement));assert.equal(await p.getByRole('dialog').count(),0);assert.equal(await p.locator('.modal-overlay').count(),0);
  await birth.click();await calendar().waitFor({state:'hidden'});await birth.press('Space');await calendar().waitFor();assert.equal(await birth.getAttribute('aria-expanded'),'true');
  await calendar().getByLabel('Année du calendrier').fill('1');await calendar().getByLabel('Année du calendrier').press('Tab');await calendar().getByLabel('Mois du calendrier').selectOption('0');assert.ok(await calendar().getByRole('button',{name:'Mois précédent',exact:true}).isDisabled());
  await calendar().getByLabel('Année du calendrier').fill('9999');await calendar().getByLabel('Année du calendrier').press('Tab');await calendar().getByLabel('Mois du calendrier').selectOption('11');assert.ok(await calendar().getByRole('button',{name:'Mois suivant',exact:true}).isDisabled());
  await calendar().getByLabel('Année du calendrier').fill('0');await calendar().getByLabel('Année du calendrier').press('Tab');assert.equal(await calendar().getByLabel('Année du calendrier').inputValue(),'9999');
  await typeDate('31/02/2024');await calendar().getByRole('alert').waitFor();
  assert.ok(await calendar().isVisible());assert.equal(writes.length,0);
  await typeDate('29/02/2024');await calendar().waitFor({state:'hidden'});
  assert.ok((await birth.textContent()).includes('29/02/2024'));assert.ok(await birth.evaluate(e=>e===document.activeElement));
  await birth.press('ArrowDown');await calendar().waitFor();
  await p.keyboard.press('ArrowRight');assert.equal(await p.locator('.calendar-grid button:focus').getAttribute('data-date'),'2024-03-01');
  await p.keyboard.press('PageUp');assert.equal(await p.locator('.calendar-grid button:focus').getAttribute('data-date'),'2024-02-01');
  await p.keyboard.press('End');assert.equal(await p.locator('.calendar-grid button:focus').getAttribute('data-date'),'2024-02-04');
  await p.keyboard.press('Escape');await calendar().waitFor({state:'hidden'});
  assert.ok(await p.locator('.form-panel').isVisible());assert.ok((await birth.textContent()).includes('29/02/2024'));
  await birth.click();await calendar().getByLabel('Année du calendrier').fill('1985');await calendar().getByLabel('Année du calendrier').press('Enter');assert.equal(writes.length,0);
  await calendar().getByLabel('Mois du calendrier').selectOption('3');
  await calendar().getByRole('button',{name:'mardi 9 avril 1985',exact:true}).click();
  assert.ok((await birth.textContent()).includes('09/04/1985'));
  for (const [width,height] of [[1280,800],[1024,768],[375,800],[800,375]]) {
   await calendar().waitFor({state:'hidden'});await p.setViewportSize({width,height});const before=await p.locator('.date-field').evaluate(e=>e.getBoundingClientRect().height);
   await birth.click();await calendar().waitFor();
   const geometry=await calendar().evaluate(e=>({height:e.getBoundingClientRect().height,inside:Boolean(e.closest('.form-panel form')),overflow:document.documentElement.scrollWidth>innerWidth}));
   assert.ok(geometry.height>300 && geometry.inside && !geometry.overflow,JSON.stringify(geometry));
   assert.ok(await p.locator('.date-field').evaluate((e,before)=>e.getBoundingClientRect().height>before+300,before));
   const day=calendar().getByRole('button',{name:'dimanche 28 avril 1985',exact:true});await day.focus();
   const visible=await day.evaluate(e=>{const r=e.getBoundingClientRect(),b=e.closest('.form-panel-body').getBoundingClientRect(),dock=document.querySelector('.dock-wrapper').getBoundingClientRect();return {day:{top:r.top,bottom:r.bottom},body:{top:b.top,bottom:b.bottom},dock:dock.top,visible:r.top>=b.top-1 && r.bottom<=Math.min(b.bottom,dock.top)+1};});assert.ok(visible.visible,JSON.stringify({width,height,...visible}));
   await birth.focus();if(height>500) await p.locator('.date-field').evaluate(e=>e.scrollIntoView({block:'start'}));
   await capture(`calendrier-${width}`);
   await calendar().getByRole('button',{name:'Annuler',exact:true}).focus();await p.keyboard.press('Tab');
   assert.equal(await p.evaluate(()=>Boolean(document.activeElement.closest('.calendar-expansion'))),false);
   if(width===1280){await p.keyboard.press('Escape');await p.getByRole('dialog').waitFor();await p.getByRole('dialog').getByRole('button',{name:'Annuler',exact:true}).click();await p.getByRole('dialog').waitFor({state:'hidden'});assert.ok(await calendar().isVisible());assert.ok((await birth.textContent()).includes('09/04/1985'));assert.equal(writes.length,0);}
   await birth.focus();await p.keyboard.press('Escape');await calendar().waitFor({state:'hidden'});assert.ok(await p.locator('.form-panel').isVisible());
  }
  await p.setViewportSize({width:1280,height:800});await birth.click();await calendar().getByRole('button',{name:'Effacer',exact:true}).click();assert.ok((await birth.textContent()).includes('Choisir une date'));
  await birth.click();await typeDate('09/04/1985');await p.getByLabel('Prénom',{exact:false}).fill('Date');await p.getByLabel(/^Nom/).fill('Recette');
  hold=true;await p.locator('.form-panel').getByRole('button',{name:'Créer',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.date-input')?.disabled);assert.ok(await birth.isDisabled());assert.equal(await calendar().count(),0);release();hold=false;await p.locator('.form-panel').getByText('Erreur simulée : aucune donnée enregistrée',{exact:true}).waitFor();
  assert.equal(writes.at(-1).data.date_naissance,'1985-04-09');assert.ok((await birth.textContent()).includes('09/04/1985'));
  await p.goto(`${preview}/commandes/hors-kit`);await p.locator('#commandes-create-hors-kit').click();
  await p.locator('.form-panel').getByLabel(/^Cliente/).selectOption('1');await p.getByLabel(/^Montant/).fill('12');
  const orderDate=date('Date de commande');await orderDate.click({position:{x:10,y:20}});await typeDate('29/02/2024');
  await p.locator('.form-panel').getByRole('button',{name:'Créer',exact:true}).click();await p.locator('.form-panel').getByText('Erreur simulée : aucune donnée enregistrée',{exact:true}).waitFor();
  assert.equal(writes.at(-1).data.date_commande,'2024-02-29');assert.ok((await orderDate.textContent()).includes('29/02/2024'));
  await p.goto(`${preview}/?commande=2`);await p.getByRole('button',{name:'Modifier',exact:true}).click();await date('Date de commande').waitFor();
  await date('Date de commande').click();await typeDate('01/03/2024');
  await p.locator('.form-panel').getByRole('button',{name:'Enregistrer',exact:true}).click();await p.locator('.form-panel').getByText('Erreur simulée : aucune donnée enregistrée',{exact:true}).waitFor();
  assert.equal(writes.at(-1).data.date_commande,'2024-03-01');assert.ok((await date('Date de commande').textContent()).includes('01/03/2024'));
  await calendar().waitFor({state:'hidden'});await p.emulateMedia({reducedMotion:'no-preference'});await date('Date de commande').click();
  await p.waitForFunction(()=>{const e=document.querySelector('.calendar-expansion');return e && Math.abs(e.getBoundingClientRect().height-e.querySelector('.calendar-clip').scrollHeight)<1;});
  assert.equal(await date('Date de commande').getAttribute('aria-expanded'),'true');await date('Date de commande').click();await calendar().waitFor({state:'hidden'});
  assert.equal(await p.locator('input[type="date"]').count(),0);assert.deepEqual(errors,[]);
  console.log('Calendriers : champ complet, clavier, années, bissextile, mobile/paysage, annulation/effacement et payloads ISO des trois formulaires vérifiés. Aucune écriture réelle.');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
