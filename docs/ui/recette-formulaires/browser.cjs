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
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.STAMP_CHROMIUM_EXECUTABLE});
 try {
 const p=await browser.newPage({viewport:{width:1280,height:800}});p.setDefaultTimeout(10000);const errors=[];p.on('pageerror',e=>errors.push(e.message));let acceptDialog=false;p.on('dialog',d=>acceptDialog?d.accept():d.dismiss());
 let failSave=false;
 await p.route('**/api/**',r=>{
  const u=new URL(r.request().url()),m=r.request().method(),body=()=>r.request().postDataJSON();
  const json=(v,status=200)=>r.fulfill({json:v,status});
  if(u.pathname==='/api/clients') {if(m==='POST'){if(failSave)return json({error:'Erreur recette'},409);const c={...clients[0],...body(),id:50};clients.push(c);return json(c,201);}return json(clients);}
  const client=u.pathname.match(/^\/api\/clients\/(\d+)$/);if(client){const c=clients.find(c=>c.id===+client[1]);if(m==='PUT')Object.assign(c,body());return json(c);}
  if(u.pathname.match(/^\/api\/clients\/\d+\/commandes$/))return json([]);
  if(u.pathname==='/api/commandes'){if(m==='POST'){if(failSave)return json({error:'Erreur recette'},409);const o={...common,...body(),id:50,client:clients.find(c=>c.id===body().client_id)};orders.push(o);return json(o,201);}return json(orders);}
  const order=u.pathname.match(/^\/api\/commandes\/(\d+)$/);if(order){const o=orders.find(o=>o.id===+order[1]);if(m==='PUT')Object.assign(o,body());return json(o);}
  if(u.pathname==='/api/catalogues')return json([catalogue]);
  if(u.pathname==='/api/catalogues/1')return json(catalogue);
  if(u.pathname==='/api/settings')return json({prix_A_cents:1800,prix_B_cents:1400,prix_C_cents:900});
  if(u.pathname.includes('/workflow'))return json({piles:[],alertes:[]});
  return json([]);
 });
 const ratio=async(list,expected)=>p.waitForFunction(({list,expected})=>{const a=document.querySelector(list).getBoundingClientRect().width,b=document.querySelector('.form-editor-slot').getBoundingClientRect().width;return Math.abs(a/(a+b)-expected)<.015;},{list,expected});
 const overflow=async()=>assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const mobileGeometry=async()=>{
  await p.waitForFunction(()=>{const a=document.querySelector('.form-panel-footer').getBoundingClientRect(),b=document.querySelector('.dock-wrapper').getBoundingClientRect();return a.bottom<=b.top+1;});
  const before=await p.locator('.form-panel-header').boundingBox();await p.locator('.form-panel-body').evaluate(e=>e.scrollTop=e.scrollHeight);assert.deepEqual(await p.locator('.form-panel-header').boundingBox(),before);await p.locator('.form-panel-body').evaluate(e=>e.scrollTop=0);
 };
 const capture=async(name)=>p.screenshot({path:`${out}/${name}.png`,animations:'disabled'});
 const editor=()=>p.locator('.form-panel');
 const consultationGeometry=async()=>{
  await p.locator('.slide-panel-inline').waitFor();
  const panel=await p.locator('.slide-panel').boundingBox();assert.ok(Math.abs(panel.y+panel.height-800)<2,JSON.stringify(panel));
  const body=p.locator('.slide-panel-body');await body.evaluate(e=>e.scrollTop=e.scrollHeight);
  const footer=await p.locator('.slide-panel-footer').boundingBox(),dock=await p.locator('.dock-wrapper').boundingBox();assert.ok(footer.y+footer.height<=dock.y,JSON.stringify({footer,dock}));
  for(const button of await p.locator('.slide-panel-footer button').all())assert.ok(await button.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));
 };
 const geometry=async()=>{
  await p.locator('.form-workspace').evaluate(async e=>{await Promise.all(e.getAnimations().map(a=>a.finished.catch(()=>{})));});
  const panel=await editor().boundingBox();assert.ok(Math.abs(panel.y+panel.height-800)<2,JSON.stringify(panel));
  const before=await p.locator('.form-panel-header').boundingBox();await p.locator('.form-panel-body').evaluate(e=>e.scrollTop=e.scrollHeight);assert.deepEqual(await p.locator('.form-panel-header').boundingBox(),before);
  const footer=await p.locator('.form-panel-footer').boundingBox(),dock=await p.locator('.dock-wrapper').boundingBox();assert.ok(footer.y+footer.height<=dock.y,JSON.stringify({footer,dock}));
  for(const button of await p.locator('.form-panel-footer button').all())assert.ok(await button.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));
  assert.ok(await p.evaluate(()=>document.documentElement.scrollHeight<=innerHeight));
  await p.locator('.form-panel-body').evaluate(e=>e.scrollTop=0);
 };
 console.log('clientes');await p.goto(`${preview}/clients`);await p.locator('#client-open-1').waitFor();await p.locator('#clients-create').click();await editor().waitFor();await ratio('.clients-list-panel',.25);await geometry();
 await p.getByLabel('Prénom').fill('Nouvelle');await p.getByLabel(/^Nom/).fill('Cliente');await p.locator('#clients-filter-toggle').click();await p.locator('#clients-search').fill('Introuvable');assert.equal(await p.getByLabel('Prénom').inputValue(),'Nouvelle');await p.locator('#clients-search').fill('');
 console.log('cliente saisie');await capture('cliente-1280');await p.locator('.form-panel-close').click();await p.getByRole('dialog').waitFor();await p.getByRole('button',{name:'Annuler',exact:true}).last().click();assert.equal(await p.getByLabel('Prénom').inputValue(),'Nouvelle');
 await p.locator('.atelier-dock').getByRole('link',{name:'Papiers'}).click();assert.equal(new URL(p.url()).pathname,'/clients');
 failSave=true;await editor().getByRole('button',{name:'Créer',exact:true}).click();await p.getByText('Erreur recette',{exact:true}).waitFor();assert.equal(await p.getByLabel('Prénom').inputValue(),'Nouvelle');failSave=false;
 await editor().getByRole('button',{name:'Créer',exact:true}).click();await editor().waitFor({state:'hidden'});await p.locator('#clients-create:focus').waitFor();
 await p.locator('#client-open-1').click();await consultationGeometry();await p.setViewportSize({width:1024,height:800});await consultationGeometry();await p.setViewportSize({width:1280,height:800});await consultationGeometry();await capture('consultation-cliente-1280');await p.getByRole('button',{name:'Modifier',exact:true}).click();await editor().waitFor();assert.equal(await p.getByLabel('Prénom').inputValue(),'Cliente 1');assert.ok(await p.locator('.favorite-btn').first().isDisabled());await editor().getByRole('button',{name:'Annuler',exact:true}).click();
 console.log('hors-kit');await p.goto(`${preview}/commandes/hors-kit`);await p.locator('#commande-open-1').waitFor();await p.locator('#commande-open-1').click();await consultationGeometry();await capture('consultation-hors-kit-1280');await p.locator('#commandes-create-hors-kit').click();await editor().waitFor();await editor().getByLabel(/^Cliente/).selectOption('1');await p.getByLabel('Montant',{exact:false}).fill('81');await ratio('.commandes-list-panel',.25);await geometry();await capture('hors-kit-1280');
 await p.locator('#commandes-list-content').evaluate(e=>e.scrollTop=e.scrollHeight);assert.ok(await p.locator('#commandes-list-content').evaluate(e=>e.scrollTop>0));
 await p.locator('.form-panel-close').click();await p.getByRole('button',{name:'Abandonner',exact:true}).click();await editor().waitFor({state:'hidden'});await p.locator('#commandes-create-hors-kit:focus').waitFor();
 console.log('kit');await p.locator('#commandes-create-kit').click();await editor().waitFor();await p.getByLabel('Cliente *',{exact:true}).selectOption('1');await p.getByLabel('Catalogue *',{exact:true}).selectOption('1');await p.getByRole('radio',{name:/Format C/}).check();await ratio('.commandes-list-panel',.25);await geometry();await overflow();await capture('kit-1280');await p.locator('.form-panel-body').evaluate(e=>e.scrollTop=e.scrollHeight);await capture('kit-actions-1280');await p.locator('.form-panel-body').evaluate(e=>e.scrollTop=0);
 for(const width of [1024,901,800,375]) {await p.setViewportSize({width,height:800});await overflow();if(width>900)await geometry();else {await editor().evaluate(e=>e.scrollIntoView({block:'start'}));const a=await editor().boundingBox(),b=await p.locator('.commandes-list-panel').boundingBox();assert.ok(a.y<b.y);await mobileGeometry();}await capture(`kit-${width}`);}
 await p.setViewportSize({width:1280,height:800});
 await p.locator('.commandes-pages').getByRole('link',{name:/Kits/}).click();assert.equal(new URL(p.url()).pathname,'/commandes/hors-kit');assert.ok(await editor().isVisible());
 acceptDialog=true;await p.locator('.commandes-pages').getByRole('link',{name:/Kits/}).click();await editor().waitFor({state:'hidden'});await p.waitForURL('**/commandes/kits');assert.equal(new URL(p.url()).pathname,'/commandes/kits');acceptDialog=false;
 console.log('clientes');await p.goto(`${preview}/clients`);await p.locator('#clients-create').click();await editor().waitFor();for(const width of [1024,800,375]) {await p.setViewportSize({width,height:800});await overflow();if(width<=900){await editor().evaluate(e=>e.scrollIntoView({block:'start'}));await mobileGeometry();}await capture(`cliente-${width}`);}
 await p.locator('.form-panel-close').click();await editor().waitFor({state:'hidden'});await p.locator('#clients-create').click();await editor().waitFor();await mobileGeometry();assert.ok(await editor().getByRole('button',{name:'Créer',exact:true}).isVisible());
 assert.deepEqual(errors,[]);console.log('Recette formulaires réussie');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
