const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const Database = require('better-sqlite3');
const { applyMigrations } = require('../src/db/migrations');

function context(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-cd-helper-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const database = path.join(directory, 'app.db');
  const db = new Database(database);
  applyMigrations(db, { targetVersion: 4 });
  db.close();
  return { database, directory,
    run: (...args) => spawnSync(process.execPath, [path.resolve(__dirname, '../scripts/cd-sqlite.js'), ...args],
      { env: { ...process.env, STAMP_DB_PATH: database }, encoding: 'utf8' }) };
}

test('le statut CD est en lecture seule et ne crée pas une base absente', t => {
  const ctx = context(t);
  const hash = () => crypto.createHash('sha256').update(fs.readFileSync(ctx.database)).digest('hex');
  const before = hash();
  const status = ctx.run('status');
  assert.equal(status.status, 0, status.stderr);
  assert.deepEqual(JSON.parse(status.stdout), { version: 4, pending: [5] });
  assert.equal(hash(), before);
  fs.unlinkSync(ctx.database);
  assert.equal(ctx.run('status').status, 1);
  assert.equal(fs.existsSync(ctx.database), false);
});

test('seule la maintenance propriétaire peut rouvrir les accès', t => {
  const ctx = context(t), ticket = 'a'.repeat(32);
  assert.equal(ctx.run('gate-on', ticket).status, 0);
  assert.equal(ctx.run('gate-on', ticket).status, 0);
  assert.equal(ctx.run('gate-off', 'b'.repeat(32)).status, 1);
  assert.equal(fs.existsSync(path.join(ctx.directory, '.stamp-maintenance')), true);
  assert.equal(ctx.run('gate-off', ticket).status, 0);
});

test('la migration automatique exige le garde persistant de son opération', t => {
  const ctx = context(t), ticket = 'a'.repeat(32);
  assert.equal(ctx.run('migrate', ticket).status, 1);
  assert.equal(ctx.run('gate-on', ticket).status, 0);
  assert.equal(ctx.run('migrate', 'b'.repeat(32)).status, 1);
  assert.equal(ctx.run('migrate', ticket).status, 0);
  assert.deepEqual(JSON.parse(ctx.run('status').stdout), { version: 5, pending: [] });
});
