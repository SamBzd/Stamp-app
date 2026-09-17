const express = require('express');
const cors = require('cors');
const { getCorsOrigins } = require('./config');

const clientsRoutes = require('./routes/client');
const cataloguesRoutes = require('./routes/catalogues');
const collectionsRoutes = require('./routes/collection');
const groupesRoutes = require('./routes/groupes');
const commandesRoutes = require('./routes/commandes');
const stocksRoutes = require('./routes/stocks');
const settingsRoutes = require('./routes/settings');
const papiersCartonnesRoutes = require('./routes/papiers-cartonnes');

const app = express();
const corsOrigins = getCorsOrigins();

if (corsOrigins.length > 0) {
  app.use(cors({
    origin(origin, callback) {
      callback(null, !origin || corsOrigins.includes(origin));
    }
  }));
}
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'backend up' });
});

app.use('/api/clients', clientsRoutes);
app.use('/api/catalogues', cataloguesRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/groupes', groupesRoutes);
app.use('/api/commandes', commandesRoutes);
app.use('/api/stocks', stocksRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/papiers-cartonnes', papiersCartonnesRoutes);

// Les corps JSON malformés conservent le format d’erreur des endpoints API.
app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Corps JSON invalide : un objet JSON est requis' });
  }
  next(error);
});

module.exports = app;
