const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '../../db/app.db');
const db = new Database(dbPath);

function getAllClientsNames() {
  const stmt = db.prepare('SELECT nom, prenom FROM clients');
  return stmt.all();
}

module.exports = { getAllClientsNames };
