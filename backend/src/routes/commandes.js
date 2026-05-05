const express = require('express');
const router = express.Router();

const {
    getAllCommandes,
    getCommandeById,
    getCommandesByClientId,
    createCommande,
    updateCommande,
    deleteCommande
} = require('../db/commandes');

// GET / — toutes les commandes
router.get('/', (req, res) => {
    try {
        const commandes = getAllCommandes();
        res.json(commandes);
    } catch (err) {
        console.error('Erreur lecture commandes:', err);
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// GET /:id — commande avec détail (client, collections, papiers)
router.get('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' });

        const commande = getCommandeById(id);
        if (!commande) return res.status(404).json({ error: 'Commande non trouvée' });

        res.json(commande);
    } catch (err) {
        console.error('Erreur lecture commande:', err);
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// POST / — créer une commande (kit ou hors_kit)
router.post('/', (req, res) => {
    try {
        const { client_id, type } = req.body;

        if (!client_id) return res.status(400).json({ error: 'client_id est obligatoire' });
        if (!type) return res.status(400).json({ error: 'type est obligatoire' });
        if (!['kit', 'hors_kit'].includes(type)) {
            return res.status(400).json({ error: "type doit être 'kit' ou 'hors_kit'" });
        }

        if (type === 'kit') {
            const { format_type, methode_paiement } = req.body;
            if (!format_type) return res.status(400).json({ error: 'format_type est obligatoire pour un kit' });
            if (!['A', 'B', 'C'].includes(format_type)) {
                return res.status(400).json({ error: "format_type doit être 'A', 'B' ou 'C'" });
            }
            if (!methode_paiement) return res.status(400).json({ error: 'methode_paiement est obligatoire' });
            if (!['Paypal', 'chèque', 'virement'].includes(methode_paiement)) {
                return res.status(400).json({ error: "methode_paiement doit être 'Paypal', 'chèque' ou 'virement'" });
            }
        }

        if (type === 'hors_kit') {
            const { montant } = req.body;
            if (montant === undefined || montant === null) {
                return res.status(400).json({ error: 'montant est obligatoire pour une commande hors_kit' });
            }
        }

        const newCommande = createCommande(req.body);
        res.status(201).json(newCommande);
    } catch (err) {
        console.error('Erreur création commande:', err);

        const clientErrors = [
            'Client non trouvé',
            'Collection non trouvée',
        ];
        if (clientErrors.includes(err.message)) {
            return res.status(404).json({ error: err.message });
        }

        const validationErrors = [
            'format_type', 'methode_paiement', 'nb_feuilles', 'même catalogue',
            'requiert', 'total de nb_feuilles', 'obligatoire'
        ];
        if (validationErrors.some(s => err.message.includes(s))) {
            return res.status(400).json({ error: err.message });
        }

        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// PUT /:id — mise à jour partielle des champs scalaires
router.put('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' });

        const { format_type, methode_paiement } = req.body;

        if (format_type !== undefined && !['A', 'B', 'C'].includes(format_type)) {
            return res.status(400).json({ error: "format_type doit être 'A', 'B' ou 'C'" });
        }
        if (methode_paiement !== undefined && !['Paypal', 'chèque', 'virement'].includes(methode_paiement)) {
            return res.status(400).json({ error: "methode_paiement doit être 'Paypal', 'chèque' ou 'virement'" });
        }

        const updated = updateCommande(id, req.body);
        if (!updated) return res.status(404).json({ error: 'Commande non trouvée' });

        res.json(updated);
    } catch (err) {
        console.error('Erreur mise à jour commande:', err);
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

// DELETE /:id
router.delete('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' });

        const deleted = deleteCommande(id);
        if (!deleted) return res.status(404).json({ error: 'Commande non trouvée' });

        res.status(204).send();
    } catch (err) {
        console.error('Erreur suppression commande:', err);
        res.status(500).json({ error: 'Erreur interne serveur' });
    }
});

module.exports = router;
