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
        <div class="toolbar-actions">
          <button
            :class="['favorites-toggle', { 'favorites-toggle-active': showOnlyFavorites }]"
            @click="showOnlyFavorites = !showOnlyFavorites"
            :title="showOnlyFavorites ? 'Afficher tous les clients' : 'Afficher seulement les favoris'"
          >
            <svg viewBox="0 0 24 24" :fill="showOnlyFavorites ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span>{{ showOnlyFavorites ? 'Favoris' : 'Tous' }}</span>
          </button>
          <div class="toolbar-info">
            <span class="count-badge">{{ filteredClients.length }}</span>
            <span class="toolbar-label">client{{ filteredClients.length > 1 ? 's' : '' }}</span>
          </div>
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
          {{ searchQuery ? 'Aucun résultat' : showOnlyFavorites ? 'Aucun client favori' : 'Aucun client' }}
        </h3>
        <p class="empty-state-description">
          {{ searchQuery ? 'Essayez avec d\'autres termes de recherche' : showOnlyFavorites ? 'Aucun client n\'est marqué comme favori pour le moment' : 'Commencez par ajouter votre premier client' }}
        </p>
        <Button v-if="!searchQuery && !showOnlyFavorites" @click="openCreateModal">Ajouter un client</Button>
      </div>

      <div v-else class="clients-grid">
        <div
          v-for="(client, index) in filteredClients"
          :key="client.id"
          class="client-card"
          :style="{ animationDelay: `${index * 0.05}s` }"
          @click="viewClient(client)"
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
            <div v-if="client.telephone_raw" class="client-detail">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <span>{{ client.telephone_raw }}</span>
            </div>
          </div>
          <button 
            :class="['favorite-btn', { 'favorite-btn-active': client.contacter }]"
            @click.stop="toggleFavoriteFromCard(client)"
            :title="client.contacter ? 'Retirer des favoris' : 'Ajouter aux favoris'"
          >
            <svg viewBox="0 0 24 24" :fill="client.contacter ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>
          <div class="arrow-indicator">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Panel consultation client -->
      <SlidePanel
        :is-open="isViewModalOpen"
        title=""
        @close="closeViewModal"
        max-width="560px"
      >
        <div v-if="selectedClient" class="client-profile">
          <!-- Header avec avatar et infos principales -->
          <div class="profile-header">
            <div class="profile-avatar">
              {{ getInitials(selectedClient) }}
            </div>
            <div class="profile-identity">
              <h2 class="profile-name">{{ selectedClient.prenom }} {{ selectedClient.nom }}</h2>
              <div class="profile-badges">
                <button 
                  :class="['favorite-toggle', { 'favorite-toggle-active': selectedClient.contacter }]"
                  @click="toggleFavorite"
                  :title="selectedClient.contacter ? 'Retirer des favoris' : 'Ajouter aux favoris'"
                >
                  <svg viewBox="0 0 24 24" :fill="selectedClient.contacter ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  {{ selectedClient.contacter ? 'Favori' : 'Ajouter aux favoris' }}
                </button>
                <span v-if="selectedClient.created_at" class="badge badge-neutral">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Client depuis {{ formatMemberSince(selectedClient.created_at) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Grille d'informations -->
          <div class="profile-grid">
            <!-- Section Contact -->
            <div class="profile-section">
              <h3 class="section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                Contact
              </h3>
              <div class="info-list">
                <div class="info-item" v-if="selectedClient.email">
                  <span class="info-label">Email</span>
                  <a :href="`mailto:${selectedClient.email}`" class="info-value info-link">{{ selectedClient.email }}</a>
                </div>
                <div class="info-item" v-if="selectedClient.telephone_raw">
                  <span class="info-label">Téléphone</span>
                  <a :href="`tel:${selectedClient.telephone_e164 || selectedClient.telephone_raw}`" class="info-value info-link">
                    {{ selectedClient.telephone_raw }}
                  </a>
                </div>
                <div v-if="!selectedClient.email && !selectedClient.telephone_raw" class="info-empty">
                  Aucun contact renseigné
                </div>
              </div>
            </div>

            <!-- Section Adresse -->
            <div class="profile-section">
              <h3 class="section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                Adresse
              </h3>
              <div class="info-list">
                <div v-if="hasAddress" class="address-block">
                  <p v-if="selectedClient.adresse" class="address-line">{{ selectedClient.adresse }}</p>
                  <p v-if="selectedClient.code_postal || selectedClient.ville" class="address-line">
                    {{ [selectedClient.code_postal, selectedClient.ville].filter(Boolean).join(' ') }}
                  </p>
                </div>
                <div v-else class="info-empty">
                  Aucune adresse renseignée
                </div>
              </div>
            </div>

            <!-- Section Informations personnelles -->
            <div class="profile-section">
              <h3 class="section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Informations
              </h3>
              <div class="info-list">
                <div class="info-item" v-if="selectedClient.date_naissance">
                  <span class="info-label">Date de naissance</span>
                  <span class="info-value">
                    {{ formatDate(selectedClient.date_naissance) }}
                    <span class="info-extra">({{ calculateAge(selectedClient.date_naissance) }} ans)</span>
                  </span>
                </div>
                <div class="info-item" v-if="selectedClient.derniere_commande">
                  <span class="info-label">Dernière commande</span>
                  <span class="info-value">{{ formatDate(selectedClient.derniere_commande) }}</span>
                </div>
                <div v-if="!selectedClient.date_naissance && !selectedClient.derniere_commande" class="info-empty">
                  Aucune information
                </div>
              </div>
            </div>

            <!-- Section Préférences -->
            <div class="profile-section">
              <h3 class="section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                Préférences
              </h3>
              <div class="info-list">
                <div class="info-item" v-if="selectedClient.relais_prefere">
                  <span class="info-label">Relais favori</span>
                  <span class="info-value relais-value">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="1" y="3" width="15" height="13"/>
                      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                      <circle cx="5.5" cy="18.5" r="2.5"/>
                      <circle cx="18.5" cy="18.5" r="2.5"/>
                    </svg>
                    {{ selectedClient.relais_prefere }}
                  </span>
                </div>
                <div v-if="!selectedClient.relais_prefere" class="info-empty">
                  Aucun relais favori
                </div>
              </div>
            </div>
          </div>

          <!-- Section Commandes -->
          <div class="profile-commandes">
            <div class="section-header">
              <h3 class="section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="9" cy="21" r="1"/>
                  <circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                Historique des commandes
              </h3>
              <span class="count-badge">{{ clientCommandes.length }}</span>
            </div>
            
            <div v-if="commandesLoading" class="commandes-loading">
              <div class="loading-spinner loading-spinner-sm"></div>
              <span>Chargement...</span>
            </div>
            <div v-else-if="clientCommandes.length === 0" class="commandes-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              <span>Aucune commande pour le moment</span>
            </div>
            <div v-else class="commandes-timeline">
              <div
                v-for="commande in clientCommandes"
                :key="commande.id"
                class="timeline-item"
              >
                <div class="timeline-dot" :class="commande.reglee ? 'dot-success' : 'dot-warning'"></div>
                <div class="timeline-content">
                  <div class="timeline-header">
                    <span class="timeline-title">Commande n°{{ commande.id }}</span>
                    <span :class="['badge', commande.reglee ? 'badge-success' : 'badge-warning']">
                      {{ commande.reglee ? 'Réglée' : 'En attente' }}
                    </span>
                  </div>
                  <div class="timeline-meta">
                    <span>Format {{ commande.format_type }}</span>
                    <span v-if="commande.methode_paiement">· {{ commande.methode_paiement }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <template #footer>
          <Button variant="danger" @click="confirmDeleteFromView">Supprimer</Button>
          <Button variant="secondary" @click="editClientFromView">Modifier</Button>
          <Button @click="newOrderForClient">Nouvelle commande</Button>
        </template>
      </SlidePanel>

      <!-- Panel création/édition client -->
      <SlidePanel
        :is-open="isModalOpen"
        :title="modalTitle"
        @close="closeModal"
        max-width="560px"
      >
        <form @submit.prevent="handleSubmit" class="client-form">
          <!-- Section Identité -->
          <div class="form-section">
            <h4 class="form-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Identité
            </h4>
            <div class="form-row">
              <FormInput
                v-model="formData.prenom"
                label="Prénom"
                placeholder="Marie"
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
              v-model="formData.date_naissance"
              label="Date de naissance"
              type="date"
              :error="errors.date_naissance"
            />
          </div>

          <!-- Section Contact -->
          <div class="form-section">
            <h4 class="form-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              Contact
            </h4>
            <div class="form-row">
              <FormInput
                v-model="formData.email"
                label="Email"
                type="email"
                placeholder="marie.dupont@email.com"
                :error="errors.email"
              />
              <FormInput
                v-model="formData.telephone_raw"
                label="Téléphone"
                placeholder="06 12 34 56 78"
                :error="errors.telephone_raw"
              />
            </div>
          </div>

          <!-- Section Adresse -->
          <div class="form-section">
            <h4 class="form-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Adresse
            </h4>
            <FormInput
              v-model="formData.adresse"
              label="Rue"
              placeholder="123 rue de la Paix"
              :error="errors.adresse"
            />
            <div class="form-row">
              <FormInput
                v-model="formData.code_postal"
                label="Code postal"
                placeholder="75001"
                :error="errors.code_postal"
              />
              <FormInput
                v-model="formData.ville"
                label="Ville"
                placeholder="Paris"
                :error="errors.ville"
              />
            </div>
          </div>

          <!-- Section Préférences -->
          <div class="form-section">
            <h4 class="form-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              Préférences
            </h4>
            <FormInput
              v-model="formData.relais_prefere"
              label="Relais favori"
              placeholder="Ex: Relais Colis - 12 rue du Commerce"
              :error="errors.relais_prefere"
            />
            <FormCheckbox
              v-model="formData.contacter"
              label="⭐ Client favori"
              description="Marquez cette cliente comme favorite pour un accès rapide"
            />
          </div>
        </form>
        <template #footer>
          <Button variant="secondary" @click="closeModal">Annuler</Button>
          <Button @click="handleSubmit" :loading="saving">
            {{ isEditing ? 'Enregistrer' : 'Créer' }}
          </Button>
        </template>
      </SlidePanel>

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
import { useRouter } from 'vue-router';
import Layout from '../components/Layout.vue';
import SlidePanel from '../components/SlidePanel.vue';
import Button from '../components/Button.vue';
import FormInput from '../components/FormInput.vue';
import FormCheckbox from '../components/FormCheckbox.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import { useClientsStore } from '../stores/clients';

const router = useRouter();

const clientsStore = useClientsStore();

const searchQuery = ref('');
const showOnlyFavorites = ref(false);
const isModalOpen = ref(false);
const isViewModalOpen = ref(false);
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
  telephone_raw: '',
  adresse: '',
  code_postal: '',
  ville: '',
  date_naissance: '',
  relais_prefere: '',
  contacter: false,
});

const errors = ref({});

const modalTitle = computed(() => {
  return isEditing.value ? 'Modifier le client' : 'Nouveau client';
});

const hasAddress = computed(() => {
  if (!selectedClient.value) return false;
  return selectedClient.value.adresse || selectedClient.value.code_postal || selectedClient.value.ville;
});

const filteredClients = computed(() => {
  let clients = clientsStore.clients;
  
  // Filtrer par favoris si activé
  if (showOnlyFavorites.value) {
    clients = clients.filter(client => client.contacter === 1);
  }
  
  // Filtrer par recherche
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    clients = clients.filter(client => {
      return (
        client.nom?.toLowerCase().includes(query) ||
        client.prenom?.toLowerCase().includes(query) ||
        client.email?.toLowerCase().includes(query) ||
        client.telephone_raw?.includes(query) ||
        client.ville?.toLowerCase().includes(query)
      );
    });
  }
  
  return clients;
});

const getInitials = (client) => {
  const first = client.prenom?.[0] || '';
  const last = client.nom?.[0] || '';
  return (first + last).toUpperCase();
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatMemberSince = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 30) {
    return diffDays <= 1 ? 'aujourd\'hui' : `${diffDays} jours`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? '1 mois' : `${months} mois`;
  } else {
    const years = Math.floor(diffDays / 365);
    return years === 1 ? '1 an' : `${years} ans`;
  }
};

const calculateAge = (dateStr) => {
  if (!dateStr) return '';
  const birthDate = new Date(dateStr);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const viewClient = async (client) => {
  selectedClient.value = client;
  commandesLoading.value = true;
  isViewModalOpen.value = true;
  try {
    clientCommandes.value = await clientsStore.fetchClientCommandes(client.id);
  } catch (error) {
    console.error('Erreur lors du chargement des commandes:', error);
    clientCommandes.value = [];
  } finally {
    commandesLoading.value = false;
  }
};

const closeViewModal = () => {
  isViewModalOpen.value = false;
  selectedClient.value = null;
  clientCommandes.value = [];
};

const toggleFavorite = async () => {
  if (!selectedClient.value) return;
  try {
    const newValue = selectedClient.value.contacter === 1 ? 0 : 1;
    await clientsStore.updateClient(selectedClient.value.id, {
      ...selectedClient.value,
      contacter: newValue,
    });
    selectedClient.value = clientsStore.getClientById(selectedClient.value.id);
  } catch (error) {
    console.error('Erreur lors du changement de favori:', error);
  }
};

const toggleFavoriteFromCard = async (client) => {
  try {
    const newValue = client.contacter === 1 ? 0 : 1;
    await clientsStore.updateClient(client.id, {
      ...client,
      contacter: newValue,
    });
  } catch (error) {
    console.error('Erreur lors du changement de favori:', error);
  }
};

const editClientFromView = () => {
  const client = selectedClient.value;
  closeViewModal();
  editClient(client);
};

const newOrderForClient = () => {
  const client = selectedClient.value;
  closeViewModal();
  // Navigate to home (orders) with client pre-selected via query param
  router.push({ path: '/', query: { client: client.id } });
};

const confirmDeleteFromView = () => {
  const client = selectedClient.value;
  closeViewModal();
  confirmDelete(client);
};

const openCreateModal = () => {
  isEditing.value = false;
  editingClientId.value = null;
  formData.value = {
    nom: '',
    prenom: '',
    email: '',
    telephone_raw: '',
    adresse: '',
    code_postal: '',
    ville: '',
    date_naissance: '',
    relais_prefere: '',
    contacter: false,
  };
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
    telephone_raw: client.telephone_raw || '',
    adresse: client.adresse || '',
    code_postal: client.code_postal || '',
    ville: client.ville || '',
    date_naissance: client.date_naissance || '',
    relais_prefere: client.relais_prefere || '',
    contacter: client.contacter === 1,
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
    // Convertir contacter de booléen à 0/1 pour le backend
    const clientData = {
      ...formData.value,
      contacter: formData.value.contacter ? 1 : 0,
    };
    
    if (isEditing.value) {
      await clientsStore.updateClient(editingClientId.value, clientData);
    } else {
      await clientsStore.createClient(clientData);
    }
    closeModal();
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
  } finally {
    saving.value = false;
  }
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
  max-width: var(--content-max-width);
  animation: fadeInUp 0.4s ease-out;
}

/* === Page Title === */
.page-title {
  font-family: var(--font-heading);
}

/* === Toolbar === */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
}

.toolbar-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.toolbar-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.favorites-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  background: var(--card);
  border: 1.5px solid var(--border);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: var(--font-family);
}

.favorites-toggle svg {
  width: 18px;
  height: 18px;
}

.favorites-toggle:hover {
  background: var(--warning-light);
  border-color: var(--secondary);
  color: var(--warning-dark);
}

.favorites-toggle-active {
  background: var(--warning-light);
  border-color: var(--secondary);
  color: var(--warning-dark);
}

.favorites-toggle-active svg {
  color: var(--secondary);
}

/* === Clients Grid === */
.clients-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: var(--spacing-5);
}

.client-card {
  background: var(--card);
  border-radius: var(--border-radius-2xl);
  padding: var(--spacing-5);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
  display: flex;
  gap: var(--spacing-4);
  transition: all var(--transition-normal);
  cursor: pointer;
  animation: fadeInUp 0.4s ease-out backwards;
}

.client-card:hover {
  border-color: var(--border);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-3px) rotate(0.3deg);
}

.client-card:hover .arrow-indicator {
  opacity: 1;
  transform: translateX(4px);
  color: var(--primary);
}

.client-avatar {
  width: 52px;
  height: 52px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--success-dark) 100%);
  border-radius: var(--border-radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-foreground);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(93, 112, 82, 0.25);
}

.client-info {
  flex: 1;
  min-width: 0;
}

.client-name {
  font-family: var(--font-heading);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--foreground);
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

/* === Favorite Button === */
.favorite-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: var(--border-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.favorite-btn svg {
  width: 20px;
  height: 20px;
}

.favorite-btn-active {
  color: var(--secondary);
}

.favorite-btn:hover {
  background: var(--secondary-light);
  color: var(--secondary);
  transform: scale(1.1);
}

.favorite-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  background: var(--muted);
  border: 1.5px solid var(--border);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: var(--font-family);
}

.favorite-toggle svg {
  width: 16px;
  height: 16px;
}

.favorite-toggle:hover {
  background: var(--secondary-light);
  border-color: var(--secondary);
  color: var(--warning-dark);
}

.favorite-toggle-active {
  background: var(--warning-light);
  border-color: var(--secondary);
  color: var(--warning-dark);
}

.favorite-toggle-active svg {
  color: var(--secondary);
}

/* === Form === */
.client-form {
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-4);
}

/* === Client Profile Modal === */
.client-profile {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.profile-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-5);
  padding-bottom: var(--spacing-5);
  border-bottom: 1px solid var(--border-light);
}

.profile-avatar {
  width: 72px;
  height: 72px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--success-dark) 100%);
  border-radius: var(--border-radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-foreground);
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  flex-shrink: 0;
  box-shadow: 0 4px 16px rgba(93, 112, 82, 0.25);
}

.profile-identity {
  flex: 1;
  min-width: 0;
}

.profile-name {
  font-family: var(--font-heading);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--foreground);
  margin: 0 0 var(--spacing-2) 0;
}

.profile-badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

/* === Profile Grid === */
.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-4);
}

.profile-section {
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-xl);
  padding: var(--spacing-4);
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wider);
}

.info-value {
  font-size: var(--font-size-sm);
  color: var(--foreground);
  font-weight: var(--font-weight-medium);
}

.info-link {
  color: var(--primary);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.info-link:hover {
  color: var(--secondary);
  text-decoration: underline;
}

.info-extra {
  font-weight: var(--font-weight-normal);
  color: var(--text-tertiary);
  margin-left: var(--spacing-1);
}

.info-empty {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  font-style: italic;
}

.address-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.address-line {
  font-size: var(--font-size-sm);
  color: var(--foreground);
  margin: 0;
}

.relais-value {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  background: var(--card);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-light);
}

.relais-value svg {
  width: 16px;
  height: 16px;
  color: var(--primary);
}

/* === Profile Commandes === */
.profile-commandes {
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-xl);
  padding: var(--spacing-5);
}

.commandes-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  padding: var(--spacing-6);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.commandes-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-6);
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

.commandes-empty svg {
  width: 32px;
  height: 32px;
  opacity: 0.5;
}

/* === Timeline === */
.commandes-timeline {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  position: relative;
  padding-left: var(--spacing-5);
}

.commandes-timeline::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--border);
  border-radius: 1px;
}

.timeline-item {
  position: relative;
  background: var(--card);
  border-radius: var(--border-radius);
  padding: var(--spacing-3) var(--spacing-4);
  border: 1px solid var(--border-light);
}

.timeline-dot {
  position: absolute;
  left: calc(-1 * var(--spacing-5) - 1px);
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--card);
}

.dot-success {
  background: var(--success);
}

.dot-warning {
  background: var(--warning);
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-1);
}

.timeline-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--foreground);
}

.timeline-meta {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

/* === Responsive === */
@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-3);
  }
  
  .toolbar-actions {
    justify-content: space-between;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .profile-grid {
    grid-template-columns: 1fr;
  }
  
  .profile-header {
    flex-direction: column;
    text-align: center;
  }
  
  .profile-badges {
    justify-content: center;
  }
  
  .clients-grid {
    grid-template-columns: 1fr;
  }
}
</style>
