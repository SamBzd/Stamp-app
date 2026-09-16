-- Refus atomique des données métier sans historique fiable.
CREATE TEMP TABLE catalogue_migration_guard (incompatible INTEGER);
CREATE TEMP TRIGGER catalogue_migration_refus BEFORE INSERT ON catalogue_migration_guard
WHEN NEW.incompatible != 0
BEGIN SELECT RAISE(ABORT, 'Donnees metier incompatibles ou tarifs invalides : initialiser explicitement une base cible neuve'); END;
INSERT INTO catalogue_migration_guard SELECT
 (SELECT count(*) FROM catalogues) + (SELECT count(*) FROM collections)
 + (SELECT count(*) FROM collection_papiers) + (SELECT count(*) FROM papiers_cartonnes)
 + (SELECT count(*) FROM commandes) + (SELECT count(*) FROM commande_collections)
 + (SELECT count(*) FROM commande_papiers_selectionnes)
 + (SELECT count(*) FROM settings WHERE cle NOT IN ('prix_A','prix_B','prix_C')
  OR trim(valeur) = '' OR trim(valeur) NOT GLOB '*[0-9]*'
  OR trim(valeur) GLOB '*[^0-9.]*'
  OR length(valeur) - length(replace(valeur,'.','')) > 1
  OR CAST(valeur AS REAL) < 0 OR CAST(valeur AS REAL) > 100
  OR abs(CAST(valeur AS REAL)*100 - round(CAST(valeur AS REAL)*100)) > 0.000001);
DROP TRIGGER catalogue_migration_refus;
DROP TABLE catalogue_migration_guard;

ALTER TABLE clients ADD COLUMN archive INTEGER NOT NULL DEFAULT 0 CHECK (archive IN (0,1));
CREATE TEMP TABLE catalogue_old_settings AS SELECT * FROM settings;
DROP TABLE commande_papiers_selectionnes;
DROP TABLE commande_collections;
DROP TABLE commandes;
DROP TABLE collection_papiers;
DROP TABLE collections;
DROP TABLE catalogues;
DROP TABLE papiers_cartonnes;
DROP TABLE settings;

CREATE TABLE settings (
  cle TEXT PRIMARY KEY CHECK (cle IN ('prix_catalogue_A_cents','prix_catalogue_B_cents','prix_catalogue_C_cents')),
  valeur INTEGER NOT NULL CHECK (typeof(valeur) = 'integer' AND valeur BETWEEN 0 AND 10000)
);
INSERT INTO settings (cle, valeur) VALUES
 ('prix_catalogue_A_cents',3500), ('prix_catalogue_B_cents',4000), ('prix_catalogue_C_cents',4500);

CREATE TABLE papiers_cartonnes (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 nom TEXT NOT NULL UNIQUE,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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

UPDATE settings SET valeur = COALESCE((
 SELECT CAST(round(CAST(old.valeur AS REAL)*100) AS INTEGER) FROM catalogue_old_settings old
 WHERE old.cle = CASE settings.cle
 WHEN 'prix_catalogue_A_cents' THEN 'prix_A'
 WHEN 'prix_catalogue_B_cents' THEN 'prix_B'
 ELSE 'prix_C' END
), valeur);
DROP TABLE catalogue_old_settings;
