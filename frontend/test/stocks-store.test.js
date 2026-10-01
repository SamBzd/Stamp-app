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

test('le workflow charge les piles et conserve le tableau courant après un échec', async t => {
  setActivePinia(createPinia());
  const store = useStocksStore();
  const workflow = { groupes: [{ type: 'ruban', nom: 'Lin', etat: 'À traiter', quantite: 2 }], alertes: [] };
  let calls = 0;
  t.mock.method(globalThis, 'fetch', () => ++calls === 1
    ? Promise.resolve(response(workflow))
    : Promise.resolve({ ok: false, status: 500, json: async () => ({ error: 'Workflow indisponible' }) }));
  await store.fetchWorkflow();
  assert.deepEqual(store.workflow, workflow);
  await store.fetchWorkflow();
  assert.deepEqual(store.workflow, workflow);
  assert.equal(store.workflowError, 'Workflow indisponible');
});

test('déplacement et archivage utilisent les mutations du workflow puis le rechargent', async t => {
  setActivePinia(createPinia());
  const store = useStocksStore();
  const requests = [];
  t.mock.method(globalThis, 'fetch', (url, options = {}) => {
    requests.push({ url, method: options.method || 'GET', body: options.body && JSON.parse(options.body) });
    return Promise.resolve(response(url.endsWith('/fournitures') ? { groupes: [], alertes: [] } : { quantite: 2 }));
  });
  await store.moveWorkflowGroup({ type: 'ruban', nom: 'Lin', etat_source: 'À traiter', etat_cible: 'Commandé', quantite: 1 });
  await store.archiveWorkflowGroup({ type: 'ruban', nom: 'Lin', quantite: 2 });
  assert.deepEqual(requests.map(request => request.method), ['PATCH', 'GET', 'POST', 'GET']);
  assert.deepEqual(requests[0].body, { type: 'ruban', nom: 'Lin', etat_source: 'À traiter', etat_cible: 'Commandé', quantite: 1 });
  assert.deepEqual(requests[2].body, { type: 'ruban', nom: 'Lin', quantite: 2 });
  assert.deepEqual(store.workflow, { groupes: [], alertes: [] });
  assert.equal(store.mutatingWorkflow, false);
});

test('une mutation acceptée reste un succès si sa resynchronisation échoue', async t => {
  setActivePinia(createPinia());
  const store = useStocksStore();
  store.workflow = { groupes: [{ type: 'ruban', nom: 'Lin', etat: 'À traiter', quantite: 2 }], alertes: [] };
  let calls = 0;
  t.mock.method(globalThis, 'fetch', () => ++calls === 1
    ? Promise.resolve(response({ quantite: 1 }))
    : Promise.resolve({ ok: false, status: 500, json: async () => ({ error: 'Lecture impossible' }) }));
  await store.moveWorkflowGroup({ type: 'ruban', nom: 'Lin', etat_source: 'À traiter', etat_cible: 'Commandé', quantite: 1 });
  assert.deepEqual(store.workflow.groupes, [
    { type: 'ruban', nom: 'Lin', etat: 'À traiter', quantite: 1 },
    { type: 'ruban', nom: 'Lin', etat: 'Commandé', quantite: 1 },
  ]);
  assert.match(store.workflowError, /Déplacement enregistré/);
  assert.equal(store.mutatingWorkflow, false);
});

test('un déplacement ignore un rafraîchissement antérieur qui revient entre PATCH et sa réponse', async t => {
  setActivePinia(createPinia());
  const store = useStocksStore();
  store.workflow = { groupes: [{ type: 'ruban', nom: 'Lin', etat: 'À traiter', quantite: 3 }], alertes: [] };
  const pendingRead = deferred();
  const pendingMove = deferred();
  let calls = 0;
  t.mock.method(globalThis, 'fetch', (url, options = {}) => {
    calls += 1;
    if (options.method === 'PATCH') return pendingMove.promise;
    if (calls === 1) return pendingRead.promise;
    return Promise.resolve({ ok: false, status: 500, json: async () => ({ error: 'Lecture impossible' }) });
  });
  const staleRefresh = store.fetchWorkflow();
  const move = store.moveWorkflowGroup({ type: 'ruban', nom: 'Lin', etat_source: 'À traiter', etat_cible: 'Commandé', quantite: 1 });
  pendingRead.resolve(response({ groupes: [
    { type: 'ruban', nom: 'Lin', etat: 'À traiter', quantite: 2 },
    { type: 'ruban', nom: 'Lin', etat: 'Commandé', quantite: 1 },
  ], alertes: [] }));
  await staleRefresh;
  pendingMove.resolve(response({ quantite: 1 }));
  await move;
  assert.deepEqual(store.workflow.groupes, [
    { type: 'ruban', nom: 'Lin', etat: 'À traiter', quantite: 2 },
    { type: 'ruban', nom: 'Lin', etat: 'Commandé', quantite: 1 },
  ]);
});
