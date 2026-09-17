const db = require('./connection');
const v = require('./source-validation');
const kit = require('./commande-kit');

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
            ORDER BY cc.id
        `).all(id);

        commande.papiers_selectionnes = db.prepare(`
            SELECT cps.id, cps.commande_collection_id, cps.papier_cartonne_id, cps.papier_nom AS nom, cps.quantite_base
            FROM commande_papiers_selectionnes cps
            JOIN commande_collections cc ON cc.id = cps.commande_collection_id
            WHERE cc.commande_id = ?
            ORDER BY cps.id
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

const horsKitFields = ['montant', 'methode_paiement', 'date_commande', 'cadeau_texte', 'cadeau_valeur'];

function horsKitScalars(data, existing = {}) {
    const merged = { methode_paiement: null, date_commande: null, cadeau_texte: null, cadeau_valeur: null, ...existing, ...data };
    if (typeof merged.montant !== 'number' || !Number.isFinite(merged.montant)) v.invalid('montant doit être un nombre fini pour une commande hors_kit');
    if (merged.cadeau_valeur !== null && (typeof merged.cadeau_valeur !== 'number' || !Number.isFinite(merged.cadeau_valeur))) {
        v.invalid('cadeau_valeur doit être un nombre fini ou null');
    }
    return {
        montant: merged.montant, methode_paiement: kit.payment(merged.methode_paiement),
        date_commande: kit.optionalText(merged.date_commande, 'date_commande'),
        cadeau_texte: kit.optionalText(merged.cadeau_texte, 'cadeau_texte'), cadeau_valeur: merged.cadeau_valeur
    };
}

function writeComposition(id, composition, ruban) {
    const collectionStmt = db.prepare('INSERT INTO commande_collections(commande_id,collection_id,collection_nom,nb_feuilles) VALUES (?,?,?,?)');
    const paperStmt = db.prepare('INSERT INTO commande_papiers_selectionnes(commande_collection_id,papier_cartonne_id,papier_nom,quantite_base) VALUES (?,?,?,?)');
    for (const line of composition) {
        const lineId = collectionStmt.run(id, line.collection_id, line.collection_nom, line.nb_feuilles).lastInsertRowid;
        for (const paper of line.papiers) paperStmt.run(lineId, paper.papier_cartonne_id, paper.papier_nom, paper.quantite_base);
    }
    if (ruban) db.prepare('INSERT INTO commande_rubans(commande_id,ruban_id,ruban_nom) VALUES (?,?,?)').run(id, ruban.ruban_id, ruban.ruban_nom);
}

function insertOrder(scalars) {
    // Les clés proviennent exclusivement des objets construits côté serveur.
    const keys = Object.keys(scalars);
    return db.prepare(`INSERT INTO commandes(${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`)
        .run(...Object.values(scalars)).lastInsertRowid;
}

// CREATE - Sources, prix, snapshots et effets sur la cliente sont atomiques.
const createCommande = db.transaction(data => {
    v.object(data);
    if (!['kit', 'hors_kit'].includes(data.type)) v.invalid("type doit être 'kit' ou 'hors_kit'");
    v.fields(data, ['client_id', 'type', ...(data.type === 'kit' ? kit.fields : [...horsKitFields, 'reglee'])]);
    const clientId = v.id(data.client_id);
    const client = db.prepare('SELECT archive FROM clients WHERE id=?').get(clientId);
    if (!client) v.invalid('Cliente non trouvée', 404);
    if (client.archive) v.invalid('Une cliente archivée ne peut pas recevoir de nouvelle commande', 409);

    let id;
    if (data.type === 'kit') {
        const { scalars, composition, ruban } = kit.buildKit(data);
        id = insertOrder({ client_id: clientId, type: 'kit', ...scalars });
        writeComposition(id, composition, ruban);
    } else {
        const scalars = horsKitScalars(data);
        const reglee = kit.flag(data.reglee === undefined ? 0 : data.reglee, 'reglee');
        id = insertOrder({ client_id: clientId, type: 'hors_kit', ...scalars, reglee });
        // Règle de fidélité hors-kit historique, conservée sans extension.
        if (scalars.montant > 70) db.prepare('UPDATE clients SET points_fidelite=points_fidelite+1 WHERE id=?').run(clientId);
    }
    db.prepare("UPDATE clients SET derniere_commande=datetime('now') WHERE id=?").run(clientId);
    return getCommandeById(id);
});

// UPDATE - Remplacement complet pour un kit ; champs partiels pour hors-kit.
const updateCommande = db.transaction((id, data) => {
    const existing = db.prepare('SELECT * FROM commandes WHERE id=?').get(id);
    if (!existing) return null;
    if (existing.reglee) v.invalid('Une commande réglée est immuable', 409);
    v.fields(data, existing.type === 'kit' ? kit.fields : horsKitFields);
    let scalars;
    if (existing.type === 'kit') {
        const replacement = kit.buildKit(data, existing);
        scalars = replacement.scalars;
        db.prepare('DELETE FROM commande_collections WHERE commande_id=?').run(id);
        db.prepare('DELETE FROM commande_rubans WHERE commande_id=?').run(id);
        writeComposition(id, replacement.composition, replacement.ruban);
    } else {
        if (Object.keys(data).length === 0) return getCommandeById(id);
        scalars = horsKitScalars(data, existing);
    }
    db.prepare(`UPDATE commandes SET ${Object.keys(scalars).map(key => `${key}=?`).join(',')},updated_at=datetime('now') WHERE id=?`)
        .run(...Object.values(scalars), id);
    return getCommandeById(id);
});

// Le règlement ne relit aucune source et ne reconstruit aucun snapshot.
const regleCommande = db.transaction((id, data = {}) => {
    const existing = db.prepare('SELECT * FROM commandes WHERE id=?').get(id);
    if (!existing) return null;
    if (existing.reglee) v.invalid('Une commande réglée est immuable', 409);
    v.fields(data, []);
    db.prepare("UPDATE commandes SET reglee=1,updated_at=datetime('now') WHERE id=?").run(id);
    return getCommandeById(id);
});

const deleteCommande = db.transaction(id => {
    const existing = db.prepare('SELECT reglee FROM commandes WHERE id=?').get(id);
    if (!existing) return false;
    if (existing.reglee) v.invalid('Une commande réglée ne peut pas être supprimée', 409);
    return db.prepare('DELETE FROM commandes WHERE id=?').run(id).changes > 0;
});

module.exports = {
    getAllCommandes,
    getCommandeById,
    getCommandesByClientId,
    createCommande,
    updateCommande,
    regleCommande,
    deleteCommande
};
