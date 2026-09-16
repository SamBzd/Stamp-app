const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Database = require('better-sqlite3');
const { initializeSchemaAsCurrent, loadMigrations } = require('./migrations');
const { assertMigrationSchemaCompatible } = require('./schema-compatibility');

const SOURCE_FIELDS = [
  'nom', 'prenom', 'date_naissance', 'adresse', 'code_postal', 'ville',
  'email', 'telephone_raw', 'relais_prefere', 'contacter', 'created_at'
];
const OPTIONAL_TEXT_FIELDS = SOURCE_FIELDS.filter(
  (field) => !['nom', 'prenom', 'date_naissance', 'contacter', 'created_at'].includes(field)
);

function fail(rowNumber, field, message) {
  throw new Error(`Import clientes refusé (ligne ${rowNumber}, ${field}) : ${message}.`);
}

function isBlank(value) {
  return typeof value === 'string' && value.trim() === '';
}

function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isTimestamp(value) {
  const match = typeof value === 'string' && value.match(
    /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?)?(?:Z|([+-])(\d{2}):?(\d{2}))?$/
  );
  if (!match || !isDate(match[1]) || Number.isNaN(Date.parse(value.replace(' ', 'T')))) return false;
  if (!match[2]) return true;
  return Number(match[2]) <= 23 && Number(match[3]) <= 59 && Number(match[4]) <= 59 &&
    (!match[5] || (Number(match[6]) <= 23 && Number(match[7]) <= 59));
}

function assertSourceColumns(source) {
  const columns = new Map(source.prepare('PRAGMA table_info(clients)').all().map((column) => [column.name, column]));
  for (const field of SOURCE_FIELDS) {
    if (!columns.has(field)) {
      throw new Error(`Import clientes refusé : la colonne source clients.${field} est absente.`);
    }
  }
}

function validateRows(source) {
  assertSourceColumns(source);
  const rows = source.prepare(`
    SELECT ${SOURCE_FIELDS.map((field) => `"${field}"`).join(', ')},
      lower(trim(email)) AS email_norm
    FROM clients
    ORDER BY id
  `).all();
  const seenEmails = new Set();

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    for (const field of ['nom', 'prenom']) {
      if (typeof row[field] !== 'string' || isBlank(row[field])) {
        fail(rowNumber, field, 'un texte non vide est obligatoire');
      }
    }
    if (row.date_naissance !== null && !isDate(row.date_naissance)) {
      fail(rowNumber, 'date_naissance', 'une date ISO YYYY-MM-DD ou NULL est attendue');
    }
    if (typeof row.created_at !== 'string' || isBlank(row.created_at) || !isTimestamp(row.created_at)) {
      fail(rowNumber, 'created_at', 'un horodatage ISO non vide est attendu');
    }
    if (!Number.isInteger(row.contacter) || ![0, 1].includes(row.contacter)) {
      fail(rowNumber, 'contacter', 'la valeur entière 0 ou 1 est attendue');
    }
    for (const field of OPTIONAL_TEXT_FIELDS) {
      if (row[field] !== null && (typeof row[field] !== 'string' || isBlank(row[field]))) {
        fail(rowNumber, field, 'un texte non vide ou NULL est attendu');
      }
    }
    if (row.email_norm !== null) {
      if (seenEmails.has(row.email_norm)) {
        fail(rowNumber, 'email', 'doublon après normalisation SQLite lower(trim(email))');
      }
      seenEmails.add(row.email_norm);
    }
  });

  return rows;
}

function resolvePaths({ sourcePath, targetPath } = {}) {
  if (!sourcePath || !targetPath) {
    throw new Error('Les options sourcePath et targetPath sont obligatoires.');
  }
  const resolvedSource = path.resolve(sourcePath);
  const resolvedTarget = path.resolve(targetPath);
  if (resolvedSource === resolvedTarget) {
    throw new Error('La source et la cible doivent être deux fichiers distincts.');
  }
  if (fs.existsSync(resolvedTarget)) {
    throw new Error('La cible existe déjà et ne sera pas écrasée.');
  }
  return { resolvedSource, resolvedTarget };
}

function inspectSource(options = {}) {
  const { resolvedSource } = resolvePaths(options);
  if (!fs.existsSync(resolvedSource)) {
    throw new Error('Le fichier source SQLite est introuvable.');
  }
  const source = new Database(resolvedSource, { readonly: true, fileMustExist: true });
  try {
    source.pragma('query_only = ON');
    return { clientCount: validateRows(source).length };
  } finally {
    source.close();
  }
}

function createTemporaryTargetPath(targetPath) {
  return path.join(
    path.dirname(targetPath),
    `.${path.basename(targetPath)}.import-${process.pid}-${crypto.randomUUID()}.db`
  );
}

function importClients({ sourcePath, targetPath, schemaPath, migrationsDirectory } = {}) {
  const { resolvedSource, resolvedTarget } = resolvePaths({ sourcePath, targetPath });

  const source = new Database(resolvedSource, { readonly: true, fileMustExist: true });
  let temporaryTarget;
  try {
    source.pragma('query_only = ON');
    const rows = validateRows(source);
    const effectiveSchemaPath = schemaPath ?? path.resolve(__dirname, '../../../db/schema.sql');
    const schema = fs.readFileSync(effectiveSchemaPath, 'utf8');
    temporaryTarget = createTemporaryTargetPath(resolvedTarget);
    const target = new Database(temporaryTarget);
    try {
      const migrationOptions = migrationsDirectory ? { migrationsDirectory } : {};
      initializeSchemaAsCurrent(target, schema, migrationOptions);
      const migrations = loadMigrations(migrationsDirectory);
      assertMigrationSchemaCompatible(target, migrations.at(-1).version, migrationOptions);
      const insert = target.prepare(`
        INSERT INTO clients (
          nom, prenom, date_naissance, adresse, code_postal, ville, email,
          telephone_raw, relais_prefere, contacter, derniere_commande,
          points_fidelite, archive, created_at
        ) VALUES (
          @nom, @prenom, @date_naissance, @adresse, @code_postal, @ville, @email,
          @telephone_raw, @relais_prefere, @contacter, NULL, 0, 0, @created_at
        )
      `);
      target.transaction(() => rows.forEach((row) => insert.run(row)))();
      assertMigrationSchemaCompatible(target, migrations.at(-1).version, migrationOptions);
    } finally {
      target.close();
    }
    try {
      fs.linkSync(temporaryTarget, resolvedTarget);
    } catch (error) {
      if (error.code === 'EEXIST') {
        throw new Error('La cible existe déjà et ne sera pas écrasée.');
      }
      throw error;
    }
    fs.unlinkSync(temporaryTarget);
    temporaryTarget = undefined;
    return { clientCount: rows.length };
  } finally {
    source.close();
    if (temporaryTarget && fs.existsSync(temporaryTarget)) fs.unlinkSync(temporaryTarget);
  }
}

module.exports = { importClients, inspectSource };
