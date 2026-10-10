import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import * as Vue from 'vue';
import { parse } from '@vue/compiler-sfc';
import { compile } from '@vue/compiler-dom';
import { renderToString } from '@vue/server-renderer';
import { commandeHistoryLink, commandeHistoryDate, formatHistoryDate, commandeHistoryCatalogue } from '../src/utils/client-history.js';

const { descriptor } = parse(fs.readFileSync(new URL('../src/views/ClientsView.vue', import.meta.url), 'utf8'));
const render = new Function('Vue', compile(descriptor.template.content, { mode: 'function' }).code)(Vue);
const client = { id: 1, prenom: 'Éléonore', nom: 'Recette', archive: 0, contacter: 1,
  email: 'cliente@example.test', telephone_raw: '06 12 34 56 78', telephone_e164: '+33612345678',
  adresse: '12 rue des Ateliers', code_postal: '44000', ville: 'Nantes', points_fidelite: 12,
  date_naissance: '1985-04-09', relais_prefere: 'Relais exemple', created_at: '2025-01-09' };
const noop = () => {};
async function renderClients(overrides = {}) {
  const app = Vue.createSSRApp({ render, setup: () => ({
    clientsStore: { clients: [client], loading: false, error: null }, filteredClients: [client],
    archiveFilter: 'actifs', activeCount: 1, archivedCount: 0, filtersExpanded: false,
    searchQuery: '', showOnlyFavorites: false, activeFilterCount: 0, filterSummary: '',
    desktopDetails: true, operationError: '', isViewModalOpen: true, selectedClient: client, detailClientId: client.id,
    commandesLoading: false, commandesError: '', clientCommandes: [{id: 10, type: 'kit', catalogue_titre: 'Été historique', created_at: '2026-07-02 12:30:00', format_type: 'A', reglee: 0, methode_paiement: 'Paypal'}, {id: 11, type: 'hors_kit', date_commande: '2026-08-15', reglee: 1}],
    pointsEditing: false, pointsDraft: '', pointsSaving: false, pointsError: '', pointsNotice: '',
    startPointsEdit: noop, cancelPointsEdit: noop, savePoints: noop,
    archiveError: '', archiveNotice: '', archiving: false, isArchiveDialogOpen: false,
    confirmFormClose: false, discardClientForm: noop, isModalOpen: false, isEditing: false, editingClientId: null, modalTitle: 'Nouveau client', formData: {}, errors: {}, saving: false,
    hasAddress: true, getInitials: () => 'ER', formatMemberSince: () => '1 an', formatDate: () => '9 avril 1985', calculateAge: () => 41,
    commandeHistoryLink, commandeHistoryDate, formatHistoryDate, commandeHistoryCatalogue, favoriteBusy: () => false,
    openCreateModal: noop, selectArchiveTab: noop, onTabKeydown: noop, toggleFilters: noop, resetFilters: noop,
    loadClients: noop, viewClient: noop, toggleFavoriteFromList: noop, toggleFavorite: noop,
    closeViewModal: noop, confirmArchiveFromView: noop, editClientFromView: noop, newOrderForClient: noop,
    closeModal: noop, handleSubmit: noop, archiveClient: noop, ...overrides,
  }) });
  app.config.warnHandler = warning => { if (!warning.startsWith('Property undefined was accessed')) throw new Error(warning); };
  app.component('Layout', { template: '<main><slot /></main>' });
  app.component('RouterLink', { props: ['to'], template: '<a :href="to.path + \'?commande=\' + to.query.commande"><slot /></a>' });
  app.component('Button', { template: '<button><slot /></button>' });
  app.component('FormPanel', { props: ['isOpen'], template: '<section v-if="isOpen"><slot /><footer><slot name="footer" /></footer></section>' });
  app.component('SlidePanel', { props: ['isOpen', 'inline'], template: '<aside v-if="isOpen" :role="inline ? \'region\' : \'dialog\'"><header><slot name="header" /></header><slot /><footer><slot name="footer" /></footer></aside>' });
  for (const name of ['FormInput', 'FormCheckbox', 'EmailDomainInput', 'PhoneInput', 'ConfirmDialog']) app.component(name, { template: '<div></div>' });
  return (await renderToString(app)).replace(/<!--[^]*?-->/g, '');
}

test('la liste de fiches conserve les coordonnées complètes et une sélection native, avec filtres fermés', async () => {
  const html = await renderClients();
  for (const text of ['class="clients-list"', 'class="client-summary"', 'client-open-1', 'cliente@example.test', '06 12 34 56 78', 'aria-selected="true"', 'aria-expanded="false"']) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('<table'));
  assert.ok(html.includes('aria-label="Retirer Éléonore Recette des favoris"'));
  assert.match(html, /id="clients-filter-fields"[^>]*style="display:none;"/);
});

test('la fiche conserve coordonnées utilisables, adresse, fidélité et historique kit/hors kit binaire', async () => {
  const html = await renderClients();
  for (const text of ['mailto:cliente@example.test', 'tel:+33612345678', '12 rue des Ateliers', '44000 Nantes', 'Points fidélité', 'Relais exemple', 'Commande n°10', 'Commande n°11', 'Été historique', '02/07/2026', '15/08/2026', 'Hors kit', 'Réglée', 'En attente']) assert.ok(html.includes(text), text);
});

test('l’historique lie chaque commande à son onglet et masque format/paiement', async () => {
  const html = await renderClients();
  assert.ok(html.includes('href="/commandes/kits?commande=10"'));
  assert.ok(html.includes('href="/commandes/hors-kit?commande=11"'));
  assert.ok(html.includes('<ol class="commandes-timeline"'));
  assert.ok(!html.includes('Format A'));
  assert.ok(!html.includes('Paypal'));
  assert.ok(!html.includes('profile-header'));
  assert.ok(html.includes('Modifier les points fidélité'));
});

test('l’édition de points reste dans la fiche avec erreur accessible et soumission verrouillable', async () => {
  const html = await renderClients({ pointsEditing: true, pointsDraft: '25', pointsError: 'Refus serveur' });
  assert.match(html, /id="client-points-input"[^>]*aria-invalid="true"[^>]*aria-describedby="client-points-feedback"/);
  assert.ok(html.includes('Refus serveur'));
  assert.ok(html.includes('Enregistrer les points fidélité'));
  assert.ok(html.includes('Annuler la modification des points'));
  assert.ok(!html.includes('client-points-edit"'));
  const pending = await renderClients({ pointsEditing: true, pointsDraft: '25', pointsSaving: true });
  assert.match(pending, /id="client-points-input"[^>]*disabled/);
  assert.ok(pending.includes('Enregistrement…'));
  assert.ok(pending.includes('aria-disabled="true"'));
});

test('une cliente archivée reste consultable et restaurable avec création de commande désactivée', async () => {
  const html = await renderClients({ archiveFilter: 'archives', activeCount: 0, archivedCount: 1, selectedClient: {...client, archive: 1}, filteredClients: [{...client, archive: 1}] });
  assert.ok(html.includes('Restaurer'));
  assert.ok(html.includes('Commande n°10'));
  assert.match(html, /<button disabled[^>]*>Nouvelle commande<\/button>/);
});

test('une erreur d’historique laisse la fiche visible et propose une reprise sans fausse liste vide', async () => {
  const html = await renderClients({ commandesError: 'Historique indisponible', clientCommandes: [] });
  assert.ok(html.includes('Historique indisponible'));
  assert.ok(html.includes('Recharger l’historique'));
  assert.ok(html.includes('mailto:cliente@example.test'));
  assert.ok(!html.includes('Aucune commande pour le moment'));
});

test('aucun résultat filtré propose un effacement, sans masquer les onglets ni le signal de filtre', async () => {
  const html = await renderClients({ filteredClients: [], isViewModalOpen: false, activeFilterCount: 1, searchQuery: 'Introuvable', filterSummary: 'Introuvable' });
  for (const text of ['Aucune cliente ne correspond', 'Effacer les filtres', 'clients-tab-actifs', 'Recherche et filtres, Introuvable']) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('<table'));
});
