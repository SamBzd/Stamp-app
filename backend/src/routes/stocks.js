const express = require('express');
const router = express.Router();

const { getStocks, getBilanMensuel } = require('../db/stocks');

// GET / — retourne l'objet structuré complet (papiers, papier_spe, embellissement, collections)
router.get('/', (req, res) => {
    try {
        const stocks = getStocks();
        res.json(stocks);
    } catch (err) {
        console.error('Erreur getStocks:', err);
        res.status(500).json({ error: 'Erreur interne serveur: ' + err.message });
    }
});

// GET /bilan?mois=YYYY-MM — bilan comptable mensuel
router.get('/bilan', (req, res) => {
    try {
        const { mois } = req.query;

        if (!mois || !/^\d{4}-\d{2}$/.test(mois)) {
            return res.status(400).json({ error: 'Paramètre mois invalide — format attendu : YYYY-MM' });
        }

        const bilan = getBilanMensuel(mois);
        res.json(bilan);
    } catch (err) {
        console.error('Erreur getBilanMensuel:', err);
        res.status(500).json({ error: 'Erreur interne serveur: ' + err.message });
    }
});

// POST /recalculate — no-op (calcul à la volée, compatibilité frontend)
router.post('/recalculate', (req, res) => {
    res.json({ success: true });
});

module.exports = router;
