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
          <label class="filter-label">Filtrer par groupe</label>
          <select v-model="selectedGroupeFilter" class="filter-select">
            <option value="">Tous les groupes</option>
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

      <div v-else class="commandes-list">
        <div
          v-for="commande in filteredCommandes"
          :key="commande.id"
          class="commande-card"
        >
          <div class="commande-header">
            <div class="commande-id-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              <span>#{{ commande.id }}</span>
            </div>
            <span :class="['status-badge', commande.reglee ? 'status-success' : 'status-warning']">
              {{ commande.reglee ? 'Réglée' : 'En attente' }}
            </span>
          </div>

          <div class="commande-body">
            <div class="commande-info-grid">
              <div class="info-item">
                <span class="info-label">Client</span>
                <span class="info-value">{{ getClientName(commande.client_id) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Collection</span>
                <span class="info-value">{{ commandeCollectionsMap[commande.id] || '...' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Format</span>
                <span class="info-value format-badge">{{ commande.format_type }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Paiement</span>
                <span class="info-value">{{ commande.methode_paiement }}</span>
              </div>
            </div>
            
            <div v-if="commande.papier_supplementaire || commande.articles_supplementaires" class="commande-extras">
              <span v-if="commande.papier_supplementaire" class="extra-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                Papier supp.
              </span>
              <span v-if="commande.articles_supplementaires" class="extra-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                {{ commande.articles_supplementaires }}
              </span>
            </div>
          </div>

          <div class="commande-actions">
            <button class="action-btn" title="Voir les détails" @click="viewCommande(commande)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
            <button class="action-btn" title="Modifier" @click="editCommande(commande)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="action-btn action-btn-danger" title="Supprimer" @click="confirmDelete(commande)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Modal création/édition commande -->
      <Modal
        :is-open="isModalOpen"
        :title="modalTitle"
        @close="closeModal"
      >
        <form @submit.prevent="handleSubmit">
          <FormSelect
            v-model="formData.client_id"
            label="Client"
            :options="clientsOptions"
            placeholder="Sélectionner un client"
            required
            :error="errors.client_id"
          />
          
          <FormSelect
            v-model="formData.collection_id"
            label="Collection"
            :options="collectionsOptions"
            placeholder="Sélectionner une collection"
            required
            :error="errors.collection_id"
            :disabled="collectionsOptions.length === 0"
            @update:model-value="onCollectionChange"
          />

          <div class="form-row">
            <FormSelect
              v-model="formData.format_type"
              label="Format"
              :options="formatOptions"
              placeholder="Sélectionner"
              required
              :error="errors.format_type"
              :disabled="!formData.collection_id"
            />
            <FormSelect
              v-model="formData.methode_paiement"
              label="Méthode de paiement"
              :options="paiementOptions"
              placeholder="Sélectionner"
              required
              :error="errors.methode_paiement"
            />
          </div>

          <FormCheckbox
            v-model="formData.papier_supplementaire"
            label="Papier supplémentaire"
          />

          <FormInput
            v-model="formData.articles_supplementaires"
            label="Articles supplémentaires"
            placeholder="Description des articles supplémentaires"
          />

          <FormCheckbox
            v-model="formData.reglee"
            label="Commande réglée"
            description="Cochez si le paiement a été effectué"
          />
        </form>
        <template #footer>
          <Button variant="secondary" @click="closeModal">Annuler</Button>
          <Button @click="handleSubmit" :loading="saving">
            {{ isEditing ? 'Enregistrer' : 'Créer' }}
          </Button>
        </template>
      </Modal>

      <!-- Modal détails commande -->
      <Modal
        :is-open="isDetailsModalOpen"
        :title="`Commande #${selectedCommande?.id}`"
        @close="closeDetailsModal"
      >
        <div v-if="commandeDetailsLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <span class="loading-state-text">Chargement...</span>
        </div>
        <div v-else-if="commandeDetails" class="commande-details">
          <div class="detail-section">
            <div class="detail-row">
              <span class="detail-label">Client</span>
              <span class="detail-value">{{ getClientName(commandeDetails.client_id) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Groupe</span>
              <span class="detail-value">{{ getGroupeName(commandeDetails.groupe_id) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Format</span>
              <span class="detail-value">{{ commandeDetails.format_type }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Paiement</span>
              <span class="detail-value">{{ commandeDetails.methode_paiement }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Statut</span>
              <span :class="['status-badge', commandeDetails.reglee ? 'status-success' : 'status-warning']">
                {{ commandeDetails.reglee ? 'Réglée' : 'En attente' }}
              </span>
            </div>
          </div>

          <div v-if="commandeCollections.length > 0" class="detail-section">
            <h4 class="detail-section-title">Collections</h4>
            <div class="detail-collections">
              <span 
                v-for="collection in commandeCollections" 
                :key="collection.id"
                class="collection-tag"
              >
                {{ collection.nom }}
              </span>
            </div>
          </div>
        </div>
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
import { ref, computed, onMounted, watch } from 'vue';
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

const isModalOpen = ref(false);
const isDetailsModalOpen = ref(false);
const isDeleteDialogOpen = ref(false);
const isEditing = ref(false);
const editingCommandeId = ref(null);
const selectedCommande = ref(null);
const commandeToDelete = ref(null);
const commandeDetails = ref(null);
const commandeCollections = ref([]);
const commandeDetailsLoading = ref(false);
const selectedGroupeFilter = ref('');
const saving = ref(false);

const formData = ref({
  client_id: '',
  collection_id: '',
  groupe_id: null,
  format_type: '',
  methode_paiement: '',
  papier_supplementaire: false,
  articles_supplementaires: '',
  reglee: false,
});

const errors = ref({});
const commandeCollectionsMap = ref({});
const collectionsOptions = ref([]);

const modalTitle = computed(() => {
  return isEditing.value ? 'Modifier la commande' : 'Nouvelle commande';
});

const clientsOptions = computed(() => {
  return clientsStore.clients.map(c => ({
    value: c.id,
    label: `${c.prenom} ${c.nom}`,
  }));
});

const formatOptions = [
  { value: 'A', label: 'Format A' },
  { value: 'B', label: 'Format B' },
  { value: 'C', label: 'Format C' },
];

const paiementOptions = [
  { value: 'Paypal', label: 'Paypal' },
  { value: 'chèque', label: 'Chèque' },
  { value: 'virement', label: 'Virement' },
];

const filteredCommandes = computed(() => {
  if (!selectedGroupeFilter.value) {
    return commandesStore.commandes;
  }
  return commandesStore.commandes.filter(c => c.groupe_id === parseInt(selectedGroupeFilter.value));
});

const getClientName = (clientId) => {
  const client = clientsStore.getClientById(clientId);
  return client ? `${client.prenom} ${client.nom}` : `Client #${clientId}`;
};

const getGroupeName = (groupeId) => {
  const groupe = groupesStore.getGroupeById(groupeId);
  return groupe ? groupe.nom : `Groupe #${groupeId}`;
};

const loadCollectionsOptions = async () => {
  const options = [];
  for (const groupe of groupesStore.groupes) {
    try {
      const collections = await groupesStore.fetchGroupeCollections(groupe.id);
      for (const collection of collections) {
        if (!options.find(o => o.collectionId === collection.id)) {
          options.push({
            value: collection.id.toString(),
            label: `${collection.nom} (${groupe.nom})`,
            collectionId: collection.id,
            groupeId: groupe.id,
          });
        }
      }
    } catch (error) {
      console.error(`Erreur groupe ${groupe.id}:`, error);
    }
  }
  collectionsOptions.value = options;
};

const loadCommandesCollections = async () => {
  for (const commande of commandesStore.commandes) {
    try {
      const collections = await commandesStore.fetchCommandeCollections(commande.id);
      commandeCollectionsMap.value[commande.id] = collections.length > 0 ? collections[0].nom : 'Aucune';
    } catch (error) {
      commandeCollectionsMap.value[commande.id] = 'Erreur';
    }
  }
};

const findGroupeForCollection = (collectionId) => {
  const option = collectionsOptions.value.find(opt => opt.collectionId === parseInt(collectionId));
  return option ? option.groupeId : null;
};

const onCollectionChange = () => {
  formData.value.format_type = '';
  if (formData.value.collection_id) {
    formData.value.groupe_id = findGroupeForCollection(formData.value.collection_id);
  } else {
    formData.value.groupe_id = null;
  }
};

const openCreateModal = () => {
  isEditing.value = false;
  editingCommandeId.value = null;
  formData.value = {
    client_id: '',
    collection_id: '',
    groupe_id: null,
    format_type: '',
    methode_paiement: '',
    papier_supplementaire: false,
    articles_supplementaires: '',
    reglee: false,
  };
  errors.value = {};
  isModalOpen.value = true;
};

const editCommande = async (commande) => {
  isEditing.value = true;
  editingCommandeId.value = commande.id;
  
  let collectionId = '';
  try {
    const collections = await commandesStore.fetchCommandeCollections(commande.id);
    if (collections.length > 0) {
      collectionId = collections[0].id.toString();
    }
  } catch (error) {
    console.error('Erreur:', error);
  }
  
  formData.value = {
    client_id: commande.client_id.toString(),
    collection_id: collectionId,
    groupe_id: commande.groupe_id,
    format_type: commande.format_type,
    methode_paiement: commande.methode_paiement,
    papier_supplementaire: commande.papier_supplementaire === 1,
    articles_supplementaires: commande.articles_supplementaires || '',
    reglee: commande.reglee === 1,
  };
  errors.value = {};
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const handleSubmit = async () => {
  errors.value = {};

  if (!formData.value.client_id) errors.value.client_id = 'Requis';
  if (!formData.value.collection_id) errors.value.collection_id = 'Requis';
  if (!formData.value.format_type) errors.value.format_type = 'Requis';
  if (!formData.value.methode_paiement) errors.value.methode_paiement = 'Requis';

  if (!formData.value.groupe_id && formData.value.collection_id) {
    formData.value.groupe_id = findGroupeForCollection(formData.value.collection_id);
  }

  if (!formData.value.groupe_id) {
    errors.value.collection_id = 'Groupe introuvable';
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
    } else {
      const newCommande = await commandesStore.createCommande(data);
      commandeId = newCommande.id;
    }

    if (commandeId && formData.value.collection_id) {
      if (isEditing.value) {
        try {
          const oldCollections = await commandesStore.fetchCommandeCollections(commandeId);
          for (const oldCollection of oldCollections) {
            await commandesStore.removeCollectionFromCommande(commandeId, oldCollection.id);
          }
        } catch (error) {
          console.error('Erreur:', error);
        }
      }
      await commandesStore.addCollectionToCommande(commandeId, parseInt(formData.value.collection_id));
    }

    await loadCommandesCollections();
    closeModal();
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    saving.value = false;
  }
};

const viewCommande = async (commande) => {
  selectedCommande.value = commande;
  commandeDetailsLoading.value = true;
  isDetailsModalOpen.value = true;
  try {
    commandeDetails.value = await commandesStore.fetchCommandeComplet(commande.id);
    commandeCollections.value = await commandesStore.fetchCommandeCollections(commande.id);
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    commandeDetailsLoading.value = false;
  }
};

const closeDetailsModal = () => {
  isDetailsModalOpen.value = false;
  selectedCommande.value = null;
  commandeDetails.value = null;
  commandeCollections.value = [];
};

const confirmDelete = (commande) => {
  commandeToDelete.value = commande;
  isDeleteDialogOpen.value = true;
};

const deleteCommande = async () => {
  if (!commandeToDelete.value) return;
  try {
    await commandesStore.deleteCommande(commandeToDelete.value.id);
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    isDeleteDialogOpen.value = false;
    commandeToDelete.value = null;
  }
};

watch(() => commandesStore.commandes.length, async (newLength, oldLength) => {
  if (newLength > 0 && newLength !== oldLength) {
    await loadCommandesCollections();
  }
});

onMounted(async () => {
  try {
    await Promise.all([
      commandesStore.fetchCommandes(),
      clientsStore.fetchClients(),
      groupesStore.fetchGroupes(),
      collectionsStore.fetchCollections(),
    ]);
    await loadCollectionsOptions();
    if (commandesStore.commandes.length > 0) {
      await loadCommandesCollections();
    }
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

/* === Filters Bar === */
.filters-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-6);
  padding: var(--spacing-5);
  background: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--border-color-light);
  box-shadow: var(--shadow-sm);
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
  box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.12);
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
  font-weight: var(--font-weight-medium);
}

.clear-filter-btn:hover {
  text-decoration: underline;
}

/* === Commandes List === */
.commandes-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.commande-card {
  background: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-5);
  border: 1px solid var(--border-color-light);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);
}

.commande-card:hover {
  border-color: var(--rose-200);
  box-shadow: var(--shadow-md);
}

.commande-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-4);
  padding-bottom: var(--spacing-4);
  border-bottom: 1px solid var(--border-color-light);
}

.commande-id-badge {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
}

.commande-id-badge svg {
  width: 20px;
  height: 20px;
  color: var(--rose-500);
}

.commande-body {
  margin-bottom: var(--spacing-4);
}

.commande-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--spacing-4);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.info-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.info-value.format-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--rose-100);
  color: var(--rose-600);
  border-radius: var(--border-radius-sm);
  font-weight: var(--font-weight-bold);
}

.commande-extras {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  margin-top: var(--spacing-4);
  padding-top: var(--spacing-4);
  border-top: 1px dashed var(--border-color-light);
}

.extra-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) var(--spacing-3);
  background: var(--gray-100);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.extra-badge svg {
  width: 12px;
  height: 12px;
}

.commande-actions {
  display: flex;
  gap: var(--spacing-2);
  padding-top: var(--spacing-4);
  border-top: 1px solid var(--border-color-light);
}

/* === Action Buttons === */
.action-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--gray-100);
  border-radius: var(--border-radius);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background: var(--rose-100);
  color: var(--rose-600);
}

.action-btn-danger:hover {
  background: var(--error-light);
  color: var(--error);
}

.action-btn svg {
  width: 18px;
  height: 18px;
}

/* === Status Badge === */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-1) var(--spacing-3);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  border-radius: var(--border-radius-full);
}

.status-success {
  background: var(--success-light);
  color: #059669;
}

.status-warning {
  background: var(--warning-light);
  color: #d97706;
}

/* === Form === */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-4);
}

/* === Details Modal === */
.commande-details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-5);
}

.detail-section {
  padding: var(--spacing-4);
  background: var(--gray-50);
  border-radius: var(--border-radius);
}

.detail-section-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-3);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-2) 0;
}

.detail-row:not(:last-child) {
  border-bottom: 1px solid var(--border-color-light);
}

.detail-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.detail-value {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.detail-collections {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.collection-tag {
  padding: var(--spacing-2) var(--spacing-3);
  background: var(--rose-100);
  color: var(--rose-700);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

/* === Empty & Loading States === */
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
  justify-content: center;
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
  
  .filter-select {
    min-width: auto;
    width: 100%;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .commande-info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
