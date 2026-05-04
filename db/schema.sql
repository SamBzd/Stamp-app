-- Stamp App v2 — Schéma de référence
-- Ce fichier décrit l'état cible de la base de données.
-- Pour appliquer : node db/reset_v2.js

-- ============================================================
-- TABLE : clients
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  nom               TEXT NOT NULL,
  prenom            TEXT NOT NULL,
  date_naissance    TEXT,
  adresse           TEXT,
  code_postal       TEXT,
  ville             TEXT,
  email             TEXT,
  telephone_raw     TEXT,
  relais_prefere    TEXT,
  contacter         INTEGER NOT NULL DEFAULT 0 CHECK (contacter IN (0,1)),
  derniere_commande TEXT,
  points_fidelite   INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),

  email_norm TEXT GENERATED ALWAYS AS (
    CASE WHEN email IS NULL THEN NULL ELSE lower(trim(email)) END
  ) STORED,

  telephone_e164 TEXT GENERATED ALWAYS AS (
    CASE
      WHEN telephone_raw IS NULL THEN NULL
      WHEN replace(replace(replace(replace(replace(trim(telephone_raw),' ',''),'.',''),'-',''),'(',''),')','') = '' THEN NULL
      ELSE
        CASE
          WHEN substr(replace(replace(replace(replace(replace(trim(telephone_raw),' ',''),'.',''),'-',''),'(',''),')',''),1,1) = '+'
            THEN replace(replace(replace(replace(replace(trim(telephone_raw),' ',''),'.',''),'-',''),'(',''),')','')
          WHEN substr(replace(replace(replace(replace(replace(trim(telephone_raw),' ',''),'.',''),'-',''),'(',''),')',''),1,2) = '00'
            THEN '+' || substr(replace(replace(replace(replace(replace(trim(telephone_raw),' ',''),'.',''),'-',''),'(',''),')',''),3)
          WHEN substr(replace(replace(replace(replace(replace(trim(telephone_raw),' ',''),'.',''),'-',''),'(',''),')',''),1,2) IN ('32','33')
            THEN '+' || replace(replace(replace(replace(replace(trim(telephone_raw),' ',''),'.',''),'-',''),'(',''),')','')
          WHEN substr(replace(replace(replace(replace(replace(trim(telephone_raw),' ',''),'.',''),'-',''),'(',''),')',''),1,1) = '0'
               AND length(replace(replace(replace(replace(replace(trim(telephone_raw),' ',''),'.',''),'-',''),'(',''),')','')) = 10
            THEN '+33' || substr(replace(replace(replace(replace(replace(trim(telephone_raw),' ',''),'.',''),'-',''),'(',''),')',''),2)
          WHEN length(replace(replace(replace(replace(replace(trim(telephone_raw),' ',''),'.',''),'-',''),'(',''),')','')) = 9
               AND substr(replace(replace(replace(replace(replace(trim(telephone_raw),' ',''),'.',''),'-',''),'(',''),')',''),1,1) IN ('6','7')
            THEN '+33' || replace(replace(replace(replace(replace(trim(telephone_raw),' ',''),'.',''),'-',''),'(',''),')','')
          ELSE NULL
        END
    END
  ) STORED
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_clients_email_norm ON clients(email_norm);
CREATE INDEX IF NOT EXISTS ix_clients_nom_prenom ON clients(nom, prenom);
CREATE INDEX IF NOT EXISTS ix_clients_ville ON clients(ville);

-- ============================================================
-- TABLE : settings — prix configurables (A, B, C)
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  cle    TEXT PRIMARY KEY,
  valeur TEXT NOT NULL
);

-- ============================================================
-- TABLE : papiers_cartonnes — bibliothèque globale
-- ============================================================
CREATE TABLE IF NOT EXISTS papiers_cartonnes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nom        TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- TABLE : catalogues — catalogue mensuel
-- ============================================================
CREATE TABLE IF NOT EXISTS catalogues (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  titre          TEXT NOT NULL UNIQUE,
  papier_spe     TEXT,
  embellissement TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- TABLE : collections — 3 ou 4 collections par catalogue
-- ============================================================
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

-- ============================================================
-- TABLE : collection_papiers — jusqu'à 5 papiers par collection
-- ============================================================
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

-- ============================================================
-- TABLE : commandes — kit et hors kit
-- ============================================================
CREATE TABLE IF NOT EXISTS commandes (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id            INTEGER NOT NULL,
  type                 TEXT NOT NULL CHECK (type IN ('kit', 'hors_kit')),

  -- Champs kit (nullable)
  format_type          TEXT CHECK (format_type IN ('A','B','C')),
  papier_supplementaire INTEGER DEFAULT 0,
  produit_promo_texte  TEXT,
  produit_promo_prix   REAL,
  autres_texte         TEXT,
  autres_prix          REAL,

  -- Champs hors kit (nullable)
  montant              REAL,
  date_commande        TEXT,
  cadeau_texte         TEXT,
  cadeau_valeur        REAL,

  -- Champs communs
  methode_paiement     TEXT CHECK (methode_paiement IN ('Paypal','chèque','virement')),
  reglee               INTEGER DEFAULT 0,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_commandes_client_id ON commandes(client_id);
CREATE INDEX IF NOT EXISTS ix_commandes_type ON commandes(type);
CREATE INDEX IF NOT EXISTS ix_commandes_reglee ON commandes(reglee);

-- ============================================================
-- TABLE : commande_collections — collections impliquées dans un kit
-- ============================================================
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

-- ============================================================
-- TABLE : commande_papiers_selectionnes — papiers cartonnés d'un kit
-- ============================================================
CREATE TABLE IF NOT EXISTS commande_papiers_selectionnes (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  commande_id        INTEGER NOT NULL,
  papier_cartonne_id INTEGER NOT NULL,
  FOREIGN KEY (commande_id) REFERENCES commandes(id) ON DELETE CASCADE,
  FOREIGN KEY (papier_cartonne_id) REFERENCES papiers_cartonnes(id),
  UNIQUE(commande_id, papier_cartonne_id)
);

CREATE INDEX IF NOT EXISTS ix_commande_papiers_commande_id ON commande_papiers_selectionnes(commande_id);
