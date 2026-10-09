import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import * as Vue from 'vue';
import { parse } from '@vue/compiler-sfc';
import { compile } from '@vue/compiler-dom';
import { renderToString } from '@vue/server-renderer';
import { formatMoney, historicalComposition } from '../src/utils/commande-kit.js';
import { filterCommandes, commandeCatalogueOptions } from '../src/utils/commandes-list.js';

const { descriptor } = parse(fs.readFileSync(new URL('../src/views/CommandesView.vue', import.meta.url), 'utf8'));
const render = new Function('Vue', compile(descriptor.template.content, { mode: 'function' }).code)(Vue);
const kit = { id: 12, type: 'kit', client_prenom: 'Éléonore', client_nom: 'Nom très long sans troncature',
  catalogue_id: 7,
  created_at: '2026-10-09', reglee: 0, format_type: 'A', prix_applique_cents: 1000, prix_origine: 'manuelle',
  prix_format_cents: 1234, prix_option_cents: 350, papier_supplementaire: 1,
  catalogue_titre: 'Titre historique', papier_spe_nom: 'Vélin historique', papier_spe_quantite: 1,
  embellissement_nom: 'Bijou historique', embellissement_quantite: 1,
  produit_promo_texte: 'Offert', produit_promo_prix_cents: 0,
  ruban: { ruban_nom: 'Ruban historique', quantite: 1 },
  commande_collections: [{ id: 2, collection_nom: 'Collection historique', nb_feuilles: 5,
    papiers: [] }], papiers_selectionnes: [{ id: 3, commande_collection_id: 2, nom: 'Papier historique', quantite_base: 5 }] };
const horsKit = { id: 13, type: 'hors_kit', client_prenom: 'Alice', client_nom: 'Recette',
  created_at: '2026-10-09', reglee: 0, montant: 80, methode_paiement: 'Paypal', cadeau_texte: 'Cadeau test', cadeau_valeur: 2.5 };
const noop = () => {};
async function renderCommande(commande, search = '') {
  const visibleCommandes = filterCommandes([kit, horsKit], { type: commande.type, search });
  const app = Vue.createSSRApp({ render, setup: () => ({
    commandesStore: { commandes: [kit, horsKit], loading: false, error: null },
    activeType: commande.type, search, catalogueId: '', hasFilters: Boolean(search), kitCount: 1, horsKitCount: 1, pageCount: 1,
    filtersExpanded: Boolean(search), activeFilterCount: Number(Boolean(search)), filterSummary: search ? `cliente : ${search}` : '', toggleFilters: noop,
    visibleCommandes, catalogueOptions: commandeCatalogueOptions([kit, horsKit]), pageLink: type => type === 'kit' ? '/commandes/kits' : '/commandes/hors-kit',
    setSearch: noop, setCatalogue: noop, resetFilters: noop,
    listHeading: null, desktopDetails: true, isViewPanelOpen: true, selectedCommande: commande, detailCommandeId: commande.id,
    operationError: '', detailError: '', loadingDetail: false, kitComposition: historique(commande),
    isKitFormOpen: false, isHorsKitFormOpen: false, isDeleteDialogOpen: false,
    commandeToDelete: null, markingReglee: false, deletingCommande: false, editingCommande: null,
    formatMoney, formatEuro: value => `${Number(value).toFixed(2)} €`, formatDate: () => '9 oct.', formatDateLong: () => '9 octobre 2026', getClientInitials: () => 'ER',
    openKitForm: noop, openHorsKitForm: noop, viewCommande: noop, closeViewPanel: noop,
    confirmDeleteFromView: noop, editSelectedCommande: noop, marquerReglee: noop,
    onCommandeSaved: noop, deleteCommande: noop
  }) });
  app.config.warnHandler = warning => {
    // Le template compilé en mode function sonde aussi la clé « undefined ».
    if (!warning.startsWith('Property undefined was accessed')) throw new Error(warning);
  };
  app.component('Layout', { template: '<main><slot /></main>' });
  app.component('RouterLink', { props: ['to'], template: '<a :href="to"><slot /></a>' });
  app.component('Button', { template: '<button><slot /></button>' });
  app.component('SlidePanel', { template: '<aside><slot /><footer><slot name="footer" /></footer></aside>' });
  for (const name of ['CommandeKitForm', 'CommandeHorsKitForm', 'ConfirmDialog']) app.component(name, { template: '<div></div>' });
  return renderToString(app);
}
const historique = commande => commande.type === 'kit' ? historicalComposition(commande) : [];

test('la liste de fiches expose les informations réelles et un bouton natif de sélection', async () => {
  const html = await renderCommande(kit);
  for (const text of ['class="commandes-list"', 'class="commande-metadata"', 'aria-pressed="true"', 'Nom très long sans troncature', '#12', 'Kit A', 'En attente']) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('<table'));
  assert.ok(!html.includes('commande-open-13'));
  assert.ok(!html.includes('Restant'));
  assert.ok(html.includes('aria-expanded="false"'));
  assert.ok(html.includes('aria-controls="commandes-filter-fields"'));
  assert.match(html, /id="commandes-filter-fields"[^>]*style="display:none;"/);
});

test('le détail kit conserve snapshots, prix manuel, option et supplément nul', async () => {
  const html = await renderCommande(kit);
  for (const text of ['Titre historique', 'Vélin historique', 'Bijou historique', 'Ruban historique', 'Collection historique', 'Papier historique', '10,00', '12,34', '3,50', '0,00', 'Correction manuelle', '5 de base → 10 à préparer', 'Modifier', 'Supprimer', 'Marquer réglée']) assert.ok(html.includes(text), text);
});

test('une commande réglée conserve le détail et retire les trois actions de mutation', async () => {
  for (const commande of [kit, horsKit]) {
    const html = await renderCommande({ ...commande, reglee: 1 });
    assert.ok(html.includes('Commande réglée : prix et composition figés.'));
    for (const text of ['>Modifier<', '>Supprimer<', 'Marquer réglée']) assert.ok(!html.includes(text), text);
  }
});

test('le détail hors-kit conserve montant, paiement et cadeau', async () => {
  const html = await renderCommande(horsKit);
  for (const text of ['Détails hors kit', '80.00', 'Paypal', 'Cadeau test', '2.50']) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('commande-open-12'));
  assert.ok(!html.includes('id="commande-catalogue-filter"'));
});

test('aucun résultat de recherche propose une sortie et conserve les contrôles', async () => {
  const html = await renderCommande(kit, 'Introuvable');
  assert.ok(html.includes('Aucune commande ne correspond'));
  assert.ok(html.includes('Effacer les filtres'));
  assert.ok(html.includes('id="commande-client-search"'));
  assert.ok(!html.includes('<table'));
});
