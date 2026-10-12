const {chromium}=require(process.env.STAMP_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const out=process.env.STAMP_CAPTURE_DIR || __dirname;
fs.mkdirSync(out,{recursive:true});
const preview=process.env.STAMP_PREVIEW_URL || 'http://127.0.0.1:5174';
const clients=Array.from({length:35},(_,i)=>({id:i+1,prenom:`Cliente ${i+1}`,nom:'Recette',ville:'Nantes',archive:0,contacter:0,points_fidelite:0}));
const common={created_at:'2026-10-10 12:00:00',reglee:0,commande_collections:[],papiers_selectionnes:[],ruban:null};
const orders=clients.map(c=>({...common,id:c.id,client_id:c.id,client:c,client_prenom:c.prenom,client_nom:c.nom,type:'hors_kit',montant:80}));
const catalogue={id:1,titre:'Catalogue recette',papier_spe:'Vélin',statut:'publie',archive:0,formats_disponibles:['C'],prix_C_cents:900,prix_A_cents:1800,prix_B_cents:1400,collections:[{id:11,nom:'Collection recette',papiers:[{id:21,nom:'Papier recette',archive:0}]}],rubans:[]};
const os=require('node:os');
const path=require('node:path');
(async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'stamp-zoom-'));
 fs.mkdirSync(path.join(profile,'Default'));
 // Native Chrome page zoom preference, on the default storage partition (x).
 fs.writeFileSync(path.join(profile,'Default','Preferences'),JSON.stringify({partition:{default_zoom_level:{x:Math.log(2)/Math.log(1.2)}}}));
 const browser=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.STAMP_CHROMIUM_EXECUTABLE,viewport:null,args:['--window-size=1280,888']});
 try {
 const p=browser.pages()[0];p.setDefaultTimeout(10000);
 const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());let failSave=false;
 await p.route('**/api/**',r=>{
  const u=new URL(r.request().url()),m=r.request().method(),body=()=>r.request().postDataJSON();
  const json=(v,status=200)=>r.fulfill({json:v,status});
  if(u.pathname==='/api/clients') {if(m==='POST'){if(failSave)return json({error:'Erreur recette'},409);const c={...clients[0],...body(),id:50};clients.push(c);return json(c,201);}return json(clients);}
  const client=u.pathname.match(/^\/api\/clients\/(\d+)$/);if(client){const c=clients.find(c=>c.id===+client[1]);if(m==='PUT')Object.assign(c,body());return json(c);}
  if(u.pathname.match(/^\/api\/clients\/\d+\/commandes$/))return json([]);
  if(u.pathname==='/api/commandes'){if(m==='POST'){if(failSave)return json({error:'Erreur recette'},409);const o={...common,...body(),id:50,client:clients.find(c=>c.id===body().client_id)};orders.push(o);return json(o,201);}return json(orders);}
  const order=u.pathname.match(/^\/api\/commandes\/(\d+)$/);if(order){const o=orders.find(o=>o.id===+order[1]);if(m==='PUT')Object.assign(o,body());return json(o);}
  if(u.pathname==='/api/papiers-cartonnes')return json([{id:1,nom:'Papier recette',archive:0}]);
  if(u.pathname==='/api/catalogues')return json([catalogue]);
  if(u.pathname==='/api/catalogues/1')return json(catalogue);
  if(u.pathname==='/api/settings')return json({prix_A_cents:1800,prix_B_cents:1400,prix_C_cents:900});
  if(u.pathname.includes('/workflow'))return json({piles:[],alertes:[]});
  return json([]);
 });

 const geometry=async()=>{
  const v=await p.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,scale:visualViewport.scale,overflow:document.documentElement.scrollWidth>innerWidth}));
  assert.equal(v.width,640);assert.equal(v.dpr,2);assert.equal(v.scale,1);assert.equal(v.overflow,false,JSON.stringify(v));return v;
 };
 const cdp=await browser.newCDPSession(p);
 // Capture the native viewport directly: a CSS-sized screenshot clip would crop a zoomed page.
 const capture=async(name)=>{const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(shot.data,'base64'));};
 const focused=async()=>{
  await p.waitForTimeout(100);
  const r=await p.evaluate(()=>{
   const e=document.activeElement,b=e.getBoundingClientRect(),header=document.querySelector('.atelier-header').getBoundingClientRect(),dock=document.querySelector('.dock-wrapper').getBoundingClientRect();
   return {tag:e.tagName,id:e.id,text:e.textContent?.trim().slice(0,40),top:b.top,bottom:b.bottom,header:header.bottom,dock:dock.top,hit:e.contains(document.elementFromPoint(b.left+b.width/2,b.top+b.height/2))};
  });
  assert.ok(r.top>=r.header-1&&r.bottom<=r.dock+1&&r.hit,JSON.stringify(r));
 };
 for(const route of ['/','/clients','/commandes/hors-kit','/commandes/kits','/catalogues','/papiers','/stocks']){
  await p.goto(preview+route);await p.locator('.atelier-dock').waitFor();await p.waitForLoadState('networkidle');await geometry();
  await capture('page-'+(route.replaceAll('/','-')||'accueil'));
 }
 for(const [route,trigger] of [['/clients','#clients-create'],['/commandes/hors-kit','#commandes-create-hors-kit'],['/commandes/kits','#commandes-create-kit']]){
  await p.goto(preview+route);await p.locator(trigger).click();await p.locator('.form-panel').waitFor();await geometry();
  if(route==='/clients'){await p.getByLabel('Prénom').fill('Cliente zoom');await p.getByLabel(/^Nom/).fill('Recette');}
  else {
   await p.getByLabel('Cliente *',{exact:true}).selectOption('1');
   if(route.endsWith('/kits')){await p.getByLabel('Catalogue *',{exact:true}).selectOption('1');await p.getByRole('radio',{name:/Format C/}).check();}
   else await p.getByLabel('Montant',{exact:false}).fill('81');
  }
  await p.locator('.form-panel-header h2').focus();
  // Opening puts keyboard focus on the editor heading; Tab traverses every control through the footer.
  let actions=0;
  for(let i=0;i<75;i++){
   await p.keyboard.press('Tab');
   const inEditor=await p.evaluate(()=>!!document.activeElement.closest('.form-panel'));
   if(!inEditor)break;
   if(await p.evaluate(()=>document.activeElement.matches('input,select,textarea,button,a')))await focused();
   if(await p.evaluate(()=>!!document.activeElement.closest('.form-panel-footer')))actions++;
  }
  assert.ok(actions>=2,'Footer actions not both reachable on '+route);await capture('form-'+route.split('/').at(-1));
 }
 await p.goto(preview+'/catalogues');await p.getByRole('button',{name:'Nouveau catalogue',exact:true}).click();await p.locator('#catalogue-title').waitFor();
 await p.locator('#catalogue-title').focus();await focused();await p.locator('#catalogue-title').fill('Catalogue zoom');
 for(let i=0;i<3;i++){await p.keyboard.press('Tab');await focused();}
 await geometry();await capture('catalogue-creation');
 await p.goto(preview+'/catalogues/1');await p.locator('#new-ruban').waitFor();
 await p.locator('#catalogue-title').focus();await focused();let catalogueControls=0;
 for(let i=0;i<80;i++){
  await p.keyboard.press('Tab');if(!await p.evaluate(()=>!!document.activeElement.closest('.catalogue-editor')))break;
  if(await p.evaluate(()=>document.activeElement.matches('input,select,textarea,button,a'))){await focused();catalogueControls++;}
 }
 assert.ok(catalogueControls>=8,'Existing catalogue controls not traversed');await p.getByRole('button',{name:'Archiver le catalogue',exact:true}).focus();await focused();await capture('catalogue-preparation');
 await p.goto(preview+'/papiers');await p.locator('#paper-create-toggle').click();await p.locator('#paper-name:focus').waitFor();await focused();await p.locator('#paper-name').fill('Papier zoom');
 await p.keyboard.press('Tab');await focused();await p.keyboard.press('Tab');await focused();await geometry();await capture('papier-creation');
 await p.getByRole('button',{name:'Annuler',exact:true}).click();await p.locator('#paper-rename-1').click();await p.locator('#paper-1-name:focus').waitFor();await focused();await p.locator('#paper-1-name').fill('Papier renommé');await p.keyboard.press('Tab');await focused();await p.keyboard.press('Tab');await focused();
 assert.deepEqual(errors,[]);console.log('Recette zoom natif 200 % réussie',await geometry());
 } finally {await browser.close();fs.rmSync(profile,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
