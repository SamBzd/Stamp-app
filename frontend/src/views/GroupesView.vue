<template>
  <Layout>
    <div class="catalogues-view">
      <!-- Page Header -->
      <header class="page-header">
        <div>
          <h1 class="page-title">Catalogues</h1>
          <p class="page-subtitle">Gérez vos catalogues et leurs collections</p>
        </div>
        <Button @click="openCreateModal">
          <template #icon>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </template>
          Nouveau catalogue
        </Button>
      </header>

      <!-- Catalogues List -->
      <div v-if="groupesStore.loading && !initialLoaded" class="loading-state">
        <div class="loading-spinner"></div>
        <span class="loading-state-text">Chargement des catalogues...</span>
      </div>

      <div v-else-if="groupesStore.error" class="error-state">
        <p>{{ groupesStore.error }}</p>
        <Button variant="secondary" @click="groupesStore.fetchGroupes()">Réessayer</Button>
      </div>

      <div v-else-if="groupesStore.groupes.length === 0" class="empty-state">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="9" y1="21" x2="9" y2="9"/>
          </svg>
        </div>
        <h3 class="empty-state-title">Aucun catalogue</h3>
        <p class="empty-state-description">Créez votre premier catalogue pour organiser vos collections</p>
        <Button @click="openCreateModal">Créer un catalogue</Button>
      </div>

      <div v-else class="catalogues-grid">
        <div
          v-for="(groupe, index) in sortedGroupes"
          :key="groupe.id"
          class="catalogue-card"
          :style="{ animationDelay: `${index * 0.05}s` }"
          @click="viewCatalogue(groupe)"
        >
          <!-- Card Header -->
          <div class="catalogue-header">
            <div class="catalogue-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
            </div>
            <h3 class="catalogue-name">{{ groupe.nom }}</h3>
            <div class="arrow-indicator">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </div>

          <!-- Formats Prix -->
          <div class="catalogue-formats">
            <div class="format-pill format-pill-a">
              <span class="format-pill-letter">A</span>
              <span class="format-pill-price">{{ groupe.format_A_prix }}€</span>
            </div>
            <div class="format-pill format-pill-b">
              <span class="format-pill-letter">B</span>
              <span class="format-pill-price">{{ groupe.format_B_prix }}€</span>
            </div>
            <div class="format-pill format-pill-c">
              <span class="format-pill-letter">C</span>
              <span class="format-pill-price">{{ groupe.format_C_prix }}€</span>
            </div>
          </div>

          <!-- Collections Preview -->
          <div class="catalogue-collections">
            <div class="collections-header">
              <span class="collections-label">Collections</span>
              <span class="count-badge">{{ getCollectionsCount(groupe.id) }}</span>
            </div>
            <div v-if="getGroupeCollections(groupe.id).length > 0" class="collections-chips">
              <span 
                v-for="(col, index) in getGroupeCollections(groupe.id).slice(0, 5)" 
                :key="col.id"
                class="collection-chip"
              >
                {{ col.nom }}
              </span>
              <span 
                v-if="getGroupeCollections(groupe.id).length > 5" 
                class="collection-chip collection-chip-more"
              >
                +{{ getGroupeCollections(groupe.id).length - 5 }}
              </span>
            </div>
            <div v-else class="collections-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>Aucune collection</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Panel Vue Catalogue -->
      <SlidePanel
        :is-open="isViewModalOpen"
        title=""
        max-width="560px"
        @close="closeViewModal"
      >
        <div v-if="selectedGroupe" class="catalogue-view">
          <!-- Header -->
          <div class="view-header">
            <div class="view-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
            </div>
            <div class="view-title-group">
              <h2 class="view-title">{{ selectedGroupe.nom }}</h2>
              <div class="view-formats">
                <span class="format-pill format-pill-a format-pill-sm">
                  <span class="format-pill-letter">A</span>
                  <span class="format-pill-price">{{ selectedGroupe.format_A_prix }}€</span>
                </span>
                <span class="format-pill format-pill-b format-pill-sm">
                  <span class="format-pill-letter">B</span>
                  <span class="format-pill-price">{{ selectedGroupe.format_B_prix }}€</span>
                </span>
                <span class="format-pill format-pill-c format-pill-sm">
                  <span class="format-pill-letter">C</span>
                  <span class="format-pill-price">{{ selectedGroupe.format_C_prix }}€</span>
                </span>
              </div>
            </div>
          </div>

          <!-- Collections Section -->
          <div class="view-collections">
            <div class="section-header">
              <h3 class="section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
                Collections
              </h3>
              <Button size="sm" variant="secondary" @click="openAddCollectionModal">
                <template #icon>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </template>
                Ajouter
              </Button>
            </div>

            <div v-if="viewCollectionsLoading" class="view-loading">
              <div class="loading-spinner loading-spinner-sm"></div>
              <span>Chargement...</span>
            </div>
            <div v-else-if="viewCollections.length === 0" class="view-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
              <p>Aucune collection dans ce catalogue</p>
              <Button size="sm" @click="openAddCollectionModal">Ajouter une collection</Button>
            </div>
            <div v-else class="collections-list">
              <div
                v-for="(collection, index) in viewCollections"
                :key="collection.id"
                class="collection-item"
              >
                <span class="collection-number">{{ index + 1 }}</span>
                <span class="collection-name">{{ collection.nom }}</span>
                <button 
                  class="collection-remove" 
                  title="Retirer"
                  @click.stop="removeCollection(collection.id)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
        <template #footer>
          <Button variant="danger" @click="confirmDeleteFromView">Supprimer</Button>
          <Button variant="secondary" @click="editFromView">Modifier</Button>
        </template>
      </SlidePanel>

      <!-- Panel création/édition catalogue -->
      <SlidePanel
        :is-open="isFormModalOpen"
        :title="formModalTitle"
        max-width="560px"
        @close="closeFormModal"
      >
        <form @submit.prevent="handleSubmit" class="catalogue-form">
          <!-- Nom -->
          <div class="form-section">
            <FormInput
              v-model="formData.nom"
              label="Nom du catalogue"
              placeholder="Ex: Collection Printemps 2024"
              required
              :error="formErrors.nom"
            />
          </div>

          <!-- Prix des formats -->
          <div class="form-section">
            <h4 class="form-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
              Tarifs par format
            </h4>
            <div class="formats-grid">
              <div class="format-input-card format-input-a">
                <span class="format-input-letter">A</span>
                <FormInput
                  v-model.number="formData.format_A_prix"
                  label="Prix"
                  type="number"
                  min="0"
                  step="1"
                  suffix="€"
                />
              </div>
              <div class="format-input-card format-input-b">
                <span class="format-input-letter">B</span>
                <FormInput
                  v-model.number="formData.format_B_prix"
                  label="Prix"
                  type="number"
                  min="0"
                  step="1"
                  suffix="€"
                />
              </div>
              <div class="format-input-card format-input-c">
                <span class="format-input-letter">C</span>
                <FormInput
                  v-model.number="formData.format_C_prix"
                  label="Prix"
                  type="number"
                  min="0"
                  step="1"
                  suffix="€"
                />
              </div>
            </div>
          </div>

          <!-- Collections -->
          <div class="form-section">
            <h4 class="form-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
              Collections
            </h4>
            
            <!-- Collections sélectionnées -->
            <div v-if="formCollections.length > 0" class="form-collections-list">
              <div
                v-for="(col, index) in formCollections"
                :key="col.id || col.tempId"
                class="form-collection-item"
              >
                <span class="form-collection-number">{{ index + 1 }}</span>
                <span class="form-collection-name">{{ col.nom }}</span>
                <button 
                  type="button"
                  class="form-collection-remove" 
                  @click="removeFormCollection(index)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Ajouter collection -->
            <div class="add-collection-row">
              <div class="add-collection-inputs">
                <FormSelect
                  v-if="availableCollectionsForForm.length > 0"
                  v-model="selectedCollectionToAdd"
                  label=""
                  :options="availableCollectionsForForm.map(c => ({ value: c.id.toString(), label: c.nom }))"
                  placeholder="Choisir une collection existante..."
                />
                <div v-if="availableCollectionsForForm.length > 0" class="add-or">ou</div>
                <FormInput
                  v-model="newCollectionName"
                  label=""
                  placeholder="Créer une nouvelle collection..."
                />
              </div>
              <Button 
                type="button" 
                size="sm" 
                variant="secondary"
                @click="addCollectionToForm"
                :disabled="!selectedCollectionToAdd && !newCollectionName.trim()"
              >
                <template #icon>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </template>
                Ajouter
              </Button>
            </div>
          </div>
        </form>
        <template #footer>
          <Button variant="secondary" @click="closeFormModal">Annuler</Button>
          <Button @click="handleSubmit" :loading="saving">
            {{ isEditing ? 'Enregistrer' : 'Créer le catalogue' }}
          </Button>
        </template>
      </SlidePanel>

      <!-- Panel ajout collection (depuis vue) -->
      <SlidePanel
        :is-open="isAddCollectionModalOpen"
        title="Ajouter une collection"
        max-width="420px"
        @close="closeAddCollectionModal"
      >
        <div class="add-collection-form">
          <FormSelect
            v-if="availableCollectionsForView.length > 0"
            v-model="addCollectionId"
            label="Collection existante"
            :options="availableCollectionsForView.map(c => ({ value: c.id.toString(), label: c.nom }))"
            placeholder="Sélectionner..."
          />

          <div v-if="availableCollectionsForView.length > 0" class="divider">
            <span>ou</span>
          </div>

          <FormInput
            v-model="addCollectionName"
            label="Nouvelle collection"
            placeholder="Nom de la collection"
          />
        </div>
        <template #footer>
          <Button variant="secondary" @click="closeAddCollectionModal">Annuler</Button>
          <Button 
            @click="addCollectionToView" 
            :disabled="!addCollectionId && !addCollectionName.trim()"
            :loading="addingCollection"
          >
            Ajouter
          </Button>
        </template>
      </SlidePanel>

      <!-- Confirm Delete Dialog -->
      <ConfirmDialog
        :is-open="isDeleteDialogOpen"
        title="Supprimer le catalogue"
        :message="`Êtes-vous sûr de vouloir supprimer « ${groupeToDelete?.nom} » ? Les collections ne seront pas supprimées.`"
        confirm-text="Supprimer"
        variant="danger"
        @confirm="deleteGroupe"
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
import FormSelect from '../components/FormSelect.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import { useGroupesStore } from '../stores/groupes';
import { useCollectionsStore } from '../stores/collections';

const groupesStore = useGroupesStore();
const collectionsStore = useCollectionsStore();

// State
const initialLoaded = ref(false);
const isViewModalOpen = ref(false);
const isFormModalOpen = ref(false);
const isAddCollectionModalOpen = ref(false);
const isDeleteDialogOpen = ref(false);
const isEditing = ref(false);
const editingGroupeId = ref(null);
const selectedGroupe = ref(null);
const groupeToDelete = ref(null);
const saving = ref(false);
const addingCollection = ref(false);

// Collections par groupe (cache)
const groupeCollectionsCache = reactive({});

// Vue modal state
const viewCollections = ref([]);
const viewCollectionsLoading = ref(false);

// Add collection modal state
const addCollectionId = ref('');
const addCollectionName = ref('');

// Form state
const formData = ref({
  nom: '',
  format_A_prix: 0,
  format_B_prix: 0,
  format_C_prix: 0,
});
const formErrors = ref({});
const formCollections = ref([]);
const selectedCollectionToAdd = ref('');
const newCollectionName = ref('');

// Computed
const formModalTitle = computed(() => isEditing.value ? 'Modifier le catalogue' : 'Nouveau catalogue');

const sortedGroupes = computed(() => {
  return [...groupesStore.groupes].sort((a, b) => {
    return b.id - a.id;
  });
});

const availableCollectionsForForm = computed(() => {
  const selectedIds = formCollections.value.map(c => c.id).filter(Boolean);
  return collectionsStore.collections.filter(c => !selectedIds.includes(c.id));
});

const availableCollectionsForView = computed(() => {
  const viewIds = viewCollections.value.map(c => c.id);
  return collectionsStore.collections.filter(c => !viewIds.includes(c.id));
});

// Helpers
const getGroupeCollections = (groupeId) => {
  return groupeCollectionsCache[groupeId] || [];
};

const getCollectionsCount = (groupeId) => {
  return (groupeCollectionsCache[groupeId] || []).length;
};

const loadGroupeCollections = async (groupeId) => {
  try {
    const collections = await groupesStore.fetchGroupeCollections(groupeId);
    groupeCollectionsCache[groupeId] = collections;
  } catch (error) {
    console.error('Erreur chargement collections:', error);
  }
};

// View Modal
const viewCatalogue = async (groupe) => {
  selectedGroupe.value = groupe;
  viewCollectionsLoading.value = true;
  isViewModalOpen.value = true;
  try {
    viewCollections.value = await groupesStore.fetchGroupeCollections(groupe.id);
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    viewCollectionsLoading.value = false;
  }
};

const closeViewModal = () => {
  isViewModalOpen.value = false;
  selectedGroupe.value = null;
  viewCollections.value = [];
};

const editFromView = () => {
  const groupe = selectedGroupe.value;
  const collections = [...viewCollections.value];
  closeViewModal();
  openEditModal(groupe, collections);
};

const confirmDeleteFromView = () => {
  groupeToDelete.value = selectedGroupe.value;
  closeViewModal();
  isDeleteDialogOpen.value = true;
};

// Form Modal
const openCreateModal = () => {
  isEditing.value = false;
  editingGroupeId.value = null;
  formData.value = {
    nom: '',
    format_A_prix: 0,
    format_B_prix: 0,
    format_C_prix: 0,
  };
  formCollections.value = [];
  formErrors.value = {};
  selectedCollectionToAdd.value = '';
  newCollectionName.value = '';
  isFormModalOpen.value = true;
};

const openEditModal = (groupe, collections = []) => {
  isEditing.value = true;
  editingGroupeId.value = groupe.id;
  formData.value = {
    nom: groupe.nom || '',
    format_A_prix: groupe.format_A_prix || 0,
    format_B_prix: groupe.format_B_prix || 0,
    format_C_prix: groupe.format_C_prix || 0,
  };
  formCollections.value = [...collections];
  formErrors.value = {};
  selectedCollectionToAdd.value = '';
  newCollectionName.value = '';
  isFormModalOpen.value = true;
};

const closeFormModal = () => {
  isFormModalOpen.value = false;
};

const addCollectionToForm = () => {
  if (selectedCollectionToAdd.value) {
    const col = collectionsStore.collections.find(c => c.id.toString() === selectedCollectionToAdd.value);
    if (col && !formCollections.value.find(c => c.id === col.id)) {
      formCollections.value.push({ ...col });
    }
    selectedCollectionToAdd.value = '';
  } else if (newCollectionName.value.trim()) {
    formCollections.value.push({
      tempId: Date.now(),
      nom: newCollectionName.value.trim(),
      isNew: true,
    });
    newCollectionName.value = '';
  }
};

const removeFormCollection = (index) => {
  formCollections.value.splice(index, 1);
};

const handleSubmit = async () => {
  formErrors.value = {};

  if (!formData.value.nom.trim()) {
    formErrors.value.nom = 'Le nom est requis';
    return;
  }

  saving.value = true;
  try {
    let groupe;
    if (isEditing.value) {
      groupe = await groupesStore.updateGroupe(editingGroupeId.value, formData.value);
      
      const currentCollections = groupeCollectionsCache[editingGroupeId.value] || [];
      const currentIds = currentCollections.map(c => c.id);
      const newIds = formCollections.value.filter(c => c.id).map(c => c.id);
      
      for (const id of currentIds) {
        if (!newIds.includes(id)) {
          await groupesStore.removeCollectionFromGroupe(editingGroupeId.value, id);
        }
      }
      
      for (let i = 0; i < formCollections.value.length; i++) {
        const col = formCollections.value[i];
        if (col.isNew) {
          const newCol = await collectionsStore.createCollection({ nom: col.nom });
          await groupesStore.addCollectionToGroupe(editingGroupeId.value, newCol.id, i + 1);
        } else if (!currentIds.includes(col.id)) {
          await groupesStore.addCollectionToGroupe(editingGroupeId.value, col.id, i + 1);
        }
      }
    } else {
      groupe = await groupesStore.createGroupe(formData.value);
      
      for (let i = 0; i < formCollections.value.length; i++) {
        const col = formCollections.value[i];
        let collectionId;
        if (col.isNew) {
          const newCol = await collectionsStore.createCollection({ nom: col.nom });
          collectionId = newCol.id;
        } else {
          collectionId = col.id;
        }
        await groupesStore.addCollectionToGroupe(groupe.id, collectionId, i + 1);
      }
    }

    await Promise.all([
      groupesStore.fetchGroupes(),
      collectionsStore.fetchCollections(),
    ]);
    
    for (const g of groupesStore.groupes) {
      await loadGroupeCollections(g.id);
    }

    closeFormModal();
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    saving.value = false;
  }
};

// Add Collection Modal (from view)
const openAddCollectionModal = () => {
  addCollectionId.value = '';
  addCollectionName.value = '';
  isAddCollectionModalOpen.value = true;
};

const closeAddCollectionModal = () => {
  isAddCollectionModalOpen.value = false;
};

const addCollectionToView = async () => {
  addingCollection.value = true;
  try {
    let collectionId;
    if (addCollectionId.value) {
      collectionId = parseInt(addCollectionId.value);
    } else if (addCollectionName.value.trim()) {
      const newCol = await collectionsStore.createCollection({ nom: addCollectionName.value.trim() });
      collectionId = newCol.id;
      await collectionsStore.fetchCollections();
    }

    if (collectionId) {
      const ordre = viewCollections.value.length + 1;
      await groupesStore.addCollectionToGroupe(selectedGroupe.value.id, collectionId, ordre);
      viewCollections.value = await groupesStore.fetchGroupeCollections(selectedGroupe.value.id);
      groupeCollectionsCache[selectedGroupe.value.id] = viewCollections.value;
    }
    closeAddCollectionModal();
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    addingCollection.value = false;
  }
};

const removeCollection = async (collectionId) => {
  try {
    await groupesStore.removeCollectionFromGroupe(selectedGroupe.value.id, collectionId);
    viewCollections.value = await groupesStore.fetchGroupeCollections(selectedGroupe.value.id);
    groupeCollectionsCache[selectedGroupe.value.id] = viewCollections.value;
  } catch (error) {
    console.error('Erreur:', error);
  }
};

// Delete
const deleteGroupe = async () => {
  if (!groupeToDelete.value) return;
  try {
    await groupesStore.deleteGroupe(groupeToDelete.value.id);
    delete groupeCollectionsCache[groupeToDelete.value.id];
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    isDeleteDialogOpen.value = false;
    groupeToDelete.value = null;
  }
};

// Init
onMounted(async () => {
  await Promise.all([
    groupesStore.fetchGroupes(),
    collectionsStore.fetchCollections(),
  ]);
  
  for (const groupe of groupesStore.groupes) {
    await loadGroupeCollections(groupe.id);
  }
  
  initialLoaded.value = true;
});
</script>

<style scoped>
.catalogues-view {
  max-width: var(--content-max-width);
  animation: fadeInUp 0.4s ease-out;
}

.page-title {
  font-family: var(--font-heading);
}

/* === Catalogues Grid === */
.catalogues-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: var(--spacing-5);
}

.catalogue-card {
  background: var(--card);
  border-radius: var(--border-radius-2xl);
  padding: var(--spacing-5);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: all var(--transition-normal);
  animation: fadeInUp 0.4s ease-out backwards;
}

.catalogue-card:hover {
  transform: translateY(-3px) rotate(0.3deg);
  box-shadow: var(--shadow-card-hover);
  border-color: var(--border);
}

.catalogue-card:hover .arrow-indicator {
  opacity: 1;
  transform: translateX(4px);
}

/* === Catalogue Header === */
.catalogue-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
}

.catalogue-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--success-dark) 100%);
  border-radius: var(--border-radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-foreground);
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(93, 112, 82, 0.25);
}

.catalogue-icon svg {
  width: 24px;
  height: 24px;
}

.catalogue-name {
  flex: 1;
  font-family: var(--font-heading);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--foreground);
  margin: 0;
}

/* === Catalogue Formats === */
.catalogue-formats {
  display: flex;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-4);
}

.format-pill-sm {
  padding: var(--spacing-1) var(--spacing-2);
}

.format-pill-sm .format-pill-letter {
  width: 18px;
  height: 18px;
  font-size: 10px;
}

.format-pill-sm .format-pill-price {
  font-size: var(--font-size-xs);
}

/* === Catalogue Collections === */
.catalogue-collections {
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-xl);
  padding: var(--spacing-4);
}

.collections-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-3);
}

.collections-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wider);
}

.collections-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.collection-chip {
  background: var(--card);
  border: 1px solid var(--border-light);
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--foreground);
}

.collection-chip-more {
  background: var(--primary-light);
  border-color: var(--primary-medium);
  color: var(--primary);
}

.collections-empty {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

.collections-empty svg {
  width: 16px;
  height: 16px;
}

/* === View Modal === */
.catalogue-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.view-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding-bottom: var(--spacing-5);
  border-bottom: 1px solid var(--border-light);
}

.view-icon {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--success-dark) 100%);
  border-radius: var(--border-radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-foreground);
  box-shadow: 0 4px 16px rgba(93, 112, 82, 0.25);
}

.view-icon svg {
  width: 28px;
  height: 28px;
}

.view-title-group {
  flex: 1;
}

.view-title {
  font-family: var(--font-heading);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--foreground);
  margin: 0 0 var(--spacing-2) 0;
}

.view-formats {
  display: flex;
  gap: var(--spacing-2);
}

.view-collections {
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-xl);
  padding: var(--spacing-5);
}

.view-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  padding: var(--spacing-6);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.view-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-8);
  text-align: center;
}

.view-empty svg {
  width: 40px;
  height: 40px;
  color: var(--text-tertiary);
  opacity: 0.5;
}

.view-empty p {
  color: var(--text-secondary);
  margin: 0;
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
  background: var(--card);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-light);
  transition: all var(--transition-fast);
}

.collection-item:hover {
  border-color: var(--primary);
}

.collection-item:hover .collection-remove {
  opacity: 1;
}

.collection-number {
  width: 24px;
  height: 24px;
  background: var(--primary-light);
  color: var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  flex-shrink: 0;
}

.collection-name {
  flex: 1;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--foreground);
}

.collection-remove {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: var(--border-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all var(--transition-fast);
}

.collection-remove:hover {
  background: var(--error-light);
  color: var(--error);
}

.collection-remove svg {
  width: 14px;
  height: 14px;
}

/* === Form Modal === */
.catalogue-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.form-section {
  padding-bottom: var(--spacing-5);
  border-bottom: 1px solid var(--border-light);
}

.form-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.form-section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-family: var(--font-heading);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--primary);
  margin: 0 0 var(--spacing-4) 0;
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wider);
}

.form-section-title svg {
  width: 16px;
  height: 16px;
}

.formats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-3);
}

.format-input-card {
  padding: var(--spacing-4);
  border-radius: var(--border-radius-lg);
  position: relative;
}

.format-input-letter {
  position: absolute;
  top: var(--spacing-2);
  right: var(--spacing-2);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-xs);
  color: white;
}

.format-input-a { background: var(--format-a-light); }
.format-input-a .format-input-letter { background: var(--format-a); }

.format-input-b { background: var(--format-b-light); }
.format-input-b .format-input-letter { background: var(--format-b); }

.format-input-c { background: var(--format-c-light); }
.format-input-c .format-input-letter { background: var(--format-c); }

/* === Form Collections === */
.form-collections-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-4);
}

.form-collection-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--bg-tertiary);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-light);
}

.form-collection-number {
  width: 24px;
  height: 24px;
  background: var(--primary-light);
  color: var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  flex-shrink: 0;
}

.form-collection-name {
  flex: 1;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--foreground);
}

.form-collection-remove {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: var(--border-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.form-collection-remove:hover {
  background: var(--error-light);
  color: var(--error);
}

.form-collection-remove svg {
  width: 14px;
  height: 14px;
}

.add-collection-row {
  display: flex;
  gap: var(--spacing-3);
  align-items: flex-end;
}

.add-collection-inputs {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.add-collection-inputs > * {
  flex: 1;
}

.add-or {
  flex: none !important;
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
}

/* === Add Collection Form === */
.add-collection-form {
  display: flex;
  flex-direction: column;
}

/* === Responsive === */
@media (max-width: 768px) {
  .catalogues-grid {
    grid-template-columns: 1fr;
  }
  
  .catalogue-formats {
    flex-wrap: wrap;
  }
  
  .formats-grid {
    grid-template-columns: 1fr;
  }
  
  .add-collection-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .add-collection-inputs {
    flex-direction: column;
  }
  
  .add-or {
    text-align: center;
  }
}
</style>
