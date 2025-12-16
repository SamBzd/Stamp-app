const db = require('./connection');

// READ - Récupérer toutes les commandes
function getAllCommandes() {
    const stmt = db.prepare('SELECT * FROM commandes ORDER BY created_at DESC');
    return stmt.all();
}

// READ - Récupérer les commandes d'une cliente
function getCommandesByClientId(clientId) {
    const stmt = db.prepare(`
        SELECT * FROM commandes 
        WHERE client_id = ? 
        ORDER BY created_at DESC
    `);
    return stmt.all(clientId);
}

// READ - Récupérer une commande par ID
function getCommandeById(id) {
    const stmt = db.prepare('SELECT * FROM commandes WHERE id = ?');
    return stmt.get(id);
}

// READ - Récupérer les collections d'une commande
function getCollectionsByCommandeId(commandeId) {
    const stmt = db.prepare(`
        SELECT c.* 
        FROM collections c 
        INNER JOIN commande_collections cc ON c.id = cc.collection_id 
        WHERE cc.commande_id = ?
    `);
    return stmt.all(commandeId);
}

// READ - Récupérer une commande complète (avec client, groupe, collections)
function getCommandeComplet(id) {
    const commande = getCommandeById(id);
    if (!commande) return null;

    // Récupérer le client
    const { getClientById } = require('./client');
    const client = getClientById(commande.client_id);

    // Récupérer le groupe
    const { getGroupeById } = require('./groupes');
    const groupe = getGroupeById(commande.groupe_id);

    // Récupérer les collections
    const collections = getCollectionsByCommandeId(id);

    // Calculer le prix selon le format
    let prixBase = 0;
    if (commande.format_type === 'A') {
        prixBase = groupe.format_A_prix;
    } else if (commande.format_type === 'B') {
        prixBase = groupe.format_B_prix;
    } else if (commande.format_type === 'C') {
        prixBase = groupe.format_C_prix;
    }

    return {
        ...commande,
        client: client,
        groupe: groupe,
        collections: collections,
        prix_base: prixBase
    };
}

// CREATE - Créer une commande
function createCommande(commandeData) {
    const {
        client_id,
        groupe_id,
        format_type,
        papier_supplementaire = 0,
        articles_supplementaires = null,
        methode_paiement,
        reglee = 0
    } = commandeData;

    // Vérifier que le client existe
    const { getClientById } = require('./client');
    const client = getClientById(client_id);
    if (!client) {
        throw new Error('Client non trouvé');
    }

    // Vérifier que le groupe existe
    const { getGroupeById } = require('./groupes');
    const groupe = getGroupeById(groupe_id);
    if (!groupe) {
        throw new Error('Groupe non trouvé');
    }

    // Validation du format_type
    if (!['A', 'B', 'C'].includes(format_type)) {
        throw new Error('format_type doit être A, B ou C');
    }

    // Validation de la méthode de paiement
    if (!['Paypal', 'chèque', 'virement'].includes(methode_paiement)) {
        throw new Error('methode_paiement doit être Paypal, chèque ou virement');
    }

    const stmt = db.prepare(`
        INSERT INTO commandes 
        (client_id, groupe_id, format_type, papier_supplementaire, articles_supplementaires, methode_paiement, reglee)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
        client_id,
        groupe_id,
        format_type,
        papier_supplementaire,
        articles_supplementaires,
        methode_paiement,
        reglee
    );
    
    // Mettre à jour la date de dernière commande du client
    const { updateDerniereCommande } = require('./client');
    updateDerniereCommande(client_id);
    
    return getCommandeById(result.lastInsertRowid);
}

// CREATE - Ajouter une collection à une commande
function addCollectionToCommande(commandeId, collectionId) {
    // Vérifier que la commande existe
    const commande = getCommandeById(commandeId);
    if (!commande) {
        throw new Error('Commande non trouvée');
    }

    // Vérifier que la collection existe
    const { getCollectionById } = require('./collection');
    const collection = getCollectionById(collectionId);
    if (!collection) {
        throw new Error('Collection non trouvée');
    }

    // Le trigger vérifie automatiquement que la collection appartient au groupe de la commande
    const stmt = db.prepare(`
        INSERT INTO commande_collections (commande_id, collection_id)
        VALUES (?, ?)
    `);
    
    try {
        const result = stmt.run(commandeId, collectionId);
        return {
            id: result.lastInsertRowid,
            commande_id: commandeId,
            collection_id: collectionId
        };
    } catch (err) {
        if (err.message && err.message.includes('UNIQUE constraint')) {
            throw new Error('Cette collection est déjà dans cette commande');
        }
        // Le trigger peut lever une erreur si la collection n'appartient pas au groupe
        if (err.message && err.message.includes('Une commande ne peut contenir que des collections du groupe référencé')) {
            throw new Error('Cette collection n\'appartient pas au groupe de la commande');
        }
        throw err;
    }
}

// UPDATE - Mettre à jour une commande
function updateCommande(id, commandeData) {
    const existingCommande = getCommandeById(id);
    if (!existingCommande) return null;

    const {
        format_type = existingCommande.format_type,
        papier_supplementaire = existingCommande.papier_supplementaire,
        articles_supplementaires = existingCommande.articles_supplementaires,
        methode_paiement = existingCommande.methode_paiement,
        reglee = existingCommande.reglee
    } = commandeData;

    // Validation du format_type si fourni
    if (format_type && !['A', 'B', 'C'].includes(format_type)) {
        throw new Error('format_type doit être A, B ou C');
    }

    // Validation de la méthode de paiement si fournie
    if (methode_paiement && !['Paypal', 'chèque', 'virement'].includes(methode_paiement)) {
        throw new Error('methode_paiement doit être Paypal, chèque ou virement');
    }

    const stmt = db.prepare(`
        UPDATE commandes 
        SET format_type = ?,
            papier_supplementaire = ?,
            articles_supplementaires = ?,
            methode_paiement = ?,
            reglee = ?,
            updated_at = datetime('now')
        WHERE id = ?
    `);
    
    const result = stmt.run(
        format_type,
        papier_supplementaire,
        articles_supplementaires,
        methode_paiement,
        reglee,
        id
    );
    
    if (result.changes === 0) return null;
    
    return getCommandeById(id);
}

// DELETE - Retirer une collection d'une commande
function removeCollectionFromCommande(commandeId, collectionId) {
    const stmt = db.prepare(`
        DELETE FROM commande_collections 
        WHERE commande_id = ? AND collection_id = ?
    `);
    
    const result = stmt.run(commandeId, collectionId);
    return result.changes > 0;
}

// DELETE - Supprimer une commande
function deleteCommande(id) {
    const stmt = db.prepare('DELETE FROM commandes WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
}

module.exports = {
    getAllCommandes,
    getCommandesByClientId,
    getCommandeById,
    getCollectionsByCommandeId,
    getCommandeComplet,
    createCommande,
    addCollectionToCommande,
    updateCommande,
    removeCollectionFromCommande,
    deleteCommande
};
