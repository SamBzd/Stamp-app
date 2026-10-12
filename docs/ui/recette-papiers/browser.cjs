const {chromium}=require(process.env.STAMP_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const out=process.env.STAMP_CAPTURE_DIR||__dirname;fs.mkdirSync(out,{recursive:true});
const preview=process.env.STAMP_PREVIEW_URL||'http://127.0.0.1:5174';
const papers=[{id:1,nom:'Kraft naturel',archive:0},{id:2,nom:'Papier publié',archive:0},{id:3,nom:'Ancien papier',archive:1},{id:4,nom:'Éclats dorés',archive:0},...Array.from({length:18},(_,i)=>({id:10+i,nom:`Motif ${String(i+1).padStart(2,'0')} — PapierAuxCouleursDeSaisonAvecUnNomTrèsLongSansEspace`,archive:0}))];
const normalize=s=>s.trim().normalize('NFC').toLocaleLowerCase('fr');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.STAMP_CHROMIUM_EXECUTABLE});
 try{
  const p=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  let failLoad=true,renameFailure=true,restoreFailure=true,hold=false,release,mutations=0,emptyLibrary=false;
  await p.route('**/api/**',async r=>{
   const path=new URL(r.request().url()).pathname,method=r.request().method();
   if(path==='/api/papiers-cartonnes'&&method==='GET'){
    if(failLoad){failLoad=false;return r.fulfill({status:500,json:{error:'Bibliothèque indisponible'}})}
    return r.fulfill({json:emptyLibrary?[]:papers});
   }
   if(path==='/api/papiers-cartonnes'&&method==='POST'){
    mutations++;const nom=r.request().postDataJSON().nom;
    if(papers.some(paper=>normalize(paper.nom)===normalize(nom)))return r.fulfill({status:409,json:{error:'Un papier avec ce nom existe déjà'}});
    const created={id:50,nom,archive:0};papers.push(created);return r.fulfill({status:201,json:created});
   }
   const match=path.match(/^\/api\/papiers-cartonnes\/(\d+)(\/archivage)?$/);
   if(match){
    mutations++;const paper=papers.find(paper=>paper.id===Number(match[1])),body=r.request().postDataJSON();
    if(!match[2]){
     if(renameFailure){renameFailure=false;return r.fulfill({status:500,json:{error:'Renommage refusé'}})}
     if(papers.some(item=>item.id!==paper.id&&normalize(item.nom)===normalize(body.nom)))return r.fulfill({status:409,json:{error:'Un papier avec ce nom existe déjà'}});
     if(hold)await new Promise(resolve=>{release=resolve});
     paper.nom=body.nom;return r.fulfill({json:paper});
    }
    if(paper.id===2&&body.archive)return r.fulfill({status:409,json:{error:'Ce papier est utilisé par le catalogue publié « Automne »'}});
    if(!body.archive&&restoreFailure){restoreFailure=false;return r.fulfill({status:500,json:{error:'Restauration refusée'}})}
    // A delayed successful restoration exposes a premature wait on an already-focused button.
    if(!body.archive)await new Promise(resolve=>setTimeout(resolve,1000));
    paper.archive=Number(body.archive);return r.fulfill({json:paper});
   }
   return r.fulfill({json:[]});
  });
  let accept=false,dialogs=0;p.on('dialog',async dialog=>{dialogs++;await (accept?dialog.accept():dialog.dismiss())});
  const capture=async name=>{await p.mouse.move(0,0);await p.screenshot({path:`${out}/${name}.png`,animations:'disabled',fullPage:false})};
  const row=id=>p.locator('.paper-row').filter({has:p.locator(`#paper-rename-${id}`)});
  const checkCreationControls=async expanded=>{
   assert.equal(await p.locator('#paper-create-toggle').getAttribute('aria-expanded'),String(expanded));
   assert.equal(await p.locator('#paper-create-toggle').getAttribute('aria-controls'),expanded?'paper-create-form':null);
   assert.equal(await p.locator('#paper-create-form').count(),expanded?1:0);
  };
  await p.goto(`${preview}/papiers`);await p.getByText('Bibliothèque indisponible',{exact:true}).waitFor();
  await p.getByRole('button',{name:'Réessayer',exact:true}).click();await p.locator('#paper-rename-1').waitFor();
  assert.equal(await p.getByRole('heading',{level:1}).innerText(),'Papiers');assert.equal(await p.locator('.paper-row').count(),21);
  assert.equal(await p.locator('#paper-filter-fields').isVisible(),false);assert.equal(await p.locator('#paper-create-form').count(),0);
  await checkCreationControls(false);
  await capture('liste-1280');
  await p.locator('#paper-filter-toggle').click();await p.locator('#paper-search:focus').waitFor();await p.locator('#paper-search').fill(' KRAFT ');assert.equal(await p.locator('.paper-row').count(),1);
  await p.locator('#paper-filter-toggle').click();assert.equal(await p.locator('#paper-filter-fields').isVisible(),false);assert.equal(await p.locator('.paper-filter-count').innerText(),'1');await capture('recherche-repliee-1280');
  await p.locator('#paper-filter-toggle').click();await p.getByRole('button',{name:'Effacer les filtres',exact:true}).click();await p.locator('#paper-search:focus').waitFor();
  await p.locator('#paper-create-toggle').click();await p.locator('#paper-name:focus').waitFor();await checkCreationControls(true);await p.locator('#paper-name').fill(' kraft naturel ');await p.getByRole('button',{name:'Créer le papier',exact:true}).click();await p.getByText('Un papier avec ce nom existe déjà',{exact:true}).waitFor();assert.equal(await p.locator('#paper-name').inputValue(),' kraft naturel ');assert.equal(await p.locator('#paper-name').getAttribute('aria-invalid'),'true');await capture('doublon-1280');
  await p.locator('#paper-name').fill('Nouveau papier crème');await p.getByRole('button',{name:'Créer le papier',exact:true}).click();await p.locator('#paper-rename-50:focus').waitFor();await checkCreationControls(false);
  await p.locator('#paper-rename-1').click();await p.locator('#paper-1-name:focus').waitFor();await p.locator('#paper-1-name').fill('Kraft renommé');await p.getByRole('button',{name:'Enregistrer',exact:true}).click();await p.getByText('Renommage refusé',{exact:true}).waitFor();assert.equal(await p.locator('#paper-1-name').inputValue(),'Kraft renommé');await p.locator('#paper-1-name:focus').waitFor();await capture('renommage-erreur-1280');
  await p.locator('#paper-search').fill('Papier publié');assert.equal(await p.locator('#paper-search').inputValue(),'');assert.equal(await p.locator('#paper-1-name').inputValue(),'Kraft renommé');assert.ok(dialogs>0);
  await p.getByRole('link',{name:'Catalogues',exact:true}).click();assert.equal(new URL(p.url()).pathname,'/papiers');assert.equal(await p.locator('#paper-1-name').inputValue(),'Kraft renommé');
  await p.getByRole('button',{name:'Enregistrer',exact:true}).click();await p.locator('#paper-rename-1:focus').waitFor();assert.equal(papers[0].nom,'Kraft renommé');await capture('renommage-1280');
  await p.locator('#paper-rename-1').click();await p.locator('#paper-1-name').fill('Saisie en cours');hold=true;await p.getByRole('button',{name:'Enregistrer',exact:true}).click();await p.waitForFunction(()=>document.querySelector('#paper-1-name')?.disabled);const before=mutations;
  assert.equal(await p.locator('#paper-create-toggle').isEnabled(),false);assert.equal(await p.locator('#paper-filter-toggle').isEnabled(),false);assert.equal(await p.locator('#paper-archive-2').isEnabled(),false);
  await p.getByRole('link',{name:'Commandes',exact:true}).click();assert.equal(new URL(p.url()).pathname,'/papiers');assert.equal(mutations,before);release();hold=false;await p.locator('#paper-rename-1:focus').waitFor();
  await p.locator('#paper-archive-2').click();await p.getByRole('dialog',{name:'Archiver ce papier ?'}).waitFor();await capture('confirmation-1280');await p.getByRole('button',{name:'Annuler',exact:true}).click();await p.locator('#paper-archive-2:focus').waitFor();
  await p.locator('#paper-archive-2').click();await p.getByRole('button',{name:'Archiver',exact:true}).click();await p.getByText('Ce papier est utilisé par le catalogue publié « Automne »',{exact:true}).waitFor();await p.locator('#paper-archive-2:focus').waitFor();assert.equal(papers[1].archive,0);await capture('archivage-refus-1280');
  await p.locator('#paper-archive-1').click();await p.getByRole('button',{name:'Archiver',exact:true}).click();await p.locator('#paper-archive-1:focus').waitFor();assert.equal(await p.locator('#paper-filter').inputValue(),'archives');assert.equal(await p.locator('.paper-row').count(),2);await capture('archives-1280');
  await p.locator('#paper-archive-1').click();await p.getByText('Restauration refusée',{exact:true}).waitFor();assert.equal(await p.locator('#paper-filter').inputValue(),'archives');await p.locator('#paper-archive-1').click();await p.waitForFunction(()=>document.querySelector('#paper-filter')?.value==='actifs');await p.locator('#paper-archive-1:focus').waitFor();assert.equal(await p.locator('#paper-filter').inputValue(),'actifs');assert.equal(papers[0].archive,0);
  await p.locator('#paper-search').fill('introuvable');await p.getByRole('heading',{name:'Aucun papier trouvé',exact:true}).waitFor();await p.getByRole('button',{name:'Effacer les filtres',exact:true}).last().click();await p.locator('#paper-search:focus').waitFor();
  await p.locator('#paper-rename-1').click();await p.locator('#paper-1-name').fill('A abandonner');accept=true;await p.locator('#paper-1-name').press('Escape');await p.locator('#paper-rename-1:focus').waitFor();accept=false;
  await p.locator('#paper-create-toggle').click();await p.locator('#paper-name').fill('Brouillon à conserver');await p.getByRole('button',{name:'Annuler',exact:true}).click();assert.equal(await p.locator('#paper-name').inputValue(),'Brouillon à conserver');accept=true;await p.getByRole('button',{name:'Annuler',exact:true}).click();await p.locator('#paper-create-toggle:focus').waitFor();await checkCreationControls(false);accept=false;
  await p.locator('#paper-filter-toggle').click();
  for(const [width,height] of [[1024,768],[375,800],[800,375]]){
   await p.setViewportSize({width,height});await p.goto(`${preview}/papiers`);await p.locator('#paper-rename-10').waitFor();await p.waitForFunction(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth);
   await capture(`liste-${width}`);await p.locator('#paper-rename-10').click();await p.locator('#paper-10-name:focus').waitFor();assert.ok(await p.locator('.paper-row').filter({has:p.locator('#paper-10-name')}).evaluate(e=>e.scrollWidth<=e.clientWidth));await capture(`edition-${width}`);await p.locator('#paper-10-name').press('Escape');
   await p.locator('#paper-rename-27').focus();await p.locator('#paper-rename-27').evaluate(e=>e.scrollIntoView({block:'nearest'}));const control=await p.locator('#paper-rename-27').boundingBox(),dock=await p.locator('#main-navigation').boundingBox();assert.ok(control.y+control.height<=dock.y);await capture(`fin-liste-${width}`);
  }
  await p.setViewportSize({width:1280,height:800});emptyLibrary=true;await p.goto(`${preview}/papiers`);await p.getByRole('heading',{name:'Ta bibliothèque commence ici',exact:true}).waitFor();await p.getByRole('button',{name:'Créer un papier',exact:true}).click();await p.locator('#paper-name:focus').waitFor();await checkCreationControls(true);await capture('bibliotheque-vide-1280');
  assert.deepEqual(errors,[]);console.log('OK : liste dense, filtres repliables/recherche/reset, création/doublon/saisie, renommage inline/refus/reprise/focus, protections des saisies et mutations, archivage protégé/restauration, clavier, 1280/1024/375/800 sans débordement, dernières actions dégagées du dock.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
