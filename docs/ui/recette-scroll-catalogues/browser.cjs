const { chromium } = require(process.env.STAMP_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = process.env.STAMP_CAPTURE_DIR || __dirname;fs.mkdirSync(out,{recursive:true});
const preview = process.env.STAMP_PREVIEW_URL || 'http://127.0.0.1:5174';
const common={archive:0,statut:'brouillon',formats_disponibles:['A','B','C'],prix_A_cents:1800,prix_B_cents:1400,prix_C_cents:900,papier_spe:'Papier doré',embellissement:'Feuilles cuivrées',collections:[],rubans:[]};
const first={...common,id:7,titre:'Automne à l’atelier',collections:Array.from({length:4},(_,i)=>({id:20+i,nom:`Collection ${i+1}`,papiers:Array.from({length:5},(_,j)=>({id:i*5+j+1,nom:`Papier ${i+1}.${j+1} — Motif aux couleurs de saison`,archive:0}))})),rubans:[{id:31,ordre:1,nom:'Satin doré'},{id:32,ordre:2,nom:'Ruban crème'}]};
const catalogues=[first,...Array.from({length:28},(_,i)=>({...common,id:i+8,titre:`Catalogue ${i+1} — Petite collection de saison`}))];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.STAMP_CHROMIUM_EXECUTABLE});
 try {
  const p=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/api/**',async r=>{const path=new URL(r.request().url()).pathname;
   if(path==='/api/catalogues')return r.fulfill({json:catalogues});
   const match=path.match(/^\/api\/catalogues\/(\d+)$/);if(match)return r.fulfill({json:catalogues.find(c=>c.id===Number(match[1]))});
   if(path==='/api/settings')return r.fulfill({json:{prix_A_cents:1800,prix_B_cents:1400,prix_C_cents:900}});
   if(path==='/api/commandes')return r.fulfill({json:[]});
   return r.fulfill({json:[]});
  });
  const capture=async name=>{await p.mouse.move(0,0);await p.screenshot({path:`${out}/${name}.png`,animations:'disabled',fullPage:false});};
  const rect=selector=>p.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height};});
  const top=selector=>p.locator(selector).evaluate(e=>e.scrollTop);
  const dockVisible=async()=>{
   const box=await p.locator('.dock-item').first().boundingBox();assert.ok(box);
   assert.ok(box.y>=0&&box.y+box.height<=(await p.viewportSize()).height);
   assert.ok(await p.evaluate(({x,y})=>Boolean(document.elementFromPoint(x,y)?.closest('#main-navigation')),{x:box.x+box.width/2,y:box.y+box.height/2}));
  };
  await p.goto(`${preview}/catalogues/7`);await p.locator('#catalogue-title').waitFor();await p.locator('#catalogue-open-35').waitFor();
  await p.locator('.skip-link').focus();const skipBox=await p.locator('.skip-link').boundingBox();assert.ok(await p.evaluate(({x,y})=>document.elementFromPoint(x,y)?.classList.contains('skip-link'),{x:skipBox.x+10,y:skipBox.y+10}));await p.locator('.catalogue-editor-close').focus();
  for(const [width,height] of [[1280,800],[1024,768]]){
   await p.setViewportSize({width,height});await pause(300);
   await p.locator('.catalogue-editor-body').evaluate(e=>e.scrollTop=0);await p.locator('.catalogue-list-content').evaluate(e=>e.scrollTop=0);
   const hero=await rect('.atelier-header'),title=await rect('.catalogue-editor-header'),list=await rect('.catalogue-list-panel'),dock=await rect('.dock-wrapper');
   assert.equal(await p.evaluate(()=>window.scrollY),0);assert.ok(await p.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1));
   assert.ok(list.bottom <= (await rect('#main-navigation')).top);assert.ok(Math.abs((await rect('.catalogue-editor')).bottom-height)<=1);
   const formBox=await p.locator('.catalogue-editor-body').boundingBox();await p.mouse.move(formBox.x+80,formBox.y+100);await p.mouse.wheel(0,1300);await p.waitForFunction(()=>document.querySelector('.catalogue-editor-body').scrollTop>0);
   assert.equal(await top('.catalogue-list-content'),0);assert.deepEqual(await rect('.atelier-header'),hero);assert.deepEqual(await rect('.catalogue-editor-header'),title);assert.deepEqual(await rect('.catalogue-list-panel'),list);assert.deepEqual(await rect('.dock-wrapper'),dock);
   const formScroll=await top('.catalogue-editor-body');const listBox=await p.locator('.catalogue-list-content').boundingBox();await p.mouse.move(listBox.x+60,listBox.y+80);await p.mouse.wheel(0,600);await p.waitForFunction(()=>document.querySelector('.catalogue-list-content').scrollTop>0);assert.equal(await top('.catalogue-editor-body'),formScroll);assert.equal(await p.evaluate(()=>window.scrollY),0);
   await dockVisible();await capture(`defilements-${width}`);
   await p.locator('.catalogue-editor-body').evaluate(e=>e.scrollTop=e.scrollHeight);
   await p.getByRole('button',{name:'Enregistrer les tarifs',exact:true}).scrollIntoViewIfNeeded();
   const actions=await p.getByRole('button',{name:'Enregistrer les tarifs',exact:true}).boundingBox(),nav=await p.locator('#main-navigation').boundingBox();assert.ok(actions.y+actions.height<=nav.y);
   await capture(`formulaire-bas-${width}`);
   assert.equal(await p.locator('.catalogue-editor-close').getAttribute('aria-label'),'Fermer la préparation du catalogue');
   const close=await rect('.catalogue-editor-close');assert.ok(close.left<title.left+30);assert.ok(close.top>=title.top&&close.bottom<=title.bottom);
  }
  await p.locator('.catalogue-editor-close').click();await p.locator('.catalogue-editor').waitFor({state:'hidden'});await p.getByRole('link',{name:'Ouvrir la préparation'}).waitFor();await dockVisible();
  for(const [width,height] of [[1280,800],[1024,768]]){
   await p.setViewportSize({width,height});await pause(300);
   assert.ok(Math.abs((await rect('.slide-panel-inline .slide-panel')).bottom-height)<=1);
   assert.ok((await rect('.catalogue-list-panel')).bottom <= (await rect('#main-navigation')).top);
   assert.ok(Math.abs((await rect('.slide-panel-inline .slide-panel-body')).bottom-height)<=1);
   assert.equal(await p.locator('.slide-panel-inline .slide-panel-footer').count(),0);
   await p.locator('.slide-panel-body').evaluate(e=>e.scrollTop=0);await p.locator('.catalogue-list-content').evaluate(e=>e.scrollTop=0);
   const header=await rect('.slide-panel-header'),hero=await rect('.atelier-header'),body=await p.locator('.slide-panel-body').boundingBox();
   await p.mouse.move(body.x+60,body.y+80);await p.mouse.wheel(0,1600);await p.waitForFunction(()=>document.querySelector('.slide-panel-body').scrollTop>0);
   assert.equal(await top('.catalogue-list-content'),0);assert.deepEqual(await rect('.slide-panel-header'),header);assert.deepEqual(await rect('.atelier-header'),hero);
   const detailScroll=await top('.slide-panel-body'),list=await p.locator('.catalogue-list-content').boundingBox();await p.mouse.move(list.x+60,list.y+80);await p.mouse.wheel(0,600);await p.waitForFunction(()=>document.querySelector('.catalogue-list-content').scrollTop>0);assert.equal(await top('.slide-panel-body'),detailScroll);assert.equal(await p.evaluate(()=>window.scrollY),0);
   await p.locator('.slide-panel-body').evaluate(e=>e.scrollTop=e.scrollHeight);
   const prepare=await p.getByRole('link',{name:'Ouvrir la préparation'}).boundingBox(),nav=await p.locator('#main-navigation').boundingBox();assert.ok(prepare.y+prepare.height<=nav.y);
   await dockVisible();await capture(`consultation-bas-${width}`);
  }
  await p.locator('.slide-panel-close').click();await p.locator('.slide-panel').waitFor({state:'hidden'});await p.locator('.catalogue-detail-placeholder').waitFor();assert.ok((await rect('.catalogue-detail-placeholder')).height<220);assert.ok((await rect('.catalogue-detail-placeholder')).bottom<(await rect('.dock-wrapper')).top-100);
  await p.locator('#catalogue-open-8').click();await p.getByRole('link',{name:'Ouvrir la préparation'}).waitFor();assert.equal(await p.locator('.catalogue-detail-actions').count(),1);assert.equal(await p.locator('.slide-panel-footer').count(),0);
  await p.getByRole('button',{name:'Nouveau catalogue',exact:true}).click();await p.locator('#catalogue-title').waitFor();assert.equal(await p.locator('.catalogue-editor-close').getAttribute('aria-label'),'Fermer la création du catalogue');await p.locator('.catalogue-editor-close').focus();await p.keyboard.press('Enter');await p.locator('.catalogue-editor').waitFor({state:'hidden'});
  for(const [width,height] of [[375,800],[800,375]]){
   await p.setViewportSize({width,height});await p.goto(`${preview}/catalogues/7`);await p.locator('#catalogue-title').waitFor();await p.waitForFunction(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth);
   await p.locator('.catalogue-editor-body').evaluate(e=>e.scrollTop=500);await p.locator('.catalogue-list-content').evaluate(e=>e.scrollTop=300);
   assert.ok(await top('.catalogue-editor-body')>0);assert.ok(await top('.catalogue-list-content')>0);await dockVisible();await capture(`etroit-${width}`);
   await p.locator('.catalogue-editor-close').click();await p.getByRole('link',{name:'Ouvrir la préparation'}).waitFor();assert.equal(await p.locator('.slide-panel-footer').count(),1);assert.equal(await p.locator('.catalogue-detail-actions').count(),0);await p.locator('.slide-panel-close').click();await p.locator('.slide-panel').waitFor({state:'hidden'});await dockVisible();
  }
  await p.setViewportSize({width:1280,height:800});await p.goto(`${preview}/commandes/kits`);await p.getByRole('heading',{name:'Aucune commande kit',exact:true}).waitFor();
  const dockBefore=await rect('.dock-wrapper');await p.evaluate(()=>{const spacer=document.createElement('div');spacer.style.height='2000px';document.querySelector('.content-wrapper').append(spacer);window.scrollTo(0,1500);});await pause(100);assert.deepEqual(await rect('.dock-wrapper'),dockBefore);await dockVisible();
  assert.deepEqual(errors,[]);console.log('OK : défilements liste/formulaire indépendants par roulette, bandeau et titre immobiles, fermeture croix clavier, dock fixe/clicable et actions dégagées, ratios conservés, 1280/1024/375/800 sans débordement, dock fixe sur une autre vue.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
