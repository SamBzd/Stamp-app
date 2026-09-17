const db = require('./connection');
const v = require('./source-validation');
const { mutateCatalogue } = require('./catalogues');
function searchPapiersCartonnes(search = '') {
  if (typeof search !== 'string') v.invalid('search doit être une chaîne');
  return db.prepare('SELECT id,nom,created_at FROM papiers_cartonnes WHERE nom LIKE ? ORDER BY nom LIMIT ?')
    .all(`%${search.trim()}%`, search.trim() ? 20 : 50);
}
function getPapier(id) { return db.prepare('SELECT * FROM papiers_cartonnes WHERE id = ?').get(id); }
function createPapierCartonne(nom) {
  const result = db.prepare('INSERT INTO papiers_cartonnes(nom) VALUES (?)').run(v.name(nom));
  return getPapier(result.lastInsertRowid);
}
const updatePapierCartonne = db.transaction((id, nom) => {
  if (!getPapier(id)) v.invalid('Papier non trouvé', 404);
  db.prepare('UPDATE papiers_cartonnes SET nom = ? WHERE id = ?').run(v.name(nom), id);
  const catalogues = db.prepare(`SELECT DISTINCT c.catalogue_id FROM collections c
    JOIN collection_papiers cp ON cp.collection_id=c.id WHERE cp.papier_cartonne_id=?`).all(id);
  for (const cat of catalogues) mutateCatalogue(cat.catalogue_id, () => {});
  return getPapier(id);
});
module.exports = { searchPapiersCartonnes, createPapierCartonne, updatePapierCartonne };
