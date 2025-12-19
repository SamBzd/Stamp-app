<template>
  <Layout>
    <div class="dashboard">
      <!-- Page Header -->
      <header class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Vue d'ensemble de votre activité</p>
        </div>
      </header>

      <!-- Stats Cards -->
      <section class="stats-section">
        <div class="stats-grid">
          <div class="stat-card stat-card-rose">
            <div class="stat-icon-wrapper">
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

          <div class="stat-card stat-card-purple">
            <div class="stat-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.groupes }}</span>
              <span class="stat-label">Groupes</span>
            </div>
          </div>

          <div class="stat-card stat-card-blue">
            <div class="stat-icon-wrapper">
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

          <div class="stat-card stat-card-green">
            <div class="stat-icon-wrapper">
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
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="quick-actions-section">
        <h2 class="section-title">Navigation rapide</h2>
        <div class="quick-actions-grid">
          <router-link to="/clients" class="action-card">
            <div class="action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div class="action-content">
              <h3 class="action-title">Gérer les clients</h3>
              <p class="action-description">Ajouter, modifier ou consulter vos clients</p>
            </div>
            <div class="action-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </router-link>

          <router-link to="/groupes" class="action-card">
            <div class="action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div class="action-content">
              <h3 class="action-title">Gérer les groupes</h3>
              <p class="action-description">Créer et organiser vos groupes de collections</p>
            </div>
            <div class="action-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </router-link>

          <router-link to="/commandes" class="action-card">
            <div class="action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            </div>
            <div class="action-content">
              <h3 class="action-title">Gérer les commandes</h3>
              <p class="action-description">Suivre et gérer toutes vos commandes</p>
            </div>
            <div class="action-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </router-link>

          <router-link to="/stocks" class="action-card">
            <div class="action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <div class="action-content">
              <h3 class="action-title">Gestion des stocks</h3>
              <p class="action-description">Visualiser et ajuster vos stocks</p>
            </div>
            <div class="action-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </router-link>
        </div>
      </section>

      <!-- Recent Activity -->
      <section v-if="recentCommandes.length > 0" class="recent-section">
        <div class="section-header">
          <h2 class="section-title">Commandes récentes</h2>
          <router-link to="/commandes" class="section-link">
            Voir tout
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </router-link>
        </div>
        <div class="recent-list">
          <div 
            v-for="commande in recentCommandes" 
            :key="commande.id" 
            class="recent-item"
          >
            <div class="recent-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            </div>
            <div class="recent-item-content">
              <span class="recent-item-title">Commande #{{ commande.id }}</span>
              <span class="recent-item-subtitle">{{ getClientName(commande.client_id) }}</span>
            </div>
            <div class="recent-item-meta">
              <span :class="['status-badge', commande.reglee ? 'status-success' : 'status-warning']">
                {{ commande.reglee ? 'Réglée' : 'En attente' }}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import Layout from '../components/Layout.vue';
import { useClientsStore } from '../stores/clients';
import { useGroupesStore } from '../stores/groupes';
import { useCommandesStore } from '../stores/commandes';

const clientsStore = useClientsStore();
const groupesStore = useGroupesStore();
const commandesStore = useCommandesStore();

const loading = ref(true);

const stats = computed(() => ({
  clients: clientsStore.clients.length,
  groupes: groupesStore.groupes.length,
  commandes: commandesStore.commandes.length,
  commandesReglees: commandesStore.commandes.filter(c => c.reglee === 1).length,
}));

const recentCommandes = computed(() => {
  return [...commandesStore.commandes]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);
});

const getClientName = (clientId) => {
  const client = clientsStore.getClientById(clientId);
  return client ? `${client.prenom} ${client.nom}` : `Client #${clientId}`;
};

onMounted(async () => {
  try {
    await Promise.all([
      clientsStore.fetchClients(),
      groupesStore.fetchGroupes(),
      commandesStore.fetchCommandes(),
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

/* === Stats Section === */
.stats-section {
  margin-bottom: var(--spacing-10);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--spacing-5);
}

.stat-card {
  background: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-5);
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  border: 1px solid var(--border-color-light);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stat-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: var(--border-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-wrapper svg {
  width: 24px;
  height: 24px;
}

.stat-card-rose .stat-icon-wrapper {
  background: var(--rose-100);
  color: var(--rose-600);
}

.stat-card-purple .stat-icon-wrapper {
  background: #f3e8ff;
  color: #9333ea;
}

.stat-card-blue .stat-icon-wrapper {
  background: #dbeafe;
  color: #2563eb;
}

.stat-card-green .stat-icon-wrapper {
  background: #d1fae5;
  color: #059669;
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

/* === Section Title === */
.section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-5);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-5);
}

.section-header .section-title {
  margin-bottom: 0;
}

.section-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--rose-600);
  text-decoration: none;
}

.section-link svg {
  width: 16px;
  height: 16px;
}

.section-link:hover {
  color: var(--rose-700);
}

/* === Quick Actions === */
.quick-actions-section {
  margin-bottom: var(--spacing-10);
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-4);
}

.action-card {
  background: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-5);
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  text-decoration: none;
  color: inherit;
  border: 1px solid var(--border-color-light);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);
}

.action-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--rose-200);
}

.action-card:hover .action-icon {
  background: var(--rose-100);
  color: var(--rose-600);
}

.action-card:hover .action-arrow {
  transform: translateX(4px);
  opacity: 1;
}

.action-icon {
  width: 44px;
  height: 44px;
  background: var(--gray-100);
  border-radius: var(--border-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-secondary);
  transition: all var(--transition-normal);
}

.action-icon svg {
  width: 22px;
  height: 22px;
}

.action-content {
  flex: 1;
  min-width: 0;
}

.action-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-1);
}

.action-description {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

.action-arrow {
  color: var(--text-tertiary);
  opacity: 0;
  transition: all var(--transition-normal);
}

.action-arrow svg {
  width: 20px;
  height: 20px;
}

/* === Recent Section === */
.recent-section {
  background: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-6);
  border: 1px solid var(--border-color-light);
  box-shadow: var(--shadow-sm);
}

.recent-list {
  display: flex;
  flex-direction: column;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-4) 0;
  border-bottom: 1px solid var(--border-color-light);
}

.recent-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.recent-item:first-child {
  padding-top: 0;
}

.recent-item-icon {
  width: 36px;
  height: 36px;
  background: var(--rose-50);
  border-radius: var(--border-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--rose-500);
  flex-shrink: 0;
}

.recent-item-icon svg {
  width: 18px;
  height: 18px;
}

.recent-item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.recent-item-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.recent-item-subtitle {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.recent-item-meta {
  flex-shrink: 0;
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

/* === Responsive === */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .quick-actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
