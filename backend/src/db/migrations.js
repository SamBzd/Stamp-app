const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_MIGRATIONS_DIRECTORY = path.resolve(__dirname, '../../../db/migrations');
const MIGRATION_FILENAME = /^(\d{4})_([a-z0-9_]+)\.sql$/;

function ensureMigrationTable(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL UNIQUE,
      checksum   TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

function hasMigrationTable(database) {
  return Boolean(database.prepare(`
    SELECT 1
    FROM sqlite_master
    WHERE type = 'table' AND name = 'schema_migrations'
  `).get());
}

function loadMigrations(migrationsDirectory = DEFAULT_MIGRATIONS_DIRECTORY) {
  const filenames = fs.readdirSync(migrationsDirectory)
    .filter((filename) => filename.endsWith('.sql'))
    .sort();

  const migrations = filenames.map((filename) => {
    const match = MIGRATION_FILENAME.exec(filename);

    if (!match) {
      throw new Error(
        `Nom de migration invalide : ${filename}. Format attendu : 0001_description.sql.`
      );
    }

    const sql = fs.readFileSync(path.join(migrationsDirectory, filename), 'utf8');

    return {
      version: Number(match[1]),
      name: match[2],
      filename,
      sql,
      checksum: crypto.createHash('sha256').update(sql).digest('hex')
    };
  });

  migrations.forEach((migration, index) => {
    const expectedVersion = index + 1;

    if (migration.version !== expectedVersion) {
      throw new Error(
        `Suite de migrations invalide : ${migration.filename} porte la version ` +
        `${migration.version}, version attendue ${expectedVersion}.`
      );
    }
  });

  return migrations;
}

function getAppliedMigrations(database) {
  if (!hasMigrationTable(database)) {
    return [];
  }

  return database.prepare(`
    SELECT version, name, checksum, applied_at
    FROM schema_migrations
    ORDER BY version
  `).all();
}

function validateAppliedMigrations(migrations, appliedMigrations) {
  const migrationsByVersion = new Map(
    migrations.map((migration) => [migration.version, migration])
  );

  for (const [index, appliedMigration] of appliedMigrations.entries()) {
    const expectedVersion = index + 1;

    if (appliedMigration.version !== expectedVersion) {
      throw new Error(
        `Historique de migrations incomplet : version ${expectedVersion} absente de la base.`
      );
    }

    const migration = migrationsByVersion.get(appliedMigration.version);

    if (!migration) {
      throw new Error(
        `La base connaît la migration ${appliedMigration.version}, absente du code courant.`
      );
    }

    if (
      migration.name !== appliedMigration.name ||
      migration.checksum !== appliedMigration.checksum
    ) {
      throw new Error(
        `La migration déjà appliquée ${migration.filename} a été modifiée. ` +
        'Crée une nouvelle migration au lieu de réécrire son historique.'
      );
    }
  }
}

function getMigrationStatus(database, options = {}) {
  const migrations = loadMigrations(options.migrationsDirectory);
  const appliedMigrations = getAppliedMigrations(database);
  validateAppliedMigrations(migrations, appliedMigrations);

  const appliedVersions = new Set(
    appliedMigrations.map((migration) => migration.version)
  );

  return {
    applied: appliedMigrations,
    pending: migrations.filter((migration) => !appliedVersions.has(migration.version))
  };
}

function recordMigration(database, migration) {
  database.prepare(`
    INSERT INTO schema_migrations (version, name, checksum)
    VALUES (@version, @name, @checksum)
  `).run(migration);
}

function applyMigrations(database, options = {}) {
  const targetVersion = options.targetVersion ?? Number.POSITIVE_INFINITY;
  const status = getMigrationStatus(database, options);
  const migrationsToApply = status.pending.filter(
    (migration) => migration.version <= targetVersion
  );

  database.pragma('foreign_keys = ON');
  database.pragma('busy_timeout = 5000');

  for (const migration of migrationsToApply) {
    database.transaction(() => {
      ensureMigrationTable(database);
      database.exec(migration.sql);
      recordMigration(database, migration);
    })();
  }

  return migrationsToApply;
}

function markSchemaAsCurrent(database, options = {}) {
  const status = getMigrationStatus(database, options);

  database.transaction(() => {
    ensureMigrationTable(database);
    for (const migration of status.pending) {
      recordMigration(database, migration);
    }
  })();

  return status.pending;
}

function initializeSchemaAsCurrent(database, schema, options = {}) {
  let markedMigrations = [];

  database.transaction(() => {
    database.exec(schema);
    ensureMigrationTable(database);

    const status = getMigrationStatus(database, options);
    markedMigrations = status.pending;

    for (const migration of markedMigrations) {
      recordMigration(database, migration);
    }
  })();

  return markedMigrations;
}

function assertNoPendingMigrations(database, options = {}) {
  const { pending } = getMigrationStatus(database, options);

  if (pending.length > 0) {
    throw new Error(
      `Migrations SQLite en attente : ${pending.map(({ filename }) => filename).join(', ')}. ` +
      'Exécute explicitement la commande de migration avant de démarrer l’application.'
    );
  }
}

module.exports = {
  DEFAULT_MIGRATIONS_DIRECTORY,
  applyMigrations,
  assertNoPendingMigrations,
  getMigrationStatus,
  initializeSchemaAsCurrent,
  loadMigrations,
  markSchemaAsCurrent
};
