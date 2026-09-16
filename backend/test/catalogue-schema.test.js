const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const Database = require('better-sqlite3');
const { applyMigrations, initializeSchemaAsCurrent, getMigrationStatus } = require('../src/db/migrations');
const { assertMigrationSchemaCompatible } = require('../src/db/schema-compatibility');
const schema = fs.readFileSync(path.resolve(__dirname, '../../db/schema.sql'), 'utf8');

function withDatabase(run, baseline = false) {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  try {
    if (baseline) applyMigrations(db, { targetVersion: 1 });
    else initializeSchemaAsCurrent(db, schema);
    run(db);
  } finally { db.close(); }
}

function seedKit(db) {
  db.exec(`
    INSERT INTO clients (id,nom,prenom) VALUES (1,'Test','Cliente');
    INSERT INTO catalogues (id,titre,papier_spe,prix_A_cents,prix_B_cents,prix_C_cents)
      VALUES (1,'Libre','Special',3500,4000,4500);
    INSERT INTO collections (id,catalogue_id,nom,ordre) VALUES (1,1,'Collection',1);
    INSERT INTO papiers_cartonnes (id,nom) VALUES (1,'Papier');
    INSERT INTO collection_papiers (collection_id,papier_cartonne_id,ordre) VALUES (1,1,1);
    INSERT INTO catalogue_rubans (id,catalogue_id,nom,ordre) VALUES (1,1,'Ruban',1);
    INSERT INTO commandes (id,client_id,type,catalogue_id,catalogue_titre,format_type,
      prix_format_cents,prix_option_cents,prix_applique_cents,prix_origine,
      papier_spe_nom,papier_spe_quantite)
      VALUES (1,1,'kit',1,'Libre','C',4500,0,4500,'automatique','Special',1);
    INSERT INTO commande_collections (id,commande_id,collection_id,collection_nom,nb_feuilles)
      VALUES (1,1,1,'Collection',5);
    INSERT INTO commande_papiers_selectionnes
      (commande_collection_id,papier_cartonne_id,papier_nom,quantite_base) VALUES (1,1,'Papier',5);
    INSERT INTO commande_rubans (commande_id,ruban_id,ruban_nom) VALUES (1,1,'Ruban');
  `);
}

test('schéma neuf et migration v1 vers v2 correspondent exactement', () => {
  withDatabase(db => assertMigrationSchemaCompatible(db, 2));
  withDatabase(db => {
    db.exec(`INSERT INTO clients (nom,prenom,points_fidelite) VALUES ('Test','Cliente',3);
      INSERT INTO settings VALUES ('prix_A','35.25');`);
    applyMigrations(db);
    assertMigrationSchemaCompatible(db, 2);
    assert.equal(db.prepare('SELECT archive FROM clients').get().archive, 0);
    assert.equal(db.prepare('SELECT points_fidelite FROM clients').get().points_fidelite, 3);
    assert.equal(db.prepare("SELECT valeur FROM settings WHERE cle='prix_catalogue_A_cents'").get().valeur, 3525);
    assert.equal(applyMigrations(db).length, 0);
  }, true);
});

test('refuse toute donnée métier ancienne sans la supprimer et sans avancer la version', () => {
  for (const insert of [
    "INSERT INTO catalogues(titre) VALUES ('Ancien')",
    "INSERT INTO papiers_cartonnes(nom) VALUES ('Ancien')",
    "INSERT INTO commandes(client_id,type,montant) VALUES (1,'hors_kit',80)"
  ]) withDatabase(db => {
    db.exec("INSERT INTO clients(id,nom,prenom) VALUES (1,'Test','Cliente')");
    db.exec(insert);
    const before = db.serialize();
    assert.throws(() => applyMigrations(db), /Donnees metier incompatibles/);
    assert.deepEqual(db.serialize(), before);
    assert.equal(getMigrationStatus(db).applied.length, 1);
    assertMigrationSchemaCompatible(db, 1);
  }, true);
});

test('refuse les anciens tarifs invalides au lieu de les corriger', () => {
  for (const value of ['abc','35.001','101','-1','.','1e2']) withDatabase(db => {
    db.prepare("INSERT INTO settings VALUES ('prix_A',?)").run(value);
    assert.throws(() => applyMigrations(db), /tarifs invalides/);
    assert.equal(db.prepare('SELECT valeur FROM settings').get().valeur, value);
    assertMigrationSchemaCompatible(db, 1);
  }, true);
});

test('contraintes centimes, statut, archivage et cardinalité rubans', () => withDatabase(db => {
  seedKit(db);
  for (const price of [-1,10001,0.5,'abc']) {
    assert.throws(() => db.prepare('UPDATE catalogues SET prix_A_cents=?').run(price));
    assert.throws(() => db.prepare('UPDATE settings SET valeur=?').run(price));
  }
  db.exec('UPDATE catalogues SET prix_A_cents=0; UPDATE settings SET valeur=10000;');
  assert.throws(() => db.exec("UPDATE catalogues SET statut='autre'"));
  assert.throws(() => db.exec('UPDATE clients SET archive=2'));
  db.exec("INSERT INTO catalogue_rubans(catalogue_id,nom,ordre) VALUES (1,'Deuxieme',2)");
  assert.throws(() => db.exec("INSERT INTO catalogue_rubans(catalogue_id,nom,ordre) VALUES (1,'Troisieme',3)"));
  assert.throws(() => db.exec('UPDATE commande_papiers_selectionnes SET quantite_base=0'));
  assert.throws(() => db.exec('UPDATE commandes SET prix_applique_cents=1.5'));
}));

test('sources protégées, snapshots autonomes, suppression complète commande non réglée', () => withDatabase(db => {
  seedKit(db);
  for (const table of ['clients','catalogues','collections','papiers_cartonnes','catalogue_rubans']) {
    assert.throws(() => db.exec(`DELETE FROM ${table} WHERE id=1`), /FOREIGN KEY/);
  }
  db.exec("UPDATE catalogues SET titre='Modifie'; UPDATE papiers_cartonnes SET nom='Modifie';");
  assert.equal(db.prepare('SELECT catalogue_titre FROM commandes').get().catalogue_titre, 'Libre');
  assert.equal(db.prepare('SELECT papier_nom FROM commande_papiers_selectionnes').get().papier_nom, 'Papier');
  db.transaction(() => db.exec('DELETE FROM commandes WHERE id=1'))();
  for (const table of ['commandes','commande_collections','commande_papiers_selectionnes','commande_rubans']) {
    assert.equal(db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n, 0);
  }
  assert.equal(db.prepare('SELECT count(*) AS n FROM clients').get().n, 1);
}));

test('commande réglée et sa composition sont immuables', () => withDatabase(db => {
  seedKit(db);
  db.exec('UPDATE commandes SET reglee=1 WHERE id=1');
  for (const sql of [
    'DELETE FROM commandes WHERE id=1', 'UPDATE commandes SET reglee=0 WHERE id=1',
    "UPDATE commande_collections SET collection_nom='Change' WHERE id=1",
    'DELETE FROM commande_collections WHERE id=1',
    'UPDATE commande_papiers_selectionnes SET quantite_base=3',
    'DELETE FROM commande_papiers_selectionnes', 'DELETE FROM commande_rubans',
    "UPDATE commande_rubans SET ruban_nom='Change'"
  ]) assert.throws(() => db.exec(sql), /immuable|supprimee/);
}));

test('un même papier peut contribuer à deux collections sans perte de quantité', () => withDatabase(db => {
  seedKit(db);
  db.exec(`UPDATE commandes SET format_type='A'; UPDATE commande_collections SET nb_feuilles=2;
    UPDATE commande_papiers_selectionnes SET quantite_base=2;
    INSERT INTO collections(id,catalogue_id,nom,ordre) VALUES (2,1,'Deuxieme',2);
    INSERT INTO commande_collections(id,commande_id,collection_id,collection_nom,nb_feuilles)
      VALUES (2,1,2,'Deuxieme',3);
    INSERT INTO commande_papiers_selectionnes(commande_collection_id,papier_cartonne_id,papier_nom,quantite_base)
      VALUES (2,1,'Papier',3);`);
  assert.equal(db.prepare('SELECT sum(quantite_base) AS n FROM commande_papiers_selectionnes').get().n, 5);
}));
