-- Migration pour créer la table stocks
BEGIN;

CREATE TABLE IF NOT EXISTS stocks (
  collection_id         INTEGER NOT NULL,
  format                TEXT NOT NULL CHECK (format IN ('A', 'B', 'C')),
  quantite_commande    INTEGER NOT NULL DEFAULT 0,
  quantite_stock       INTEGER NOT NULL DEFAULT 0,
  gere                 INTEGER NOT NULL DEFAULT 0 CHECK (gere IN (0,1)),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (collection_id, format),
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_stocks_collection_id ON stocks(collection_id);
CREATE INDEX IF NOT EXISTS ix_stocks_gere ON stocks(gere);

COMMIT;


