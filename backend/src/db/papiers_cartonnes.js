const db = require('./connection');

// READ — recherche par nom (LIKE %search%), limité à 20 résultats
// Si search vide/absent, retourne tous (limité à 50)
function searchPapiersCartonnes(search) {
  if (search && search.trim() !== '') {
    const stmt = db.prepare(
      "SELECT id, nom, created_at FROM papiers_cartonnes WHERE nom LIKE ? ORDER BY nom LIMIT 20"
    );
    return stmt.all(`%${search.trim()}%`);
  }
  const stmt = db.prepare(
    'SELECT id, nom, created_at FROM papiers_cartonnes ORDER BY nom LIMIT 50'
  );
  return stmt.all();
}

// CREATE — insère un nouveau papier cartonné, retourne l'objet créé
// Lève une erreur si le nom existe déjà (contrainte UNIQUE)
function createPapierCartonne(nom) {
  const stmt = db.prepare(
    'INSERT INTO papiers_cartonnes (nom) VALUES (?)'
  );
  const result = stmt.run(nom.trim());
  return db.prepare('SELECT id, nom, created_at FROM papiers_cartonnes WHERE id = ?').get(result.lastInsertRowid);
}

module.exports = { searchPapiersCartonnes, createPapierCartonne };
