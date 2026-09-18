import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import * as Vue from 'vue';
import { parse } from '@vue/compiler-sfc';
import { compile } from '@vue/compiler-dom';
import { renderToString } from '@vue/server-renderer';
import { formatMoney } from '../src/utils/commande-kit.js';

// Compile le véritable template : protège les noms de champs API et le rendu,
// sans dépendre d'un navigateur ni charger les sources tarifaires.
const source = fs.readFileSync(new URL('../src/views/StocksView.vue', import.meta.url), 'utf8');
const { descriptor } = parse(source);
const render = new Function('Vue', compile(descriptor.template.content, { mode: 'function' }).code)(Vue);
const formatCurrency = new Function('formatMoney',
  `return (${source.match(/const formatCurrency = ([\s\S]*?\n\});/)[1]});`)(formatMoney);

async function renderBilan(bilan) {
  const app = Vue.createSSRApp({
    render,
    setup: () => ({ activeTab: 'bilan', selectedMois: bilan.mois,
      stocksStore: { bilan, loadingBilan: false, bilanError: null },
      formatCurrency, handleLoadBilan() {} })
  });
  app.component('Layout', { template: '<main><slot /></main>' });
  app.component('Button', { template: '<button><slot /></button>' });
  return renderToString(app);
}

test('le bilan affiche centimes, paiements et détails historiques sans retotaliser', async () => {
  const html = await renderBilan({ mois: '2023-06', chiffre_affaires_cents: 7,
    par_methode_paiement: [{ methode_paiement: 'Paypal', total_cents: 7, nb_commandes: 1 }],
    produits_promo: [{ texte: 'Promo', prix_cents: 103, nb_fois: 1 }, { texte: 'Promo', prix_cents: 109, nb_fois: 1 }],
    autres: [{ texte: 'Autre historique', prix_cents: 207, nb_fois: 1 }] });
  for (const text of ['Paypal', 'Autre historique', '0,07', '1,03', '1,09', '2,07', 'prix manuel']) {
    assert.ok(html.includes(text), text);
  }
  assert.ok(!html.includes('Aucune donnée de paiement'));
  assert.equal(formatCurrency(Number.MAX_SAFE_INTEGER), formatMoney(Number.MAX_SAFE_INTEGER));
  assert.equal(formatCurrency(-29), `-${formatMoney(29)}`);
});

test('un mois vide affiche zéro et les trois états vides', async () => {
  const html = await renderBilan({ mois: '2023-05', chiffre_affaires_cents: 0,
    par_methode_paiement: [], produits_promo: [], autres: [] });
  for (const text of ['0,00', 'Aucune donnée de paiement', 'Aucun produit promotionnel', 'Aucun autre article']) {
    assert.ok(html.includes(text), text);
  }
});
