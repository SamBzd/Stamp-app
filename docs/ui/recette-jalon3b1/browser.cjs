const { chromium } = require(process.env.STAMP_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const out = process.env.STAMP_CAPTURE_DIR || __dirname;
require('node:fs').mkdirSync(out, {recursive: true});
const previewUrl = process.env.STAMP_PREVIEW_URL || 'http://127.0.0.1:5174';
const base = { archive: 0, statut: 'brouillon', collections: [], rubans: [], formats_disponibles: [], papier_spe: '', embellissement: '', prix_A_cents: 1800, prix_B_cents: 1400, prix_C_cents: 900 };
const catalogues = [
 { ...base, id: 1, titre: 'Automne à l’atelier', statut: 'publie', collections: [{id:1},{id:2}], rubans: [{id:1}], formats_disponibles: ['A','B','C'], papier_spe: 'Papier doré', embellissement: 'Feuilles cuivrées' },
 { ...base, id: 2, titre: 'Noël en préparation', collections: [{id:3}], formats_disponibles: ['C'], papier_spe: 'Vélin étoilé', prix_A_cents: 2000, prix_B_cents: 1600, prix_C_cents: 1000 },
 { ...base, id: 3, titre: 'Printemps tout en douceur', collections: [{id:4},{id:5},{id:6}], rubans: [{id:2},{id:3}], formats_disponibles: ['A','B','C'], embellissement: 'Fleurs en relief' },
 { ...base, id: 4, titre: 'Un brouillon à imaginer', prix_A_cents: null, prix_B_cents: null, prix_C_cents: null },
 { ...base, id: 5, titre: 'CatalogueAuNomTrèsLongSansEspacePourVérifierLesRetoursÀLaLigne', papier_spe: 'PapierSpécialAuNomTrèsLongSansEspace', embellissement: 'EmbellissementAuNomTrèsLongSansEspace', prix_A_cents: 10000, prix_B_cents: 0, prix_C_cents: 1234 },
 { ...base, id: 6, titre: 'Été des souvenirs', archive: 1, collections: [{id:7}], rubans: [{id:4}], formats_disponibles: ['C'] },
 ...['Petites attentions','Une touche de citron','La saison des cartes'].map((titre,i)=>({...base,id:i+7,titre,collections:[{id:i+8}],formats_disponibles:['C'],papier_spe:'Papier texturé'})),
];
for (const catalogue of catalogues) {
 catalogue.collections = catalogue.collections.map(collection=>({...collection, nom:`Collection ${collection.id}`, papiers:[{id:collection.id,nom:'Papier recette',archive:0}]}));
 catalogue.rubans = catalogue.rubans.map(ruban=>({...ruban,nom:`Ruban ${ruban.id}`}));
}
catalogues[4].collections = Array.from({length:4},(_,i)=>({id:30+i,nom:`Collection complète ${i+1}`,papiers:Array.from({length:5},(_,j)=>({id:30+i*5+j,nom:`Papier ${i+1}.${j+1} — NomTrèsLongSansEspacePourVérifierLeRetourÀLaLigne`,archive:i===0&&j===0?1:0}))}));
catalogues[4].rubans = [{id:30,nom:'Ruban de satin'},{id:31,nom:'RubanÀNomTrèsLongSansEspacePourVérifierLeRetourÀLaLigne'}];
let failDetail=false,slowDetail=false;
const fixtureClient={id:1,prenom:'Alice',nom:'Recette',archive:0,contacter:0,email:'alice@example.test',telephone_raw:'',points_fidelite:0,created_at:'2025-01-09'};
const fixtureCommande={id:501,type:'kit',client_id:1,client:fixtureClient,client_prenom:'Alice',client_nom:'Recette',created_at:'2026-10-09 12:30:00',catalogue_id:1,catalogue_titre:'Automne à l’atelier',format_type:'A',prix_applique_cents:1800,prix_format_cents:1800,prix_option_cents:0,reglee:0,methode_paiement:'Paypal',commande_collections:[],papiers_selectionnes:[],ruban:null};
let defaults = { prix_A_cents: 1800, prix_B_cents: 1400, prix_C_cents: 900 };
let holdList = true, releaseList, emptyList = false, failList = false, failSettings = false, failSave = false, holdSave = false, releaseSave, saves = 0;
const delay = ms => new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const browser = await chromium.launch({headless:true,executablePath:process.env.STAMP_CHROMIUM_EXECUTABLE});
 try {
 const page = await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',async route=>{
  const req=route.request(),url=new URL(req.url());
  const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(url.pathname==='/api/catalogues') {
   if(holdList) await new Promise(resolve=>releaseList=resolve);
   return json(failList?{error:'Liste indisponible'}:emptyList?[]:catalogues,failList?503:200);
  }
  if(url.pathname==='/api/settings') {
   if(req.method()==='PUT') {
    saves++; if(holdSave) await new Promise(resolve=>releaseSave=resolve);
    if(failSave) return json({error:'Tarifs refusés'},409);
    defaults=req.postDataJSON(); return json(defaults);
   }
   return json(failSettings?{error:'Paramètres indisponibles'}:defaults,failSettings?503:200);
  }
  if(/^\/api\/catalogues\/\d+$/.test(url.pathname)) {
   const id=Number(url.pathname.split('/').pop());if(slowDetail&&id===1)await delay(700);
   return json(failDetail?{error:'Détail indisponible'}:catalogues.find(c=>c.id===id),failDetail?503:200);
  }
  if(url.pathname==='/api/clients')return json([fixtureClient]);
  if(url.pathname==='/api/clients/1/commandes')return json([]);
  if(url.pathname==='/api/commandes')return json([fixtureCommande]);
  if(url.pathname==='/api/commandes/501')return json(fixtureCommande);
  if(url.pathname==='/api/papiers-cartonnes')return json([]);
  return json({error:`Route inattendue : ${req.method()} ${url.pathname}`},500);
 });
 const noOverflow=async()=>{
  await page.waitForFunction(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth);
  const overflowing=await page.locator('.catalogue-open, .catalogue-defaults, .slide-panel, .slide-panel-body').evaluateAll(nodes=>nodes.filter(e=>e.getBoundingClientRect().width>0&&e.scrollWidth>e.clientWidth+1).map(e=>e.textContent));
  assert.deepEqual(overflowing,[]);
 };
 const capture=async name=>{await page.locator('.slide-panel-overlay').evaluateAll(async elements=>{await Promise.all(elements.flatMap(element=>element.getAnimations({subtree:true})).map(animation=>animation.finished.catch(()=>{})));});await noOverflow();await page.screenshot({path:`${out}/${name}`,fullPage:!name.startsWith('detail')});};
 const tabs=page.locator('.catalogue-list-tabs');
 const filters=page.locator('#catalogue-filter-toggle');
 const search=page.locator('#catalogue-search');
 const toSettings=async()=>{await tabs.getByRole('link',{name:'Paramètres',exact:true}).click();await page.getByLabel('Format A',{exact:true}).waitFor();};
 const toList=async()=>{await tabs.getByRole('link',{name:'Catalogues',exact:true}).click();await page.locator('.catalogue-list').waitFor();};
 await page.goto(`${previewUrl}/catalogues`);
 await page.getByText('Chargement des catalogues…',{exact:true}).waitFor();assert.ok(releaseList);holdList=false;releaseList();
 await page.locator('.catalogue-list').waitFor();
 assert.equal(await page.locator('.catalogue-open').count(),8);
 assert.ok(!(await search.isVisible()));
 assert.equal(await page.locator('#catalogue-open-1').evaluate(element=>getComputedStyle(element).borderTopWidth),'0px');
 assert.equal(await page.locator('#catalogue-open-1').evaluate(element=>getComputedStyle(element).minHeight),'72px');
 await capture('liste-1280.png');
 await filters.focus();await page.keyboard.press('Enter');await search.waitFor();assert.ok(await search.evaluate(e=>e===document.activeElement));
 await search.fill('automne');assert.equal(await page.locator('.catalogue-open').count(),1);
 await filters.click();assert.ok(!(await search.isVisible()));assert.equal(await filters.getAttribute('aria-label'),'Recherche et filtres, automne');assert.equal(await page.locator('.filter-count').innerText(),'1');
 await filters.click();await search.fill('introuvable');await page.getByText('Aucun catalogue ne correspond',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Effacer les filtres',exact:true}).last().click();assert.ok(await search.evaluate(e=>e===document.activeElement));
 await page.locator('#catalogue-filter').selectOption('archives');assert.equal(await page.locator('.catalogue-open').count(),1);assert.equal(await page.locator('.catalogue-list-status').innerText(),'Archivé');
 await page.getByRole('button',{name:'Effacer les filtres',exact:true}).click();await capture('filtres-1280.png');await filters.click();
 await toSettings();await capture('parametres-1280.png');
 const a=page.getByLabel('Format A',{exact:true}),b=page.getByLabel('Format B',{exact:true}),c=page.getByLabel('Format C',{exact:true}),save=page.getByRole('button',{name:'Enregistrer les tarifs',exact:true});
 assert.ok(await save.isDisabled());await a.fill('27,25');await toList();await toSettings();assert.equal(await a.inputValue(),'27,25');
 for(const invalid of ['','-1','100.01','1.234']) {await a.fill(invalid);await save.click();assert.equal(saves,0);assert.equal(await a.getAttribute('aria-invalid'),'true');assert.ok(await a.evaluate(e=>e===document.activeElement));}
 await a.fill('27,25');await b.fill('0');await c.fill('12.34');failSave=true;await save.click();await page.getByText('Tarifs refusés',{exact:true}).waitFor();assert.equal(await a.inputValue(),'27,25');assert.deepEqual(defaults,{prix_A_cents:1800,prix_B_cents:1400,prix_C_cents:900});await capture('parametres-erreur-1280.png');
 failSave=false;holdSave=true;const before=saves;await save.click();await page.waitForFunction(()=>document.querySelector('.catalogue-prices input').disabled);assert.ok(await save.isDisabled());assert.ok(releaseSave);await toList();holdSave=false;releaseSave();await delay(100);await toSettings();await page.getByText('Tarifs enregistrés.',{exact:true}).waitFor();assert.equal(saves,before+1);assert.deepEqual(defaults,{prix_A_cents:2725,prix_B_cents:0,prix_C_cents:1234});assert.ok(await save.isDisabled());
 await toList();
 assert.equal(await page.locator('.catalogue-list').getByText('Papier doré',{exact:true}).count(),0);
 assert.equal(await page.locator('.catalogue-list').getByText('18,00 €',{exact:true}).count(),0);
 slowDetail=true;await page.locator('#catalogue-open-1').click();await page.locator('#catalogue-open-2').click();await page.getByRole('region',{name:'Catalogue : Noël en préparation',exact:true}).getByText('Vélin étoilé',{exact:true}).waitFor();await delay(800);assert.equal(await page.locator('.slide-panel').getByText('Papier doré',{exact:true}).count(),0);slowDetail=false;
 await page.locator('.slide-panel-close').click();await page.locator('#catalogue-open-2:focus').waitFor();
 failDetail=true;await page.locator('#catalogue-open-1').click();await page.getByText('Détail indisponible',{exact:true}).waitFor();assert.equal(await page.locator('.catalogue-open').count(),8);failDetail=false;await page.getByRole('button',{name:'Réessayer',exact:true}).click();await page.locator('.catalogue-detail-prices').waitFor();
 assert.equal(await page.locator('.catalogue-detail-prices dd').first().innerText(),'18,00 €');
 for(const text of ['Papier doré','Feuilles cuivrées','Collection 1','Papier recette','Ruban 1'])assert.ok(await page.locator('.slide-panel').getByText(text,{exact:true}).first().isVisible(),text);
 const listBox=await page.locator('.catalogue-list-panel').boundingBox(),detailBox=await page.locator('.slide-panel').boundingBox();assert.ok(detailBox.x>listBox.x+listBox.width);
 assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
 assert.equal(await page.locator('.slide-panel-close').evaluate(element=>getComputedStyle(element).borderTopWidth),'0px');
 await capture('detail-1280.png');await page.locator('.slide-panel-body').evaluate(element=>element.scrollTop=element.scrollHeight);await capture('detail-composition-1280.png');await page.locator('.slide-panel-body').evaluate(element=>element.scrollTop=0);
 await page.locator('#catalogue-open-2').hover();assert.equal(await page.locator('#catalogue-open-2').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(240, 231, 237)');assert.equal(await page.locator('#catalogue-open-1').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(230, 214, 225)');
 await filters.click();await search.fill('Noël');await page.locator('.slide-panel').waitFor({state:'hidden'});await page.locator('#catalogue-search:focus').waitFor();await search.fill('');await filters.click();
 await page.locator('#catalogue-open-4').focus();await page.keyboard.press('Enter');await page.getByText('Aucune collection pour le moment.',{exact:true}).waitFor();assert.equal(await page.locator('.catalogue-detail-prices dd').first().innerText(),'À définir');await page.locator('.slide-panel-close').focus();await page.keyboard.press('Escape');await page.locator('#catalogue-open-4:focus').waitFor();
 await page.locator('#catalogue-open-1').click();await page.locator('.catalogue-prepare').click();await page.waitForURL(url=>url.pathname==='/catalogues/1');await page.goto(`${previewUrl}/catalogues?onglet=parametres`);await a.waitFor();assert.equal(await a.inputValue(),'27,25');assert.equal(await tabs.getByRole('link',{name:'Paramètres'}).getAttribute('aria-current'),'page');await toList();
 for(const [width,height] of [[1024,768],[375,800],[800,375]]) {
  await page.setViewportSize({width,height});await capture(`liste-${width}.png`);
  await filters.click();await capture(`filtres-${width}.png`);await filters.click();
  await toSettings();await capture(`parametres-${width}.png`);await toList();
  await page.locator('#catalogue-open-5').click();await page.locator('.catalogue-detail-content').waitFor();await noOverflow();
  assert.equal(await page.locator('.slide-panel').getAttribute('role'),width>900?'region':'dialog');
  assert.equal(await page.locator('.catalogue-detail-prices dd').nth(1).innerText(),'0,00 €');
  assert.equal(await page.locator('.catalogue-detail-collections > li').count(),4);assert.equal(await page.locator('.catalogue-detail-collections > li > ul > li').count(),20);
  await capture(`detail-${width}.png`);
  if(width<=900){assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');await page.locator('.catalogue-prepare').focus();await page.keyboard.press('Tab');assert.ok(await page.locator('.slide-panel-close').evaluate(e=>e===document.activeElement));}
  await page.locator('.slide-panel-close').focus();await page.keyboard.press('Escape');await page.locator('.slide-panel').waitFor({state:'hidden'});await page.locator('#catalogue-open-5:focus').waitFor();assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
 }
 await page.setViewportSize({width:1280,height:800});
 await filters.click();await page.locator('#catalogue-filter').selectOption('archives');await page.locator('#catalogue-open-6').click();await page.locator('.catalogue-detail-note').waitFor();assert.equal(await page.locator('.catalogue-prepare').innerText(),'Consulter ou restaurer');await toSettings();await page.locator('.slide-panel').waitFor({state:'hidden'});await toList();await page.getByRole('button',{name:'Effacer les filtres',exact:true}).click();await filters.click();
 for(const [path,list,item,id] of [['/clients','.clients-list','.client-list-item','#client-open-1'],['/commandes/kits','.commandes-list','.commande-open','#commande-open-501']]){
  await page.goto(`${previewUrl}${path}`);await page.locator(list).waitFor();await page.locator(item).first().hover();assert.equal(await page.locator(item).first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(240, 231, 237)');await page.locator(id).click();assert.equal(await page.locator(item).first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(230, 214, 225)');
 }
 await page.goto(`${previewUrl}/catalogues`);failList=true;await page.reload();await page.getByText('Liste indisponible',{exact:true}).waitFor();failList=false;await page.getByRole('button',{name:'Réessayer',exact:true}).click();await page.locator('.catalogue-list').waitFor();
 failSettings=true;await page.goto(`${previewUrl}/catalogues?onglet=parametres`);await page.getByText('Paramètres indisponibles',{exact:true}).waitFor();failSettings=false;await page.getByRole('button',{name:'Réessayer',exact:true}).click();await a.waitFor();
 await toList();emptyList=true;await page.reload();await page.getByText('Ton premier catalogue commence ici',{exact:true}).waitFor();await filters.click();await page.locator('#catalogue-filter').selectOption('archives');await page.getByText('Aucun catalogue archivé',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Créer un catalogue',exact:true}).count(),0);
 await page.getByRole('button',{name:'Nouveau catalogue',exact:true}).click();await page.waitForURL(url=>url.pathname==='/catalogues/nouveau');
 assert.deepEqual(errors,[]);
 console.log('OK : fiches allégées, détail à droite complet/modal étroit, requêtes tardives/refus/reprise, focus après fermeture/filtrage, sélection et survol prune Catalogues/Clientes/Commandes, routes/navigations clavier, filtres/recherche/archives/reset/focus, Paramètres persistants entre onglets, tarifs zéro/virgule/point/plafond/invalides/refus/reprise/verrouillage, prix locaux conservés, reprise des erreurs liste/paramètres ; captures 1280/1024/375/800 sans débordement.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
