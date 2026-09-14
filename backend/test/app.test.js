const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');
const Database = require('better-sqlite3');

let baseUrl;
let databaseConnection;
let server;
let tempDirectory;

before(async () => {
  tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-backend-test-'));
  const databasePath = path.join(tempDirectory, 'app.db');
  const schemaPath = path.resolve(__dirname, '../../db/schema.sql');

  const bootstrapDatabase = new Database(databasePath);
  bootstrapDatabase.exec(fs.readFileSync(schemaPath, 'utf8'));
  bootstrapDatabase.close();

  process.env.STAMP_DB_PATH = databasePath;

  const app = require('../src/app');
  databaseConnection = require('../src/db/connection');
  await new Promise((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server?.listening) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  if (databaseConnection) {
    databaseConnection.close();
  }
  delete process.env.STAMP_DB_PATH;

  if (tempDirectory) {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
});

test('GET /api/health confirme le démarrage de l’API', async () => {
  const response = await fetch(`${baseUrl}/api/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 'ok',
    message: 'backend up'
  });
});

test('GET /api/clients utilise la base SQLite temporaire', async () => {
  const response = await fetch(`${baseUrl}/api/clients`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
});
