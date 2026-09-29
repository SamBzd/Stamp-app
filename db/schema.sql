-- Stamp App — Schéma cible catalogues et kits
-- Ce fichier décrit l'état cible de la base de données.
-- Une base neuve est créée depuis ce fichier puis marquée à la version
-- courante par le mécanisme de migrations.

-- ============================================================
-- TABLE : schema_migrations — historique technique du schéma
-- ============================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    INTEGER PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  checksum   TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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
  ) STORED,
  archive INTEGER NOT NULL DEFAULT 0 CHECK (archive IN (0,1))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_clients_email_norm ON clients(email_norm);
CREATE INDEX IF NOT EXISTS ix_clients_nom_prenom ON clients(nom, prenom);
CREATE INDEX IF NOT EXISTS ix_clients_ville ON clients(ville);


CREATE TABLE settings (
  cle TEXT PRIMARY KEY CHECK (cle IN ('prix_catalogue_A_cents','prix_catalogue_B_cents','prix_catalogue_C_cents')),
  valeur INTEGER NOT NULL CHECK (typeof(valeur) = 'integer' AND valeur BETWEEN 0 AND 10000)
);
INSERT INTO settings (cle, valeur) VALUES
 ('prix_catalogue_A_cents',3500), ('prix_catalogue_B_cents',4000), ('prix_catalogue_C_cents',4500);

CREATE TABLE papiers_cartonnes (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 nom TEXT NOT NULL UNIQUE,
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 archive INTEGER NOT NULL DEFAULT 0 CHECK (archive IN (0,1))
);
CREATE UNIQUE INDEX ux_papiers_cartonnes_nom_normalise
  ON papiers_cartonnes(lower(trim(nom)));

CREATE TABLE catalogues (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 titre TEXT NOT NULL UNIQUE,
 papier_spe TEXT,
 embellissement TEXT,
 statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon','publie')),
 archive INTEGER NOT NULL DEFAULT 0 CHECK (archive IN (0,1)),
 prix_A_cents INTEGER CHECK (prix_A_cents IS NULL OR (typeof(prix_A_cents) = 'integer' AND prix_A_cents >= 0 AND prix_A_cents <= 10000)),
 prix_B_cents INTEGER CHECK (prix_B_cents IS NULL OR (typeof(prix_B_cents) = 'integer' AND prix_B_cents >= 0 AND prix_B_cents <= 10000)),
 prix_C_cents INTEGER CHECK (prix_C_cents IS NULL OR (typeof(prix_C_cents) = 'integer' AND prix_C_cents >= 0 AND prix_C_cents <= 10000)),
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 updated_at TEXT NOT NULL DEFAULT (datetime('now')),
 CHECK (statut != 'publie' OR (prix_A_cents IS NOT NULL AND prix_B_cents IS NOT NULL AND prix_C_cents IS NOT NULL))
);

CREATE TABLE collections (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 catalogue_id INTEGER NOT NULL REFERENCES catalogues(id) ON DELETE RESTRICT,
 nom TEXT NOT NULL,
 ordre INTEGER NOT NULL CHECK (typeof(ordre) = 'integer' AND ordre BETWEEN 1 AND 4),
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 UNIQUE(catalogue_id, ordre)
);
CREATE INDEX ix_collections_catalogue_id ON collections(catalogue_id);

CREATE TABLE collection_papiers (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE RESTRICT,
 papier_cartonne_id INTEGER NOT NULL REFERENCES papiers_cartonnes(id) ON DELETE RESTRICT,
 ordre INTEGER NOT NULL CHECK (typeof(ordre) = 'integer' AND ordre BETWEEN 1 AND 5),
 UNIQUE(collection_id, papier_cartonne_id),
 UNIQUE(collection_id, ordre)
);
CREATE INDEX ix_collection_papiers_collection_id ON collection_papiers(collection_id);

CREATE TABLE catalogue_rubans (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 catalogue_id INTEGER NOT NULL REFERENCES catalogues(id) ON DELETE RESTRICT,
 nom TEXT NOT NULL CHECK (length(trim(nom)) > 0),
 ordre INTEGER NOT NULL CHECK (typeof(ordre) = 'integer' AND ordre BETWEEN 1 AND 2),
 UNIQUE(catalogue_id, ordre)
);
CREATE INDEX ix_catalogue_rubans_catalogue_id ON catalogue_rubans(catalogue_id);

CREATE TABLE commandes (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
 type TEXT NOT NULL CHECK (type IN ('kit','hors_kit')),
 catalogue_id INTEGER REFERENCES catalogues(id) ON DELETE RESTRICT,
 catalogue_titre TEXT,
 format_type TEXT CHECK (format_type IN ('A','B','C')),
 papier_supplementaire INTEGER NOT NULL DEFAULT 0 CHECK (papier_supplementaire IN (0,1)),
 prix_format_cents INTEGER CHECK (prix_format_cents IS NULL OR (typeof(prix_format_cents) = 'integer' AND prix_format_cents >= 0 AND prix_format_cents <= 10000)),
 prix_option_cents INTEGER CHECK (prix_option_cents IS NULL OR (typeof(prix_option_cents) = 'integer' AND prix_option_cents >= 0)),
 prix_applique_cents INTEGER CHECK (prix_applique_cents IS NULL OR (typeof(prix_applique_cents) = 'integer' AND prix_applique_cents >= 0)),
 prix_origine TEXT CHECK (prix_origine IN ('automatique','manuelle')),
 papier_spe_nom TEXT,
 papier_spe_quantite INTEGER NOT NULL DEFAULT 0 CHECK (papier_spe_quantite IN (0,1)),
 embellissement_nom TEXT,
 embellissement_quantite INTEGER NOT NULL DEFAULT 0 CHECK (embellissement_quantite IN (0,1)),
 produit_promo_texte TEXT,
 produit_promo_prix_cents INTEGER CHECK (produit_promo_prix_cents IS NULL OR (typeof(produit_promo_prix_cents) = 'integer' AND produit_promo_prix_cents >= 0)),
 autres_texte TEXT,
 autres_prix_cents INTEGER CHECK (autres_prix_cents IS NULL OR (typeof(autres_prix_cents) = 'integer' AND autres_prix_cents >= 0)),
 -- Colonnes hors-kit conservées : contrat et fidélité inchangés.
 montant REAL,
 date_commande TEXT,
 cadeau_texte TEXT,
 cadeau_valeur REAL,
 methode_paiement TEXT CHECK (methode_paiement IN ('Paypal','chèque','virement')),
 reglee INTEGER NOT NULL DEFAULT 0 CHECK (reglee IN (0,1)),
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 updated_at TEXT NOT NULL DEFAULT (datetime('now')),
 CHECK (type != 'kit' OR (
  catalogue_id IS NOT NULL AND catalogue_titre IS NOT NULL AND length(trim(catalogue_titre)) > 0
  AND format_type IS NOT NULL AND prix_format_cents IS NOT NULL AND prix_option_cents IS NOT NULL
  AND prix_applique_cents IS NOT NULL AND prix_origine IS NOT NULL
  AND (papier_spe_quantite = 1 OR embellissement_quantite = 1)
 )),
 CHECK ((papier_spe_nom IS NULL AND papier_spe_quantite = 0)
  OR (papier_spe_nom IS NOT NULL AND length(trim(papier_spe_nom)) > 0 AND papier_spe_quantite = 1)),
 CHECK ((embellissement_nom IS NULL AND embellissement_quantite = 0)
  OR (embellissement_nom IS NOT NULL AND length(trim(embellissement_nom)) > 0 AND embellissement_quantite = 1)),
 CHECK ((produit_promo_texte IS NULL AND produit_promo_prix_cents IS NULL)
  OR (produit_promo_texte IS NOT NULL AND length(trim(produit_promo_texte)) > 0 AND produit_promo_prix_cents IS NOT NULL)),
 CHECK ((autres_texte IS NULL AND autres_prix_cents IS NULL)
  OR (autres_texte IS NOT NULL AND length(trim(autres_texte)) > 0 AND autres_prix_cents IS NOT NULL))
);
CREATE INDEX ix_commandes_client_id ON commandes(client_id);
CREATE INDEX ix_commandes_type ON commandes(type);
CREATE INDEX ix_commandes_reglee ON commandes(reglee);
CREATE INDEX ix_commandes_catalogue_id ON commandes(catalogue_id);

CREATE TABLE commande_collections (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 commande_id INTEGER NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
 collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE RESTRICT,
 collection_nom TEXT NOT NULL CHECK (length(trim(collection_nom)) > 0),
 nb_feuilles INTEGER NOT NULL CHECK (nb_feuilles IN (2,3,5)),
 UNIQUE(commande_id, collection_id)
);
CREATE INDEX ix_commande_collections_commande_id ON commande_collections(commande_id);

CREATE TABLE commande_papiers_selectionnes (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 commande_collection_id INTEGER NOT NULL REFERENCES commande_collections(id) ON DELETE CASCADE,
 papier_cartonne_id INTEGER NOT NULL REFERENCES papiers_cartonnes(id) ON DELETE RESTRICT,
 papier_nom TEXT NOT NULL CHECK (length(trim(papier_nom)) > 0),
 quantite_base INTEGER NOT NULL CHECK (typeof(quantite_base) = 'integer' AND quantite_base > 0),
 UNIQUE(commande_collection_id, papier_cartonne_id)
);
CREATE INDEX ix_commande_papiers_collection_id ON commande_papiers_selectionnes(commande_collection_id);

CREATE TABLE commande_rubans (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 commande_id INTEGER NOT NULL UNIQUE REFERENCES commandes(id) ON DELETE CASCADE,
 ruban_id INTEGER NOT NULL REFERENCES catalogue_rubans(id) ON DELETE RESTRICT,
 ruban_nom TEXT NOT NULL CHECK (length(trim(ruban_nom)) > 0),
 quantite INTEGER NOT NULL DEFAULT 1 CHECK (quantite = 1)
);
CREATE INDEX ix_commande_rubans_ruban_id ON commande_rubans(ruban_id);

CREATE TRIGGER commandes_reglees_suppression
BEFORE DELETE ON commandes WHEN OLD.reglee = 1
BEGIN SELECT RAISE(ABORT, 'Une commande reglee ne peut pas etre supprimee'); END;
CREATE TRIGGER commandes_reglees_modification
BEFORE UPDATE ON commandes WHEN OLD.reglee = 1
BEGIN SELECT RAISE(ABORT, 'Une commande reglee est immuable'); END;

-- Les snapshots d'une commande réglée ne peuvent plus être réécrits.
CREATE TRIGGER commande_collections_reglees_insert
BEFORE INSERT ON commande_collections WHEN EXISTS (SELECT 1 FROM commandes WHERE id = NEW.commande_id AND reglee = 1)
BEGIN SELECT RAISE(ABORT, 'La composition reglee est immuable'); END;
CREATE TRIGGER commande_collections_reglees_update
BEFORE UPDATE ON commande_collections WHEN EXISTS (SELECT 1 FROM commandes WHERE id = OLD.commande_id AND reglee = 1) OR EXISTS (SELECT 1 FROM commandes WHERE id = NEW.commande_id AND reglee = 1)
BEGIN SELECT RAISE(ABORT, 'La composition reglee est immuable'); END;
CREATE TRIGGER commande_collections_reglees_delete
BEFORE DELETE ON commande_collections WHEN EXISTS (SELECT 1 FROM commandes WHERE id = OLD.commande_id AND reglee = 1)
BEGIN SELECT RAISE(ABORT, 'La composition reglee est immuable'); END;
CREATE TRIGGER commande_papiers_selectionnes_reglees_insert
BEFORE INSERT ON commande_papiers_selectionnes WHEN EXISTS (SELECT 1 FROM commandes c JOIN commande_collections cc ON cc.commande_id = c.id WHERE cc.id = NEW.commande_collection_id AND c.reglee = 1)
BEGIN SELECT RAISE(ABORT, 'La composition reglee est immuable'); END;
CREATE TRIGGER commande_papiers_selectionnes_reglees_update
BEFORE UPDATE ON commande_papiers_selectionnes WHEN EXISTS (SELECT 1 FROM commandes c JOIN commande_collections cc ON cc.commande_id = c.id WHERE cc.id = OLD.commande_collection_id AND c.reglee = 1) OR EXISTS (SELECT 1 FROM commandes c JOIN commande_collections cc ON cc.commande_id = c.id WHERE cc.id = NEW.commande_collection_id AND c.reglee = 1)
BEGIN SELECT RAISE(ABORT, 'La composition reglee est immuable'); END;
CREATE TRIGGER commande_papiers_selectionnes_reglees_delete
BEFORE DELETE ON commande_papiers_selectionnes WHEN EXISTS (SELECT 1 FROM commandes c JOIN commande_collections cc ON cc.commande_id = c.id WHERE cc.id = OLD.commande_collection_id AND c.reglee = 1)
BEGIN SELECT RAISE(ABORT, 'La composition reglee est immuable'); END;
CREATE TRIGGER commande_rubans_reglees_insert
BEFORE INSERT ON commande_rubans WHEN EXISTS (SELECT 1 FROM commandes WHERE id = NEW.commande_id AND reglee = 1)
BEGIN SELECT RAISE(ABORT, 'La composition reglee est immuable'); END;
CREATE TRIGGER commande_rubans_reglees_update
BEFORE UPDATE ON commande_rubans WHEN EXISTS (SELECT 1 FROM commandes WHERE id = OLD.commande_id AND reglee = 1) OR EXISTS (SELECT 1 FROM commandes WHERE id = NEW.commande_id AND reglee = 1)
BEGIN SELECT RAISE(ABORT, 'La composition reglee est immuable'); END;
CREATE TRIGGER commande_rubans_reglees_delete
BEFORE DELETE ON commande_rubans WHEN EXISTS (SELECT 1 FROM commandes WHERE id = OLD.commande_id AND reglee = 1)
BEGIN SELECT RAISE(ABORT, 'La composition reglee est immuable'); END;
