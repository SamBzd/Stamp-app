<template>
  <Layout>
    <div class="dashboard">
      <!-- Page Header -->
      <header class="page-header">
        <div class="page-header-content">
          <div class="page-header-greeting">
            <span class="greeting-emoji">✨</span>
            <h1 class="page-title">Tableau de bord</h1>
          </div>
          <p class="page-subtitle">Bienvenue ! Voici un aperçu de votre activité</p>
        </div>
      </header>

      <!-- Stats Row -->
      <section class="stats-row">
        <div class="stat-card stat-card-commandes">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.commandes }}</span>
            <span class="stat-label">Commandes</span>
          </div>
        </div>
        
        <div class="stat-card stat-card-clients">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.clients }}</span>
            <span class="stat-label">Clients</span>
          </div>
        </div>
        
        <div class="stat-card stat-card-attente">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.commandesEnAttente }}</span>
            <span class="stat-label">En attente</span>
          </div>
        </div>
        
        <div class="stat-card stat-card-reglees">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.commandesReglees }}</span>
            <span class="stat-label">Réglées</span>
          </div>
        </div>
      </section>

      <!-- Widgets Grid -->
      <section class="widgets-grid">
        <!-- Widget Commandes -->
        <router-link to="/commandes" class="widget">
          <div class="widget-header">
            <div class="widget-icon widget-icon-blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            </div>
            <div class="widget-title-group">
              <h2 class="widget-title">Commandes récentes</h2>
            </div>
            <div class="arrow-indicator">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </div>

          <div v-if="recentCommandes.length > 0" class="widget-list">
            <div 
              v-for="commande in recentCommandes" 
              :key="commande.id" 
              class="widget-list-item"
            >
              <div class="list-item-left">
                <span class="list-item-number">Commande n°{{ commande.id }}</span>
                <span class="list-item-title">{{ getClientName(commande.client_id) }}</span>
              </div>
              <span :class="['badge', commande.reglee ? 'badge-success' : 'badge-warning']">
                {{ commande.reglee ? 'Réglée' : 'En attente' }}
              </span>
            </div>
          </div>
          <div v-else class="widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <span>Aucune commande</span>
          </div>
        </router-link>

        <!-- Widget Clients -->
        <router-link to="/clients" class="widget">
          <div class="widget-header">
            <div class="widget-icon widget-icon-rose">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div class="widget-title-group">
              <h2 class="widget-title">Derniers clients</h2>
            </div>
            <div class="arrow-indicator">
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
            <span>Aucun client</span>
          </div>
        </router-link>

        <!-- Widget Stocks -->
        <router-link to="/stocks" class="widget widget-stocks">
          <div class="widget-header">
            <div class="widget-icon widget-icon-green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <div class="widget-title-group">
              <h2 class="widget-title">Stocks</h2>
              <span v-if="stocksACommander.length > 0" class="count-badge count-badge-warning">
                {{ stocksACommander.length }}
              </span>
            </div>
            <div class="arrow-indicator">
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
            <span>{{ stocksACommander.length }} article(s) à traiter</span>
          </div>

          <div v-if="stocksACommander.length > 0" class="widget-list">
            <div 
              v-for="stock in stocksACommanderPreview" 
              :key="`${stock.collection_id}-${stock.format}`" 
              class="widget-list-item"
            >
              <div :class="['format-badge', `format-badge-${stock.format.toLowerCase()}`]">
                {{ stock.format }}
              </div>
              <div class="list-item-content">
                <span class="list-item-title">{{ stock.collection_nom || `Collection #${stock.collection_id}` }}</span>
                <span class="list-item-meta">{{ stock.quantite_commande }} demandé(s)</span>
              </div>
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
    .slice(0, 4);
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

const getClientName = (clientId) => {
  const client = clientsStore.getClientById(clientId);
  return client ? `${client.prenom} ${client.nom}` : `Client #${clientId}`;
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
  max-width: var(--content-max-width);
  animation: fadeInUp 0.4s ease-out;
}

/* === Page Header === */
.page-header {
  margin-bottom: var(--spacing-8);
}

.page-header-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.page-header-greeting {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.greeting-emoji {
  font-size: var(--font-size-2xl);
}

.page-title {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  letter-spacing: var(--letter-spacing-tight);
  margin: 0;
}

.page-subtitle {
  font-size: var(--font-size-md);
  color: var(--text-secondary);
  margin: 0;
  padding-left: calc(var(--font-size-2xl) + var(--spacing-3));
}

/* === Stats Row === */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-8);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-5);
  background: var(--bg-primary);
  border-radius: var(--border-radius-xl);
  border: 1px solid var(--border-color-light);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--border-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon svg {
  width: 24px;
  height: 24px;
}

.stat-card-commandes .stat-icon {
  background: var(--info-light);
  color: var(--info-dark);
}

.stat-card-clients .stat-icon {
  background: var(--rose-100);
  color: var(--rose-600);
}

.stat-card-attente .stat-icon {
  background: var(--warning-light);
  color: var(--warning-dark);
}

.stat-card-reglees .stat-icon {
  background: var(--success-light);
  color: var(--success-dark);
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  line-height: 1;
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-top: var(--spacing-1);
}

/* === Widgets Grid === */
.widgets-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-5);
}

/* === Widget Base === */
.widget {
  background: var(--bg-primary);
  border-radius: var(--border-radius-xl);
  padding: var(--spacing-6);
  text-decoration: none;
  color: inherit;
  border: 1px solid var(--border-color-light);
  box-shadow: var(--shadow-card);
  transition: all var(--transition-normal);
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.widget:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-card-hover);
  border-color: var(--rose-200);
}

.widget:hover .arrow-indicator {
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

.widget-icon-blue {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.widget-icon-rose {
  background: linear-gradient(135deg, var(--rose-400) 0%, var(--rose-600) 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(236, 72, 153, 0.25);
}

.widget-icon-green {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
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

/* === Widget List === */
.widget-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  flex: 1;
}

.widget-list-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--gray-50);
  border-radius: var(--border-radius);
  transition: background var(--transition-fast);
}

.widget:hover .widget-list-item {
  background: var(--gray-100);
}

.list-item-left {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.list-item-number {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--text-tertiary);
}

.list-item-avatar {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--rose-400) 0%, var(--rose-600) 100%);
  color: white;
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

.list-item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.list-item-meta {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

/* === Widget Alert === */
.widget-alert {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--warning-light);
  color: var(--warning-dark);
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
  padding: var(--spacing-5);
  background: var(--success-light);
  color: var(--success-dark);
  border-radius: var(--border-radius);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  flex: 1;
}

.widget-success svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* === Widget Empty === */
.widget-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-3);
  padding: var(--spacing-8);
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
  flex: 1;
}

.widget-empty svg {
  width: 40px;
  height: 40px;
  opacity: 0.5;
}

/* === Responsive === */
@media (max-width: 1024px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .widgets-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
  
  .page-subtitle {
    padding-left: 0;
  }
}
</style>
