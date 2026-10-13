const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
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

test('conversion explicite des anniversaires vides uniquement, précontrôle et import CLI cohérents', () => {
  const context = createContext();
  for (const [index, date] of ['', '  \t ', null, '1990-02-03'].entries()) {
    addSourceClient(context.sourcePath, { email: `naissance${index}@example.test`, date_naissance: date });
  }
  const before = fs.readFileSync(context.sourcePath);
  const messages = [];
  const output = { log: message => messages.push(message), error: message => messages.push(message) };
  const args = ['--source', context.sourcePath, '--target', context.targetPath];
  assert.equal(run([...args, '--check'], output), 1);
  assert.equal(fs.existsSync(context.targetPath), false);
  assert.equal(run([...args, '--empty-birthdates-as-null', '--check'], output), 0);
  assert.match(messages.at(-1), /Dates de naissance vides converties en NULL : 2/);
  assert.equal(fs.existsSync(context.targetPath), false);
  assert.equal(run([...args, '--empty-birthdates-as-null'], output), 0);
  assert.match(messages.at(-1), /Dates de naissance vides converties en NULL : 2/);
  const target = new Database(context.targetPath, { readonly: true });
  try {
    assert.deepEqual(target.prepare('SELECT date_naissance FROM clients ORDER BY id').all(), [
      { date_naissance: null }, { date_naissance: null }, { date_naissance: null }, { date_naissance: '1990-02-03' }
    ]);
  } finally { target.close(); }
  assert.deepEqual(fs.readFileSync(context.sourcePath), before);
});

test('conversion des dates vides ne masque ni anniversaire renseigné invalide ni autre champ vide', () => {
  for (const fields of [
    { date_naissance: '5 juin' }, { date_naissance: '2025-02-30' },
    { date_naissance: 0 }, { date_naissance: '', ville: '' }
  ]) {
    const context = createContext();
    addSourceClient(context.sourcePath, fields);
    const before = fs.readFileSync(context.sourcePath);
    const options = { ...importOptions(context), emptyBirthdatesAsNull: true };
    assert.throws(() => inspectSource(options), /Import clientes refusé/);
    assert.throws(() => importClients(options), /Import clientes refusé/);
    assert.equal(fs.existsSync(context.targetPath), false);
    assert.deepEqual(fs.readFileSync(context.sourcePath), before);
  }
});

test('option champs facultatifs : NULL explicites, rapport CLI et préservation des valeurs compatibles', () => {
  const context = createContext();
  const blanks = { adresse: '', code_postal: '  ', ville: '', email: ' ', telephone_raw: '', relais_prefere: '' };
  addSourceClient(context.sourcePath, { ...blanks, date_naissance: '' });
  addSourceClient(context.sourcePath, { ...blanks, date_naissance: '5 juin' });
  addSourceClient(context.sourcePath);
  const before = fs.readFileSync(context.sourcePath);
  const options = { ...importOptions(context), invalidOptionalFieldsAsNull: true };
  const expected = { clientCount: 3, optionalFieldsConverted: {
    date_naissance: 2, adresse: 2, code_postal: 2, ville: 2, email: 2, telephone_raw: 2, relais_prefere: 2
  } };
  assert.deepEqual(inspectSource(options), expected);
  assert.equal(fs.existsSync(context.targetPath), false);
  const messages = [];
  const output = { log: message => messages.push(message), error: message => messages.push(message) };
  const args = ['--source', context.sourcePath, '--target', context.targetPath, '--invalid-optional-fields-as-null'];
  assert.equal(run([...args, '--check'], output), 0);
  assert.equal(fs.existsSync(context.targetPath), false);
  const reportText = messages.at(-1);
  assert.equal(run(args, output), 0);
  assert.equal(messages.at(-1), reportText);
  assert.match(reportText, /"date_naissance":2/);
  const target = new Database(context.targetPath, { readonly: true });
  try {
    for (const row of target.prepare('SELECT date_naissance, adresse, code_postal, ville, email, telephone_raw, relais_prefere, email_norm FROM clients WHERE id < 3').all()) {
      assert.ok(Object.values(row).every(value => value === null));
    }
    assert.deepEqual(target.prepare('SELECT date_naissance, adresse, code_postal, ville, email, telephone_raw, relais_prefere, created_at FROM clients WHERE id=3').get(), {
      date_naissance: '1990-02-03', adresse: '1 rue des Lilas', code_postal: '75001', ville: 'Paris',
      email: 'alice@example.test', telephone_raw: '06 12 34 56 78', relais_prefere: 'Relais A', created_at: '2025-01-02 03:04:05'
    });
  } finally { target.close(); }
  assert.deepEqual(fs.readFileSync(context.sourcePath), before);
});

test('option facultative refuse toujours les champs obligatoires invalides et les vrais doublons', () => {
  for (const fields of [{ nom: '' }, { prenom: '' }, { created_at: '' }, { contacter: 2 }]) {
    const context = createContext();
    addSourceClient(context.sourcePath, fields);
    const options = { ...importOptions(context), invalidOptionalFieldsAsNull: true };
    assert.throws(() => inspectSource(options), /Import clientes refusé/);
    assert.throws(() => importClients(options), /Import clientes refusé/);
    assert.equal(fs.existsSync(context.targetPath), false);
  }
  const context = createContext();
  addSourceClient(context.sourcePath);
  addSourceClient(context.sourcePath, { email: ' ALICE@EXAMPLE.TEST ' });
  assert.throws(() => importClients({ ...importOptions(context), invalidOptionalFieldsAsNull: true }), /doublon/);
  assert.equal(fs.existsSync(context.targetPath), false);
});

test('option facultative convertit les types incompatibles et conserve les NULL existants', () => {
  const context = createContext();
  addSourceClient(context.sourcePath, { date_naissance: '2025-02-30', email: Buffer.from('texte'), telephone_raw: null });
  const report = importClients({ ...importOptions(context), invalidOptionalFieldsAsNull: true });
  assert.deepEqual(report.optionalFieldsConverted, { date_naissance: 1, email: 1 });
  const target = new Database(context.targetPath, { readonly: true });
  try {
    assert.deepEqual(target.prepare('SELECT date_naissance,email,email_norm,telephone_raw FROM clients').get(), {
      date_naissance: null, email: null, email_norm: null, telephone_raw: null
    });
  } finally { target.close(); }
});

test('répétition livraison : sauvegarde synthétique, import CLI et démarrage du schéma cible', async () => {
  const context = createContext();
  addSourceClient(context.sourcePath);
  const original = new Database(context.sourcePath);
  original.exec('CREATE TABLE commandes(id INTEGER PRIMARY KEY); INSERT INTO commandes VALUES (1);');
  const backupPath = path.join(context.directory, 'backup.db');
  try { await original.backup(backupPath); } finally { original.close(); }
  const backup = new Database(backupPath, { readonly: true });
  try {
    assert.equal(backup.pragma('integrity_check', { simple: true }), 'ok');
    assert.equal(backup.prepare('SELECT count(*) AS n FROM commandes').get().n, 1);
    assert.equal(backup.prepare('SELECT points_fidelite FROM clients').get().points_fidelite, 42);
  } finally { backup.close(); }
  const before = fs.readFileSync(backupPath);
  const cli = path.resolve(__dirname, '../scripts/import-clients.js');
  const args = [cli, '--source', backupPath, '--target', context.targetPath];
  const cliOptions = { encoding: 'utf8', env: { ...process.env, NODE_TEST_CONTEXT: undefined } };
  const check = spawnSync(process.execPath, [...args, '--check'], cliOptions);
  assert.equal(check.status, 0, check.stderr);
  assert.match(check.stdout, /Précontrôle réussi : 1 cliente/);
  assert.equal(fs.existsSync(context.targetPath), false);
  const imported = spawnSync(process.execPath, args, cliOptions);
  assert.equal(imported.status, 0, imported.stderr);
  assert.match(imported.stdout, /Import réussi : 1 cliente/);
  assert.deepEqual(fs.readFileSync(backupPath), before);
  const initialized = spawnSync(process.execPath, [path.resolve(__dirname, '../scripts/ensure-runtime-db.js')], {
    ...cliOptions, env: { ...cliOptions.env, STAMP_DB_PATH: context.targetPath }
  });
  assert.equal(initialized.status, 0, initialized.stderr);
  const target = new Database(context.targetPath, { readonly: true });
  try {
    assert.equal(target.pragma('integrity_check', { simple: true }), 'ok');
    assert.deepEqual(target.pragma('foreign_key_check'), []);
    assert.deepEqual(target.prepare('SELECT derniere_commande, points_fidelite, archive FROM clients').get(), {
      derniere_commande: null, points_fidelite: 0, archive: 0
    });
    const tables = target.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    for (const { name } of tables) {
      if (['clients', 'settings', 'schema_migrations'].includes(name)) continue;
      assert.equal(target.prepare(`SELECT count(*) AS n FROM "${name.replaceAll('"', '""')}"`).get().n, 0, name);
    }
  } finally { target.close(); }
  const targetBefore = fs.readFileSync(context.targetPath);
  const repeated = spawnSync(process.execPath, args, cliOptions);
  assert.equal(repeated.status, 1);
  assert.match(repeated.stderr, /cible existe déjà/);
  assert.deepEqual(fs.readFileSync(context.targetPath), targetBefore);
});
