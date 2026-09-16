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
        const raw = req.body[key];
        const val = Number(raw);
        if (!['number', 'string'].includes(typeof raw) ||
            (typeof raw === 'string' && raw.trim() === '') ||
            !Number.isFinite(val) || val < 0 || val > 100 ||
            Math.abs(val * 100 - Math.round(val * 100)) > 0.000001) {
          return res.status(400).json({ error: `La valeur de ${key} doit être entre 0 et 100 euros, au centime` });
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
