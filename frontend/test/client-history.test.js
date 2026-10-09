import assert from 'node:assert/strict';
import { test } from 'node:test';
import { commandeHistoryLink, commandeHistoryCatalogue, commandeHistoryDate, formatHistoryDate } from '../src/utils/client-history.js';

test('les liens historiques ciblent le bon tableau et ouvrent le détail par identifiant', () => {
  assert.deepEqual(commandeHistoryLink({id: 10, type: 'kit'}), {path: '/commandes/kits', query: {commande: '10'}});
  assert.deepEqual(commandeHistoryLink({id: 11, type: 'hors_kit'}), {path: '/commandes/hors-kit', query: {commande: '11'}});
});

test('le catalogue est le titre historique, avec un libellé distinct pour hors kit et données absentes', () => {
  assert.equal(commandeHistoryCatalogue({type: 'kit', catalogue_titre: 'Été archivé'}), 'Été archivé');
  assert.equal(commandeHistoryCatalogue({type: 'hors_kit', catalogue_titre: 'Ignoré'}), 'Hors kit');
  assert.equal(commandeHistoryCatalogue({type: 'kit'}), 'Catalogue non renseigné');
});

test('la date explicite prime, le timestamp SQLite est compatible et les dates invalides sont explicites', () => {
  assert.equal(commandeHistoryDate({date_commande: '2026-03-04', created_at: '2026-03-05 01:02:03'}), '2026-03-04');
  assert.equal(formatHistoryDate({created_at: '2026-10-09 23:59:59'}), '09/10/2026');
  for (const value of ['', 'pas une date', '2026-02-31', '2026-13-01']) {
    assert.equal(commandeHistoryDate({created_at: value}), undefined);
    assert.equal(formatHistoryDate({created_at: value}), 'Date non renseignée');
  }
});
