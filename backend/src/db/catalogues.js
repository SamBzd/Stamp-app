const db = require('./connection');
const v = require('./source-validation');
const { getSettings } = require('./settings');

function getCatalogueById(id) {
  const catalogue = db.prepare('SELECT * FROM catalogues WHERE id = ?').get(id);
  if (!catalogue) return null;
  catalogue.collections = db.prepare('SELECT * FROM collections WHERE catalogue_id = ? ORDER BY ordre').all(id).map(col => ({
    ...col,
    papiers: db.prepare(`SELECT pc.id, pc.nom, cp.ordre FROM collection_papiers cp
      JOIN papiers_cartonnes pc ON pc.id = cp.papier_cartonne_id WHERE cp.collection_id = ? ORDER BY cp.ordre`).all(col.id)
  }));
  catalogue.rubans = db.prepare('SELECT * FROM catalogue_rubans WHERE catalogue_id = ? ORDER BY ordre').all(id);
  catalogue.formats_disponibles = catalogue.statut === 'publie' && !catalogue.archive
    ? (catalogue.collections.length >= 2 ? ['A', 'B', 'C'] : ['C']) : [];
  return catalogue;
}
function getAllCatalogues({ includeArchives = false, utilisables = false } = {}) {
  return db.prepare('SELECT id FROM catalogues WHERE (? = 1 OR archive = 0) ORDER BY created_at DESC, id DESC')
    .all(Number(includeArchives)).map(row => getCatalogueById(row.id))
    .filter(cat => !utilisables || cat.formats_disponibles.length > 0);
}
function validateComposition(cat) {
  if (cat.collections.length > 4 || cat.collections.some(col => col.papiers.length > 5) || cat.rubans.length > 2) {
    v.invalid('Maximum dépassé : 4 collections, 5 papiers par collection, 2 rubans');
  }
  const errors = [];
  if (!cat.papier_spe?.trim() && !cat.embellissement?.trim()) errors.push('Papier spécial ou embellissement requis');
  if (!cat.collections.length) errors.push('Au moins une collection est requise');
  if (cat.collections.some(col => !col.nom.trim() || !col.papiers.length)) errors.push('Chaque collection doit être nommée et contenir au moins un papier');
  if (cat.rubans.some(ruban => !ruban.nom.trim())) errors.push('Chaque ruban doit être nommé');
  if (v.prices.some(key => !Number.isInteger(cat[key]) || cat[key] < 0 || cat[key] > 10000)) errors.push('Les trois tarifs doivent être définis entre 0 et 10000 centimes');
  return errors;
}
// Toutes les mutations source passent ici : dépassement annulé, démotion atomique.
const mutateCatalogue = db.transaction((id, mutation) => {
  if (!getCatalogueById(id)) v.invalid('Catalogue non trouvé', 404);
  const result = mutation();
  const catalogue = getCatalogueById(id);
  const errors = validateComposition(catalogue);
  if (catalogue.statut === 'publie' && errors.length) {
    db.prepare("UPDATE catalogues SET statut = 'brouillon' WHERE id = ?").run(id);
  }
  db.prepare("UPDATE catalogues SET updated_at = datetime('now') WHERE id = ?").run(id);
  return result;
});
const createCatalogue = db.transaction(data => {
  v.fields(data, ['titre', 'papier_spe', 'embellissement']);
  const titre = v.name(data.titre, 'titre');
  const defaults = getSettings();
  const result = db.prepare(`INSERT INTO catalogues(titre,papier_spe,embellissement,prix_A_cents,prix_B_cents,prix_C_cents)
    VALUES (?,?,?,?,?,?)`).run(titre, v.material(data.papier_spe ?? null, 'papier_spe'),
    v.material(data.embellissement ?? null, 'embellissement'), ...v.prices.map(key => defaults[key]));
  return getCatalogueById(result.lastInsertRowid);
});
function updateCatalogue(id, data) {
  v.fields(data, ['titre', 'papier_spe', 'embellissement', ...v.prices]);
  const existing = getCatalogueById(id);
  if (!existing) v.invalid('Catalogue non trouvé', 404);
  const merged = { ...existing, ...data };
  const titre = v.name(merged.titre, 'titre');
  const special = v.material(merged.papier_spe, 'papier_spe');
  const embellissement = v.material(merged.embellissement, 'embellissement');
  mutateCatalogue(id, () => {
    db.prepare(`UPDATE catalogues SET titre=?,papier_spe=?,embellissement=?,prix_A_cents=?,prix_B_cents=?,prix_C_cents=? WHERE id=?`)
      .run(titre, special, embellissement, ...v.prices.map(key => key in data ? v.price(data[key], key) : existing[key]), id);
  });
  return getCatalogueById(id);
}
function publishCatalogue(id) {
  mutateCatalogue(id, () => {
    const cat = getCatalogueById(id);
    if (cat.archive) v.invalid('Un catalogue archivé ne peut pas être publié', 409);
    const errors = validateComposition(cat);
    if (errors.length) v.invalid(errors.join(' ; '));
    db.prepare("UPDATE catalogues SET statut = 'publie' WHERE id = ?").run(id);
  });
  return getCatalogueById(id);
}
function archiveCatalogue(id, data) {
  const archive = v.archive(data);
  mutateCatalogue(id, () => {
    db.prepare("UPDATE catalogues SET archive = ?, statut = CASE WHEN ? = 1 THEN 'brouillon' ELSE statut END WHERE id = ?")
      .run(Number(archive), Number(archive), id);
  });
  return getCatalogueById(id);
}
module.exports = { getCatalogueById, getAllCatalogues, createCatalogue, updateCatalogue, publishCatalogue, archiveCatalogue, mutateCatalogue };
