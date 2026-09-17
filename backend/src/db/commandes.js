const db = require('./connection');

// READ - Toutes les commandes avec infos client
function getAllCommandes() {
    const stmt = db.prepare(`
        SELECT c.*, cl.nom AS client_nom, cl.prenom AS client_prenom
        FROM commandes c
        JOIN clients cl ON cl.id = c.client_id
        ORDER BY c.created_at DESC
    `);
    return stmt.all();
}

// READ - Commandes d'un client
function getCommandesByClientId(clientId) {
    const stmt = db.prepare(`
        SELECT c.*, cl.nom AS client_nom, cl.prenom AS client_prenom
        FROM commandes c
        JOIN clients cl ON cl.id = c.client_id
        WHERE c.client_id = ?
        ORDER BY c.created_at DESC
    `);
    return stmt.all(clientId);
}

// READ - Commande par ID avec détail complet
function getCommandeById(id) {
    const commande = db.prepare('SELECT * FROM commandes WHERE id = ?').get(id);
    if (!commande) return null;

    const client = db.prepare('SELECT id, nom, prenom FROM clients WHERE id = ?').get(commande.client_id);
    commande.client = client || null;

    if (commande.type === 'kit') {
        commande.commande_collections = db.prepare(`
            SELECT cc.id, cc.collection_id, cc.nb_feuilles, cc.collection_nom
            FROM commande_collections cc
            WHERE cc.commande_id = ?
        `).all(id);

        commande.papiers_selectionnes = db.prepare(`
            SELECT cps.id, cps.commande_collection_id, cps.papier_cartonne_id, cps.papier_nom AS nom, cps.quantite_base
            FROM commande_papiers_selectionnes cps
            JOIN commande_collections cc ON cc.id = cps.commande_collection_id
            WHERE cc.commande_id = ?
        `).all(id);
        commande.ruban = db.prepare(`
            SELECT ruban_id, ruban_nom, quantite FROM commande_rubans WHERE commande_id = ?
        `).get(id) || null;
    } else {
        commande.commande_collections = [];
        commande.papiers_selectionnes = [];
        commande.ruban = null;
    }

    return commande;
}

// CREATE - Créer une commande (transaction complète)
const createCommande = db.transaction(function(data) {
    const { client_id, type } = data;

    if (!client_id) throw new Error('client_id est obligatoire');
    if (!type) throw new Error('type est obligatoire');
    if (!['kit', 'hors_kit'].includes(type)) throw new Error("type doit être 'kit' ou 'hors_kit'");

    const client = db.prepare('SELECT id, points_fidelite, archive FROM clients WHERE id = ?').get(client_id);
    if (!client) throw new Error('Client non trouvé');
    if (client.archive) require('./source-validation').invalid('Une cliente archivée ne peut pas recevoir de nouvelle commande', 409);

    let commandeId;

    if (type === 'kit') {
        // Le parcours de création cible est livré dans le lot commandes kits.
        // Refuser le contrat v2 évite des commandes sans snapshots historiques.
        throw new Error('La creation de kits attend le nouveau contrat de composition');
    } else {
        // type === 'hors_kit'
        const {
            montant,
            methode_paiement = null,
            date_commande = null,
            cadeau_texte = null,
            cadeau_valeur = null,
            reglee = 0
        } = data;

        if (montant === undefined || montant === null) {
            throw new Error('montant est obligatoire pour une commande hors_kit');
        }

        const result = db.prepare(`
            INSERT INTO commandes
              (client_id, type, montant, date_commande,
               cadeau_texte, cadeau_valeur,
               methode_paiement, reglee)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            client_id, type, montant, date_commande,
            cadeau_texte, cadeau_valeur,
            methode_paiement, reglee
        );
        commandeId = result.lastInsertRowid;

        // +1 point fidélité si montant > 70
        if (montant > 70) {
            db.prepare(`
                UPDATE clients SET points_fidelite = points_fidelite + 1 WHERE id = ?
            `).run(client_id);
        }
    }

    // Mettre à jour derniere_commande
    db.prepare(`
        UPDATE clients SET derniere_commande = datetime('now') WHERE id = ?
    `).run(client_id);

    return getCommandeById(commandeId);
});

// UPDATE - Mise à jour partielle des champs scalaires
function updateCommande(id, data) {
    const existing = db.prepare('SELECT * FROM commandes WHERE id = ?').get(id);
    if (!existing) return null;

    // Champs autorisés (scalaires uniquement, pas les collections/papiers)
    const allowed = [
        'format_type', 'papier_supplementaire',
        'produit_promo_texte', 'produit_promo_prix_cents',
        'autres_texte', 'autres_prix_cents',
        'montant', 'date_commande', 'cadeau_texte', 'cadeau_valeur',
        'methode_paiement', 'reglee'
    ];

    const updates = [];
    const values = [];

    for (const field of allowed) {
        if (data[field] !== undefined) {
            updates.push(`${field} = ?`);
            values.push(data[field]);
        }
    }

    if (updates.length === 0) return getCommandeById(id);

    updates.push("updated_at = datetime('now')");
    values.push(id);

    db.prepare(`
        UPDATE commandes SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);

    return getCommandeById(id);
}

// DELETE - Supprimer une commande
function deleteCommande(id) {
    const result = db.prepare('DELETE FROM commandes WHERE id = ?').run(id);
    return result.changes > 0;
}

module.exports = {
    getAllCommandes,
    getCommandeById,
    getCommandesByClientId,
    createCommande,
    updateCommande,
    deleteCommande
};
