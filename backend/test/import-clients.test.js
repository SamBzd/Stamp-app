const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { afterEach, test } = require('node:test');
const Database = require('better-sqlite3');
const { importClients, inspectSource } = require('../src/db/import-clients');
const { run } = require('../scripts/import-clients');

const temporaryDirectories = [];
const PRODUCTION_CLIENTS_SQL = `
  CREATE TABLE clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT, nom TEXT NOT NULL, prenom TEXT NOT NULL,
    date_naissance TEXT, adresse TEXT, code_postal TEXT, ville TEXT, email TEXT,
    telephone_raw TEXT, relais_prefere TEXT, contacter INTEGER NOT NULL DEFAULT 0,
    derniere_commande TEXT, points_fidelite INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    email_norm TEXT GENERATED ALWAYS AS (CASE WHEN email IS NULL THEN NULL ELSE lower(trim(email)) END) STORED,
    telephone_e164 TEXT GENERATED ALWAYS AS (CASE WHEN telephone_raw IS NULL THEN NULL ELSE '+33' || substr(replace(telephone_raw, ' ', ''), 2) END) STORED
  );
`;
const TEST_TARGET_SQL = `
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT, nom TEXT NOT NULL, prenom TEXT NOT NULL,
    date_naissance TEXT, adresse TEXT, code_postal TEXT, ville TEXT, email TEXT,
    telephone_raw TEXT, relais_prefere TEXT, contacter INTEGER NOT NULL CHECK (contacter IN (0, 1)),
    derniere_commande TEXT, points_fidelite INTEGER NOT NULL DEFAULT 0,
    archive INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
    email_norm TEXT GENERATED ALWAYS AS (CASE WHEN email IS NULL THEN NULL ELSE lower(trim(email)) END) STORED
  );
  CREATE UNIQUE INDEX IF NOT EXISTS ux_clients_email_norm ON clients(email_norm);
`;

function createContext({ customTarget = false } = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-import-clients-test-'));
  const context = { directory, sourcePath: path.join(directory, 'production-copy.db'), targetPath: path.join(directory, 'new.db') };
  temporaryDirectories.push(directory);
  const source = new Database(context.sourcePath);
  source.exec(PRODUCTION_CLIENTS_SQL);
  source.close();
  if (customTarget) {
    context.schemaPath = path.join(directory, 'schema.sql');
    context.migrationsDirectory = path.join(directory, 'migrations');
    fs.mkdirSync(context.migrationsDirectory);
    fs.writeFileSync(context.schemaPath, TEST_TARGET_SQL);
    fs.writeFileSync(path.join(context.migrationsDirectory, '0001_initial.sql'), TEST_TARGET_SQL);
  }
  return context;
}

function addSourceClient(sourcePath, fields = {}) {
  const source = new Database(sourcePath);
  const value = (field, fallback) => Object.hasOwn(fields, field) ? fields[field] : fallback;
  try {
    source.prepare(`INSERT INTO clients (
      nom, prenom, date_naissance, adresse, code_postal, ville, email, telephone_raw,
      relais_prefere, contacter, derniere_commande, points_fidelite, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(value('nom', 'Durand'), value('prenom', 'Alice'), value('date_naissance', '1990-02-03'),
        value('adresse', '1 rue des Lilas'), value('code_postal', '75001'), value('ville', 'Paris'),
        value('email', 'alice@example.test'), value('telephone_raw', '06 12 34 56 78'),
        value('relais_prefere', 'Relais A'), value('contacter', 1),
        value('derniere_commande', '2025-06-07 08:09:10'), value('points_fidelite', 42),
        value('created_at', '2025-01-02 03:04:05'));
  } finally { source.close(); }
}

function importOptions(context) {
  return { sourcePath: context.sourcePath, targetPath: context.targetPath, schemaPath: context.schemaPath, migrationsDirectory: context.migrationsDirectory };
}

afterEach(() => temporaryDirectories.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true })));

test('importe vers le schéma réel par défaut et recalcule les colonnes générées', () => {
  const context = createContext();
  addSourceClient(context.sourcePath);
  addSourceClient(context.sourcePath, { prenom: 'Béatrice', date_naissance: null, adresse: null, code_postal: null, ville: null, email: null, telephone_raw: null, relais_prefere: null, contacter: 0, derniere_commande: null, points_fidelite: 0 });
  const source = new Database(context.sourcePath);
  source.exec(`CREATE TABLE commandes(id INTEGER PRIMARY KEY,client_id INTEGER,montant REAL);
    INSERT INTO commandes VALUES (1,1,80);`);
  source.close();
  assert.deepEqual(importClients(importOptions(context)), { clientCount: 2 });
  const target = new Database(context.targetPath, { readonly: true });
  try {
    assert.deepEqual(target.prepare(`SELECT nom,prenom,date_naissance,adresse,code_postal,
      ville,email,telephone_raw,relais_prefere,contacter,created_at FROM clients WHERE id=1`).get(), {
      nom: 'Durand', prenom: 'Alice', date_naissance: '1990-02-03', adresse: '1 rue des Lilas',
      code_postal: '75001', ville: 'Paris', email: 'alice@example.test',
      telephone_raw: '06 12 34 56 78', relais_prefere: 'Relais A', contacter: 1,
      created_at: '2025-01-02 03:04:05'
    });
    for (const table of ['commandes','catalogues','collections','papiers_cartonnes','catalogue_rubans']) {
      assert.equal(target.prepare(`SELECT count(*) AS n FROM ${table}`).get().n, 0);
    }
    assert.deepEqual(target.prepare('SELECT prenom, email_norm, telephone_e164, derniere_commande, points_fidelite, archive FROM clients ORDER BY id').all(), [
      { prenom: 'Alice', email_norm: 'alice@example.test', telephone_e164: '+33612345678', derniere_commande: null, points_fidelite: 0, archive: 0 },
      { prenom: 'Béatrice', email_norm: null, telephone_e164: null, derniere_commande: null, points_fidelite: 0, archive: 0 }
    ]);
  } finally { target.close(); }
});

test('refuse les valeurs ambiguës et les doublons avant toute écriture', () => {
  for (const fields of [{ nom: '' }, { prenom: '  ' }, { date_naissance: '2025-02-30' }, { created_at: '2025-02-30 10:00:00' }, { created_at: '2025-01-02+99:99' }, { contacter: 2 }, { ville: '' }]) {
    const context = createContext();
    addSourceClient(context.sourcePath, fields);
    assert.throws(() => importClients(importOptions(context)), /Import clientes refusé/);
    assert.equal(fs.existsSync(context.targetPath), false);
  }
  const context = createContext();
  addSourceClient(context.sourcePath, { email: ' Alice@Example.Test ' });
  addSourceClient(context.sourcePath, { prenom: 'Bruno', email: 'alice@example.test' });
  assert.throws(() => importClients(importOptions(context)), /doublon après normalisation SQLite/);
  assert.equal(fs.existsSync(context.targetPath), false);
});

test('annule toute la cible si la seconde insertion échoue', () => {
  const context = createContext({ customTarget: true });
  const constrained = TEST_TARGET_SQL.replace('nom TEXT NOT NULL,', "nom TEXT NOT NULL CHECK (nom != 'Interdit'),");
  fs.writeFileSync(context.schemaPath, constrained);
  fs.writeFileSync(path.join(context.migrationsDirectory, '0001_initial.sql'), constrained);
  addSourceClient(context.sourcePath, { nom: 'Valide' });
  addSourceClient(context.sourcePath, { nom: 'Interdit', prenom: 'Bruno', email: 'bruno@example.test' });
  assert.throws(() => importClients(importOptions(context)), /CHECK constraint failed/);
  assert.equal(fs.existsSync(context.targetPath), false);
});

test('le précontrôle CLI exige une cible neuve distincte sans la créer', () => {
  const context = createContext();
  addSourceClient(context.sourcePath);
  const messages = [];
  const output = { log: (message) => messages.push(message), error: (message) => messages.push(message) };
  assert.equal(run(['--source', context.sourcePath, '--target', context.targetPath, '--check'], output), 0);
  assert.match(messages[0], /Précontrôle réussi : 1 cliente\(s\)\./);
  assert.equal(fs.existsSync(context.targetPath), false);
  fs.writeFileSync(context.targetPath, 'cible existante');
  assert.throws(() => inspectSource({ sourcePath: context.sourcePath, targetPath: context.targetPath }), /cible existe déjà/);
  assert.throws(() => inspectSource({ sourcePath: context.sourcePath, targetPath: context.sourcePath }), /distincts/);
  assert.equal(run(['--source', context.sourcePath, '--target', context.targetPath, '--check'], output), 1);
  assert.match(messages.at(-2), /cible existe déjà/);
});

test('ne modifie pas la source et refuse une relance', () => {
  const context = createContext();
  addSourceClient(context.sourcePath);
  const before = fs.readFileSync(context.sourcePath);
  importClients(importOptions(context));
  assert.deepEqual(fs.readFileSync(context.sourcePath), before);
  assert.throws(() => importClients(importOptions(context)), /cible existe déjà/);
});
