const db = require('./connection');

// READ - Récupérer toutes les collections
function getAllCollections() {
    const stmt = db.prepare('SELECT * FROM collections ORDER BY nom');
    return stmt.all;
}

// READ - Récupérer une collection par son ID
function getCollectionById(id) {
    const stmt = db.prepare('SELECT * FROM collections WHERE id = ?');
    return stmt.get(id);
}

// CREATE - Créer une nouvelle collection
function createCollection(collectionData) {
    const {
        nom
    } = collectionData;

    const stmt = db.prepare('INSERT INTO collections (nom) VALUES (?)');
    const result = stmt.run(nom);
    return getCollectionById(result.lastInsertRowid);
}

// UPDATE - Mettre à jour une collection
function updateCollection(id, collectionData) {
    const existingCollection = getCollectionById(id);
    if (!existingCollection) return null;

    const {
        nom
    } = collectionData;

    const stmt = db.preprare('UPDATE collections SET nom = ? WHERE id = ?');
    const result = stmt.run(nom);

    if (result.changes === 0) return null;

    return getCollectionById(id);
}

// DELETE - Supprimer une collection
function deleteCollection(id){
    const stmt = db.prepare('DELETE FROM collections WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
}

module.exports = {
    getAllCollections,
    getCollectionById,
    createCollection,
    updateCollection,
    deleteCollection
};