const express = require('express')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3000

// Import des routes
const clientsRoutes = require('./routes/client')
const collectionsRoutes = require('./routes/collection')

app.use(cors())
app.use(express.json())

// Endpoint de test
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'backend up' })
})

// Routes pour les clients
app.use('/api/clients', clientsRoutes)

// Routes pour les collections
app.use('/api/collections', collectionsRoutes)

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`)
})
