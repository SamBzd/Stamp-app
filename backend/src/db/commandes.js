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
            SELECT cc.id, cc.collection_id, cc.nb_feuilles, col.nom AS collection_nom
            FROM commande_collections cc
            JOIN collections col ON col.id = cc.collection_id
            WHERE cc.commande_id = ?
        `).all(id);

        commande.papiers_selectionnes = db.prepare(`
            SELECT cps.id, cps.papier_cartonne_id, pc.nom
            FROM commande_papiers_selectionnes cps
            JOIN papiers_cartonnes pc ON pc.id = cps.papier_cartonne_id
            WHERE cps.commande_id = ?
        `).all(id);
    } else {
        commande.commande_collections = [];
        commande.papiers_selectionnes = [];
    }

    return commande;
}

// CREATE - Créer une commande (transaction complète)
const createCommande = db.transaction(function(data) {
    const { client_id, type } = data;

    if (!client_id) throw new Error('client_id est obligatoire');
    if (!type) throw new Error('type est obligatoire');
    if (!['kit', 'hors_kit'].includes(type)) throw new Error("type doit être 'kit' ou 'hors_kit'");

    const client = db.prepare('SELECT id, points_fidelite FROM clients WHERE id = ?').get(client_id);
    if (!client) throw new Error('Client non trouvé');

    let commandeId;

    if (type === 'kit') {
        const {
            format_type,
            methode_paiement,
            papier_supplementaire = 0,
            produit_promo_texte = null,
            produit_promo_prix = null,
            autres_texte = null,
            autres_prix = null,
            reglee = 0,
            collections: collectionsData = [],
            papiers_selectionnes: papiersData = []
        } = data;

        if (!format_type || !['A', 'B', 'C'].includes(format_type)) {
            throw new Error("format_type doit être 'A', 'B' ou 'C'");
        }
        if (!methode_paiement || !['Paypal', 'chèque', 'virement'].includes(methode_paiement)) {
            throw new Error("methode_paiement est obligatoire et doit être 'Paypal', 'chèque' ou 'virement'");
        }

        // Validation des collections
        if (format_type === 'C') {
            if (!collectionsData || collectionsData.length !== 1) {
                throw new Error('Format C requiert exactement 1 collection');
            }
            if (collectionsData[0].nb_feuilles !== 5) {
                throw new Error('Format C : nb_feuilles doit être 5');
            }
        } else {
            // Format A ou B : 2 collections, total nb_feuilles = 5 (2+3)
            if (!collectionsData || collectionsData.length !== 2) {
                throw new Error('Format A/B requiert exactement 2 collections');
            }
            const nbTotal = collectionsData.reduce((sum, c) => sum + c.nb_feuilles, 0);
            if (nbTotal !== 5) {
                throw new Error('Format A/B : le total de nb_feuilles doit être 5 (2+3)');
            }
            const validNbFeuilles = collectionsData.every(c => [2, 3].includes(c.nb_feuilles));
            if (!validNbFeuilles) {
                throw new Error('Format A/B : nb_feuilles doit être 2 ou 3 pour chaque collection');
            }

            // Valider que les 2 collections appartiennent au même catalogue
            const catIds = collectionsData.map(c => {
                const col = db.prepare('SELECT catalogue_id FROM collections WHERE id = ?').get(c.collection_id);
                if (!col) throw new Error(`Collection ${c.collection_id} non trouvée`);
                return col.catalogue_id;
            });
            if (catIds[0] !== catIds[1]) {
                throw new Error('Les 2 collections doivent appartenir au même catalogue');
            }
        }

        // Insérer la commande
        const result = db.prepare(`
            INSERT INTO commandes
              (client_id, type, format_type, papier_supplementaire,
               produit_promo_texte, produit_promo_prix,
               autres_texte, autres_prix,
               methode_paiement, reglee)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            client_id, type, format_type, papier_supplementaire,
            produit_promo_texte, produit_promo_prix,
            autres_texte, autres_prix,
            methode_paiement, reglee
        );
        commandeId = result.lastInsertRowid;

        // Insérer les commande_collections
        const insertCC = db.prepare(`
            INSERT INTO commande_collections (commande_id, collection_id, nb_feuilles)
            VALUES (?, ?, ?)
        `);
        for (const c of collectionsData) {
            insertCC.run(commandeId, c.collection_id, c.nb_feuilles);
        }

        // Insérer les papiers sélectionnés
        const insertPS = db.prepare(`
            INSERT OR IGNORE INTO commande_papiers_selectionnes (commande_id, papier_cartonne_id)
            VALUES (?, ?)
        `);

        if (format_type === 'C') {
            // Format C : récupérer automatiquement les papiers de la collection
            const collectionId = collectionsData[0].collection_id;
            const papiers = db.prepare(`
                SELECT papier_cartonne_id FROM collection_papiers WHERE collection_id = ?
            `).all(collectionId);
            for (const p of papiers) {
                insertPS.run(commandeId, p.papier_cartonne_id);
            }
        } else {
            // Format A/B : insérer les papiers fournis (dédupliqués via INSERT OR IGNORE)
            const uniquePapiers = [...new Set(papiersData)];
            for (const pcId of uniquePapiers) {
                insertPS.run(commandeId, pcId);
            }
        }

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
        'produit_promo_texte', 'produit_promo_prix',
        'autres_texte', 'autres_prix',
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
