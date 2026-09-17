const db = require('./connection');
const v = require('./source-validation');
const { mutateCatalogue } = require('./catalogues');
function addRuban(catalogueId, nom) {
  nom = v.name(nom);
  const id = mutateCatalogue(catalogueId, () => {
    const n = db.prepare('SELECT count(*) AS n FROM catalogue_rubans WHERE catalogue_id = ?').get(catalogueId).n;
    if (n >= 2) v.invalid('Un catalogue ne peut pas avoir plus de 2 rubans');
    return db.prepare('INSERT INTO catalogue_rubans(catalogue_id,nom,ordre) VALUES (?,?,?)').run(catalogueId, nom, n + 1).lastInsertRowid;
  });
  return db.prepare('SELECT * FROM catalogue_rubans WHERE id = ?').get(id);
}
function updateRuban(id, nom) {
  const ruban = db.prepare('SELECT * FROM catalogue_rubans WHERE id = ?').get(id);
  if (!ruban) v.invalid('Ruban non trouvé', 404);
  nom = v.name(nom);
  mutateCatalogue(ruban.catalogue_id, () => db.prepare('UPDATE catalogue_rubans SET nom = ? WHERE id = ?').run(nom, id));
  return db.prepare('SELECT * FROM catalogue_rubans WHERE id = ?').get(id);
}
module.exports = { addRuban, updateRuban };
