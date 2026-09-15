#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { getDatabasePath } = require('../src/config');
const {
  applyMigrations,
  assertNoPendingMigrations,
  getMigrationStatus,
  initializeSchemaAsCurrent
} = require('../src/db/migrations');
const {
  assertMainBaselineCompatible,
  assertMigrationSchemaCompatible
} = require('../src/db/schema-compatibility');

const databasePath = getDatabasePath();
const schemaPath = path.resolve(__dirname, '../../db/schema.sql');

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const database = new Database(databasePath);

try {
  const hasSchemaObjects = Boolean(database.prepare(`
    SELECT 1
    FROM sqlite_master
    WHERE name NOT LIKE 'sqlite_%'
    LIMIT 1
  `).get());

  if (!hasSchemaObjects) {
    initializeSchemaAsCurrent(database, fs.readFileSync(schemaPath, 'utf8'));
    const migrationStatus = getMigrationStatus(database);
    assertMigrationSchemaCompatible(database, migrationStatus.applied.at(-1).version);
    console.log(`Base SQLite initialisée : ${databasePath}`);
  } else {
    // Les bases main créées avant le mécanisme de migrations reçoivent
    // uniquement la baseline, qui ne transforme aucune donnée.
    const migrationStatus = getMigrationStatus(database);

    if (migrationStatus.applied.length === 0) {
      assertMainBaselineCompatible(database);
      applyMigrations(database, { targetVersion: 1 });
    }

    const currentStatus = getMigrationStatus(database);
    assertMigrationSchemaCompatible(database, currentStatus.applied.at(-1).version);
    assertNoPendingMigrations(database);
    console.log(`Base SQLite existante prête : ${databasePath}`);
  }
} finally {
  database.close();
}
