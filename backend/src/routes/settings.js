const express = require('express');
const router = express.Router();

const { getSettings, updateSettings } = require('../db/settings');

// READ — retourne { prix_A, prix_B, prix_C }
router.get('/', (req, res) => {
  try {
    const settings = getSettings();
    res.json(settings);
  } catch (err) {
    console.error('Erreur lecture settings SQLite:', err);
    res.status(500).json({ error: 'Erreur interne serveur' });
  }
});

// UPDATE — body { prix_A?, prix_B?, prix_C? } — valide que les valeurs sont des nombres > 0
router.put('/', (req, res) => {
  try {
    const allowed = ['prix_A', 'prix_B', 'prix_C'];
    const updates = {};

    for (const key of allowed) {
      if (key in req.body) {
        const val = Number(req.body[key]);
        if (isNaN(val) || val <= 0) {
          return res.status(400).json({ error: `La valeur de ${key} doit être un nombre > 0` });
        }
        updates[key] = String(val);
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Aucune clé valide fournie (prix_A, prix_B, prix_C)' });
    }

    const settings = updateSettings(updates);
    res.json(settings);
  } catch (err) {
    console.error('Erreur mise à jour settings SQLite:', err);
    res.status(500).json({ error: 'Erreur interne serveur' });
  }
});

module.exports = router;
