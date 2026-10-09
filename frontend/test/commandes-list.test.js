import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterCommandes, commandeCatalogueOptions } from '../src/utils/commandes-list.js';

const commandes = [
  { id: 1, type: 'kit', catalogue_id: 7, catalogue_titre: 'Printemps', client_prenom: 'Éléonore', client_nom: "D’Œuvre" },
  { id: 2, type: 'kit', catalogue_id: 7, catalogue_titre: 'Ancien titre', client: { prenom: 'Alice', nom: 'Martin' } },
  { id: 3, type: 'kit', catalogue_id: 8, catalogue_titre: 'Printemps', client_prenom: 'Éléonore', client_nom: 'Martin' },
  { id: 4, type: 'hors_kit', client_prenom: 'Éléonore', client_nom: "D’Œuvre" },
];

test('les tableaux séparent les types, même sans filtre', () => {
  assert.deepEqual(filterCommandes(commandes, { type: 'kit' }).map(c => c.id), [1, 2, 3]);
  assert.deepEqual(filterCommandes(commandes, { type: 'hors_kit', catalogueId: '7' }).map(c => c.id), [4]);
});

test('la recherche cliente accepte accents, ligatures, espaces et noms dans les deux ordres', () => {
  for (const search of ['  oeuvre   eleonore ', 'ÉLÉONORE D’ŒUVRE', "d'oeuvre", 'Eléo']) {
    assert.ok(filterCommandes(commandes, { type: 'kit', search }).some(c => c.id === 1), search);
  }
  assert.deepEqual(filterCommandes(commandes, { type: 'kit', search: 'Martin Alice' }).map(c => c.id), [2]);
  assert.deepEqual(filterCommandes(commandes, { type: 'kit', search: 'Printemps' }), []);
});

test('le catalogue et la recherche se combinent sans confondre les titres identiques', () => {
  assert.deepEqual(filterCommandes(commandes, { type: 'kit', search: 'Eleonore', catalogueId: '7' }).map(c => c.id), [1]);
  assert.deepEqual(filterCommandes(commandes, { type: 'kit', search: 'Alice', catalogueId: '8' }), []);
});

test('les options sont issues des commandes et gardent les identifiants malgré un titre historique différent', () => {
  const before = structuredClone(commandes);
  assert.deepEqual(commandeCatalogueOptions(commandes), [
    { value: '7', label: 'Printemps (#7)' }, { value: '8', label: 'Printemps (#8)' },
  ]);
  assert.deepEqual(commandes, before);
  assert.deepEqual(commandeCatalogueOptions([]), []);
});
