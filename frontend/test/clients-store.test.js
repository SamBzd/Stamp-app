import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPinia, setActivePinia } from 'pinia';
import { useClientsStore } from '../src/stores/clients.js';

test('les points sont enregistrés par PATCH dédié et actualisent la cliente conservée dans le store', async t => {
  setActivePinia(createPinia());
  const store = useClientsStore();
  const client = {id: 7, nom: 'Recette', prenom: 'Alice', email: 'fixture@example.test', points_fidelite: 12};
  store.clients = [client];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/clients/7/points');
    assert.equal(options.method, 'PATCH');
    assert.deepEqual(JSON.parse(options.body), {points_fidelite: 0});
    return {ok: true, status: 200, json: async () => ({...client, points_fidelite: 0})};
  });
  const updated = await store.setPointsFidelite(7, 0);
  assert.equal(updated.points_fidelite, 0);
  assert.equal(store.clients[0].points_fidelite, 0);
  assert.equal(store.clients[0].email, client.email);
});

test('un refus de points préserve les données et ne remplace pas le répertoire par une erreur', async t => {
  setActivePinia(createPinia());
  const store = useClientsStore();
  store.clients = [{id: 7, points_fidelite: 12}];
  t.mock.method(globalThis, 'fetch', async () => ({ok: false, status: 409, json: async () => ({error: 'Refus synthétique'})}));
  await assert.rejects(store.setPointsFidelite(7, 20), /Refus synthétique/);
  assert.equal(store.clients[0].points_fidelite, 12);
  assert.equal(store.error, null);
});
