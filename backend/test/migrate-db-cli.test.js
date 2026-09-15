const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { afterEach, test } = require('node:test');
const Database = require('better-sqlite3');
const { applyMigrations } = require('../src/db/migrations');

const CLI_PATH = path.resolve(__dirname, '../scripts/migrate-db.js');
const tempDirectories = [];

function createContext(secondMigration = `
  ALTER TABLE exemple ADD COLUMN statut TEXT NOT NULL DEFAULT 'nouveau';
`) {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-cli-test-'));
  const migrationsDirectory = path.join(tempDirectory, 'migrations');
  const databasePath = path.join(tempDirectory, 'app.db');

  tempDirectories.push(tempDirectory);
  fs.mkdirSync(migrationsDirectory);
  fs.writeFileSync(
    path.join(migrationsDirectory, '0001_initial.sql'),
    `
      CREATE TABLE exemple (
        id INTEGER PRIMARY KEY,
        valeur TEXT NOT NULL
      );
      CREATE INDEX ix_exemple_valeur ON exemple(valeur);
    `
  );
  fs.writeFileSync(
    path.join(migrationsDirectory, '0002_add_status.sql'),
    secondMigration
  );

  return { databasePath, migrationsDirectory, tempDirectory };
}

function openDatabase(context, options) {
  return new Database(context.databasePath, options);
}

function seedVersionOne(context) {
  const database = openDatabase(context);

  try {
    applyMigrations(database, {
      migrationsDirectory: context.migrationsDirectory,
      targetVersion: 1
    });
    database.prepare('INSERT INTO exemple (id, valeur) VALUES (?, ?)').run(1, 'test');
  } finally {
    database.close();
  }
}

function runCli(context, additionalArguments = []) {
  return spawnSync(
    process.execPath,
    [
      CLI_PATH,
      ...additionalArguments,
      '--migrations-dir',
      context.migrationsDirectory
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_TEST_CONTEXT: undefined,
        STAMP_DB_PATH: context.databasePath
      }
    }
  );
}

function getAppliedVersions(database) {
  return database.prepare(`
    SELECT version
    FROM schema_migrations
    ORDER BY version
  `).all().map(({ version }) => version);
}

function getColumnNames(database) {
  return database.prepare('PRAGMA table_info(exemple)').all().map(({ name }) => name);
}

afterEach(() => {
  for (const tempDirectory of tempDirectories.splice(0)) {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
});

test('CLI applique normalement une migration v1 vers v2', () => {
  const context = createContext();
  seedVersionOne(context);

  const result = runCli(context);
  const database = openDatabase(context, { readonly: true });

  try {
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(getAppliedVersions(database), [1, 2]);
    assert.deepEqual(getColumnNames(database), ['id', 'valeur', 'statut']);
    assert.equal(
      database.prepare('SELECT statut FROM exemple WHERE id = 1').get().statut,
      'nouveau'
    );
  } finally {
    database.close();
  }
});

test('CLI refuse une v2 avant écriture si la v1 est dégradée', () => {
  const context = createContext();
  seedVersionOne(context);

  const degradedDatabase = openDatabase(context);
  degradedDatabase.exec('DROP INDEX ix_exemple_valeur;');
  degradedDatabase.close();

  const result = runCli(context);
  const database = openDatabase(context, { readonly: true });

  try {
    assert.notEqual(result.status, 0);
    assert.deepEqual(getAppliedVersions(database), [1]);
    assert.deepEqual(getColumnNames(database), ['id', 'valeur']);
  } finally {
    database.close();
  }
});

test('CLI peut être relancé après succès sans rejouer v2', () => {
  const context = createContext();
  seedVersionOne(context);

  const firstRun = runCli(context);
  const secondRun = runCli(context);
  const database = openDatabase(context, { readonly: true });

  try {
    assert.equal(firstRun.status, 0, firstRun.stderr);
    assert.equal(secondRun.status, 0, secondRun.stderr);
    assert.deepEqual(getAppliedVersions(database), [1, 2]);
    assert.deepEqual(getColumnNames(database), ['id', 'valeur', 'statut']);
  } finally {
    database.close();
  }
});

test('CLI annule entièrement une v2 SQL qui échoue', () => {
  const context = createContext(`
    ALTER TABLE exemple ADD COLUMN statut TEXT;
    INSERT INTO table_absente (id) VALUES (1);
  `);
  seedVersionOne(context);

  const result = runCli(context);
  const database = openDatabase(context, { readonly: true });

  try {
    assert.notEqual(result.status, 0);
    assert.deepEqual(getAppliedVersions(database), [1]);
    assert.deepEqual(getColumnNames(database), ['id', 'valeur']);
  } finally {
    database.close();
  }
});

test('CLI refuse une base sans historique incompatible avec la baseline', () => {
  const context = createContext();
  const incompatibleDatabase = openDatabase(context);
  incompatibleDatabase.exec(`
    CREATE TABLE exemple (
      id INTEGER PRIMARY KEY,
      autre_colonne TEXT
    );
  `);
  incompatibleDatabase.close();

  const result = runCli(context);
  const database = openDatabase(context, { readonly: true });

  try {
    const migrationTableExists = database.prepare(`
      SELECT 1
      FROM sqlite_master
      WHERE type = 'table' AND name = 'schema_migrations'
    `).get();

    assert.notEqual(result.status, 0);
    assert.equal(migrationTableExists, undefined);
    assert.deepEqual(getColumnNames(database), ['id', 'autre_colonne']);
  } finally {
    database.close();
  }
});

test('CLI refuse une migration déjà appliquée puis modifiée', () => {
  const context = createContext();
  seedVersionOne(context);

  const firstRun = runCli(context);
  assert.equal(firstRun.status, 0, firstRun.stderr);

  fs.appendFileSync(
    path.join(context.migrationsDirectory, '0002_add_status.sql'),
    '\n-- modification interdite\n'
  );

  const secondRun = runCli(context, ['--status']);
  const database = openDatabase(context, { readonly: true });

  try {
    assert.notEqual(secondRun.status, 0);
    assert.deepEqual(getAppliedVersions(database), [1, 2]);
  } finally {
    database.close();
  }
});
