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

    -- Supprimer l'ancienne table commande_collections si elle existe
    DROP TABLE IF EXISTS commande_collections;

    -- Table des groupes de collections (3 collections par groupe)
    CREATE TABLE IF NOT EXISTS groupes_collections (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      nom                   TEXT NOT NULL UNIQUE,
      description           TEXT,
      created_at            TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Table de liaison entre groupes et collections (exactement 3 collections par groupe)
    CREATE TABLE IF NOT EXISTS groupe_collections (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      groupe_id             INTEGER NOT NULL,
      collection_id         INTEGER NOT NULL,
      ordre                 INTEGER NOT NULL CHECK (ordre IN (1,2,3)),
      FOREIGN KEY (groupe_id) REFERENCES groupes_collections(id) ON DELETE CASCADE,
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
      UNIQUE(groupe_id, ordre),
      UNIQUE(groupe_id, collection_id)
    );

    -- Table de liaison entre commandes et groupes de collections
    -- Format A ou B : max 2 collections du groupe (ordre_collection 1 ou 2)
    -- Format C : max 1 collection du groupe (ordre_collection 1 uniquement)
    CREATE TABLE IF NOT EXISTS commande_collections (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      commande_id           INTEGER NOT NULL,
      groupe_id             INTEGER NOT NULL,
      ordre_collection      INTEGER NOT NULL CHECK (ordre_collection IN (1,2,3)),
      ordre_commande        INTEGER NOT NULL CHECK (ordre_commande IN (1,2)),
      FOREIGN KEY (commande_id) REFERENCES commandes(id) ON DELETE CASCADE,
      FOREIGN KEY (groupe_id) REFERENCES groupes_collections(id) ON DELETE CASCADE,
      UNIQUE(commande_id, ordre_commande)
    );

    -- Index pour améliorer les performances
    CREATE INDEX IF NOT EXISTS ix_groupes_collections_nom ON groupes_collections(nom);
    CREATE INDEX IF NOT EXISTS ix_groupe_collections_groupe_id ON groupe_collections(groupe_id);
    CREATE INDEX IF NOT EXISTS ix_groupe_collections_collection_id ON groupe_collections(collection_id);
    CREATE INDEX IF NOT EXISTS ix_commande_collections_groupe_id ON commande_collections(groupe_id);
    CREATE INDEX IF NOT EXISTS ix_commande_collections_commande_ordre ON commande_collections(commande_id, ordre_commande);

    -- Trigger pour valider le nombre de collections selon le format_type
    -- Format C : maximum 1 collection (ordre_commande = 1 uniquement)
    CREATE TRIGGER IF NOT EXISTS check_format_c_collections
    BEFORE INSERT ON commande_collections
    FOR EACH ROW
    WHEN (
      (SELECT format_type FROM commandes WHERE id = NEW.commande_id) = 'C'
      AND NEW.ordre_commande != 1
    )
    BEGIN
      SELECT RAISE(ABORT, 'Le format C ne peut avoir qu''une seule collection (ordre_commande = 1)');
    END;

    -- Trigger pour empêcher l'ajout d'une deuxième collection si format_type = 'C'
    CREATE TRIGGER IF NOT EXISTS check_format_c_max_collections
    BEFORE INSERT ON commande_collections
    FOR EACH ROW
    WHEN (
      (SELECT format_type FROM commandes WHERE id = NEW.commande_id) = 'C'
      AND EXISTS (SELECT 1 FROM commande_collections WHERE commande_id = NEW.commande_id)
    )
    BEGIN
      SELECT RAISE(ABORT, 'Le format C ne peut avoir qu''une seule collection');
    END;

    -- Trigger pour valider que l'ordre_collection existe dans le groupe
    CREATE TRIGGER IF NOT EXISTS check_collection_exists_in_groupe
    BEFORE INSERT ON commande_collections
    FOR EACH ROW
    WHEN (
      NOT EXISTS (
        SELECT 1 FROM groupe_collections 
        WHERE groupe_id = NEW.groupe_id 
        AND ordre = NEW.ordre_collection
      )
    )
    BEGIN
      SELECT RAISE(ABORT, 'La collection à l''ordre spécifié n''existe pas dans ce groupe');
    END;

    COMMIT;
  `);
  
  console.log('✅ Migration terminée avec succès!');
  console.log('\n📊 Tables créées/mises à jour:');
  console.log('   - groupes_collections');
  console.log('   - groupe_collections');
  console.log('   - commande_collections (nouvelle structure)');
  console.log('\n🔍 Vérification des tables...');
  
  // Vérifier que les tables existent
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name IN ('groupes_collections', 'groupe_collections', 'commande_collections')
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

