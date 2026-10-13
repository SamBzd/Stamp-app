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

  const step = async index => {
    await p.locator('.catalogue-timeline button').nth(index).click();
    await p.locator(`#catalogue-step-${index}`).waitFor({state:'visible'});
    assert.equal(await p.locator('.catalogue-editor-body > section:visible').count(), 1);
    assert.equal(await p.locator('.catalogue-timeline [aria-current="step"]').count(), 1);
    assert.equal(await p.locator('.catalogue-timeline button').nth(index).getAttribute('aria-current'),'step');
  };
  const price = format => p.locator('#catalogue-step-2 .price-field').filter({has:p.getByText(`Format ${format}`,{exact:true})}).locator('input');
  await p.goto(`${preview}/catalogues/nouveau`);
  await p.locator('#catalogue-title').waitFor(); await ratio(1/3);
  for (let i=1;i<4;i++) assert.ok(await p.locator('.catalogue-timeline button').nth(i).isDisabled());
  assert.ok(await p.getByRole('button',{name:'Créer le brouillon',exact:true}).isDisabled());
  assert.equal(posts,0);
  await p.locator('#catalogue-title').fill('Printemps créatif');
  failCreate=true;
  await p.getByRole('button',{name:'Créer le brouillon',exact:true}).click();
  await p.getByRole('alert').filter({hasText:'Création refusée'}).waitFor();
  assert.equal(await p.locator('#catalogue-title').inputValue(),'Printemps créatif');
  await capture('creation-refus-1280');
  failCreate=false;
  await p.getByRole('button',{name:'Créer le brouillon',exact:true}).click();
  await p.locator('#new-collection').waitFor(); await ratio(1/3);
  assert.equal(new URL(p.url()).pathname,'/catalogues/4');
  assert.equal(catalogues.at(-1).statut,'brouillon');
  // All destinations are available before any composition has been entered.
  await step(2); assert.equal(await price('A').inputValue(),'18,00');
  await step(3); assert.ok(await p.getByRole('button',{name:'Publier le catalogue',exact:true}).isDisabled());
  await step(0); await p.locator('#catalogue-special').fill('Papier doré');
  await step(1); await p.locator('#new-collection').fill('Fleurs');
  await step(2); await p.locator('#new-ruban').fill('Satin'); await price('A').fill('0');
  await step(3);
  assert.equal(await p.locator('.catalogue-pending button').count(),3);
  assert.equal(await p.locator('.catalogue-step-unsaved').count(),3);
  assert.equal(await p.locator('.catalogue-summary').innerText().then(t=>t.includes('Papier doré')),false);
  await p.locator('.catalogue-pending button').filter({hasText:'Composition'}).click();
  assert.equal(await p.locator('#new-collection').inputValue(),'Fleurs');
  await p.getByRole('button',{name:'Ajouter une collection',exact:true}).click();
  await p.getByRole('button',{name:'Choisir les papiers',exact:true}).waitFor();
  await p.getByRole('button',{name:'Choisir les papiers',exact:true}).click();
  assert.equal(await p.locator('.catalogue-collection > .catalogue-hint:visible').count(),0);
  await p.getByRole('searchbox',{name:'Bibliothèque de papiers'}).fill('cuivre');
  await p.getByRole('button',{name:'Ajouter Papier cuivre',exact:true}).click();
  await p.getByRole('searchbox',{name:'Bibliothèque de papiers'}).fill('crème');
  await step(2);
  assert.equal(await p.locator('#new-ruban').inputValue(),'Satin');
  assert.equal(await price('A').inputValue(),'0');
  await step(1);
  assert.equal(await p.getByRole('searchbox',{name:'Bibliothèque de papiers'}).inputValue(),'crème');
  assert.ok(await p.locator('.catalogue-paper-selection').getByText('Papier cuivre',{exact:true}).isVisible());
  await p.getByRole('button',{name:'Ajouter Papier crème',exact:true}).click();
  // Creating a library paper still locks every navigation until the response.
  await p.getByRole('searchbox',{name:'Bibliothèque de papiers'}).fill('Papier fleuri');
  const createPaper=p.getByRole('button',{name:'Créer « Papier fleuri » dans la bibliothèque',exact:true});
  await createPaper.waitFor(); await p.waitForFunction(()=>!document.querySelector('.catalogue-search-results button')?.disabled);
  holdPaper=true; await createPaper.click();
  await p.waitForFunction(()=>document.querySelectorAll('.catalogue-timeline button:disabled').length===4);
  assert.ok(await p.getByRole('button',{name:'Suivant',exact:true}).isDisabled());
  while(!releasePaper) await delay(10);
  releasePaper();holdPaper=false;
  await p.getByRole('button',{name:'Enregistrer les papiers',exact:true}).waitFor();
  await p.waitForFunction(()=>!document.querySelector('.catalogue-timeline button').disabled);
  await p.getByRole('button',{name:'Enregistrer les papiers',exact:true}).click();
  await p.getByRole('button',{name:'Choisir les papiers',exact:true}).waitFor();
  assert.equal(catalogues.at(-1).collections[0].papiers.length,3);
  assert.equal(await p.locator('#catalogue-step-1').getByRole('button',{name:'Renommer',exact:true}).count(),0);
  const collectionNameField=p.getByRole('textbox',{name:'Nom de la collection',exact:true});
  await collectionNameField.fill('Fleurs de printemps');
  await collectionNameField.press('Enter');
  await p.getByRole('status').filter({hasText:'Collection renommée'}).waitFor();
  assert.equal(catalogues.at(-1).collections[0].nom,'Fleurs de printemps');
  await p.waitForFunction(()=>document.activeElement.matches('#catalogue-step-1 input'));
  await collectionNameField.fill('Fleurs au clavier');
  await collectionNameField.press('Tab');
  await p.getByRole('status').filter({hasText:'Collection renommée'}).waitFor();
  await p.waitForFunction(()=>document.activeElement.id.endsWith('-choose-papers'));
  assert.equal(catalogues.at(-1).collections[0].nom,'Fleurs au clavier');
  await collectionNameField.fill('Fleurs dorées');
  // A pointer blur must not consume the destination button click.
  await step(2);
  await p.getByRole('status').filter({hasText:'Collection renommée'}).waitFor();
  assert.equal(catalogues.at(-1).collections[0].nom,'Fleurs dorées');
  assert.equal(await p.evaluate(()=>document.activeElement.id),'catalogue-step-title-2');
  await step(1);
  failSave=true;
  await collectionNameField.fill('Nom refusé');
  await collectionNameField.press('Enter');
  await p.getByRole('alert').filter({hasText:'Enregistrement refusé'}).waitFor();
  await delay(350);
  assert.equal(rejectedRenameRequests,1);
  await collectionNameField.press('Tab');
  await delay(350);
  assert.equal(rejectedRenameRequests,2);
  assert.equal(await collectionNameField.inputValue(),'Nom refusé');
  assert.equal(catalogues.at(-1).collections[0].nom,'Fleurs dorées');
  failSave=false;
  await collectionNameField.press('Enter');
  await p.getByRole('status').filter({hasText:'Collection renommée'}).waitFor();
  await collectionNameField.fill('');
  await collectionNameField.press('Tab');
  await p.getByRole('alert').filter({hasText:'Renseignez le nom de la collection.'}).waitFor();
  assert.equal(catalogues.at(-1).collections[0].nom,'Nom refusé');
  await collectionNameField.fill('Fleurs');
  // Opening paper selection on blur must work in one click too.
  const renameResponse=p.waitForResponse(response=>response.url().endsWith('/catalogues/collections/40') && response.request().method()==='PUT');
  await p.getByRole('button',{name:'Choisir les papiers',exact:true}).click();
  await p.getByRole('searchbox',{name:'Bibliothèque de papiers'}).waitFor();
  await p.getByRole('status').filter({hasText:'Collection renommée'}).waitFor();
  await renameResponse;
  await p.waitForFunction(()=>document.activeElement.matches('.catalogue-paper-editor input[type=search]'));
  await p.getByRole('searchbox',{name:'Bibliothèque de papiers'}).pressSequentially('cuivre');
  assert.equal(await p.getByRole('searchbox',{name:'Bibliothèque de papiers'}).inputValue(),'cuivre');
  assert.equal(catalogues.at(-1).collections[0].nom,'Fleurs');
  await p.getByRole('button',{name:'Annuler',exact:true}).click();

  await step(0); assert.equal(await p.locator('#catalogue-special').inputValue(),'Papier doré');
  failSave=true;
  await p.getByRole('button',{name:'Enregistrer les informations',exact:true}).click();
  await p.getByRole('alert').filter({hasText:'Enregistrement refusé'}).waitFor();
  await step(2); await step(0);
  assert.equal(await p.locator('#catalogue-special').inputValue(),'Papier doré');
  failSave=false;
  await p.getByRole('button',{name:'Enregistrer les informations',exact:true}).click();
  await p.getByRole('status').filter({hasText:'Informations enregistrées'}).waitFor();
  await step(2);
  await p.getByRole('button',{name:'Ajouter un ruban',exact:true}).click();
  await p.locator('#ruban-50').waitFor();
  assert.equal(await p.locator('.catalogue-alert[role=status]:visible').count(),0);
  assert.equal(await p.getByRole('button',{name:'Renommer',exact:true}).count(),0);
  await p.locator('#ruban-50').fill('Satin doré');
  await p.locator('#ruban-50').press('Enter');
  await p.getByRole('status').filter({hasText:'Ruban renommé'}).waitFor();
  assert.equal(catalogues.at(-1).rubans[0].nom,'Satin doré');
  await p.waitForFunction(()=>document.activeElement.id==='ruban-50');
  await p.locator('#ruban-50').fill('Satin au clavier');
  await p.locator('#ruban-50').press('Tab');
  await p.getByRole('status').filter({hasText:'Ruban renommé'}).waitFor();
  await p.waitForFunction(()=>document.activeElement.id==='new-ruban');
  assert.equal(catalogues.at(-1).rubans[0].nom,'Satin au clavier');
  await p.locator('#ruban-50').fill('Satin crème');
  await step(3);
  await p.getByRole('status').filter({hasText:'Ruban renommé'}).waitFor();
  assert.equal(catalogues.at(-1).rubans[0].nom,'Satin crème');
  assert.equal(await p.evaluate(()=>document.activeElement.id),'catalogue-step-title-3');
  await step(2);
  failSave=true;
  await p.locator('#ruban-50').fill('Ruban refusé');
  await p.locator('#ruban-50').press('Enter');
  await p.getByRole('alert').filter({hasText:'Enregistrement refusé'}).waitFor();
  await delay(350);
  assert.equal(rejectedRenameRequests,3);
  await p.locator('#ruban-50').press('Tab');
  await delay(350);
  assert.equal(rejectedRenameRequests,4);
  assert.equal(await p.locator('#ruban-50').inputValue(),'Ruban refusé');
  assert.equal(catalogues.at(-1).rubans[0].nom,'Satin crème');
  failSave=false;
  await p.locator('#ruban-50').press('Enter');
  await p.getByRole('status').filter({hasText:'Ruban renommé'}).waitFor();
  await p.locator('#ruban-50').fill('');
  await p.locator('#ruban-50').press('Tab');
  await p.getByRole('alert').filter({hasText:'Renseignez le nom du ruban.'}).waitFor();
  assert.equal(catalogues.at(-1).rubans[0].nom,'Ruban refusé');
  await p.locator('#ruban-50').fill('Satin');
  const ribbonResponse=p.waitForResponse(response=>response.url().endsWith('/catalogues/rubans/50') && response.request().method()==='PUT');
  await price('A').click();
  await ribbonResponse;
  await p.waitForFunction(()=>document.activeElement.matches('#catalogue-step-2 .price-field input'));

  await price('A').fill('10,001');
  await p.getByRole('button',{name:'Enregistrer les tarifs',exact:true}).click();
  await p.locator('#catalogue-step-2 .catalogue-error').waitFor();
  await step(1);await step(2);
  assert.equal(await price('A').inputValue(),'10,001');
  assert.equal(await price('A').getAttribute('aria-invalid'),'true');
  await price('A').fill('0');
  holdSave=true;
  await p.getByRole('button',{name:'Enregistrer les tarifs',exact:true}).click();
  await p.waitForFunction(()=>document.querySelectorAll('.catalogue-timeline button:disabled').length===4);
  while(!releaseSave) await delay(10);
  releaseSave();holdSave=false;
  await p.waitForFunction(()=>!document.querySelector('.catalogue-timeline button').disabled);
  await p.getByRole('status').filter({hasText:'Tarifs du catalogue enregistrés'}).waitFor();
  assert.equal(catalogues.at(-1).prix_A_cents,0);
  await step(3);
  assert.equal(await p.locator('.catalogue-pending').count(),0);
  assert.ok(await p.getByRole('button',{name:'Publier le catalogue',exact:true}).isEnabled());
  assert.match(await p.locator('.catalogue-summary').innerText(),/0,00/);
  await capture('verification-1280');
  await p.getByRole('button',{name:'Publier le catalogue',exact:true}).click();
  await p.getByText('Disponible à la commande · Format C',{exact:true}).waitFor();
  // Hidden pending inputs still protect leaving the editor.
  await step(1);await p.locator('#new-collection').fill('Collection en attente');await step(2);
  await p.locator('.catalogue-editor-close').click();
  assert.equal(dialogs,1);assert.equal(new URL(p.url()).pathname,'/catalogues/4');
  await step(1);assert.equal(await p.locator('#new-collection').inputValue(),'Collection en attente');
  await p.locator('#new-collection').fill('');
  // Keyboard activation moves focus to the visible step heading.
  await p.locator('.catalogue-timeline button').nth(2).focus();await p.keyboard.press('Enter');
  await p.waitForFunction(()=>document.activeElement.id==='catalogue-step-title-2');
  // Every step fits desktop and narrow layouts, with reachable footer above dock.
  for(const [width,height] of [[1280,800],[1024,768],[375,800],[800,375]]) {
    await p.setViewportSize({width,height});await delay(350);
    if(width>900)await ratio(1/3);
    for(let index=0;index<4;index++) {
      await step(index);
      assert.ok(await p.locator('.catalogue-timeline').isVisible());
      assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));
      await p.getByRole('button',{name:index===3?'Fermer':'Suivant',exact:true}).scrollIntoViewIfNeeded();
      if(width>900){
        const footer=await p.locator('.catalogue-step-navigation').boundingBox(),dock=await p.locator('#main-navigation').boundingBox();
        assert.ok(footer.y+footer.height<=dock.y+1);
      }
      await p.getByRole('button',{name:index===3?'Précédent':'Suivant',exact:true}).click();
      await p.locator(`#catalogue-step-${index===3?2:index+1}`).waitFor({state:'visible'});
      await step(index);
      await p.locator('.catalogue-editor-body').evaluate(element=>element.scrollTop=0);
      if(width===1280 || index===1)await capture(`etape-${index+1}-${width}`);
    }
  }
  await p.setViewportSize({width:1280,height:800});
  await p.emulateMedia({reducedMotion:'reduce'});
  await p.goto(`${preview}/catalogues/3`);await p.locator('#catalogue-title').waitFor();
  await step(3);
  assert.ok(await p.getByRole('button',{name:'Restaurer le catalogue',exact:true}).isEnabled());
  await p.getByRole('button',{name:'Restaurer le catalogue',exact:true}).click();
  await p.getByRole('button',{name:'Restaurer',exact:true}).click();
  await p.getByRole('dialog').waitFor({state:'hidden'});
  assert.equal(catalogues.find(c=>c.id===3).archive,0);
  assert.equal(catalogues.find(c=>c.id===3).statut,'brouillon');
  await step(0);await p.locator('.catalogue-editor-close').click();
  await p.locator('.catalogue-editor').waitFor({state:'hidden'});
  await p.goto(`${preview}/catalogues/1`);await p.locator('#catalogue-title').waitFor();
  await step(1);
  for(const [index,name] of ['Troisième','Quatrième'].entries()) {
    await p.locator('#new-collection').fill(name);await p.getByRole('button',{name:'Ajouter une collection',exact:true}).click();
    await p.waitForFunction(count=>document.querySelectorAll('#catalogue-step-1 .catalogue-collection').length===count,index+3);
  }
  await p.getByText('Maximum de 4 collections atteint.',{exact:true}).waitFor();
  assert.equal(await p.locator('#new-collection').count(),0);
  assert.equal(await p.getByRole('button',{name:'Ajouter une collection',exact:true}).count(),0);
  await p.locator('.catalogue-editor-body').evaluate(element=>element.scrollTop=element.scrollHeight);
  await capture('composition-plafond-1280');
  await step(2);
  for(const name of ['Ruban deux']) {
    await p.locator('#new-ruban').fill(name);await p.getByRole('button',{name:'Ajouter un ruban',exact:true}).click();
  }
  await p.getByText('Maximum de 2 rubans atteint.',{exact:true}).waitFor();
  assert.equal(await p.locator('#new-ruban').count(),0);
  await capture('rubans-plafond-1280');
  await step(3);
  assert.equal(await p.locator('.catalogue-requirements').getByText(/papier à/).count(),0);
  assert.equal(await p.locator('.catalogue-summary-collections').getByText('Aucun papier',{exact:true}).count(),0);
  await p.locator('.catalogue-summary-collections li').nth(2).scrollIntoViewIfNeeded();
  await capture('verification-collections-vides-1280');
  await p.getByRole('button',{name:'Ajouter un papier à « Troisième »',exact:true}).click();
  assert.ok(await p.locator('#catalogue-step-1').isVisible());
  assert.deepEqual(errors,[]);
  console.log('Recette catalogue V2 réussie : création/refus, contrat API, navigation libre, saisies et sélections conservées, erreurs, verrous, publication, archivés, maxima, clavier, proportions et 4 tailles.');
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
