const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');
const Database = require('better-sqlite3');

let baseUrl;
let db;
let server;
let directory;
let sequence = 0;

before(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-commandes-kit-'));
  const databasePath = path.join(directory, 'app.db');
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
    method, headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const result = response.status === 204 ? null : await response.json();
  assert.equal(response.status, status, `${method} ${route}: ${JSON.stringify(result)}`);
  return result;
}

async function fixture({ counts = [1, 1], rubans = 0, materials = { papier_spe: 'Papier spécial', embellissement: 'Bijou' }, prices = {} } = {}) {
  const client = await api('/clients', 'POST', { nom: `Kit ${++sequence}`, prenom: 'Test' }, 201);
  let catalogue = await api('/catalogues', 'POST', { titre: `Catalogue ${++sequence}`, ...materials }, 201);
  if (Object.keys(prices).length) await api(`/catalogues/${catalogue.id}`, 'PUT', prices);
  for (const count of counts) {
    const collection = await api(`/catalogues/${catalogue.id}/collections`, 'POST', { nom: `Collection ${++sequence}` }, 201);
    const ids = [];
    for (let i = 0; i < count; i++) ids.push((await api('/papiers-cartonnes', 'POST', { nom: `Papier ${++sequence}` }, 201)).id);
    await api(`/collections/${collection.id}/papiers`, 'PUT', { papier_ids: ids });
  }
  for (let i = 0; i < rubans; i++) await api(`/catalogues/${catalogue.id}/rubans`, 'POST', { nom: `Ruban ${++sequence}` }, 201);
  catalogue = await api(`/catalogues/${catalogue.id}/publication`, 'POST', {});
  return { client, catalogue };
}

function line(collection, contribution, papers = [{ papier_cartonne_id: collection.papiers[0].id, quantite_base: contribution }]) {
  return { collection_id: collection.id, nb_feuilles: contribution, papiers: papers };
}

function payload(f, format = 'A', extra = {}) {
  return {
    client_id: f.client.id, type: 'kit', catalogue_id: f.catalogue.id,
    format_type: format, methode_paiement: 'virement',
    commande_collections: format === 'C'
      ? [line(f.catalogue.collections[0], 5)]
      : [line(f.catalogue.collections[0], 2), line(f.catalogue.collections[1], 3)],
    ...extra
  };
}

function replacement(body) {
  const { client_id, type, ...data } = body;
  return data;
}

function counts() {
  return ['commandes', 'commande_collections', 'commande_papiers_selectionnes', 'commande_rubans']
    .map(table => db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count);
}

test('A/B accepte les répétitions, les deux répartitions 2/3 et fige toutes les sources', async () => {
  const f = await fixture({ rubans: 1 });
  for (const format of ['A', 'B']) {
    const body = payload(f, format);
    if (format === 'B') body.commande_collections = [line(f.catalogue.collections[0], 3), line(f.catalogue.collections[1], 2)];
    const order = await api('/commandes', 'POST', body, 201);
    assert.equal(order.reglee, 0);
    assert.equal(order.prix_format_cents, format === 'A' ? 3500 : 4000);
    assert.equal(order.prix_applique_cents, order.prix_format_cents);
    assert.equal(order.prix_origine, 'automatique');
    assert.equal(order.catalogue_titre, f.catalogue.titre);
    assert.equal(order.papier_spe_nom, 'Papier spécial');
    assert.equal(order.embellissement_nom, 'Bijou');
    assert.deepEqual(order.commande_collections.map(c => c.nb_feuilles), format === 'A' ? [2, 3] : [3, 2]);
    assert.deepEqual(order.papiers_selectionnes.map(p => p.quantite_base), format === 'A' ? [2, 3] : [3, 2]);
    assert.deepEqual(order.papiers_selectionnes.map(p => p.nom), f.catalogue.collections.map(c => c.papiers[0].nom));
    assert.deepEqual(order.ruban, { ruban_id: f.catalogue.rubans[0].id, ruban_nom: f.catalogue.rubans[0].nom, quantite: 1 });
  }
  const client = await api(`/clients/${f.client.id}`);
  assert.equal(client.points_fidelite, 0);
  assert.ok(client.derniere_commande);
  assert.equal((await api(`/clients/${f.client.id}/commandes`)).length, 2);
});

test('C automatise cinq papiers ou un papier ; avec trois papiers, tous doivent être présents', async () => {
  for (const count of [5, 1, 3]) {
    const f = await fixture({ counts: [count], materials: { embellissement: 'Décoration' } });
    const collection = f.catalogue.collections[0];
    const body = payload(f, 'C');
    if (count === 3) {
      body.commande_collections = [line(collection, 5, collection.papiers.map((p, i) => ({ papier_cartonne_id: p.id, quantite_base: i === 0 ? 3 : 1 })))];
    } else {
      delete body.commande_collections[0].papiers;
    }
    const order = await api('/commandes', 'POST', body, 201);
    assert.equal(order.papiers_selectionnes.reduce((sum, p) => sum + p.quantite_base, 0), 5);
    assert.equal(order.papiers_selectionnes.length, count);
    assert.equal(order.papier_spe_nom, null);
    assert.equal(order.papier_spe_quantite, 0);
    assert.equal(order.embellissement_quantite, 1);
    assert.equal(order.ruban, null);
    if (count === 3) {
      await api('/commandes', 'POST', payload(f, 'C'), 400);
      delete body.commande_collections[0].papiers;
      await api('/commandes', 'POST', body, 400);
    }
  }
});

test('option double les feuilles et les contributions, pas les matériaux ni le ruban ; suppléments dans le prix et le bilan réglé', async () => {
  const f = await fixture({ rubans: 1, prices: { prix_A_cents: 1234 } });
  const order = await api('/commandes', 'POST', payload(f, 'A', {
    papier_supplementaire: true,
    produit_promo_texte: 'Promotion', produit_promo_prix_cents: 275,
    autres_texte: 'Accessoire', autres_prix_cents: 0
  }), 201);
  assert.equal(order.prix_format_cents, 1234);
  assert.equal(order.prix_option_cents, 350);
  assert.equal(order.prix_applique_cents, 1859);
  assert.equal(order.ruban.quantite, 1);
  const stock = await api('/stocks');
  for (const [i, col] of f.catalogue.collections.entries()) {
    assert.equal(stock.papiers_cartonnes.find(p => p.nom === col.papiers[0].nom).nb_feuilles, i === 0 ? 4 : 6);
    assert.equal(stock.collections.find(c => c.nom === col.nom).total_feuilles, i === 0 ? 4 : 6);
  }
  assert.deepEqual(stock.rubans.find(r => r.nom === f.catalogue.rubans[0].nom), { nom: f.catalogue.rubans[0].nom, quantite: 1 });
  db.prepare("UPDATE commandes SET created_at='2024-01-02' WHERE id=?").run(order.id);
  assert.deepEqual(await api('/stocks/bilan?mois=2024-01'), {
    mois: '2024-01', chiffre_affaires: 0, par_methode_paiement: [], produits_promo: [], autres: []
  });
  await api(`/commandes/${order.id}/reglement`, 'PATCH', {});
  const bilan = await api('/stocks/bilan?mois=2024-01');
  assert.equal(bilan.chiffre_affaires, 18.59);
  assert.deepEqual(bilan.par_methode_paiement, [{ methode_paiement: 'virement', total: 18.59, nb_commandes: 1 }]);
  assert.deepEqual(bilan.produits_promo, [{ texte: 'Promotion', prix: 2.75, nb_fois: 1 }]);
  assert.deepEqual(bilan.autres, [{ texte: 'Accessoire', prix: 0, nb_fois: 1 }]);
});

test('papier de bibliothèque commun à deux collections conserve sa répartition et additionne ses quantités', async () => {
  const f = await fixture();
  const shared = f.catalogue.collections[0].papiers[0];
  await api(`/collections/${f.catalogue.collections[1].id}/papiers`, 'PUT', { papier_ids: [shared.id] });
  f.catalogue = await api(`/catalogues/${f.catalogue.id}`);
  const order = await api('/commandes', 'POST', payload(f, 'A', { papier_supplementaire: true }), 201);
  assert.equal(order.papiers_selectionnes.length, 2);
  assert.notEqual(order.papiers_selectionnes[0].commande_collection_id, order.papiers_selectionnes[1].commande_collection_id);
  assert.deepEqual(order.papiers_selectionnes.map(p => p.quantite_base), [2, 3]);
  assert.equal((await api('/stocks')).papiers_cartonnes.find(p => p.nom === shared.nom).nb_feuilles, 10);
});

test('cardinalité rubans : aucun, inclusion automatique du seul, choix obligatoire parmi deux', async () => {
  const foreign = await fixture({ rubans: 1 });
  for (const count of [0, 1, 2]) {
    const f = await fixture({ counts: [1], rubans: count });
    const body = payload(f, 'C');
    await api('/commandes', 'POST', { ...body, ruban_id: foreign.catalogue.rubans[0].id }, 400);
    if (count < 2) {
      const order = await api('/commandes', 'POST', body, 201);
      assert.equal(order.ruban?.quantite ?? 0, count);
      if (count === 1) await api('/commandes', 'POST', { ...body, ruban_id: f.catalogue.rubans[0].id }, 201);
    } else {
      await api('/commandes', 'POST', body, 400);
      await api('/commandes', 'POST', { ...body, ruban_id: null }, 400);
      for (const ruban of f.catalogue.rubans) {
        const order = await api('/commandes', 'POST', { ...body, ruban_id: ruban.id }, 201);
        assert.equal(order.ruban.ruban_id, ruban.id);
      }
    }
  }
});

test('compositions invalides sont refusées sans aucune écriture ni effet sur la cliente', async () => {
  const f = await fixture({ counts: [2, 1] });
  const foreign = await fixture({ counts: [1] });
  const good = payload(f);
  const first = good.commande_collections[0];
  const second = good.commande_collections[1];
  const invalid = [
    { commande_collections: null }, { commande_collections: [] }, { commande_collections: [first] },
    { commande_collections: [first, first] },
    { commande_collections: [first, line(foreign.catalogue.collections[0], 3)] },
    { commande_collections: [line(f.catalogue.collections[0], 2, [{ papier_cartonne_id: f.catalogue.collections[1].papiers[0].id, quantite_base: 2 }]), second] },
    { commande_collections: [line(f.catalogue.collections[0], 2, [{ papier_cartonne_id: first.papiers[0].papier_cartonne_id, quantite_base: 1 }]), second] },
    { commande_collections: [first, line(f.catalogue.collections[1], 2)] },
    { commande_collections: [line(f.catalogue.collections[0], 3), second] },
    { commande_collections: [{ ...first, papiers: [...first.papiers, ...first.papiers] }, second] },
    { commande_collections: [{ ...first, nb_feuilles: '2' }, second] },
    { commande_collections: [{ ...first, collection_nom: 'Snapshot falsifié' }, second] },
    { commande_collections: [null, second] }, { commande_collections: [[], second] },
    { format_type: 'D' }, { format_type: null }, { catalogue_id: '1' }, { client_id: '1' },
    { papier_supplementaire: null }, { papier_supplementaire: 'true' },
    { methode_paiement: null }, { methode_paiement: 'espèces' }, { reglee: 1 },
    { catalogue_titre: 'Falsifié' }, { prix_format_cents: 0 }, { prix_origine: 'manuelle' },
    { ruban_id: [1] }, { date_commande: {} }
  ];
  for (const quantity of [-1, 0, 1.5, true, '2', null, Number.MAX_SAFE_INTEGER + 1]) {
    invalid.push({ commande_collections: [line(f.catalogue.collections[0], 2, [{ papier_cartonne_id: first.papiers[0].papier_cartonne_id, quantite_base: quantity }]), second] });
  }
  const beforeCounts = counts();
  const beforeClient = await api(`/clients/${f.client.id}`);
  for (const extra of invalid) {
    await api('/commandes', 'POST', { ...good, ...extra }, 400);
    assert.deepEqual(counts(), beforeCounts);
  }
  for (const body of [null, [], {}, { ...good, type: 'autre' }]) await api('/commandes', 'POST', body, 400);
  await api('/commandes', 'POST', { ...good, client_id: 999999 }, 404);
  await api('/commandes', 'POST', { ...good, catalogue_id: 999999 }, 404);
  assert.deepEqual(counts(), beforeCounts);
  assert.deepEqual(await api(`/clients/${f.client.id}`), beforeClient);
});

test('tarifs zéro et personnalisés ; prix manuel et suppléments stricts, sans débordement', async () => {
  const f = await fixture({ prices: { prix_A_cents: 0, prix_B_cents: 8765 } });
  assert.equal((await api('/commandes', 'POST', payload(f), 201)).prix_applique_cents, 0);
  assert.equal((await api('/commandes', 'POST', payload(f, 'B'), 201)).prix_applique_cents, 8765);
  const manual = await api('/commandes', 'POST', payload(f, 'A', {
    prix_applique_cents: 0, produit_promo_texte: 'Cadeau', produit_promo_prix_cents: 500
  }), 201);
  assert.equal(manual.prix_applique_cents, 0);
  assert.equal(manual.prix_origine, 'manuelle');
  assert.equal(manual.produit_promo_prix_cents, 500);
  for (const key of ['prix_applique_cents', 'produit_promo_prix_cents', 'autres_prix_cents']) {
    for (const value of [-1, 1.5, true, '300', null, Number.MAX_SAFE_INTEGER + 1]) {
      const extra = { [key]: value };
      if (key !== 'prix_applique_cents') extra[key.replace('_prix_cents', '_texte')] = 'Supplément';
      await api('/commandes', 'POST', payload(f, 'A', extra), 400);
    }
  }
  for (const category of ['produit_promo', 'autres']) {
    for (const extra of [
      { [`${category}_texte`]: 'Sans prix' }, { [`${category}_prix_cents`]: 0 },
      { [`${category}_texte`]: ' ', [`${category}_prix_cents`]: 0 }
    ]) await api('/commandes', 'POST', payload(f, 'A', extra), 400);
  }
  await api('/commandes', 'POST', payload(f, 'B', { produit_promo_texte: 'Trop grand', produit_promo_prix_cents: Number.MAX_SAFE_INTEGER }), 400);
});

test('brouillons, catalogues archivés et clientes archivées sont exclus des nouvelles commandes', async () => {
  const f = await fixture();
  await api(`/catalogues/${f.catalogue.id}/archivage`, 'PATCH', { archive: true });
  await api('/commandes', 'POST', payload(f), 409);
  await api(`/catalogues/${f.catalogue.id}/archivage`, 'PATCH', { archive: false });
  await api('/commandes', 'POST', payload(f), 409);
  await api(`/catalogues/${f.catalogue.id}/publication`, 'POST', {});
  await api(`/clients/${f.client.id}/archivage`, 'PATCH', { archive: true });
  await api('/commandes', 'POST', payload(f), 409);
  assert.equal((await api(`/clients/${f.client.id}`)).derniere_commande, null);
});

test('PUT remplace toute la composition, recalcule les tarifs courants et abandonne une ancienne correction manuelle', async () => {
  const f = await fixture({ rubans: 2 });
  const body = payload(f, 'A', { ruban_id: f.catalogue.rubans[0].id, papier_supplementaire: true, prix_applique_cents: 777,
    produit_promo_texte: 'Ancien', produit_promo_prix_cents: 100 });
  const original = await api('/commandes', 'POST', body, 201);
  await api(`/catalogues/${f.catalogue.id}`, 'PUT', { prix_C_cents: 9999 });
  const newBody = replacement(payload(f, 'C', { ruban_id: f.catalogue.rubans[1].id }));
  delete newBody.catalogue_id;
  delete newBody.methode_paiement;
  const updated = await api(`/commandes/${original.id}`, 'PUT', newBody);
  assert.equal(updated.commande_collections.length, 1);
  assert.equal(updated.papiers_selectionnes.length, 1);
  assert.equal(updated.papiers_selectionnes[0].quantite_base, 5);
  assert.equal(updated.ruban.ruban_id, f.catalogue.rubans[1].id);
  assert.equal(updated.prix_format_cents, 9999);
  assert.equal(updated.prix_applique_cents, 9999);
  assert.equal(updated.prix_origine, 'automatique');
  assert.equal(updated.papier_supplementaire, 0);
  assert.equal(updated.prix_option_cents, 0);
  assert.equal(updated.produit_promo_texte, null);
  assert.equal(updated.methode_paiement, 'virement');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM commande_rubans WHERE commande_id=?').get(original.id).n, 1);
  const manual = await api(`/commandes/${original.id}`, 'PUT', { ...newBody, prix_applique_cents: 111 });
  assert.equal(manual.prix_applique_cents, 111);
  assert.equal(manual.prix_origine, 'manuelle');
  for (const bad of [{}, { ...newBody, reglee: 1 }, { ...newBody, prix_applique_cents: -1 }, { ...newBody, produit_promo_texte: 'Sans prix' }]) {
    await api(`/commandes/${original.id}`, 'PUT', bad, 400);
    assert.deepEqual(await api(`/commandes/${original.id}`), manual);
  }
});

test('PUT permet la modification du catalogue d’origine archivé s’il est complet ; changement de catalogue exige une source utilisable', async () => {
  const f = await fixture();
  const order = await api('/commandes', 'POST', payload(f), 201);
  await api(`/clients/${f.client.id}/archivage`, 'PATCH', { archive: true });
  await api(`/catalogues/${f.catalogue.id}/archivage`, 'PATCH', { archive: true });
  await api(`/commandes/${order.id}`, 'PUT', replacement(payload(f, 'C')));
  const other = await fixture({ counts: [1] });
  const change = replacement(payload(other, 'C'));
  await api(`/catalogues/${other.catalogue.id}/archivage`, 'PATCH', { archive: true });
  await api(`/commandes/${order.id}`, 'PUT', change, 409);
  await api(`/catalogues/${other.catalogue.id}/archivage`, 'PATCH', { archive: false });
  await api(`/catalogues/${other.catalogue.id}/publication`, 'POST', {});
  const changed = await api(`/commandes/${order.id}`, 'PUT', change);
  assert.equal(changed.catalogue_id, other.catalogue.id);
  assert.equal(changed.client_id, f.client.id);
  await api(`/collections/${other.catalogue.collections[0].id}/papiers`, 'PUT', { papier_ids: [] });
  await api(`/commandes/${order.id}`, 'PUT', change, 409);
});

test('échec SQL après insertion ou suppression de composition annule aussi commande, prix, stocks et effets cliente', async () => {
  const f = await fixture({ rubans: 1 });
  const body = payload(f);
  const original = await api('/commandes', 'POST', body, 201);
  const beforeClient = await api(`/clients/${f.client.id}`);
  const beforeCounts = counts();
  const beforeStocks = await api('/stocks');
  db.exec("CREATE TEMP TRIGGER fail_kit_paper BEFORE INSERT ON commande_papiers_selectionnes BEGIN SELECT RAISE(ABORT, 'Échec simulé'); END;");
  try {
    await api('/commandes', 'POST', body, 500);
    await api(`/commandes/${original.id}`, 'PUT', replacement(payload(f, 'C')), 500);
    assert.deepEqual(counts(), beforeCounts);
    assert.deepEqual(await api(`/clients/${f.client.id}`), beforeClient);
    assert.deepEqual(await api(`/commandes/${original.id}`), original);
    assert.deepEqual(await api('/stocks'), beforeStocks);
  } finally {
    db.exec('DROP TRIGGER fail_kit_paper');
  }
});

test('règlement conserve les snapshots malgré les mutations source ; commande réglée immuable et non supprimable', async () => {
  const f = await fixture({ rubans: 1 });
  const order = await api('/commandes', 'POST', payload(f, 'A', { prix_applique_cents: 4201, produit_promo_texte: 'Extra', produit_promo_prix_cents: 100 }), 201);
  db.prepare("UPDATE commandes SET created_at='2024-02-01' WHERE id=?").run(order.id);
  const original = await api(`/commandes/${order.id}`);
  const stocks = await api('/stocks');
  await api(`/catalogues/${f.catalogue.id}`, 'PUT', { titre: 'Source renommée', papier_spe: 'Nouveau', prix_A_cents: 9999 });
  for (const collection of f.catalogue.collections) {
    await api(`/collections/${collection.id}`, 'PUT', { nom: `Renommée ${collection.id}` });
    await api(`/papiers-cartonnes/${collection.papiers[0].id}`, 'PUT', { nom: `Renommé ${collection.papiers[0].id}` });
    await api(`/collections/${collection.id}/papiers`, 'PUT', { papier_ids: [] });
  }
  await api(`/catalogues/rubans/${f.catalogue.rubans[0].id}`, 'PUT', { nom: 'Nouveau ruban' });
  await api(`/catalogues/${f.catalogue.id}/archivage`, 'PATCH', { archive: true });
  await api(`/clients/${f.client.id}/archivage`, 'PATCH', { archive: true });
  assert.deepEqual(await api(`/commandes/${order.id}`), original);
  assert.deepEqual(await api('/stocks'), stocks);
  for (const body of [{ reglee: true }, { prix_applique_cents: 0 }, null, []]) await api(`/commandes/${order.id}/reglement`, 'PATCH', body, 400);
  const paid = await api(`/commandes/${order.id}/reglement`, 'PATCH');
  assert.deepEqual({ ...paid, reglee: 0, updated_at: original.updated_at }, original);
  const bilan = await api('/stocks/bilan?mois=2024-02');
  assert.equal(bilan.chiffre_affaires, 42.01);
  assert.deepEqual(bilan.produits_promo, [{ texte: 'Extra', prix: 1, nb_fois: 1 }]);
  for (const body of [{}, { reglee: 0 }, replacement(payload(f))]) await api(`/commandes/${order.id}`, 'PUT', body, 409);
  await api(`/commandes/${order.id}`, 'DELETE', undefined, 409);
  await api(`/commandes/${order.id}/reglement`, 'PATCH', {}, 409);
  assert.deepEqual(await api(`/commandes/${order.id}`), paid);
  assert.deepEqual(await api('/stocks'), stocks);
  assert.deepEqual(await api('/stocks/bilan?mois=2024-02'), bilan);
});

test('suppression non réglée retire toutes ses lignes et quantités ; les commandes réglées sont conservées', async () => {
  const f = await fixture({ counts: [1], rubans: 1 });
  const stocksBefore = await api('/stocks');
  const order = await api('/commandes', 'POST', payload(f, 'C'), 201);
  const lineIds = order.commande_collections.map(c => c.id);
  await api(`/commandes/${order.id}`, 'DELETE', undefined, 204);
  await api(`/commandes/${order.id}`, 'GET', undefined, 404);
  await api(`/commandes/${order.id}`, 'DELETE', undefined, 404);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM commande_collections WHERE commande_id=?').get(order.id).n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM commande_rubans WHERE commande_id=?').get(order.id).n, 0);
  for (const id of lineIds) assert.equal(db.prepare('SELECT COUNT(*) AS n FROM commande_papiers_selectionnes WHERE commande_collection_id=?').get(id).n, 0);
  assert.deepEqual(await api('/stocks'), stocksBefore);
  assert.equal((await api(`/clients/${f.client.id}/commandes`)).length, 0);
});

test('hors-kit conserve son contrat et sa fidélité ; règlement dédié, modification et suppression protègent toutes les commandes réglées', async () => {
  const f = await fixture({ counts: [1] });
  const order = await api('/commandes', 'POST', {
    client_id: f.client.id, type: 'hors_kit', montant: 80, cadeau_texte: 'Cadeau', cadeau_valeur: 2.5,
    methode_paiement: 'Paypal', date_commande: '2024-03-01'
  }, 201);
  assert.equal((await api(`/clients/${f.client.id}`)).points_fidelite, 1);
  const modified = await api(`/commandes/${order.id}`, 'PUT', { montant: 95.5 });
  assert.equal(modified.cadeau_valeur, 2.5);
  assert.equal(modified.methode_paiement, 'Paypal');
  for (const body of [{ reglee: 1 }, { reglee: 0 }, { format_type: 'C' }, null, [], { montant: {} }]) await api(`/commandes/${order.id}`, 'PUT', body, 400);
  const paid = await api(`/commandes/${order.id}/reglement`, 'PATCH', {});
  for (const body of [{}, { montant: 10 }, { reglee: 0 }]) await api(`/commandes/${order.id}`, 'PUT', body, 409);
  await api(`/commandes/${order.id}`, 'DELETE', undefined, 409);
  assert.deepEqual(await api(`/commandes/${order.id}`), paid);
  const alreadyPaid = await api('/commandes', 'POST', { client_id: f.client.id, type: 'hors_kit', montant: 10, reglee: 1 }, 201);
  assert.equal(alreadyPaid.reglee, 1);
});

test('IDs et commandes absentes donnent des erreurs explicites', async () => {
  for (const id of ['abc', '1oops', '1.5', '0', '-1', '9007199254740992']) {
    for (const method of ['GET', 'PUT', 'DELETE']) await api(`/commandes/${id}`, method, method === 'PUT' ? {} : undefined, 400);
    await api(`/commandes/${id}/reglement`, 'PATCH', {}, 400);
  }
  for (const method of ['GET', 'PUT', 'DELETE']) await api('/commandes/999999', method, method === 'PUT' ? {} : undefined, 404);
  await api('/commandes/999999/reglement', 'PATCH', {}, 404);
});
