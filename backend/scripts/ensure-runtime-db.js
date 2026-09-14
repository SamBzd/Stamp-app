#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { getDatabasePath } = require('../src/config');

const databasePath = getDatabasePath();
const schemaPath = path.resolve(__dirname, '../../db/schema.sql');
const requiredTables = [
  'catalogues',
  'clients',
  'collection_papiers',
  'collections',
  'commande_collections',
  'commande_papiers_selectionnes',
  'commandes',
  'papiers_cartonnes',
  'settings'
];

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const database = new Database(databasePath);

try {
  const existingTables = new Set(
    database.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    `).all().map(({ name }) => name)
  );

  if (existingTables.size === 0) {
    database.exec(fs.readFileSync(schemaPath, 'utf8'));
    console.log(`Base SQLite initialisée : ${databasePath}`);
  } else {
    const missingTables = requiredTables.filter((table) => !existingTables.has(table));

    if (missingTables.length > 0) {
      throw new Error(
        `La base SQLite existe mais son schéma est incomplet (${missingTables.join(', ')}). Une migration explicite est requise.`
      );
    }

    console.log(`Base SQLite existante prête : ${databasePath}`);
  }
} finally {
  database.close();
}
