const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const ENTRYPOINT_PATH = path.resolve(__dirname, '../docker-entrypoint.sh');

test('l’entrypoint exécute une commande de maintenance sans lancer le contrôle API', () => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-entrypoint-test-'));
  const databasePath = path.join(tempDirectory, 'app.db');
  const markerPath = path.join(tempDirectory, 'command-ran');
  const childEnvironment = { ...process.env, STAMP_DB_PATH: databasePath };
  delete childEnvironment.NODE_TEST_CONTEXT;

  const result = spawnSync(
    'sh',
    [
      ENTRYPOINT_PATH,
      process.execPath,
      '-e',
      "require('node:fs').writeFileSync(process.argv[1], 'commande transmise')",
      markerPath
    ],
    {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      env: childEnvironment
    }
  );

  try {
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.readFileSync(markerPath, 'utf8'), 'commande transmise');
    assert.equal(fs.existsSync(databasePath), false);
  } finally {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
});
