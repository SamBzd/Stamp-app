const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');

const {
  getCorsOrigins,
  getDatabasePath,
  getPort
} = require('../src/config');

test('STAMP_DB_PATH est obligatoire et résolu en chemin absolu', () => {
  assert.throws(
    () => getDatabasePath({}),
    /STAMP_DB_PATH est obligatoire/
  );
  assert.equal(
    getDatabasePath({ STAMP_DB_PATH: 'data/app.db' }),
    path.resolve('data/app.db')
  );
});

test('PORT utilise une valeur sûre et rejette les ports invalides', () => {
  assert.equal(getPort({}), 3000);
  assert.equal(getPort({ PORT: '8080' }), 8080);
  assert.throws(() => getPort({ PORT: '0' }), /PORT doit être un entier/);
  assert.throws(() => getPort({ PORT: 'abc' }), /PORT doit être un entier/);
});

test('CORS_ORIGIN accepte une liste explicite et reste vide par défaut', () => {
  assert.deepEqual(getCorsOrigins({}), []);
  assert.deepEqual(
    getCorsOrigins({ CORS_ORIGIN: 'https://app.example, https://admin.example' }),
    ['https://app.example', 'https://admin.example']
  );
});
