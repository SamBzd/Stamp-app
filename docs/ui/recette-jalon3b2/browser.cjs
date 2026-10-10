const {chromium} = require(process.env.STAMP_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = process.env.STAMP_CAPTURE_DIR || __dirname;
fs.mkdirSync(out, {recursive:true});
const preview = process.env.STAMP_PREVIEW_URL || 'http://127.0.0.1:5174';
const delay = ms => new Promise(resolve => setTimeout(resolve,ms));
const base = {archive:0,statut:'brouillon',formats_disponibles:[],papier_spe:'',embellissement:'',prix_A_cents:1800,prix_B_cents:1400,prix_C_cents:900,collections:[],rubans:[]};
const catalogues = [{...base,id:1,titre:'Automne à l’atelier',papier_spe:'Papier doré',statut:'publie',formats_disponibles:['A','B','C'],collections:[{id:11,nom:'Feuilles cuivrées',papiers:[{id:21,nom:'Papier cuivre',archive:0}]},{id:12,nom:'Les couleurs de saison',papiers:[{id:22,nom:'Papier crème',archive:0}]}],rubans:[{id:31,ordre:1,nom:'Satin doré'}]}, {...base,id:2,titre:'Noël en préparation'}, {...base,id:3,titre:'CatalogueAuNomTrèsLongSansEspacePourVérifierLeRepli',archive:1}];
const papers = [{id:21,nom:'Papier cuivre',archive:0},{id:22,nom:'Papier crème',archive:0},{id:23,nom:'Papier étoilé',archive:0}];
let failSave=false,failCreate=false,holdSave=false,releaseSave,holdPaper=false,releasePaper,posts=0;
let acceptDialog=false,dialogs=0;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.STAMP_CHROMIUM_EXECUTABLE});
 try {
  const p=await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[]; p.on('pageerror', e=>errors.push(e.message));
  p.on('dialog', async dialog=>{dialogs++; if(acceptDialog)await dialog.accept();else await dialog.dismiss();});
  await p.route('**/api/**',async r=>{
   const u=new URL(r.request().url()), method=r.request().method();
   const json=(value,status=200)=>r.fulfill({json:value,status});
   const body=()=>r.request().postDataJSON();
   if(u.pathname==='/api/settings') return json({prix_A_cents:1800,prix_B_cents:1400,prix_C_cents:900});
   if(u.pathname==='/api/catalogues'&&method==='GET')return json(catalogues);
   if(u.pathname==='/api/catalogues'&&method==='POST'){
    posts++;assert.deepEqual(Object.keys(body()).sort(),['embellissement','papier_spe','titre']);
    if(failCreate)return json({error:'Création refusée'},409);
    const c={...base,...body(),id:4};catalogues.push(c);return json(c,201);
   }
   const cMatch=u.pathname.match(/^\/api\/catalogues\/(\d+)(?:\/(publication|archivage|collections|rubans))?$/);
   if(cMatch){
    const c=catalogues.find(c=>c.id===Number(cMatch[1])),action=cMatch[2];
    if(method==='GET')return json(c);
    if(holdSave)await new Promise(resolve=>{releaseSave=resolve;});
    if(failSave)return json({error:'Enregistrement refusé'},409);
    if(action==='publication'){c.statut='publie';c.formats_disponibles=c.collections.length>1?['A','B','C']:['C'];}
    else if(action==='archivage'){c.archive=Number(body().archive);if(!c.archive)c.statut='brouillon';}
    else if(action==='collections'){c.collections.push({id:40+c.collections.length,nom:body().nom,papiers:[]});c.statut='brouillon';}
    else if(action==='rubans')c.rubans.push({id:50+c.rubans.length,nom:body().nom,ordre:c.rubans.length+1});
    else Object.assign(c,body());
    return json(c);
   }
   const collection=u.pathname.match(/^\/api\/catalogues\/collections\/(\d+)(\/papiers)?$/);
   if(collection){const c=catalogues.find(c=>c.collections.some(item=>item.id===Number(collection[1]))),item=c.collections.find(item=>item.id===Number(collection[1]));
    if(failSave)return json({error:'Enregistrement refusé'},409);
    if(collection[2]){item.papiers=body().papier_ids.map(id=>papers.find(p=>p.id===id));if(!item.papiers.length)c.statut='brouillon';}
    else item.nom=body().nom;return json(c);
   }
   const ribbon=u.pathname.match(/^\/api\/catalogues\/rubans\/(\d+)$/);
   if(ribbon){const c=catalogues.find(c=>c.rubans.some(item=>item.id===Number(ribbon[1])));c.rubans.find(item=>item.id===Number(ribbon[1])).nom=body().nom;return json(c);}
   if(u.pathname==='/api/papiers-cartonnes'){
    if(method==='GET')return json(papers.filter(item=>item.nom.toLowerCase().includes((u.searchParams.get('search')||'').toLowerCase())));
    if(holdPaper)await new Promise(resolve=>{releasePaper=resolve;});
    const paper={id:24,nom:body().nom,archive:0};papers.push(paper);return json(paper,201);
   }
   return json([]);
  });
  const capture=async name=>{await p.mouse.move(0,0);await p.screenshot({path:`${out}/${name}.png`,animations:'disabled',fullPage:true});};
  const ratio=async expected=>{await p.waitForFunction(e=>{const a=document.querySelector('.catalogue-list-panel').getBoundingClientRect().width,b=document.querySelector('.catalogue-editor-slot, .catalogue-detail-slot').getBoundingClientRect().width;return Math.abs(a/(a+b)-e)<.015;},expected);};
  await p.goto(`${preview}/catalogues`);await p.locator('#catalogue-open-1').waitFor();await p.locator('#catalogue-open-1').click();await p.getByRole('link',{name:'Ouvrir la préparation'}).waitFor();await ratio(2/3);await capture('consultation-1280');
  await p.getByRole('link',{name:'Ouvrir la préparation'}).click();await p.locator('#catalogue-title').waitFor();await ratio(1/4);
  assert.equal(await p.locator('h1').innerText(),'Catalogues');assert.equal(await p.locator('.slide-panel').count(),0);assert.ok(await p.locator('#catalogue-open-2').isVisible());await capture('preparation-1280');
  await p.locator('#catalogue-title').fill('Automne modifié');
  await p.locator('#catalogue-open-2').click();await delay(150);assert.equal(new URL(p.url()).pathname,'/catalogues/1');assert.equal(await p.locator('#catalogue-title').inputValue(),'Automne modifié');assert.equal(dialogs,1);
  failSave=true;await p.getByRole('button',{name:'Enregistrer les informations',exact:true}).click();await p.getByText('Enregistrement refusé',{exact:true}).waitFor();assert.equal(await p.locator('#catalogue-title').inputValue(),'Automne modifié');failSave=false;
  holdSave=true;await p.getByRole('button',{name:'Enregistrer les informations',exact:true}).click();await p.waitForFunction(()=>document.querySelector('#catalogue-open-2').disabled);await p.locator('.catalogue-list-tabs').getByRole('link',{name:'Paramètres',exact:true}).click();assert.equal(new URL(p.url()).pathname,'/catalogues/1');holdSave=false;releaseSave();await p.getByText('Informations enregistrées.',{exact:true}).waitFor();assert.equal(catalogues[0].titre,'Automne modifié');
  const collection=p.locator('.catalogue-collection').first();
  await collection.getByRole('button',{name:'Choisir les papiers',exact:true}).click();await collection.getByLabel('Bibliothèque de papiers').fill('étoilé');await collection.getByRole('button',{name:'Ajouter Papier étoilé',exact:true}).click();assert.equal(await collection.getByLabel('Bibliothèque de papiers').inputValue(),'');
  await collection.getByLabel('Bibliothèque de papiers').fill('Nouveau papier');await collection.getByRole('button',{name:'Créer « Nouveau papier » dans la bibliothèque',exact:true}).waitFor();holdPaper=true;await collection.getByRole('button',{name:'Créer « Nouveau papier » dans la bibliothèque',exact:true}).click();await p.waitForFunction(()=>document.querySelector('#catalogue-open-2').disabled);holdPaper=false;releasePaper();await collection.getByRole('button',{name:'Retirer Nouveau papier de la sélection'}).waitFor();await capture('papiers-1280');
  await collection.getByRole('button',{name:'Enregistrer les papiers',exact:true}).click();await collection.getByRole('button',{name:'Choisir les papiers',exact:true}).waitFor();assert.equal(catalogues[0].collections[0].papiers.length,3);
  await p.locator('#new-collection').fill('Une autre collection');await p.getByRole('button',{name:'Ajouter une collection',exact:true}).click();await p.getByLabel('Nom de la collection').nth(2).waitFor();assert.equal(catalogues[0].collections.length,3);await p.getByText('Le catalogue est revenu en brouillon. Complétez sa composition puis publiez-le à nouveau.',{exact:true}).waitFor();assert.ok(await p.getByRole('button',{name:'Publier le catalogue',exact:true}).isDisabled());
  const third=p.locator('.catalogue-collection').nth(2);await third.getByRole('button',{name:'Choisir les papiers',exact:true}).click();await third.getByLabel('Bibliothèque de papiers').fill('crème');await third.getByRole('button',{name:'Ajouter Papier crème',exact:true}).click();await third.getByRole('button',{name:'Enregistrer les papiers',exact:true}).click();await third.getByRole('button',{name:'Choisir les papiers',exact:true}).waitFor();await p.getByRole('button',{name:'Publier le catalogue',exact:true}).click();await p.getByText('Catalogue publié.',{exact:true}).waitFor();assert.equal(catalogues[0].statut,'publie');
  const price=p.locator('.catalogue-editor .catalogue-prices').getByLabel('Format A',{exact:true});await price.fill('0');await p.getByRole('button',{name:'Enregistrer les tarifs',exact:true}).click();await p.getByText('Tarifs enregistrés.',{exact:true}).waitFor();assert.equal(catalogues[0].prix_A_cents,0);
  await p.locator('#catalogue-open-2').click();await p.locator('.catalogue-editor').waitFor({state:'hidden'});await p.getByRole('link',{name:'Ouvrir la préparation'}).waitFor();await ratio(2/3);assert.equal(await p.locator('#catalogue-open-2').getAttribute('aria-pressed'),'true');
  await p.getByRole('button',{name:'Nouveau catalogue',exact:true}).click();await p.locator('#catalogue-title').waitFor();await ratio(1/4);await capture('creation-1280');await p.locator('#catalogue-title').fill('Nouveau brouillon');failCreate=true;await p.getByRole('button',{name:'Créer le brouillon',exact:true}).click();await p.getByText('Création refusée',{exact:true}).waitFor();assert.equal(await p.locator('#catalogue-title').inputValue(),'Nouveau brouillon');failCreate=false;
  await p.getByRole('button',{name:'Créer le brouillon',exact:true}).click();await p.waitForURL(`${preview}/catalogues/4`);await p.getByRole('button',{name:'Ajouter une collection',exact:true}).waitFor();assert.equal(posts,2);assert.equal(catalogues[3].statut,'brouillon');await ratio(1/4);
  await p.locator('#catalogue-title').fill('Saisie à quitter');acceptDialog=true;await p.locator('#catalogue-open-2').click();await p.getByRole('link',{name:'Ouvrir la préparation'}).waitFor();acceptDialog=false;assert.equal(dialogs,2);await ratio(2/3);
  await p.goto(`${preview}/catalogues/3`);await p.locator('#catalogue-title').waitFor();assert.ok(await p.locator('#catalogue-title').isDisabled());await p.getByRole('button',{name:'Restaurer le catalogue',exact:true}).click();await p.getByRole('dialog',{name:'Restaurer le catalogue',exact:true}).getByRole('button',{name:'Restaurer',exact:true}).click();await p.locator('.modal-overlay').waitFor({state:'hidden'});assert.equal(catalogues[2].archive,0);assert.equal(catalogues[2].statut,'brouillon');
  await p.goto(`${preview}/catalogues/1`);await p.locator('#catalogue-title').waitFor();assert.equal(await p.locator('#catalogue-title').inputValue(),'Automne modifié');
  for(const [width,height] of [[1024,768],[375,800],[800,375]]){
   await p.setViewportSize({width,height});await p.waitForFunction(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth);await capture(`preparation-${width}`);
   assert.ok(await p.locator('.catalogue-editor').evaluate(e=>e.scrollWidth<=e.clientWidth));assert.equal(await p.evaluate(()=>document.body.style.overflow),'');
   if(width>900)await ratio(1/4);await p.locator('#catalogue-open-2').click();await p.getByRole(width>900?'region':'dialog',{name:'Catalogue : Noël en préparation',exact:true}).waitFor();assert.equal(await p.locator('.catalogue-editor').count(),0);
   await p.getByRole('link',{name:'Ouvrir la préparation'}).click();await p.locator('#catalogue-title').waitFor();await p.getByRole('button',{name:'Nouveau catalogue',exact:true}).click();await p.locator('#catalogue-title').waitFor();assert.equal(await p.locator('#catalogue-title').inputValue(),'');await capture(`creation-${width}`);
   await p.goto(`${preview}/catalogues/1`);await p.locator('#catalogue-title').waitFor();
  }
  await p.emulateMedia({reducedMotion:'reduce'});assert.ok(parseFloat(await p.locator('.catalogue-browse').evaluate(e=>getComputedStyle(e).transitionDuration))<.001);assert.equal(await p.locator('.catalogue-editor-slot').evaluate(e=>getComputedStyle(e).animationName),'none');
  await p.locator('#catalogue-title').fill('Retour navigateur protégé');const backDialog=p.waitForEvent('dialog');await p.evaluate(()=>history.back());await backDialog;await delay(100);assert.equal(new URL(p.url()).pathname,'/catalogues/1');assert.equal(await p.locator('#catalogue-title').inputValue(),'Retour navigateur protégé');
  assert.deepEqual(errors,[]);console.log('OK : même workspace, ratios 1/4–3/4 et 2/3–1/3, création/refus/reprise, mutation verrouillée, sélection/dirty/confirmation/retour, papiers/recherche/création/sauvegarde, collections/tarifs, liens directs, 1280/1024/375/800 sans débordement, mouvement réduit.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
