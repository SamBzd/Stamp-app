BEGIN;

-- 1) Créer la nouvelle table
CREATE TABLE clients_new (
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
          -- cleaned
          WHEN substr(replace(replace(replace(replace(replace(trim(telephone_raw),' ',''),'.',''),'-',''),'(',''),')',''),1,1) = '+'
            THEN replace(replace(replace(replace(replace(trim(telephone_raw),' ',''),'.',''),'-',''),'(',''),')','')
          WHEN substr(replace(replace(replace(replace(replace(trim(telephone_raw),' ',''),'.',''),'-',''),'(',''),')',''),1,2) = '00'
            THEN '+' || substr(replace(replace(replace(replace(replace(trim(telephone_raw),' ',''),'.',''),'-',''),'(',''),')',''),3)

          -- indicatif pays sans '+': BE(32), FR(33) → ajoute '+'
          WHEN substr(replace(replace(replace(replace(replace(trim(telephone_raw),' ',''),'.',''),'-',''),'(',''),')',''),1,2) IN ('32','33')
            THEN '+' || replace(replace(replace(replace(replace(trim(telephone_raw),' ',''),'.',''),'-',''),'(',''),')','')

          -- FR: 0 + 9 chiffres
          WHEN substr(replace(replace(replace(replace(replace(trim(telephone_raw),' ',''),'.',''),'-',''),'(',''),')',''),1,1) = '0'
               AND length(replace(replace(replace(replace(replace(trim(telephone_raw),' ',''),'.',''),'-',''),'(',''),')','')) = 10
            THEN '+33' || substr(replace(replace(replace(replace(replace(trim(telephone_raw),' ',''),'.',''),'-',''),'(',''),')',''),2)

          -- FR mobile probable sans le 0: 9 chiffres commençant par 6 ou 7
          WHEN length(replace(replace(replace(replace(replace(trim(telephone_raw),' ',''),'.',''),'-',''),'(',''),')','')) = 9
               AND substr(replace(replace(replace(replace(replace(trim(telephone_raw),' ',''),'.',''),'-',''),'(',''),')',''),1,1) IN ('6','7')
            THEN '+33' || replace(replace(replace(replace(replace(trim(telephone_raw),' ',''),'.',''),'-',''),'(',''),')','')

          ELSE NULL
        END
    END
  ) STORED
);

-- 2) Copier les données (les colonnes générées se recalculent)
INSERT INTO clients_new
(id, nom, prenom, date_naissance, adresse, code_postal, ville, email, telephone_raw,
 relais_prefere, contacter, derniere_commande, created_at)
SELECT
 id, nom, prenom, date_naissance, adresse, code_postal, ville, email, telephone_raw,
 relais_prefere, contacter, derniere_commande, created_at
FROM clients;

-- 3) Remplacer l’ancienne table
DROP TABLE clients;
ALTER TABLE clients_new RENAME TO clients;

-- 4) Index
CREATE UNIQUE INDEX IF NOT EXISTS ux_clients_email_norm ON clients(email_norm);
CREATE INDEX IF NOT EXISTS ix_clients_nom_prenom ON clients(nom, prenom);
CREATE INDEX IF NOT EXISTS ix_clients_ville ON clients(ville);

COMMIT;

-- ============================================
-- Tables pour les groupes de collections et commandes
-- ============================================

BEGIN;

-- Table des collections (chaque collection a uniquement un nom)
CREATE TABLE IF NOT EXISTS collections (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  nom                   TEXT NOT NULL,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Table des groupes de collections
-- Chaque groupe a trois formats (A, B, C) avec chacun un prix (INTEGER)
-- Un groupe peut contenir un nombre variable de collections (1 à +)
CREATE TABLE IF NOT EXISTS groupes_collections (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  nom                   TEXT NOT NULL UNIQUE,
  format_A_prix         INTEGER NOT NULL DEFAULT 0,
  format_B_prix         INTEGER NOT NULL DEFAULT 0,
  format_C_prix         INTEGER NOT NULL DEFAULT 0,
  description           TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Table de liaison entre groupes et collections
-- Permet un nombre variable de collections par groupe (pas de contrainte d'ordre fixe)
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
-- Une commande est liée à une cliente
-- Une commande référence un groupe et un format (A, B ou C) et contient 1 ou + collections de ce groupe
-- Une commande ne peut pas avoir des collections de groupes différents
CREATE TABLE IF NOT EXISTS commandes (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id             INTEGER NOT NULL,
  groupe_id             INTEGER NOT NULL,
  format_type           TEXT NOT NULL CHECK (format_type IN ('A', 'B', 'C')),
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
CREATE INDEX IF NOT EXISTS ix_commandes_client_id ON commandes(client_id);
CREATE INDEX IF NOT EXISTS ix_commandes_groupe_id ON commandes(groupe_id);
CREATE INDEX IF NOT EXISTS ix_commandes_reglee ON commandes(reglee);
CREATE INDEX IF NOT EXISTS ix_groupes_collections_nom ON groupes_collections(nom);
CREATE INDEX IF NOT EXISTS ix_groupe_collections_groupe_id ON groupe_collections(groupe_id);
CREATE INDEX IF NOT EXISTS ix_groupe_collections_collection_id ON groupe_collections(collection_id);
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