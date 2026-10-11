const { chromium } = require(process.env.STAMP_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = process.env.STAMP_CAPTURE_DIR || __dirname;
const preview = process.env.STAMP_PREVIEW_URL || 'http://127.0.0.1:5173';
fs.mkdirSync(out, { recursive: true });
const normal = {
 chiffre_affaires_cents: 234567,
 par_methode_paiement: [
  { methode_paiement: 'Paypal', total_cents: 160000, nb_commandes: 8 },
  { methode_paiement: 'chèque', total_cents: 50000, nb_commandes: 3 },
  { methode_paiement: 'virement', total_cents: 24560, nb_commandes: 1 },
  { methode_paiement: null, total_cents: 7, nb_commandes: 1 },
 ],
 produits_promo: [{ texte: 'Papier doré', prix_cents: 103, nb_fois: 2 }, { texte: 'Papier doré', prix_cents: 109, nb_fois: 1 }],
 autres: [{ texte: 'Accessoire historique', prix_cents: 207, nb_fois: 3 }],
};
const empty = { chiffre_affaires_cents: 0, par_methode_paiement: [], produits_promo: [], autres: [] };
const long = { ...normal, chiffre_affaires_cents: Number.MAX_SAFE_INTEGER,
 par_methode_paiement: [{ methode_paiement: 'PaiementAuNomTrèsLongSansEspacePourVérifierLeRetourÀLaLigne', total_cents: Number.MAX_SAFE_INTEGER, nb_commandes: 999 }],
 produits_promo: Array.from({length:25}, (_,i) => ({ texte: `ProduitHistoriqueAuNomTrèsLongSansEspacePourVérifierLeRetourÀLaLigne${i}`, prix_cents: 103, nb_fois: i+1 })),
 autres: [{ texte: 'AutreArticleAuNomTrèsLongSansEspacePourVérifierLeRetourÀLaLigne', prix_cents: 207, nb_fois: 999 }],
};
(async () => {
 const browser = await chromium.launch({headless:true, executablePath:process.env.STAMP_CHROMIUM_EXECUTABLE});
 try {
  const p = await browser.newPage({viewport:{width:1280,height:800}, reducedMotion:'reduce'});
  p.setDefaultTimeout(10000);
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  const requests=[];let fail=false, hold=false, release, fixture=normal;
  await p.route('**/api/**', async r => {
   const u=new URL(r.request().url());
   if(u.pathname==='/api/stocks/bilan'){
    requests.push(u.searchParams.get('mois'));
    if(hold) await new Promise(resolve=>release=resolve);
    return fail ? r.fulfill({status:500,json:{error:'Bilan indisponible pour la recette'}}) : r.fulfill({json:{...fixture,mois:u.searchParams.get('mois')}});
   }
   if(u.pathname.includes('/workflow')) return r.fulfill({json:{groupes:[],alertes:[]}});
   return r.fulfill({json:[]});
  });
  const shot = name => p.screenshot({path:`${out}/${name}.png`,animations:'disabled'});
  const overflow = async () => assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const trigger = () => p.locator('.month-input');
  const modal = () => p.getByRole('dialog',{name:'Choisir un mois'});
  const open = async () => {
   await trigger().click();await modal().waitFor();
   await p.locator('.modal-overlay').evaluate(e=>Promise.all(e.getAnimations({subtree:true}).map(animation=>animation.finished)));
  };
  const choose = async (month,year=2023) => {
   await open();
   let shown=Number(await p.locator('.month-picker-year strong').innerText());
   while(shown!==year){await modal().getByRole('button',{name:shown>year?'Année précédente':'Année suivante'}).click();shown=Number(await p.locator('.month-picker-year strong').innerText());}
   await modal().getByRole('button',{name:month,exact:true}).click();await modal().waitFor({state:'hidden'});
   assert.ok(await trigger().evaluate(e=>e===document.activeElement));
  };
  const load = async () => {await p.getByRole('button',{name:'Charger',exact:true}).click();await p.locator('.bilan-content').waitFor();};
  const dock = async () => assert.ok(await p.locator('.dock-item').first().evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));
  await p.goto(`${preview}/stocks`);await p.locator('.kanban').waitFor();assert.equal(await p.locator('.kanban-column').count(),5);
  await p.getByRole('tab',{name:'Bilan mensuel',exact:true}).click();await p.getByText('Aucun bilan chargé',{exact:true}).waitFor();assert.equal(requests.length,0);await shot('initial-1280');
  await choose('Juin');assert.equal(await trigger().innerText(),'juin 2023');assert.equal(requests.length,0);
  await open();assert.equal(await modal().getByRole('button',{name:'Juin',exact:true}).getAttribute('aria-pressed'),'true');
  await p.locator('.modal-close').focus();await p.keyboard.press('Shift+Tab');assert.ok(await modal().getByRole('button',{name:'Décembre',exact:true}).evaluate(e=>e===document.activeElement));await p.keyboard.press('Tab');assert.ok(await p.locator('.modal-close').evaluate(e=>e===document.activeElement));
  await p.keyboard.press('Escape');await modal().waitFor({state:'hidden'});assert.ok(await trigger().evaluate(e=>e===document.activeElement));
  await load();assert.equal(requests.at(-1),'2023-06');assert.equal(await p.locator('#bilan-month-title').innerText(),'Bilan de juin 2023');assert.match(await p.locator('.bilan-ca-value').innerText(),/2\s?345,67/);
  assert.equal(await p.getByText('Papier doré',{exact:true}).count(),2);assert.ok(await p.getByText('1,03 €',{exact:true}).isVisible());assert.ok(await p.getByText('1,09 €',{exact:true}).isVisible());assert.ok(await p.getByText('Non renseigné',{exact:true}).isVisible());
  for(const [width,height] of [[1280,800],[1024,768],[375,800],[800,375]]){
   await p.setViewportSize({width,height});await overflow();await p.evaluate(()=>scrollTo(0,0));await shot(`bilan-${width}`);await dock();
   await open();await overflow();const box=await modal().boundingBox();assert.ok(box.y>=0&&box.y+box.height<=height);assert.equal(await modal().getByRole('button',{name:'Juin',exact:true}).getAttribute('aria-pressed'),'true');
   const december=modal().getByRole('button',{name:'Décembre',exact:true});await december.focus();
   // Une seule lecture navigateur : les deux rectangles partagent le même état de rendu.
   const visibility=await december.evaluate(e=>{
    const button=e.getBoundingClientRect(),body=e.closest('.modal-content').getBoundingClientRect();
    return {top:button.top,bottom:button.bottom,bodyTop:body.top,bodyBottom:body.bottom,focused:e===document.activeElement};
   });
   assert.ok(visibility.focused&&visibility.top>=visibility.bodyTop-1&&visibility.bottom<=visibility.bodyBottom+1,JSON.stringify({width,height,...visibility}));
   await p.locator('.modal-close').focus();await shot(`mois-${width}`);
   await modal().getByRole('button',{name:'Année précédente'}).click();await p.keyboard.press('Escape');await modal().waitFor({state:'hidden'});await open();assert.equal(await p.locator('.month-picker-year strong').innerText(),'2023');await p.keyboard.press('Escape');await modal().waitFor({state:'hidden'});
   await p.locator('.bilan-note').evaluate(e=>e.scrollIntoView({block:'start'}));await dock();const note=await p.locator('.bilan-note').boundingBox(),nav=await p.locator('.dock-wrapper').boundingBox();assert.ok(note.y+note.height<=nav.y);await shot(`bas-${width}`);
  }
  await p.setViewportSize({width:1280,height:800});await choose('Juillet');assert.equal(await p.locator('#bilan-month-title').innerText(),'Bilan de juin 2023');assert.equal(requests.length,1);await shot('mois-choisi-non-charge');
  hold=true;await p.getByRole('button',{name:'Charger',exact:true}).click();await p.getByText('Chargement du bilan de juillet 2023…',{exact:true}).waitFor();assert.ok(await trigger().isDisabled());assert.ok(await p.getByRole('button',{name:'Charger',exact:true}).isDisabled());await shot('chargement');release();hold=false;await p.locator('.bilan-content').waitFor();assert.equal(await p.locator('#bilan-month-title').innerText(),'Bilan de juillet 2023');
  fail=true;await p.getByRole('button',{name:'Charger',exact:true}).click();await p.getByText('Bilan indisponible pour la recette',{exact:true}).waitFor();assert.equal(await trigger().innerText(),'juillet 2023');await shot('erreur');fail=false;await p.getByRole('button',{name:'Réessayer',exact:true}).click();await p.locator('.bilan-content').waitFor();
  fixture=empty;await choose('Mai');await load();assert.equal(await p.locator('.empty-section').count(),3);assert.match(await p.locator('.bilan-ca-value').innerText(),/0,00/);await shot('vide-1280');
  fixture=long;await load();
  for(const [width,height] of [[1280,800],[375,800],[640,400]]){
   await p.setViewportSize({width,height});await overflow();await p.evaluate(()=>scrollTo(0,0));await shot(`long-${width}`);assert.ok((await p.locator('.bilan-ca-value').innerText()).includes(',91'));
   const table=p.locator('.stock-table-wrapper');await table.focus();await table.evaluate(e=>e.scrollLeft=e.scrollWidth);assert.ok(await table.evaluate(e=>e.scrollLeft+e.clientWidth>=e.scrollWidth-1));
   await p.locator('.bilan-note').evaluate(e=>e.scrollIntoView({block:'start'}));await dock();
  }
  await p.setViewportSize({width:1280,height:800});await p.evaluate(()=>scrollTo(0,0));await p.getByRole('tab',{name:'Bilan mensuel',exact:true}).focus();await p.keyboard.press('ArrowLeft');await p.locator('.kanban').waitFor();assert.equal(await p.locator('.kanban-column').count(),5);await p.keyboard.press('ArrowRight');assert.ok(await p.locator('.bilan-content').isVisible());
  assert.deepEqual(errors,[]);console.log('OK : bilan aux montants historiques exacts, mois chargé distinct du mois choisi, calendrier clavier/focus/Escape/année, chargement verrouillé/refus/reprise/mois vide, formats1280/1024/375/800, grands montants/noms longs/viewport640×400, dock accessible et Kanban conservé.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
