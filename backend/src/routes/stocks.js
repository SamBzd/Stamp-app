const express = require('express');
const router = express.Router();

const {
    getAllStocks,
    getStock,
    updateStock,
    setGere,
    getStocksANecessiterCommande,
    calculateQuantitesCommandees,
} = require('../db/stocks');

// READ - Récupérer tous les stocks
router.get('/', (req, res) => {
    try {
        const stocks = getAllStocks();
        res.json(stocks || []);
    } catch (err) {
        console.error('Erreur lecture stocks SQLite:', err);
        res.status(500).json({ error: 'Erreur interne serveur: ' + err.message });
    }
});

// READ - Récupérer un stock spécifique
router.get('/:collectionId/:format', (req, res) => {
    try {
        const collectionId = parseInt(req.params.collectionId);
        const format = req.params.format.toUpperCase();
        
        if (isNaN(collectionId)) {
            return res.status(400).json({ error: 'ID collection invalide' });
        }
        
        if (!['A', 'B', 'C'].includes(format)) {
            return res.status(400).json({ error: 'Format invalide (doit être A, B ou C)' });
        }
        
        const stock = getStock(collectionId, format);
        if (!stock) {
            return res.status(404).json({ error: 'Stock non trouvé' });
        }
        
        res.json(stock);
    } catch (err) {
        console.error('Erreur lecture stock SQLite:', err);
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// UPDATE - Mettre à jour la quantité en stock
router.put('/:collectionId/:format', (req, res) => {
    try {
        const collectionId = parseInt(req.params.collectionId);
        const format = req.params.format.toUpperCase();
        const { quantite_stock } = req.body;
        
        if (isNaN(collectionId)) {
            return res.status(400).json({ error: 'ID collection invalide' });
        }
        
        if (!['A', 'B', 'C'].includes(format)) {
            return res.status(400).json({ error: 'Format invalide (doit être A, B ou C)' });
        }
        
        if (quantite_stock === undefined || quantite_stock === null) {
            return res.status(400).json({ error: 'quantite_stock est obligatoire' });
        }
        
        if (typeof quantite_stock !== 'number' || quantite_stock < 0) {
            return res.status(400).json({ error: 'quantite_stock doit être un nombre >= 0' });
        }
        
        const updatedStock = updateStock(collectionId, format, quantite_stock);
        res.json(updatedStock);
    } catch (err) {
        console.error('Erreur mise à jour stock SQLite:', err);
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// UPDATE - Marquer un stock comme géré/non géré
router.patch('/:collectionId/:format/gere', (req, res) => {
    try {
        const collectionId = parseInt(req.params.collectionId);
        const format = req.params.format.toUpperCase();
        const { gere } = req.body;
        
        if (isNaN(collectionId)) {
            return res.status(400).json({ error: 'ID collection invalide' });
        }
        
        if (!['A', 'B', 'C'].includes(format)) {
            return res.status(400).json({ error: 'Format invalide (doit être A, B ou C)' });
        }
        
        if (gere === undefined || gere === null) {
            return res.status(400).json({ error: 'gere est obligatoire' });
        }
        
        if (typeof gere !== 'boolean' && gere !== 0 && gere !== 1) {
            return res.status(400).json({ error: 'gere doit être un booléen (true/false ou 0/1)' });
        }
        
        const updatedStock = setGere(collectionId, format, gere);
        res.json(updatedStock);
    } catch (err) {
        console.error('Erreur mise à jour statut géré SQLite:', err);
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// READ - Récupérer les stocks nécessitant une commande
router.get('/a-necessiter', (req, res) => {
    try {
        const stocks = getStocksANecessiterCommande();
        res.json(stocks);
    } catch (err) {
        console.error('Erreur lecture stocks à nécessiter SQLite:', err);
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// POST - Recalculer les quantités commandées
router.post('/recalculate', (req, res) => {
    try {
        calculateQuantitesCommandees();
        res.json({ success: true, message: 'Quantités commandées recalculées' });
    } catch (err) {
        console.error('Erreur recalcul stocks SQLite:', err);
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

module.exports = router;


