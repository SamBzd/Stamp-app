const db = require('./connection');

// Ajoute une collection à un catalogue (max 4, ordre auto = MAX(ordre)+1)
function addCollection(catalogueId, nom) {
  const count = db.prepare(
    'SELECT COUNT(*) AS cnt FROM collections WHERE catalogue_id = ?'
  ).get(catalogueId);

  if (count.cnt >= 4) {
    throw new Error('Un catalogue ne peut pas avoir plus de 4 collections');
  }

  const maxOrdre = db.prepare(
    'SELECT COALESCE(MAX(ordre), 0) AS max_ordre FROM collections WHERE catalogue_id = ?'
  ).get(catalogueId);

  const ordre = maxOrdre.max_ordre + 1;

  const stmt = db.prepare(`
    INSERT INTO collections (catalogue_id, nom, ordre)
    VALUES (?, ?, ?)
  `);

  const result = stmt.run(catalogueId, nom, ordre);
  return db.prepare('SELECT * FROM collections WHERE id = ?').get(result.lastInsertRowid);
}

// Modifie le nom d'une collection
function updateCollection(id, nom) {
  const stmt = db.prepare('UPDATE collections SET nom = ? WHERE id = ?');
  const result = stmt.run(nom, id);
  if (result.changes === 0) return null;
  return db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
}

// Supprime une collection
function deleteCollection(id) {
  const stmt = db.prepare('DELETE FROM collections WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Remplace toute la liste des papiers d'une collection
// papierIds = tableau d'ids dans l'ordre voulu (max 5)
// Opération atomique : DELETE puis INSERT dans une transaction
function setPapiersCollection(collectionId, papierIds) {
  if (papierIds.length > 5) {
    throw new Error('Une collection ne peut pas avoir plus de 5 papiers');
  }

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM collection_papiers WHERE collection_id = ?').run(collectionId);

    const insertStmt = db.prepare(`
      INSERT INTO collection_papiers (collection_id, papier_cartonne_id, ordre)
      VALUES (?, ?, ?)
    `);

    papierIds.forEach((papierId, index) => {
      insertStmt.run(collectionId, papierId, index + 1);
    });
  });

  transaction();
}

module.exports = { addCollection, updateCollection, deleteCollection, setPapiersCollection };
