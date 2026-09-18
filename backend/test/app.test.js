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

test('GET /api/health confirme le démarrage de l’API', async () => {
  const response = await fetch(`${baseUrl}/api/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 'ok',
    message: 'backend up'
  });
});

test('GET /api/clients utilise la base SQLite temporaire', async () => {
  const response = await fetch(`${baseUrl}/api/clients`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
});

test('les lectures existantes restent accessibles sur le schéma cible', async () => {
  for (const route of ['/catalogues', '/commandes', '/stocks', '/stocks/bilan?mois=2026-09', '/settings']) {
    const response = await fetch(`${baseUrl}/api${route}`);
    assert.equal(response.status, 200, route);
  }
  assert.equal(databaseConnection.pragma('foreign_keys', { simple: true }), 1);
});

test('commande hors-kit conserve la fidélité et protège la suppression après règlement', async () => {
  const client = databaseConnection.prepare("INSERT INTO clients(nom,prenom) VALUES ('Test','Cliente')").run().lastInsertRowid;
  const response = await fetch(`${baseUrl}/api/commandes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: client, type: 'hors_kit', montant: 80 })
  });
  assert.equal(response.status, 201);
  const order = await response.json();
  assert.equal(databaseConnection.prepare('SELECT points_fidelite FROM clients WHERE id=?').get(client).points_fidelite, 1);
  databaseConnection.prepare('UPDATE commandes SET reglee=1 WHERE id=?').run(order.id);
  const deletion = await fetch(`${baseUrl}/api/commandes/${order.id}`, { method: 'DELETE' });
  assert.equal(deletion.status, 409);
  assert.ok(databaseConnection.prepare('SELECT id FROM commandes WHERE id=?').get(order.id));
});

test('les lectures kit utilisent les snapshots, quantités et prix appliqué mémorisés', async () => {
  const client = databaseConnection.prepare("INSERT INTO clients(nom,prenom) VALUES ('Kit','Test')").run().lastInsertRowid;
  const catalogue = databaseConnection.prepare("INSERT INTO catalogues(titre,papier_spe) VALUES ('Test libre','Special')").run().lastInsertRowid;
  const collection = databaseConnection.prepare("INSERT INTO collections(catalogue_id,nom,ordre) VALUES (?,'Originale',1)").run(catalogue).lastInsertRowid;
  const papier = databaseConnection.prepare("INSERT INTO papiers_cartonnes(nom) VALUES ('Original')").run().lastInsertRowid;
  const ruban = databaseConnection.prepare("INSERT INTO catalogue_rubans(catalogue_id,nom,ordre) VALUES (?,'Ruban original',1)")
    .run(catalogue).lastInsertRowid;
  const order = databaseConnection.prepare(`INSERT INTO commandes(client_id,type,catalogue_id,catalogue_titre,format_type,
    papier_supplementaire,prix_format_cents,prix_option_cents,prix_applique_cents,prix_origine,
    papier_spe_nom,papier_spe_quantite,created_at,methode_paiement)
    VALUES (?,'kit',?,'Test libre','C',1,4500,350,4400,'manuelle','Special',1,'2024-03-01 00:00:00','virement')`)
    .run(client, catalogue).lastInsertRowid;
  const line = databaseConnection.prepare("INSERT INTO commande_collections(commande_id,collection_id,collection_nom,nb_feuilles) VALUES (?,?,'Originale',5)")
    .run(order, collection).lastInsertRowid;
  databaseConnection.prepare("INSERT INTO commande_papiers_selectionnes(commande_collection_id,papier_cartonne_id,papier_nom,quantite_base) VALUES (?,?,'Original',5)")
    .run(line, papier);
  databaseConnection.prepare("INSERT INTO commande_rubans(commande_id,ruban_id,ruban_nom) VALUES (?,?,'Ruban original')")
    .run(order, ruban);
  databaseConnection.prepare("UPDATE catalogue_rubans SET nom='Ruban renomme' WHERE id=?").run(ruban);
  databaseConnection.prepare("UPDATE collections SET nom='Renommee' WHERE id=?").run(collection);
  databaseConnection.prepare("UPDATE papiers_cartonnes SET nom='Renomme' WHERE id=?").run(papier);
  databaseConnection.prepare("UPDATE catalogues SET papier_spe='Nouveau',prix_C_cents=9900 WHERE id=?").run(catalogue);
  const detail = await (await fetch(`${baseUrl}/api/commandes/${order}`)).json();
  assert.equal(detail.commande_collections[0].collection_nom, 'Originale');
  assert.equal(detail.papiers_selectionnes[0].nom, 'Original');
  assert.deepEqual(detail.ruban, { ruban_id: ruban, ruban_nom: 'Ruban original', quantite: 1 });
  const stock = await (await fetch(`${baseUrl}/api/stocks`)).json();
  assert.equal(stock.papiers_cartonnes.length, 1);
  assert.equal(stock.papiers_cartonnes[0].papier_cartonne_id, papier);
  assert.equal(stock.papiers_cartonnes[0].nom, 'Original');
  assert.equal(stock.papiers_cartonnes[0].nb_feuilles_base, 5);
  assert.equal(stock.papiers_cartonnes[0].nb_feuilles, 10);
  assert.equal(stock.papier_spe.length, 1);
  assert.equal(stock.papier_spe[0].papier_spe, 'Special');
  assert.equal(stock.papier_spe[0].catalogue_id, catalogue);
  assert.equal(stock.papier_spe[0].nb_commandes, 1);
  const unpaid = await (await fetch(`${baseUrl}/api/stocks/bilan?mois=2024-03`)).json();
  assert.equal(unpaid.chiffre_affaires_cents, 0);
  databaseConnection.prepare('UPDATE commandes SET reglee=1 WHERE id=?').run(order);
  const paid = await (await fetch(`${baseUrl}/api/stocks/bilan?mois=2024-03`)).json();
  assert.equal(paid.chiffre_affaires_cents, 4400);
});

test('contrat kit sans catalogue refusé sans créer de commande partielle', async () => {
  const client = databaseConnection.prepare("INSERT INTO clients(nom,prenom) VALUES ('Ancien','Kit')").run().lastInsertRowid;
  const before = databaseConnection.prepare('SELECT count(*) AS n FROM commandes').get().n;
  const response = await fetch(`${baseUrl}/api/commandes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: client, type: 'kit', format_type: 'C', methode_paiement: 'virement' })
  });
  assert.equal(response.status, 400);
  assert.equal(databaseConnection.prepare('SELECT count(*) AS n FROM commandes').get().n, before);
});

test('les anciens endpoints DELETE ne peuvent effacer des clientes ou sources non référencées', async () => {
  const client = databaseConnection.prepare("INSERT INTO clients(nom,prenom) VALUES ('A conserver','Cliente')").run().lastInsertRowid;
  const catalogue = databaseConnection.prepare("INSERT INTO catalogues(titre) VALUES ('A conserver')").run().lastInsertRowid;
  const collection = databaseConnection.prepare("INSERT INTO collections(catalogue_id,nom,ordre) VALUES (?,'A conserver',1)")
    .run(catalogue).lastInsertRowid;
  const emptyCatalogue = databaseConnection.prepare("INSERT INTO catalogues(titre) VALUES ('Vide a conserver')").run().lastInsertRowid;
  for (const [route, table, id] of [
    [`/clients/${client}`, 'clients', client],
    [`/catalogues/${emptyCatalogue}`, 'catalogues', emptyCatalogue],
    [`/catalogues/collections/${collection}`, 'collections', collection],
    [`/collections/${collection}`, 'collections', collection]
  ]) {
    const response = await fetch(`${baseUrl}/api${route}`, { method: 'DELETE' });
    assert.equal(response.status, 405, route);
    assert.ok(databaseConnection.prepare(`SELECT id FROM ${table} WHERE id=?`).get(id));
  }
});
