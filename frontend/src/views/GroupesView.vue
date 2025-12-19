<template>
  <Layout>
    <div class="groupes-view">
      <!-- Page Header -->
      <header class="page-header">
        <div>
          <h1 class="page-title">Groupes de collections</h1>
          <p class="page-subtitle">Organisez vos collections par groupe</p>
        </div>
        <Button @click="openCreateGroupeModal">
          <template #icon>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </template>
          Créer un groupe
        </Button>
      </header>

      <!-- Groupes List -->
      <div v-if="groupesStore.loading" class="loading-state">
        <div class="loading-spinner"></div>
        <span class="loading-state-text">Chargement des groupes...</span>
      </div>

      <div v-else-if="groupesStore.error" class="error-state">
        <p>{{ groupesStore.error }}</p>
        <Button variant="secondary" @click="groupesStore.fetchGroupes()">Réessayer</Button>
      </div>

      <div v-else-if="groupesStore.groupes.length === 0" class="empty-state">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <h3 class="empty-state-title">Aucun groupe</h3>
        <p class="empty-state-description">Créez votre premier groupe de collections</p>
        <Button @click="openCreateGroupeModal">Créer un groupe</Button>
      </div>

      <div v-else class="groupes-list">
        <div
          v-for="groupe in groupesStore.groupes"
          :key="groupe.id"
          class="groupe-card"
        >
          <div class="groupe-header">
            <div class="groupe-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div class="groupe-info">
              <h3 class="groupe-name">{{ groupe.nom }}</h3>
              <p v-if="groupe.description" class="groupe-description">{{ groupe.description }}</p>
            </div>
            <div class="groupe-actions">
              <button class="action-btn" title="Gérer les collections" @click="manageCollections(groupe)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="8" y1="6" x2="21" y2="6"/>
                  <line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/>
                  <line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              </button>
              <button class="action-btn" title="Modifier" @click="editGroupe(groupe)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="action-btn action-btn-danger" title="Supprimer" @click="confirmDeleteGroupe(groupe)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Prix des formats -->
          <div class="groupe-formats">
            <div class="format-badge">
              <span class="format-label">Format A</span>
              <span class="format-price">{{ groupe.format_A_prix }}€</span>
            </div>
            <div class="format-badge">
              <span class="format-label">Format B</span>
              <span class="format-price">{{ groupe.format_B_prix }}€</span>
            </div>
            <div class="format-badge">
              <span class="format-label">Format C</span>
              <span class="format-price">{{ groupe.format_C_prix }}€</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal création/édition groupe -->
      <Modal
        :is-open="isGroupeModalOpen"
        :title="groupeModalTitle"
        @close="closeGroupeModal"
      >
        <form @submit.prevent="handleGroupeSubmit">
          <FormInput
            v-model="groupeFormData.nom"
            label="Nom du groupe"
            placeholder="Nom du groupe"
            required
            :error="groupeErrors.nom"
          />
          <FormInput
            v-model="groupeFormData.description"
            label="Description"
            placeholder="Description du groupe (optionnel)"
          />

          <div class="form-section">
            <h4 class="form-section-title">Prix des formats</h4>
            <div class="form-grid-3">
              <FormInput
                v-model.number="groupeFormData.format_A_prix"
                label="Format A (€)"
                type="number"
                min="0"
                step="0.01"
              />
              <FormInput
                v-model.number="groupeFormData.format_B_prix"
                label="Format B (€)"
                type="number"
                min="0"
                step="0.01"
              />
              <FormInput
                v-model.number="groupeFormData.format_C_prix"
                label="Format C (€)"
                type="number"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </form>
        <template #footer>
          <Button variant="secondary" @click="closeGroupeModal">Annuler</Button>
          <Button @click="handleGroupeSubmit" :loading="saving">
            {{ isEditingGroupe ? 'Enregistrer' : 'Créer' }}
          </Button>
        </template>
      </Modal>

      <!-- Modal gestion des collections -->
      <Modal
        :is-open="isCollectionsModalOpen"
        :title="`Collections - ${selectedGroupe?.nom}`"
        max-width="640px"
        @close="closeCollectionsModal"
      >
        <div v-if="collectionsLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <span class="loading-state-text">Chargement...</span>
        </div>
        <div v-else>
          <div class="collections-toolbar">
            <Button size="sm" @click="openCreateCollectionModal">
              <template #icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </template>
              Ajouter une collection
            </Button>
          </div>

          <div v-if="groupeCollections.length === 0" class="empty-state-mini">
            <p>Aucune collection dans ce groupe.</p>
          </div>
          <div v-else class="collections-list">
            <div
              v-for="(collection, index) in groupeCollections"
              :key="collection.id"
              class="collection-item"
            >
              <span class="collection-order">{{ index + 1 }}</span>
              <span class="collection-name">{{ collection.nom }}</span>
              <button 
                class="action-btn action-btn-danger" 
                title="Retirer du groupe"
                @click="removeCollectionFromGroupe(collection.id)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <!-- Modal ajout collection -->
      <Modal
        :is-open="isCreateCollectionModalOpen"
        title="Ajouter une collection"
        max-width="480px"
        @close="closeCreateCollectionModal"
      >
        <div class="collection-add-form">
          <div v-if="availableCollections.length > 0" class="form-option">
            <FormSelect
              v-model="selectedCollectionId"
              label="Collection existante"
              :options="availableCollections.map(c => ({ value: c.id.toString(), label: c.nom }))"
              placeholder="Sélectionner une collection"
            />
          </div>

          <div v-if="availableCollections.length > 0" class="divider">
            <span>ou</span>
          </div>

          <div class="form-option">
            <FormInput
              v-model="newCollectionName"
              label="Créer une nouvelle collection"
              placeholder="Nom de la nouvelle collection"
            />
          </div>
        </div>
        <template #footer>
          <Button variant="secondary" @click="closeCreateCollectionModal">Annuler</Button>
          <Button 
            @click="addCollectionToGroupe" 
            :disabled="(!selectedCollectionId || selectedCollectionId === '') && !newCollectionName.trim()"
            :loading="addingCollection"
          >
            Ajouter
          </Button>
        </template>
      </Modal>

      <!-- Confirm Delete Dialog -->
      <ConfirmDialog
        :is-open="isDeleteDialogOpen"
        title="Supprimer le groupe"
        :message="`Êtes-vous sûr de vouloir supprimer le groupe « ${groupeToDelete?.nom} » ? Cette action est irréversible.`"
        confirm-text="Supprimer"
        variant="danger"
        @confirm="deleteGroupe"
        @cancel="isDeleteDialogOpen = false"
      />
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Layout from '../components/Layout.vue';
import Modal from '../components/Modal.vue';
import Button from '../components/Button.vue';
import FormInput from '../components/FormInput.vue';
import FormSelect from '../components/FormSelect.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import { useGroupesStore } from '../stores/groupes';
import { useCollectionsStore } from '../stores/collections';

const groupesStore = useGroupesStore();
const collectionsStore = useCollectionsStore();

const isGroupeModalOpen = ref(false);
const isCollectionsModalOpen = ref(false);
const isCreateCollectionModalOpen = ref(false);
const isDeleteDialogOpen = ref(false);
const isEditingGroupe = ref(false);
const editingGroupeId = ref(null);
const selectedGroupe = ref(null);
const groupeToDelete = ref(null);
const groupeCollections = ref([]);
const collectionsLoading = ref(false);
const selectedCollectionId = ref('');
const newCollectionName = ref('');
const saving = ref(false);
const addingCollection = ref(false);

const groupeModalTitle = computed(() => {
  return isEditingGroupe.value ? 'Modifier le groupe' : 'Nouveau groupe';
});

const groupeFormData = ref({
  nom: '',
  description: '',
  format_A_prix: 0,
  format_B_prix: 0,
  format_C_prix: 0,
});

const groupeErrors = ref({});

const availableCollections = computed(() => {
  if (!selectedGroupe.value) return [];
  const groupeCollectionIds = groupeCollections.value.map(c => c.id);
  return collectionsStore.collections.filter(c => !groupeCollectionIds.includes(c.id));
});

const openCreateGroupeModal = () => {
  isEditingGroupe.value = false;
  editingGroupeId.value = null;
  groupeFormData.value = {
    nom: '',
    description: '',
    format_A_prix: 0,
    format_B_prix: 0,
    format_C_prix: 0,
  };
  groupeErrors.value = {};
  isGroupeModalOpen.value = true;
};

const editGroupe = (groupe) => {
  isEditingGroupe.value = true;
  editingGroupeId.value = groupe.id;
  groupeFormData.value = {
    nom: groupe.nom || '',
    description: groupe.description || '',
    format_A_prix: groupe.format_A_prix || 0,
    format_B_prix: groupe.format_B_prix || 0,
    format_C_prix: groupe.format_C_prix || 0,
  };
  groupeErrors.value = {};
  isGroupeModalOpen.value = true;
};

const closeGroupeModal = () => {
  isGroupeModalOpen.value = false;
};

const handleGroupeSubmit = async () => {
  groupeErrors.value = {};

  if (!groupeFormData.value.nom) {
    groupeErrors.value.nom = 'Le nom est requis';
    return;
  }

  saving.value = true;
  try {
    if (isEditingGroupe.value) {
      await groupesStore.updateGroupe(editingGroupeId.value, groupeFormData.value);
    } else {
      await groupesStore.createGroupe(groupeFormData.value);
    }
    closeGroupeModal();
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
  } finally {
    saving.value = false;
  }
};

const manageCollections = async (groupe) => {
  selectedGroupe.value = groupe;
  collectionsLoading.value = true;
  isCollectionsModalOpen.value = true;
  try {
    groupeCollections.value = await groupesStore.fetchGroupeCollections(groupe.id);
  } catch (error) {
    console.error('Erreur lors du chargement des collections:', error);
  } finally {
    collectionsLoading.value = false;
  }
};

const closeCollectionsModal = () => {
  isCollectionsModalOpen.value = false;
  selectedGroupe.value = null;
  groupeCollections.value = [];
};

const openCreateCollectionModal = () => {
  selectedCollectionId.value = '';
  newCollectionName.value = '';
  isCreateCollectionModalOpen.value = true;
};

const closeCreateCollectionModal = () => {
  isCreateCollectionModalOpen.value = false;
  selectedCollectionId.value = '';
  newCollectionName.value = '';
};

const addCollectionToGroupe = async () => {
  addingCollection.value = true;
  try {
    let collectionId = selectedCollectionId.value;

    if ((!collectionId || collectionId === '') && newCollectionName.value.trim()) {
      const newCollection = await collectionsStore.createCollection({
        nom: newCollectionName.value.trim(),
      });
      collectionId = newCollection.id.toString();
      await collectionsStore.fetchCollections();
    }

    if (!collectionId || collectionId === '') {
      return;
    }

    const ordre = groupeCollections.value.length + 1;
    await groupesStore.addCollectionToGroupe(
      selectedGroupe.value.id,
      parseInt(collectionId),
      ordre
    );
    groupeCollections.value = await groupesStore.fetchGroupeCollections(selectedGroupe.value.id);
    closeCreateCollectionModal();
  } catch (error) {
    console.error('Erreur lors de l\'ajout:', error);
  } finally {
    addingCollection.value = false;
  }
};

const removeCollectionFromGroupe = async (collectionId) => {
  try {
    await groupesStore.removeCollectionFromGroupe(selectedGroupe.value.id, collectionId);
    groupeCollections.value = await groupesStore.fetchGroupeCollections(selectedGroupe.value.id);
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
  }
};

const confirmDeleteGroupe = (groupe) => {
  groupeToDelete.value = groupe;
  isDeleteDialogOpen.value = true;
};

const deleteGroupe = async () => {
  if (!groupeToDelete.value) return;
  try {
    await groupesStore.deleteGroupe(groupeToDelete.value.id);
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
  } finally {
    isDeleteDialogOpen.value = false;
    groupeToDelete.value = null;
  }
};

onMounted(async () => {
  await Promise.all([
    groupesStore.fetchGroupes(),
    collectionsStore.fetchCollections(),
  ]);
});
</script>

<style scoped>
.groupes-view {
  max-width: 1200px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-8);
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

/* === Groupes List === */
.groupes-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.groupe-card {
  background: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-5);
  border: 1px solid var(--border-color-light);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);
}

.groupe-card:hover {
  border-color: var(--rose-200);
  box-shadow: var(--shadow-md);
}

.groupe-header {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-4);
}

.groupe-icon {
  width: 44px;
  height: 44px;
  background: var(--rose-100);
  border-radius: var(--border-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--rose-600);
  flex-shrink: 0;
}

.groupe-icon svg {
  width: 22px;
  height: 22px;
}

.groupe-info {
  flex: 1;
  min-width: 0;
}

.groupe-name {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-1);
}

.groupe-description {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
}

.groupe-actions {
  display: flex;
  gap: var(--spacing-2);
}

.groupe-formats {
  display: flex;
  gap: var(--spacing-3);
  padding-top: var(--spacing-4);
  border-top: 1px solid var(--border-color-light);
}

.format-badge {
  display: flex;
  flex-direction: column;
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--gray-50);
  border-radius: var(--border-radius);
  min-width: 80px;
}

.format-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-bottom: var(--spacing-1);
}

.format-price {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--rose-600);
}

/* === Action Buttons === */
.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--gray-100);
  border-radius: var(--border-radius-sm);
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
  width: 16px;
  height: 16px;
}

/* === Form === */
.form-section {
  margin-top: var(--spacing-6);
  padding-top: var(--spacing-5);
  border-top: 1px solid var(--border-color-light);
}

.form-section-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-4);
}

.form-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-4);
}

/* === Collections === */
.collections-toolbar {
  margin-bottom: var(--spacing-5);
}

.collections-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.collection-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--gray-50);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color-light);
}

.collection-order {
  width: 28px;
  height: 28px;
  background: var(--rose-100);
  color: var(--rose-600);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  flex-shrink: 0;
}

.collection-name {
  flex: 1;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

/* === Collection Add Form === */
.collection-add-form {
  display: flex;
  flex-direction: column;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: var(--spacing-4) 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--border-color);
}

.divider span {
  padding: 0 var(--spacing-4);
  color: var(--text-tertiary);
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

.empty-state-mini {
  text-align: center;
  padding: var(--spacing-8);
  color: var(--text-secondary);
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
  
  .groupe-formats {
    flex-wrap: wrap;
  }
  
  .form-grid-3 {
    grid-template-columns: 1fr;
  }
}
</style>
