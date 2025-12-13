const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '../../db/app.db');

console.log('🔄 Démarrage de la migration pour les groupes de collections...');
console.log(`📁 Base de données: ${dbPath}`);

const db = new Database(dbPath);

try {
  db.exec(`
    BEGIN;

    -- Table des collections (chaque collection a uniquement un nom)
    CREATE TABLE IF NOT EXISTS collections (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      nom                   TEXT NOT NULL,
      created_at            TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Table des groupes de collections
    -- Chaque groupe a un format (A, B, C) avec prix et taille
    -- Un groupe peut contenir un nombre variable de collections (1 à +)
    CREATE TABLE IF NOT EXISTS groupes_collections (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      nom                   TEXT NOT NULL UNIQUE,
      format_type           TEXT NOT NULL CHECK (format_type IN ('A', 'B', 'C')),
      format_prix           REAL NOT NULL DEFAULT 0,
      format_taille         TEXT,
      description           TEXT,
      created_at            TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Table de liaison entre groupes et collections
    -- Permet un nombre variable de collections par groupe
    CREATE TABLE IF NOT EXISTS groupe_collections (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      groupe_id             INTEGER NOT NULL,
      collection_id         INTEGER NOT NULL,
      ordre                 INTEGER NOT NULL,
      FOREIGN KEY (groupe_id) REFERENCES groupes_collections(id) ON DELETE CASCADE,
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
      UNIQUE(groupe_id, collection_id)
    );

    -- Table principale des commandes
    -- Une commande référence un groupe et contient 1 ou + collections de ce groupe
    CREATE TABLE IF NOT EXISTS commandes (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id             INTEGER NOT NULL,
      groupe_id             INTEGER NOT NULL,
      papier_supplementaire INTEGER NOT NULL DEFAULT 0 CHECK (papier_supplementaire IN (0,1)),
      articles_supplementaires TEXT,
      methode_paiement      TEXT NOT NULL CHECK (methode_paiement IN ('Paypal', 'chèque', 'virement')),
      reglee                INTEGER NOT NULL DEFAULT 0 CHECK (reglee IN (0,1)),
      created_at            TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (groupe_id) REFERENCES groupes_collections(id) ON DELETE CASCADE
    );

    -- Table de liaison entre commandes et collections
    -- Une commande peut contenir 1 ou + collections du même groupe
    CREATE TABLE IF NOT EXISTS commande_collections (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      commande_id           INTEGER NOT NULL,
      collection_id         INTEGER NOT NULL,
      FOREIGN KEY (commande_id) REFERENCES commandes(id) ON DELETE CASCADE,
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
      UNIQUE(commande_id, collection_id)
    );

    -- Index pour améliorer les performances
    CREATE INDEX IF NOT EXISTS ix_groupes_collections_nom ON groupes_collections(nom);
    CREATE INDEX IF NOT EXISTS ix_groupes_collections_format ON groupes_collections(format_type);
    CREATE INDEX IF NOT EXISTS ix_groupe_collections_groupe_id ON groupe_collections(groupe_id);
    CREATE INDEX IF NOT EXISTS ix_groupe_collections_collection_id ON groupe_collections(collection_id);
    CREATE INDEX IF NOT EXISTS ix_commandes_client_id ON commandes(client_id);
    CREATE INDEX IF NOT EXISTS ix_commandes_groupe_id ON commandes(groupe_id);
    CREATE INDEX IF NOT EXISTS ix_commandes_reglee ON commandes(reglee);
    CREATE INDEX IF NOT EXISTS ix_commande_collections_commande_id ON commande_collections(commande_id);
    CREATE INDEX IF NOT EXISTS ix_commande_collections_collection_id ON commande_collections(collection_id);

    -- Trigger pour valider qu'une commande ne contient que des collections du groupe référencé
    CREATE TRIGGER IF NOT EXISTS check_commande_collections_same_groupe
    BEFORE INSERT ON commande_collections
    FOR EACH ROW
    WHEN (
      NOT EXISTS (
        SELECT 1 FROM groupe_collections gc
        INNER JOIN commandes c ON c.groupe_id = gc.groupe_id
        WHERE gc.collection_id = NEW.collection_id
        AND c.id = NEW.commande_id
      )
    )
    BEGIN
      SELECT RAISE(ABORT, 'Une commande ne peut contenir que des collections du groupe référencé');
    END;

    COMMIT;
  `);
  
  console.log('✅ Migration terminée avec succès!');
  console.log('\n📊 Tables créées/mises à jour:');
  console.log('   - collections');
  console.log('   - groupes_collections');
  console.log('   - groupe_collections');
  console.log('   - commandes');
  console.log('   - commande_collections');
  console.log('\n🔍 Vérification des tables...');
  
  // Vérifier que les tables existent
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name IN ('collections', 'groupes_collections', 'groupe_collections', 'commandes', 'commande_collections')
    ORDER BY name
  `).all();
  
  tables.forEach(table => {
    console.log(`   ✓ ${table.name}`);
  });
  
} catch (error) {
  console.error('❌ Erreur lors de la migration:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  db.close();
}

