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

function tokenizeSql(sql) {
  const tokens = [];

  for (let index = 0; index < sql.length;) {
    const character = sql[index];

    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    if (character === '-' && sql[index + 1] === '-') {
      index = sql.indexOf('\n', index + 2);
      if (index === -1) break;
      continue;
    }

    if (character === '/' && sql[index + 1] === '*') {
      const commentEnd = sql.indexOf('*/', index + 2);
      index = commentEnd === -1 ? sql.length : commentEnd + 2;
      continue;
    }

    if (character === "'") {
      let token = character;
      index += 1;

      while (index < sql.length) {
        token += sql[index];

        if (sql[index] === "'") {
          if (sql[index + 1] === "'") {
            token += sql[index + 1];
            index += 2;
            continue;
          }

          index += 1;
          break;
        }

        index += 1;
      }

      tokens.push(token);
      continue;
    }

    if (/[A-Za-z0-9_$]/.test(character)) {
      let token = character;
      index += 1;

      while (index < sql.length && /[A-Za-z0-9_$]/.test(sql[index])) {
        token += sql[index];
        index += 1;
      }

      tokens.push(token.toLowerCase());
      continue;
    }

    const doubleOperator = sql.slice(index, index + 2);
    if (['!=', '||', '<=', '<>', '==', '>=', '->'].includes(doubleOperator)) {
      tokens.push(doubleOperator);
      index += 2;
      continue;
    }

    tokens.push(character);
    index += 1;
  }

  return tokens;
}

function normalizeSql(sql) {
  return tokenizeSql(sql).join(' ');
}

function collectParenthesizedClauses(tokens, keyword) {
  const clauses = [];

  for (let index = 0; index < tokens.length - 1; index += 1) {
    if (tokens[index] !== keyword || tokens[index + 1] !== '(') {
      continue;
    }

    let depth = 0;
    let end = index + 1;

    for (; end < tokens.length; end += 1) {
      if (tokens[end] === '(') depth += 1;
      if (tokens[end] === ')') depth -= 1;
      if (depth === 0) break;
    }

    clauses.push(tokens.slice(index, end + 1).join(' '));
    index = end;
  }

  return clauses;
}

function getTableSemanticFeatures(sql) {
  const tokens = tokenizeSql(sql);
  const conflictPolicies = [];
  const generated = [];
  const collations = [];
  const foreignKeyTiming = [];

  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index] === 'collate' && tokens[index + 1]) {
      collations.push(tokens[index + 1]);
    }

    if (tokens[index] === 'on' && tokens[index + 1] === 'conflict' && tokens[index + 2]) {
      conflictPolicies.push(tokens.slice(index, index + 3).join(' '));
    }

    if (tokens[index] === 'deferrable') {
      const start = tokens[index - 1] === 'not' ? index - 1 : index;
      const hasInitialMode = tokens[index + 1] === 'initially' && tokens[index + 2];
      const end = hasInitialMode ? index + 3 : index + 1;
      foreignKeyTiming.push(tokens.slice(start, end).join(' '));
    }

    if (tokens[index] !== 'generated') {
      continue;
    }

    const asIndex = tokens.indexOf('as', index + 1);
    if (asIndex === -1 || tokens[asIndex + 1] !== '(') {
      continue;
    }

    let depth = 0;
    let end = asIndex + 1;

    for (; end < tokens.length; end += 1) {
      if (tokens[end] === '(') depth += 1;
      if (tokens[end] === ')') depth -= 1;
      if (depth === 0) break;
    }

    if (['stored', 'virtual'].includes(tokens[end + 1])) {
      end += 1;
    }

    generated.push(tokens.slice(index, end + 1).join(' '));
    index = end;
  }

  return {
    autoincrement: tokens.includes('autoincrement'),
    checks: collectParenthesizedClauses(tokens, 'check'),
    collations,
    conflictPolicies,
    foreignKeyTiming,
    generated
  };
}

function getIndexStructure(database, tableName, indexName, options = {}) {
  const index = database.prepare(`
    SELECT name, "unique", origin, partial
    FROM pragma_index_list(?)
    WHERE name = ?
  `).get(tableName, indexName);
  const columns = database.prepare(`
    SELECT seqno, cid, name, "desc", coll
    FROM pragma_index_xinfo(?)
    WHERE key = 1
    ORDER BY seqno
  `).all(indexName);
  const hasExpression = columns.some(({ cid }) => cid === -2);
  const sql = options.sql && (index.partial || hasExpression)
    ? normalizeSql(options.sql)
    : undefined;

  return {
    name: index.origin === 'c' ? index.name : undefined,
    unique: index.unique,
    origin: index.origin,
    partial: index.partial,
    columns,
    sql
  };
}

function getTableStructure(database, table) {
  const columns = database.prepare(`
    SELECT cid, name, type, "notnull", dflt_value, pk, hidden
    FROM pragma_table_xinfo(?)
    ORDER BY cid
  `).all(table.name).map((column) => ({
    ...column,
    type: column.type.trim().replace(/\s+/g, ' ').toUpperCase(),
    dflt_value: column.dflt_value === null
      ? null
      : normalizeSql(column.dflt_value)
  }));
  const foreignKeyRows = database.prepare(`
    SELECT id, seq, "table", "from", "to", on_update, on_delete, match
    FROM pragma_foreign_key_list(?)
    ORDER BY id, seq
  `).all(table.name);
  const foreignKeysById = new Map();

  for (const foreignKey of foreignKeyRows) {
    if (!foreignKeysById.has(foreignKey.id)) {
      foreignKeysById.set(foreignKey.id, {
        table: foreignKey.table,
        on_update: foreignKey.on_update,
        on_delete: foreignKey.on_delete,
        match: foreignKey.match,
        columns: []
      });
    }

    foreignKeysById.get(foreignKey.id).columns.push({
      from: foreignKey.from,
      to: foreignKey.to
    });
  }

  const foreignKeys = [...foreignKeysById.values()]
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  const internalIndexes = database.prepare(`
    SELECT name
    FROM pragma_index_list(?)
    WHERE origin != 'c'
    ORDER BY name
  `).all(table.name).map(({ name }) => getIndexStructure(database, table.name, name));
  const tableOptions = database.prepare(`
    SELECT wr, strict
    FROM pragma_table_list(?)
    WHERE name = ?
  `).get(table.name, table.name);

  return {
    type: table.type,
    name: table.name,
    columns,
    foreignKeys,
    internalIndexes,
    tableOptions,
    // Les PRAGMA ne décrivent pas ces caractéristiques, qui sont donc extraites
    // séparément sans conserver toute la formulation du CREATE TABLE.
    semanticFeatures: getTableSemanticFeatures(table.sql)
  };
}

function getSchemaObjects(database) {
  const objects = database.prepare(`
    SELECT type, name, tbl_name, sql
    FROM sqlite_master
    WHERE sql IS NOT NULL
      AND name NOT LIKE 'sqlite_%'
      AND name != 'schema_migrations'
      AND tbl_name != 'schema_migrations'
    ORDER BY type, name
  `).all();

  return objects.map((object) => {
    if (object.type === 'table') {
      return getTableStructure(database, object);
    }

    if (object.type === 'index') {
      return {
        type: object.type,
        ...getIndexStructure(database, object.tbl_name, object.name, { sql: object.sql })
      };
    }

    return {
      type: object.type,
      name: object.name,
      tbl_name: object.tbl_name,
      sql: normalizeSql(object.sql)
    };
  });
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
