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
 const p=await browser.newPage({viewport:{width:1280,height:800}});p.setDefaultTimeout(5000);const errors=[];let dialogs=0;p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>{dialogs++;d.dismiss()});let failSave=false,releaseSave;
 await p.route('**/api/**',async r=>{
  const u=new URL(r.request().url()),m=r.request().method(),body=()=>r.request().postDataJSON();
  const json=(v,status=200)=>r.fulfill({json:v,status});
  if(u.pathname==='/api/clients') {if(m==='POST'){if(failSave)return json({error:'Erreur recette'},409);const c={...clients[0],...body(),id:50};clients.push(c);return json(c,201);}return json(clients);}
  const client=u.pathname.match(/^\/api\/clients\/(\d+)$/);if(client){const c=clients.find(c=>c.id===+client[1]);if(m==='PUT')Object.assign(c,body());return json(c);}
  if(u.pathname.match(/^\/api\/clients\/\d+\/commandes$/))return json([]);
  if(u.pathname==='/api/commandes'){if(m==='POST'){if(failSave)return json({error:'Erreur recette'},409);await new Promise(resolve=>{releaseSave=resolve});const o={...common,...body(),id:100+orders.length,client:clients.find(c=>c.id===body().client_id)};orders.push(o);return json(o,201);}return json(orders);}
  const order=u.pathname.match(/^\/api\/commandes\/(\d+)$/);if(order){const o=orders.find(o=>o.id===+order[1]);if(m==='PUT')Object.assign(o,body());return json(o);}
  if(u.pathname==='/api/catalogues')return json([catalogue]);
  if(u.pathname==='/api/catalogues/1')return json(catalogue);
  if(u.pathname==='/api/settings')return json({prix_A_cents:1800,prix_B_cents:1400,prix_C_cents:900});
  if(u.pathname.includes('/workflow'))return json({piles:[],alertes:[]});
  return json([]);
 });

 for(const [from,type,expected] of [['/','kit','/'],['/','hors_kit','/commandes/hors-kit'],['/commandes/hors-kit','kit','/commandes/kits'],['/commandes/kits','hors_kit','/commandes/hors-kit'],['/commandes/kits','kit','/commandes/kits'],['/commandes/hors-kit','hors_kit','/commandes/hors-kit']]){
  await p.goto(preview+from);await p.locator(type==='kit'?'#commandes-create-kit':'#commandes-create-hors-kit').click();
  const editor=p.locator('.form-panel');await editor.getByLabel('Cliente *',{exact:true}).selectOption('1');
  if(type==='kit'){await editor.getByLabel('Catalogue *',{exact:true}).selectOption('1');await editor.getByRole('radio',{name:/Format C/}).check();await editor.getByLabel('Collection *',{exact:true}).selectOption('11');await editor.getByLabel('Méthode de paiement *',{exact:true}).selectOption({index:1});}
  else await editor.getByLabel('Montant',{exact:false}).fill('81');
  const before=orders.length;releaseSave=undefined;await editor.getByRole('button',{name:type==='kit'?'Créer le kit':'Créer',exact:true}).click();
  await p.waitForFunction(()=>document.querySelector('.form-panel-close')?.disabled);
  await p.locator('.atelier-dock').getByRole('link',{name:'Papiers',exact:true}).click();
  assert.equal(new URL(p.url()).pathname,from);assert.ok(await editor.isVisible());
  assert.equal(typeof releaseSave,'function');releaseSave();await editor.waitFor({state:'hidden'});
  const saved=orders.at(-1);assert.equal(orders.length,before+1);
  await p.waitForURL(u=>u.pathname===expected&&u.searchParams.get('commande')===String(saved.id));
  await p.locator('.slide-panel').waitFor();assert.equal(saved.type,type);assert.equal(dialogs,0);
  await p.locator('.slide-panel-close').click();await p.locator('.slide-panel').waitFor({state:'hidden'});
  await p.locator('#commande-open-'+saved.id).waitFor();assert.equal(new URL(p.url()).pathname,expected);
  console.log('OK',from,'->',type,expected);
 }
 assert.deepEqual(errors,[]);console.log('Recette navigation après sauvegarde réussie');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
