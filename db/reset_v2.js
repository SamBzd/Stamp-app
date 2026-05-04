#!/usr/bin/env node
// Reset DB vers le schéma v2.
// Supprime les anciennes tables, met à jour clients, crée les nouvelles tables.
// Les données clients sont conservées.

const db = require('../backend/src/db/connection.js');

db.pragma('foreign_keys = OFF');

db.exec(`
  -- Supprimer les anciennes tables
  DROP TABLE IF EXISTS commande_collections;
  DROP TABLE IF EXISTS commandes;
  DROP TABLE IF EXISTS groupe_collections;
  DROP TABLE IF EXISTS groupes_collections;
  DROP TABLE IF EXISTS collections;
  DROP TABLE IF EXISTS stocks;
`);

// Ajouter points_fidelite si absent
const cols = db.prepare("PRAGMA table_info(clients)").all().map(c => c.name);
if (!cols.includes('points_fidelite')) {
  db.exec("ALTER TABLE clients ADD COLUMN points_fidelite INTEGER NOT NULL DEFAULT 0");
  console.log('✓ clients.points_fidelite ajouté');
} else {
  console.log('- clients.points_fidelite déjà présent');
}

db.exec(`
  -- settings
  CREATE TABLE IF NOT EXISTS settings (
    cle    TEXT PRIMARY KEY,
    valeur TEXT NOT NULL
  );

  -- papiers_cartonnes
  CREATE TABLE IF NOT EXISTS papiers_cartonnes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nom        TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- catalogues
  CREATE TABLE IF NOT EXISTS catalogues (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    titre          TEXT NOT NULL UNIQUE,
    papier_spe     TEXT,
    embellissement TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- collections (v2)
  CREATE TABLE IF NOT EXISTS collections (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    catalogue_id INTEGER NOT NULL,
    nom          TEXT NOT NULL,
    ordre        INTEGER NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (catalogue_id) REFERENCES catalogues(id) ON DELETE CASCADE,
    UNIQUE(catalogue_id, ordre)
  );

  CREATE INDEX IF NOT EXISTS ix_collections_catalogue_id ON collections(catalogue_id);

  -- collection_papiers
  CREATE TABLE IF NOT EXISTS collection_papiers (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id      INTEGER NOT NULL,
    papier_cartonne_id INTEGER NOT NULL,
    ordre              INTEGER NOT NULL,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (papier_cartonne_id) REFERENCES papiers_cartonnes(id),
    UNIQUE(collection_id, papier_cartonne_id)
  );

  CREATE INDEX IF NOT EXISTS ix_collection_papiers_collection_id ON collection_papiers(collection_id);

  -- commandes (v2)
  CREATE TABLE IF NOT EXISTS commandes (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id             INTEGER NOT NULL,
    type                  TEXT NOT NULL CHECK (type IN ('kit', 'hors_kit')),
    format_type           TEXT CHECK (format_type IN ('A','B','C')),
    papier_supplementaire INTEGER DEFAULT 0,
    produit_promo_texte   TEXT,
    produit_promo_prix    REAL,
    autres_texte          TEXT,
    autres_prix           REAL,
    montant               REAL,
    date_commande         TEXT,
    cadeau_texte          TEXT,
    cadeau_valeur         REAL,
    methode_paiement      TEXT CHECK (methode_paiement IN ('Paypal','chèque','virement')),
    reglee                INTEGER DEFAULT 0,
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS ix_commandes_client_id ON commandes(client_id);
  CREATE INDEX IF NOT EXISTS ix_commandes_type ON commandes(type);
  CREATE INDEX IF NOT EXISTS ix_commandes_reglee ON commandes(reglee);

  -- commande_collections (v2)
  CREATE TABLE IF NOT EXISTS commande_collections (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    commande_id   INTEGER NOT NULL,
    collection_id INTEGER NOT NULL,
    nb_feuilles   INTEGER NOT NULL CHECK (nb_feuilles IN (2, 3, 5)),
    FOREIGN KEY (commande_id) REFERENCES commandes(id) ON DELETE CASCADE,
    FOREIGN KEY (collection_id) REFERENCES collections(id),
    UNIQUE(commande_id, collection_id)
  );

  CREATE INDEX IF NOT EXISTS ix_commande_collections_commande_id ON commande_collections(commande_id);

  -- commande_papiers_selectionnes
  CREATE TABLE IF NOT EXISTS commande_papiers_selectionnes (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    commande_id        INTEGER NOT NULL,
    papier_cartonne_id INTEGER NOT NULL,
    FOREIGN KEY (commande_id) REFERENCES commandes(id) ON DELETE CASCADE,
    FOREIGN KEY (papier_cartonne_id) REFERENCES papiers_cartonnes(id),
    UNIQUE(commande_id, papier_cartonne_id)
  );

  CREATE INDEX IF NOT EXISTS ix_commande_papiers_commande_id ON commande_papiers_selectionnes(commande_id);
`);

// Données initiales settings
const existing = db.prepare("SELECT COUNT(*) as n FROM settings").get();
if (existing.n === 0) {
  db.prepare("INSERT INTO settings (cle, valeur) VALUES (?, ?)").run('prix_A', '35');
  db.prepare("INSERT INTO settings (cle, valeur) VALUES (?, ?)").run('prix_B', '40');
  db.prepare("INSERT INTO settings (cle, valeur) VALUES (?, ?)").run('prix_C', '45');
  console.log('✓ settings initialisé (prix_A=35, prix_B=40, prix_C=45)');
} else {
  console.log('- settings déjà initialisé');
}

db.pragma('foreign_keys = ON');
console.log('✓ Reset v2 terminé');
