#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const mode = process.argv[2];
const allowedModes = new Set([undefined, '--ensure', '--reset']);

if (!allowedModes.has(mode)) {
  console.error('Usage: node backend/scripts/init-dev-db.js [--ensure|--reset]');
  process.exit(1);
}

const databasePath = path.resolve(__dirname, '../../db/dev.db');
const schemaPath = path.resolve(__dirname, '../../db/schema.sql');

if (mode === '--reset') {
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    fs.rmSync(`${databasePath}${suffix}`, { force: true });
  }
  console.log('Base de développement supprimée.');
}

if (fs.existsSync(databasePath)) {
  if (mode === undefined) {
    console.error('La base de développement existe déjà. Utilise npm run db:dev:reset pour la recréer.');
    process.exit(1);
  }

  console.log(`Base de développement prête : ${databasePath}`);
  process.exit(0);
}

const schema = fs.readFileSync(schemaPath, 'utf8');
const database = new Database(databasePath);

try {
  database.exec(schema);
  console.log(`Base de développement initialisée : ${databasePath}`);
} finally {
  database.close();
}
