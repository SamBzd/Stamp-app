const express = require('express')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3000

const { getAllClientsNames } = require('./db');

app.use(cors())
app.use(express.json())

// Endpoint de test (on branchera la BDD plus tard)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'backend up' })
})

// TODO étape 3: app.get('/api/clients', ...) avec SQLite

app.get('/api/clients', (req, res) => {
  try {
    const clients = getAllClientsNames();
    res.json(clients);
  } catch (err) {
    console.error('Erreur lecture clients SQLite:', err);
    res.status(500).json({ error: 'Erreur interne serveur' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`)
})
