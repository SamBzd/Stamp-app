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

test('bilan historique en centimes : catalogues distincts, defaults, édition, règlement, archivage et périodes', async () => {
  const first = await fixture({ prices: { prix_A_cents: 1001 } });
  const second = await fixture({ prices: { prix_A_cents: 2002 } });
  const defaults = await api('/settings');
  const extra = { papier_supplementaire: true,
    produit_promo_texte: 'Même promo', produit_promo_prix_cents: 103,
    autres_texte: 'Autre historique', autres_prix_cents: 207 };
  const automaticBody = payload(first, 'A', extra);
  const automatic = await api('/commandes', 'POST', automaticBody, 201);
  const manual = await api('/commandes', 'POST', payload(second, 'A', {
    ...extra, produit_promo_prix_cents: 109, prix_applique_cents: 7, methode_paiement: 'Paypal'
  }), 201);
  const editableBody = payload(second, 'A', { methode_paiement: 'chèque' });
  const editable = await api('/commandes', 'POST', editableBody, 201);
  const unpaid = await api('/commandes', 'POST', payload(first, 'A', {
    produit_promo_texte: 'Non réglée', produit_promo_prix_cents: 999
  }), 201);
  const outside = await api('/commandes', 'POST', payload(first), 201);
  const horsKit = await api('/commandes', 'POST', {
    client_id: first.client.id, type: 'hors_kit', montant: 0.29,
    methode_paiement: 'Paypal', date_commande: '2031-12-01'
  }, 201);
  for (const order of [automatic, manual, editable, unpaid, horsKit]) {
    db.prepare("UPDATE commandes SET created_at='2023-06-30 23:59:59' WHERE id=?").run(order.id);
  }
  db.prepare("UPDATE commandes SET created_at='2023-07-01' WHERE id=?").run(outside.id);
  await api(`/commandes/${outside.id}/reglement`, 'PATCH', {});
  assert.equal(automatic.prix_applique_cents, 1661);
  // Un changement source seul ne réécrit aucune commande, même non réglée.
  try {
    await api('/settings', 'PUT', { prix_A_cents: 8888 });
    await api(`/catalogues/${first.catalogue.id}`, 'PUT', { prix_A_cents: 3333 });
    await api(`/catalogues/${second.catalogue.id}`, 'PUT', { prix_A_cents: 4444 });
    for (const order of [automatic, manual, editable, unpaid]) {
      assert.deepEqual(await api(`/commandes/${order.id}`), {
        ...order, created_at: '2023-06-30 23:59:59'
      });
    }
    assert.equal((await api(`/catalogues/${second.catalogue.id}`)).prix_A_cents, 4444);
    const newCatalogue = await api('/catalogues', 'POST', { titre: `Defaults ${++sequence}` }, 201);
    assert.equal(newCatalogue.prix_A_cents, 8888);
    const edited = await api(`/commandes/${editable.id}`, 'PUT', replacement(editableBody));
    assert.equal(edited.prix_applique_cents, 4444);
    for (const order of [automatic, manual, edited, horsKit]) {
      const paid = await api(`/commandes/${order.id}/reglement`, 'PATCH', {});
      assert.equal(paid.type === 'kit' ? paid.prix_applique_cents : paid.montant,
        order.type === 'kit' ? order.prix_applique_cents : order.montant);
    }
    const bilan = await api('/stocks/bilan?mois=2023-06');
    assert.deepEqual(bilan, {
      mois: '2023-06', chiffre_affaires_cents: 6141,
      par_methode_paiement: [
        { methode_paiement: 'Paypal', total_cents: 36, nb_commandes: 2 },
        { methode_paiement: 'chèque', total_cents: 4444, nb_commandes: 1 },
        { methode_paiement: 'virement', total_cents: 1661, nb_commandes: 1 }
      ],
      produits_promo: [
        { texte: 'Même promo', prix_cents: 103, nb_fois: 1 },
        { texte: 'Même promo', prix_cents: 109, nb_fois: 1 }
      ],
      autres: [{ texte: 'Autre historique', prix_cents: 207, nb_fois: 2 }]
    });
    for (const f of [first, second]) {
      await api(`/catalogues/${f.catalogue.id}`, 'PUT', { titre: `Renommé ${f.catalogue.id}`, prix_A_cents: 9999 });
      await api(`/catalogues/${f.catalogue.id}/archivage`, 'PATCH', { archive: true });
      await api(`/clients/${f.client.id}/archivage`, 'PATCH', { archive: true });
    }
    await api('/settings', 'PUT', { prix_A_cents: 0 });
    assert.deepEqual(await api('/stocks/bilan?mois=2023-06'), bilan);
    assert.equal((await api('/stocks/bilan?mois=2023-07')).chiffre_affaires_cents, 1001);
    assert.deepEqual(await api('/stocks/bilan?mois=2023-05'), {
      mois: '2023-05', chiffre_affaires_cents: 0, par_methode_paiement: [], produits_promo: [], autres: []
    });
  } finally {
    await api('/settings', 'PUT', defaults);
  }
});

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

test('bilan hors-kit convertit chaque montant avant sommation et conserve paiement absent et période', async () => {
  const f = await fixture();
  for (const montant of [0.1, 0.2, 0.29]) {
    const order = await api('/commandes', 'POST', {
      client_id: f.client.id, type: 'hors_kit', montant, date_commande: '2022-11-01'
    }, 201);
    db.prepare("UPDATE commandes SET created_at='2022-10-01' WHERE id=?").run(order.id);
    await api(`/commandes/${order.id}/reglement`, 'PATCH', {});
    assert.equal((await api(`/commandes/${order.id}`)).montant, montant);
  }
  assert.deepEqual(await api('/stocks/bilan?mois=2022-10'), {
    mois: '2022-10', chiffre_affaires_cents: 59,
    par_methode_paiement: [{ methode_paiement: null, total_cents: 59, nb_commandes: 3 }],
    produits_promo: [], autres: []
  });
  assert.equal((await api('/stocks/bilan?mois=2022-11')).chiffre_affaires_cents, 0);
});

test('bilan refuse une somme dépassant les entiers JSON exacts sans arrondi silencieux', async () => {
  const f = await fixture();
  for (const cents of [Number.MAX_SAFE_INTEGER, 2]) {
    const order = await api('/commandes', 'POST', payload(f, 'A', { prix_applique_cents: cents }), 201);
    db.prepare("UPDATE commandes SET created_at='2021-01-01' WHERE id=?").run(order.id);
    await api(`/commandes/${order.id}/reglement`, 'PATCH', {});
  }
  const error = await api('/stocks/bilan?mois=2021-01', 'GET', undefined, 500);
  assert.match(error.error, /entiers JSON exacts/);
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
  const stockRuban = stock.rubans.find(r => r.ruban_id === f.catalogue.rubans[0].id);
  assert.equal(stockRuban.nom, f.catalogue.rubans[0].nom);
  assert.equal(stockRuban.quantite, 1);
  assert.equal(stockRuban.catalogue_id, f.catalogue.id);
  db.prepare("UPDATE commandes SET created_at='2024-01-02' WHERE id=?").run(order.id);
  assert.deepEqual(await api('/stocks/bilan?mois=2024-01'), {
    mois: '2024-01', chiffre_affaires_cents: 0, par_methode_paiement: [], produits_promo: [], autres: []
  });
  await api(`/commandes/${order.id}/reglement`, 'PATCH', {});
  const bilan = await api('/stocks/bilan?mois=2024-01');
  assert.equal(bilan.chiffre_affaires_cents, 1859);
  assert.deepEqual(bilan.par_methode_paiement, [{ methode_paiement: 'virement', total_cents: 1859, nb_commandes: 1 }]);
  assert.deepEqual(bilan.produits_promo, [{ texte: 'Promotion', prix_cents: 275, nb_fois: 1 }]);
  assert.deepEqual(bilan.autres, [{ texte: 'Accessoire', prix_cents: 0, nb_fois: 1 }]);
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
  assert.equal(bilan.chiffre_affaires_cents, 4201);
  assert.deepEqual(bilan.produits_promo, [{ texte: 'Extra', prix_cents: 100, nb_fois: 1 }]);
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

test('stocks : papier partagé, homonymes et historiques restent identifiés avec leur provenance et base/final', async () => {
  const f = await fixture({ rubans: 2 });
  const [first, second] = f.catalogue.collections;
  const shared = first.papiers[0];
  await api(`/collections/${second.id}/papiers`, 'PUT', { papier_ids: [shared.id] });
  await api(`/collections/${second.id}`, 'PUT', { nom: first.nom });
  await api(`/catalogues/rubans/${f.catalogue.rubans[1].id}`, 'PUT', { nom: f.catalogue.rubans[0].nom });
  f.catalogue = await api(`/catalogues/${f.catalogue.id}`);
  const plain = await api('/commandes', 'POST', payload(f, 'A', { ruban_id: f.catalogue.rubans[0].id }), 201);
  const doubled = await api('/commandes', 'POST', payload(f, 'B', { ruban_id: f.catalogue.rubans[1].id, papier_supplementaire: true }), 201);
  const before = await api('/stocks');
  const paper = before.papiers_cartonnes.find(p => p.papier_cartonne_id === shared.id);
  assert.equal(paper.nb_feuilles_base, 10);
  assert.equal(paper.nb_feuilles, 15);
  assert.deepEqual(paper.provenances.map(p => [p.collection_id, p.nb_feuilles_base, p.nb_feuilles]), [[first.id, 4, 6], [second.id, 6, 9]]);
  assert.equal(new Set(paper.provenances.map(p => p.cle)).size, 2);
  const collections = before.collections.filter(c => c.catalogue_id === f.catalogue.id);
  assert.deepEqual(collections.map(c => [c.total_feuilles_base, c.total_feuilles]).sort(), [[4, 6], [6, 9]]);
  assert.equal(new Set(collections.map(c => c.cle)).size, 2);
  const ribbons = before.rubans.filter(r => r.catalogue_id === f.catalogue.id);
  assert.equal(ribbons.length, 2);
  assert.equal(new Set(ribbons.map(r => r.cle)).size, 2);
  assert.deepEqual(ribbons.map(r => r.quantite), [1, 1]);
  assert.equal(before.papier_spe.find(p => p.catalogue_id === f.catalogue.id).nb_commandes, 2);
  assert.equal(before.embellissement.find(p => p.catalogue_id === f.catalogue.id).nb_commandes, 2);

  // Source renommée, puis nouvelles commandes : les deux libellés restent lisibles.
  await api(`/papiers-cartonnes/${shared.id}`, 'PUT', { nom: `${shared.nom} renommé` });
  await api(`/collections/${first.id}`, 'PUT', { nom: `${first.nom} renommée` });
  await api(`/catalogues/${f.catalogue.id}`, 'PUT', { titre: `${f.catalogue.titre} renommé`, papier_spe: 'Nouveau spécial', embellissement: null });
  assert.deepEqual(await api('/stocks'), before);
  f.catalogue = await api(`/catalogues/${f.catalogue.id}`);
  await api('/commandes', 'POST', payload(f, 'A', { ruban_id: f.catalogue.rubans[0].id }), 201);
  const sameNameDifferentPaper = await api('/papiers-cartonnes', 'POST', { nom: shared.nom }, 201);
  for (const collection of f.catalogue.collections) await api(`/collections/${collection.id}/papiers`, 'PUT', { papier_ids: [sameNameDifferentPaper.id] });
  f.catalogue = await api(`/catalogues/${f.catalogue.id}`);
  await api('/commandes', 'POST', payload(f, 'A', { ruban_id: f.catalogue.rubans[0].id }), 201);
  const after = await api('/stocks');
  const variants = after.papiers_cartonnes.filter(p => [shared.id, sameNameDifferentPaper.id].includes(p.papier_cartonne_id));
  assert.equal(variants.length, 3);
  assert.equal(new Set(variants.map(p => p.cle)).size, 3);
  assert.equal(variants.find(p => p.papier_cartonne_id === sameNameDifferentPaper.id).nb_feuilles, 5);
  assert.equal(variants.find(p => p.papier_cartonne_id === shared.id && p.nom === shared.nom).nb_feuilles, 15);
  assert.equal(variants.find(p => p.papier_cartonne_id === shared.id && p.nom !== shared.nom).nb_feuilles, 5);
  assert.equal(after.embellissement.find(p => p.catalogue_id === f.catalogue.id).nb_commandes, 2);
  assert.equal(after.papier_spe.filter(p => p.catalogue_id === f.catalogue.id).length, 2);

  await api(`/clients/${f.client.id}/archivage`, 'PATCH', { archive: true });
  await api(`/catalogues/${f.catalogue.id}/archivage`, 'PATCH', { archive: true });
  await api(`/commandes/${plain.id}/reglement`, 'PATCH');
  await api(`/commandes/${plain.id}`, 'DELETE', undefined, 409);
  assert.deepEqual(await api('/stocks'), after);
  await api(`/commandes/${doubled.id}`, 'DELETE', undefined, 204);
  const remaining = await api('/stocks');
  const old = remaining.papiers_cartonnes.find(p => p.papier_cartonne_id === shared.id && p.nom === shared.nom);
  assert.equal(old.nb_feuilles_base, 5);
  assert.equal(old.nb_feuilles, 5);
});

test('stocks : matériaux homonymes de catalogues différents et matériaux absents', async () => {
  const a = await fixture({ counts: [1], materials: { papier_spe: 'Même libellé', embellissement: null } });
  const b = await fixture({ counts: [1], materials: { papier_spe: 'Même libellé', embellissement: null } });
  const c = await fixture({ counts: [1], materials: { papier_spe: null, embellissement: 'Seul embellissement' } });
  await api('/commandes', 'POST', payload(a, 'C', { papier_supplementaire: true }), 201);
  // Un titre historique peut être réutilisé par une autre source après renommage.
  await api(`/catalogues/${a.catalogue.id}`, 'PUT', { titre: `${a.catalogue.titre} renommé` });
  await api(`/catalogues/${b.catalogue.id}`, 'PUT', { titre: a.catalogue.titre });
  b.catalogue = await api(`/catalogues/${b.catalogue.id}`);
  for (const f of [b, c]) await api('/commandes', 'POST', payload(f, 'C', { papier_supplementaire: true }), 201);
  const stock = await api('/stocks');
  const papers = stock.papier_spe.filter(p => [a.catalogue.id, b.catalogue.id].includes(p.catalogue_id));
  assert.equal(papers.length, 2);
  assert.deepEqual(papers.map(p => p.nb_commandes), [1, 1]);
  assert.equal(new Set(papers.map(p => p.cle)).size, 2);
  assert.equal(papers[0].catalogue_titre, papers[1].catalogue_titre);
  assert.equal(stock.papier_spe.some(p => p.catalogue_id === c.catalogue.id), false);
  assert.equal(stock.embellissement.some(p => [a.catalogue.id, b.catalogue.id].includes(p.catalogue_id)), false);
  assert.equal(stock.embellissement.find(p => p.catalogue_id === c.catalogue.id).nb_commandes, 1);
  assert.equal(stock.rubans.some(p => [a.catalogue.id, b.catalogue.id, c.catalogue.id].includes(p.catalogue_id)), false);
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
