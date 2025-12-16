const express = require('express');
const router = express.Router();

const {
    getAllCommandes,
    getCommandeById,
    getCollectionsByCommandeId,
    getCommandeComplet,
    createCommande,
    addCollectionToCommande,
    updateCommande,
    removeCollectionFromCommande,
    deleteCommande
} = require('../db/commandes');

// READ - Récupérer toutes les commandes
router.get('/', (req, res) => {
    try {
        const commandes = getAllCommandes();
        res.json(commandes);
    } catch (err) {
        console.error('Erreur lecture commandes SQLite:', err);
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});


// READ - Récupérer une commande par ID
router.get('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID invalide' });
        }

        const commande = getCommandeById(id);
        if (!commande) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }

        res.json(commande);
    } catch (err) {
        console.error('Erreur lecture commande SQLite:', err);
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// READ - Récupérer les collections d'une commande
router.get('/:id/collections', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID invalide' });
        }

        const commande = getCommandeById(id);
        if (!commande) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }

        const collections = getCollectionsByCommandeId(id);
        res.json(collections);
    } catch (err) {
        console.error('Erreur lecture collections commande SQLite:', err);
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// READ - Récupérer une commande complète (avec toutes les infos)
router.get('/:id/complet', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID invalide' });
        }

        const commandeComplet = getCommandeComplet(id);
        if (!commandeComplet) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }

        res.json(commandeComplet);
    } catch (err) {
        console.error('Erreur lecture commande complète SQLite:', err);
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// CREATE - Créer une commande
router.post('/', (req, res) => {
    try {
        const { client_id, groupe_id, format_type, papier_supplementaire, articles_supplementaires, methode_paiement, reglee } = req.body;

        // Validation des champs obligatoires
        if (!client_id) {
            return res.status(400).json({ error: 'client_id est obligatoire' });
        }
        if (!groupe_id) {
            return res.status(400).json({ error: 'groupe_id est obligatoire' });
        }
        if (!format_type) {
            return res.status(400).json({ error: 'format_type est obligatoire' });
        }
        if (!methode_paiement) {
            return res.status(400).json({ error: 'methode_paiement est obligatoire' });
        }

        // Validation des valeurs
        if (!['A', 'B', 'C'].includes(format_type)) {
            return res.status(400).json({ error: 'format_type doit être A, B ou C' });
        }
        if (!['Paypal', 'chèque', 'virement'].includes(methode_paiement)) {
            return res.status(400).json({ error: 'methode_paiement doit être Paypal, chèque ou virement' });
        }
        if (papier_supplementaire !== undefined && ![0, 1].includes(papier_supplementaire)) {
            return res.status(400).json({ error: 'papier_supplementaire doit être 0 ou 1' });
        }
        if (reglee !== undefined && ![0, 1].includes(reglee)) {
            return res.status(400).json({ error: 'reglee doit être 0 ou 1' });
        }

        const newCommande = createCommande(req.body);
        res.status(201).json(newCommande);
    } catch (err) {
        console.error('Erreur création commande SQLite:', err);
        
        if (err.message === 'Client non trouvé' || err.message === 'Groupe non trouvé') {
            return res.status(404).json({ error: err.message });
        }
        
        if (err.message.includes('format_type') || err.message.includes('methode_paiement')) {
            return res.status(400).json({ error: err.message });
        }
        
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// CREATE - Ajouter une collection à une commande
router.post('/:id/collections', (req, res) => {
    try {
        const commandeId = parseInt(req.params.id);
        if (isNaN(commandeId)) {
            return res.status(400).json({ error: 'ID commande invalide' });
        }

        const { collection_id } = req.body;

        if (!collection_id) {
            return res.status(400).json({ error: 'collection_id est obligatoire' });
        }

        const collectionId = parseInt(collection_id);
        if (isNaN(collectionId)) {
            return res.status(400).json({ error: 'collection_id invalide' });
        }

        const liaison = addCollectionToCommande(commandeId, collectionId);
        res.status(201).json(liaison);
    } catch (err) {
        console.error('Erreur ajout collection à commande SQLite:', err);
        
        if (err.message === 'Commande non trouvée' || err.message === 'Collection non trouvée') {
            return res.status(404).json({ error: err.message });
        }
        
        if (err.message === 'Cette collection est déjà dans cette commande') {
            return res.status(409).json({ error: err.message });
        }
        
        if (err.message.includes('n\'appartient pas au groupe')) {
            return res.status(400).json({ error: err.message });
        }
        
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// UPDATE - Mettre à jour une commande
router.put('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID invalide' });
        }

        const { format_type, papier_supplementaire, articles_supplementaires, methode_paiement, reglee } = req.body;

        // Validation des valeurs si fournies
        if (format_type && !['A', 'B', 'C'].includes(format_type)) {
            return res.status(400).json({ error: 'format_type doit être A, B ou C' });
        }
        if (methode_paiement && !['Paypal', 'chèque', 'virement'].includes(methode_paiement)) {
            return res.status(400).json({ error: 'methode_paiement doit être Paypal, chèque ou virement' });
        }
        if (papier_supplementaire !== undefined && ![0, 1].includes(papier_supplementaire)) {
            return res.status(400).json({ error: 'papier_supplementaire doit être 0 ou 1' });
        }
        if (reglee !== undefined && ![0, 1].includes(reglee)) {
            return res.status(400).json({ error: 'reglee doit être 0 ou 1' });
        }

        const updatedCommande = updateCommande(id, req.body);
        if (!updatedCommande) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }

        res.json(updatedCommande);
    } catch (err) {
        console.error('Erreur mise à jour commande SQLite:', err);
        
        if (err.message.includes('format_type') || err.message.includes('methode_paiement')) {
            return res.status(400).json({ error: err.message });
        }
        
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// DELETE - Retirer une collection d'une commande
router.delete('/:id/collections/:collectionId', (req, res) => {
    try {
        const commandeId = parseInt(req.params.id);
        const collectionId = parseInt(req.params.collectionId);
        
        if (isNaN(commandeId) || isNaN(collectionId)) {
            return res.status(400).json({ error: 'ID invalide' });
        }

        const deleted = removeCollectionFromCommande(commandeId, collectionId);
        if (!deleted) {
            return res.status(404).json({ error: 'Liaison non trouvée' });
        }

        res.status(204).send();
    } catch (err) {
        console.error('Erreur suppression collection de commande SQLite:', err);
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// DELETE - Supprimer une commande
router.delete('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID invalide' });
        }

        const deleted = deleteCommande(id);
        if (!deleted) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }

        res.status(204).send();
    } catch (err) {
        console.error('Erreur suppression commande SQLite:', err);
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

module.exports = router;
