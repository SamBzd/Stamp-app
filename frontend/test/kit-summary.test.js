import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import * as Vue from 'vue';
import { compile } from '@vue/compiler-dom';
import { renderToString } from '@vue/server-renderer';
import { formatMoney, kitSheetCount } from '../src/utils/commande-kit.js';

// Render the actual summary template with prepared form state.
const source = fs.readFileSync(new URL('../src/components/CommandeKitForm.vue', import.meta.url), 'utf8');
const start = source.indexOf('<section class="summary"');
const summary = source.slice(start, source.indexOf('</section>', start) + '</section>'.length);
const render = new Function('Vue', compile(summary, { mode: 'function' }).code)(Vue);

test('#45 : création et édition affichent des libellés et totaux cohérents dans le récapitulatif réel', async () => {
  for (const included of [false, true]) {
    for (const format of ['A', 'B', 'C']) {
      for (const doubled of [false, true]) {
        const count = format === 'C' ? 1 : 2;
        const form = { format_type: format, papier_collection_inclus: included, papier_supplementaire: doubled,
          collections: Array.from({ length: count }, (_, index) => ({ collection_id: index + 1,
            papiers: [{ papier_cartonne_id: index + 1, quantite_base: format === 'C' ? 5 : index + 2 }] })) };
        const app = Vue.createSSRApp({ render, setup: () => ({ form, catalogueDetail: { titre: 'Recette' },
          collectionName: line => line.collection_id === 1 ? 'Jardin' : 'Ciel', paperName: () => 'Rouge',
          multiplier: doubled ? 2 : 1, pricing: { applied: 2000 }, formatMoney, kitSheetCount }) });
        app.config.warnHandler = warning => { if (!warning.startsWith('Property undefined was accessed')) throw new Error(warning); };
        const html = await renderToString(app);
        assert.ok(html.includes('Papier cartonné · Rouge'));
        assert.equal(html.includes('Papier de collection'), included);
        if (included) assert.ok(html.includes(`Jardin · Format ${format} : 1 feuille`));
        assert.ok(html.includes(`${(doubled ? 10 : 5) + (included ? count : 0)} feuilles à préparer`));
      }
    }
  }
});
