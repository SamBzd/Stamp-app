const Database = require('better-sqlite3');
const { getDatabasePath } = require('../config');

const dbPath = getDatabasePath();
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

module.exports = db;
