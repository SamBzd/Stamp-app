<template>
  <div class="clients-list-container">
    <header class="page-header">
      <button @click="goBack" class="back-button">← Retour</button>
      <h1 class="page-title">👥 Mes Clients</h1>
      <p class="page-subtitle">Gérez votre liste de clients</p>
    </header>

    <main class="main-content">
      <!-- Bouton pour ajouter un nouveau client -->
      <div class="actions-bar">
        <button 
          @click="openCreateForm" 
          class="btn btn-primary"
          :disabled="isLoading"
        >
          ✨ Ajouter un client
        </button>
      </div>

      <!-- Message d'erreur -->
      <div v-if="error" class="error-message">
        ⚠️ {{ error }}
      </div>

      <!-- Formulaire de création/édition -->
      <div v-if="showForm" class="form-container">
        <h2 class="form-title">
          {{ editingClient ? '✏️ Modifier le client' : '✨ Nouveau client' }}
        </h2>
        <ClientForm 
          :client="editingClient"
          @save="handleSave"
          @cancel="closeForm"
        />
      </div>

      <!-- Liste des clients -->
      <div v-if="isLoading && clients.length === 0" class="loading">
        <div class="spinner"></div>
        <p>Chargement...</p>
      </div>

      <div v-else-if="clients.length === 0" class="empty-state">
        <p>🌸 Aucun client pour le moment</p>
        <p class="empty-hint">Cliquez sur "Ajouter un client" pour commencer</p>
      </div>

      <div v-else class="clients-grid">
        <div 
          v-for="client in clients" 
          :key="client.id" 
          class="client-card"
        >
          <div class="client-header">
            <h3 class="client-name">{{ client.prenom }} {{ client.nom }}</h3>
            <div class="client-actions">
              <button 
                @click.stop="openEditForm(client)" 
                class="btn-icon btn-edit"
                title="Modifier"
              >
                ✏️
              </button>
              <button 
                @click.stop="confirmDelete(client)" 
                class="btn-icon btn-delete"
                title="Supprimer"
              >
                🗑️
              </button>
            </div>
          </div>

          <div class="client-details">
            <div v-if="client.email" class="detail-item">
              <span class="detail-label">📧 Email:</span>
              <span class="detail-value">{{ client.email }}</span>
            </div>
            <div v-if="client.telephone_raw" class="detail-item">
              <span class="detail-label">📱 Téléphone:</span>
              <span class="detail-value">{{ client.telephone_raw }}</span>
            </div>
            <div v-if="client.ville" class="detail-item">
              <span class="detail-label">📍 Ville:</span>
              <span class="detail-value">{{ client.ville }}</span>
            </div>
            <div v-if="client.relais_prefere" class="detail-item">
              <span class="detail-label">📦 Relais préféré:</span>
              <span class="detail-value">{{ client.relais_prefere }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">💬 Contacter:</span>
              <span class="detail-value">{{ client.contacter ? 'Oui' : 'Non' }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useClientsStore } from '../stores/clients'
import ClientForm from '../components/ClientForm.vue'

const router = useRouter()
const clientsStore = useClientsStore()
const showForm = ref(false)

const clients = computed(() => clientsStore.clients)
const isLoading = computed(() => clientsStore.isLoading)
const error = computed(() => clientsStore.error)
const editingClient = computed(() => clientsStore.editingClient)

onMounted(() => {
  clientsStore.fetchClients()
})

const goBack = () => {
  router.push('/')
}

const openCreateForm = () => {
  clientsStore.clearEditingClient()
  showForm.value = true
}

const openEditForm = (client) => {
  clientsStore.setEditingClient(client)
  showForm.value = true
}

const closeForm = () => {
  showForm.value = false
  clientsStore.clearEditingClient()
}

const handleSave = async (clientData) => {
  try {
    if (editingClient.value) {
      await clientsStore.updateClient(editingClient.value.id, clientData)
    } else {
      await clientsStore.createClient(clientData)
    }
    closeForm()
    await clientsStore.fetchClients()
  } catch (err) {
    console.error('Erreur lors de la sauvegarde:', err)
  }
}

const confirmDelete = async (client) => {
  if (confirm(`Êtes-vous sûre de vouloir supprimer ${client.prenom} ${client.nom} ?`)) {
    try {
      await clientsStore.deleteClient(client.id)
      await clientsStore.fetchClients()
    } catch (err) {
      console.error('Erreur lors de la suppression:', err)
    }
  }
}
</script>

<style scoped>
.clients-list-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #ffeef8 0%, #f8e8ff 50%, #fff0f5 100%);
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
  padding: 30px 20px;
  position: relative;
}

.back-button {
  position: absolute;
  left: 20px;
  top: 30px;
  background: white;
  border: 2px solid #ffb3d9;
  color: #d63384;
  padding: 10px 20px;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(214, 51, 132, 0.15);
}

.back-button:hover {
  background: #ffeef8;
  transform: translateX(-3px);
  box-shadow: 0 6px 12px rgba(214, 51, 132, 0.25);
}

.page-title {
  font-size: 3rem;
  color: #d63384;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(214, 51, 132, 0.2);
  font-weight: 600;
}

.page-subtitle {
  font-size: 1.2rem;
  color: #a855f7;
  margin: 10px 0 0 0;
  font-style: italic;
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
}

.actions-bar {
  margin-bottom: 30px;
  display: flex;
  justify-content: center;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 25px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.btn-primary {
  background: linear-gradient(135deg, #ff6b9d 0%, #c44569 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(214, 51, 132, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 15px;
  border-radius: 15px;
  margin-bottom: 20px;
  text-align: center;
  border: 2px solid #fcc;
}

.form-container {
  background: white;
  padding: 30px;
  border-radius: 20px;
  margin-bottom: 30px;
  box-shadow: 0 8px 16px rgba(214, 51, 132, 0.15);
}

.form-title {
  color: #d63384;
  margin: 0 0 20px 0;
  font-size: 1.5rem;
}

.loading {
  text-align: center;
  padding: 60px 20px;
  color: #a855f7;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #ffeef8;
  border-top-color: #ff6b9d;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #a855f7;
}

.empty-state p {
  font-size: 1.2rem;
  margin: 10px 0;
}

.empty-hint {
  font-size: 0.9rem;
  color: #c084fc;
  font-style: italic;
}

.clients-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.client-card {
  background: white;
  border-radius: 20px;
  padding: 25px;
  box-shadow: 0 4px 12px rgba(214, 51, 132, 0.15);
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.client-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(214, 51, 132, 0.25);
  border-color: #ffb3d9;
}

.client-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #ffeef8;
}

.client-name {
  color: #d63384;
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.client-actions {
  display: flex;
  gap: 10px;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: #ffeef8;
  transform: scale(1.1);
}

.client-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-label {
  font-weight: 600;
  color: #a855f7;
  min-width: 120px;
}

.detail-value {
  color: #555;
  flex: 1;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 2rem;
  }

  .back-button {
    position: static;
    margin-bottom: 20px;
  }

  .clients-grid {
    grid-template-columns: 1fr;
  }
}
</style>

