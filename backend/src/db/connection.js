const path = require('path');
const Database = require('better-sqlite3');

// Utiliser la variable d'environnement DB_PATH si disponible, sinon chemin relatif par défaut
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../../db/app.db');
const db = new Database(dbPath);

module.exports = db;