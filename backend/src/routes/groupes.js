const express = require('express');
const router = express.Router();

const {
    getAllGroupes,
    getGroupeById,
    getCollectionsByGroupeId,
    createGroupe,
    updateGroupe,
    addCollectionToGroupe,
    removeCollectionFromGroupe,
    updateCollectionOrder,
    deleteGroupe
} = require('../db/groupes');

// READ - Récupérer tous les groupes
router.get('/', (req, res) => {
    try {
        const groupes = getAllGroupes();
        res.json(groupes);
    } catch (err) {
        console.error('Erreur lecture groupes SQLite:', err);
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// READ - Récupérer un groupe par son ID
router.get('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID invalide' });
        }

        const groupe = getGroupeById(id);
        if (!groupe) {
            return res.status(404).json({ error: 'Groupe non trouvé' });
        }

        res.json(groupe);
    } catch (err) {
        console.error('Erreur lecture groupe SQLite:', err);
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// READ - Récupérer les collections d'un groupe
router.get('/:id/collections', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID invalide' });
        }

        const groupe = getGroupeById(id);
        if (!groupe) {
            return res.status(404).json({ error: 'Groupe non trouvé' });
        }

        const collections = getCollectionsByGroupeId(id);
        res.json(collections);
    } catch (err) {
        console.error('Erreur lecture collections du groupe SQLite:', err);
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// CREATE - Créer un nouveau groupe
router.post('/', (req, res) => {
    try {
        const { nom, format_A_prix, format_B_prix, format_C_prix, description } = req.body;

        // Validation des champs obligatoires
        if (!nom) {
            return res.status(400).json({ error: 'Le champ nom est obligatoire' });
        }

        // Validation des prix (entiers >= 0)
        if (format_A_prix !== undefined && (typeof format_A_prix !== 'number' || format_A_prix < 0)) {
            return res.status(400).json({ error: 'format_A_prix doit être un entier >= 0' });
        }
        if (format_B_prix !== undefined && (typeof format_B_prix !== 'number' || format_B_prix < 0)) {
            return res.status(400).json({ error: 'format_B_prix doit être un entier >= 0' });
        }
        if (format_C_prix !== undefined && (typeof format_C_prix !== 'number' || format_C_prix < 0)) {
            return res.status(400).json({ error: 'format_C_prix doit être un entier >= 0' });
        }

        const newGroupe = createGroupe(req.body);
        res.status(201).json(newGroupe);
    } catch (err) {
        console.error('Erreur création groupe SQLite:', err);
        
        // Gestion des erreurs de contrainte unique (nom)
        if (err.message && err.message.includes('UNIQUE constraint')) {
            return res.status(409).json({ error: 'Un groupe avec ce nom existe déjà' });
        }
        
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// UPDATE - Mettre à jour un groupe
router.put('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID invalide' });
        }

        const { nom, format_A_prix, format_B_prix, format_C_prix, description } = req.body;

        // Validation des prix si fournis
        if (format_A_prix !== undefined && (typeof format_A_prix !== 'number' || format_A_prix < 0)) {
            return res.status(400).json({ error: 'format_A_prix doit être un entier >= 0' });
        }
        if (format_B_prix !== undefined && (typeof format_B_prix !== 'number' || format_B_prix < 0)) {
            return res.status(400).json({ error: 'format_B_prix doit être un entier >= 0' });
        }
        if (format_C_prix !== undefined && (typeof format_C_prix !== 'number' || format_C_prix < 0)) {
            return res.status(400).json({ error: 'format_C_prix doit être un entier >= 0' });
        }

        const updatedGroupe = updateGroupe(id, req.body);
        if (!updatedGroupe) {
            return res.status(404).json({ error: 'Groupe non trouvé' });
        }

        res.json(updatedGroupe);
    } catch (err) {
        console.error('Erreur mise à jour groupe SQLite:', err);
        
        // Gestion des erreurs de contrainte unique (nom)
        if (err.message && err.message.includes('UNIQUE constraint')) {
            return res.status(409).json({ error: 'Un groupe avec ce nom existe déjà' });
        }
        
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// CREATE - Ajouter une collection à un groupe
router.post('/:id/collections', (req, res) => {
    try {
        const groupeId = parseInt(req.params.id);
        if (isNaN(groupeId)) {
            return res.status(400).json({ error: 'ID de groupe invalide' });
        }

        const { collection_id, ordre } = req.body;

        if (!collection_id) {
            return res.status(400).json({ error: 'collection_id est obligatoire' });
        }

        if (ordre === undefined || ordre === null) {
            return res.status(400).json({ error: 'ordre est obligatoire' });
        }

        const collectionId = parseInt(collection_id);
        if (isNaN(collectionId)) {
            return res.status(400).json({ error: 'collection_id invalide' });
        }

        const ordreNum = parseInt(ordre);
        if (isNaN(ordreNum)) {
            return res.status(400).json({ error: 'ordre invalide' });
        }

        const liaison = addCollectionToGroupe(groupeId, collectionId, ordreNum);
        res.status(201).json(liaison);
    } catch (err) {
        console.error('Erreur ajout collection au groupe SQLite:', err);
        
        if (err.message === 'Groupe non trouvé' || err.message === 'Collection non trouvée') {
            return res.status(404).json({ error: err.message });
        }
        
        if (err.message === 'Cette collection est déjà dans ce groupe') {
            return res.status(409).json({ error: err.message });
        }
        
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// DELETE - Retirer une collection d'un groupe
router.delete('/:id/collections/:collectionId', (req, res) => {
    try {
        const groupeId = parseInt(req.params.id);
        const collectionId = parseInt(req.params.collectionId);
        
        if (isNaN(groupeId) || isNaN(collectionId)) {
            return res.status(400).json({ error: 'ID invalide' });
        }

        const deleted = removeCollectionFromGroupe(groupeId, collectionId);
        if (!deleted) {
            return res.status(404).json({ error: 'Liaison non trouvée' });
        }

        res.status(204).send();
    } catch (err) {
        console.error('Erreur suppression collection du groupe SQLite:', err);
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// UPDATE - Réordonner les collections d'un groupe
router.put('/:id/collections/:collectionId/ordre', (req, res) => {
    try {
        const groupeId = parseInt(req.params.id);
        const collectionId = parseInt(req.params.collectionId);
        
        if (isNaN(groupeId) || isNaN(collectionId)) {
            return res.status(400).json({ error: 'ID invalide' });
        }

        const { ordre } = req.body;
        if (ordre === undefined || ordre === null) {
            return res.status(400).json({ error: 'ordre est obligatoire' });
        }

        const ordreNum = parseInt(ordre);
        if (isNaN(ordreNum)) {
            return res.status(400).json({ error: 'ordre invalide' });
        }

        const updated = updateCollectionOrder(groupeId, collectionId, ordreNum);
        if (!updated) {
            return res.status(404).json({ error: 'Liaison non trouvée' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Erreur mise à jour ordre collection SQLite:', err);
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// DELETE - Supprimer un groupe
router.delete('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID invalide' });
        }

        const deleted = deleteGroupe(id);
        if (!deleted) {
            return res.status(404).json({ error: 'Groupe non trouvé' });
        }

        res.status(204).send();
    } catch (err) {
        console.error('Erreur suppression groupe SQLite:', err);
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

module.exports = router;
