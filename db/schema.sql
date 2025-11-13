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
