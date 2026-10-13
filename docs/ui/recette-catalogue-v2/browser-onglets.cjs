const {chromium} = require(process.env.STAMP_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = process.env.STAMP_CAPTURE_DIR || __dirname;
fs.mkdirSync(out, {recursive:true});
const preview = process.env.STAMP_PREVIEW_URL || 'http://127.0.0.1:5176';
const delay = ms => new Promise(resolve => setTimeout(resolve,ms));
const base = {archive:0,statut:'brouillon',formats_disponibles:[],papier_spe:'',embellissement:'',prix_A_cents:1800,prix_B_cents:1400,prix_C_cents:900,collections:[],rubans:[]};
const catalogues = [{...structuredClone(base),id:1,titre:'Automne à l’atelier',papier_spe:'Papier doré',statut:'publie',formats_disponibles:['A','B','C'],collections:[{id:11,nom:'Feuilles cuivrées',papiers:[{id:21,nom:'Papier cuivre',archive:0}]},{id:12,nom:'Les couleurs de saison',papiers:[{id:22,nom:'Papier crème',archive:0}]}],rubans:[{id:31,ordre:1,nom:'Satin doré'}]}, {...structuredClone(base),id:2,titre:'Noël en préparation'}, {...structuredClone(base),id:3,titre:'CatalogueAuNomTrèsLongSansEspacePourVérifierLeRepli',archive:1}];
const papers = [{id:21,nom:'Papier cuivre',archive:0},{id:22,nom:'Papier crème',archive:0},{id:23,nom:'Papier étoilé',archive:0}];
let failSave=false,failCreate=false,holdSave=false,releaseSave,holdPaper=false,releasePaper,posts=0;
let rejectedRenameRequests=0;
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
    const c={...structuredClone(base),...body(),id:4};catalogues.push(c);return json(c,201);
   }
   const cMatch=u.pathname.match(/^\/api\/catalogues\/(\d+)(?:\/(publication|archivage|collections|rubans))?$/);
   if(cMatch){
    const c=catalogues.find(c=>c.id===Number(cMatch[1])),action=cMatch[2];
    if(method==='GET')return json(c);
    if(holdSave)await new Promise(resolve=>{releaseSave=resolve;});
    if(failSave){if(['Nom refusé','Ruban refusé'].includes(body().nom))rejectedRenameRequests++;return json({error:'Enregistrement refusé'},409);}
    if(action==='publication'){c.statut='publie';c.formats_disponibles=c.collections.length>1?['A','B','C']:['C'];}
    else if(action==='archivage'){c.archive=Number(body().archive);if(!c.archive)c.statut='brouillon';}
    else if(action==='collections'){c.collections.push({id:40+c.collections.length,nom:body().nom,papiers:[]});c.statut='brouillon';}
    else if(action==='rubans')c.rubans.push({id:50+c.rubans.length,nom:body().nom,ordre:c.rubans.length+1});
    else Object.assign(c,body());
    return json(c);
   }
   const collection=u.pathname.match(/^\/api\/catalogues\/collections\/(\d+)(\/papiers)?$/);
   if(collection){if(!collection[2])await delay(100);const c=catalogues.find(c=>c.collections.some(item=>item.id===Number(collection[1]))),item=c.collections.find(item=>item.id===Number(collection[1]));
    if(failSave){if(['Nom refusé','Ruban refusé'].includes(body().nom))rejectedRenameRequests++;return json({error:'Enregistrement refusé'},409);}
    if(collection[2]){item.papiers=body().papier_ids.map(id=>papers.find(p=>p.id===id));if(!item.papiers.length)c.statut='brouillon';}
    else item.nom=body().nom;return json(c);
   }
   const ribbon=u.pathname.match(/^\/api\/catalogues\/rubans\/(\d+)$/);
   if(ribbon){await delay(100);if(failSave){if(['Nom refusé','Ruban refusé'].includes(body().nom))rejectedRenameRequests++;return json({error:'Enregistrement refusé'},409);}const c=catalogues.find(c=>c.rubans.some(item=>item.id===Number(ribbon[1])));c.rubans.find(item=>item.id===Number(ribbon[1])).nom=body().nom;return json(c);}
   if(u.pathname==='/api/papiers-cartonnes'){
    if(method==='GET')return json(papers.filter(item=>item.nom.toLowerCase().includes((u.searchParams.get('search')||'').toLowerCase())));
    if(holdPaper)await new Promise(resolve=>{releasePaper=resolve;});
    const paper={id:24,nom:body().nom,archive:0};papers.push(paper);return json(paper,201);
   }
   return json([]);
  });
  const capture=async name=>{await p.mouse.move(0,0);await p.screenshot({path:`${out}/${name}.png`,animations:'disabled',fullPage:true});};
  const ratio=async expected=>{await p.waitForFunction(e=>{const a=document.querySelector('.catalogue-list-panel').getBoundingClientRect().width,b=document.querySelector('.catalogue-editor-slot, .catalogue-detail-slot').getBoundingClientRect().width;return Math.abs(a/(a+b)-e)<.015;},expected);};


  const step=async index=>{await p.locator('.catalogue-timeline button').nth(index).click();await p.locator(`#catalogue-step-${index}`).waitFor({state:'visible'});};
  const panel=()=>p.locator('.catalogue-collection:visible');
  const cards=()=>panel().locator('.catalogue-paper-card');
  const tab=async name=>{await p.locator('.catalogue-collection-tabs button').filter({hasText:name}).click();assert.equal(await p.locator('.catalogue-collection:visible').count(),1);};
  const editName=async value=>{await panel().locator('.collection-name-title').click();await p.getByRole('textbox',{name:'Nom de la collection',exact:true}).fill(value);};
  const addPaper=async(slot,query,name)=>{await cards().nth(slot).click();await p.getByRole('searchbox',{name:'Bibliothèque de papiers'}).fill(query);await p.getByRole('button',{name:`Ajouter ${name}`,exact:true}).click();await p.getByRole('searchbox',{name:'Bibliothèque de papiers'}).waitFor({state:'hidden'});};
  const addCollection=async name=>{if(!await p.locator('#new-collection').isVisible())await p.getByRole('button',{name:'Nouvelle collection',exact:true}).click();await p.locator('#new-collection').fill(name);await p.getByRole('button',{name:'Ajouter une collection',exact:true}).click();await p.locator('.catalogue-collection-tabs button').filter({hasText:name}).waitFor();};
  await p.goto(`${preview}/catalogues/nouveau`);await p.locator('#catalogue-title').waitFor();await ratio(1/3);
  await p.locator('#catalogue-title').fill('Printemps visuel');
  await p.getByRole('button',{name:'Créer le brouillon',exact:true}).click();
  await p.locator('#new-collection').waitFor();assert.equal(new URL(p.url()).pathname,'/catalogues/4');
  await addCollection('Nature');assert.equal(await cards().count(),5);assert.equal(await p.getByRole('textbox',{name:'Nom de la collection',exact:true}).count(),0);
  await addPaper(0,'cuivre','Papier cuivre');await addPaper(1,'crème','Papier crème');
  await addCollection('Fleurs');assert.equal(await p.locator('.catalogue-collection:visible').count(),1);
  await addPaper(0,'étoilé','Papier étoilé');
  await tab('Nature');assert.match(await cards().nth(0).innerText(),/cuivre/);assert.match(await cards().nth(1).innerText(),/crème/);
  assert.match(await p.locator('#collection-tab-40').innerText(),/2\/5/);
  // In-progress search and selection survive both collection and main-stage navigation.
  await cards().nth(2).click();await p.getByRole('searchbox',{name:'Bibliothèque de papiers'}).fill('étoilé');
  await tab('Fleurs');await tab('Nature');assert.equal(await p.getByRole('searchbox',{name:'Bibliothèque de papiers'}).inputValue(),'étoilé');
  await step(2);await step(1);assert.equal(await p.getByRole('searchbox',{name:'Bibliothèque de papiers'}).inputValue(),'étoilé');
  await p.getByRole('button',{name:'Ajouter Papier étoilé',exact:true}).click();
  failSave=true;await p.getByRole('button',{name:'Enregistrer les papiers',exact:true}).click();await p.getByRole('alert').filter({hasText:'Enregistrement refusé'}).waitFor();
  assert.match(await cards().nth(2).innerText(),/étoilé/);assert.equal(catalogues.at(-1).collections[0].papiers.length,0);
  failSave=false;await p.getByRole('button',{name:'Enregistrer les papiers',exact:true}).click();await p.getByRole('status').filter({hasText:'Papiers enregistrés'}).waitFor();
  assert.equal(catalogues.at(-1).collections[0].papiers.length,3);
  // Names appear as titles; edit is temporary, and Tab/Enter keep usable focus.
  await editName('Nature dorée');await p.getByRole('textbox',{name:'Nom de la collection',exact:true}).press('Enter');
  await p.getByRole('status').filter({hasText:'Collection renommée'}).waitFor();await p.waitForFunction(()=>document.activeElement.id.endsWith('-name-button'));
  assert.equal(catalogues.at(-1).collections[0].nom,'Nature dorée');
  await editName('Nature cuivrée');await p.getByRole('textbox',{name:'Nom de la collection',exact:true}).press('Tab');
  await p.getByRole('status').filter({hasText:'Collection renommée'}).waitFor();await p.waitForFunction(()=>document.activeElement.id.endsWith('-paper-0'));
  failSave=true;await editName('Nom refusé');await p.getByRole('textbox',{name:'Nom de la collection',exact:true}).press('Enter');await p.getByRole('alert').filter({hasText:'Enregistrement refusé'}).waitFor();await delay(350);assert.equal(rejectedRenameRequests,1);
  assert.equal(await p.getByRole('textbox',{name:'Nom de la collection',exact:true}).inputValue(),'Nom refusé');
  failSave=false;await p.getByRole('textbox',{name:'Nom de la collection',exact:true}).fill('Nature');await p.getByRole('textbox',{name:'Nom de la collection',exact:true}).press('Enter');await p.getByRole('status').filter({hasText:'Collection renommée'}).waitFor();
  // Fill five positions, then replace a paper at the ceiling.
  papers.push({id:25,nom:'Papier vert',archive:0},{id:26,nom:'Papier bleu',archive:0},{id:27,nom:'Papier rose',archive:0});
  await addPaper(3,'vert','Papier vert');await addPaper(4,'bleu','Papier bleu');
  assert.equal(await cards().count(),5);assert.match(await p.locator('#collection-tab-40').innerText(),/5\/5/);
  await addPaper(4,'rose','Papier rose');assert.match(await cards().nth(4).innerText(),/rose/);
  await cards().nth(0).click();await p.getByRole('button',{name:'Retirer ce papier',exact:true}).click();assert.match(await p.locator('#collection-tab-40').innerText(),/4\/5/);
  await p.getByRole('button',{name:'Annuler',exact:true}).click();assert.match(await p.locator('#collection-tab-40').innerText(),/3\/5/);
  // Creating a library paper blocks tab/stage navigation and returns focus to its card.
  await cards().nth(3).click();await p.getByRole('searchbox',{name:'Bibliothèque de papiers'}).fill('Papier fleuri');
  const create=p.getByRole('button',{name:'Créer « Papier fleuri » dans la bibliothèque',exact:true});await create.waitFor();await p.waitForFunction(()=>!document.querySelector('.catalogue-collection:not([style*="display: none"]) .catalogue-search-results button')?.disabled);
  holdPaper=true;await create.click();while(!releasePaper)await delay(10);
  assert.ok(await p.locator('#collection-tab-41').isDisabled());assert.ok(await p.getByRole('button',{name:'Suivant',exact:true}).isDisabled());releasePaper();holdPaper=false;
  await p.waitForFunction(()=>!document.querySelector('#collection-tab-40').disabled);await p.waitForFunction(()=>document.activeElement.id.endsWith('-paper-3'));
  assert.match(await cards().nth(3).innerText(),/fleuri/);
  await p.getByRole('button',{name:'Enregistrer les papiers',exact:true}).click();await p.getByRole('status').filter({hasText:'Papiers enregistrés'}).waitFor();
  await tab('Fleurs');await p.getByRole('button',{name:'Enregistrer les papiers',exact:true}).click();await p.getByRole('status').filter({hasText:'Papiers enregistrés'}).waitFor();
  await addCollection('Troisième');await addCollection('Quatrième');assert.equal(await p.getByRole('button',{name:'Nouvelle collection',exact:true}).count(),0);assert.equal(await p.locator('#new-collection').count(),0);
  await step(3);await p.getByRole('button',{name:'Ajouter un papier à « Troisième »',exact:true}).click();assert.equal(await p.locator('#collection-tab-42').getAttribute('aria-pressed'),'true');
  for(const [width,height] of [[1280,800],[1024,768],[375,800],[800,375]]){
   await p.setViewportSize({width,height});await delay(300);if(width>900)await ratio(1/3);
   for(const name of ['Nature','Fleurs','Troisième','Quatrième']){await tab(name);assert.equal(await cards().count(),5);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));}
   await tab('Nature');await capture(`onglets-${width}`);
  }
  await p.setViewportSize({width:1280,height:800});await tab('Fleurs');await cards().nth(1).click();await p.getByRole('searchbox',{name:'Bibliothèque de papiers'}).fill('crème');await p.getByRole('button',{name:'Ajouter Papier crème',exact:true}).click();await tab('Nature');await p.locator('.catalogue-editor-close').click();assert.equal(dialogs,1);assert.equal(new URL(p.url()).pathname,'/catalogues/4');
  acceptDialog=true;await p.goto(`${preview}/catalogues/3`);await p.locator('#catalogue-title').waitFor();await step(1);assert.equal(await p.locator('.collection-name-title:visible').count(),0);assert.equal(await p.getByRole('button',{name:'Nouvelle collection',exact:true}).count(),0);
  await p.goto(`${preview}/catalogues/1`);await p.locator('#catalogue-title').waitFor();await step(1);await cards().nth(0).click();await p.getByRole('searchbox',{name:'Bibliothèque de papiers'}).fill('Papier cuivre');await p.getByRole('button',{name:'Garder ce papier',exact:true}).waitFor();assert.equal(await p.getByText('« Papier cuivre » est déjà sélectionné.',{exact:true}).count(),0);await p.getByRole('button',{name:'Garder ce papier',exact:true}).click();assert.doesNotMatch(await p.locator('#collection-tab-11').innerText(),/À enregistrer/);assert.equal(await p.getByRole('button',{name:'Enregistrer les papiers',exact:true}).count(),0);await p.locator('.catalogue-editor-close').click();assert.equal(dialogs,2);await p.goto(`${preview}/catalogues/1`);await p.locator('#catalogue-title').waitFor();await step(1);await cards().nth(0).click();await p.getByRole('button',{name:'Retirer ce papier',exact:true}).click();await p.getByRole('button',{name:'Enregistrer les papiers',exact:true}).click();await p.getByRole('status').filter({hasText:'revenu en brouillon'}).waitFor();await step(3);assert.ok(await p.getByRole('button',{name:'Publier le catalogue',exact:true}).isDisabled());
  assert.deepEqual(errors,[]);console.log('Recette onglets réussie : titre, onglets, cartes, saisies conservées, plafond/remplacement/retrait, création papier, erreurs, focus, archives, garde et démotion, quatre tailles.');
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
