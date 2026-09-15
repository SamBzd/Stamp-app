const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { applyMigrations } = require('./migrations');

const MAIN_BASELINE_PATH = path.resolve(
  __dirname,
  '../../../db/migrations/0001_main_baseline.sql'
);

function getApplicationTables(database) {
  return new Set(
    database.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
        AND name != 'schema_migrations'
    `).all().map(({ name }) => name)
  );
}

function getSchemaObjects(database) {
  return database.prepare(`
    SELECT type, name, tbl_name, sql
    FROM sqlite_master
    WHERE sql IS NOT NULL
      AND name NOT LIKE 'sqlite_%'
      AND name != 'schema_migrations'
      AND tbl_name != 'schema_migrations'
    ORDER BY type, name
  `).all();
}

function describeSchemaDifferences(expectedObjects, actualObjects) {
  const objectKey = ({ type, name }) => `${type}:${name}`;
  const expectedByKey = new Map(expectedObjects.map((object) => [objectKey(object), object]));
  const actualByKey = new Map(actualObjects.map((object) => [objectKey(object), object]));
  const missing = [...expectedByKey.keys()].filter((key) => !actualByKey.has(key));
  const unexpected = [...actualByKey.keys()].filter((key) => !expectedByKey.has(key));
  const changed = [...expectedByKey.keys()].filter((key) => {
    const actualObject = actualByKey.get(key);
    return actualObject && JSON.stringify(expectedByKey.get(key)) !== JSON.stringify(actualObject);
  });

  return { changed, missing, unexpected };
}

function assertSchemaObjectsMatch(database, expectedDatabase, expectedDescription) {
  const differences = describeSchemaDifferences(
    getSchemaObjects(expectedDatabase),
    getSchemaObjects(database)
  );

  if (differences.missing.length || differences.unexpected.length || differences.changed.length) {
    const details = [
      differences.missing.length && `absents : ${differences.missing.join(', ')}`,
      differences.unexpected.length && `inattendus : ${differences.unexpected.join(', ')}`,
      differences.changed.length && `différents : ${differences.changed.join(', ')}`
    ].filter(Boolean).join(' ; ');

    throw new Error(
      `La base SQLite ne correspond pas exactement ${expectedDescription} (${details}). ` +
      'Une migration de conversion ou une restauration explicite est requise.'
    );
  }
}

function assertMainBaselineCompatible(database, options = {}) {
  const baselinePath = options.baselinePath ?? MAIN_BASELINE_PATH;
  const expectedDatabase = new Database(':memory:');

  try {
    expectedDatabase.exec(fs.readFileSync(baselinePath, 'utf8'));
    assertSchemaObjectsMatch(database, expectedDatabase, 'à la baseline de main');
  } finally {
    expectedDatabase.close();
  }
}

function assertMigrationSchemaCompatible(database, version, options = {}) {
  const expectedDatabase = new Database(':memory:');

  try {
    const appliedMigrations = applyMigrations(expectedDatabase, {
      migrationsDirectory: options.migrationsDirectory,
      targetVersion: version
    });

    if (appliedMigrations.at(-1)?.version !== version) {
      throw new Error(`Version de schéma inconnue : ${version}.`);
    }

    assertSchemaObjectsMatch(
      database,
      expectedDatabase,
      `au schéma déclaré en version ${version}`
    );
  } finally {
    expectedDatabase.close();
  }
}

module.exports = {
  assertMainBaselineCompatible,
  assertMigrationSchemaCompatible,
  getApplicationTables,
  getSchemaObjects,
  MAIN_BASELINE_PATH
};
