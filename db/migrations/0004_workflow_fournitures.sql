-- Workflow operationnel des fournitures. Aucune commande existante n'est reprise.
CREATE TABLE fourniture_unites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commande_id INTEGER REFERENCES commandes(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('papier_collection','ruban','papier_special','embellissement')),
  nom TEXT NOT NULL CHECK (length(trim(nom)) > 0),
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
CREATE INDEX ix_fourniture_unites_kanban ON fourniture_unites(archive,type,nom,etat,id);

CREATE TABLE fourniture_alertes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unite_id INTEGER REFERENCES fourniture_unites(id) ON DELETE SET NULL,
  commande_id INTEGER REFERENCES commandes(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('papier_collection','ruban','papier_special','embellissement')),
  nom TEXT NOT NULL CHECK (length(trim(nom)) > 0),
  code TEXT NOT NULL CHECK (code IN ('surplus','ancien_besoin','commande_supprimee')),
  message TEXT NOT NULL CHECK (length(trim(message)) > 0),
  dedupe_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX ix_fourniture_alertes_public
  ON fourniture_alertes(type,nom,code,created_at,id);
