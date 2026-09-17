const { getCatalogueById, validateComposition } = require('./catalogues');
const v = require('./source-validation');

const fields = [
  'catalogue_id', 'format_type', 'commande_collections', 'ruban_id',
  'papier_supplementaire', 'prix_applique_cents',
  'produit_promo_texte', 'produit_promo_prix_cents', 'autres_texte', 'autres_prix_cents',
  'methode_paiement', 'date_commande'
];

function cents(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) v.invalid(`${field} doit être un entier positif ou nul en centimes`);
  return value;
}

function flag(value, field) {
  if (![true, false, 0, 1].includes(value)) v.invalid(`${field} doit être un booléen ou 0/1`);
  return Number(value);
}

function payment(value, required = false) {
  if (!required && value === null) return null;
  if (!['Paypal', 'chèque', 'virement'].includes(value)) v.invalid('methode_paiement doit être Paypal, chèque ou virement');
  return value;
}

function optionalText(value, field) {
  if (value === null) return null;
  if (typeof value !== 'string') v.invalid(`${field} doit être une chaîne ou null`);
  return value;
}

function supplement(data, category) {
  const text = data[`${category}_texte`] ?? null;
  const price = data[`${category}_prix_cents`] ?? null;
  if (text === null && price === null) return [null, null];
  return [v.name(text, `${category}_texte`), cents(price, `${category}_prix_cents`)];
}

// Valide la composition et prépare des snapshots exclusivement depuis les sources.
// L'appelant englobe lecture, validation et écriture dans une unique transaction.
function buildKit(data, existing = null) {
  const catalogueId = v.id(data.catalogue_id === undefined && existing ? existing.catalogue_id : data.catalogue_id);
  const catalogue = getCatalogueById(catalogueId);
  if (!catalogue) v.invalid('Catalogue non trouvé', 404);
  const sameCatalogue = existing && existing.catalogue_id === catalogueId;
  if (!sameCatalogue && (catalogue.archive || catalogue.statut !== 'publie')) {
    v.invalid('Un nouveau kit requiert un catalogue publié et non archivé', 409);
  }
  const errors = validateComposition(catalogue);
  if (errors.length) v.invalid(`Catalogue incomplet : ${errors.join(' ; ')}`, 409);
  if (!['A', 'B', 'C'].includes(data.format_type)) v.invalid('format_type doit être A, B ou C');

  const lines = data.commande_collections;
  const isC = data.format_type === 'C';
  if (!Array.isArray(lines) || lines.length !== (isC ? 1 : 2)) {
    v.invalid(isC ? 'C requiert exactement une collection' : 'A/B requiert exactement deux collections');
  }
  const seen = new Set();
  const composition = lines.map(line => {
    v.fields(line, ['collection_id', 'nb_feuilles', 'papiers']);
    const id = v.id(line.collection_id);
    if (seen.has(id)) v.invalid('Les collections doivent être distinctes');
    seen.add(id);
    const collection = catalogue.collections.find(col => col.id === id);
    if (!collection) v.invalid('Chaque collection doit appartenir au catalogue');
    const contribution = line.nb_feuilles;
    if (isC ? contribution !== 5 : ![2, 3].includes(contribution)) v.invalid('Contribution nb_feuilles invalide');
    let papers = line.papiers;
    // Avec cinq papiers (ou un seul), C possède une unique composition possible.
    if (papers === undefined && isC && [1, 5].includes(collection.papiers.length)) {
      papers = collection.papiers.map(paper => ({ papier_cartonne_id: paper.id, quantite_base: 5 / collection.papiers.length }));
    }
    if (!Array.isArray(papers) || !papers.length || papers.length > 5) v.invalid('Une composition papiers de 1 à 5 lignes est requise');
    const paperIds = new Set();
    const snapshots = papers.map(paper => {
      v.fields(paper, ['papier_cartonne_id', 'quantite_base']);
      const paperId = v.id(paper.papier_cartonne_id);
      if (paperIds.has(paperId)) v.invalid('Un papier ne peut apparaître deux fois dans la même collection');
      paperIds.add(paperId);
      const source = collection.papiers.find(p => p.id === paperId);
      if (!source) v.invalid('Chaque papier doit appartenir à sa collection');
      if (!Number.isSafeInteger(paper.quantite_base) || paper.quantite_base < 1 || paper.quantite_base > 5) {
        v.invalid('quantite_base doit être un entier entre 1 et 5');
      }
      return { papier_cartonne_id: paperId, papier_nom: source.nom, quantite_base: paper.quantite_base };
    });
    if (snapshots.reduce((sum, p) => sum + p.quantite_base, 0) !== contribution) v.invalid('Le total des papiers doit correspondre à nb_feuilles');
    if (isC && paperIds.size !== collection.papiers.length) v.invalid('C doit contenir au moins un exemplaire de chaque papier de la collection');
    return { collection_id: id, collection_nom: collection.nom, nb_feuilles: contribution, papiers: snapshots };
  });
  if (!isC && composition[0].nb_feuilles + composition[1].nb_feuilles !== 5) v.invalid('A/B requiert une répartition 2 + 3');

  const rubanId = data.ruban_id === undefined || data.ruban_id === null ? null : v.id(data.ruban_id);
  let ruban = null;
  if (catalogue.rubans.length === 0 && rubanId !== null) v.invalid('Ce catalogue ne contient aucun ruban');
  if (catalogue.rubans.length === 1) {
    ruban = catalogue.rubans[0];
    if (rubanId !== null && rubanId !== ruban.id) v.invalid('Le ruban doit appartenir au catalogue');
  } else if (catalogue.rubans.length === 2) {
    ruban = catalogue.rubans.find(r => r.id === rubanId);
    if (!ruban) v.invalid('Un ruban du catalogue doit être choisi');
  }

  const option = flag(data.papier_supplementaire === undefined ? false : data.papier_supplementaire, 'papier_supplementaire');
  const promo = supplement(data, 'produit_promo');
  const other = supplement(data, 'autres');
  const formatPrice = catalogue[`prix_${data.format_type}_cents`];
  const optionPrice = option ? 350 : 0;
  const automaticPrice = cents(formatPrice + optionPrice + (promo[1] ?? 0) + (other[1] ?? 0), 'Prix calculé');
  const manual = data.prix_applique_cents !== undefined;
  const special = catalogue.papier_spe?.trim() || null;
  const embellishment = catalogue.embellissement?.trim() || null;
  return {
    scalars: {
      catalogue_id: catalogue.id, catalogue_titre: catalogue.titre, format_type: data.format_type,
      papier_supplementaire: option, prix_format_cents: formatPrice, prix_option_cents: optionPrice,
      prix_applique_cents: manual ? cents(data.prix_applique_cents, 'prix_applique_cents') : automaticPrice,
      prix_origine: manual ? 'manuelle' : 'automatique',
      papier_spe_nom: special, papier_spe_quantite: Number(Boolean(special)),
      embellissement_nom: embellishment, embellissement_quantite: Number(Boolean(embellishment)),
      produit_promo_texte: promo[0], produit_promo_prix_cents: promo[1], autres_texte: other[0], autres_prix_cents: other[1],
      methode_paiement: payment(data.methode_paiement === undefined ? existing?.methode_paiement : data.methode_paiement, true),
      date_commande: optionalText(data.date_commande === undefined ? existing?.date_commande ?? null : data.date_commande, 'date_commande')
    },
    composition,
    ruban: ruban ? { ruban_id: ruban.id, ruban_nom: ruban.nom } : null
  };
}

module.exports = { fields, buildKit, flag, payment, optionalText };
