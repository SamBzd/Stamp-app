const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { afterEach, test } = require('node:test');
const Database = require('better-sqlite3');
const {
  applyMigrations,
  assertNoPendingMigrations,
  getMigrationStatus,
  initializeSchemaAsCurrent,
  markSchemaAsCurrent
} = require('../src/db/migrations');
const {
  assertMainBaselineCompatible,
  assertMigrationSchemaCompatible
} = require('../src/db/schema-compatibility');

const tempDirectories = [];

function createTestContext(migrations) {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-migrations-test-'));
  const migrationsDirectory = path.join(tempDirectory, 'migrations');
  const databasePath = path.join(tempDirectory, 'app.db');

  tempDirectories.push(tempDirectory);
  fs.mkdirSync(migrationsDirectory);

  migrations.forEach((sql, index) => {
    const version = String(index + 1).padStart(4, '0');
    fs.writeFileSync(
      path.join(migrationsDirectory, `${version}_migration_${version}.sql`),
      sql
    );
  });

  return {
    database: new Database(databasePath),
    migrationsDirectory
  };
}

afterEach(() => {
  for (const tempDirectory of tempDirectories.splice(0)) {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
});

test('applique chaque migration une seule fois et dans l’ordre', () => {
  const context = createTestContext([
    'CREATE TABLE exemple (id INTEGER PRIMARY KEY, valeur TEXT NOT NULL);',
    "INSERT INTO exemple (valeur) VALUES ('test');"
  ]);

  try {
    const firstRun = applyMigrations(context.database, context);
    const secondRun = applyMigrations(context.database, context);
    const status = getMigrationStatus(context.database, context);

    assert.deepEqual(firstRun.map(({ version }) => version), [1, 2]);
    assert.equal(secondRun.length, 0);
    assert.equal(status.applied.length, 2);
    assert.equal(status.pending.length, 0);
    assert.equal(
      context.database.prepare('SELECT valeur FROM exemple').get().valeur,
      'test'
    );
  } finally {
    context.database.close();
  }
});

test('annule entièrement une migration SQL qui échoue', () => {
  const context = createTestContext([
    `
      CREATE TABLE exemple (id INTEGER PRIMARY KEY);
      INSERT INTO table_absente (id) VALUES (1);
    `
  ]);

  try {
    assert.throws(() => applyMigrations(context.database, context));
    assert.equal(
      context.database.prepare(
        "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'exemple'"
      ).get().count,
      0
    );
    assert.equal(getMigrationStatus(context.database, context).applied.length, 0);
  } finally {
    context.database.close();
  }
});

test('refuse la modification d’une migration déjà appliquée', () => {
  const context = createTestContext([
    'CREATE TABLE exemple (id INTEGER PRIMARY KEY);'
  ]);

  try {
    applyMigrations(context.database, context);
    fs.appendFileSync(
      path.join(context.migrationsDirectory, '0001_migration_0001.sql'),
      '\n-- modification interdite\n'
    );

    assert.throws(
      () => getMigrationStatus(context.database, context),
      /a été modifiée/
    );
  } finally {
    context.database.close();
  }
});

test('marque un schéma neuf comme courant sans rejouer son SQL', () => {
  const context = createTestContext([
    'ALTER TABLE exemple ADD COLUMN autre TEXT;'
  ]);

  try {
    context.database.exec('CREATE TABLE exemple (id INTEGER PRIMARY KEY, autre TEXT);');

    const markedMigrations = markSchemaAsCurrent(context.database, context);
    const status = getMigrationStatus(context.database, context);

    assert.deepEqual(markedMigrations.map(({ version }) => version), [1]);
    assert.equal(status.pending.length, 0);
  } finally {
    context.database.close();
  }
});

test('refuse de poser la baseline main sur une base incompatible', () => {
  const context = createTestContext([
    '-- baseline sans transformation'
  ]);

  try {
    context.database.exec('CREATE TABLE clients (id INTEGER PRIMARY KEY);');

    assert.throws(
      () => assertMainBaselineCompatible(context.database),
      /ne correspond pas exactement à la baseline de main/
    );
  } finally {
    context.database.close();
  }
});

test('refuse une base qui a les bonnes tables mais une structure différente', () => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-baseline-test-'));
  const database = new Database(path.join(tempDirectory, 'app.db'));

  tempDirectories.push(tempDirectory);

  try {
    const schemaPath = path.resolve(__dirname, '../../db/schema.sql');
    database.exec(fs.readFileSync(schemaPath, 'utf8'));
    database.exec('ALTER TABLE clients ADD COLUMN colonne_inattendue TEXT;');

    assert.throws(
      () => assertMainBaselineCompatible(database),
      /table:clients/
    );
  } finally {
    database.close();
  }
});

test('reconnaît exactement le schéma baseline réel de main', () => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-baseline-test-'));
  const database = new Database(path.join(tempDirectory, 'app.db'));

  tempDirectories.push(tempDirectory);

  try {
    const schemaPath = path.resolve(__dirname, '../../db/schema.sql');
    database.exec(fs.readFileSync(schemaPath, 'utf8'));

    assert.doesNotThrow(() => assertMainBaselineCompatible(database));
  } finally {
    database.close();
  }
});

test('reconnaît un schéma créé directement après une migration ALTER TABLE', () => {
  const context = createTestContext([
    `
      CREATE TABLE exemple (
        id INTEGER PRIMARY KEY,
        valeur TEXT NOT NULL
      );
    `,
    "ALTER TABLE exemple ADD COLUMN statut TEXT NOT NULL DEFAULT 'nouveau';"
  ]);

  try {
    context.database.exec(`
      CREATE TABLE exemple (
        id INTEGER PRIMARY KEY,
        valeur TEXT NOT NULL,
        statut TEXT NOT NULL DEFAULT 'nouveau'
      );
    `);

    const directSql = context.database.prepare(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'exemple'"
    ).get().sql;
    const migratedDatabase = new Database(':memory:');

    try {
      applyMigrations(migratedDatabase, context);
      const migratedSql = migratedDatabase.prepare(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'exemple'"
      ).get().sql;

      assert.notEqual(directSql, migratedSql);
    } finally {
      migratedDatabase.close();
    }

    assert.doesNotThrow(() => assertMigrationSchemaCompatible(
      context.database,
      2,
      context
    ));
  } finally {
    context.database.close();
  }
});

test('refuse une modification de contrainte ou d’expression générée', () => {
  const context = createTestContext([
    `
      CREATE TABLE exemple (
        valeur TEXT CHECK (length(valeur) > 0),
        valeur_norm TEXT GENERATED ALWAYS AS (lower(valeur)) STORED
      );
    `
  ]);

  try {
    context.database.exec(`
      CREATE TABLE exemple (
        valeur TEXT CHECK (length(valeur) > 1),
        valeur_norm TEXT GENERATED ALWAYS AS (upper(valeur)) STORED
      );
    `);

    assert.throws(
      () => assertMigrationSchemaCompatible(context.database, 1, context),
      /table:exemple/
    );
  } finally {
    context.database.close();
  }
});

test('refuse une modification du mode différé d’une clé étrangère', () => {
  const context = createTestContext([
    `
      CREATE TABLE parent (id INTEGER PRIMARY KEY);
      CREATE TABLE enfant (
        id INTEGER PRIMARY KEY,
        parent_id INTEGER REFERENCES parent(id) DEFERRABLE INITIALLY DEFERRED
      );
    `
  ]);

  try {
    context.database.exec(`
      CREATE TABLE parent (id INTEGER PRIMARY KEY);
      CREATE TABLE enfant (
        id INTEGER PRIMARY KEY,
        parent_id INTEGER REFERENCES parent(id) NOT DEFERRABLE
      );
    `);

    assert.throws(
      () => assertMigrationSchemaCompatible(context.database, 1, context),
      /table:enfant/
    );
  } finally {
    context.database.close();
  }
});

test('refuse une modification de politique ON CONFLICT', () => {
  const context = createTestContext([
    'CREATE TABLE exemple (valeur TEXT UNIQUE ON CONFLICT IGNORE);'
  ]);

  try {
    context.database.exec(
      'CREATE TABLE exemple (valeur TEXT UNIQUE ON CONFLICT ABORT);'
    );

    assert.throws(
      () => assertMigrationSchemaCompatible(context.database, 1, context),
      /table:exemple/
    );
  } finally {
    context.database.close();
  }
});

test('consulte les migrations sans créer de table dans la base', () => {
  const context = createTestContext([
    'CREATE TABLE exemple (id INTEGER PRIMARY KEY);'
  ]);

  try {
    const status = getMigrationStatus(context.database, context);
    const migrationTableExists = context.database.prepare(`
      SELECT 1
      FROM sqlite_master
      WHERE type = 'table' AND name = 'schema_migrations'
    `).get();

    assert.equal(status.applied.length, 0);
    assert.equal(status.pending.length, 1);
    assert.equal(migrationTableExists, undefined);
  } finally {
    context.database.close();
  }
});

test('initialise le schéma et son historique dans une seule transaction', () => {
  const context = createTestContext([
    'CREATE TABLE exemple (id INTEGER PRIMARY KEY);'
  ]);

  try {
    assert.throws(() => initializeSchemaAsCurrent(
      context.database,
      `
        CREATE TABLE exemple (id INTEGER PRIMARY KEY);
        INSERT INTO table_absente (id) VALUES (1);
      `,
      context
    ));

    const tables = context.database.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    `).all();

    assert.deepEqual(tables, []);
  } finally {
    context.database.close();
  }
});

test('bloque le démarrage tant qu’une migration reste en attente', () => {
  const context = createTestContext([
    'CREATE TABLE exemple (id INTEGER PRIMARY KEY);',
    'ALTER TABLE exemple ADD COLUMN valeur TEXT;'
  ]);

  try {
    applyMigrations(context.database, { ...context, targetVersion: 1 });

    assert.throws(
      () => assertNoPendingMigrations(context.database, context),
      /0002_migration_0002.sql/
    );

    applyMigrations(context.database, context);
    assert.doesNotThrow(
      () => assertNoPendingMigrations(context.database, context)
    );
  } finally {
    context.database.close();
  }
});

test('refuse une future migration si le schéma de départ est dégradé', () => {
  const context = createTestContext([
    'CREATE TABLE exemple (id INTEGER PRIMARY KEY);',
    'ALTER TABLE exemple ADD COLUMN valeur TEXT;'
  ]);

  try {
    applyMigrations(context.database, { ...context, targetVersion: 1 });
    context.database.exec('DROP TABLE exemple;');

    assert.throws(
      () => assertMigrationSchemaCompatible(
        context.database,
        1,
        context
      ),
      /schéma déclaré en version 1/
    );

    assert.equal(getMigrationStatus(context.database, context).applied.length, 1);
  } finally {
    context.database.close();
  }
});

test('la commande de statut reste en lecture seule', () => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-status-test-'));
  const databasePath = path.join(tempDirectory, 'app.db');
  const database = new Database(databasePath);

  tempDirectories.push(tempDirectory);
  database.close();

  const result = spawnSync(
    process.execPath,
    [path.resolve(__dirname, '../scripts/migrate-db.js'), '--status'],
    {
      encoding: 'utf8',
      env: { ...process.env, NODE_TEST_CONTEXT: undefined, STAMP_DB_PATH: databasePath }
    }
  );
  const verificationDatabase = new Database(databasePath, { readonly: true });

  try {
    const migrationTableExists = verificationDatabase.prepare(`
      SELECT 1
      FROM sqlite_master
      WHERE type = 'table' AND name = 'schema_migrations'
    `).get();

    assert.equal(result.status, 0, result.stderr);
    assert.equal(migrationTableExists, undefined);
  } finally {
    verificationDatabase.close();
  }
});

test('le script de démarrage initialise une base neuve avec son historique', () => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-runtime-test-'));
  const databasePath = path.join(tempDirectory, 'app.db');

  tempDirectories.push(tempDirectory);

  const result = spawnSync(
    process.execPath,
    [path.resolve(__dirname, '../scripts/ensure-runtime-db.js')],
    {
      encoding: 'utf8',
      env: { ...process.env, NODE_TEST_CONTEXT: undefined, STAMP_DB_PATH: databasePath }
    }
  );
  const database = new Database(databasePath, { readonly: true });

  try {
    const appliedMigrations = database.prepare(`
      SELECT version, name
      FROM schema_migrations
      ORDER BY version
    `).all();

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(appliedMigrations, [{ version: 1, name: 'main_baseline' }]);
  } finally {
    database.close();
  }
});

test('le démarrage refuse une base versionnée dont le schéma a été dégradé', () => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-runtime-test-'));
  const databasePath = path.join(tempDirectory, 'app.db');
  const scriptPath = path.resolve(__dirname, '../scripts/ensure-runtime-db.js');
  const spawnOptions = {
    encoding: 'utf8',
    env: { ...process.env, NODE_TEST_CONTEXT: undefined, STAMP_DB_PATH: databasePath }
  };

  tempDirectories.push(tempDirectory);

  const initialization = spawnSync(process.execPath, [scriptPath], spawnOptions);
  assert.equal(initialization.status, 0, initialization.stderr);

  const database = new Database(databasePath);
  database.exec('DROP TABLE settings;');
  database.close();

  const restart = spawnSync(process.execPath, [scriptPath], spawnOptions);

  assert.notEqual(restart.status, 0);
  assert.match(
    restart.stderr,
    /ne correspond pas exactement au schéma déclaré en version 1/
  );
});

test('le démarrage refuse une base qui ne contient plus que son historique de migrations', () => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-runtime-test-'));
  const databasePath = path.join(tempDirectory, 'app.db');
  const scriptPath = path.resolve(__dirname, '../scripts/ensure-runtime-db.js');
  const spawnOptions = {
    encoding: 'utf8',
    env: { ...process.env, NODE_TEST_CONTEXT: undefined, STAMP_DB_PATH: databasePath }
  };

  tempDirectories.push(tempDirectory);

  const initialization = spawnSync(process.execPath, [scriptPath], spawnOptions);
  assert.equal(initialization.status, 0, initialization.stderr);

  const database = new Database(databasePath);
  database.exec(`
    DROP TABLE settings;
    DROP TABLE commande_papiers_selectionnes;
    DROP TABLE commande_collections;
    DROP TABLE commandes;
    DROP TABLE collection_papiers;
    DROP TABLE papiers_cartonnes;
    DROP TABLE collections;
    DROP TABLE catalogues;
    DROP TABLE clients;
  `);
  database.close();

  const restart = spawnSync(process.execPath, [scriptPath], spawnOptions);

  assert.notEqual(restart.status, 0);
  assert.match(
    restart.stderr,
    /ne correspond pas exactement au schéma déclaré en version 1/
  );
});
