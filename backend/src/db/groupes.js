const db = require('./connection');

// READ - Récupérer tous les groupes
function getAllGroupes() {
    const stmt = db.prepare('SELECT * FROM groupes_collections ORDER BY nom');
    return stmt.all();
}

// READ - Récupérer un groupe par son ID
function getGroupeById(id) {
    const stmt = db.prepare('SELECT * FROM groupes_collections WHERE id = ?');
    return stmt.get(id);
}

// READ - Récupérer les collections d'un groupe
function getCollectionsByGroupeId(groupeId) {
    const stmt = db.prepare(`
        SELECT c.*, gc.ordre 
        FROM collections c 
        INNER JOIN groupe_collections gc ON c.id = gc.collection_id 
        WHERE gc.groupe_id = ? 
        ORDER BY gc.ordre
    `);
    return stmt.all(groupeId);
}

// CREATE - Créer un nouveau groupe
function createGroupe(groupeData) {
    const {
        nom,
        format_A_prix = 0,
        format_B_prix = 0,
        format_C_prix = 0,
        description = null
    } = groupeData;

    const stmt = db.prepare(`
        INSERT INTO groupes_collections (nom, format_A_prix, format_B_prix, format_C_prix, description)
        VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(nom, format_A_prix, format_B_prix, format_C_prix, description);
    return getGroupeById(result.lastInsertRowid);
}

// UPDATE - Mettre à jour un groupe
function updateGroupe(id, groupeData) {
    const existingGroupe = getGroupeById(id);
    if (!existingGroupe) return null;

    const {
        nom = existingGroupe.nom,
        format_A_prix = existingGroupe.format_A_prix,
        format_B_prix = existingGroupe.format_B_prix,
        format_C_prix = existingGroupe.format_C_prix,
        description = existingGroupe.description
    } = groupeData;

    const stmt = db.prepare(`
        UPDATE groupes_collections 
        SET nom = ?, 
            format_A_prix = ?, 
            format_B_prix = ?, 
            format_C_prix = ?, 
            description = ?, 
            updated_at = datetime('now')
        WHERE id = ?
    `);
    
    const result = stmt.run(nom, format_A_prix, format_B_prix, format_C_prix, description, id);
    
    if (result.changes === 0) return null;
    
    return getGroupeById(id);
}

// CREATE - Ajouter une collection à un groupe
function addCollectionToGroupe(groupeId, collectionId, ordre) {
    // Vérifier que le groupe existe
    const groupe = getGroupeById(groupeId);
    if (!groupe) {
        throw new Error('Groupe non trouvé');
    }

    // Vérifier que la collection existe
    const { getCollectionById } = require('./collection');
    const collection = getCollectionById(collectionId);
    if (!collection) {
        throw new Error('Collection non trouvée');
    }

    const stmt = db.prepare(`
        INSERT INTO groupe_collections (groupe_id, collection_id, ordre)
        VALUES (?, ?, ?)
    `);
    
    try {
        const result = stmt.run(groupeId, collectionId, ordre);
        return {
            id: result.lastInsertRowid,
            groupe_id: groupeId,
            collection_id: collectionId,
            ordre: ordre
        };
    } catch (err) {
        if (err.message && err.message.includes('UNIQUE constraint')) {
            throw new Error('Cette collection est déjà dans ce groupe');
        }
        throw err;
    }
}

// DELETE - Retirer une collection d'un groupe
function removeCollectionFromGroupe(groupeId, collectionId) {
    const stmt = db.prepare(`
        DELETE FROM groupe_collections 
        WHERE groupe_id = ? AND collection_id = ?
    `);
    
    const result = stmt.run(groupeId, collectionId);
    return result.changes > 0;
}

// UPDATE - Réordonner les collections d'un groupe
function updateCollectionOrder(groupeId, collectionId, ordre) {
    const stmt = db.prepare(`
        UPDATE groupe_collections 
        SET ordre = ? 
        WHERE groupe_id = ? AND collection_id = ?
    `);
    
    const result = stmt.run(ordre, groupeId, collectionId);
    return result.changes > 0;
}

// DELETE - Supprimer un groupe
function deleteGroupe(id) {
    const stmt = db.prepare('DELETE FROM groupes_collections WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
}

module.exports = {
    getAllGroupes,
    getGroupeById,
    getCollectionsByGroupeId,
    createGroupe,
    updateGroupe,
    addCollectionToGroupe,
    removeCollectionFromGroupe,
    updateCollectionOrder,
    deleteGroupe
};
