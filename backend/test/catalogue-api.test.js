const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');
const Database = require('better-sqlite3');

let baseUrl;
let databaseConnection;
let server;
let tempDirectory;

before(async () => {
  tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-backend-test-'));
  const databasePath = path.join(tempDirectory, 'app.db');
  const schemaPath = path.resolve(__dirname, '../../db/schema.sql');

  const bootstrapDatabase = new Database(databasePath);
  bootstrapDatabase.exec(fs.readFileSync(schemaPath, 'utf8'));
  bootstrapDatabase.close();

  process.env.STAMP_DB_PATH = databasePath;

  const app = require('../src/app');
  databaseConnection = require('../src/db/connection');
  await new Promise((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server?.listening) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  if (databaseConnection) {
    databaseConnection.close();
  }
  delete process.env.STAMP_DB_PATH;

  if (tempDirectory) {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
});

async function api(route, method = 'GET', body, status = 200) {
  const response = await fetch(`${baseUrl}/api${route}`, {
    method, headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const result = await response.json();
  assert.equal(response.status, status, `${method} ${route}: ${JSON.stringify(result)}`);
  return result;
}
let seq = 0;
async function catalogue(extra = {}) {
  return api('/catalogues', 'POST', { titre: `Noël créatif ${++seq}`, ...extra }, 201);
}
async function papier() { return api('/papiers-cartonnes', 'POST', { nom: `Papier ${++seq}` }, 201); }
async function collection(cat, ids) {
  const col = await api(`/catalogues/${cat.id}/collections`, 'POST', { nom: `Collection ${++seq}` }, 201);
  if (ids) await api(`/collections/${col.id}/papiers`, 'PUT', { papier_ids: ids });
  return col;
}
async function publish(cat, status = 200) { return api(`/catalogues/${cat.id}/publication`, 'POST', {}, status); }

test('tarifs strictement en centimes, mise à jour atomique et copie indépendante', async () => {
  assert.deepEqual(await api('/settings'), { prix_A_cents: 3500, prix_B_cents: 4000, prix_C_cents: 4500 });
  await api('/settings', 'PUT', { prix_A_cents: 0, prix_B_cents: 10000, prix_C_cents: 3525 });
  const old = await catalogue();
  for (const value of [-1, 1.5, 10001, null, true, '3500', {}, []]) {
    await api('/settings', 'PUT', { prix_A_cents: 999, prix_B_cents: value }, 400);
    assert.equal((await api('/settings')).prix_A_cents, 0);
    await api(`/catalogues/${old.id}`, 'PUT', { titre: 'Ne pas appliquer', prix_C_cents: value }, 400);
    assert.equal((await api(`/catalogues/${old.id}`)).titre, old.titre);
  }
  for (const body of [{}, { prix_A: 35 }, { prix_A_cents: 3500, prix_B: 40 }, [], null]) await api('/settings', 'PUT', body, 400);
  await api('/settings', 'PUT', { prix_A_cents: 1234 });
  assert.equal((await catalogue()).prix_A_cents, 1234);
  assert.equal((await api(`/catalogues/${old.id}`)).prix_A_cents, 0);
  assert.equal(old.prix_C_cents, 3525);
  for (const titre of ['', '  ', null, 12, {}]) await api('/catalogues', 'POST', { titre }, 400);
  await api('/catalogues', 'POST', { titre: old.titre }, 409);
  await api('/catalogues', 'POST', { titre: 'Contournement', statut: 'publie' }, 400);
  await api('/catalogues', 'POST', { titre: 'Tarif ignoré', prix_A_cents: 10 }, 400);
});

test('publication exige matériaux, collections et papiers ; un brouillon valide reste brouillon', async () => {
  for (const materials of [{ papier_spe: 'Spécial' }, { embellissement: 'Bijou' }, { papier_spe: 'S', embellissement: 'E' }]) {
    const cat = await catalogue(materials);
    await publish(cat, 400);
    const p = await papier();
    const col = await collection(cat);
    await publish(cat, 400);
    await api(`/catalogues/collections/${col.id}/papiers`, 'PUT', { papier_ids: [p.id] });
    const valid = await api(`/catalogues/${cat.id}`);
    assert.equal(valid.statut, 'brouillon');
    assert.deepEqual(valid.formats_disponibles, []);
    assert.deepEqual((await publish(cat)).formats_disponibles, ['C']);
    await api(`/catalogues/${cat.id}`, 'PUT', { papier_spe: ' ', embellissement: null });
    assert.equal((await api(`/catalogues/${cat.id}`)).statut, 'brouillon');
    await api(`/catalogues/${cat.id}`, 'PUT', { embellissement: 'Rétabli' });
    assert.equal((await api(`/catalogues/${cat.id}`)).statut, 'brouillon');
  }
  const noMaterial = await catalogue();
  await collection(noMaterial, [(await papier()).id]);
  await publish(noMaterial, 400);
  // Schéma autorise les tarifs absents pour des brouillons hérités/importés.
  databaseConnection.prepare('UPDATE catalogues SET prix_A_cents=NULL WHERE id=?').run(noMaterial.id);
  await api(`/catalogues/${noMaterial.id}`, 'PUT', { papier_spe: 'S' });
  await publish(noMaterial, 400);
  await api(`/catalogues/${noMaterial.id}`, 'PUT', { prix_A_cents: 0 });
  await publish(noMaterial);
});

test('maxima et associations refusées sans mutation ni démotion ; bibliothèque réutilisable', async () => {
  const cat = await catalogue({ papier_spe: 'Spécial' });
  const papers = await Promise.all(Array.from({ length: 6 }, () => papier()));
  const col = await collection(cat, papers.slice(0, 5).map(p => p.id));
  await publish(cat);
  const original = await api(`/catalogues/${cat.id}`);
  for (const ids of [papers.map(p => p.id), [papers[0].id, papers[0].id], ['1'], [0], [1.2], [999999]]) {
    await api(`/collections/${col.id}/papiers`, 'PUT', { papier_ids: ids }, ids[0] === 999999 ? 404 : 400);
    assert.deepEqual(await api(`/catalogues/${cat.id}`), original);
  }
  const other = await catalogue({ embellissement: 'E' });
  await collection(other, [papers[0].id]);
  for (let i = 0; i < 3; i++) await collection(cat, [papers[0].id]);
  assert.equal((await api(`/catalogues/${cat.id}`)).statut, 'brouillon');
  assert.deepEqual((await publish(cat)).formats_disponibles, ['A', 'B', 'C']);
  await api(`/catalogues/${cat.id}/collections`, 'POST', { nom: 'Cinquième' }, 400);
  await api('/collections', 'POST', { catalogue_id: cat.id, nom: 'Cinquième alias' }, 400);
  for (let i = 0; i < 2; i++) await api(`/catalogues/${cat.id}/rubans`, 'POST', { nom: `Ruban ${i}` }, 201);
  await api(`/catalogues/${cat.id}/rubans`, 'POST', { nom: 'Troisième' }, 400);
  const stable = await api(`/catalogues/${cat.id}`);
  assert.equal(stable.statut, 'publie');
  assert.equal(stable.collections.length, 4);
  assert.equal(stable.rubans.length, 2);
  for (const body of [{ nom: '' }, { nom: 23 }, { nom: ' ', archive: true }]) {
    await api(`/catalogues/${cat.id}/rubans`, 'POST', body, 400);
    await api(`/catalogues/collections/${col.id}`, 'PUT', body, 400);
    await api('/papiers-cartonnes', 'POST', body, 400);
  }
  await api(`/catalogues/collections/${col.id}/papiers`, 'PUT', { papier_ids: [] });
  assert.equal((await api(`/catalogues/${cat.id}`)).statut, 'brouillon');
  await api(`/collections/${col.id}/papiers`, 'PUT', { papier_ids: [papers[0].id] });
  assert.equal((await api(`/catalogues/${cat.id}`)).statut, 'brouillon');
  await api('/collections', 'POST', { nom: 'Sans catalogue' }, 400);
  const alias = await api('/collections', 'POST', { catalogue_id: other.id, nom: 'Avec catalogue' }, 201);
  assert.equal(alias.catalogue_id, other.id);
});

test('archivage strict, restauration sans publication et commandes interdites aux clientes archivées', async () => {
  const cat = await catalogue({ embellissement: 'E' });
  await collection(cat, [(await papier()).id]);
  await publish(cat);
  const client = await api('/clients', 'POST', { nom: 'Archivage', prenom: 'Test' }, 201);
  for (const route of [`/clients/${client.id}/archivage`, `/catalogues/${cat.id}/archivage`]) {
    for (const body of [{}, { archive: 1 }, { archive: 'true' }, { archive: null }, { archive: true, autre: 1 }, []]) await api(route, 'PATCH', body, 400);
    await api(route, 'PATCH', { archive: true });
  }
  assert.ok(!(await api('/clients')).some(c => c.id === client.id));
  assert.ok((await api('/clients?include_archives=true')).some(c => c.id === client.id));
  assert.equal((await api(`/clients/${client.id}`)).archive, 1);
  assert.ok(!(await api('/catalogues')).some(c => c.id === cat.id));
  assert.ok((await api('/catalogues?include_archives=true')).some(c => c.id === cat.id));
  assert.ok(!(await api('/catalogues?utilisables=true&include_archives=true')).some(c => c.id === cat.id));
  await publish(cat, 409);
  await api('/commandes', 'POST', { client_id: client.id, type: 'hors_kit', montant: 80 }, 409);
  assert.equal((await api(`/clients/${client.id}`)).points_fidelite, 0);
  await api(`/clients/${client.id}/archivage`, 'PATCH', { archive: false });
  await api('/commandes', 'POST', { client_id: client.id, type: 'hors_kit', montant: 10 }, 201);
  const restored = await api(`/catalogues/${cat.id}/archivage`, 'PATCH', { archive: false });
  assert.equal(restored.statut, 'brouillon');
  assert.deepEqual(restored.formats_disponibles, []);
  assert.equal(restored.collections.length, 1);
  await publish(cat);
  assert.ok((await api('/catalogues?utilisables=true')).some(c => c.id === cat.id));
});

test('IDs, références et types invalides répondent 400/404 et sources non supprimables', async () => {
  for (const id of ['abc', '1oops', '1.5', '0', '-1']) {
    await api(`/catalogues/${id}`, 'GET', undefined, 400);
    await api(`/clients/${id}/archivage`, 'PATCH', { archive: true }, 400);
  }
  for (const [route, method, body] of [
    ['/catalogues/999999', 'PUT', { titre: 'Absent' }],
    ['/catalogues/999999/publication', 'POST', {}],
    ['/catalogues/999999/archivage', 'PATCH', { archive: false }],
    ['/clients/999999/archivage', 'PATCH', { archive: true }],
    ['/collections/999999/papiers', 'PUT', { papier_ids: [] }],
    ['/catalogues/999999/collections', 'POST', { nom: 'C' }],
    ['/catalogues/999999/rubans', 'POST', { nom: 'R' }],
    ['/catalogues/rubans/999999', 'PUT', { nom: 'R' }],
    ['/papiers-cartonnes/999999', 'PUT', { nom: 'P' }]
  ]) await api(route, method, body, 404);
  for (const route of ['/clients/1', '/catalogues/1', '/collections/1', '/catalogues/collections/1', '/catalogues/rubans/1', '/papiers-cartonnes/1']) await api(route, 'DELETE', undefined, 405);
});

test('mutations API et archivage préservent snapshots, prix, stocks et bilan', async () => {
  const client = await api('/clients', 'POST', { nom: 'Historique', prenom: 'Test' }, 201);
  const cat = await catalogue({ papier_spe: 'Spécial original' });
  const paper = await papier();
  const col = await collection(cat, [paper.id]);
  const ruban = await api(`/catalogues/${cat.id}/rubans`, 'POST', { nom: 'Ruban original' }, 201);
  await publish(cat);
  const order = databaseConnection.prepare(`INSERT INTO commandes(client_id,type,catalogue_id,catalogue_titre,format_type,
    prix_format_cents,prix_option_cents,prix_applique_cents,prix_origine,papier_spe_nom,papier_spe_quantite,created_at)
    VALUES (?,'kit',?,?,'C',3525,0,3525,'automatique','Spécial original',1,'2024-04-01')`).run(client.id, cat.id, cat.titre).lastInsertRowid;
  const line = databaseConnection.prepare('INSERT INTO commande_collections(commande_id,collection_id,collection_nom,nb_feuilles) VALUES (?,?,?,5)').run(order, col.id, col.nom).lastInsertRowid;
  databaseConnection.prepare('INSERT INTO commande_papiers_selectionnes(commande_collection_id,papier_cartonne_id,papier_nom,quantite_base) VALUES (?,?,?,5)').run(line, paper.id, paper.nom);
  databaseConnection.prepare('INSERT INTO commande_rubans(commande_id,ruban_id,ruban_nom) VALUES (?,?,?)').run(order, ruban.id, ruban.nom);
  databaseConnection.prepare('UPDATE commandes SET reglee=1 WHERE id=?').run(order);
  const detail = await api(`/commandes/${order}`);
  const stocks = await api('/stocks');
  const bilan = await api('/stocks/bilan?mois=2024-04');
  await api(`/catalogues/${cat.id}`, 'PUT', { titre: 'Nom changé', papier_spe: null, prix_C_cents: 9999 });
  await api(`/collections/${col.id}`, 'PUT', { nom: 'Collection changée' });
  await api(`/papiers-cartonnes/${paper.id}`, 'PUT', { nom: 'Papier changé' });
  await api(`/catalogues/rubans/${ruban.id}`, 'PUT', { nom: 'Ruban changé' });
  await api(`/collections/${col.id}/papiers`, 'PUT', { papier_ids: [] });
  await api(`/catalogues/${cat.id}/archivage`, 'PATCH', { archive: true });
  await api(`/clients/${client.id}/archivage`, 'PATCH', { archive: true });
  assert.deepEqual(await api(`/commandes/${order}`), detail);
  assert.deepEqual(await api('/stocks'), stocks);
  assert.deepEqual(await api('/stocks/bilan?mois=2024-04'), bilan);
  assert.equal((await api(`/clients/${client.id}/commandes`)).length, 1);
});
