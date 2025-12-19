<template>
  <Layout>
    <div class="commandes-view">
      <!-- Page Header -->
      <header class="page-header">
        <div>
          <h1 class="page-title">Commandes</h1>
          <p class="page-subtitle">Gérez toutes vos commandes</p>
        </div>
        <Button @click="openCreateModal">
          <template #icon>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </template>
          Nouvelle commande
        </Button>
      </header>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="filter-group">
          <label class="filter-label">Filtrer par catalogue</label>
          <select v-model="selectedGroupeFilter" class="filter-select">
            <option value="">Tous les catalogues</option>
            <option 
              v-for="groupe in groupesStore.groupes" 
              :key="groupe.id" 
              :value="groupe.id"
            >
              {{ groupe.nom }}
            </option>
          </select>
        </div>
        <div class="filter-info">
          <span class="commande-count">
            {{ filteredCommandes.length }} commande{{ filteredCommandes.length > 1 ? 's' : '' }}
          </span>
          <button 
            v-if="selectedGroupeFilter" 
            class="clear-filter-btn"
            @click="selectedGroupeFilter = ''"
          >
            Effacer le filtre
          </button>
        </div>
      </div>

      <!-- Commandes List -->
      <div v-if="commandesStore.loading" class="loading-state">
        <div class="loading-spinner"></div>
        <span class="loading-state-text">Chargement des commandes...</span>
      </div>

      <div v-else-if="commandesStore.error" class="error-state">
        <p>{{ commandesStore.error }}</p>
        <Button variant="secondary" @click="commandesStore.fetchCommandes()">Réessayer</Button>
      </div>

      <div v-else-if="filteredCommandes.length === 0" class="empty-state">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
        </div>
        <h3 class="empty-state-title">
          {{ selectedGroupeFilter ? 'Aucune commande trouvée' : 'Aucune commande' }}
        </h3>
        <p class="empty-state-description">
          {{ selectedGroupeFilter ? 'Aucune commande ne correspond à ce filtre' : 'Créez votre première commande' }}
        </p>
        <Button v-if="!selectedGroupeFilter" @click="openCreateModal">Nouvelle commande</Button>
      </div>

      <div v-else class="commandes-grid">
        <div
          v-for="commande in filteredCommandes"
          :key="commande.id"
          class="commande-card"
          @click="viewCommande(commande)"
        >
          <!-- Header -->
          <div class="commande-header">
            <div class="commande-number">
              <span class="number-label">Commande n°</span>
              <span class="number-value">{{ commande.id }}</span>
            </div>
            <span :class="['status-pill', commande.reglee ? 'status-success' : 'status-warning']">
              {{ commande.reglee ? 'Réglée' : 'En attente' }}
            </span>
          </div>

          <!-- Client -->
          <div class="commande-client">
            <div class="client-avatar-small">
              {{ getClientInitials(commande.client_id) }}
            </div>
            <span class="client-name">{{ getClientName(commande.client_id) }}</span>
          </div>

          <!-- Details -->
          <div class="commande-details-row">
            <div class="detail-left">
              <span class="detail-catalogue">{{ getGroupeName(commande.groupe_id) }}</span>
              <div class="detail-tags">
                <span :class="['format-badge-small', `format-${commande.format_type.toLowerCase()}`]">
                  {{ commande.format_type }}
                </span>
                <span v-if="commande.papier_supplementaire" class="papier-badge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  +Papier
                </span>
              </div>
            </div>
            <div class="detail-price">
              {{ getCommandeTotalPrice(commande) }}€
            </div>
          </div>

          <!-- Collections -->
          <div class="commande-collections-preview">
            <span 
              v-for="col in getCommandeCollectionsPreview(commande.id)" 
              :key="col"
              class="collection-mini-chip"
            >
              {{ col }}
            </span>
          </div>

          <!-- Arrow -->
          <div class="commande-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Modal création/édition commande -->
      <Modal
        :is-open="isModalOpen"
        :title="modalTitle"
        max-width="700px"
        @close="closeModal"
      >
        <div class="order-wizard">
          <!-- Step 1: Client -->
          <div class="wizard-step">
            <div class="step-header">
              <div class="step-number">1</div>
              <div class="step-info">
                <h4 class="step-title">Cliente</h4>
                <p class="step-desc">Qui passe la commande ?</p>
              </div>
            </div>
            <div class="step-content">
              <FormSelect
                v-model="formData.client_id"
                label=""
                :options="clientsOptions"
                placeholder="Sélectionner une cliente..."
                :error="errors.client_id"
              />
            </div>
          </div>

          <!-- Step 2: Catalogue & Format -->
          <div class="wizard-step" :class="{ 'step-disabled': !formData.client_id }">
            <div class="step-header">
              <div class="step-number">2</div>
              <div class="step-info">
                <h4 class="step-title">Catalogue & Format</h4>
                <p class="step-desc">Choisissez le catalogue et le format</p>
              </div>
            </div>
            <div class="step-content">
              <FormSelect
                v-model="formData.groupe_id"
                label="Catalogue"
                :options="groupesOptions"
                placeholder="Sélectionner un catalogue..."
                :error="errors.groupe_id"
                :disabled="!formData.client_id"
                @update:model-value="onCatalogueChange"
              />

              <div v-if="formData.groupe_id && selectedGroupePrices" class="format-selector">
                <label class="format-selector-label">Format</label>
                <div class="format-cards">
                  <div 
                    v-for="format in ['A', 'B', 'C']" 
                    :key="format"
                    :class="['format-card', `format-card-${format.toLowerCase()}`, { 'format-card-selected': formData.format_type === format }]"
                    @click="selectFormat(format)"
                  >
                    <div class="format-card-letter">{{ format }}</div>
                    <div class="format-card-price">{{ selectedGroupePrices[`format_${format}_prix`] }}€</div>
                    <div class="format-card-collections">{{ format === 'C' ? '1 collection' : '2 collections' }}</div>
                    <div v-if="formData.format_type === format" class="format-card-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  </div>
                </div>
                <p v-if="errors.format_type" class="form-error">{{ errors.format_type }}</p>
              </div>
            </div>
          </div>

          <!-- Step 3: Collections -->
          <div class="wizard-step" :class="{ 'step-disabled': !formData.format_type }">
            <div class="step-header">
              <div class="step-number">3</div>
              <div class="step-info">
                <h4 class="step-title">Collections</h4>
                <p class="step-desc">
                  {{ formData.format_type === 'C' ? 'Choisissez 1 collection' : 'Choisissez 2 collections' }}
                </p>
              </div>
            </div>
            <div class="step-content">
              <div v-if="catalogueCollections.length > 0" class="collections-picker">
                <div 
                  v-for="col in catalogueCollections" 
                  :key="col.id"
                  :class="['collection-pick-card', { 'collection-picked': isCollectionSelected(col.id) }]"
                  @click="toggleCollection(col.id)"
                >
                  <div class="pick-checkbox">
                    <svg v-if="isCollectionSelected(col.id)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <span class="pick-name">{{ col.nom }}</span>
                  <span class="pick-order" v-if="isCollectionSelected(col.id)">
                    {{ getCollectionOrder(col.id) }}
                  </span>
                </div>
              </div>
              <div v-else-if="formData.groupe_id" class="collections-empty-picker">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
                <p>Aucune collection dans ce catalogue</p>
              </div>
              <p v-if="errors.collections" class="form-error">{{ errors.collections }}</p>
            </div>
          </div>

          <!-- Step 4: Options -->
          <div class="wizard-step" :class="{ 'step-disabled': !hasValidCollections }">
            <div class="step-header">
              <div class="step-number">4</div>
              <div class="step-info">
                <h4 class="step-title">Paiement & Options</h4>
                <p class="step-desc">Finalisez la commande</p>
              </div>
            </div>
            <div class="step-content">
              <div class="options-grid">
                <FormSelect
                  v-model="formData.methode_paiement"
                  label="Méthode de paiement"
                  :options="paiementOptions"
                  placeholder="Sélectionner..."
                  :error="errors.methode_paiement"
                  :disabled="!hasValidCollections"
                />

                <div class="option-checkboxes">
                  <FormCheckbox
                    v-model="formData.papier_supplementaire"
                    label="Papier supplémentaire"
                    :disabled="!hasValidCollections"
                  />
                  <FormCheckbox
                    v-model="formData.reglee"
                    label="Commande réglée"
                    description="Cochez si le paiement a été effectué"
                    :disabled="!hasValidCollections"
                  />
                </div>
              </div>

              <FormInput
                v-model="formData.articles_supplementaires"
                label="Articles supplémentaires"
                placeholder="Ex: Marque-pages, Carte postale..."
                :disabled="!hasValidCollections"
              />
            </div>
          </div>

          <!-- Summary -->
          <div v-if="hasValidCollections && formData.methode_paiement" class="order-summary">
            <div class="summary-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            </div>
            <div class="summary-details">
              <span class="summary-title">Récapitulatif</span>
              <span class="summary-text">
                {{ selectedCollections.length }} collection(s) · Format {{ formData.format_type }} · {{ formData.methode_paiement }}
                <template v-if="formData.papier_supplementaire"> · +Papier</template>
              </span>
            </div>
            <div class="summary-price-group">
              <div v-if="formData.papier_supplementaire" class="summary-price-detail">
                <span>{{ selectedGroupePrices?.[`format_${formData.format_type}_prix`] || 0 }}€ + {{ SUPPLEMENT_PAPIER }}€</span>
              </div>
              <div class="summary-price">{{ totalPrice }}€</div>
            </div>
          </div>
        </div>
        <template #footer>
          <Button variant="secondary" @click="closeModal">Annuler</Button>
          <Button @click="handleSubmit" :loading="saving" :disabled="!canSubmit">
            {{ isEditing ? 'Enregistrer' : 'Créer la commande' }}
          </Button>
        </template>
      </Modal>

      <!-- Modal Vue Commande -->
      <Modal
        :is-open="isViewModalOpen"
        :title="''"
        max-width="600px"
        @close="closeViewModal"
      >
        <div v-if="selectedCommande" class="commande-view">
          <div class="view-header">
            <div class="view-number">
              <span class="view-hash">#</span>{{ selectedCommande.id }}
            </div>
            <span :class="['status-pill status-pill-lg', selectedCommande.reglee ? 'status-success' : 'status-warning']">
              {{ selectedCommande.reglee ? 'Réglée' : 'En attente' }}
            </span>
          </div>

          <div class="view-client">
            <div class="view-client-avatar">
              {{ getClientInitials(selectedCommande.client_id) }}
            </div>
            <div class="view-client-info">
              <span class="view-client-name">{{ getClientName(selectedCommande.client_id) }}</span>
              <span class="view-client-label">Cliente</span>
            </div>
          </div>

          <div class="view-details">
            <div class="view-detail-row">
              <span class="view-detail-label">Catalogue</span>
              <span class="view-detail-value">{{ getGroupeName(selectedCommande.groupe_id) }}</span>
            </div>
            <div class="view-detail-row">
              <span class="view-detail-label">Format</span>
              <span :class="['format-badge-view', `format-${selectedCommande.format_type.toLowerCase()}`]">
                {{ selectedCommande.format_type }}
              </span>
            </div>
            <div class="view-detail-row">
              <span class="view-detail-label">Prix</span>
              <span class="view-detail-value view-price">{{ getFormatPrice(selectedCommande) }}€</span>
            </div>
            <div class="view-detail-row">
              <span class="view-detail-label">Paiement</span>
              <span class="view-detail-value">{{ selectedCommande.methode_paiement }}</span>
            </div>
          </div>

          <div v-if="viewCollections.length > 0" class="view-collections">
            <span class="view-collections-label">Collections</span>
            <div class="view-collections-list">
              <span v-for="col in viewCollections" :key="col.id" class="view-collection-chip">
                {{ col.nom }}
              </span>
            </div>
          </div>

          <div v-if="selectedCommande.papier_supplementaire || selectedCommande.articles_supplementaires" class="view-extras">
            <span v-if="selectedCommande.papier_supplementaire" class="view-extra-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              Papier supplémentaire
            </span>
            <span v-if="selectedCommande.articles_supplementaires" class="view-extra-badge">
              {{ selectedCommande.articles_supplementaires }}
            </span>
          </div>
        </div>
        <template #footer>
          <Button variant="danger" @click="confirmDeleteFromView">
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </template>
            Supprimer
          </Button>
          <Button variant="secondary" @click="editFromView">
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </template>
            Modifier
          </Button>
        </template>
      </Modal>

      <!-- Confirm Delete Dialog -->
      <ConfirmDialog
        :is-open="isDeleteDialogOpen"
        title="Supprimer la commande"
        :message="`Êtes-vous sûr de vouloir supprimer la commande #${commandeToDelete?.id} ? Cette action est irréversible.`"
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
import Modal from '../components/Modal.vue';
import Button from '../components/Button.vue';
import FormInput from '../components/FormInput.vue';
import FormSelect from '../components/FormSelect.vue';
import FormCheckbox from '../components/FormCheckbox.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import { useCommandesStore } from '../stores/commandes';
import { useClientsStore } from '../stores/clients';
import { useGroupesStore } from '../stores/groupes';
import { useCollectionsStore } from '../stores/collections';

const commandesStore = useCommandesStore();
const clientsStore = useClientsStore();
const groupesStore = useGroupesStore();
const collectionsStore = useCollectionsStore();

// State
const isModalOpen = ref(false);
const isViewModalOpen = ref(false);
const isDeleteDialogOpen = ref(false);
const isEditing = ref(false);
const editingCommandeId = ref(null);
const selectedCommande = ref(null);
const commandeToDelete = ref(null);
const selectedGroupeFilter = ref('');
const saving = ref(false);

// View modal
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

// Cache collections par commande
const commandeCollectionsCache = reactive({});

// Computed
const modalTitle = computed(() => isEditing.value ? 'Modifier la commande' : 'Nouvelle commande');

const clientsOptions = computed(() => {
  return clientsStore.clients.map(c => ({
    value: c.id.toString(),
    label: `${c.prenom} ${c.nom}`,
  }));
});

const groupesOptions = computed(() => {
  return groupesStore.groupes.map(g => ({
    value: g.id.toString(),
    label: g.nom,
  }));
});

const paiementOptions = [
  { value: 'Paypal', label: 'Paypal' },
  { value: 'chèque', label: 'Chèque' },
  { value: 'virement', label: 'Virement' },
];

const selectedGroupePrices = computed(() => {
  if (!formData.value.groupe_id) return null;
  return groupesStore.getGroupeById(parseInt(formData.value.groupe_id));
});

const requiredCollectionsCount = computed(() => {
  return formData.value.format_type === 'C' ? 1 : 2;
});

const hasValidCollections = computed(() => {
  return selectedCollections.value.length === requiredCollectionsCount.value;
});

const canSubmit = computed(() => {
  return formData.value.client_id 
    && formData.value.groupe_id 
    && formData.value.format_type 
    && hasValidCollections.value 
    && formData.value.methode_paiement;
});

const SUPPLEMENT_PAPIER = 3.5;

const totalPrice = computed(() => {
  const basePrice = selectedGroupePrices.value?.[`format_${formData.value.format_type}_prix`] || 0;
  const supplement = formData.value.papier_supplementaire ? SUPPLEMENT_PAPIER : 0;
  return basePrice + supplement;
});

const filteredCommandes = computed(() => {
  if (!selectedGroupeFilter.value) {
    return commandesStore.commandes;
  }
  return commandesStore.commandes.filter(c => c.groupe_id === parseInt(selectedGroupeFilter.value));
});

// Helpers
const getClientName = (clientId) => {
  const client = clientsStore.getClientById(clientId);
  return client ? `${client.prenom} ${client.nom}` : `Client #${clientId}`;
};

const getClientInitials = (clientId) => {
  const client = clientsStore.getClientById(clientId);
  if (!client) return '?';
  return `${client.prenom?.[0] || ''}${client.nom?.[0] || ''}`.toUpperCase();
};

const getGroupeName = (groupeId) => {
  const groupe = groupesStore.getGroupeById(groupeId);
  return groupe ? groupe.nom : `Catalogue #${groupeId}`;
};

const getFormatPrice = (commande) => {
  const groupe = groupesStore.getGroupeById(commande.groupe_id);
  if (!groupe) return 0;
  return groupe[`format_${commande.format_type}_prix`] || 0;
};

const getCommandeTotalPrice = (commande) => {
  const basePrice = getFormatPrice(commande);
  const supplement = commande.papier_supplementaire ? SUPPLEMENT_PAPIER : 0;
  return basePrice + supplement;
};

const getCommandeCollectionsPreview = (commandeId) => {
  return commandeCollectionsCache[commandeId] || [];
};

const isCollectionSelected = (colId) => {
  return selectedCollections.value.includes(colId);
};

const getCollectionOrder = (colId) => {
  return selectedCollections.value.indexOf(colId) + 1;
};

// Actions
const onCatalogueChange = async () => {
  formData.value.format_type = '';
  selectedCollections.value = [];
  
  if (formData.value.groupe_id) {
    try {
      catalogueCollections.value = await groupesStore.fetchGroupeCollections(parseInt(formData.value.groupe_id));
    } catch (error) {
      console.error('Erreur:', error);
      catalogueCollections.value = [];
    }
  } else {
    catalogueCollections.value = [];
  }
};

const selectFormat = (format) => {
  formData.value.format_type = format;
  // Reset collections si on change de format
  selectedCollections.value = [];
};

const toggleCollection = (colId) => {
  if (!formData.value.format_type) return;
  
  const index = selectedCollections.value.indexOf(colId);
  if (index > -1) {
    selectedCollections.value.splice(index, 1);
  } else {
    if (selectedCollections.value.length < requiredCollectionsCount.value) {
      selectedCollections.value.push(colId);
    }
  }
};

const openCreateModal = () => {
  isEditing.value = false;
  editingCommandeId.value = null;
  formData.value = {
    client_id: '',
    groupe_id: '',
    format_type: '',
    methode_paiement: '',
    papier_supplementaire: false,
    articles_supplementaires: '',
    reglee: false,
  };
  selectedCollections.value = [];
  catalogueCollections.value = [];
  errors.value = {};
  isModalOpen.value = true;
};

const editFromView = async () => {
  const commande = selectedCommande.value;
  const collections = [...viewCollections.value];
  closeViewModal();
  
  isEditing.value = true;
  editingCommandeId.value = commande.id;
  
  formData.value = {
    client_id: commande.client_id.toString(),
    groupe_id: commande.groupe_id.toString(),
    format_type: commande.format_type,
    methode_paiement: commande.methode_paiement,
    papier_supplementaire: commande.papier_supplementaire === 1,
    articles_supplementaires: commande.articles_supplementaires || '',
    reglee: commande.reglee === 1,
  };
  
  // Load catalogue collections
  try {
    catalogueCollections.value = await groupesStore.fetchGroupeCollections(commande.groupe_id);
  } catch (error) {
    catalogueCollections.value = [];
  }
  
  selectedCollections.value = collections.map(c => c.id);
  errors.value = {};
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const handleSubmit = async () => {
  errors.value = {};

  if (!formData.value.client_id) errors.value.client_id = 'Requis';
  if (!formData.value.groupe_id) errors.value.groupe_id = 'Requis';
  if (!formData.value.format_type) errors.value.format_type = 'Requis';
  if (!formData.value.methode_paiement) errors.value.methode_paiement = 'Requis';
  
  if (selectedCollections.value.length !== requiredCollectionsCount.value) {
    errors.value.collections = `Sélectionnez ${requiredCollectionsCount.value} collection(s)`;
  }

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

    let commandeId;
    if (isEditing.value) {
      await commandesStore.updateCommande(editingCommandeId.value, data);
      commandeId = editingCommandeId.value;
      
      // Remove old collections
      try {
        const oldCollections = await commandesStore.fetchCommandeCollections(commandeId);
        for (const col of oldCollections) {
          await commandesStore.removeCollectionFromCommande(commandeId, col.id);
        }
      } catch (error) {
        console.error('Erreur:', error);
      }
    } else {
      const newCommande = await commandesStore.createCommande(data);
      commandeId = newCommande.id;
    }

    // Add selected collections
    for (const colId of selectedCollections.value) {
      await commandesStore.addCollectionToCommande(commandeId, colId);
    }

    // Refresh
    await loadCommandesCollections();
    closeModal();
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    saving.value = false;
  }
};

// View
const viewCommande = async (commande) => {
  selectedCommande.value = commande;
  try {
    viewCollections.value = await commandesStore.fetchCommandeCollections(commande.id);
  } catch (error) {
    viewCollections.value = [];
  }
  isViewModalOpen.value = true;
};

const closeViewModal = () => {
  isViewModalOpen.value = false;
  selectedCommande.value = null;
  viewCollections.value = [];
};

const confirmDeleteFromView = () => {
  commandeToDelete.value = selectedCommande.value;
  closeViewModal();
  isDeleteDialogOpen.value = true;
};

const deleteCommande = async () => {
  if (!commandeToDelete.value) return;
  try {
    await commandesStore.deleteCommande(commandeToDelete.value.id);
    delete commandeCollectionsCache[commandeToDelete.value.id];
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    isDeleteDialogOpen.value = false;
    commandeToDelete.value = null;
  }
};

// Load collections for display
const loadCommandesCollections = async () => {
  for (const commande of commandesStore.commandes) {
    try {
      const collections = await commandesStore.fetchCommandeCollections(commande.id);
      commandeCollectionsCache[commande.id] = collections.map(c => c.nom);
    } catch (error) {
      commandeCollectionsCache[commande.id] = [];
    }
  }
};

onMounted(async () => {
  try {
    await Promise.all([
      commandesStore.fetchCommandes(),
      clientsStore.fetchClients(),
      groupesStore.fetchGroupes(),
      collectionsStore.fetchCollections(),
    ]);
    await loadCommandesCollections();
  } catch (error) {
    console.error('Erreur:', error);
  }
});
</script>

<style scoped>
.commandes-view {
  max-width: 1200px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-6);
}

.page-title {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  letter-spacing: var(--letter-spacing-tight);
  margin-bottom: var(--spacing-1);
}

.page-subtitle {
  font-size: var(--font-size-md);
  color: var(--text-secondary);
}

/* === Filters === */
.filters-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-6);
  padding: var(--spacing-4) var(--spacing-5);
  background: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--border-color-light);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.filter-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.filter-select {
  padding: var(--spacing-2) var(--spacing-4);
  background: var(--bg-primary);
  border: 1.5px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: var(--font-size-sm);
  font-family: var(--font-family);
  color: var(--text-primary);
  min-width: 200px;
  cursor: pointer;
}

.filter-select:focus {
  outline: none;
  border-color: var(--rose-400);
}

.filter-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
}

.commande-count {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.clear-filter-btn {
  font-size: var(--font-size-sm);
  color: var(--rose-600);
  background: none;
  border: none;
  cursor: pointer;
}

/* === Commandes Grid === */
.commandes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--spacing-4);
}

.commande-card {
  background: var(--bg-primary);
  border-radius: var(--border-radius-xl);
  padding: var(--spacing-5);
  border: 1px solid var(--border-color-light);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all var(--transition-normal);
  position: relative;
}

.commande-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--rose-200);
}

.commande-card:hover .commande-arrow {
  opacity: 1;
  transform: translateX(4px);
}

.commande-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-4);
}

.commande-number {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-1);
}

.number-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
}

.number-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
}

.status-pill {
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.status-pill-lg {
  padding: var(--spacing-2) var(--spacing-4);
  font-size: var(--font-size-sm);
}

.status-success {
  background: #d1fae5;
  color: #059669;
}

.status-warning {
  background: #fef3c7;
  color: #d97706;
}

.commande-client {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
  padding-bottom: var(--spacing-4);
  border-bottom: 1px solid var(--border-color-light);
}

.client-avatar-small {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, var(--rose-400) 0%, var(--rose-600) 100%);
  border-radius: var(--border-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.client-name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.commande-details-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-3);
}

.detail-left {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.detail-catalogue {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.detail-tags {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.papier-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: #fef3c7;
  color: #d97706;
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.papier-badge svg {
  width: 12px;
  height: 12px;
}

.detail-price {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--rose-600);
}

.format-badge-small {
  width: 24px;
  height: 24px;
  border-radius: var(--border-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: white;
}

.format-a { background: #2563eb; }
.format-b { background: var(--rose-500); }
.format-c { background: #059669; }

.commande-collections-preview {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-1);
}

.collection-mini-chip {
  background: var(--gray-100);
  padding: 2px 8px;
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.commande-arrow {
  position: absolute;
  right: var(--spacing-4);
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  opacity: 0.3;
  transition: all var(--transition-normal);
}

.commande-arrow svg {
  width: 20px;
  height: 20px;
}

/* === Order Wizard === */
.order-wizard {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-5);
}

.wizard-step {
  background: var(--gray-50);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-5);
  transition: opacity var(--transition-normal);
}

.step-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.step-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-4);
}

.step-number {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--rose-400) 0%, var(--rose-600) 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-sm);
  flex-shrink: 0;
}

.step-info {
  flex: 1;
}

.step-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0;
}

.step-desc {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
}

.step-content {
  padding-left: calc(32px + var(--spacing-4));
}

/* === Format Selector === */
.format-selector {
  margin-top: var(--spacing-4);
}

.format-selector-label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  margin-bottom: var(--spacing-3);
}

.format-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-3);
}

.format-card {
  padding: var(--spacing-4);
  border-radius: var(--border-radius-lg);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: center;
  position: relative;
}

.format-card-a {
  background: #dbeafe;
}
.format-card-a:hover, .format-card-a.format-card-selected {
  border-color: #2563eb;
}

.format-card-b {
  background: #fce7f3;
}
.format-card-b:hover, .format-card-b.format-card-selected {
  border-color: var(--rose-500);
}

.format-card-c {
  background: #d1fae5;
}
.format-card-c:hover, .format-card-c.format-card-selected {
  border-color: #059669;
}

.format-card-letter {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-1);
}

.format-card-a .format-card-letter { color: #2563eb; }
.format-card-b .format-card-letter { color: var(--rose-600); }
.format-card-c .format-card-letter { color: #059669; }

.format-card-price {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.format-card-collections {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-top: var(--spacing-1);
}

.format-card-check {
  position: absolute;
  top: var(--spacing-2);
  right: var(--spacing-2);
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.format-card-check svg {
  width: 12px;
  height: 12px;
}

.format-card-a .format-card-check svg { color: #2563eb; }
.format-card-b .format-card-check svg { color: var(--rose-500); }
.format-card-c .format-card-check svg { color: #059669; }

/* === Collections Picker === */
.collections-picker {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.collection-pick-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--bg-primary);
  border: 2px solid var(--border-color-light);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.collection-pick-card:hover {
  border-color: var(--rose-300);
}

.collection-picked {
  border-color: var(--rose-500);
  background: var(--rose-50);
}

.pick-checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid var(--gray-300);
  border-radius: var(--border-radius-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.collection-picked .pick-checkbox {
  background: var(--rose-500);
  border-color: var(--rose-500);
}

.pick-checkbox svg {
  width: 14px;
  height: 14px;
  color: white;
}

.pick-name {
  flex: 1;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.pick-order {
  width: 24px;
  height: 24px;
  background: var(--rose-100);
  color: var(--rose-600);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.collections-empty-picker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-6);
  color: var(--text-tertiary);
  text-align: center;
}

.collections-empty-picker svg {
  width: 32px;
  height: 32px;
}

/* === Options Grid === */
.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-4);
}

.option-checkboxes {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  padding-top: var(--spacing-6);
}

/* === Order Summary === */
.order-summary {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
  background: linear-gradient(135deg, var(--rose-50) 0%, #fce7f3 100%);
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--rose-200);
}

.summary-icon {
  width: 44px;
  height: 44px;
  background: var(--rose-500);
  border-radius: var(--border-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.summary-icon svg {
  width: 22px;
  height: 22px;
}

.summary-details {
  flex: 1;
}

.summary-title {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.summary-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.summary-price-group {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.summary-price-detail {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.summary-price {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--rose-600);
}

/* === View Modal === */
.commande-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-5);
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: var(--spacing-4);
  border-bottom: 1px solid var(--border-color-light);
}

.view-number {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
}

.view-hash {
  color: var(--rose-400);
}

.view-client {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
}

.view-client-avatar {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, var(--rose-400) 0%, var(--rose-600) 100%);
  border-radius: var(--border-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
}

.view-client-info {
  display: flex;
  flex-direction: column;
}

.view-client-name {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.view-client-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.view-details {
  background: var(--gray-50);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-4);
}

.view-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-3) 0;
}

.view-detail-row:not(:last-child) {
  border-bottom: 1px solid var(--border-color-light);
}

.view-detail-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.view-detail-value {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.view-price {
  font-size: var(--font-size-lg);
  color: var(--rose-600);
}

.format-badge-view {
  width: 32px;
  height: 32px;
  border-radius: var(--border-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-bold);
  color: white;
}

.view-collections {
  background: var(--gray-50);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-4);
}

.view-collections-label {
  display: block;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--spacing-3);
}

.view-collections-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.view-collection-chip {
  background: var(--rose-100);
  color: var(--rose-700);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.view-extras {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.view-extra-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  background: var(--gray-100);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.view-extra-badge svg {
  width: 14px;
  height: 14px;
}

/* === Form Error === */
.form-error {
  color: var(--error);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-2);
}

/* === Empty & Loading === */
.empty-state {
  text-align: center;
  padding: var(--spacing-16) var(--spacing-8);
}

.empty-state-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto var(--spacing-6);
  color: var(--text-tertiary);
}

.empty-state-icon svg {
  width: 100%;
  height: 100%;
}

.empty-state-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-2);
}

.empty-state-description {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-6);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-16);
  gap: var(--spacing-4);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--rose-100);
  border-top-color: var(--rose-500);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.error-state {
  text-align: center;
  padding: var(--spacing-16);
  color: var(--error);
}

/* === Responsive === */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: var(--spacing-4);
  }
  
  .filters-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .commandes-grid {
    grid-template-columns: 1fr;
  }
  
  .format-cards {
    grid-template-columns: 1fr;
  }
  
  .options-grid {
    grid-template-columns: 1fr;
  }
  
  .step-content {
    padding-left: 0;
  }
}
</style>
