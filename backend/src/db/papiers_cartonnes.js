const db = require('./connection');
const v = require('./source-validation');
const { mutateCatalogue } = require('./catalogues');
const { normalizePaperName } = require('./paper-name');
function searchPapiersCartonnes(search = '', { includeArchives = false } = {}) {
  if (typeof search !== 'string') v.invalid('search doit être une chaîne');
  const normalizedSearch = normalizePaperName(search);
  const papers = db.prepare(`SELECT id,nom,archive,created_at FROM papiers_cartonnes
    WHERE (? = 1 OR archive = 0)
    ORDER BY archive, nom COLLATE NOCASE, id`)
    .all(Number(includeArchives))
    .filter(paper => !normalizedSearch || normalizePaperName(paper.nom).includes(normalizedSearch));
  if (normalizedSearch) return papers.slice(0, 20);
  return includeArchives ? papers : papers.slice(0, 100);
}
function getPapier(id) { return db.prepare('SELECT * FROM papiers_cartonnes WHERE id = ?').get(id); }
function requirePapier(id) {
  const papier = getPapier(id);
  if (!papier) v.invalid('Papier non trouvé', 404);
  return papier;
}
function assertNameAvailable(nom, ignoredId = null) {
  const normalized = normalizePaperName(nom);
  const duplicate = db.prepare('SELECT id,nom FROM papiers_cartonnes WHERE (? IS NULL OR id != ?)')
    .all(ignoredId, ignoredId).find(papier => normalizePaperName(papier.nom) === normalized);
  if (duplicate) v.invalid('Un papier avec ce nom existe déjà', 409);
}
function createPapierCartonne(nom) {
  nom = v.name(nom);
  assertNameAvailable(nom);
  const result = db.prepare('INSERT INTO papiers_cartonnes(nom) VALUES (?)').run(nom);
  return getPapier(result.lastInsertRowid);
}
const updatePapierCartonne = db.transaction((id, nom) => {
  requirePapier(id);
  nom = v.name(nom);
  assertNameAvailable(nom, id);
  db.prepare('UPDATE papiers_cartonnes SET nom = ? WHERE id = ?').run(nom, id);
  const catalogues = db.prepare(`SELECT DISTINCT c.catalogue_id FROM collections c
    JOIN collection_papiers cp ON cp.collection_id=c.id WHERE cp.papier_cartonne_id=?`).all(id);
  for (const cat of catalogues) mutateCatalogue(cat.catalogue_id, () => {});
  return getPapier(id);
});
const archivePapierCartonne = db.transaction((id, data) => {
  const papier = requirePapier(id);
  const archive = v.archive(data);
  if (archive && !papier.archive) {
    const published = db.prepare(`SELECT cat.id,cat.titre FROM catalogues cat
      JOIN collections col ON col.catalogue_id=cat.id
      JOIN collection_papiers cp ON cp.collection_id=col.id
      WHERE cp.papier_cartonne_id=? AND cat.statut='publie' LIMIT 1`).get(id);
    if (published) v.invalid(`Ce papier est utilisé par le catalogue publié « ${published.titre} »`, 409);
  }
  db.prepare('UPDATE papiers_cartonnes SET archive=? WHERE id=?').run(Number(archive), id);
  return getPapier(id);
});
module.exports = { searchPapiersCartonnes, createPapierCartonne, updatePapierCartonne, archivePapierCartonne };
