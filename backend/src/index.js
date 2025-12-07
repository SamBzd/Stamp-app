const express = require('express')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3000

const {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getAllClientsNames
} = require('./db');

app.use(cors())
app.use(express.json())

// Endpoint de test
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'backend up' })
})

// READ - Récupérer tous les clients
app.get('/api/clients', (req, res) => {
  try {
    const clients = getAllClients();
    res.json(clients);
  } catch (err) {
    console.error('Erreur lecture clients SQLite:', err);
    res.status(500).json({ error: 'Erreur interne serveur' });
  }
});

// READ - Récupérer un client par son ID
app.get('/api/clients/:id', (req, res) => {
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
app.post('/api/clients', (req, res) => {
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
app.put('/api/clients/:id', (req, res) => {
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
app.delete('/api/clients/:id', (req, res) => {
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

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`)
})
