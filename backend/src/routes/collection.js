const express = require('express');
const router = express.Router();

const {
    getAllCollections,
    getCollectionById,
    createCollection,
    updateCollection,
    deleteCollection
} = require('../db/collection');

// READ - Récupérer toutes les collections
router.get('/', (req, res) => {
    try{
        const collections = getAllCollections();
        res.json(collections);
    } catch (err){
        console.error('Erreur lecture collection SQLite:', err);
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// READ - Récupérer une collection par son ID
router.get('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)){
            return res.status(400).json({ error: 'ID invalide' });
        }

        const collection = getCollectionById(id);
        if (!collection){
            return res.status(404).json({ error: 'Collection non trouvé' });
        }

        res.json(collection);
    } catch (err) {
        console.error('Erreur lecture collection SQLite:', err);
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// CREATE - Créer une nouvelle collection
router.post('/', (req, res) => {
    try {
        const { nom } = req.body;

        if (!nom){
            return res.status(400).json({ error: 'Le champ nom est obligatoire' });
        }

        const newCollection = createCollection(req.body);
        res.status(201).json(newCollection);
    } catch (err) {
        console.error('Erreur création collection SQLite:', err);
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// UPDATE - Mettre à jour une collection
router.put('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)){
            return res.status(400).json({ error: 'ID invalide' });
        }
        
        const { nom } = req.body;

        if (!nom){
            return res.status(400).json({ error: 'Le champ nom est obligatoire' });
        }

        const updatedCollection = updateCollection(id, req.body);
        if (!updatedCollection){
            return res.status(404).json({ error: 'Collection non trouvé' });
        }

        res.json(updatedCollection);
    } catch (err) {
        console.error('Erreur mise à jour collection SQLite:', err);
        
        if (err.message && err.message.includes('UNIQUE constraint')) {
            return res.status(409).json({ error: 'Une collection avec ce nom existe déjà' });
        }
        
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// DELETE - Supprimer une collection
router.delete('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)){
            return res.status(400).json({ error: 'ID invalide' });
        }

        const deleted = deleteCollection(id);
        if (deleted === null) {
            return res.status(404).json({ error: 'Collection non trouvée' });
        }
        if (!deleted){
            return res.status(404).json({ error: 'Collection non trouvée' });
        }

        res.status(204).send();
    } catch (err) {
        console.error('Erreur suppression collection SQLite:', err);
        
        // Gestion des erreurs de dépendances
        if (err.message && (
            err.message.includes('utilisée dans un ou plusieurs groupes') ||
            err.message.includes('utilisée dans une ou plusieurs commandes')
        )) {
            return res.status(409).json({ error: err.message });
        }
        
        // Gestion des erreurs de contrainte FOREIGN KEY (fallback)
        if (err.message && err.message.includes('FOREIGN KEY constraint')) {
            return res.status(409).json({ error: 'Cette collection est utilisée et ne peut pas être supprimée' });
        }
        
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});
module.exports = router;