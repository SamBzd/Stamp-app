-- #45 : conserver les anciens kits et leurs fournitures, sans ajouter de besoin.
ALTER TABLE commandes ADD COLUMN papier_collection_inclus INTEGER NOT NULL DEFAULT 0
  CHECK (papier_collection_inclus IN (0,1));

CREATE TEMP TABLE fourniture_unites_v4 AS SELECT * FROM fourniture_unites;
CREATE TEMP TABLE fourniture_alertes_v4 AS SELECT * FROM fourniture_alertes;
CREATE TEMP TABLE fourniture_sequences_v4 AS
  SELECT name,seq FROM sqlite_sequence WHERE name IN ('fourniture_unites','fourniture_alertes');
DROP TABLE fourniture_alertes;
DROP TABLE fourniture_unites;

CREATE TABLE fourniture_unites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commande_id INTEGER REFERENCES commandes(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('papier_collection','papier_cartonne','ruban','papier_special','embellissement')),
  nom TEXT NOT NULL CHECK (length(trim(nom)) > 0),
  format_type TEXT CHECK ((type = 'papier_collection' AND format_type IS NOT NULL AND format_type IN ('A','B','C'))
    OR (type != 'papier_collection' AND format_type IS NULL)),
  etat TEXT NOT NULL DEFAULT 'À traiter'
    CHECK (etat IN ('À traiter','Commandé','Disponible','Expédié','Traité')),
  archive INTEGER NOT NULL DEFAULT 0 CHECK (archive IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT,
  CHECK ((archive = 0 AND archived_at IS NULL)
    OR (archive = 1 AND etat = 'Traité' AND archived_at IS NOT NULL))
);
CREATE INDEX ix_fourniture_unites_commande ON fourniture_unites(commande_id);
CREATE INDEX ix_fourniture_unites_kanban ON fourniture_unites(archive,type,nom,format_type,etat,id);

-- Les alertes survivent a l'archivage des unites et a la suppression de leur commande.
CREATE TABLE fourniture_alertes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unite_id INTEGER REFERENCES fourniture_unites(id) ON DELETE SET NULL,
  commande_id INTEGER REFERENCES commandes(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('papier_collection','papier_cartonne','ruban','papier_special','embellissement')),
  nom TEXT NOT NULL CHECK (length(trim(nom)) > 0),
  format_type TEXT CHECK ((type = 'papier_collection' AND format_type IS NOT NULL AND format_type IN ('A','B','C'))
    OR (type != 'papier_collection' AND format_type IS NULL)),
  code TEXT NOT NULL CHECK (code IN ('surplus','ancien_besoin','commande_supprimee')),
  message TEXT NOT NULL CHECK (length(trim(message)) > 0),
  dedupe_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX ix_fourniture_alertes_public
  ON fourniture_alertes(type,nom,format_type,code,created_at,id);


-- Le type historique papier_collection désignait en réalité les papiers cartonnés.
INSERT INTO fourniture_unites(id,commande_id,type,nom,format_type,etat,archive,created_at,updated_at,archived_at)
  SELECT id,commande_id,CASE type WHEN 'papier_collection' THEN 'papier_cartonne' ELSE type END,
    nom,NULL,etat,archive,created_at,updated_at,archived_at FROM fourniture_unites_v4;
INSERT INTO fourniture_alertes(id,unite_id,commande_id,type,nom,format_type,code,message,dedupe_key,created_at)
  SELECT id,unite_id,commande_id,CASE type WHEN 'papier_collection' THEN 'papier_cartonne' ELSE type END,
    nom,NULL,code,message,dedupe_key,created_at FROM fourniture_alertes_v4;
-- Conserver aussi les compteurs des unités supprimées (les alertes dédupliquent par id).
UPDATE sqlite_sequence SET seq = max(seq,coalesce((
  SELECT seq FROM fourniture_sequences_v4 WHERE name=sqlite_sequence.name
),0)) WHERE name IN ('fourniture_unites','fourniture_alertes');
INSERT INTO sqlite_sequence(name,seq)
  SELECT name,seq FROM fourniture_sequences_v4 old
  WHERE NOT EXISTS (SELECT 1 FROM sqlite_sequence current WHERE current.name=old.name);
DROP TABLE fourniture_alertes_v4;
DROP TABLE fourniture_unites_v4;
DROP TABLE fourniture_sequences_v4;
