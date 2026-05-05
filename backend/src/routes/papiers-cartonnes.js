const express = require('express');
const router = express.Router();

const { searchPapiersCartonnes, createPapierCartonne } = require('../db/papiers_cartonnes');

// READ — GET /?search= — retourne un tableau de papiers cartonnés
router.get('/', (req, res) => {
  try {
    const search = req.query.search || '';
    const results = searchPapiersCartonnes(search);
    res.json(results);
  } catch (err) {
    console.error('Erreur lecture papiers_cartonnes SQLite:', err);
    res.status(500).json({ error: 'Erreur interne serveur' });
  }
});

// CREATE — POST / — body { nom } — nom obligatoire, 409 si doublon
router.post('/', (req, res) => {
  try {
    const { nom } = req.body;

    if (!nom || String(nom).trim() === '') {
      return res.status(400).json({ error: 'Le champ nom est obligatoire' });
    }

    const papier = createPapierCartonne(nom);
    res.status(201).json(papier);
  } catch (err) {
    console.error('Erreur création papier_cartonné SQLite:', err);

    if (err.message && err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Un papier cartonné avec ce nom existe déjà' });
    }

    res.status(500).json({ error: 'Erreur interne serveur' });
  }
});

module.exports = router;
