const { chromium } = require(process.env.STAMP_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = process.env.STAMP_CAPTURE_DIR || __dirname;
const preview = process.env.STAMP_PREVIEW_URL || 'http://127.0.0.1:5174';
fs.mkdirSync(out, { recursive: true });
const clients = Array.from({ length: 35 }, (_, i) => ({ id: i+1, prenom: i ? `Cliente ${i+1}` : 'Alice', nom: 'Recette', archive: 0, contacter: 0, points_fidelite: 0 }));
const orders = clients.map(c => ({ id: c.id, client_id: c.id, client: c, client_prenom: c.prenom, client_nom: c.nom, type: 'hors_kit', montant: 80, reglee: 0, created_at: '2026-10-10 12:00:00', commande_collections: [], papiers_selectionnes: [], ruban: null }));
const catalogues = clients.map(c => ({ id: c.id, titre: c.id === 1 ? 'Catalogue unique' : `Catalogue ${c.id}`, archive: 0, statut: 'publie', formats_disponibles: ['C'], prix_A_cents: 1800, prix_B_cents: 1400, prix_C_cents: 900, collections: [{ id: 11, nom: 'Collection recette', papiers: [{ id: 21, nom: 'Papier recette', archive: 0 }] }], rubans: [] }));
const pages = [
 { path: '/clients', panel: '.clients-list-panel', content: '#clients-list-content', rows: '.clients-list > li', filters: '#clients-filter-toggle', search: '#clients-search', term: 'Alice', create: '#clients-create' },
 { path: '/catalogues', panel: '.catalogue-list-panel', content: '.catalogue-list-content', rows: '.catalogue-list > li', filters: '#catalogue-filter-toggle', search: '#catalogue-search', term: 'unique', create: '.catalogue-actions .btn' },
 { path: '/commandes/hors-kit', panel: '.commandes-list-panel', content: '#commandes-list-content', rows: '.commandes-list > li', filters: '#commandes-filter-toggle', search: '#commande-client-search', term: 'Alice', create: '#commandes-create-hors-kit' },
];
(async () => {
 const browser = await chromium.launch({ headless: true, executablePath: process.env.STAMP_CHROMIUM_EXECUTABLE });
 try {
  const p = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  p.setDefaultTimeout(10000);
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  let count = 35, releaseArchive;
  await p.route('**/api/**', async r => {
   const path = new URL(r.request().url()).pathname, method = r.request().method();
   const json = (value, status = 200) => r.fulfill({ json: value, status });
   if (path === '/api/clients') return method === 'POST' ? json({ error: 'Erreur serveur de recette' }, 409) : json(clients.slice(0, count));
   if (path === '/api/commandes') return json(orders.slice(0, count));
   if (path === '/api/catalogues') return json(catalogues.slice(0, count));
   if (/^\/api\/clients\/\d+\/archivage$/.test(path)) { await new Promise(resolve => releaseArchive = resolve); return json({ ...clients[0], archive: 1 }); }
   if (path === '/api/settings') return json({ prix_A_cents: 1800, prix_B_cents: 1400, prix_C_cents: 900 });
   if (/^\/api\/catalogues\/\d+$/.test(path)) return json(catalogues[0]);
   if (/^\/api\/clients\/\d+$/.test(path)) return json(clients[0]);
   return json([]);
  });
  const rect = s => p.locator(s).evaluate(e => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height }; });
  const overflow = async () => assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const capture = name => p.screenshot({ path: `${out}/${name}.png`, animations: 'disabled' });
  const settled = async spec => {
   if (count) await p.locator(spec.rows).last().waitFor();
   else await p.locator(`${spec.content} .empty-state`).waitFor();
   assert.equal(await p.locator(spec.rows).count(), count);
  };
  const compact = async spec => {
   const box = await rect(spec.panel), last = await rect(`${spec.rows}:last-child`);
   assert.ok(Math.abs(box.bottom-last.bottom) <= 2, JSON.stringify({ spec: spec.path, box, last }));
  };
  for (const [width, height] of [[1280,800], [1024,768], [375,800], [800,375]]) {
   await p.setViewportSize({ width, height });
   for (const spec of pages) {
    for (count of [0,1,3,35]) {
     await p.goto(`${preview}${spec.path}`); await settled(spec); await overflow();
     if (count && count <= 3 && width > 900) await compact(spec);
     if (width > 900) {
      assert.ok((await rect(spec.panel)).bottom <= (await rect('.dock-wrapper')).top);
      assert.ok(await p.evaluate(() => document.documentElement.scrollHeight <= innerHeight+1));
      if (count === 35) {
       await p.locator(spec.content).evaluate(e => e.scrollTop=e.scrollHeight);
       const last = await rect(`${spec.rows}:last-child`), body = await rect(spec.content);
       assert.ok(last.bottom <= body.bottom+1); assert.ok(last.top >= body.top);
       await p.locator(spec.filters).click(); await p.locator(spec.search).fill(spec.term);
       await p.waitForFunction(rows => document.querySelectorAll(rows).length === 1, spec.rows);
       await compact(spec);
       assert.equal(await p.locator(spec.content).evaluate(e => e.scrollTop), 0);
       await capture(`${spec.path.split('/')[1]}-filtre-${width}`);
      }
     }
     if (count === 1) await capture(`${spec.path.split('/')[1]}-court-${width}`);
    }
   }
  }
  count = 3; await p.setViewportSize({ width:1280, height:800 });
  await p.goto(`${preview}/clients`); await p.locator('#clients-create').click();
  await p.locator('.form-panel').waitFor();
  const controls = ['.input-wrapper', '.email-domain-control', '.phone-control'];
  for (const selector of controls) {
   assert.equal(await p.locator(selector).first().evaluate(e => getComputedStyle(e).borderRadius), '6px');
   assert.ok(Math.abs((await p.locator(selector).first().boundingBox()).height-44) <= 1);
  }
  const name = p.getByLabel('Prénom'); await name.fill('Nouvelle'); await p.getByLabel(/^Nom/).fill('Cliente');
  const email = p.getByLabel('Email', { exact: true }); await email.fill('alice@g'); await p.getByRole('listbox').waitFor();
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); assert.ok((await email.inputValue()).includes('@gmail.com'));
  await email.fill('alice@g'); await p.keyboard.press('Escape'); assert.equal(await p.getByRole('listbox').count(),0); assert.ok(await p.locator('.form-panel').isVisible());
  await email.fill('alice@example.test');
  await p.getByLabel('Téléphone', { exact:true }).fill('0612345678'); assert.equal(await p.getByLabel('Téléphone', { exact:true }).inputValue(), '06 12 34 56 78');
  await capture('champs-cliente-1280');
  await p.locator('.form-panel-close').click(); await p.getByRole('dialog').waitFor();
  await p.locator('.modal-close').focus(); await p.keyboard.press('Shift+Tab'); assert.equal(await p.getByRole('button',{name:'Abandonner',exact:true}).evaluate(e=>e===document.activeElement),true);
  await p.keyboard.press('Tab'); assert.ok(await p.locator('.modal-close').evaluate(e=>e===document.activeElement));
  await capture('confirmation-1280');
  for (const [width,height] of [[375,800],[800,375]]) { await p.setViewportSize({width,height}); await overflow(); const modal=await rect('.modal-container'); assert.ok(modal.top>=0 && modal.bottom<=height); await capture(`confirmation-${width}`); }
  await p.setViewportSize({width:1280,height:800}); await p.keyboard.press('Escape'); await p.getByRole('dialog').waitFor({state:'hidden'}); assert.equal(await name.inputValue(),'Nouvelle');
  await p.locator('.form-panel').getByRole('button',{name:'Créer',exact:true}).click(); await p.getByText('Erreur serveur de recette',{exact:true}).waitFor(); assert.equal(await name.inputValue(),'Nouvelle'); await capture('erreur-cliente-1280');
  await p.locator('.form-panel-close').click(); await p.getByRole('button',{name:'Abandonner',exact:true}).click(); await p.locator('.form-panel').waitFor({state:'hidden'});
  await p.locator('#client-open-1').click(); await p.getByRole('button',{name:'Archiver',exact:true}).click(); await p.getByRole('dialog').getByRole('button',{name:'Archiver',exact:true}).click();
  await p.waitForFunction(() => document.querySelector('.modal-close')?.disabled);
  await p.keyboard.press('Escape'); assert.ok(await p.getByRole('dialog').isVisible()); assert.ok(await p.getByRole('button',{name:'Annuler',exact:true}).isDisabled());
  releaseArchive(); await p.getByRole('dialog').waitFor({state:'hidden'});
  await p.goto(`${preview}/commandes/hors-kit`); await p.locator('#commandes-create-hors-kit').click(); await p.locator('.form-panel').waitFor();
  await p.locator('.form-panel').getByLabel(/^Cliente/).selectOption('1'); await p.getByLabel(/^Montant/).fill('81');
  assert.equal(await p.locator('.select-wrapper').evaluate(e=>getComputedStyle(e).borderRadius),'6px'); await capture('champs-hors-kit-1280');
  for (const [width,height] of [[1280,800],[375,800],[800,375]]) {
   await p.setViewportSize({width,height});
   await p.evaluate(()=>{for(const type of ['info','error','success','warning']) window.dispatchEvent(new CustomEvent('toast',{detail:{type,message:'Notification de recette : '+ 'texte '.repeat(15),duration:0}}));});
   await p.locator('.toast-error[role=alert]').waitFor(); assert.equal(await p.locator('.toast-info').getAttribute('role'),'status'); await overflow();
   await p.waitForFunction(() => document.querySelector('.toast-container').getBoundingClientRect().bottom <= document.querySelector('.dock-wrapper').getBoundingClientRect().top);
   const toast=await rect('.toast-container'),dock=await rect('.dock-wrapper'); assert.ok(toast.bottom<=dock.top,JSON.stringify({toast,dock}));
   const link=p.locator('.dock-item').first(); assert.ok(await link.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));
   await capture(`notifications-${width}`);
   for (const type of ['info','error','success','warning']) { const toast = p.locator(`.toast-${type}`); await toast.locator('.toast-close').focus(); await p.keyboard.press('Enter'); await toast.waitFor({state:'hidden'}); }
  }
  assert.deepEqual(errors,[]);
  console.log('OK : listes 0/1/3/35 et filtrage compact sur les trois vues, dernières lignes accessibles, champs communs, email/téléphone clavier, confirmation et verrou pendant mutation, erreur serveur conservant les saisies, notifications sans recouvrir le dock, 1280/1024/375/800.');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
