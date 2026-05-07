<template>
  <Layout>
    <div class="catalogues-view">

      <header class="page-header">
        <div>
          <h1 class="page-title">Catalogues</h1>
          <p class="page-subtitle">Gérez vos catalogues mensuels</p>
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

      <div v-if="cataloguesStore.loading" class="loading-state">
        <div class="loading-spinner"></div>
        <span class="loading-state-text">Chargement des catalogues...</span>
      </div>

      <div v-else-if="cataloguesStore.error" class="error-state">
        <p>{{ cataloguesStore.error }}</p>
        <Button variant="secondary" @click="cataloguesStore.fetchCatalogues()">Réessayer</Button>
      </div>

      <div v-else-if="cataloguesStore.catalogues.length === 0" class="empty-state">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="9" y1="21" x2="9" y2="9"/>
          </svg>
        </div>
        <h3 class="empty-state-title">Aucun catalogue</h3>
        <p class="empty-state-description">Commencez par créer votre premier catalogue</p>
        <Button @click="openCreateModal">Nouveau catalogue</Button>
      </div>

      <div v-else class="catalogues-grid">
        <div
          v-for="(catalogue, index) in cataloguesStore.catalogues"
          :key="catalogue.id"
          class="catalogue-card"
          :style="{ animationDelay: `${index * 0.05}s` }"
          @click="viewCatalogue(catalogue.id)"
        >
          <div class="catalogue-card-header">
            <div class="catalogue-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
            </div>
            <h3 class="catalogue-titre">{{ catalogue.titre }}</h3>
          </div>
          <div class="catalogue-meta">
            <span v-if="catalogue.papier_spe" class="meta-chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              {{ catalogue.papier_spe }}
            </span>
            <span v-if="catalogue.embellissement" class="meta-chip meta-chip-secondary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              {{ catalogue.embellissement }}
            </span>
          </div>
          <div class="arrow-indicator">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Modal création/édition catalogue -->
      <Modal
        :is-open="isFormOpen"
        :title="isEditing ? 'Modifier le catalogue' : 'Nouveau catalogue'"
        max-width="480px"
        @close="closeForm"
      >
        <form class="catalogue-form" @submit.prevent="handleSubmit">
          <FormInput
            v-model="form.titre"
            label="Titre"
            placeholder="Ex: Avril 2026"
            :error="formErrors.titre"
            required
          />
          <p class="form-hint">Format : "Mot(s) Année" — ex: Avril 2026, Été 2026</p>
          <FormInput
            v-model="form.papier_spe"
            label="Papier spécial"
            placeholder="Ex: Kraft naturel"
          />
          <FormInput
            v-model="form.embellissement"
            label="Embellissement"
            placeholder="Ex: Stampin' Dimensionals"
          />
          <p v-if="formErrors._global" class="form-error-global">{{ formErrors._global }}</p>
        </form>
        <template #footer>
          <Button variant="secondary" @click="closeForm">Annuler</Button>
          <Button @click="handleSubmit" :loading="saving">
            {{ isEditing ? 'Enregistrer' : 'Créer' }}
          </Button>
        </template>
      </Modal>

      <!-- SlidePanel détail catalogue -->
      <SlidePanel
        :is-open="isDetailOpen"
        :title="detailCatalogue?.titre || ''"
        @close="closeDetail"
        max-width="600px"
      >
        <div v-if="detailLoading" class="loading-state">
          <div class="loading-spinner"></div>
        </div>

        <div v-else-if="detailCatalogue" class="catalogue-detail">

          <!-- Infos catalogue -->
          <div class="detail-section">
            <div class="detail-section-header">
              <h3 class="detail-section-title">Informations</h3>
              <button class="icon-btn" @click="editCatalogue" title="Modifier">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
            <div class="info-chips">
              <span v-if="detailCatalogue.papier_spe" class="meta-chip">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                Papier spé : {{ detailCatalogue.papier_spe }}
              </span>
              <span v-if="detailCatalogue.embellissement" class="meta-chip meta-chip-secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                Embellissement : {{ detailCatalogue.embellissement }}
              </span>
              <span v-if="!detailCatalogue.papier_spe && !detailCatalogue.embellissement" class="info-empty">
                Aucune information complémentaire
              </span>
            </div>
          </div>

          <!-- Collections -->
          <div class="detail-section">
            <div class="detail-section-header">
              <h3 class="detail-section-title">
                Collections
                <span class="count-badge">{{ detailCatalogue.collections.length }}/4</span>
              </h3>
            </div>

            <div v-if="detailCatalogue.collections.length === 0" class="info-empty">
              Aucune collection — ajoutez-en jusqu'à 4
            </div>

            <div class="collections-list">
              <div
                v-for="collection in detailCatalogue.collections"
                :key="collection.id"
                class="collection-block"
              >
                <!-- Nom de la collection -->
                <div class="collection-header">
                  <div v-if="editingCollectionId === collection.id" class="collection-name-edit">
                    <input
                      v-model="editingCollectionNom"
                      class="collection-name-input"
                      @keydown.enter="saveCollectionName(collection.id)"
                      @keydown.escape="cancelCollectionEdit"
                      ref="collectionNameInput"
                    />
                    <button class="icon-btn icon-btn-success" @click="saveCollectionName(collection.id)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </button>
                    <button class="icon-btn" @click="cancelCollectionEdit">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                  <div v-else class="collection-name-display">
                    <span class="collection-name">{{ collection.nom }}</span>
                    <button class="icon-btn" @click="startEditCollection(collection)" title="Renommer">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button class="icon-btn icon-btn-danger" @click="confirmDeleteCollection(collection)" title="Supprimer">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Papiers de la collection -->
                <div class="papiers-section">
                  <div v-if="managingCollectionId !== collection.id">
                    <div v-if="collection.papiers.length === 0" class="papiers-empty">
                      Aucun papier assigné
                    </div>
                    <div v-else class="papiers-tags">
                      <span v-for="papier in collection.papiers" :key="papier.id" class="papier-tag">
                        {{ papier.nom }}
                      </span>
                    </div>
                    <button class="manage-papiers-btn" @click="startManagePapiers(collection)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Gérer les papiers ({{ collection.papiers.length }}/5)
                    </button>
                  </div>

                  <!-- Mode édition papiers -->
                  <div v-else class="papiers-editor">
                    <div class="papiers-selected">
                      <div
                        v-for="(papier, idx) in editingPapiers"
                        :key="papier.id"
                        class="papier-selected-item"
                      >
                        <span>{{ papier.nom }}</span>
                        <button class="icon-btn icon-btn-sm icon-btn-danger" @click="removePapier(idx)">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                      <p v-if="editingPapiers.length === 0" class="papiers-empty">Aucun papier sélectionné</p>
                    </div>

                    <div v-if="editingPapiers.length < 5" class="papier-search">
                      <input
                        v-model="papierSearchQuery"
                        type="text"
                        placeholder="Rechercher un papier..."
                        class="papier-search-input"
                        @input="debouncedPapierSearch"
                        @focus="showPapierResults = true"
                      />
                      <div v-if="showPapierResults && (papierResults.length > 0 || papierSearchQuery)" class="papier-results">
                        <div
                          v-for="result in papierResults"
                          :key="result.id"
                          class="papier-result-item"
                          @mousedown.prevent="selectPapier(result)"
                        >
                          {{ result.nom }}
                        </div>
                        <div
                          v-if="papierSearchQuery && !papierResults.find(r => r.nom.toLowerCase() === papierSearchQuery.toLowerCase())"
                          class="papier-result-item papier-result-create"
                          @mousedown.prevent="createAndSelectPapier"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          Créer "{{ papierSearchQuery }}"
                        </div>
                        <div v-if="papierResults.length === 0 && !papierSearchQuery" class="papier-result-empty">
                          Tapez pour rechercher
                        </div>
                      </div>
                    </div>

                    <div class="papiers-editor-actions">
                      <button class="btn-secondary-sm" @click="cancelManagePapiers">Annuler</button>
                      <button class="btn-primary-sm" @click="savePapiers(collection.id)" :disabled="savingPapiers">
                        {{ savingPapiers ? 'Enregistrement...' : 'Enregistrer' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              v-if="detailCatalogue.collections.length < 4"
              class="add-collection-btn"
              @click="openAddCollectionForm"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Ajouter une collection
            </button>

            <div v-if="showAddCollectionForm" class="add-collection-form">
              <input
                v-model="newCollectionNom"
                type="text"
                placeholder="Nom de la collection"
                class="collection-name-input"
                @keydown.enter="submitAddCollection"
                @keydown.escape="showAddCollectionForm = false"
              />
              <button class="btn-primary-sm" @click="submitAddCollection" :disabled="!newCollectionNom.trim()">
                Ajouter
              </button>
              <button class="btn-secondary-sm" @click="showAddCollectionForm = false">Annuler</button>
            </div>
          </div>

          <!-- Actions catalogue -->
          <div class="detail-actions">
            <Button variant="danger" @click="confirmDeleteCatalogue">Supprimer le catalogue</Button>
          </div>
        </div>

        <template #footer>
          <Button variant="secondary" @click="closeDetail">Fermer</Button>
        </template>
      </SlidePanel>

      <!-- ConfirmDialog -->
      <ConfirmDialog
        :is-open="isDeleteCatalogueOpen"
        title="Supprimer le catalogue"
        :message="`Êtes-vous sûr de vouloir supprimer le catalogue « ${detailCatalogue?.titre} » ? Toutes ses collections seront supprimées.`"
        confirm-text="Supprimer"
        variant="danger"
        @confirm="deleteCatalogue"
        @cancel="isDeleteCatalogueOpen = false"
      />

      <ConfirmDialog
        :is-open="isDeleteCollectionOpen"
        title="Supprimer la collection"
        :message="`Supprimer la collection « ${collectionToDelete?.nom} » ?`"
        confirm-text="Supprimer"
        variant="danger"
        @confirm="deleteCollection"
        @cancel="isDeleteCollectionOpen = false"
      />
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Layout from '../components/Layout.vue';
import SlidePanel from '../components/SlidePanel.vue';
import Modal from '../components/Modal.vue';
import Button from '../components/Button.vue';
import FormInput from '../components/FormInput.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import { useCataloguesStore } from '../stores/catalogues';
import { cataloguesAPI, papierCartonnesAPI } from '../services/api';

const cataloguesStore = useCataloguesStore();

// — Catalogue list form
const isFormOpen = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const saving = ref(false);
const form = ref({ titre: '', papier_spe: '', embellissement: '' });
const formErrors = ref({});

// — Catalogue detail
const isDetailOpen = ref(false);
const detailLoading = ref(false);
const detailCatalogue = ref(null);

// — Delete
const isDeleteCatalogueOpen = ref(false);
const isDeleteCollectionOpen = ref(false);
const collectionToDelete = ref(null);

// — Collection editing
const editingCollectionId = ref(null);
const editingCollectionNom = ref('');

// — Add collection
const showAddCollectionForm = ref(false);
const newCollectionNom = ref('');

// — Papiers management
const managingCollectionId = ref(null);
const editingPapiers = ref([]);
const papierSearchQuery = ref('');
const papierResults = ref([]);
const showPapierResults = ref(false);
const savingPapiers = ref(false);
let papierSearchTimer = null;

function openCreateModal() {
  isEditing.value = false;
  editingId.value = null;
  form.value = { titre: '', papier_spe: '', embellissement: '' };
  formErrors.value = {};
  isFormOpen.value = true;
}

function editCatalogue() {
  isEditing.value = true;
  editingId.value = detailCatalogue.value.id;
  form.value = {
    titre: detailCatalogue.value.titre,
    papier_spe: detailCatalogue.value.papier_spe || '',
    embellissement: detailCatalogue.value.embellissement || '',
  };
  formErrors.value = {};
  isFormOpen.value = true;
}

function closeForm() {
  isFormOpen.value = false;
}

async function handleSubmit() {
  formErrors.value = {};
  if (!form.value.titre.trim()) {
    formErrors.value.titre = 'Le titre est requis';
    return;
  }

  saving.value = true;
  try {
    const payload = {
      titre: form.value.titre.trim(),
      papier_spe: form.value.papier_spe.trim() || null,
      embellissement: form.value.embellissement.trim() || null,
    };

    if (isEditing.value) {
      const updated = await cataloguesStore.updateCatalogue(editingId.value, payload);
      if (detailCatalogue.value?.id === editingId.value) {
        detailCatalogue.value = { ...detailCatalogue.value, ...updated };
      }
    } else {
      await cataloguesStore.createCatalogue(payload);
    }
    closeForm();
  } catch (error) {
    formErrors.value._global = error.message;
  } finally {
    saving.value = false;
  }
}

async function viewCatalogue(id) {
  isDetailOpen.value = true;
  detailLoading.value = true;
  detailCatalogue.value = null;
  resetCollectionState();
  try {
    detailCatalogue.value = await cataloguesStore.fetchCatalogue(id);
  } catch (error) {
    console.error('Erreur chargement catalogue:', error);
  } finally {
    detailLoading.value = false;
  }
}

function closeDetail() {
  isDetailOpen.value = false;
  detailCatalogue.value = null;
  resetCollectionState();
}

function resetCollectionState() {
  editingCollectionId.value = null;
  showAddCollectionForm.value = false;
  newCollectionNom.value = '';
  managingCollectionId.value = null;
  editingPapiers.value = [];
  papierSearchQuery.value = '';
  papierResults.value = [];
}

function confirmDeleteCatalogue() {
  isDeleteCatalogueOpen.value = true;
}

async function deleteCatalogue() {
  isDeleteCatalogueOpen.value = false;
  try {
    await cataloguesStore.deleteCatalogue(detailCatalogue.value.id);
    closeDetail();
  } catch (error) {
    console.error('Erreur suppression catalogue:', error);
  }
}

// — Collection CRUD
function startEditCollection(collection) {
  editingCollectionId.value = collection.id;
  editingCollectionNom.value = collection.nom;
}

function cancelCollectionEdit() {
  editingCollectionId.value = null;
  editingCollectionNom.value = '';
}

async function saveCollectionName(collectionId) {
  const nom = editingCollectionNom.value.trim();
  if (!nom) return;
  try {
    await cataloguesAPI.updateCollection(collectionId, nom);
    const col = detailCatalogue.value.collections.find(c => c.id === collectionId);
    if (col) col.nom = nom;
    cancelCollectionEdit();
  } catch (error) {
    console.error('Erreur renommage collection:', error);
  }
}

function confirmDeleteCollection(collection) {
  collectionToDelete.value = collection;
  isDeleteCollectionOpen.value = true;
}

async function deleteCollection() {
  isDeleteCollectionOpen.value = false;
  try {
    await cataloguesAPI.deleteCollection(collectionToDelete.value.id);
    detailCatalogue.value.collections = detailCatalogue.value.collections.filter(
      c => c.id !== collectionToDelete.value.id
    );
    collectionToDelete.value = null;
  } catch (error) {
    console.error('Erreur suppression collection:', error);
  }
}

function openAddCollectionForm() {
  newCollectionNom.value = '';
  showAddCollectionForm.value = true;
}

async function submitAddCollection() {
  const nom = newCollectionNom.value.trim();
  if (!nom) return;
  try {
    const collection = await cataloguesAPI.addCollection(detailCatalogue.value.id, nom);
    detailCatalogue.value.collections.push({ ...collection, papiers: [] });
    showAddCollectionForm.value = false;
    newCollectionNom.value = '';
  } catch (error) {
    console.error('Erreur ajout collection:', error);
  }
}

// — Papiers management
function startManagePapiers(collection) {
  managingCollectionId.value = collection.id;
  editingPapiers.value = [...collection.papiers];
  papierSearchQuery.value = '';
  papierResults.value = [];
  showPapierResults.value = false;
}

function cancelManagePapiers() {
  managingCollectionId.value = null;
  editingPapiers.value = [];
  papierSearchQuery.value = '';
  papierResults.value = [];
}

function removePapier(index) {
  editingPapiers.value.splice(index, 1);
}

function selectPapier(papier) {
  if (!editingPapiers.value.find(p => p.id === papier.id)) {
    editingPapiers.value.push(papier);
  }
  papierSearchQuery.value = '';
  papierResults.value = [];
  showPapierResults.value = false;
}

async function createAndSelectPapier() {
  const nom = papierSearchQuery.value.trim();
  if (!nom) return;
  try {
    const papier = await papierCartonnesAPI.create(nom);
    selectPapier(papier);
  } catch (error) {
    if (error.message.includes('existe déjà')) {
      const results = await papierCartonnesAPI.search(nom);
      const existing = results.find(r => r.nom.toLowerCase() === nom.toLowerCase());
      if (existing) selectPapier(existing);
    }
  }
}

async function savePapiers(collectionId) {
  savingPapiers.value = true;
  try {
    await cataloguesAPI.setPapiersCollection(collectionId, editingPapiers.value.map(p => p.id));
    const col = detailCatalogue.value.collections.find(c => c.id === collectionId);
    if (col) col.papiers = [...editingPapiers.value];
    managingCollectionId.value = null;
    editingPapiers.value = [];
  } catch (error) {
    console.error('Erreur enregistrement papiers:', error);
  } finally {
    savingPapiers.value = false;
  }
}

function debouncedPapierSearch() {
  clearTimeout(papierSearchTimer);
  papierSearchTimer = setTimeout(async () => {
    if (!papierSearchQuery.value.trim()) {
      papierResults.value = [];
      return;
    }
    try {
      const results = await papierCartonnesAPI.search(papierSearchQuery.value.trim());
      papierResults.value = results.filter(r => !editingPapiers.value.find(p => p.id === r.id));
    } catch {
      papierResults.value = [];
    }
  }, 250);
}

onMounted(() => {
  cataloguesStore.fetchCatalogues();
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

/* === Grid === */
.catalogues-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
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
  position: relative;
}

.catalogue-card:hover {
  border-color: var(--border);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-3px);
}

.catalogue-card:hover .arrow-indicator {
  opacity: 1;
  transform: translateX(4px);
  color: var(--primary);
}

.catalogue-card-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-3);
}

.catalogue-icon {
  width: 40px;
  height: 40px;
  background: var(--primary-light);
  border-radius: var(--border-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
  flex-shrink: 0;
}

.catalogue-icon svg {
  width: 20px;
  height: 20px;
}

.catalogue-titre {
  font-family: var(--font-heading);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--foreground);
  margin: 0;
}

.catalogue-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

/* === Meta chips === */
.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: 3px var(--spacing-3);
  background: var(--primary-light);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
  color: var(--primary);
  font-weight: var(--font-weight-medium);
}

.meta-chip svg {
  width: 12px;
  height: 12px;
}

.meta-chip-secondary {
  background: var(--warning-light);
  color: var(--warning-dark);
}

/* === Form === */
.catalogue-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.form-hint {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin: calc(-1 * var(--spacing-2)) 0 0;
  font-style: italic;
}

.form-error-global {
  font-size: var(--font-size-sm);
  color: var(--error, #c0392b);
  padding: var(--spacing-3);
  background: var(--error-light, #fde8e8);
  border-radius: var(--border-radius);
  margin: 0;
}

/* === Detail === */
.catalogue-detail {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.detail-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.detail-section-title {
  font-family: var(--font-heading);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wider);
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.info-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.info-empty {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  font-style: italic;
}

/* === Collections === */
.collections-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.collection-block {
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-xl);
  padding: var(--spacing-4);
  border: 1px solid var(--border-light);
}

.collection-header {
  margin-bottom: var(--spacing-3);
}

.collection-name-display {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.collection-name {
  flex: 1;
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
  color: var(--foreground);
}

.collection-name-edit {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.collection-name-input {
  flex: 1;
  padding: var(--spacing-2) var(--spacing-3);
  border: 1.5px solid var(--primary);
  border-radius: var(--border-radius);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  background: var(--bg-primary);
  color: var(--foreground);
  outline: none;
}

/* === Icon buttons === */
.icon-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: var(--border-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-tertiary);
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.icon-btn svg {
  width: 14px;
  height: 14px;
}

.icon-btn:hover {
  background: var(--muted);
  color: var(--text-primary);
}

.icon-btn-success:hover {
  background: var(--success-light, #e8f5e8);
  color: var(--success);
}

.icon-btn-danger:hover {
  background: var(--error-light, #fde8e8);
  color: var(--error, #c0392b);
}

.icon-btn-sm {
  width: 22px;
  height: 22px;
}

.icon-btn-sm svg {
  width: 12px;
  height: 12px;
}

/* === Papiers === */
.papiers-section {
  /* container */
}

.papiers-empty {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  font-style: italic;
  margin-bottom: var(--spacing-2);
}

.papiers-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-2);
}

.papier-tag {
  padding: 2px var(--spacing-3);
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.manage-papiers-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) var(--spacing-3);
  border: 1.5px dashed var(--border);
  border-radius: var(--border-radius-full);
  background: transparent;
  font-family: var(--font-family);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.manage-papiers-btn svg {
  width: 12px;
  height: 12px;
}

.manage-papiers-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

/* === Papiers editor === */
.papiers-editor {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.papiers-selected {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.papier-selected-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-2) var(--spacing-3);
  background: var(--card);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius);
  font-size: var(--font-size-sm);
}

.papier-search {
  position: relative;
}

.papier-search-input {
  width: 100%;
  padding: var(--spacing-2) var(--spacing-3);
  border: 1.5px solid var(--border);
  border-radius: var(--border-radius);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  background: var(--bg-primary);
  color: var(--foreground);
  outline: none;
  transition: border-color var(--transition-fast);
  box-sizing: border-box;
}

.papier-search-input:focus {
  border-color: var(--primary);
}

.papier-results {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-dropdown, 0 4px 16px rgba(0,0,0,0.12));
  z-index: 100;
  max-height: 200px;
  overflow-y: auto;
}

.papier-result-item {
  padding: var(--spacing-2) var(--spacing-3);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.papier-result-item:hover {
  background: var(--primary-light);
  color: var(--primary);
}

.papier-result-create {
  color: var(--primary);
  font-weight: var(--font-weight-medium);
  border-top: 1px solid var(--border-light);
}

.papier-result-create svg {
  width: 14px;
  height: 14px;
}

.papier-result-empty {
  padding: var(--spacing-3);
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  font-style: italic;
  text-align: center;
}

.papiers-editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-2);
}

/* === Add collection === */
.add-collection-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-4);
  border: 1.5px dashed var(--border);
  border-radius: var(--border-radius-xl);
  background: transparent;
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  width: 100%;
  justify-content: center;
}

.add-collection-btn svg {
  width: 16px;
  height: 16px;
}

.add-collection-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-light);
}

.add-collection-form {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-xl);
  border: 1px solid var(--border-light);
}

.add-collection-form .collection-name-input {
  flex: 1;
}

/* === Small buttons === */
.btn-primary-sm,
.btn-secondary-sm {
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--border-radius);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  border: none;
}

.btn-primary-sm {
  background: var(--primary);
  color: var(--primary-foreground);
}

.btn-primary-sm:hover:not(:disabled) {
  background: var(--success-dark);
}

.btn-primary-sm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary-sm {
  background: var(--muted);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.btn-secondary-sm:hover {
  background: var(--card);
  color: var(--text-primary);
}

/* === Detail actions === */
.detail-actions {
  padding-top: var(--spacing-4);
  border-top: 1px solid var(--border-light);
}

/* === Arrow === */
.arrow-indicator {
  position: absolute;
  right: var(--spacing-4);
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: all var(--transition-fast);
  color: var(--text-tertiary);
}

.arrow-indicator svg {
  width: 16px;
  height: 16px;
}
</style>
