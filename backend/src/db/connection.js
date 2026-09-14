const Database = require('better-sqlite3');
const { getDatabasePath } = require('../config');

const dbPath = getDatabasePath();
const db = new Database(dbPath);

module.exports = db;
