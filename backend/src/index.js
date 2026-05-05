const express = require('express')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3000

// Import des routes
const clientsRoutes = require('./routes/client')
const cataloguesRoutes = require('./routes/catalogues')
const collectionsRoutes = require('./routes/collection')
const groupesRoutes = require('./routes/groupes')
const commandesRoutes = require('./routes/commandes')
const stocksRoutes = require('./routes/stocks')

app.use(cors())
app.use(express.json())

// Endpoint de test
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'backend up' })
})

// Routes pour les clients
app.use('/api/clients', clientsRoutes)

// Routes pour les catalogues
app.use('/api/catalogues', cataloguesRoutes)

// Routes pour les collections
app.use('/api/collections', collectionsRoutes)

// Routes pour les groupes de collections
app.use('/api/groupes', groupesRoutes)

// Routes pour les commandes
app.use('/api/commandes', commandesRoutes)

// Routes pour les stocks
app.use('/api/stocks', stocksRoutes)

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`)
})
