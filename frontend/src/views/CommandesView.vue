<template>
  <Layout @new-order="openCreatePanel" @focus-search="focusClientSearch">
    <div class="command-center">
      <!-- Stats Bar -->
      <div class="stats-bar">
        <div class="stats-bar-item">
          <span class="stats-bar-value">{{ stats.total }}</span>
          <span class="stats-bar-label">commandes</span>
        </div>
        <div class="stats-bar-divider"></div>
        <div class="stats-bar-item stats-bar-warning">
          <span class="stats-bar-value">{{ stats.enAttente }}</span>
          <span class="stats-bar-label">en attente</span>
        </div>
        <div class="stats-bar-divider"></div>
        <div class="stats-bar-item stats-bar-success">
          <span class="stats-bar-value">{{ stats.reglees }}</span>
          <span class="stats-bar-label">réglées</span>
        </div>
        <div class="stats-bar-spacer"></div>
        <div v-if="stocksATraiter > 0" class="stats-bar-alert" @click="$router.push('/stocks')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ stocksATraiter }} stock(s) à traiter
        </div>
      </div>

      <div class="command-center-body">
        <!-- Filter Panel (left) -->
        <aside class="filter-panel" :class="{ 'filter-panel-collapsed': !showFilters }">
          <button class="filter-toggle" @click="showFilters = !showFilters" :title="showFilters ? 'Masquer filtres' : 'Afficher filtres'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
          </button>

          <template v-if="showFilters">
            <!-- Search client -->
            <div class="filter-section">
              <label class="filter-section-label">Client</label>
              <div class="filter-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input ref="clientSearchRef" v-model="searchClient" type="text" placeholder="Nom du client..." class="filter-search-input" />
              </div>
            </div>

            <!-- Status filter -->
            <div class="filter-section">
              <label class="filter-section-label">Statut</label>
              <div class="filter-chips">
                <button :class="['filter-chip', { active: statusFilter === '' }]" @click="statusFilter = ''">Toutes</button>
                <button :class="['filter-chip filter-chip-warning', { active: statusFilter === 'attente' }]" @click="statusFilter = 'attente'">
                  En attente
                  <span v-if="stats.enAttente" class="filter-chip-count">{{ stats.enAttente }}</span>
                </button>
                <button :class="['filter-chip filter-chip-success', { active: statusFilter === 'reglee' }]" @click="statusFilter = 'reglee'">
                  Réglées
                  <span v-if="stats.reglees" class="filter-chip-count">{{ stats.reglees }}</span>
                </button>
              </div>
            </div>

            <!-- Catalogue filter -->
            <div class="filter-section">
              <label class="filter-section-label">Catalogue</label>
              <div class="filter-chips">
                <button :class="['filter-chip', { active: selectedGroupeFilter === '' }]" @click="selectedGroupeFilter = ''">Tous</button>
                <button
                  v-for="groupe in groupesStore.groupes"
                  :key="groupe.id"
                  :class="['filter-chip', { active: selectedGroupeFilter === groupe.id }]"
                  @click="selectedGroupeFilter = selectedGroupeFilter === groupe.id ? '' : groupe.id"
                >
                  {{ groupe.nom }}
                </button>
              </div>
            </div>

            <!-- Payment filter -->
            <div class="filter-section">
              <label class="filter-section-label">Paiement</label>
              <div class="filter-chips">
                <button :class="['filter-chip', { active: paymentFilter === '' }]" @click="paymentFilter = ''">Tous</button>
                <button v-for="m in ['Paypal','chèque','virement']" :key="m" :class="['filter-chip', { active: paymentFilter === m }]" @click="paymentFilter = paymentFilter === m ? '' : m">{{ m }}</button>
              </div>
            </div>

            <button v-if="hasActiveFilters" class="filter-clear-all" @click="clearAllFilters">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Effacer les filtres
            </button>
          </template>
        </aside>

        <!-- Orders List (main) -->
        <section class="orders-list-section">
          <div v-if="commandesStore.loading" class="loading-state">
            <div class="loading-spinner"></div>
            <span class="loading-state-text">Chargement...</span>
          </div>

          <div v-else-if="filteredCommandes.length === 0" class="empty-state">
            <div class="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            </div>
            <h3 class="empty-state-title">{{ hasActiveFilters ? 'Aucune commande trouvée' : 'Aucune commande' }}</h3>
            <p class="empty-state-description">{{ hasActiveFilters ? 'Essayez de modifier les filtres' : 'Appuyez sur N ou cliquez sur + pour créer votre première commande' }}</p>
          </div>

          <div v-else class="orders-grid">
            <div
              v-for="(commande, index) in filteredCommandes"
              :key="commande.id"
              class="order-card"
              :style="{ animationDelay: `${index * 0.03}s` }"
              @click="viewCommande(commande)"
            >
              <div class="order-card-header">
                <span class="order-card-id">#{{ commande.id }}</span>
                <span class="order-card-date">{{ formatDate(commande.created_at) }}</span>
                <button
                  :class="['status-toggle', commande.reglee ? 'status-toggle-success' : 'status-toggle-warning']"
                  @click.stop="toggleReglee(commande)"
                  :title="commande.reglee ? 'Marquer non réglée' : 'Marquer réglée'"
                >
                  <svg v-if="commande.reglee" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>{{ commande.reglee ? 'Réglée' : 'En attente' }}</span>
                </button>
              </div>

              <div class="order-card-client">
                <div class="client-avatar-tiny">{{ getClientInitials(commande.client_id) }}</div>
                <span class="client-name-text">{{ getClientName(commande.client_id) }}</span>
              </div>

              <div class="order-card-details">
                <span class="detail-catalogue">{{ getGroupeName(commande.groupe_id) }}</span>
                <div class="detail-badges">
                  <span :class="['format-badge', `format-badge-${commande.format_type.toLowerCase()}`]">{{ commande.format_type }}</span>
                  <span v-if="commande.papier_supplementaire" class="papier-tag">+Papier</span>
                </div>
                <span class="detail-price">{{ getCommandeTotalPrice(commande) }}€</span>
              </div>

              <div class="order-card-footer">
                <div v-if="getCommandeCollectionsPreview(commande.id).length > 0" class="order-collections-preview">
                  <span v-for="col in getCommandeCollectionsPreview(commande.id)" :key="col" class="collection-chip">{{ col }}</span>
                </div>
                <div class="order-card-actions">
                  <button class="card-action-btn" @click.stop="duplicateCommande(commande)" title="Dupliquer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Create/Edit Panel -->
      <SlidePanel :is-open="isPanelOpen" :title="panelTitle" max-width="520px" @close="closePanel">
        <div class="order-form">
          <!-- Client -->
          <div class="form-field">
            <SearchableSelect
              v-model="formData.client_id"
              label="Cliente"
              :options="clientsOptions"
              placeholder="Tapez un nom de cliente..."
              :error="errors.client_id"
              recent-key="clients"
            />
          </div>

          <!-- Catalogue -->
          <div class="form-field">
            <SearchableSelect
              v-model="formData.groupe_id"
              label="Catalogue"
              :options="groupesOptions"
              placeholder="Sélectionner un catalogue..."
              :error="errors.groupe_id"
              recent-key="groupes"
              @update:model-value="onCatalogueChange"
            />
          </div>

          <!-- Format (compact radio) -->
          <div v-if="formData.groupe_id && selectedGroupePrices" class="form-field">
            <label class="form-field-label">Format</label>
            <div class="format-radios">
              <label v-for="f in ['A','B','C']" :key="f" :class="['format-radio', `format-radio-${f.toLowerCase()}`, { selected: formData.format_type === f }]" @click="selectFormat(f)">
                <span class="format-radio-letter">{{ f }}</span>
                <span class="format-radio-price">{{ selectedGroupePrices[`format_${f}_prix`] }}€</span>
                <span class="format-radio-info">{{ f === 'C' ? '1 col.' : '2 col.' }}</span>
              </label>
            </div>
            <p v-if="errors.format_type" class="form-error">{{ errors.format_type }}</p>
          </div>

          <!-- Collections -->
          <div v-if="formData.format_type && catalogueCollections.length > 0" class="form-field">
            <label class="form-field-label">Collections <span class="form-field-hint">({{ selectedCollections.length }}/{{ requiredCollectionsCount }})</span></label>
            <div class="collections-grid">
              <button
                v-for="col in catalogueCollections"
                :key="col.id"
                :class="['collection-btn', { picked: isCollectionSelected(col.id) }]"
                @click="toggleCollection(col.id)"
                type="button"
              >
                <svg v-if="isCollectionSelected(col.id)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                {{ col.nom }}
              </button>
            </div>
            <p v-if="errors.collections" class="form-error">{{ errors.collections }}</p>
          </div>

          <!-- Payment -->
          <div v-if="formData.format_type" class="form-field">
            <label class="form-field-label">Paiement</label>
            <div class="payment-radios">
              <label v-for="p in paiementOptions" :key="p.value" :class="['payment-radio', { selected: formData.methode_paiement === p.value }]" @click="formData.methode_paiement = p.value">
                {{ p.label }}
              </label>
            </div>
            <p v-if="errors.methode_paiement" class="form-error">{{ errors.methode_paiement }}</p>
          </div>

          <!-- Options row -->
          <div v-if="formData.format_type" class="form-field form-options-row">
            <FormCheckbox v-model="formData.papier_supplementaire" label="Papier supplémentaire" />
            <FormCheckbox v-model="formData.reglee" label="Commande réglée" />
          </div>

          <!-- Extra articles -->
          <div v-if="formData.format_type" class="form-field">
            <FormInput v-model="formData.articles_supplementaires" label="Articles supplémentaires" placeholder="Ex: Marque-pages, Carte..." />
          </div>

          <!-- Summary -->
          <div v-if="canSubmit" class="order-summary-bar">
            <div class="summary-info">
              <span>{{ selectedCollections.length }} col. · Format {{ formData.format_type }} · {{ formData.methode_paiement }}</span>
            </div>
            <span class="summary-total">{{ totalPrice }}€</span>
          </div>
        </div>

        <template #footer>
          <Button variant="secondary" @click="closePanel">Annuler</Button>
          <Button @click="handleSubmit" :loading="saving" :disabled="!canSubmit">
            {{ isEditing ? 'Enregistrer' : 'Créer' }}
          </Button>
        </template>
      </SlidePanel>

      <!-- View Panel -->
      <SlidePanel :is-open="isViewPanelOpen" title="" max-width="520px" @close="closeViewPanel">
        <div v-if="selectedCommande" class="commande-view">
          <div class="view-header">
            <span class="view-id">Commande #{{ selectedCommande.id }}</span>
            <span :class="['badge', selectedCommande.reglee ? 'badge-success' : 'badge-warning']" style="padding:6px 14px;">
              {{ selectedCommande.reglee ? 'Réglée' : 'En attente' }}
            </span>
          </div>

          <div class="view-client">
            <div class="view-client-avatar">{{ getClientInitials(selectedCommande.client_id) }}</div>
            <div class="view-client-info">
              <span class="view-client-name">{{ getClientName(selectedCommande.client_id) }}</span>
              <span class="view-client-label">Cliente</span>
            </div>
          </div>

          <div class="view-details">
            <div class="view-row"><span class="view-label">Catalogue</span><span>{{ getGroupeName(selectedCommande.groupe_id) }}</span></div>
            <div class="view-row"><span class="view-label">Format</span><span :class="['format-badge', `format-badge-${selectedCommande.format_type.toLowerCase()}`]">{{ selectedCommande.format_type }}</span></div>
            <div class="view-row"><span class="view-label">Prix</span><span class="view-price">{{ getFormatPrice(selectedCommande) }}€</span></div>
            <div class="view-row"><span class="view-label">Paiement</span><span>{{ selectedCommande.methode_paiement }}</span></div>
            <div v-if="selectedCommande.created_at" class="view-row"><span class="view-label">Date</span><span>{{ formatDate(selectedCommande.created_at) }}</span></div>
          </div>

          <div v-if="viewCollections.length > 0" class="view-collections">
            <span class="view-label">Collections</span>
            <div class="view-collections-list">
              <span v-for="col in viewCollections" :key="col.id" class="collection-chip collection-chip-lg">{{ col.nom }}</span>
            </div>
          </div>

          <div v-if="selectedCommande.papier_supplementaire || selectedCommande.articles_supplementaires" class="view-extras">
            <span v-if="selectedCommande.papier_supplementaire" class="badge badge-neutral">+Papier</span>
            <span v-if="selectedCommande.articles_supplementaires" class="badge badge-neutral">{{ selectedCommande.articles_supplementaires }}</span>
          </div>
        </div>

        <template #footer>
          <Button variant="danger" @click="confirmDeleteFromView">Supprimer</Button>
          <Button variant="secondary" @click="editFromView">Modifier</Button>
          <Button variant="secondary" @click="duplicateFromView">Dupliquer</Button>
        </template>
      </SlidePanel>

      <ConfirmDialog
        :is-open="isDeleteDialogOpen"
        title="Supprimer la commande"
        :message="`Supprimer la commande #${commandeToDelete?.id} ? Irréversible.`"
        confirm-text="Supprimer"
        variant="danger"
        @confirm="deleteCommande"
        @cancel="isDeleteDialogOpen = false"
      />
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue';
import Layout from '../components/Layout.vue';
import SlidePanel from '../components/SlidePanel.vue';
import Button from '../components/Button.vue';
import FormInput from '../components/FormInput.vue';
import FormCheckbox from '../components/FormCheckbox.vue';
import SearchableSelect from '../components/SearchableSelect.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import { useCommandesStore } from '../stores/commandes';
import { useClientsStore } from '../stores/clients';
import { useGroupesStore } from '../stores/groupes';
import { useCollectionsStore } from '../stores/collections';
import { useStocksStore } from '../stores/stocks';
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts';

const commandesStore = useCommandesStore();
const clientsStore = useClientsStore();
const groupesStore = useGroupesStore();
const collectionsStore = useCollectionsStore();
const stocksStore = useStocksStore();

// State
const isPanelOpen = ref(false);
const isViewPanelOpen = ref(false);
const isDeleteDialogOpen = ref(false);
const isEditing = ref(false);
const editingCommandeId = ref(null);
const selectedCommande = ref(null);
const commandeToDelete = ref(null);
const saving = ref(false);
const showFilters = ref(true);

// Filters
const searchClient = ref('');
const statusFilter = ref('');
const selectedGroupeFilter = ref('');
const paymentFilter = ref('');
const clientSearchRef = ref(null);

// View panel
const viewCollections = ref([]);

// Form
const formData = ref({
  client_id: '',
  groupe_id: '',
  format_type: '',
  methode_paiement: '',
  papier_supplementaire: false,
  articles_supplementaires: '',
  reglee: false,
});
const selectedCollections = ref([]);
const catalogueCollections = ref([]);
const errors = ref({});
const commandeCollectionsCache = reactive({});

// Smart defaults
const getSmartDefault = (key) => {
  try { return localStorage.getItem(`stamp_default_${key}`) || ''; } catch { return ''; }
};
const setSmartDefault = (key, value) => {
  try { localStorage.setItem(`stamp_default_${key}`, value); } catch {}
};

// Stats
const stats = computed(() => ({
  total: commandesStore.commandes.length,
  reglees: commandesStore.commandes.filter(c => c.reglee === 1).length,
  enAttente: commandesStore.commandes.filter(c => c.reglee !== 1).length,
}));

const stocksATraiter = computed(() => stocksStore.stocksANecessiterCommande?.length || 0);

const hasActiveFilters = computed(() => searchClient.value || statusFilter.value || selectedGroupeFilter.value || paymentFilter.value);

// Filtered commandes
const filteredCommandes = computed(() => {
  let list = commandesStore.commandes;
  if (statusFilter.value === 'attente') list = list.filter(c => c.reglee !== 1);
  else if (statusFilter.value === 'reglee') list = list.filter(c => c.reglee === 1);
  if (selectedGroupeFilter.value) list = list.filter(c => c.groupe_id === selectedGroupeFilter.value);
  if (paymentFilter.value) list = list.filter(c => c.methode_paiement === paymentFilter.value);
  if (searchClient.value) {
    const q = searchClient.value.toLowerCase();
    list = list.filter(c => {
      const client = clientsStore.getClientById(c.client_id);
      if (!client) return false;
      return `${client.prenom} ${client.nom}`.toLowerCase().includes(q);
    });
  }
  return [...list].sort((a, b) => b.id - a.id);
});

// Options
const panelTitle = computed(() => isEditing.value ? 'Modifier la commande' : 'Nouvelle commande');
const clientsOptions = computed(() => clientsStore.clients.map(c => ({ value: c.id.toString(), label: `${c.prenom} ${c.nom}` })));
const groupesOptions = computed(() => groupesStore.groupes.map(g => ({ value: g.id.toString(), label: g.nom })));
const paiementOptions = [
  { value: 'Paypal', label: 'Paypal' },
  { value: 'chèque', label: 'Chèque' },
  { value: 'virement', label: 'Virement' },
];

const selectedGroupePrices = computed(() => {
  if (!formData.value.groupe_id) return null;
  return groupesStore.getGroupeById(parseInt(formData.value.groupe_id));
});

const requiredCollectionsCount = computed(() => formData.value.format_type === 'C' ? 1 : 2);
const hasValidCollections = computed(() => selectedCollections.value.length === requiredCollectionsCount.value);
const canSubmit = computed(() => formData.value.client_id && formData.value.groupe_id && formData.value.format_type && hasValidCollections.value && formData.value.methode_paiement);

const SUPPLEMENT_PAPIER = 3.5;
const totalPrice = computed(() => {
  const base = selectedGroupePrices.value?.[`format_${formData.value.format_type}_prix`] || 0;
  return base + (formData.value.papier_supplementaire ? SUPPLEMENT_PAPIER : 0);
});

// Helpers
const getClientName = (id) => { const c = clientsStore.getClientById(id); return c ? `${c.prenom} ${c.nom}` : `#${id}`; };
const getClientInitials = (id) => { const c = clientsStore.getClientById(id); return c ? `${c.prenom?.[0]||''}${c.nom?.[0]||''}`.toUpperCase() : '?'; };
const getGroupeName = (id) => { const g = groupesStore.getGroupeById(id); return g ? g.nom : `#${id}`; };
const getFormatPrice = (cmd) => { const g = groupesStore.getGroupeById(cmd.groupe_id); return g ? (g[`format_${cmd.format_type}_prix`] || 0) : 0; };
const getCommandeTotalPrice = (cmd) => getFormatPrice(cmd) + (cmd.papier_supplementaire ? SUPPLEMENT_PAPIER : 0);
const getCommandeCollectionsPreview = (id) => commandeCollectionsCache[id] || [];
const isCollectionSelected = (id) => selectedCollections.value.includes(id);
const formatDate = (d) => { if (!d) return ''; try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); } catch { return ''; } };

const clearAllFilters = () => { searchClient.value = ''; statusFilter.value = ''; selectedGroupeFilter.value = ''; paymentFilter.value = ''; };
const focusClientSearch = () => { clientSearchRef.value?.focus(); };

// Actions
const onCatalogueChange = async (val) => {
  formData.value.format_type = '';
  selectedCollections.value = [];
  if (val) {
    try { catalogueCollections.value = await groupesStore.fetchGroupeCollections(parseInt(val)); } catch { catalogueCollections.value = []; }
  } else { catalogueCollections.value = []; }
};

const selectFormat = (f) => { formData.value.format_type = f; selectedCollections.value = []; };

const toggleCollection = (id) => {
  if (!formData.value.format_type) return;
  const i = selectedCollections.value.indexOf(id);
  if (i > -1) selectedCollections.value.splice(i, 1);
  else if (selectedCollections.value.length < requiredCollectionsCount.value) selectedCollections.value.push(id);
};

const openCreatePanel = () => {
  isEditing.value = false;
  editingCommandeId.value = null;
  const lastPayment = getSmartDefault('payment');
  formData.value = { client_id: '', groupe_id: '', format_type: '', methode_paiement: lastPayment, papier_supplementaire: false, articles_supplementaires: '', reglee: false };
  selectedCollections.value = [];
  catalogueCollections.value = [];
  errors.value = {};
  isPanelOpen.value = true;
};

const closePanel = () => { isPanelOpen.value = false; };

const handleSubmit = async () => {
  errors.value = {};
  if (!formData.value.client_id) errors.value.client_id = 'Requis';
  if (!formData.value.groupe_id) errors.value.groupe_id = 'Requis';
  if (!formData.value.format_type) errors.value.format_type = 'Requis';
  if (!formData.value.methode_paiement) errors.value.methode_paiement = 'Requis';
  if (selectedCollections.value.length !== requiredCollectionsCount.value) errors.value.collections = `Sélectionnez ${requiredCollectionsCount.value} collection(s)`;
  if (Object.keys(errors.value).length > 0) return;

  saving.value = true;
  try {
    const data = {
      client_id: parseInt(formData.value.client_id),
      groupe_id: parseInt(formData.value.groupe_id),
      format_type: formData.value.format_type,
      methode_paiement: formData.value.methode_paiement,
      papier_supplementaire: formData.value.papier_supplementaire ? 1 : 0,
      articles_supplementaires: formData.value.articles_supplementaires || null,
      reglee: formData.value.reglee ? 1 : 0,
    };

    setSmartDefault('payment', data.methode_paiement);

    let commandeId;
    if (isEditing.value) {
      await commandesStore.updateCommande(editingCommandeId.value, data);
      commandeId = editingCommandeId.value;
      try {
        const old = await commandesStore.fetchCommandeCollections(commandeId);
        for (const c of old) await commandesStore.removeCollectionFromCommande(commandeId, c.id);
      } catch {}
    } else {
      const nc = await commandesStore.createCommande(data);
      commandeId = nc.id;
    }

    for (const colId of selectedCollections.value) await commandesStore.addCollectionToCommande(commandeId, colId);
    await loadCommandesCollections();
    closePanel();
  } catch (error) { console.error('Erreur:', error); } finally { saving.value = false; }
};

// View
const viewCommande = async (cmd) => {
  selectedCommande.value = cmd;
  try { viewCollections.value = await commandesStore.fetchCommandeCollections(cmd.id); } catch { viewCollections.value = []; }
  isViewPanelOpen.value = true;
};

const closeViewPanel = () => { isViewPanelOpen.value = false; selectedCommande.value = null; viewCollections.value = []; };

const editFromView = async () => {
  const cmd = selectedCommande.value;
  const cols = [...viewCollections.value];
  closeViewPanel();
  isEditing.value = true;
  editingCommandeId.value = cmd.id;
  formData.value = {
    client_id: cmd.client_id.toString(), groupe_id: cmd.groupe_id.toString(),
    format_type: cmd.format_type, methode_paiement: cmd.methode_paiement,
    papier_supplementaire: cmd.papier_supplementaire === 1,
    articles_supplementaires: cmd.articles_supplementaires || '', reglee: cmd.reglee === 1,
  };
  try { catalogueCollections.value = await groupesStore.fetchGroupeCollections(cmd.groupe_id); } catch { catalogueCollections.value = []; }
  selectedCollections.value = cols.map(c => c.id);
  errors.value = {};
  isPanelOpen.value = true;
};

const confirmDeleteFromView = () => { commandeToDelete.value = selectedCommande.value; closeViewPanel(); isDeleteDialogOpen.value = true; };
const deleteCommande = async () => {
  if (!commandeToDelete.value) return;
  try { await commandesStore.deleteCommande(commandeToDelete.value.id); delete commandeCollectionsCache[commandeToDelete.value.id]; } catch {}
  finally { isDeleteDialogOpen.value = false; commandeToDelete.value = null; }
};

const toggleReglee = async (cmd) => {
  try { await commandesStore.updateCommande(cmd.id, { ...cmd, reglee: cmd.reglee ? 0 : 1 }); } catch {}
};

const duplicateCommande = async (cmd) => {
  isEditing.value = false;
  editingCommandeId.value = null;
  formData.value = {
    client_id: cmd.client_id.toString(), groupe_id: cmd.groupe_id.toString(),
    format_type: cmd.format_type, methode_paiement: cmd.methode_paiement,
    papier_supplementaire: cmd.papier_supplementaire === 1,
    articles_supplementaires: cmd.articles_supplementaires || '', reglee: false,
  };
  try { catalogueCollections.value = await groupesStore.fetchGroupeCollections(cmd.groupe_id); } catch { catalogueCollections.value = []; }
  const cols = commandeCollectionsCache[cmd.id] || [];
  const colObjs = catalogueCollections.value.filter(c => cols.includes(c.nom));
  selectedCollections.value = colObjs.map(c => c.id);
  errors.value = {};
  isPanelOpen.value = true;
};

const duplicateFromView = () => {
  const cmd = selectedCommande.value;
  const cols = [...viewCollections.value];
  closeViewPanel();
  isEditing.value = false;
  editingCommandeId.value = null;
  formData.value = {
    client_id: cmd.client_id.toString(), groupe_id: cmd.groupe_id.toString(),
    format_type: cmd.format_type, methode_paiement: cmd.methode_paiement,
    papier_supplementaire: cmd.papier_supplementaire === 1,
    articles_supplementaires: cmd.articles_supplementaires || '', reglee: false,
  };
  catalogueCollections.value = []; // will be loaded
  (async () => {
    try { catalogueCollections.value = await groupesStore.fetchGroupeCollections(cmd.groupe_id); } catch {}
    selectedCollections.value = cols.map(c => c.id);
  })();
  errors.value = {};
  isPanelOpen.value = true;
};

const loadCommandesCollections = async () => {
  for (const cmd of commandesStore.commandes) {
    try {
      const cols = await commandesStore.fetchCommandeCollections(cmd.id);
      commandeCollectionsCache[cmd.id] = cols.map(c => c.nom);
    } catch { commandeCollectionsCache[cmd.id] = []; }
  }
};

// Keyboard shortcuts
useKeyboardShortcuts({
  'n': () => { if (!isPanelOpen.value && !isViewPanelOpen.value) openCreatePanel(); },
  'Escape': () => {
    if (isPanelOpen.value) closePanel();
    else if (isViewPanelOpen.value) closeViewPanel();
  },
  '/': () => focusClientSearch(),
  'ctrl+k': () => focusClientSearch(),
});

// Init
onMounted(async () => {
  try {
    await Promise.all([
      clientsStore.fetchClients(),
      commandesStore.fetchCommandes(),
      groupesStore.fetchGroupes(),
      collectionsStore.fetchCollections(),
      stocksStore.fetchStocks(),
    ]);
    await loadCommandesCollections();
  } catch (e) { console.error(e); }
});
</script>

<style scoped>
.command-center {
  animation: fadeInUp 0.4s ease-out;
}

/* === Stats Bar === */
.stats-bar {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-3) var(--spacing-5);
  background: var(--card);
  border-radius: var(--border-radius-full);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--spacing-5);
}

.stats-bar-item { display: flex; align-items: center; gap: var(--spacing-2); }
.stats-bar-value { font-family: var(--font-heading); font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); color: var(--foreground); }
.stats-bar-label { font-size: var(--font-size-sm); color: var(--text-secondary); }
.stats-bar-warning .stats-bar-value { color: var(--warning-dark); }
.stats-bar-success .stats-bar-value { color: var(--success-dark); }
.stats-bar-divider { width: 1px; height: 24px; background: var(--border-light); }
.stats-bar-spacer { flex: 1; }

.stats-bar-alert {
  display: flex; align-items: center; gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  background: var(--warning-light); color: var(--warning-dark);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);
  cursor: pointer; transition: all var(--transition-fast);
}
.stats-bar-alert:hover { background: var(--warning); color: white; }
.stats-bar-alert svg { width: 16px; height: 16px; }

/* === Command Center Body === */
.command-center-body { display: flex; gap: var(--spacing-5); align-items: flex-start; }

/* === Filter Panel === */
.filter-panel {
  width: 220px; flex-shrink: 0;
  background: var(--card); border-radius: var(--border-radius-xl);
  border: 1px solid var(--border-light); box-shadow: var(--shadow-card);
  padding: var(--spacing-4); position: sticky; top: calc(56px + var(--spacing-6));
}

.filter-panel-collapsed { width: auto; padding: var(--spacing-2); }

.filter-toggle {
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border: none; background: var(--muted);
  border-radius: var(--border-radius-sm); cursor: pointer;
  color: var(--text-secondary); transition: all var(--transition-fast);
  margin-bottom: var(--spacing-3);
}
.filter-toggle:hover { background: var(--primary-light); color: var(--primary); }
.filter-panel-collapsed .filter-toggle { margin-bottom: 0; }

.filter-section { margin-bottom: var(--spacing-4); }
.filter-section-label {
  display: block; font-size: 11px; font-weight: var(--font-weight-semibold);
  color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em;
  margin-bottom: var(--spacing-2);
}

.filter-search-wrap {
  position: relative; display: flex; align-items: center;
}
.filter-search-wrap svg {
  position: absolute; left: var(--spacing-2); width: 14px; height: 14px;
  color: var(--text-tertiary); pointer-events: none;
}
.filter-search-input {
  width: 100%; padding: var(--spacing-2) var(--spacing-3) var(--spacing-2) var(--spacing-7);
  border: 1.5px solid var(--border); border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm); font-family: var(--font-family);
  background: var(--bg-primary); color: var(--text-primary);
  transition: all var(--transition-fast);
}
.filter-search-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(93,112,82,0.1); }

.filter-chips { display: flex; flex-wrap: wrap; gap: var(--spacing-1); }
.filter-chip {
  padding: var(--spacing-1) var(--spacing-3); border: 1.5px solid var(--border);
  border-radius: var(--border-radius-full); background: var(--bg-primary);
  font-size: var(--font-size-xs); font-family: var(--font-family);
  font-weight: var(--font-weight-medium); color: var(--text-secondary);
  cursor: pointer; transition: all var(--transition-fast);
  display: inline-flex; align-items: center; gap: var(--spacing-1);
}
.filter-chip:hover { border-color: var(--primary); color: var(--primary); }
.filter-chip.active { background: var(--primary-light); border-color: var(--primary); color: var(--primary); font-weight: var(--font-weight-semibold); }
.filter-chip-count {
  font-size: 10px; font-weight: var(--font-weight-bold);
  background: rgba(0,0,0,0.08); padding: 0 5px; border-radius: var(--border-radius-full);
}

.filter-clear-all {
  display: flex; align-items: center; gap: var(--spacing-2); width: 100%;
  padding: var(--spacing-2) var(--spacing-3); border: none; background: var(--error-light);
  border-radius: var(--border-radius-sm); font-size: var(--font-size-xs);
  font-family: var(--font-family); color: var(--error-dark); cursor: pointer;
  transition: all var(--transition-fast);
}
.filter-clear-all:hover { background: var(--destructive-light); }
.filter-clear-all svg { width: 14px; height: 14px; }

/* === Orders List === */
.orders-list-section { flex: 1; min-width: 0; }

.orders-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--spacing-4);
}

.order-card {
  background: var(--card); border-radius: var(--border-radius-xl);
  border: 1px solid var(--border-light); box-shadow: var(--shadow-card);
  padding: var(--spacing-4) var(--spacing-5); cursor: pointer;
  transition: all var(--transition-normal); animation: fadeInUp 0.35s ease-out backwards;
}
.order-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-card-hover); border-color: var(--border); }

.order-card-header { display: flex; align-items: center; gap: var(--spacing-3); margin-bottom: var(--spacing-3); }
.order-card-id { font-family: var(--font-heading); font-weight: var(--font-weight-bold); color: var(--text-primary); font-size: var(--font-size-md); }
.order-card-date { font-size: var(--font-size-xs); color: var(--text-tertiary); flex: 1; }

.status-toggle {
  display: inline-flex; align-items: center; gap: var(--spacing-1);
  padding: 4px 12px; border: none; border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold);
  font-family: var(--font-family); cursor: pointer; transition: all var(--transition-fast);
}
.status-toggle svg { width: 14px; height: 14px; }
.status-toggle-success { background: var(--success-light); color: var(--success-dark); }
.status-toggle-success:hover { background: var(--success); color: white; }
.status-toggle-warning { background: var(--warning-light); color: var(--warning-dark); }
.status-toggle-warning:hover { background: var(--warning); color: white; }

.order-card-client { display: flex; align-items: center; gap: var(--spacing-2); margin-bottom: var(--spacing-3); }
.client-avatar-tiny {
  width: 28px; height: 28px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--success-dark) 100%);
  color: var(--primary-foreground); border-radius: var(--border-radius-xs);
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: var(--font-weight-bold); flex-shrink: 0;
}
.client-name-text { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }

.order-card-details { display: flex; align-items: center; gap: var(--spacing-3); margin-bottom: var(--spacing-3); }
.detail-catalogue { font-size: var(--font-size-xs); color: var(--text-secondary); flex: 1; }
.detail-badges { display: flex; align-items: center; gap: var(--spacing-2); }
.papier-tag { font-size: 10px; color: var(--text-tertiary); background: var(--muted); padding: 2px 6px; border-radius: var(--border-radius-full); }
.detail-price { font-family: var(--font-heading); font-weight: var(--font-weight-bold); color: var(--foreground); font-size: var(--font-size-md); }

.order-card-footer { display: flex; align-items: center; justify-content: space-between; }
.order-collections-preview { display: flex; gap: var(--spacing-1); flex-wrap: wrap; flex: 1; }
.collection-chip {
  padding: 2px 8px; background: var(--muted); border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs); color: var(--text-secondary); font-weight: var(--font-weight-medium);
}
.collection-chip-lg { padding: 4px 12px; font-size: var(--font-size-sm); }

.order-card-actions { display: flex; gap: var(--spacing-1); }
.card-action-btn {
  width: 32px; height: 32px; border: none; background: var(--muted);
  border-radius: var(--border-radius-xs); display: flex; align-items: center;
  justify-content: center; cursor: pointer; color: var(--text-tertiary);
  transition: all var(--transition-fast); opacity: 0;
}
.order-card:hover .card-action-btn { opacity: 1; }
.card-action-btn:hover { background: var(--primary-light); color: var(--primary); }
.card-action-btn svg { width: 16px; height: 16px; }

/* === Order Form (SlidePanel) === */
.order-form { display: flex; flex-direction: column; gap: var(--spacing-5); }
.form-field { position: relative; }
.form-field-label {
  display: block; font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold);
  color: var(--text-primary); margin-bottom: var(--spacing-2);
}
.form-field-hint { font-weight: var(--font-weight-normal); color: var(--text-tertiary); }
.form-error { font-size: var(--font-size-xs); color: var(--error-dark); margin-top: var(--spacing-1); }
.form-options-row { display: flex; gap: var(--spacing-6); }

/* Format radios */
.format-radios { display: flex; gap: var(--spacing-3); }
.format-radio {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: var(--spacing-3); border: 2px solid var(--border); border-radius: var(--border-radius);
  cursor: pointer; transition: all var(--transition-fast); text-align: center;
}
.format-radio:hover { border-color: var(--primary); }
.format-radio.selected { border-color: var(--primary); background: var(--primary-light); }
.format-radio-letter { font-family: var(--font-heading); font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); }
.format-radio-a .format-radio-letter { color: var(--format-a); }
.format-radio-b .format-radio-letter { color: var(--format-b); }
.format-radio-c .format-radio-letter { color: var(--format-c); }
.format-radio-price { font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--text-primary); }
.format-radio-info { font-size: 10px; color: var(--text-tertiary); }

/* Collections grid */
.collections-grid { display: flex; flex-wrap: wrap; gap: var(--spacing-2); }
.collection-btn {
  display: inline-flex; align-items: center; gap: var(--spacing-1);
  padding: var(--spacing-2) var(--spacing-4); border: 1.5px solid var(--border);
  border-radius: var(--border-radius-full); background: var(--bg-primary);
  font-size: var(--font-size-sm); font-family: var(--font-family);
  color: var(--text-secondary); cursor: pointer; transition: all var(--transition-fast);
}
.collection-btn:hover { border-color: var(--primary); color: var(--primary); }
.collection-btn.picked { background: var(--primary-light); border-color: var(--primary); color: var(--primary); font-weight: var(--font-weight-semibold); }
.collection-btn svg { width: 14px; height: 14px; }

/* Payment radios */
.payment-radios { display: flex; gap: var(--spacing-2); }
.payment-radio {
  flex: 1; padding: var(--spacing-2) var(--spacing-3); border: 1.5px solid var(--border);
  border-radius: var(--border-radius-sm); text-align: center; cursor: pointer;
  font-size: var(--font-size-sm); font-family: var(--font-family); color: var(--text-secondary);
  transition: all var(--transition-fast);
}
.payment-radio:hover { border-color: var(--primary); color: var(--primary); }
.payment-radio.selected { background: var(--primary-light); border-color: var(--primary); color: var(--primary); font-weight: var(--font-weight-semibold); }

/* Summary bar */
.order-summary-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--spacing-4); background: var(--primary-light);
  border-radius: var(--border-radius); border: 1px solid rgba(93,112,82,0.15);
}
.summary-info { font-size: var(--font-size-sm); color: var(--primary); }
.summary-total { font-family: var(--font-heading); font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); color: var(--primary); }

/* === View Panel === */
.commande-view { display: flex; flex-direction: column; gap: var(--spacing-5); }
.view-header { display: flex; align-items: center; justify-content: space-between; }
.view-id { font-family: var(--font-heading); font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); }

.view-client { display: flex; align-items: center; gap: var(--spacing-3); padding: var(--spacing-4); background: var(--muted); border-radius: var(--border-radius); }
.view-client-avatar {
  width: 44px; height: 44px;
  background: linear-gradient(135deg, var(--primary), var(--success-dark));
  color: var(--primary-foreground); border-radius: var(--border-radius);
  display: flex; align-items: center; justify-content: center;
  font-weight: var(--font-weight-bold); font-size: var(--font-size-sm);
}
.view-client-info { display: flex; flex-direction: column; }
.view-client-name { font-weight: var(--font-weight-semibold); color: var(--text-primary); }
.view-client-label { font-size: var(--font-size-xs); color: var(--text-tertiary); }

.view-details { display: flex; flex-direction: column; gap: var(--spacing-3); }
.view-row { display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-2) 0; border-bottom: 1px solid var(--border-light); }
.view-label { font-size: var(--font-size-sm); color: var(--text-secondary); }
.view-price { font-family: var(--font-heading); font-weight: var(--font-weight-bold); font-size: var(--font-size-lg); color: var(--primary); }

.view-collections { margin-top: var(--spacing-2); }
.view-collections-list { display: flex; flex-wrap: wrap; gap: var(--spacing-2); margin-top: var(--spacing-2); }
.view-extras { display: flex; flex-wrap: wrap; gap: var(--spacing-2); }

/* === Responsive === */
@media (max-width: 900px) {
  .command-center-body { flex-direction: column; }
  .filter-panel { width: 100%; position: static; }
  .orders-grid { grid-template-columns: 1fr; }
}
</style>
