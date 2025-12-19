const db = require('./connection');

/**
 * Vérifie si la table stocks existe, sinon la crée
 */
function ensureStocksTable() {
    try {
        const checkTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='stocks'");
        const tableExists = checkTable.get();
        
        if (!tableExists) {
            console.log('Création de la table stocks...');
            
            // Créer la table directement
            db.exec(`
                CREATE TABLE stocks (
                    collection_id         INTEGER NOT NULL,
                    format                TEXT NOT NULL CHECK (format IN ('A', 'B', 'C')),
                    quantite_commande    INTEGER NOT NULL DEFAULT 0,
                    quantite_stock       INTEGER NOT NULL DEFAULT 0,
                    gere                 INTEGER NOT NULL DEFAULT 0 CHECK (gere IN (0,1)),
                    updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
                    PRIMARY KEY (collection_id, format),
                    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS ix_stocks_collection_id ON stocks(collection_id);
                CREATE INDEX IF NOT EXISTS ix_stocks_gere ON stocks(gere);
            `);
            
            console.log('✅ Table stocks créée avec succès');
        }
    } catch (error) {
        console.error('Erreur lors de la vérification/création de la table stocks:', error);
        // Ne pas throw pour éviter de bloquer l'application
        // La prochaine tentative créera la table
    }
}

/**
 * Calcule et met à jour les quantités commandées pour tous les stocks
 * à partir des commandes existantes
 */
function calculateQuantitesCommandees() {
    try {
        // S'assurer que la table existe
        ensureStocksTable();
        
        // Vérifier que la table existe maintenant
        const checkTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='stocks'");
        const tableExists = checkTable.get();
        if (!tableExists) {
            console.error('La table stocks n\'existe pas et n\'a pas pu être créée');
            return;
        }
        
        // Récupérer toutes les combinaisons collection/format depuis les commandes
        const stmt = db.prepare(`
            SELECT 
                cc.collection_id,
                c.format_type as format,
                COUNT(*) as quantite
            FROM commande_collections cc
            INNER JOIN commandes c ON cc.commande_id = c.id
            GROUP BY cc.collection_id, c.format_type
        `);
        
        const quantites = stmt.all();
        
        if (quantites.length > 0) {
            // Mettre à jour ou créer les stocks
            const updateStmt = db.prepare(`
                INSERT INTO stocks (collection_id, format, quantite_commande, quantite_stock, gere, updated_at)
                VALUES (?, ?, ?, COALESCE((SELECT quantite_stock FROM stocks WHERE collection_id = ? AND format = ?), 0), 
                        COALESCE((SELECT gere FROM stocks WHERE collection_id = ? AND format = ?), 0), datetime('now'))
                ON CONFLICT(collection_id, format) 
                DO UPDATE SET 
                    quantite_commande = excluded.quantite_commande,
                    updated_at = datetime('now')
            `);
            
            for (const qte of quantites) {
                try {
                    updateStmt.run(
                        qte.collection_id,
                        qte.format,
                        qte.quantite,
                        qte.collection_id,
                        qte.format,
                        qte.collection_id,
                        qte.format
                    );
                } catch (err) {
                    console.error(`Erreur lors de la mise à jour du stock ${qte.collection_id}_${qte.format}:`, err);
                }
            }
        }
        
        // Mettre à jour les stocks qui n'ont plus de commandes (quantité = 0)
        const resetStmt = db.prepare(`
            UPDATE stocks 
            SET quantite_commande = 0, updated_at = datetime('now')
            WHERE (collection_id, format) NOT IN (
                SELECT cc.collection_id, c.format_type
                FROM commande_collections cc
                INNER JOIN commandes c ON cc.commande_id = c.id
            )
        `);
        resetStmt.run();
    } catch (error) {
        console.error('Erreur lors du calcul des quantités commandées:', error);
        // Ne pas throw pour éviter de bloquer l'application
    }
}

/**
 * Récupère tous les stocks
 */
function getAllStocks() {
    ensureStocksTable();
    calculateQuantitesCommandees(); // Recalculer avant de retourner
    
    try {
        const stmt = db.prepare(`
            SELECT 
                s.collection_id,
                s.format,
                s.quantite_commande,
                s.quantite_stock,
                s.gere,
                s.updated_at,
                c.nom as collection_nom
            FROM stocks s
            INNER JOIN collections c ON s.collection_id = c.id
            ORDER BY s.collection_id, s.format
        `);
        return stmt.all();
    } catch (error) {
        // Si la table n'existe toujours pas, retourner un tableau vide
        console.error('Erreur lors de la récupération des stocks:', error);
        return [];
    }
}

/**
 * Récupère un stock spécifique
 */
function getStock(collectionId, format) {
    ensureStocksTable();
    calculateQuantitesCommandees(); // Recalculer avant de retourner
    
    try {
        const stmt = db.prepare(`
            SELECT 
                s.collection_id,
                s.format,
                s.quantite_commande,
                s.quantite_stock,
                s.gere,
                s.updated_at,
                c.nom as collection_nom
            FROM stocks s
            INNER JOIN collections c ON s.collection_id = c.id
            WHERE s.collection_id = ? AND s.format = ?
        `);
        return stmt.get(collectionId, format);
    } catch (error) {
        console.error('Erreur lors de la récupération du stock:', error);
        return null;
    }
}

/**
 * Met à jour la quantité en stock pour une collection/format
 */
function updateStock(collectionId, format, quantiteStock) {
    ensureStocksTable();
    // S'assurer que le stock existe
    calculateQuantitesCommandees();
    
    const stmt = db.prepare(`
        INSERT INTO stocks (collection_id, format, quantite_commande, quantite_stock, gere, updated_at)
        VALUES (?, ?, 
                COALESCE((SELECT quantite_commande FROM stocks WHERE collection_id = ? AND format = ?), 0),
                ?, 
                COALESCE((SELECT gere FROM stocks WHERE collection_id = ? AND format = ?), 0),
                datetime('now'))
        ON CONFLICT(collection_id, format) 
        DO UPDATE SET 
            quantite_stock = excluded.quantite_stock,
            updated_at = datetime('now')
    `);
    
    stmt.run(collectionId, format, collectionId, format, quantiteStock, collectionId, format);
    
    return getStock(collectionId, format);
}

/**
 * Marque un stock comme géré ou non géré
 */
function setGere(collectionId, format, gere) {
    ensureStocksTable();
    // S'assurer que le stock existe
    calculateQuantitesCommandees();
    
    const stmt = db.prepare(`
        INSERT INTO stocks (collection_id, format, quantite_commande, quantite_stock, gere, updated_at)
        VALUES (?, ?, 
                COALESCE((SELECT quantite_commande FROM stocks WHERE collection_id = ? AND format = ?), 0),
                COALESCE((SELECT quantite_stock FROM stocks WHERE collection_id = ? AND format = ?), 0),
                ?,
                datetime('now'))
        ON CONFLICT(collection_id, format) 
        DO UPDATE SET 
            gere = excluded.gere,
            updated_at = datetime('now')
    `);
    
    const gereValue = gere ? 1 : 0;
    stmt.run(collectionId, format, collectionId, format, collectionId, format, gereValue);
    
    return getStock(collectionId, format);
}

/**
 * Récupère les stocks nécessitant une commande (non gérés avec quantité commandée > 0)
 */
function getStocksANecessiterCommande() {
    ensureStocksTable();
    calculateQuantitesCommandees();
    const stmt = db.prepare(`
        SELECT 
            s.collection_id,
            s.format,
            s.quantite_commande,
            s.quantite_stock,
            s.gere,
            s.updated_at,
            c.nom as collection_nom
        FROM stocks s
        INNER JOIN collections c ON s.collection_id = c.id
        WHERE s.gere = 0 AND s.quantite_commande > 0
        ORDER BY s.collection_id, s.format
    `);
    return stmt.all();
}

module.exports = {
    getAllStocks,
    getStock,
    updateStock,
    setGere,
    getStocksANecessiterCommande,
    calculateQuantitesCommandees,
};


