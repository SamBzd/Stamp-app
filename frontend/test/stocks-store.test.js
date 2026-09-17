import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPinia, setActivePinia } from 'pinia';
import { useStocksStore } from '../src/stores/stocks.js';

function deferred() {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
}
const response = data => ({ ok: true, status: 200, json: async () => data });

test('stocks et bilan conservent leurs chargements et erreurs indépendants', async t => {
  setActivePinia(createPinia());
  const store = useStocksStore();
  const stocks = deferred();
  const bilan = deferred();
  t.mock.method(globalThis, 'fetch', url => url.includes('/bilan') ? bilan.promise : stocks.promise);
  const loadStocks = store.fetchStocks();
  const loadBilan = store.fetchBilan('2026-09');
  assert.equal(store.loadingStocks, true);
  assert.equal(store.loadingBilan, true);
  bilan.resolve({ ok: false, status: 500, json: async () => ({ error: 'Bilan indisponible' }) });
  await loadBilan;
  assert.equal(store.bilanError, 'Bilan indisponible');
  assert.equal(store.stocksError, null);
  assert.equal(store.loadingStocks, true);
  stocks.resolve(response({ rubans: [{ cle: '[1,"Ruban"]', quantite: 1 }] }));
  await loadStocks;
  assert.equal(store.stocks.rubans[0].quantite, 1);
  assert.equal(store.loadingStocks, false);
  assert.equal(store.bilanError, 'Bilan indisponible');
});

test('une ancienne réponse ne remplace pas les stocks actualisés après une commande', async t => {
  setActivePinia(createPinia());
  const store = useStocksStore();
  const old = deferred();
  const latest = deferred();
  let calls = 0;
  t.mock.method(globalThis, 'fetch', () => (++calls === 1 ? old.promise : latest.promise));
  const first = store.fetchStocks();
  const second = store.fetchStocks();
  latest.resolve(response({ rubans: [{ quantite: 2 }] }));
  await second;
  old.resolve(response({ rubans: [{ quantite: 1 }] }));
  await first;
  assert.equal(store.stocks.rubans[0].quantite, 2);
  assert.equal(store.loadingStocks, false);
});

test('un ancien échec de bilan ne masque pas le mois récemment chargé', async t => {
  setActivePinia(createPinia());
  const store = useStocksStore();
  const old = deferred();
  let calls = 0;
  t.mock.method(globalThis, 'fetch', () => (++calls === 1 ? old.promise : Promise.resolve(response({ mois: '2026-09' }))));
  const first = store.fetchBilan('2026-08');
  await store.fetchBilan('2026-09');
  old.resolve({ ok: false, status: 500, json: async () => ({ error: 'Ancien échec' }) });
  await first;
  assert.equal(store.bilan.mois, '2026-09');
  assert.equal(store.bilanError, null);
});
