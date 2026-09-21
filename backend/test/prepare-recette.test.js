const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const Database = require('better-sqlite3');
const { assertMigrationSchemaCompatible } = require('../src/db/schema-compatibility');

test('fixtures de recette : base neuve versionnée, prix et fidélité attendus, aucun écrasement', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-recette-test-'));
  const target = path.join(directory, 'recette.db');
  const script = path.resolve(__dirname, '../scripts/prepare-recette.js');
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', timeout: 30000 });
  try {
    const invalid = run('--target', 'relative.db');
    assert.equal(invalid.status, 1);
    const result = run('--target', target);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.bilan.chiffre_affaires_cents, 1859);
    const db = new Database(target, { readonly: true });
    try {
      assertMigrationSchemaCompatible(db, 2);
      assert.equal(db.prepare('SELECT count(*) AS n FROM catalogues').get().n, 7);
      assert.equal(db.prepare('SELECT count(*) AS n FROM commandes').get().n, 3);
      const expected = [
        ['Noël créatif', [1, 1], 2],
        ['C — 1 papier(s)', [1], 1], ['C — 2 papier(s)', [2], 2],
        ['C — 3 papier(s)', [3], 0], ['C — 4 papier(s)', [4], 1], ['C — 5 papier(s)', [5], 2],
      ];
      assert.deepEqual(report.catalogues.map(c => c.titre), expected.map(([titre]) => titre));
      for (const [index, [titre, paperCounts, rubans]] of expected.entries()) {
        const id = report.catalogues[index].id;
        assert.deepEqual(db.prepare('SELECT titre,statut,archive,prix_A_cents,prix_B_cents,prix_C_cents FROM catalogues WHERE id=?').get(id),
          { titre, statut: 'publie', archive: 0, prix_A_cents: 1234, prix_B_cents: 4029, prix_C_cents: 3525 });
        assert.deepEqual(db.prepare(`SELECT count(cp.papier_cartonne_id) AS n FROM collections c
          LEFT JOIN collection_papiers cp ON cp.collection_id=c.id WHERE c.catalogue_id=?
          GROUP BY c.id ORDER BY c.ordre,c.id`).all(id).map(row => row.n), paperCounts);
        assert.equal(db.prepare('SELECT count(*) AS n FROM catalogue_rubans WHERE catalogue_id=?').get(id).n, rubans);
      }
      assert.equal(db.prepare('SELECT statut FROM catalogues WHERE id=?').get(report.brouillon_id).statut, 'brouillon');
      assert.equal(db.prepare('SELECT points_fidelite FROM clients').get().points_fidelite, 1);
      assert.deepEqual(db.prepare('SELECT prix_applique_cents, prix_origine FROM commandes WHERE id=?').get(report.commandes.modifiable),
        { prix_applique_cents: 1000, prix_origine: 'manuelle' });
    } finally { db.close(); }
    const before = fs.readFileSync(target);
    assert.equal(run('--target', target).status, 1);
    assert.deepEqual(fs.readFileSync(target), before);
    const link = path.join(directory, 'link.db');
    fs.symlinkSync(target, link);
    assert.equal(run('--target', link).status, 1);
    assert.deepEqual(fs.readFileSync(target), before);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
