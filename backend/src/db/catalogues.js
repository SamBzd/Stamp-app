const db = require('./connection');

// Retourne tous les catalogues, triés par created_at DESC
function getAllCatalogues() {
  const stmt = db.prepare('SELECT * FROM catalogues ORDER BY created_at DESC');
  return stmt.all();
}

// Retourne un catalogue avec ses collections et les papiers de chaque collection
// Structure attendue :
// { id, titre, papier_spe, embellissement, created_at, updated_at,
//   collections: [{ id, nom, ordre, papiers: [{ id, nom, ordre }] }] }
function getCatalogueById(id) {
  const catalogue = db.prepare('SELECT * FROM catalogues WHERE id = ?').get(id);
  if (!catalogue) return null;

  const collections = db.prepare(
    'SELECT * FROM collections WHERE catalogue_id = ? ORDER BY ordre'
  ).all(id);

  catalogue.collections = collections.map(col => {
    const papiers = db.prepare(`
      SELECT pc.id, pc.nom, cp.ordre
      FROM collection_papiers cp
      JOIN papiers_cartonnes pc ON pc.id = cp.papier_cartonne_id
      WHERE cp.collection_id = ?
      ORDER BY cp.ordre
    `).all(col.id);

    return { ...col, papiers };
  });

  return catalogue;
}

// Valide le format "Mot(s) YYYY" (ex: "Avril 2026", "Janvier 2025")
function validateTitre(titre) {
  return /^[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)*\s+\d{4}$/.test(titre);
}

// CREATE - Créer un catalogue
function createCatalogue(data) {
  const { titre, papier_spe = null, embellissement = null } = data;

  if (!validateTitre(titre)) {
    throw new Error('Format de titre invalide. Format attendu : "Mot(s) YYYY" (ex: "Avril 2026")');
  }

  const stmt = db.prepare(`
    INSERT INTO catalogues (titre, papier_spe, embellissement)
    VALUES (?, ?, ?)
  `);

  const result = stmt.run(titre, papier_spe, embellissement);
  return getCatalogueById(result.lastInsertRowid);
}

// UPDATE - Mise à jour partielle d'un catalogue
function updateCatalogue(id, data) {
  const existing = getCatalogueById(id);
  if (!existing) return null;

  const titre = data.titre !== undefined ? data.titre : existing.titre;
  const papier_spe = data.papier_spe !== undefined ? data.papier_spe : existing.papier_spe;
  const embellissement = data.embellissement !== undefined ? data.embellissement : existing.embellissement;

  if (!validateTitre(titre)) {
    throw new Error('Format de titre invalide. Format attendu : "Mot(s) YYYY" (ex: "Avril 2026")');
  }

  const stmt = db.prepare(`
    UPDATE catalogues
    SET titre = ?, papier_spe = ?, embellissement = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  const result = stmt.run(titre, papier_spe, embellissement, id);
  if (result.changes === 0) return null;

  return getCatalogueById(id);
}

// DELETE - Supprimer un catalogue (cascade gérée par la DB)
function deleteCatalogue(id) {
  const stmt = db.prepare('DELETE FROM catalogues WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

module.exports = { getAllCatalogues, getCatalogueById, createCatalogue, updateCatalogue, deleteCatalogue };
