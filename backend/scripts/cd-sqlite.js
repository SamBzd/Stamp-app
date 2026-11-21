#!/usr/bin/env node
// Interface privée du déployeur. Aucune commande n'initialise une base absente.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { getDatabasePath, getPort } = require('../src/config');
const { getMaintenancePath } = require('../src/maintenance');
const { applyMigrations, getMigrationStatus } = require('../src/db/migrations');
const { assertMigrationSchemaCompatible } = require('../src/db/schema-compatibility');

const backupPath = '/stamp-cd-backup/before.db';
const databasePath = getDatabasePath();
const [command, ticket, digest] = process.argv.slice(2);
function integrity(db) {
  assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
  assert.deepEqual(db.pragma('foreign_key_check'), []);
}
function status(db) {
  const result = getMigrationStatus(db);
  assert.ok(result.applied.length, 'Base non versionnée : maintenance manuelle requise');
  assertMigrationSchemaCompatible(db, result.applied.at(-1).version);
  return { version: result.applied.at(-1).version,
    pending: result.pending.map(({ version }) => version) };
}
function open(file = databasePath, readonly = true) {
  return new Database(file, { readonly, fileMustExist: true });
}
function fileDigest(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function syncDirectory(directory) {
  const fd = fs.openSync(directory, 'r');
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function gate() {
  assert.match(ticket || '', /^[a-f0-9]{32}$/);
  const file = getMaintenancePath();
  if (command === 'gate-on') {
    if (fs.existsSync(file)) assert.equal(fs.readFileSync(file, 'utf8'), ticket);
    else fs.writeFileSync(file, ticket, { flag: 'wx', mode: 0o600 });
    const fd = fs.openSync(file, 'r');
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  } else if (fs.existsSync(file)) {
    assert.equal(fs.readFileSync(file, 'utf8'), ticket, 'Maintenance appartenant à une autre opération');
    fs.unlinkSync(file);
  }
  syncDirectory(path.dirname(file));
  return {};
}
async function main() {
  if (command === 'gate-on' || command === 'gate-off') return gate();
  if (command === 'http-gate') {
    const response = await fetch(`http://127.0.0.1:${getPort()}/api/health`,
      { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 200);
    const { deploymentMaintenance: gate } = await response.json();
    assert.equal(gate?.supported, true, 'Installer d’abord le backend compatible avec la maintenance');
    assert.equal(gate.active, ticket === 'closed');
    return {};
  }
  if (command === 'backup') {
    assert.ok(!fs.existsSync(backupPath), 'Sauvegarde déjà présente');
    const source = open();
    try { status(source); await source.backup(backupPath); } finally { source.close(); }
    const copy = open(backupPath, false);
    try { copy.pragma('journal_mode = DELETE'); integrity(copy); status(copy); } finally { copy.close(); }
    fs.chmodSync(backupPath, 0o400);
    const fd = fs.openSync(backupPath, 'r');
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    syncDirectory(path.dirname(backupPath));
    return { sha256: fileDigest(backupPath) };
  }
  if (command === 'rehearse') {
    const file = '/stamp-cd-backup/rehearsal.db';
    fs.copyFileSync(backupPath, file, fs.constants.COPYFILE_EXCL);
    fs.chmodSync(file, 0o600);
    const db = open(file, false);
    try { status(db); applyMigrations(db); integrity(db); return status(db); } finally { db.close(); }
  }
  if (command === 'restore') {
    assert.equal(fs.readFileSync(getMaintenancePath(), 'utf8'), ticket);
    assert.match(digest || '', /^[a-f0-9]{64}$/);
    assert.equal(fileDigest(backupPath), digest, 'Sauvegarde altérée');
    const backup = open(backupPath);
    try { integrity(backup); status(backup); } finally { backup.close(); }
    // Conserver la base en échec et ses journaux avant toute restauration.
    for (const suffix of ['', '-wal', '-shm']) {
      const file = databasePath + suffix;
      const saved = '/stamp-cd-backup/failed.db' + suffix;
      if (fs.existsSync(file) && !fs.existsSync(saved)) {
        fs.copyFileSync(file, saved, fs.constants.COPYFILE_EXCL);
        const fd = fs.openSync(saved, 'r');
        try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      }
    }
    syncDirectory(path.dirname(backupPath));
    const temporary = databasePath + '.cd-restore';
    fs.copyFileSync(backupPath, temporary);
    fs.chmodSync(temporary, 0o600);
    const fd = fs.openSync(temporary, 'r');
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    for (const suffix of ['-wal', '-shm']) fs.rmSync(databasePath + suffix, { force: true });
    fs.renameSync(temporary, databasePath);
    syncDirectory(path.dirname(databasePath));
    return {};
  }
  assert.ok(['status', 'migrate'].includes(command), 'Commande CD inconnue');
  if (command === 'migrate') assert.equal(fs.readFileSync(getMaintenancePath(), 'utf8'), ticket);
  const db = open(databasePath, command !== 'migrate');
  try {
    status(db);
    if (command === 'migrate') { applyMigrations(db); integrity(db); }
    return status(db);
  } finally { db.close(); }
}

main().then(result => console.log(JSON.stringify(result))).catch(() => {
  // Ne jamais afficher des lignes SQLite ou des valeurs métier dans le journal CD.
  console.error(`Opération SQLite CD en échec : ${command || 'inconnue'}`);
  process.exitCode = 1;
});
