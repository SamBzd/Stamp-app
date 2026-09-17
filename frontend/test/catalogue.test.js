import assert from 'node:assert/strict';
import { test } from 'node:test';
import { centsToInput, eurosToCents, publicationErrors } from '../src/utils/catalogue.js';

test('prix saisis en euros : limites, virgule, point et conversion exacte', () => {
  for (const [input, cents] of [['0', 0], ['0,01', 1], ['0.29', 29], ['35,25', 3525], [' 99.99 ', 9999], ['100,00', 10000], ['4,5', 450]]) {
    assert.equal(eurosToCents(input), cents);
  }
  for (let cents = 0; cents <= 10000; cents++) assert.equal(eurosToCents(centsToInput(cents)), cents);
});

test('un prix invalide est refusé, jamais arrondi ou partiellement interprété', () => {
  for (const input of ['', ' ', '-1', '100,01', '101', '10,001', '1e2', '12 €', '1,2.3', 'NaN', 'Infinity', '0.009']) {
    assert.throws(() => eurosToCents(input), undefined, input);
  }
  assert.equal(centsToInput(null), '');
});

test('une préparation complète peut être publiée avec C seul ; les manques sont expliqués', () => {
  const catalogue = { papier_spe: 'Kraft', embellissement: null, collections: [{ nom: 'Nature', papiers: [{ id: 1, nom: 'Vert' }] }], prix_A_cents: 0, prix_B_cents: 10000, prix_C_cents: 3525 };
  assert.deepEqual(publicationErrors(catalogue), []);
  assert.deepEqual(publicationErrors({ ...catalogue, papier_spe: null, embellissement: 'Fleur' }), []);
  assert.match(publicationErrors({ ...catalogue, papier_spe: '  ' })[0], /papier spécial ou un embellissement/);
  assert.match(publicationErrors({ ...catalogue, collections: [] })[0], /au moins une collection/);
  assert.match(publicationErrors({ ...catalogue, collections: [{ nom: 'Nature', papiers: [] }] })[0], /Nature/);
  assert.match(publicationErrors({ ...catalogue, prix_A_cents: null })[0], /trois tarifs/);
});
