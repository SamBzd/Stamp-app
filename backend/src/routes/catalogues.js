const express = require('express');
const router = express.Router();

const {
  getAllCatalogues,
  getCatalogueById,
  createCatalogue,
  updateCatalogue,
  deleteCatalogue
} = require('../db/catalogues');

const {
  addCollection,
  updateCollection,
  deleteCollection,
  setPapiersCollection
} = require('../db/collections');

// GET / — liste tous les catalogues
router.get('/', (req, res) => {
  try {
    const catalogues = getAllCatalogues();
    res.json(catalogues);
  } catch (err) {
    console.error('Erreur lecture catalogues:', err);
    res.status(500).json({ error: 'Erreur interne serveur' });
  }
});

// GET /:id — détail avec collections + papiers
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const catalogue = getCatalogueById(id);
    if (!catalogue) {
      return res.status(404).json({ error: 'Catalogue non trouvé' });
    }

    res.json(catalogue);
  } catch (err) {
    console.error('Erreur lecture catalogue:', err);
    res.status(500).json({ error: 'Erreur interne serveur' });
  }
});

// POST / — créer un catalogue
router.post('/', (req, res) => {
  try {
    const { titre } = req.body;

    if (!titre) {
      return res.status(400).json({ error: 'Le champ titre est obligatoire' });
    }

    const catalogue = createCatalogue(req.body);
    res.status(201).json(catalogue);
  } catch (err) {
    console.error('Erreur création catalogue:', err);

    if (err.message && err.message.includes('Format de titre invalide')) {
      return res.status(400).json({ error: err.message });
    }
    if (err.message && err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Un catalogue avec ce titre existe déjà' });
    }

    res.status(500).json({ error: 'Erreur interne serveur' });
  }
});

// PUT /:id — mise à jour partielle d'un catalogue
router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const catalogue = updateCatalogue(id, req.body);
    if (!catalogue) {
      return res.status(404).json({ error: 'Catalogue non trouvé' });
    }

    res.json(catalogue);
  } catch (err) {
    console.error('Erreur mise à jour catalogue:', err);

    if (err.message && err.message.includes('Format de titre invalide')) {
      return res.status(400).json({ error: err.message });
    }
    if (err.message && err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Un catalogue avec ce titre existe déjà' });
    }

    res.status(500).json({ error: 'Erreur interne serveur' });
  }
});

// DELETE /:id — supprimer un catalogue (cascade gérée par la DB)
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const deleted = deleteCatalogue(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Catalogue non trouvé' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Erreur suppression catalogue:', err);
    res.status(500).json({ error: 'Erreur interne serveur' });
  }
});

// POST /:id/collections — ajouter une collection à un catalogue (max 4)
router.post('/:id/collections', (req, res) => {
  try {
    const catalogueId = parseInt(req.params.id);
    if (isNaN(catalogueId)) {
      return res.status(400).json({ error: 'ID catalogue invalide' });
    }

    const { nom } = req.body;
    if (!nom) {
      return res.status(400).json({ error: 'Le champ nom est obligatoire' });
    }

    const catalogue = getCatalogueById(catalogueId);
    if (!catalogue) {
      return res.status(404).json({ error: 'Catalogue non trouvé' });
    }

    const collection = addCollection(catalogueId, nom);
    res.status(201).json(collection);
  } catch (err) {
    console.error('Erreur ajout collection:', err);

    if (err.message && err.message.includes('plus de 4 collections')) {
      return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: 'Erreur interne serveur' });
  }
});

// PUT /collections/:id — modifier le nom d'une collection
router.put('/collections/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const { nom } = req.body;
    if (!nom) {
      return res.status(400).json({ error: 'Le champ nom est obligatoire' });
    }

    const collection = updateCollection(id, nom);
    if (!collection) {
      return res.status(404).json({ error: 'Collection non trouvée' });
    }

    res.json(collection);
  } catch (err) {
    console.error('Erreur mise à jour collection:', err);
    res.status(500).json({ error: 'Erreur interne serveur' });
  }
});

// DELETE /collections/:id — supprimer une collection
router.delete('/collections/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const deleted = deleteCollection(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Collection non trouvée' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Erreur suppression collection:', err);
    res.status(500).json({ error: 'Erreur interne serveur' });
  }
});

// PUT /collections/:id/papiers — remplacer toute la liste des papiers (max 5)
router.put('/collections/:id/papiers', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const { papier_ids } = req.body;
    if (!Array.isArray(papier_ids)) {
      return res.status(400).json({ error: 'papier_ids doit être un tableau' });
    }

    setPapiersCollection(id, papier_ids);
    res.json({ success: true });
  } catch (err) {
    console.error('Erreur mise à jour papiers collection:', err);

    if (err.message && err.message.includes('plus de 5 papiers')) {
      return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: 'Erreur interne serveur' });
  }
});

module.exports = router;
