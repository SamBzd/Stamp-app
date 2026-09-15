#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { getDatabasePath } = require('../src/config');
const {
  DEFAULT_MIGRATIONS_DIRECTORY,
  applyMigrations,
  getMigrationStatus
} = require('../src/db/migrations');
const {
  assertMainBaselineCompatible,
  assertMigrationSchemaCompatible
} = require('../src/db/schema-compatibility');

function parseArguments(args) {
  let mode = 'migrate';
  let migrationsDirectory = DEFAULT_MIGRATIONS_DIRECTORY;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--status') {
      mode = 'status';
    } else if (argument === '--migrations-dir') {
      const directory = args[index + 1];

      if (!directory) {
        throw new Error('Le chemin suivant --migrations-dir est obligatoire.');
      }

      migrationsDirectory = path.resolve(directory);
      index += 1;
    } else {
      throw new Error(`Argument inconnu : ${argument}`);
    }
  }

  return { migrationsDirectory, mode };
}

let cliOptions;

try {
  cliOptions = parseArguments(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  console.error(
    'Usage : node backend/scripts/migrate-db.js [--status] [--migrations-dir <chemin>]'
  );
  process.exit(1);
}

const migrationOptions = {
  migrationsDirectory: cliOptions.migrationsDirectory
};

const databasePath = getDatabasePath();

if (!fs.existsSync(databasePath)) {
  console.error(`Base SQLite introuvable : ${databasePath}`);
  process.exit(1);
}

const database = new Database(databasePath);

try {
  if (cliOptions.mode === 'status') {
    const status = getMigrationStatus(database, migrationOptions);

    if (status.applied.length > 0) {
      assertMigrationSchemaCompatible(
        database,
        status.applied.at(-1).version,
        migrationOptions
      );
    }

    console.log(`Migrations appliquées : ${status.applied.length}`);
    console.log(`Migrations en attente : ${status.pending.length}`);

    for (const migration of status.pending) {
      console.log(`- ${migration.filename}`);
    }
  } else {
    const initialStatus = getMigrationStatus(database, migrationOptions);

    if (initialStatus.applied.length === 0) {
      const baselineMigration = initialStatus.pending.find(({ version }) => version === 1);
      assertMainBaselineCompatible(database, {
        baselinePath: path.join(
          cliOptions.migrationsDirectory,
          baselineMigration.filename
        )
      });
    } else {
      assertMigrationSchemaCompatible(
        database,
        initialStatus.applied.at(-1).version,
        migrationOptions
      );
    }

    const appliedMigrations = applyMigrations(database, migrationOptions);
    const finalStatus = getMigrationStatus(database, migrationOptions);
    assertMigrationSchemaCompatible(
      database,
      finalStatus.applied.at(-1).version,
      migrationOptions
    );

    if (appliedMigrations.length === 0) {
      console.log(`Base SQLite déjà à jour : ${databasePath}`);
    } else {
      for (const migration of appliedMigrations) {
        console.log(`Migration appliquée : ${migration.filename}`);
      }

      console.log(`Base SQLite mise à jour : ${databasePath}`);
    }
  }
} finally {
  database.close();
}
