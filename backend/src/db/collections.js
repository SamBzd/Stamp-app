const db = require('./connection');
const v = require('./source-validation');
const { mutateCatalogue } = require('./catalogues');
function getCollectionById(id) {
  return db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
}
function getAllCollections() {
  return db.prepare('SELECT * FROM collections ORDER BY nom, id').all();
}
function requireCollection(id) {
  const col = getCollectionById(id);
  if (!col) v.invalid('Collection non trouvée', 404);
  return col;
}
function addCollection(catalogueId, nom) {
  nom = v.name(nom);
  const id = mutateCatalogue(catalogueId, () => {
    const count = db.prepare('SELECT COUNT(*) AS n FROM collections WHERE catalogue_id = ?').get(catalogueId).n;
    if (count >= 4) v.invalid('Un catalogue ne peut pas avoir plus de 4 collections');
    return db.prepare('INSERT INTO collections(catalogue_id,nom,ordre) VALUES (?,?,?)').run(catalogueId, nom, count + 1).lastInsertRowid;
  });
  return getCollectionById(id);
}
function updateCollection(id, nom) {
  const col = requireCollection(id);
  nom = v.name(nom);
  mutateCatalogue(col.catalogue_id, () => db.prepare('UPDATE collections SET nom = ? WHERE id = ?').run(nom, id));
  return getCollectionById(id);
}
function setPapiersCollection(id, papierIds) {
  const col = requireCollection(id);
  if (!Array.isArray(papierIds) || papierIds.length > 5) v.invalid('papier_ids doit contenir au plus 5 papiers');
  papierIds.forEach(v.id);
  if (new Set(papierIds).size !== papierIds.length) v.invalid('Les papiers doivent être différents');
  mutateCatalogue(col.catalogue_id, () => {
    for (const papierId of papierIds) {
      if (!db.prepare('SELECT id FROM papiers_cartonnes WHERE id = ?').get(papierId)) v.invalid('Papier non trouvé', 404);
    }
    db.prepare('DELETE FROM collection_papiers WHERE collection_id = ?').run(id);
    papierIds.forEach((papierId, index) => db.prepare('INSERT INTO collection_papiers(collection_id,papier_cartonne_id,ordre) VALUES (?,?,?)').run(id, papierId, index + 1));
  });
  return getCollectionById(id);
}
module.exports = { getCollectionById, getAllCollections, addCollection, updateCollection, setPapiersCollection };
