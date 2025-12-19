<template>
  <Layout>
    <div class="dashboard">
      <!-- Page Header -->
      <header class="page-header">
        <div>
          <h1 class="page-title">Tableau de bord</h1>
          <p class="page-subtitle">Bienvenue ! Voici un aperçu de votre activité</p>
        </div>
      </header>

      <!-- Widgets Grid -->
      <section class="widgets-section">
        <div class="widgets-grid">
          
          <!-- Widget Commandes -->
          <router-link to="/commandes" class="widget widget-commandes">
            <div class="widget-header">
              <div class="widget-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="9" cy="21" r="1"/>
                  <circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
              </div>
              <div class="widget-title-group">
                <h2 class="widget-title">Commandes</h2>
                <span class="widget-count">{{ stats.commandes }}</span>
              </div>
              <div class="widget-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </div>

            <div class="widget-stats">
              <div class="widget-stat">
                <span class="stat-number stat-warning">{{ stats.commandesEnAttente }}</span>
                <span class="stat-text">en attente</span>
              </div>
              <div class="widget-stat">
                <span class="stat-number stat-success">{{ stats.commandesReglees }}</span>
                <span class="stat-text">réglées</span>
              </div>
            </div>

            <div v-if="recentCommandes.length > 0" class="widget-list">
              <div 
                v-for="commande in recentCommandes" 
                :key="commande.id" 
                class="widget-list-item"
              >
                <span class="list-item-title">Commande #{{ commande.id }}</span>
                <span :class="['list-item-badge', commande.reglee ? 'badge-success' : 'badge-warning']">
                  {{ commande.reglee ? 'Réglée' : 'En attente' }}
                </span>
              </div>
            </div>
            <div v-else class="widget-empty">
              Aucune commande
            </div>
          </router-link>

          <!-- Widget Clients -->
          <router-link to="/clients" class="widget widget-clients">
            <div class="widget-header">
              <div class="widget-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div class="widget-title-group">
                <h2 class="widget-title">Clients</h2>
                <span class="widget-count">{{ stats.clients }}</span>
              </div>
              <div class="widget-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </div>

            <div v-if="recentClients.length > 0" class="widget-list">
              <div 
                v-for="client in recentClients" 
                :key="client.id" 
                class="widget-list-item"
              >
                <div class="list-item-avatar">
                  {{ getInitials(client) }}
                </div>
                <span class="list-item-title">{{ client.prenom }} {{ client.nom }}</span>
              </div>
            </div>
            <div v-else class="widget-empty">
              Aucun client
            </div>
          </router-link>

          <!-- Widget Stocks -->
          <router-link to="/stocks" class="widget widget-stocks">
            <div class="widget-header">
              <div class="widget-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <div class="widget-title-group">
                <h2 class="widget-title">Stocks</h2>
                <span v-if="stocksACommander.length > 0" class="widget-count widget-count-alert">
                  {{ stocksACommander.length }}
                </span>
              </div>
              <div class="widget-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </div>

            <div v-if="stocksACommander.length > 0" class="widget-alert">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{{ stocksACommander.length }} article(s) à commander</span>
            </div>

            <div v-if="stocksACommander.length > 0" class="widget-list">
              <div 
                v-for="stock in stocksACommanderPreview" 
                :key="`${stock.collection_id}-${stock.format}`" 
                class="widget-list-item"
              >
                <span class="list-item-title">{{ stock.collection_nom || `Collection #${stock.collection_id}` }}</span>
                <span class="list-item-meta">{{ stock.format }} · {{ stock.quantite_commande }} à commander</span>
              </div>
            </div>
            <div v-else class="widget-success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>Tous les stocks sont à jour</span>
            </div>
          </router-link>

        </div>
      </section>
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import Layout from '../components/Layout.vue';
import { useClientsStore } from '../stores/clients';
import { useCommandesStore } from '../stores/commandes';
import { useStocksStore } from '../stores/stocks';

const clientsStore = useClientsStore();
const commandesStore = useCommandesStore();
const stocksStore = useStocksStore();

const loading = ref(true);

const stats = computed(() => ({
  clients: clientsStore.clients.length,
  commandes: commandesStore.commandes.length,
  commandesReglees: commandesStore.commandes.filter(c => c.reglee === 1).length,
  commandesEnAttente: commandesStore.commandes.filter(c => c.reglee !== 1).length,
}));

const recentCommandes = computed(() => {
  return [...commandesStore.commandes]
    .sort((a, b) => b.id - a.id)
    .slice(0, 3);
});

const recentClients = computed(() => {
  return [...clientsStore.clients]
    .sort((a, b) => b.id - a.id)
    .slice(0, 4);
});

const stocksACommander = computed(() => {
  return stocksStore.stocksANecessiterCommande;
});

const stocksACommanderPreview = computed(() => {
  return stocksACommander.value.slice(0, 3);
});

const getInitials = (client) => {
  const prenom = client.prenom || '';
  const nom = client.nom || '';
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
};

onMounted(async () => {
  try {
    await Promise.all([
      clientsStore.fetchClients(),
      commandesStore.fetchCommandes(),
      stocksStore.fetchStocks(),
    ]);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
}

.page-header {
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

/* === Widgets Section === */
.widgets-section {
  margin-bottom: var(--spacing-10);
}

.widgets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--spacing-6);
}

/* === Widget Base === */
.widget {
  background: var(--bg-primary);
  border-radius: var(--border-radius-xl);
  padding: var(--spacing-6);
  text-decoration: none;
  color: inherit;
  border: 1px solid var(--border-color-light);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.widget:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.widget:hover .widget-arrow {
  transform: translateX(4px);
  opacity: 1;
}

/* === Widget Header === */
.widget-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-5);
  padding-bottom: var(--spacing-4);
  border-bottom: 1px solid var(--border-color-light);
}

.widget-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--border-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.widget-icon svg {
  width: 24px;
  height: 24px;
}

.widget-commandes .widget-icon {
  background: #dbeafe;
  color: #2563eb;
}

.widget-clients .widget-icon {
  background: var(--rose-100);
  color: var(--rose-600);
}

.widget-stocks .widget-icon {
  background: #d1fae5;
  color: #059669;
}

.widget-title-group {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.widget-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0;
}

.widget-count {
  background: var(--gray-100);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--border-radius-full);
}

.widget-count-alert {
  background: #fef3c7;
  color: #d97706;
}

.widget-arrow {
  color: var(--text-tertiary);
  opacity: 0.5;
  transition: all var(--transition-normal);
}

.widget-arrow svg {
  width: 20px;
  height: 20px;
}

/* === Widget Stats === */
.widget-stats {
  display: flex;
  gap: var(--spacing-6);
  margin-bottom: var(--spacing-5);
}

.widget-stat {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-2);
}

.stat-number {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}

.stat-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.stat-warning {
  color: #d97706;
}

.stat-success {
  color: #059669;
}

/* === Widget List === */
.widget-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.widget-list-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  background: var(--gray-50);
  border-radius: var(--border-radius);
  transition: background var(--transition-fast);
}

.widget:hover .widget-list-item {
  background: var(--gray-100);
}

.list-item-avatar {
  width: 32px;
  height: 32px;
  background: var(--rose-100);
  color: var(--rose-600);
  border-radius: var(--border-radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  flex-shrink: 0;
}

.list-item-title {
  flex: 1;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.list-item-meta {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.list-item-badge {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--border-radius-sm);
}

.badge-success {
  background: #d1fae5;
  color: #059669;
}

.badge-warning {
  background: #fef3c7;
  color: #d97706;
}

/* === Widget Alert === */
.widget-alert {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  background: #fef3c7;
  color: #d97706;
  border-radius: var(--border-radius);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--spacing-4);
}

.widget-alert svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* === Widget Success === */
.widget-success {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  background: #d1fae5;
  color: #059669;
  border-radius: var(--border-radius);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.widget-success svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* === Widget Empty === */
.widget-empty {
  text-align: center;
  padding: var(--spacing-6);
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

/* === Responsive === */
@media (max-width: 768px) {
  .widgets-grid {
    grid-template-columns: 1fr;
  }
  
  .widget-stats {
    flex-wrap: wrap;
    gap: var(--spacing-4);
  }
}
</style>
