const express = require('express');
const router = express.Router();

const {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient
} = require('../db/client');

// READ - Récupérer tous les clients
router.get('/', (req, res) => {
  try {
    const clients = getAllClients();
    res.json(clients);
  } catch (err) {
    console.error('Erreur lecture clients SQLite:', err);
    res.status(500).json({ error: 'Erreur interne serveur' });
  }
});

// READ - Récupérer un client par son ID
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const client = getClientById(id);
    if (!client) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    res.json(client);
  } catch (err) {
    console.error('Erreur lecture client SQLite:', err);
    res.status(500).json({ error: 'Erreur interne serveur' });
  }
});

// CREATE - Créer un nouveau client
router.post('/', (req, res) => {
  try {
    const { nom, prenom } = req.body;

    // Validation des champs obligatoires
    if (!nom || !prenom) {
      return res.status(400).json({ error: 'Les champs nom et prénom sont obligatoires' });
    }

    const newClient = createClient(req.body);
    res.status(201).json(newClient);
  } catch (err) {
    console.error('Erreur création client SQLite:', err);
    
    // Gestion des erreurs de contrainte unique (email)
    if (err.message && err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Un client avec cet email existe déjà' });
    }
    
    res.status(500).json({ error: 'Erreur interne serveur' });
  }
});

// UPDATE - Mettre à jour un client
router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const { nom, prenom } = req.body;

    // Validation des champs obligatoires
    if (!nom || !prenom) {
      return res.status(400).json({ error: 'Les champs nom et prénom sont obligatoires' });
    }

    const updatedClient = updateClient(id, req.body);
    if (!updatedClient) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    res.json(updatedClient);
  } catch (err) {
    console.error('Erreur mise à jour client SQLite:', err);
    
    // Gestion des erreurs de contrainte unique (email)
    if (err.message && err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Un client avec cet email existe déjà' });
    }
    
    res.status(500).json({ error: 'Erreur interne serveur' });
  }
});

// DELETE - Supprimer un client
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const deleted = deleteClient(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Erreur suppression client SQLite:', err);
    res.status(500).json({ error: 'Erreur interne serveur' });
  }
});

// READ - Récupérer les commandes d'une cliente
router.get('/:id/commandes', (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    if (isNaN(clientId)) {
      return res.status(400).json({ error: 'ID client invalide' });
    }

    // Vérifier que le client existe
    const client = getClientById(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    const { getCommandesByClientId } = require('../db/commandes');
    const commandes = getCommandesByClientId(clientId);
    res.json(commandes);
  } catch (err) {
    console.error('Erreur lecture commandes client SQLite:', err);
    res.status(500).json({ error: 'Erreur interne serveur' });
  }
});

module.exports = router;
