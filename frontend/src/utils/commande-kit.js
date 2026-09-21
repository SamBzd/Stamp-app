const MAX_CENTS = BigInt(Number.MAX_SAFE_INTEGER);
export const OPTION_CENTS = 350;
export const PAYMENTS = ['Paypal', 'chèque', 'virement'];

// Parse decimal digits, without rounding or a floating-point multiplication.
export function moneyToCents(value) {
  const match = String(value).trim().match(/^(\d+)(?:[.,](\d{1,2}))?$/);
  if (!match) throw new Error('Saisissez un montant positif ou nul, avec deux décimales maximum.');
  const cents = BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0'));
  if (cents > MAX_CENTS) throw new Error('Ce montant est trop élevé.');
  return Number(cents);
}

export function centsToInput(cents) {
  if (!Number.isSafeInteger(cents) || cents < 0) return '';
  return `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}`;
}

export function formatMoney(cents) {
  if (!Number.isSafeInteger(cents) || cents < 0) return '—';
  // Keep the cents exact even near Number.MAX_SAFE_INTEGER.
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
    .formatToParts(BigInt(cents) / 100n)
    .map(part => part.type === 'fraction' ? String(cents % 100).padStart(2, '0') : part.value)
    .join('');
}

export function commandeTypeLabel(commande) {
  return commande?.type === 'kit' ? `Format ${commande.format_type}` : 'Hors kit';
}

export function defaultKitForm() {
  return {
    client_id: '', catalogue_id: '', format_type: '', collections: [], ruban_id: '',
    methode_paiement: '', date_commande: '', papier_supplementaire: false,
    produit_promo_texte: '', produit_promo_prix: '', autres_texte: '', autres_prix: '',
    prix_manuel: false, prix_manuel_euros: '',
  };
}

export function availableFormats(catalogue, originalCatalogueId = null) {
  if (!catalogue || (catalogue.archive || catalogue.statut !== 'publie') && catalogue.id !== originalCatalogueId) return [];
  if (!catalogue.papier_spe?.trim() && !catalogue.embellissement?.trim()) return [];
  if (!catalogue.collections?.length || catalogue.collections.some(c => !c.papiers?.length)) return [];
  if (['A', 'B', 'C'].some(f => !Number.isInteger(catalogue[`prix_${f}_cents`]))) return [];
  return catalogue.collections.length >= 2 ? ['A', 'B', 'C'] : ['C'];
}

export function selectKitFormat(form, format) {
  form.format_type = format;
  form.collections = (format === 'C' ? [5] : [2, 3]).map(nb_feuilles => ({ collection_id: '', nb_feuilles, papiers: [] }));
  form.prix_manuel = false;
  form.prix_manuel_euros = '';
}

function initialPapers(collection, contribution, format) {
  return (collection?.papiers || []).map((paper, index, papers) => ({
    papier_cartonne_id: paper.id,
    quantite_base: format === 'C' ? (papers.length === 1 ? 5 : 1) : (index === 0 ? contribution : 0),
  }));
}

export function selectKitCollection(form, catalogue, index, id) {
  const line = form.collections[index];
  line.collection_id = id;
  const source = catalogue?.collections.find(c => c.id === Number(id));
  line.papiers = initialPapers(source, line.nb_feuilles, form.format_type);
  // Do not silently reuse the same collection in both A/B slots.
  const other = form.collections[1 - index];
  if (form.format_type !== 'C' && id && other && Number(other.collection_id) === Number(id)) {
    other.collection_id = '';
    other.papiers = [];
  }
}

export function setKitContribution(form, catalogue, index, value) {
  if (form.format_type === 'C' || ![2, 3].includes(value)) return;
  form.collections[index].nb_feuilles = value;
  form.collections[1 - index].nb_feuilles = 5 - value;
  // Quantities incompatible with the new contribution need a new allocation.
  for (const line of form.collections) {
    const source = catalogue.collections.find(c => c.id === Number(line.collection_id));
    if (line.papiers.reduce((sum, p) => sum + Number(p.quantite_base), 0) !== line.nb_feuilles) {
      line.papiers = initialPapers(source, line.nb_feuilles, form.format_type);
    }
  }
}

export function historicalComposition(commande) {
  const multiplier = commande.papier_supplementaire ? 2 : 1;
  return (commande.commande_collections || []).map(line => ({
    ...line,
    papiers: (commande.papiers_selectionnes || [])
      .filter(p => p.commande_collection_id === line.id)
      .map(p => ({ ...p, quantite_finale: p.quantite_base * multiplier })),
  }));
}

export function kitFormFromCommande(commande, catalogue) {
  const form = {
    ...defaultKitForm(), client_id: String(commande.client_id), catalogue_id: String(commande.catalogue_id),
    format_type: commande.format_type, methode_paiement: commande.methode_paiement || '',
    date_commande: commande.date_commande || '', papier_supplementaire: Boolean(commande.papier_supplementaire),
    produit_promo_texte: commande.produit_promo_texte || '', produit_promo_prix: centsToInput(commande.produit_promo_prix_cents),
    autres_texte: commande.autres_texte || '', autres_prix: centsToInput(commande.autres_prix_cents),
    ruban_id: catalogue.rubans.length === 1 ? String(catalogue.rubans[0].id)
      : catalogue.rubans.some(r => r.id === commande.ruban?.ruban_id) ? String(commande.ruban.ruban_id) : '',
  };
  form.collections = historicalComposition(commande).map(line => {
    const source = catalogue.collections.find(c => c.id === line.collection_id);
    return {
      collection_id: source ? String(source.id) : '', nb_feuilles: line.nb_feuilles,
      papiers: (source?.papiers || []).map(p => ({
        papier_cartonne_id: p.id,
        quantite_base: line.papiers.find(old => old.papier_cartonne_id === p.id)?.quantite_base ?? (form.format_type === 'C' ? 1 : 0),
      })),
    };
  });
  // The old manual price is deliberately not applied to the new composition.
  return form;
}

export function kitPricing(form, catalogue) {
  const errors = {};
  const supplements = {};
  for (const category of ['produit_promo', 'autres']) {
    const text = form[`${category}_texte`].trim();
    const raw = String(form[`${category}_prix`]).trim();
    if (!text && !raw) { supplements[category] = { texte: null, prix_cents: null }; continue; }
    if (!text) errors[`${category}_texte`] = 'Renseignez le libellé du supplément.';
    let price = null;
    try { price = moneyToCents(raw); } catch (error) { errors[`${category}_prix`] = error.message; }
    supplements[category] = { texte: text, prix_cents: price };
  }
  const format = catalogue?.[`prix_${form.format_type}_cents`];
  const automatic = Number.isSafeInteger(format) && !Object.keys(errors).length
    ? format + (form.papier_supplementaire ? OPTION_CENTS : 0)
      + (supplements.produit_promo.prix_cents ?? 0) + (supplements.autres.prix_cents ?? 0)
    : null;
  if (automatic !== null && !Number.isSafeInteger(automatic)) errors.total = 'Le total calculé est trop élevé.';
  let applied = automatic;
  if (form.prix_manuel) {
    try { applied = moneyToCents(form.prix_manuel_euros); }
    catch (error) { errors.prix_manuel_euros = error.message; applied = null; }
  }
  return { automatic, applied, supplements, errors };
}

export function prepareKitPayload(form, catalogue, { originalCatalogueId = null } = {}) {
  const pricing = kitPricing(form, catalogue);
  const errors = { ...pricing.errors };
  if (!Number.isSafeInteger(Number(form.client_id)) || Number(form.client_id) <= 0) errors.client_id = 'Choisissez une cliente.';
  if (!catalogue || catalogue.id !== Number(form.catalogue_id)) errors.catalogue_id = 'Choisissez un catalogue disponible.';
  if (!availableFormats(catalogue, originalCatalogueId).includes(form.format_type)) errors.format_type = 'Choisissez un format disponible dans ce catalogue.';
  if (!PAYMENTS.includes(form.methode_paiement)) errors.methode_paiement = 'Choisissez une méthode de paiement.';
  const isC = form.format_type === 'C';
  if (form.collections.length !== (isC ? 1 : 2)) errors.collections = 'Complétez les collections du format.';
  const seen = new Set();
  for (const [index, line] of form.collections.entries()) {
    const collection = catalogue?.collections.find(c => c.id === Number(line.collection_id));
    if (!collection || seen.has(collection.id)) errors[`collection_${index}`] = 'Choisissez une collection distincte de ce catalogue.';
    if (collection) seen.add(collection.id);
    const expected = isC ? 5 : line.nb_feuilles;
    let total = 0;
    const paperIds = new Set();
    let invalid = isC ? line.nb_feuilles !== 5 : ![2, 3].includes(line.nb_feuilles);
    for (const p of line.papiers) {
      const q = Number(p.quantite_base);
      if (!Number.isInteger(q) || q < (isC ? 1 : 0) || q > expected
        || !collection?.papiers.some(source => source.id === p.papier_cartonne_id) || paperIds.has(p.papier_cartonne_id)) invalid = true;
      paperIds.add(p.papier_cartonne_id);
      total += q;
    }
    if (isC && collection?.papiers.some(p => !paperIds.has(p.id))) invalid = true;
    if (total !== expected || invalid) errors[`papiers_${index}`] = isC
      ? 'Répartissez exactement 5 feuilles, avec au moins un exemplaire de chaque papier.'
      : `Répartissez exactement ${expected} feuilles parmi les papiers de cette collection.`;
  }
  if (!isC && form.collections.reduce((sum, line) => sum + line.nb_feuilles, 0) !== 5) errors.collections = 'Les contributions doivent être complémentaires : 2 + 3.';
  const rubans = catalogue?.rubans || [];
  if (rubans.length === 2 && !rubans.some(r => r.id === Number(form.ruban_id))) errors.ruban_id = 'Choisissez un ruban du catalogue.';
  if (Object.keys(errors).length) return { errors, payload: null, pricing };
  const payload = {
    catalogue_id: catalogue.id, format_type: form.format_type, methode_paiement: form.methode_paiement,
    date_commande: form.date_commande || null, papier_supplementaire: form.papier_supplementaire,
    commande_collections: form.collections.map(line => ({
      collection_id: Number(line.collection_id), nb_feuilles: line.nb_feuilles,
      papiers: line.papiers.filter(p => Number(p.quantite_base) > 0).map(p => ({ papier_cartonne_id: p.papier_cartonne_id, quantite_base: Number(p.quantite_base) })),
    })),
    ruban_id: rubans.length === 1 ? rubans[0].id : rubans.length === 2 ? Number(form.ruban_id) : null,
  };
  for (const [category, supplement] of Object.entries(pricing.supplements)) {
    payload[`${category}_texte`] = supplement.texte;
    payload[`${category}_prix_cents`] = supplement.prix_cents;
  }
  if (form.prix_manuel) payload.prix_applique_cents = pricing.applied;
  if (originalCatalogueId === null) Object.assign(payload, { type: 'kit', client_id: Number(form.client_id) });
  return { errors, payload, pricing };
}
