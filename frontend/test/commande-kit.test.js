import assert from 'node:assert/strict';
import { test } from 'node:test';
import { moneyToCents, centsToInput, formatMoney, availableFormats, defaultKitForm, selectKitFormat, selectKitCollection, setKitContribution, kitPricing, prepareKitPayload, kitFormFromCommande, historicalComposition } from '../src/utils/commande-kit.js';

function catalogue(counts = [1, 1], rubans = 0) {
  return {
    id: 10, titre: 'Catalogue local', statut: 'publie', archive: 0,
    prix_A_cents: 1234, prix_B_cents: 4029, prix_C_cents: 3525,
    papier_spe: 'Spécial', embellissement: 'Fleur',
    collections: counts.map((count, index) => ({ id: 20 + index, nom: `Collection ${index}`, papiers: Array.from({ length: count }, (_, p) => ({ id: 100 + index * 10 + p, nom: `Papier ${index}-${p}` })) })),
    rubans: Array.from({ length: rubans }, (_, i) => ({ id: 30 + i, nom: `Ruban ${i}` })),
  };
}
function filled(cat, format = 'A') {
  const form = { ...defaultKitForm(), client_id: '1', catalogue_id: String(cat.id), methode_paiement: 'virement' };
  selectKitFormat(form, format);
  form.collections.forEach((_, i) => selectKitCollection(form, cat, i, String(cat.collections[i].id)));
  return form;
}

test('montants de commandes en centimes exacts, sans le plafond des tarifs catalogue', () => {
  for (const [input, expected] of [['0', 0], ['0,29', 29], ['100.01', 10001], ['1250,50', 125050], ['90071992547409,91', Number.MAX_SAFE_INTEGER]]) {
    assert.equal(moneyToCents(input), expected);
    assert.equal(moneyToCents(centsToInput(expected)), expected);
  }
  for (const input of ['', '1e2', 'NaN', 'Infinity', '-1', '1,001', '9 €', '90071992547409,92']) assert.throws(() => moneyToCents(input));
  assert.match(formatMoney(Number.MAX_SAFE_INTEGER), /409,91/);
  assert.match(formatMoney(29), /0,29/);
  assert.equal(formatMoney(null), '—');
});

test('A/B disponibles avec deux collections ; catalogue d’origine éditable même archivé', () => {
  const cat = catalogue([1]);
  assert.deepEqual(availableFormats(cat), ['C']);
  assert.deepEqual(availableFormats(catalogue()), ['A', 'B', 'C']);
  const archived = { ...cat, archive: 1, statut: 'brouillon' };
  assert.deepEqual(availableFormats(archived), []);
  assert.deepEqual(availableFormats(archived, cat.id), ['C']);
  assert.deepEqual(availableFormats({ ...archived, papier_spe: '', embellissement: null }, cat.id), []);
});

test('A/B autorise les répétitions et bascule toujours les deux contributions 2/3', () => {
  const cat = catalogue();
  for (const format of ['A', 'B']) {
    const form = filled(cat, format);
    assert.deepEqual(prepareKitPayload(form, cat).errors, {});
    assert.deepEqual(form.collections.map(c => c.papiers[0].quantite_base), [2, 3]);
    setKitContribution(form, cat, 0, 3);
    const result = prepareKitPayload(form, cat);
    assert.deepEqual(result.errors, {});
    assert.deepEqual(result.payload.commande_collections.map(c => c.nb_feuilles), [3, 2]);
    assert.deepEqual(result.payload.commande_collections.map(c => c.papiers[0].quantite_base), [3, 2]);
    assert.equal(result.payload.catalogue_id, cat.id);
    assert.equal(result.payload.client_id, 1);
    assert.equal(result.pricing.automatic, cat[`prix_${format}_cents`]);
  }
});

test('un papier partagé reste deux lignes propres à leurs collections', () => {
  const cat = catalogue();
  cat.collections[1].papiers = cat.collections[0].papiers;
  const result = prepareKitPayload(filled(cat), cat);
  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.payload.commande_collections.map(c => c.papiers), [
    [{ papier_cartonne_id: 100, quantite_base: 2 }], [{ papier_cartonne_id: 100, quantite_base: 3 }],
  ]);
});

test('C propose les compositions 1/3/5 papiers et refuse toute omission ou mauvais total', () => {
  for (const count of [1, 3, 5]) {
    const cat = catalogue([count]);
    const form = filled(cat, 'C');
    assert.deepEqual(form.collections[0].papiers.map(p => p.quantite_base), count === 1 ? [5] : Array(count).fill(1));
    if (count === 3) {
      assert.ok(prepareKitPayload(form, cat).errors.papiers_0);
      form.collections[0].papiers[0].quantite_base = 3;
    }
    assert.deepEqual(prepareKitPayload(form, cat).errors, {});
    form.collections[0].papiers[0].quantite_base = 0;
    assert.ok(prepareKitPayload(form, cat).errors.papiers_0);
  }
});

test('collections distinctes, appartenance, contributions et quantités sont contrôlées', () => {
  const cat = catalogue([3, 3]);
  for (const mutate of [
    f => { f.collections[1].collection_id = f.collections[0].collection_id; },
    f => { f.collections[0].papiers[0].papier_cartonne_id = 999; },
    f => { f.collections[0].papiers[0].quantite_base = 1.5; },
    f => { f.collections[0].papiers[0].quantite_base = -1; },
    f => { f.collections[0].nb_feuilles = 3; },
  ]) {
    const form = filled(cat); mutate(form);
    assert.equal(prepareKitPayload(form, cat).payload, null);
  }
});

test('changement de format et collection réinitialise les choix incompatibles', () => {
  const cat = catalogue([3, 1]);
  const form = filled(cat);
  selectKitCollection(form, cat, 1, String(cat.collections[0].id));
  assert.equal(form.collections[0].collection_id, '');
  assert.deepEqual(form.collections[0].papiers, []);
  form.prix_manuel = true; form.prix_manuel_euros = '9,00';
  selectKitFormat(form, 'C');
  assert.equal(form.collections.length, 1);
  assert.equal(form.collections[0].nb_feuilles, 5);
  assert.equal(form.prix_manuel, false);
  assert.deepEqual(form.collections[0].papiers, []);
});

test('zéro, un et deux rubans : aucun, automatique et choix obligatoire', () => {
  for (const count of [0, 1, 2]) {
    const cat = catalogue([1], count); const form = filled(cat, 'C');
    if (count === 2) {
      assert.ok(prepareKitPayload(form, cat).errors.ruban_id);
      form.ruban_id = String(cat.rubans[1].id);
    }
    const result = prepareKitPayload(form, cat);
    assert.deepEqual(result.errors, {});
    assert.equal(result.payload.ruban_id, count ? cat.rubans[count - 1].id : null);
  }
});

test('option et suppléments composent un total exact ; dérogation explicite sans perdre les lignes', () => {
  const cat = catalogue(); const form = filled(cat);
  Object.assign(form, { papier_supplementaire: true, produit_promo_texte: 'Promotion', produit_promo_prix: '2,75', autres_texte: 'Offert', autres_prix: '0' });
  let result = prepareKitPayload(form, cat);
  assert.equal(result.pricing.automatic, 1859);
  assert.equal(result.payload.produit_promo_prix_cents, 275);
  assert.equal(result.payload.autres_prix_cents, 0);
  assert.equal(Object.hasOwn(result.payload, 'prix_applique_cents'), false);
  Object.assign(form, { prix_manuel: true, prix_manuel_euros: '18,00' });
  result = prepareKitPayload(form, cat);
  assert.equal(result.payload.prix_applique_cents, 1800);
  assert.equal(result.pricing.automatic, 1859);
  assert.equal(result.payload.commande_collections[0].papiers[0].quantite_base, 2);
  form.prix_manuel_euros = '0'; assert.equal(prepareKitPayload(form, cat).payload.prix_applique_cents, 0);
});

test('supplément incomplet et total excessif ne sont jamais enregistrés', () => {
  const cat = catalogue(); const form = filled(cat);
  form.produit_promo_texte = 'Sans prix'; assert.ok(prepareKitPayload(form, cat).errors.produit_promo_prix);
  form.produit_promo_texte = ''; form.produit_promo_prix = '1'; assert.ok(prepareKitPayload(form, cat).errors.produit_promo_texte);
  form.produit_promo_texte = 'Trop'; form.produit_promo_prix = '90071992547409,91'; assert.ok(kitPricing(form, cat).errors.total);
});

test('édition utilise les sources actuelles sans reconduire un ancien prix manuel', () => {
  const cat = catalogue([1], 1);
  const order = {
    client_id: 1, catalogue_id: cat.id, format_type: 'C', methode_paiement: 'virement',
    prix_applique_cents: 1000, prix_origine: 'manuelle', papier_supplementaire: 1,
    produit_promo_texte: 'Offert', produit_promo_prix_cents: 0,
    commande_collections: [{ id: 40, collection_id: 20, collection_nom: 'Ancienne', nb_feuilles: 5 }],
    papiers_selectionnes: [{ id: 50, commande_collection_id: 40, papier_cartonne_id: 100, nom: 'Ancien papier', quantite_base: 5 }],
    ruban: { ruban_id: 30, ruban_nom: 'Ancien ruban', quantite: 1 },
  };
  const form = kitFormFromCommande(order, cat);
  assert.equal(form.prix_manuel, false);
  assert.equal(form.produit_promo_prix, '0,00');
  const edited = prepareKitPayload(form, cat, { originalCatalogueId: cat.id });
  assert.deepEqual(edited.errors, {});
  assert.equal(edited.pricing.applied, 3875);
  for (const field of ['client_id', 'type', 'prix_applique_cents', 'reglee']) assert.equal(Object.hasOwn(edited.payload, field), false);
  const history = historicalComposition(order);
  assert.equal(history[0].collection_nom, 'Ancienne');
  assert.equal(history[0].papiers[0].nom, 'Ancien papier');
  assert.equal(history[0].papiers[0].quantite_finale, 10);
  assert.equal(order.papiers_selectionnes[0].quantite_base, 5);
  cat.collections[0].papiers.push({ id: 101, nom: 'Ajouté' });
  assert.ok(prepareKitPayload(kitFormFromCommande(order, cat), cat, { originalCatalogueId: cat.id }).errors.papiers_0);
});

test('un changement de catalogue en édition n’autorise pas un brouillon étranger', () => {
  const cat = catalogue([1]); const form = filled(cat, 'C');
  const other = { ...cat, id: 11, statut: 'brouillon' }; form.catalogue_id = '11';
  assert.ok(prepareKitPayload(form, other, { originalCatalogueId: cat.id }).errors.format_type);
});
