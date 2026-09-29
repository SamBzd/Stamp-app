-- Bibliotheque de papiers : archivage et unicite insensible a la casse/aux espaces externes.
ALTER TABLE papiers_cartonnes
  ADD COLUMN archive INTEGER NOT NULL DEFAULT 0 CHECK (archive IN (0,1));

CREATE UNIQUE INDEX ux_papiers_cartonnes_nom_normalise
  ON papiers_cartonnes(lower(trim(nom)));
