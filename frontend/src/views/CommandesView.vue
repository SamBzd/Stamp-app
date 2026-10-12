<template>
  <Layout contained title="Commandes" subtitle="Des kits choisis aux commandes réglées, tout l’atelier en un regard.">
    <div class="commandes-view form-workspace-view">
      <div class="commandes-toolbar">
        <div class="header-actions">
          <Button id="commandes-create-kit" variant="secondary" :disabled="isKitFormOpen || isHorsKitFormOpen" @click="openKitForm">
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </template>
            Nouveau kit
          </Button>
          <Button id="commandes-create-hors-kit" :disabled="isKitFormOpen || isHorsKitFormOpen" @click="openHorsKitForm">
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </template>
            Nouvelle hors kit
          </Button>
        </div>
      </div>

      <p v-if="operationError" class="form-error-global" role="alert">{{ operationError }}</p>

      <div class="commandes-workspace form-workspace" :class="{ 'form-workspace-editing': isKitFormOpen || isHorsKitFormOpen }">
      <section class="commandes-list-panel" aria-labelledby="commandes-list-title">
        <header id="commandes-list-header" ref="listHeading" class="commandes-list-heading" tabindex="-1">
          <h2 id="commandes-list-title" class="sr-only">{{ activeType === 'kit' ? 'Commandes kits' : 'Commandes hors kit' }}</h2>
          <nav class="commandes-pages" aria-label="Types de commandes">
            <router-link :to="pageLink('kit')" :aria-current="activeType === 'kit' ? 'page' : undefined">Kits <span>{{ kitCount }}</span></router-link>
            <router-link :to="pageLink('hors_kit')" :aria-current="activeType === 'hors_kit' ? 'page' : undefined">Hors kit <span>{{ horsKitCount }}</span></router-link>
          </nav>
          <div class="commandes-list-tools">
            <p role="status">{{ visibleCommandes.length }} / {{ pageCount }}<span class="sr-only"> commandes affichées</span></p>
            <button id="commandes-filter-toggle" type="button" class="commandes-filter-toggle" :aria-expanded="filtersExpanded" aria-controls="commandes-filter-fields" :aria-label="filterSummary ? `Recherche et filtres, ${filterSummary}` : 'Recherche et filtres'" @click="toggleFilters">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
              Filtres <span v-if="activeFilterCount" class="filter-count">{{ activeFilterCount }}</span>
              <svg class="filter-chevron" :class="{ expanded: filtersExpanded }" aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m4 6 4 4 4-4"/></svg>
            </button>
          </div>
        </header>
        <div v-show="filtersExpanded" id="commandes-filter-fields" class="commandes-filters" role="region" aria-label="Recherche et filtres">
          <div class="commande-filter">
            <label for="commande-client-search">Cliente</label>
            <input id="commande-client-search" type="search" :value="search" @input="setSearch($event.target.value)" placeholder="Prénom ou nom…" autocomplete="off" />
          </div>
          <div v-if="activeType === 'kit'" class="commande-filter">
            <label for="commande-catalogue-filter">Catalogue</label>
            <select id="commande-catalogue-filter" :value="catalogueId" @change="setCatalogue($event.target.value)">
              <option value="">Tous les catalogues</option>
              <option v-for="catalogue in catalogueOptions" :key="catalogue.value" :value="catalogue.value">{{ catalogue.label }}</option>
            </select>
          </div>
          <button v-if="hasFilters" type="button" class="commande-filter-reset" @click="resetFilters">Effacer les filtres</button>
        </div>
      <div id="commandes-list-content">
      <!-- States -->
      <div v-if="commandesStore.loading" class="loading-state" role="status">
        <div class="loading-spinner"></div>
        <span class="loading-state-text">Chargement des commandes...</span>
      </div>

      <div v-else-if="commandesStore.error" class="error-state" role="alert">
        <p>{{ commandesStore.error }}</p>
        <Button variant="secondary" @click="commandesStore.fetchCommandes()">Réessayer</Button>
      </div>

      <div v-else-if="pageCount === 0" class="empty-state">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
        </div>
        <h3 class="empty-state-title">{{ activeType === 'kit' ? 'Aucune commande kit' : 'Aucune commande hors kit' }}</h3>
        <p class="empty-state-description">Commencez par créer votre première commande</p>
        <div class="empty-state-actions">
          <Button variant="secondary" :disabled="isKitFormOpen || isHorsKitFormOpen" @click="openKitForm">Nouveau kit</Button>
          <Button :disabled="isKitFormOpen || isHorsKitFormOpen" @click="openHorsKitForm">Nouvelle hors kit</Button>
        </div>
      </div>

      <div v-else-if="visibleCommandes.length === 0" class="empty-state">
        <h3 class="empty-state-title">Aucune commande ne correspond</h3>
        <p class="empty-state-description">Essaie un autre nom ou efface les filtres pour retrouver les commandes.</p>
        <Button variant="secondary" @click="resetFilters">Effacer les filtres</Button>
      </div>

      <ul v-else class="commandes-list" aria-label="Commandes">
        <li v-for="commande in visibleCommandes" :key="commande.id">
          <button type="button" class="commande-open" :id="`commande-open-${commande.id}`" :aria-label="`Voir la commande #${commande.id} de ${commande.client?.prenom || commande.client_prenom || ''} ${commande.client?.nom || commande.client_nom || ''}`" :aria-pressed="isViewPanelOpen && detailCommandeId === commande.id" :disabled="isKitFormOpen || isHorsKitFormOpen" @click="viewCommande(commande)">
            <span class="commande-summary"><span class="client-name">{{ commande.client?.prenom || commande.client_prenom }} {{ commande.client?.nom || commande.client_nom }}</span><span class="commande-list-status" :class="{ 'commande-list-reglee': commande.reglee }">{{ commande.reglee ? 'Réglée' : 'En attente' }}</span></span>
            <span class="commande-metadata"><span class="commande-reference">#{{ commande.id }} · {{ formatDate(commande.created_at) }}</span><span>{{ commande.type === 'kit' ? `Kit ${commande.format_type || ''}` : 'Hors kit' }}</span><span v-if="commande.type === 'kit' && commande.catalogue_titre">{{ commande.catalogue_titre }}</span><span class="commande-list-price">{{ commande.type === 'kit' ? formatMoney(commande.prix_applique_cents) : formatEuro(commande.montant) }}</span></span>
            <svg class="commande-open-chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>
          </button>
        </li>
      </ul>
      </div>
      </section>
      <aside v-if="!isViewPanelOpen && !isKitFormOpen && !isHorsKitFormOpen" class="commande-placeholder" aria-label="Détail de la commande">
        <h2>Le détail de ta commande</h2><p>Sélectionne une fiche pour consulter sa composition, son prix et son règlement.</p>
      </aside>

      <!-- SlidePanel détail commande -->
      <SlidePanel
        :is-open="isViewPanelOpen && !isKitFormOpen && !isHorsKitFormOpen"
        :inline="desktopDetails"
        :scroll-footer="desktopDetails"
        :return-focus-id="visibleCommandes.some(commande => commande.id === detailCommandeId) ? `commande-open-${detailCommandeId}` : 'commandes-list-header'"
        :title="selectedCommande ? `Commande #${selectedCommande.id}` : 'Détail de la commande'"
        @close="closeViewPanel"
        max-width="540px"
      >
        <template #header>
          <div class="commande-panel-heading">
            <h2>{{ selectedCommande ? `Commande #${selectedCommande.id}` : 'Détail de la commande' }}</h2>
            <div v-if="selectedCommande" class="commande-panel-badges">
              <span :class="['type-badge', selectedCommande.type === 'kit' ? 'type-badge-kit' : 'type-badge-hors-kit']">{{ selectedCommande.type === 'kit' ? 'Kit' : 'Hors kit' }}</span>
              <span :class="['status-badge-lg', selectedCommande.reglee ? 'status-badge-regle' : 'status-badge-attente']">{{ selectedCommande.reglee ? 'Réglée' : 'En attente' }}</span>
            </div>
          </div>
        </template>
        <div v-if="detailError" class="form-error-global" role="alert"><p>{{ detailError }}</p><Button v-if="detailCommandeId" variant="secondary" @click="viewCommande({ id: detailCommandeId })">Recharger le détail</Button></div>
        <div v-else-if="loadingDetail" class="loading-state" role="status">
          <div class="loading-spinner"></div>
          <span class="loading-state-text">Chargement du détail…</span>
        </div>
        <div v-if="selectedCommande" class="commande-detail">
          <!-- Client -->
          <div class="detail-client atelier-glass">
            <div class="client-avatar-md">
              {{ getClientInitials(selectedCommande) }}
            </div>
            <div class="detail-client-info">
              <span class="detail-client-name">
                {{ selectedCommande.client?.prenom || selectedCommande.client_prenom }}
                {{ selectedCommande.client?.nom || selectedCommande.client_nom }}
              </span>
              <span class="detail-client-label">
                {{ selectedCommande.type === 'kit' ? formatMoney(selectedCommande.prix_applique_cents) : formatEuro(selectedCommande.montant) }}
                · {{ selectedCommande.type === 'kit' ? (selectedCommande.prix_origine === 'manuelle' ? 'Correction manuelle' : 'Prix automatique') : 'Hors kit' }}
              </span>
            </div>
          </div>

          <!-- Infos kit -->
          <div v-if="selectedCommande.type === 'kit'" class="detail-section">
            <h3 class="detail-section-title">Détails du kit</h3>
            <div class="detail-rows">
              <div class="detail-row">
                <span class="detail-label">Format</span>
                <span :class="['format-badge', `format-badge-${selectedCommande.format_type?.toLowerCase()}`]">
                  {{ selectedCommande.format_type }}
                </span>
              </div>
              <div v-if="selectedCommande.methode_paiement" class="detail-row">
                <span class="detail-label">Paiement</span>
                <span>{{ selectedCommande.methode_paiement }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Catalogue</span>
                <span>{{ selectedCommande.catalogue_titre }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Prix appliqué</span>
                <span class="detail-price">{{ formatMoney(selectedCommande.prix_applique_cents) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Origine du prix</span>
                <span>{{ selectedCommande.prix_origine === 'manuelle' ? 'Correction manuelle' : 'Automatique' }}</span>
              </div>
              <div class="detail-row"><span class="detail-label">Tarif historique du format</span><span>{{ formatMoney(selectedCommande.prix_format_cents) }}</span></div>
              <div class="detail-row"><span class="detail-label">Option historique</span><span>{{ formatMoney(selectedCommande.prix_option_cents) }}</span></div>
              <div v-if="selectedCommande.date_commande" class="detail-row"><span class="detail-label">Date commande</span><span>{{ formatDateLong(selectedCommande.date_commande) }}</span></div>
              <div v-if="selectedCommande.papier_supplementaire" class="detail-row">
                <span class="detail-label">Papier suppl.</span>
                <span class="badge badge-neutral">Oui</span>
              </div>
              <div v-if="selectedCommande.produit_promo_texte" class="detail-row">
                <span class="detail-label">Promo</span>
                <span>{{ selectedCommande.produit_promo_texte }}
                  <span v-if="selectedCommande.produit_promo_prix_cents !== null"> — {{ formatMoney(selectedCommande.produit_promo_prix_cents) }}</span>
                </span>
              </div>
              <div v-if="selectedCommande.autres_texte" class="detail-row">
                <span class="detail-label">Autres</span>
                <span>{{ selectedCommande.autres_texte }}
                  <span v-if="selectedCommande.autres_prix_cents !== null"> — {{ formatMoney(selectedCommande.autres_prix_cents) }}</span>
                </span>
              </div>
            </div>

            <div v-if="selectedCommande.ruban" class="detail-row">
              <span class="detail-label">Ruban</span>
              <span>{{ selectedCommande.ruban.ruban_nom }} ×{{ selectedCommande.ruban.quantite }}</span>
            </div>
            <div v-if="selectedCommande.papier_spe_nom" class="detail-row">
              <span class="detail-label">Papier spécial</span>
              <span>{{ selectedCommande.papier_spe_nom }} ×{{ selectedCommande.papier_spe_quantite }}</span>
            </div>
            <div v-if="selectedCommande.embellissement_nom" class="detail-row">
              <span class="detail-label">Embellissement</span>
              <span>{{ selectedCommande.embellissement_nom }} ×{{ selectedCommande.embellissement_quantite }}</span>
            </div>

            <!-- Collections et papiers : exclusivement les snapshots de la commande -->
            <div v-if="kitComposition.length" class="detail-collections">
              <span class="detail-label">Collections</span>
              <div class="collections-chips">
                <span
                  v-for="cc in kitComposition"
                  :key="cc.id"
                  class="collection-chip"
                >
                  {{ cc.collection_nom }}
                  <span class="chip-count">{{ cc.nb_feuilles }} de base → {{ cc.nb_feuilles * (selectedCommande.papier_supplementaire ? 2 : 1) }} à préparer</span>
                </span>
              </div>
            </div>

            <div v-for="cc in kitComposition" :key="`papers-${cc.id}`" class="detail-papiers">
              <span class="detail-label">Papiers — {{ cc.collection_nom }}</span>
              <div class="papiers-list">
                <span
                  v-for="p in cc.papiers"
                  :key="p.id"
                  class="papier-chip"
                >
                  {{ p.nom }} : {{ p.quantite_base }} de base → {{ p.quantite_finale }} à préparer
                </span>
              </div>
            </div>
          </div>

          <!-- Infos hors kit -->
          <div v-else class="detail-section">
            <h3 class="detail-section-title">Détails hors kit</h3>
            <div class="detail-rows">
              <div class="detail-row">
                <span class="detail-label">Montant</span>
                <span class="detail-price">{{ formatEuro(selectedCommande.montant) }}</span>
              </div>
              <div v-if="selectedCommande.methode_paiement" class="detail-row">
                <span class="detail-label">Paiement</span>
                <span>{{ selectedCommande.methode_paiement }}</span>
              </div>
              <div v-if="selectedCommande.date_commande" class="detail-row">
                <span class="detail-label">Date commande</span>
                <span>{{ formatDate(selectedCommande.date_commande) }}</span>
              </div>
              <div v-if="selectedCommande.cadeau_texte" class="detail-row">
                <span class="detail-label">Cadeau</span>
                <span>{{ selectedCommande.cadeau_texte }}
                  <span v-if="selectedCommande.cadeau_valeur !== null"> — {{ formatEuro(selectedCommande.cadeau_valeur) }}</span>
                </span>
              </div>
            </div>
          </div>

          <div class="detail-row detail-date-row">
            <span class="detail-label">Créée le</span>
            <span>{{ formatDateLong(selectedCommande.created_at) }}</span>
          </div>
        </div>

        <template #footer>
          <p v-if="selectedCommande?.reglee" class="detail-label">Commande réglée : prix et composition figés.</p>
          <Button
            v-if="selectedCommande && !selectedCommande.reglee"
            variant="danger"
            :disabled="markingReglee"
            @click="confirmDeleteFromView"
          >Supprimer</Button>
          <Button
            v-if="selectedCommande && !selectedCommande.reglee"
            variant="secondary"
            :disabled="markingReglee"
            @click="editSelectedCommande"
          >Modifier</Button>
          <Button
            v-if="selectedCommande && !selectedCommande.reglee"
            @click="marquerReglee"
            :loading="markingReglee"
          >
            Marquer réglée
          </Button>
        </template>
      </SlidePanel>

      <div class="form-editor-slot" v-show="isKitFormOpen || isHorsKitFormOpen">
      <!-- Formulaire Kit -->
      <CommandeKitForm
        :is-open="isKitFormOpen" :return-focus-id="editingCommande ? `commande-open-${editingCommande.id}` : 'commandes-create-kit'"
        :commande="editingCommande"
        @close="isKitFormOpen = false"
        @saved="onCommandeSaved"
      />

      <!-- Modal Hors Kit -->
      <CommandeHorsKitForm
        :is-open="isHorsKitFormOpen" :return-focus-id="editingCommande ? `commande-open-${editingCommande.id}` : 'commandes-create-hors-kit'"
        :commande="editingCommande"
        @close="isHorsKitFormOpen = false"
        @saved="onCommandeSaved"
      />

      </div>
      </div>

      <!-- Confirm Delete -->
      <ConfirmDialog
        :is-open="isDeleteDialogOpen"
        title="Supprimer la commande"
        :message="`Supprimer la commande #${commandeToDelete?.id} ? Cette action est irréversible.`"
        confirm-text="Supprimer"
        variant="danger"
        :loading="deletingCommande"
        @confirm="deleteCommande"
        @cancel="isDeleteDialogOpen = false"
      />
    </div>
  </Layout>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import '../styles/form-workspace.css';
import Layout from '../components/Layout.vue';
import SlidePanel from '../components/SlidePanel.vue';
import Button from '../components/Button.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import CommandeKitForm from '../components/CommandeKitForm.vue';
import CommandeHorsKitForm from '../components/CommandeHorsKitForm.vue';
import { useCommandesStore } from '../stores/commandes';
import { useStocksStore } from '../stores/stocks';
import { useClientsStore } from '../stores/clients';
import { formatMoney, historicalComposition } from '../utils/commande-kit';
import { filterCommandes, commandeCatalogueOptions } from '../utils/commandes-list';

const desktopMedia = window.matchMedia('(min-width: 901px)');
const desktopDetails = ref(desktopMedia.matches);
const updateDesktopDetails = event => { desktopDetails.value = event.matches; };
onMounted(() => desktopMedia.addEventListener('change', updateDesktopDetails));
onUnmounted(() => desktopMedia.removeEventListener('change', updateDesktopDetails));

const commandesStore = useCommandesStore();
const stocksStore = useStocksStore();
const clientsStore = useClientsStore();
const route = useRoute();
const router = useRouter();

const isKitFormOpen = ref(false);
const isHorsKitFormOpen = ref(false);
const isViewPanelOpen = ref(false);
const isDeleteDialogOpen = ref(false);
const selectedCommande = ref(null);
const commandeToDelete = ref(null);
const markingReglee = ref(false);
const deletingCommande = ref(false);
const editingCommande = ref(null);
const detailError = ref('');
const loadingDetail = ref(false);
const operationError = ref('');
const detailCommandeId = ref(null);
const listHeading = ref(null);
let detailGeneration = 0;
let initialized = false;

const activeType = computed(() => route.meta.commandeType || 'kit');
const filters = ref({ kit: { search: '', catalogueId: '' }, hors_kit: { search: '' } });
const filtersExpanded = ref(false);
const search = computed(() => filters.value[activeType.value].search);
const catalogueId = computed(() => filters.value.kit.catalogueId);
const kitCount = computed(() => commandesStore.commandes.filter(commande => commande.type === 'kit').length);
const horsKitCount = computed(() => commandesStore.commandes.filter(commande => commande.type === 'hors_kit').length);
const pageCount = computed(() => activeType.value === 'kit' ? kitCount.value : horsKitCount.value);
const visibleCommandes = computed(() => filterCommandes(commandesStore.commandes, { type: activeType.value, ...filters.value[activeType.value] }));
const catalogueOptions = computed(() => commandeCatalogueOptions(commandesStore.commandes));
const hasFilters = computed(() => Boolean(search.value || (activeType.value === 'kit' && catalogueId.value)));
const activeFilterCount = computed(() => Number(Boolean(search.value.trim())) + Number(activeType.value === 'kit' && Boolean(catalogueId.value)));
const filterSummary = computed(() => [
  search.value.trim() ? `cliente : ${search.value.trim()}` : '',
  activeType.value === 'kit' && catalogueId.value ? `catalogue : ${catalogueOptions.value.find(option => option.value === catalogueId.value)?.label || catalogueId.value}` : '',
].filter(Boolean).join(', '));
const toggleFilters = async () => {
  filtersExpanded.value = !filtersExpanded.value;
  if (filtersExpanded.value) {
    await nextTick();
    document.getElementById('commande-client-search')?.focus();
  }
};
watch([catalogueOptions, () => commandesStore.loading], ([options, loading]) => {
  if (!loading && catalogueId.value && !options.some(option => option.value === catalogueId.value)) {
    filters.value.kit.catalogueId = '';
  }
});
const pageLink = type => {
  const query = { ...route.query };
  delete query.commande;
  return { path: type === 'kit' ? '/commandes/kits' : '/commandes/hors-kit', query };
};
const resetFilters = async () => {
  filters.value[activeType.value] = activeType.value === 'kit' ? { search: '', catalogueId: '' } : { search: '' };
  await nextTick();
  document.getElementById(filtersExpanded.value ? 'commande-client-search' : 'commandes-filter-toggle')?.focus();
};
const dismissFilteredDetail = async () => {
  if (!isViewPanelOpen.value || visibleCommandes.value.some(commande => commande.id === detailCommandeId.value)) return;
  const focusedFilter = document.activeElement;
  await closeViewPanel();
  await nextTick();
  if (focusedFilter?.isConnected) focusedFilter.focus();
};
const setSearch = value => { filters.value[activeType.value].search = value; void dismissFilteredDetail(); };
const setCatalogue = value => { filters.value.kit.catalogueId = value; void dismissFilteredDetail(); };
const revealCommande = async commande => {
  // Un lien historique ou une création depuis l’autre page ouvre le bon tableau.
  if (!filterCommandes([commande], { type: commande.type, ...filters.value[commande.type] }).length) {
    filters.value[commande.type] = commande.type === 'kit' ? { search: '', catalogueId: '' } : { search: '' };
  }
  const path = commande.type === activeType.value ? route.path : pageLink(commande.type).path;
  await router.replace({ path, query: { ...route.query, commande: String(commande.id) } });
};

const kitComposition = computed(() => selectedCommande.value?.type === 'kit'
  ? historicalComposition(selectedCommande.value)
  : []);

const openKitForm = () => {
  if (isKitFormOpen.value || isHorsKitFormOpen.value) return;
  editingCommande.value = null;
  isKitFormOpen.value = true;
};
const openHorsKitForm = () => {
  if (isKitFormOpen.value || isHorsKitFormOpen.value) return;
  editingCommande.value = null;
  isHorsKitFormOpen.value = true;
};

const onCommandeSaved = async (commande) => {
  operationError.value = '';
  if (commande) {
    ++detailGeneration;
    detailCommandeId.value = commande.id;
    selectedCommande.value = commande;
    isViewPanelOpen.value = true;
    detailError.value = '';
    await revealCommande(commande);
  }
  editingCommande.value = null;
  await refreshDependentData();
};

const refreshDependentData = async () => {
  // Ces stores peuvent déjà être affichés dans une autre vue : rafraîchir leurs
  // snapshots évite de laisser fournitures, bilan ou fidélité avec des données périmées.
  const requests = [stocksStore.fetchWorkflow(), clientsStore.fetchClients()];
  if (stocksStore.bilan?.mois) requests.push(stocksStore.fetchBilan(stocksStore.bilan.mois));
  await Promise.allSettled(requests);
};

const getClientInitials = (commande) => {
  const prenom = commande.client?.prenom || commande.client_prenom || '';
  const nom = commande.client?.nom || commande.client_nom || '';
  return ((prenom[0] || '') + (nom[0] || '')).toUpperCase() || '?';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
};

const formatDateLong = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
};

const formatEuro = (amount) => amount === undefined || amount === null
  ? '—'
  : `${Number(amount).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\u00a0€`;

const viewCommande = async (commande) => {
  const generation = ++detailGeneration;
  detailCommandeId.value = commande.id;
  detailError.value = '';
  loadingDetail.value = true;
  selectedCommande.value = null;
  isViewPanelOpen.value = true;
  try {
    const detail = await commandesStore.fetchCommande(commande.id);
    if (generation !== detailGeneration || !isViewPanelOpen.value) return;
    selectedCommande.value = detail;
    if (route.query.commande !== String(commande.id) || detail.type !== activeType.value) {
      await revealCommande(detail);
    }
  } catch (error) {
    if (generation === detailGeneration) detailError.value = error.message || 'Impossible de charger le détail complet de cette commande.';
  } finally {
    if (generation === detailGeneration) loadingDetail.value = false;
  }
};

const closeViewPanel = async () => {
  if (markingReglee.value) return;
  ++detailGeneration;
  loadingDetail.value = false;
  isViewPanelOpen.value = false;
  selectedCommande.value = null;
  detailError.value = '';
  if (route.query.commande) {
    const query = { ...route.query };
    delete query.commande;
    await router.replace({ path: route.path, query });
  }
};

const marquerReglee = async () => {
  if (!selectedCommande.value || selectedCommande.value.reglee || markingReglee.value) return;
  markingReglee.value = true;
  try {
    operationError.value = '';
    const updated = await commandesStore.markCommandeReglee(selectedCommande.value.id);
    selectedCommande.value = updated;
    await refreshDependentData();
  } catch (error) {
    detailError.value = error.message || 'Impossible de marquer cette commande réglée.';
  } finally {
    markingReglee.value = false;
  }
};

const confirmDeleteFromView = async () => {
  if (!selectedCommande.value || selectedCommande.value.reglee || markingReglee.value) return;
  commandeToDelete.value = selectedCommande.value;
  await closeViewPanel();
  isDeleteDialogOpen.value = true;
};

const editSelectedCommande = async () => {
  if (!selectedCommande.value || selectedCommande.value.reglee || markingReglee.value) return;
  editingCommande.value = selectedCommande.value;
  await closeViewPanel();
  if (editingCommande.value.type === 'kit') isKitFormOpen.value = true;
  else isHorsKitFormOpen.value = true;
};

const deleteCommande = async () => {
  if (!commandeToDelete.value || commandeToDelete.value.reglee || deletingCommande.value) return;
  deletingCommande.value = true;
  try {
    operationError.value = '';
    await commandesStore.deleteCommande(commandeToDelete.value.id);
    await refreshDependentData();
  } catch (error) {
    operationError.value = error.message || 'Impossible de supprimer cette commande.';
  } finally {
    deletingCommande.value = false;
    isDeleteDialogOpen.value = false;
    commandeToDelete.value = null;
    await nextTick();
    listHeading.value?.focus();
  }
};

const syncDetailFromRoute = async () => {
  const id = Number(route.query.commande);
  if (Number.isInteger(id) && id > 0) {
    if (detailCommandeId.value !== id || !isViewPanelOpen.value) await viewCommande({ id });
  } else if (isViewPanelOpen.value) {
    await closeViewPanel();
  }
};
watch(() => route.fullPath, () => { if (initialized) void syncDetailFromRoute(); });
onMounted(async () => {
  await commandesStore.fetchCommandes();
  initialized = true;
  await syncDetailFromRoute();
});
</script>

<style scoped>
.commandes-view { width: 100%; min-width: 0; }
.commandes-pages { display: flex; gap: 16px; }
.commandes-pages a { display: inline-flex; align-items: center; gap: 6px; min-height: 56px; padding: 12px 6px; border-bottom: 2px solid transparent; color: var(--text-secondary); font-size: var(--font-size-sm); text-decoration: none; }
.commandes-pages a:hover { color: var(--primary); border-bottom-color: var(--border); }
.commandes-pages a[aria-current="page"] { color: var(--primary); border-bottom-color: var(--primary); font-weight: var(--font-weight-semibold); }
.commandes-pages span { font-variant-numeric: tabular-nums; font-size: var(--font-size-xs); }
.commandes-list-tools { display: flex; align-items: center; gap: 12px; }
.commandes-list-tools > p { color: var(--text-secondary); font-size: var(--font-size-xs); font-variant-numeric: tabular-nums; white-space: nowrap; }
.commandes-filter-toggle { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 8px; border: 0; border-radius: 6px; background: transparent; color: var(--text-secondary); font: inherit; font-size: var(--font-size-xs); cursor: pointer; }
.commandes-filter-toggle:hover, .commandes-filter-toggle[aria-expanded="true"] { color: var(--primary); background: var(--primary-light); }
.commandes-filter-toggle > svg { width: 17px; height: 17px; }
.commandes-filter-toggle .filter-chevron { width: 12px; height: 12px; }
.filter-chevron.expanded { transform: rotate(180deg); }
.filter-count { min-width: 17px; padding: 1px 4px; border-radius: 4px; background: var(--primary); color: var(--primary-foreground); text-align: center; font-variant-numeric: tabular-nums; }
.commandes-filters { display: flex; align-items: end; flex-wrap: wrap; gap: 12px; padding: 14px 18px; border-bottom: 1px solid var(--border-light); }
.commande-filter { display: grid; gap: 6px; flex: 1 1 180px; min-width: 0; }
.commande-filter label { color: var(--text-secondary); font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); }
.commande-filter input, .commande-filter select { width: 100%; min-width: 0; min-height: 44px; padding: 10px 12px; background: var(--card); border: 1.5px solid var(--border); border-radius: 6px; color: var(--text-primary); font: inherit; font-size: var(--font-size-sm); }
.commande-filter-reset { min-height: 44px; padding: 8px 0; border: 0; background: transparent; color: var(--primary); font: inherit; font-size: var(--font-size-xs); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.commandes-toolbar { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: var(--spacing-4); margin-bottom: var(--spacing-4); }
.header-actions, .empty-state-actions { display: flex; flex-wrap: wrap; gap: var(--spacing-3); }
.commandes-workspace { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(320px, 1fr); gap: var(--spacing-4); align-items: start; }
.commandes-list-panel, .commande-placeholder { min-width: 0; background: var(--card); border-radius: var(--border-radius-xl); box-shadow: var(--shadow-sm); }
.commandes-list-panel { overflow: hidden; }
.commandes-list-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0 12px; padding: 0 14px; border-bottom: 1px solid var(--border-light); }
.commande-placeholder { display: grid; gap: var(--spacing-3); padding: 24px 18px; }
.commande-placeholder h2 { color: var(--primary); font-size: var(--font-size-lg); }
.commande-placeholder p { color: var(--text-secondary); line-height: 1.65; }
.commandes-list { list-style: none; margin: 0; padding: 0; }
.commandes-list li + li { border-top: 1px solid var(--border-light); }
.commande-open { position: relative; display: grid; align-content: center; min-height: 72px; gap: 6px; width: 100%; padding: 12px 44px 12px 20px; border: 0; border-radius: 0; background: var(--card); color: var(--text-primary); text-align: left; font: inherit; cursor: pointer; }
.commande-open:hover { background: var(--surface-hover); }
.commande-open[aria-pressed="true"] { background: var(--surface-selected); box-shadow: inset 3px 0 var(--primary); }
.commande-open:focus-visible { outline-offset: -4px; }
.commande-summary, .commande-metadata { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 12px; }
.client-name { font-size: var(--font-size-base); font-weight: 600; color: var(--primary); overflow-wrap: anywhere; }
.commande-list-status, .commande-metadata { color: var(--text-secondary); font-size: var(--font-size-xs); }
.commande-list-reglee { color: var(--success-dark); }
.commande-metadata > span { min-width: 0; overflow-wrap: anywhere; }
.commande-metadata > span + span::before { content: '·'; margin-right: 12px; color: var(--text-secondary); font-weight: 400; }
.commande-list-price { color: var(--text-primary); font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
.commande-open-chevron { position: absolute; top: calc(50% - 9px); right: 18px; width: 18px; height: 18px; color: var(--primary); }
.form-error-global { margin: var(--spacing-4) 0; padding: var(--feedback-padding); border-radius: var(--feedback-radius); background: var(--error-light); color: var(--error-dark); overflow-wrap: anywhere; }
.status-badge, .status-badge-lg, .type-badge { display: inline-flex; padding: 4px 8px; border-radius: var(--border-radius-sm); font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); }
.status-badge-regle { background: var(--success-light); color: var(--success-dark); }
.status-badge-attente { background: var(--warning-light); color: var(--warning-dark); }
.type-badge-kit, .type-badge-hors-kit { background: var(--primary-light); color: var(--primary); }
.commande-detail { display: grid; gap: var(--spacing-4); min-width: 0; }
.commande-panel-heading { display: grid; gap: 6px; min-width: 0; }
.commande-panel-heading h2 { color: var(--primary); font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); overflow-wrap: anywhere; }
.commande-panel-badges { display: flex; flex-wrap: wrap; gap: 6px; }
.commandes-workspace :deep(.slide-panel-header) { gap: 12px; }
.commandes-workspace :deep(.slide-panel-inline .slide-panel-body) { padding-top: 18px; }
.detail-client { display: flex; align-items: center; gap: var(--spacing-3); padding: 16px 14px; border-radius: var(--atelier-card-radius); }
.client-avatar-md { display: grid; place-items: center; flex: 0 0 36px; height: 36px; border-radius: var(--border-radius-sm); color: var(--primary); background: var(--primary-light); font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); }
.detail-client-info { display: grid; gap: 4px; min-width: 0; }
.detail-client-name { overflow-wrap: anywhere; color: var(--primary); font-size: 21px; font-weight: var(--font-weight-semibold); line-height: 1.3; }
.detail-client-label { font-size: var(--font-size-xs); color: var(--text-secondary); }
.detail-section { display: grid; gap: var(--spacing-3); }
.detail-section-title { font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--primary); }
.detail-rows { display: grid; }
.detail-row { display: flex; justify-content: space-between; align-items: baseline; gap: var(--spacing-3); padding: 9px 0; border-bottom: 1px solid var(--border-light); font-size: var(--font-size-sm); }
.detail-row > * { min-width: 0; overflow-wrap: anywhere; }
.detail-row > :last-child { text-align: right; font-variant-numeric: tabular-nums; }
.detail-label { color: var(--text-secondary); font-size: var(--font-size-sm); }
.detail-price { color: var(--primary); font-weight: var(--font-weight-semibold); }
.format-badge { display: inline-flex; padding: 3px 8px; border-radius: var(--border-radius-sm); background: var(--primary-light); color: var(--primary); font-weight: var(--font-weight-semibold); }
.detail-collections, .detail-papiers { display: grid; gap: var(--spacing-2); }
.collections-chips, .papiers-list { display: grid; gap: var(--spacing-2); }
.collection-chip, .papier-chip { display: block; padding: 8px 0; border-bottom: 1px solid var(--border-light); color: var(--text-primary); font-size: var(--font-size-sm); overflow-wrap: anywhere; }
.chip-count { display: block; padding-top: 4px; color: var(--text-secondary); font-size: var(--font-size-xs); }
@media (max-width: 900px) {
  .commandes-workspace { grid-template-columns: 1fr; }
  .commande-placeholder { display: none; }
}
@media (max-width: 480px) {
  .commandes-list-heading { padding-inline: 10px; gap: 0 6px; }
  .commandes-pages { gap: 8px; }
  .commandes-pages a { padding-inline: 4px; }
  .commandes-list-tools { gap: 6px; }
  .commandes-filters { padding: 12px; }
  .header-actions { width: 100%; }
  .header-actions > :deep(button) { flex: 1 1 140px; }
  .commande-open { padding-left: 16px; }
  .status-badge { padding: 3px 4px; }
  .detail-row { flex-wrap: wrap; }
}
</style>
