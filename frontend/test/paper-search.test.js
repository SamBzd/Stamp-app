import assert from 'node:assert/strict';
import { test } from 'node:test';
import { usePaperSearch } from '../src/composables/usePaperSearch.js';

const settle = () => new Promise(resolve => setTimeout(resolve, 5));

test('la recherche ne charge pas toute la bibliothèque après une sélection', async () => {
  const calls = [];
  const search = usePaperSearch(async query => {
    calls.push(query);
    return [{ id: calls.length, nom: query }];
  }, { delay: 0 });

  search.query.value = 'Premier';
  await settle();
  assert.deepEqual(search.results.value, [{ id: 1, nom: 'Premier' }]);
  search.reset();
  await settle();
  assert.deepEqual(calls, ['Premier']);
  assert.deepEqual(search.results.value, []);
  assert.equal(search.searching.value, false);

  search.query.value = 'Deuxième';
  await settle();
  search.reset();
  search.query.value = 'Troisième';
  await settle();
  assert.deepEqual(calls, ['Premier', 'Deuxième', 'Troisième']);
  assert.deepEqual(search.results.value, [{ id: 3, nom: 'Troisième' }]);
  search.stop();
});

test('une réponse ancienne ne remplace jamais la recherche courante', async () => {
  const resolvers = new Map();
  const search = usePaperSearch(query => new Promise(resolve => resolvers.set(query, resolve)), { delay: 0 });
  search.query.value = 'Ancien';
  await settle();
  search.query.value = 'Actuel';
  await settle();
  resolvers.get('Actuel')([{ id: 2, nom: 'Actuel' }]);
  await settle();
  resolvers.get('Ancien')([{ id: 1, nom: 'Ancien' }]);
  await settle();
  assert.deepEqual(search.results.value, [{ id: 2, nom: 'Actuel' }]);
  search.stop();
});
