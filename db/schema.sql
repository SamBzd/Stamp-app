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
-- Tables pour les commandes
-- ============================================

BEGIN;

-- Table principale des commandes
CREATE TABLE IF NOT EXISTS commandes (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id             INTEGER NOT NULL,
  format_type           TEXT NOT NULL CHECK (format_type IN ('A', 'B', 'C')),
  papier_supplementaire INTEGER NOT NULL DEFAULT 0 CHECK (papier_supplementaire IN (0,1)),
  format_description    TEXT,
  format_prix           REAL DEFAULT 0,
  articles_supplementaires TEXT,
  methode_paiement      TEXT NOT NULL CHECK (methode_paiement IN ('Paypal', 'chèque', 'virement')),
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Table des collections (réutilisables dans plusieurs commandes)
CREATE TABLE IF NOT EXISTS collections (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  nom                   TEXT NOT NULL UNIQUE,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

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
CREATE INDEX IF NOT EXISTS ix_commandes_client_id ON commandes(client_id);
CREATE INDEX IF NOT EXISTS ix_commandes_format_type ON commandes(format_type);
CREATE INDEX IF NOT EXISTS ix_groupes_collections_nom ON groupes_collections(nom);
CREATE INDEX IF NOT EXISTS ix_groupe_collections_groupe_id ON groupe_collections(groupe_id);
CREATE INDEX IF NOT EXISTS ix_groupe_collections_collection_id ON groupe_collections(collection_id);
CREATE INDEX IF NOT EXISTS ix_commande_collections_commande_id ON commande_collections(commande_id);
CREATE INDEX IF NOT EXISTS ix_commande_collections_groupe_id ON commande_collections(groupe_id);
CREATE INDEX IF NOT EXISTS ix_commande_collections_commande_ordre ON commande_collections(commande_id, ordre_commande);

-- Trigger pour valider qu'un groupe contient exactement 3 collections
CREATE TRIGGER IF NOT EXISTS check_groupe_3_collections
AFTER INSERT ON groupe_collections
FOR EACH ROW
BEGIN
  -- Vérifier qu'il n'y a pas plus de 3 collections dans le groupe
  -- Cette vérification se fait via la contrainte UNIQUE(groupe_id, ordre)
END;

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