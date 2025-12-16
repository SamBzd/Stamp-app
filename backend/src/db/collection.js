const db = require('./connection');

// READ - Récupérer toutes les collections
function getAllCollections() {
    const stmt = db.prepare('SELECT * FROM collections ORDER BY nom');
    return stmt.all();
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

    const stmt = db.prepare('UPDATE collections SET nom = ? WHERE id = ?');
    const result = stmt.run(nom, id);

    if (result.changes === 0) return null;

    return getCollectionById(id);
}

// READ - Vérifier si une collection est utilisée dans un groupe
function isCollectionUsedInGroupes(collectionId) {
    const stmt = db.prepare(`
        SELECT COUNT(*) as count 
        FROM groupe_collections 
        WHERE collection_id = ?
    `);
    const result = stmt.get(collectionId);
    return result.count > 0;
}

// READ - Vérifier si une collection est utilisée dans une commande
function isCollectionUsedInCommandes(collectionId) {
    const stmt = db.prepare(`
        SELECT COUNT(*) as count 
        FROM commande_collections 
        WHERE collection_id = ?
    `);
    const result = stmt.get(collectionId);
    return result.count > 0;
}

// DELETE - Supprimer une collection
function deleteCollection(id){
    // Vérifier que la collection existe
    const collection = getCollectionById(id);
    if (!collection) {
        return null; // Collection non trouvée
    }

    // Vérifier si la collection est utilisée dans un groupe
    if (isCollectionUsedInGroupes(id)) {
        throw new Error('Cette collection est utilisée dans un ou plusieurs groupes. Supprimez-la d\'abord des groupes.');
    }

    // Vérifier si la collection est utilisée dans une commande
    if (isCollectionUsedInCommandes(id)) {
        throw new Error('Cette collection est utilisée dans une ou plusieurs commandes. Supprimez-la d\'abord des commandes.');
    }

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