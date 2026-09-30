const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');
const Database = require('better-sqlite3');
const { applyMigrations } = require('../src/db/migrations');

let baseUrl;
let db;
let databasePath;
let directory;
let server;
let sequence = 0;

before(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-fournitures-'));
  databasePath = path.join(directory, 'app.db');
  const bootstrap = new Database(databasePath);
  bootstrap.exec(fs.readFileSync(path.resolve(__dirname, '../../db/schema.sql'), 'utf8'));
  bootstrap.close();
  process.env.STAMP_DB_PATH = databasePath;
  const app = require('../src/app');
  db = require('../src/db/connection');
  await new Promise((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', error => error ? reject(error) : resolve());
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  if (server?.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  db?.close();
  delete process.env.STAMP_DB_PATH;
  if (directory) fs.rmSync(directory, { recursive: true, force: true });
});

async function api(route, method = 'GET', body, status = 200) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const result = response.status === 204 ? null : await response.json();
  assert.equal(response.status, status, `${method} ${route}: ${JSON.stringify(result)}`);
  return result;
}

async function fixture({ paperIds, paperNames, rubanName, specialName, embellishmentName } = {}) {
  const suffix = ++sequence;
  const client = await api('/clients', 'POST', { nom: `Workflow ${suffix}`, prenom: `Cliente ${suffix}` }, 201);
  let catalogue = await api('/catalogues', 'POST', {
    titre: `Workflow catalogue ${suffix}`,
    papier_spe: specialName ?? `Spécial ${suffix}`,
    embellissement: embellishmentName ?? `Embellissement ${suffix}`
  }, 201);
  const resolvedPaperIds = paperIds || [];
  for (let index = 0; index < 2; index += 1) {
    const collection = await api(`/catalogues/${catalogue.id}/collections`, 'POST', { nom: `Collection ${suffix}-${index}` }, 201);
    if (!resolvedPaperIds[index]) {
      resolvedPaperIds[index] = (await api('/papiers-cartonnes', 'POST', {
        nom: paperNames?.[index] ?? `Papier ${suffix}-${index}`
      }, 201)).id;
    }
    await api(`/collections/${collection.id}/papiers`, 'PUT', { papier_ids: [resolvedPaperIds[index]] });
  }
  if (rubanName) await api(`/catalogues/${catalogue.id}/rubans`, 'POST', { nom: rubanName }, 201);
  catalogue = await api(`/catalogues/${catalogue.id}/publication`, 'POST', {});
  return { client, catalogue, paperIds: resolvedPaperIds };
}

function payload(fixtureData, extra = {}) {
  const [first, second] = fixtureData.catalogue.collections;
  return {
    client_id: fixtureData.client.id,
    type: 'kit',
    catalogue_id: fixtureData.catalogue.id,
    format_type: 'A',
    methode_paiement: 'virement',
    commande_collections: [
      { collection_id: first.id, nb_feuilles: 2, papiers: [{ papier_cartonne_id: first.papiers[0].id, quantite_base: 2 }] },
      { collection_id: second.id, nb_feuilles: 3, papiers: [{ papier_cartonne_id: second.papiers[0].id, quantite_base: 3 }] }
    ],
    ...(fixtureData.catalogue.rubans[0] ? { ruban_id: fixtureData.catalogue.rubans[0].id } : {}),
    ...extra
  };
}

function replacement(body) {
  const { client_id, type, ...data } = body;
  return data;
}

function group(workflow, type, nom, etat = 'À traiter') {
  return workflow.groupes.find(item => item.type === type && item.nom === nom && item.etat === etat);
}

test('création : chaque type et quantité devient une unité persistante et les catalogues sont regroupés', async () => {
  const names = {
    papers: [`Papier quantité A ${++sequence}`, `Papier quantité B ${++sequence}`],
    ribbon: `Ruban commun ${++sequence}`,
    special: `Spécial commun ${++sequence}`,
    embellishment: `Embellissement commun ${++sequence}`
  };
  const first = await fixture({
    paperNames: names.papers,
    rubanName: names.ribbon,
    specialName: names.special,
    embellishmentName: names.embellishment
  });
  const firstBody = payload(first, { papier_supplementaire: true });
  await api('/commandes', 'POST', firstBody, 201);

  let workflow = await api('/fournitures');
  assert.equal(group(workflow, 'papier_collection', names.papers[0]).quantite, 4);
  assert.equal(group(workflow, 'papier_collection', names.papers[1]).quantite, 6);
  assert.equal(group(workflow, 'ruban', names.ribbon).quantite, 1);
  assert.equal(group(workflow, 'papier_special', names.special).quantite, 1);
  assert.equal(group(workflow, 'embellissement', names.embellishment).quantite, 1);
  assert.ok(workflow.groupes.every(item => item.etat === 'À traiter'));

  const second = await fixture({
    paperIds: [...first.paperIds],
    rubanName: names.ribbon,
    specialName: names.special,
    embellishmentName: names.embellishment
  });
  await api('/commandes', 'POST', payload(second), 201);
  workflow = await api('/fournitures');
  assert.equal(group(workflow, 'papier_collection', names.papers[0]).quantite, 6);
  assert.equal(group(workflow, 'papier_collection', names.papers[1]).quantite, 9);
  assert.equal(group(workflow, 'ruban', names.ribbon).quantite, 2);
  assert.equal(group(workflow, 'papier_special', names.special).quantite, 2);
  assert.equal(group(workflow, 'embellissement', names.embellishment).quantite, 2);

  const reopened = new Database(databasePath, { readonly: true });
  try {
    assert.equal(reopened.prepare('SELECT COUNT(*) AS count FROM fourniture_unites').get().count >= 21, true);
  } finally {
    reopened.close();
  }
});

test('déplacements partiels/complets : les plus anciennes unités bougent atomiquement dans les deux sens', async () => {
  const materialName = `Papier mouvements ${++sequence}`;
  const f = await fixture({ paperNames: [materialName, `Papier secondaire ${++sequence}`] });
  await api('/commandes', 'POST', payload(f), 201);
  const beforeIds = db.prepare(`
    SELECT id FROM fourniture_unites
    WHERE type='papier_collection' AND nom=? ORDER BY id
  `).all(materialName).map(row => row.id);

  await api('/fournitures/deplacement', 'PATCH', {
    type: 'papier_collection', nom: materialName,
    etat_source: 'À traiter', etat_cible: 'Commandé', quantite: 1
  });
  assert.deepEqual(db.prepare(`
    SELECT id FROM fourniture_unites WHERE type='papier_collection' AND nom=? AND etat='Commandé'
  `).all(materialName).map(row => row.id), [beforeIds[0]]);

  await api('/fournitures/deplacement', 'PATCH', {
    type: 'papier_collection', nom: materialName,
    etat_source: 'Commandé', etat_cible: 'À traiter', quantite: 1
  });
  await api('/fournitures/deplacement', 'PATCH', {
    type: 'papier_collection', nom: materialName,
    etat_source: 'À traiter', etat_cible: 'Traité', quantite: 2
  });
  assert.equal(group(await api('/fournitures'), 'papier_collection', materialName, 'Traité').quantite, 2);

  const snapshot = db.prepare(`SELECT id,etat,archive FROM fourniture_unites WHERE type='papier_collection' AND nom=? ORDER BY id`).all(materialName);
  await api('/fournitures/deplacement', 'PATCH', {
    type: 'papier_collection', nom: materialName,
    etat_source: 'À traiter', etat_cible: 'Disponible', quantite: 1
  }, 409);
  assert.deepEqual(db.prepare(`SELECT id,etat,archive FROM fourniture_unites WHERE type='papier_collection' AND nom=? ORDER BY id`).all(materialName), snapshot);
});

test('archivage traité : masquage définitif et aucune régénération lors d’une resynchronisation', async () => {
  const materialName = `Papier archive ${++sequence}`;
  const f = await fixture({ paperNames: [materialName, `Papier archive secondaire ${++sequence}`] });
  const body = payload(f);
  const order = await api('/commandes', 'POST', body, 201);
  await api('/fournitures/archivage', 'POST', { type: 'papier_collection', nom: materialName, quantite: 1 }, 409);
  await api('/fournitures/deplacement', 'PATCH', {
    type: 'papier_collection', nom: materialName,
    etat_source: 'À traiter', etat_cible: 'Traité', quantite: 1
  });
  await api('/fournitures/archivage', 'POST', { type: 'papier_collection', nom: materialName, quantite: 1 });
  assert.equal(group(await api('/fournitures'), 'papier_collection', materialName, 'Traité'), undefined);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM fourniture_unites WHERE commande_id=? AND type=? AND nom=?').get(order.id, 'papier_collection', materialName).count, 2);

  await api(`/commandes/${order.id}`, 'PUT', replacement(body));
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM fourniture_unites WHERE commande_id=? AND type=? AND nom=?').get(order.id, 'papier_collection', materialName).count, 2);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM fourniture_unites WHERE commande_id=? AND type=? AND nom=? AND archive=1').get(order.id, 'papier_collection', materialName).count, 1);
});

test('modification : pending ajusté, états engagés conservés, ancienne identité et surplus alertés', async () => {
  const oldName = `Ancienne identité ${++sequence}`;
  const f = await fixture({ paperNames: [oldName, `Papier identité secondaire ${++sequence}`] });
  const body = payload(f, { papier_supplementaire: true });
  const order = await api('/commandes', 'POST', body, 201);
  await api('/fournitures/deplacement', 'PATCH', {
    type: 'papier_collection', nom: oldName,
    etat_source: 'À traiter', etat_cible: 'Commandé', quantite: 3
  });

  const reduced = await api(`/commandes/${order.id}`, 'PUT', replacement({ ...body, papier_supplementaire: false }));
  assert.deepEqual(reduced.workflow_avertissements.map(item => [item.code, item.quantite]), [['surplus', 1]]);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM fourniture_unites WHERE commande_id=? AND nom=?').get(order.id, oldName).count, 3);

  const newName = `${oldName} renommée`;
  await api(`/papiers-cartonnes/${f.paperIds[0]}`, 'PUT', { nom: newName });
  const changed = await api(`/commandes/${order.id}`, 'PUT', replacement({ ...body, papier_supplementaire: false }));
  assert.deepEqual(changed.workflow_avertissements.map(item => [item.code, item.quantite]), [['ancien_besoin', 3]]);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM fourniture_unites WHERE commande_id=? AND nom=? AND etat='Commandé'").get(order.id, oldName).count, 3);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM fourniture_unites WHERE commande_id=? AND nom=? AND etat='À traiter'").get(order.id, newName).count, 2);
});

test('suppression : pending retiré, engagé anonymisé et alerte persistante exposée', async () => {
  const materialName = `Papier suppression ${++sequence}`;
  const f = await fixture({ paperNames: [materialName, `Papier suppression secondaire ${++sequence}`] });
  const order = await api('/commandes', 'POST', payload(f), 201);
  await api('/fournitures/deplacement', 'PATCH', {
    type: 'papier_collection', nom: materialName,
    etat_source: 'À traiter', etat_cible: 'Expédié', quantite: 1
  });
  const deletion = await api(`/commandes/${order.id}`, 'DELETE');
  assert.equal(deletion.supprimee, true);
  assert.deepEqual(deletion.workflow_avertissements.map(item => [item.code, item.quantite]), [
    ['commande_supprimee', 1]
  ]);
  assert.deepEqual(db.prepare('SELECT commande_id,etat FROM fourniture_unites WHERE type=? AND nom=?').all('papier_collection', materialName), [
    { commande_id: null, etat: 'Expédié' }
  ]);

  const workflow = await api('/fournitures');
  const serialized = JSON.stringify(workflow);
  assert.equal(serialized.includes(f.client.nom), false);
  assert.equal(serialized.includes(f.client.prenom), false);
  assert.equal(serialized.includes('commande_id'), false);
  assert.equal(serialized.includes('client_id'), false);
  assert.equal(workflow.alertes.some(alert => alert.nom === materialName && alert.code === 'commande_supprimee'), true);
});

test('migration sans backfill et première modification d’une ancienne commande', async () => {
  const migrationDb = new Database(':memory:');
  try {
    applyMigrations(migrationDb, { targetVersion: 3 });
    migrationDb.exec(`
      INSERT INTO clients(id,nom,prenom) VALUES (1,'Ancienne','Cliente');
      INSERT INTO catalogues(id,titre,papier_spe,statut,prix_A_cents,prix_B_cents,prix_C_cents)
        VALUES (1,'Ancien catalogue','Spécial','publie',3500,4000,4500);
      INSERT INTO commandes(id,client_id,type,catalogue_id,catalogue_titre,format_type,
        prix_format_cents,prix_option_cents,prix_applique_cents,prix_origine,papier_spe_nom,papier_spe_quantite)
        VALUES (1,1,'kit',1,'Ancien catalogue','C',4500,0,4500,'automatique','Spécial',1);
    `);
    applyMigrations(migrationDb);
    assert.equal(migrationDb.prepare('SELECT COUNT(*) AS count FROM fourniture_unites').get().count, 0);
  } finally {
    migrationDb.close();
  }

  const f = await fixture({ paperNames: [`Papier ancien ${++sequence}`, `Papier ancien secondaire ${++sequence}`] });
  const body = payload(f);
  const order = await api('/commandes', 'POST', body, 201);
  db.prepare('DELETE FROM fourniture_unites WHERE commande_id=?').run(order.id);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM fourniture_unites WHERE commande_id=?').get(order.id).count, 0);
  await api(`/commandes/${order.id}`, 'PUT', replacement(body));
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM fourniture_unites WHERE commande_id=?').get(order.id).count, 7);
});

test('atomicité : un échec de génération annule aussi la commande', async () => {
  const f = await fixture({ paperNames: [`Papier atomicité ${++sequence}`, `Papier atomicité secondaire ${++sequence}`] });
  const before = db.prepare('SELECT COUNT(*) AS count FROM commandes').get().count;
  db.exec(`
    CREATE TRIGGER fail_workflow_insert
    BEFORE INSERT ON fourniture_unites
    BEGIN SELECT RAISE(ABORT, 'echec workflow test'); END;
  `);
  try {
    await api('/commandes', 'POST', payload(f), 500);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM commandes').get().count, before);
  } finally {
    db.exec('DROP TRIGGER fail_workflow_insert');
  }

  const body = payload(f, { papier_supplementaire: true });
  const order = await api('/commandes', 'POST', body, 201);
  const beforeUnits = db.prepare(`
    SELECT id,type,nom,etat,archive FROM fourniture_unites
    WHERE commande_id=? ORDER BY id
  `).all(order.id);
  db.exec(`
    CREATE TRIGGER fail_order_update
    BEFORE UPDATE ON commandes WHEN OLD.id=${order.id}
    BEGIN SELECT RAISE(ABORT, 'echec update test'); END;
  `);
  try {
    await api(`/commandes/${order.id}`, 'PUT', replacement({ ...body, papier_supplementaire: false }), 500);
    assert.deepEqual(db.prepare(`
      SELECT id,type,nom,etat,archive FROM fourniture_unites
      WHERE commande_id=? ORDER BY id
    `).all(order.id), beforeUnits);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM fourniture_alertes WHERE commande_id=?').get(order.id).count, 0);
  } finally {
    db.exec('DROP TRIGGER fail_order_update');
  }
});
