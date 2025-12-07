<template>
  <div class="dashboard-container">
    <header class="dashboard-header">
      <h1 class="dashboard-title">💕 Mon Tableau de Bord 💕</h1>
      <p class="dashboard-subtitle">Gérez votre activité en un coup d'œil</p>
    </header>

    <div class="dashboard-grid">
      <!-- Carte 1: Liste des clients -->
      <div 
        class="dashboard-card card-clients"
        @click="navigateToClients"
      >
        <div class="card-icon">👥</div>
        <h2 class="card-title">Mes Clients</h2>
        <p class="card-description">Gérez votre liste de clients</p>
        <div class="card-stats">
          <span class="stat-number">{{ clientsCount }}</span>
          <span class="stat-label">clients</span>
        </div>
        <div class="card-footer">
          <span class="card-link">Voir la liste →</span>
        </div>
      </div>

      <!-- Carte 2: Vide (à venir) -->
      <div class="dashboard-card card-coming-soon">
        <div class="card-icon">✨</div>
        <h2 class="card-title">Bientôt disponible</h2>
        <p class="card-description">Une nouvelle fonctionnalité arrive...</p>
        <div class="card-stats">
          <span class="stat-number">-</span>
          <span class="stat-label">en préparation</span>
        </div>
        <div class="card-footer">
          <span class="card-link disabled">À venir</span>
        </div>
      </div>

      <!-- Carte 3: Vide (à venir) -->
      <div class="dashboard-card card-coming-soon">
        <div class="card-icon">🌟</div>
        <h2 class="card-title">Bientôt disponible</h2>
        <p class="card-description">Une nouvelle fonctionnalité arrive...</p>
        <div class="card-stats">
          <span class="stat-number">-</span>
          <span class="stat-label">en préparation</span>
        </div>
        <div class="card-footer">
          <span class="card-link disabled">À venir</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useClientsStore } from '../stores/clients'

const router = useRouter()
const clientsStore = useClientsStore()

const clientsCount = computed(() => clientsStore.clients.length)

onMounted(() => {
  clientsStore.fetchClients()
})

const navigateToClients = () => {
  router.push('/clients')
}
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #ffeef8 0%, #f8e8ff 50%, #fff0f5 100%);
  padding: 40px 20px;
}

.dashboard-header {
  text-align: center;
  margin-bottom: 50px;
  padding: 30px 20px;
}

.dashboard-title {
  font-size: 3.5rem;
  color: #d63384;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(214, 51, 132, 0.2);
  font-weight: 700;
  background: linear-gradient(135deg, #d63384 0%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.dashboard-subtitle {
  font-size: 1.3rem;
  color: #a855f7;
  margin: 15px 0 0 0;
  font-style: italic;
  font-weight: 300;
}

.dashboard-grid {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 30px;
  padding: 20px;
}

.dashboard-card {
  background: white;
  border-radius: 25px;
  padding: 40px 30px;
  box-shadow: 0 10px 30px rgba(214, 51, 132, 0.15);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;
  border: 3px solid transparent;
  position: relative;
  overflow: hidden;
}

.dashboard-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
  background: linear-gradient(90deg, #ff6b9d 0%, #c44569 50%, #a855f7 100%);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.dashboard-card:hover::before {
  transform: scaleX(1);
}

.card-clients {
  background: linear-gradient(135deg, #fff 0%, #ffeef8 100%);
}

.card-clients:hover {
  transform: translateY(-10px) scale(1.02);
  box-shadow: 0 20px 40px rgba(214, 51, 132, 0.25);
  border-color: #ffb3d9;
}

.card-coming-soon {
  background: linear-gradient(135deg, #fff 0%, #f8f8f8 100%);
  opacity: 0.7;
  cursor: not-allowed;
}

.card-coming-soon:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
}

.card-icon {
  font-size: 4rem;
  text-align: center;
  margin-bottom: 20px;
  filter: drop-shadow(0 4px 8px rgba(214, 51, 132, 0.2));
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.card-title {
  font-size: 1.8rem;
  color: #d63384;
  margin: 0 0 10px 0;
  font-weight: 700;
  text-align: center;
}

.card-description {
  font-size: 1rem;
  color: #666;
  margin: 0 0 30px 0;
  text-align: center;
  line-height: 1.6;
}

.card-stats {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  margin-bottom: 25px;
  padding: 20px;
  background: linear-gradient(135deg, #ffeef8 0%, #f8e8ff 100%);
  border-radius: 15px;
}

.stat-number {
  font-size: 3rem;
  font-weight: 700;
  background: linear-gradient(135deg, #ff6b9d 0%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}

.stat-label {
  font-size: 0.9rem;
  color: #a855f7;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.card-footer {
  text-align: center;
  padding-top: 20px;
  border-top: 2px solid #ffeef8;
}

.card-link {
  color: #ff6b9d;
  font-weight: 600;
  font-size: 1.1rem;
  transition: all 0.3s ease;
  display: inline-block;
}

.card-clients:hover .card-link {
  color: #d63384;
  transform: translateX(5px);
}

.card-link.disabled {
  color: #bbb;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .dashboard-title {
    font-size: 2.5rem;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .dashboard-card {
    padding: 30px 20px;
  }
}
</style>

