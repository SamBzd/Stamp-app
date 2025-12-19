<template>
  <Layout>
    <div class="clients-view">
      <!-- Page Header -->
      <header class="page-header">
        <div>
          <h1 class="page-title">Clients</h1>
          <p class="page-subtitle">Gérez votre base de clients</p>
        </div>
        <Button @click="openCreateModal">
          <template #icon>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </template>
          Ajouter un client
        </Button>
      </header>

      <!-- Search & Filters -->
      <div class="toolbar">
        <div class="search-wrapper">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Rechercher un client..."
            class="search-input"
          />
        </div>
        <div class="toolbar-info">
          <span class="client-count">{{ filteredClients.length }} client{{ filteredClients.length > 1 ? 's' : '' }}</span>
        </div>
      </div>

      <!-- Clients List -->
      <div v-if="clientsStore.loading" class="loading-state">
        <div class="loading-spinner"></div>
        <span class="loading-state-text">Chargement des clients...</span>
      </div>

      <div v-else-if="clientsStore.error" class="error-state">
        <p>{{ clientsStore.error }}</p>
        <Button variant="secondary" @click="clientsStore.fetchClients()">Réessayer</Button>
      </div>

      <div v-else-if="filteredClients.length === 0" class="empty-state">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <h3 class="empty-state-title">
          {{ searchQuery ? 'Aucun résultat' : 'Aucun client' }}
        </h3>
        <p class="empty-state-description">
          {{ searchQuery ? 'Essayez avec d\'autres termes de recherche' : 'Commencez par ajouter votre premier client' }}
        </p>
        <Button v-if="!searchQuery" @click="openCreateModal">Ajouter un client</Button>
      </div>

      <div v-else class="clients-grid">
        <div
          v-for="client in filteredClients"
          :key="client.id"
          class="client-card"
        >
          <div class="client-avatar">
            {{ getInitials(client) }}
          </div>
          <div class="client-info">
            <h3 class="client-name">{{ client.prenom }} {{ client.nom }}</h3>
            <div v-if="client.email" class="client-detail">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <span>{{ client.email }}</span>
            </div>
            <div v-if="client.telephone" class="client-detail">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <span>{{ client.telephone }}</span>
            </div>
          </div>
          <div class="client-actions">
            <button class="action-btn" title="Voir les commandes" @click="viewCommandes(client)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            </button>
            <button class="action-btn" title="Modifier" @click="editClient(client)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="action-btn action-btn-danger" title="Supprimer" @click="confirmDelete(client)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Modal création/édition client -->
      <Modal
        :is-open="isModalOpen"
        :title="modalTitle"
        @close="closeModal"
      >
        <form @submit.prevent="handleSubmit">
          <div class="form-row">
            <FormInput
              v-model="formData.prenom"
              label="Prénom"
              placeholder="Jean"
              required
              :error="errors.prenom"
            />
            <FormInput
              v-model="formData.nom"
              label="Nom"
              placeholder="Dupont"
              required
              :error="errors.nom"
            />
          </div>
          <FormInput
            v-model="formData.email"
            label="Email"
            type="email"
            placeholder="jean.dupont@email.com"
            :error="errors.email"
          />
          <FormInput
            v-model="formData.telephone"
            label="Téléphone"
            placeholder="06 12 34 56 78"
            :error="errors.telephone"
          />
          <FormInput
            v-model="formData.adresse"
            label="Adresse"
            placeholder="123 rue de la Paix, 75001 Paris"
            :error="errors.adresse"
          />
        </form>
        <template #footer>
          <Button variant="secondary" @click="closeModal">Annuler</Button>
          <Button @click="handleSubmit" :loading="saving">
            {{ isEditing ? 'Enregistrer' : 'Créer' }}
          </Button>
        </template>
      </Modal>

      <!-- Modal commandes client -->
      <Modal
        :is-open="isCommandesModalOpen"
        :title="`Commandes de ${selectedClient?.prenom} ${selectedClient?.nom}`"
        @close="closeCommandesModal"
      >
        <div v-if="commandesLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <span class="loading-state-text">Chargement...</span>
        </div>
        <div v-else-if="clientCommandes.length === 0" class="empty-state-mini">
          <p>Aucune commande pour ce client.</p>
        </div>
        <div v-else class="commandes-list">
          <div
            v-for="commande in clientCommandes"
            :key="commande.id"
            class="commande-item"
          >
            <div class="commande-item-content">
              <span class="commande-item-id">Commande #{{ commande.id }}</span>
              <span class="commande-item-format">Format {{ commande.format_type }}</span>
            </div>
            <span :class="['status-badge', commande.reglee ? 'status-success' : 'status-warning']">
              {{ commande.reglee ? 'Réglée' : 'En attente' }}
            </span>
          </div>
        </div>
      </Modal>

      <!-- Confirm Delete Dialog -->
      <ConfirmDialog
        :is-open="isDeleteDialogOpen"
        title="Supprimer le client"
        :message="`Êtes-vous sûr de vouloir supprimer ${clientToDelete?.prenom} ${clientToDelete?.nom} ? Cette action est irréversible.`"
        confirm-text="Supprimer"
        variant="danger"
        @confirm="deleteClient"
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
import ConfirmDialog from '../components/ConfirmDialog.vue';
import { useClientsStore } from '../stores/clients';

const clientsStore = useClientsStore();

const searchQuery = ref('');
const isModalOpen = ref(false);
const isCommandesModalOpen = ref(false);
const isDeleteDialogOpen = ref(false);
const isEditing = ref(false);
const editingClientId = ref(null);
const selectedClient = ref(null);
const clientToDelete = ref(null);
const clientCommandes = ref([]);
const commandesLoading = ref(false);
const saving = ref(false);

const formData = ref({
  nom: '',
  prenom: '',
  email: '',
  telephone: '',
  adresse: '',
});

const errors = ref({});

const modalTitle = computed(() => {
  return isEditing.value ? 'Modifier le client' : 'Nouveau client';
});

const filteredClients = computed(() => {
  if (!searchQuery.value) return clientsStore.clients;
  const query = searchQuery.value.toLowerCase();
  return clientsStore.clients.filter(client => {
    return (
      client.nom?.toLowerCase().includes(query) ||
      client.prenom?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.telephone?.includes(query)
    );
  });
});

const getInitials = (client) => {
  const first = client.prenom?.[0] || '';
  const last = client.nom?.[0] || '';
  return (first + last).toUpperCase();
};

const openCreateModal = () => {
  isEditing.value = false;
  editingClientId.value = null;
  formData.value = { nom: '', prenom: '', email: '', telephone: '', adresse: '' };
  errors.value = {};
  isModalOpen.value = true;
};

const editClient = (client) => {
  isEditing.value = true;
  editingClientId.value = client.id;
  formData.value = {
    nom: client.nom || '',
    prenom: client.prenom || '',
    email: client.email || '',
    telephone: client.telephone || '',
    adresse: client.adresse || '',
  };
  errors.value = {};
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const handleSubmit = async () => {
  errors.value = {};

  if (!formData.value.nom) errors.value.nom = 'Le nom est requis';
  if (!formData.value.prenom) errors.value.prenom = 'Le prénom est requis';

  if (Object.keys(errors.value).length > 0) return;

  saving.value = true;
  try {
    if (isEditing.value) {
      await clientsStore.updateClient(editingClientId.value, formData.value);
    } else {
      await clientsStore.createClient(formData.value);
    }
    closeModal();
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
  } finally {
    saving.value = false;
  }
};

const viewCommandes = async (client) => {
  selectedClient.value = client;
  commandesLoading.value = true;
  isCommandesModalOpen.value = true;
  try {
    clientCommandes.value = await clientsStore.fetchClientCommandes(client.id);
  } catch (error) {
    console.error('Erreur lors du chargement des commandes:', error);
  } finally {
    commandesLoading.value = false;
  }
};

const closeCommandesModal = () => {
  isCommandesModalOpen.value = false;
  selectedClient.value = null;
  clientCommandes.value = [];
};

const confirmDelete = (client) => {
  clientToDelete.value = client;
  isDeleteDialogOpen.value = true;
};

const deleteClient = async () => {
  if (!clientToDelete.value) return;
  try {
    await clientsStore.deleteClient(clientToDelete.value.id);
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
  } finally {
    isDeleteDialogOpen.value = false;
    clientToDelete.value = null;
  }
};

onMounted(async () => {
  await clientsStore.fetchClients();
});
</script>

<style scoped>
.clients-view {
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

/* === Toolbar === */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-6);
  gap: var(--spacing-4);
}

.search-wrapper {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: var(--spacing-4);
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: var(--text-tertiary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: var(--spacing-3) var(--spacing-4) var(--spacing-3) var(--spacing-12);
  background: var(--bg-primary);
  border: 1.5px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: var(--font-size-sm);
  font-family: var(--font-family);
  color: var(--text-primary);
  transition: all var(--transition-fast);
}

.search-input:focus {
  outline: none;
  border-color: var(--rose-400);
  box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.12);
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.toolbar-info {
  flex-shrink: 0;
}

.client-count {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

/* === Clients Grid === */
.clients-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--spacing-4);
}

.client-card {
  background: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-5);
  border: 1px solid var(--border-color-light);
  box-shadow: var(--shadow-sm);
  display: flex;
  gap: var(--spacing-4);
  transition: all var(--transition-normal);
}

.client-card:hover {
  border-color: var(--rose-200);
  box-shadow: var(--shadow-md);
}

.client-avatar {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, var(--rose-400) 0%, var(--rose-500) 100%);
  border-radius: var(--border-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  flex-shrink: 0;
}

.client-info {
  flex: 1;
  min-width: 0;
}

.client-name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-2);
}

.client-detail {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-top: var(--spacing-1);
}

.client-detail svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: var(--text-tertiary);
}

.client-detail span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.client-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

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
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-4);
}

/* === Commandes List === */
.commandes-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.commande-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-4);
  background: var(--gray-50);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color-light);
}

.commande-item-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.commande-item-id {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.commande-item-format {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-1) var(--spacing-3);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
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
  
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-wrapper {
    max-width: none;
  }
  
  .clients-grid {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
