const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const Database = require('better-sqlite3');
const { applyMigrations } = require('../src/db/migrations');
const { getSchemaObjects } = require('../src/db/schema-compatibility');

test('#45 : migrer v4 préserve commandes, unités, alertes, liens et compteurs sans backfill', () => {
  const db = new Database(':memory:');
  const fresh = new Database(':memory:');
  try {
    applyMigrations(db, { targetVersion: 4 });
    db.exec(`
      INSERT INTO clients(id,nom,prenom) VALUES (1,'Test','Migration');
      INSERT INTO catalogues(id,titre,papier_spe,prix_A_cents,prix_B_cents,prix_C_cents)
        VALUES (1,'Test','Spécial',1000,2000,3000);
      INSERT INTO commandes(id,client_id,type,catalogue_id,catalogue_titre,format_type,
        prix_format_cents,prix_option_cents,prix_applique_cents,prix_origine,papier_spe_nom,papier_spe_quantite,reglee)
        VALUES (1,1,'kit',1,'Test','B',2000,0,2000,'automatique','Spécial',1,1),
               (2,1,'kit',1,'Test','C',3000,0,3000,'automatique','Spécial',1,0);
      INSERT INTO fourniture_unites(id,commande_id,type,nom,etat,archive,archived_at)
        VALUES (1,1,'papier_collection','Rouge','Traité',1,'2026-11-01 12:00:00'),
               (2,2,'papier_collection','Bleu','À traiter',0,NULL),
               (3,NULL,'ruban','Lin','Expédié',0,NULL),
               (4,2,'papier_collection','Jaune','Disponible',0,NULL),
               (99,NULL,'papier_collection','Supprimé','À traiter',0,NULL);
      INSERT INTO fourniture_alertes(id,unite_id,commande_id,type,nom,code,message,dedupe_key)
        VALUES (1,1,1,'papier_collection','Rouge','surplus','Test','unite:1:surplus'),
               (2,3,NULL,'ruban','Lin','commande_supprimee','Test','unite:3:commande_supprimee'),
               (80,99,NULL,'papier_collection','Supprimé','ancien_besoin','Test','unite:99:ancien_besoin');
      DELETE FROM fourniture_unites WHERE id=99;
      DELETE FROM fourniture_alertes WHERE id=80;
    `);
    const orders = db.prepare('SELECT * FROM commandes ORDER BY id').all();
    const units = db.prepare('SELECT * FROM fourniture_unites ORDER BY id').all();
    const alerts = db.prepare('SELECT * FROM fourniture_alertes ORDER BY id').all();
    assert.deepEqual(applyMigrations(db).map(row => row.version), [5]);
    assert.deepEqual(db.prepare('SELECT * FROM commandes ORDER BY id').all(), orders.map(row => ({ ...row, papier_collection_inclus: 0 })));
    const converted = row => ({ ...row, type: row.type === 'papier_collection' ? 'papier_cartonne' : row.type, format_type: null });
    assert.deepEqual(db.prepare('SELECT * FROM fourniture_unites ORDER BY id').all(), units.map(converted));
    assert.deepEqual(db.prepare('SELECT * FROM fourniture_alertes ORDER BY id').all(), alerts.map(converted));
    assert.deepEqual(db.pragma('foreign_key_check'), []);
    assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
    assert.deepEqual(applyMigrations(db), []);
    fresh.exec(fs.readFileSync(path.resolve(__dirname, '../../db/schema.sql'), 'utf8'));
    assert.deepEqual(getSchemaObjects(db), getSchemaObjects(fresh));
    const id = db.prepare("INSERT INTO fourniture_unites(type,nom) VALUES ('papier_cartonne','Nouveau')").run().lastInsertRowid;
    assert.equal(id, 100);
    assert.equal(db.prepare("INSERT INTO fourniture_alertes(type,nom,code,message,dedupe_key) VALUES ('ruban','Test','surplus','Test','new')").run().lastInsertRowid, 81);
    assert.throws(() => db.prepare("INSERT INTO fourniture_unites(type,nom) VALUES ('papier_collection','Jardin')").run(), /CHECK/);
    assert.throws(() => db.prepare("INSERT INTO fourniture_unites(type,nom,format_type) VALUES ('papier_cartonne','Jardin','B')").run(), /CHECK/);
  } finally {
    db.close();
    fresh.close();
  }
});
