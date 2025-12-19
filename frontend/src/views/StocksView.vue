<template>
  <Layout>
    <div class="stocks-view">
      <!-- Page Header -->
      <header class="page-header">
        <div>
          <h1 class="page-title">Gestion des stocks</h1>
          <p class="page-subtitle">Suivez et gérez vos stocks par collection et format</p>
        </div>
        <Button variant="secondary" @click="recalculateStocks" :loading="recalculating">
          <template #icon>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </template>
          Recalculer
        </Button>
      </header>

      <!-- Stats Summary -->
      <div class="stats-summary">
        <div class="stat-item">
          <span class="stat-number">{{ totalStocks }}</span>
          <span class="stat-label">Total entrées</span>
        </div>
        <div class="stat-item stat-warning">
          <span class="stat-number">{{ stocksAGerer }}</span>
          <span class="stat-label">À gérer</span>
        </div>
        <div class="stat-item stat-success">
          <span class="stat-number">{{ stocksGeres }}</span>
          <span class="stat-label">Gérés</span>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="filter-tabs">
        <button 
          :class="['filter-tab', { active: currentFilter === 'all' }]"
          @click="currentFilter = 'all'"
        >
          Tous
          <span class="tab-count">{{ stocksStore.stocks.length }}</span>
        </button>
        <button 
          :class="['filter-tab filter-tab-warning', { active: currentFilter === 'pending' }]"
          @click="currentFilter = 'pending'"
        >
          À gérer
          <span class="tab-count">{{ stocksAGerer }}</span>
        </button>
        <button 
          :class="['filter-tab filter-tab-success', { active: currentFilter === 'done' }]"
          @click="currentFilter = 'done'"
        >
          Gérés
          <span class="tab-count">{{ stocksGeres }}</span>
        </button>
      </div>

      <!-- Stocks List -->
      <div v-if="stocksStore.loading" class="loading-state">
        <div class="loading-spinner"></div>
        <span class="loading-state-text">Chargement des stocks...</span>
      </div>

      <div v-else-if="stocksStore.error" class="error-state">
        <p>{{ stocksStore.error }}</p>
        <Button variant="secondary" @click="reloadStocks">Réessayer</Button>
      </div>

      <div v-else-if="filteredStocks.length === 0" class="empty-state">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        </div>
        <h3 class="empty-state-title">
          {{ currentFilter !== 'all' ? 'Aucun stock dans cette catégorie' : 'Aucun stock à gérer' }}
        </h3>
        <p class="empty-state-description">
          {{ currentFilter !== 'all' ? 'Changez de filtre pour voir d\'autres stocks' : 'Les stocks apparaîtront lorsqu\'il y aura des commandes' }}
        </p>
        <Button v-if="currentFilter !== 'all'" variant="secondary" @click="currentFilter = 'all'">
          Voir tous les stocks
        </Button>
      </div>

      <div v-else class="stocks-grid">
        <div
          v-for="stock in filteredStocks"
          :key="`${stock.collection_id}_${stock.format}`"
          :class="['stock-card', { 'stock-card-done': stock.gere === 1 }]"
        >
          <div class="stock-header">
            <div class="stock-info">
              <h3 class="stock-collection">{{ stock.collection_nom || getCollectionName(stock.collection_id) }}</h3>
              <span class="stock-format">Format {{ stock.format }}</span>
            </div>
            <span :class="['status-indicator', stock.gere === 1 ? 'status-done' : 'status-pending']">
              {{ stock.gere === 1 ? 'Géré' : 'À gérer' }}
            </span>
          </div>

          <div class="stock-metrics">
            <div class="metric">
              <span class="metric-label">Commandés</span>
              <span class="metric-value metric-demand">{{ stock.quantite_commande }}</span>
            </div>
            <div class="metric metric-editable">
              <span class="metric-label">En stock</span>
              <div class="stock-input-wrapper">
                <button 
                  class="stock-adjust-btn" 
                  @click="decrementStock(stock)"
                  :disabled="stock.quantite_stock <= 0"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
                <input
                  :value="stock.quantite_stock"
                  type="number"
                  min="0"
                  class="stock-input"
                  @change="updateStock(stock, $event.target.value)"
                />
                <button 
                  class="stock-adjust-btn" 
                  @click="incrementStock(stock)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div class="stock-actions">
            <Button
              v-if="stock.gere === 0"
              variant="success"
              size="sm"
              @click="markAsGere(stock)"
            >
              <template #icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </template>
              Marquer comme géré
            </Button>
            <Button
              v-else
              variant="secondary"
              size="sm"
              @click="markAsNonGere(stock)"
            >
              <template #icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                  <path d="M3 21v-5h5"/>
                </svg>
              </template>
              Remettre en attente
            </Button>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Layout from '../components/Layout.vue';
import Button from '../components/Button.vue';
import { useStocksStore } from '../stores/stocks';
import { useCollectionsStore } from '../stores/collections';

const stocksStore = useStocksStore();
const collectionsStore = useCollectionsStore();

const currentFilter = ref('all');
const recalculating = ref(false);

const totalStocks = computed(() => stocksStore.stocks.length);

const stocksAGerer = computed(() => {
  return stocksStore.stocks.filter(s => s.gere === 0 && s.quantite_commande > 0).length;
});

const stocksGeres = computed(() => {
  return stocksStore.stocks.filter(s => s.gere === 1).length;
});

const filteredStocks = computed(() => {
  switch (currentFilter.value) {
    case 'pending':
      return stocksStore.stocks.filter(s => s.gere === 0 && s.quantite_commande > 0);
    case 'done':
      return stocksStore.stocks.filter(s => s.gere === 1);
    default:
      return stocksStore.stocks;
  }
});

const getCollectionName = (collectionId) => {
  const collection = collectionsStore.getCollectionById(collectionId);
  return collection ? collection.nom : `Collection #${collectionId}`;
};

const reloadStocks = async () => {
  try {
    await stocksStore.fetchStocks();
  } catch (error) {
    console.error('Erreur:', error);
  }
};

const recalculateStocks = async () => {
  recalculating.value = true;
  try {
    await stocksStore.recalculateStocks();
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    recalculating.value = false;
  }
};

const updateStock = async (stock, newValue) => {
  const quantiteStock = parseInt(newValue);
  if (isNaN(quantiteStock) || quantiteStock < 0) {
    await stocksStore.fetchStocks();
    return;
  }
  
  if (quantiteStock === stock.quantite_stock) return;
  
  try {
    await stocksStore.updateStock(stock.collection_id, stock.format, quantiteStock);
    await stocksStore.fetchStocks();
  } catch (error) {
    console.error('Erreur:', error);
    await stocksStore.fetchStocks();
  }
};

const incrementStock = async (stock) => {
  await updateStock(stock, stock.quantite_stock + 1);
};

const decrementStock = async (stock) => {
  if (stock.quantite_stock > 0) {
    await updateStock(stock, stock.quantite_stock - 1);
  }
};

const markAsGere = async (stock) => {
  try {
    await stocksStore.markAsGere(stock.collection_id, stock.format);
    await stocksStore.fetchStocks();
  } catch (error) {
    console.error('Erreur:', error);
  }
};

const markAsNonGere = async (stock) => {
  try {
    await stocksStore.markAsNonGere(stock.collection_id, stock.format);
    await stocksStore.fetchStocks();
  } catch (error) {
    console.error('Erreur:', error);
  }
};

onMounted(async () => {
  try {
    await collectionsStore.fetchCollections();
    await stocksStore.fetchStocks();
  } catch (error) {
    console.error('Erreur:', error);
  }
});
</script>

<style scoped>
.stocks-view {
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

/* === Stats Summary === */
.stats-summary {
  display: flex;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-6);
  padding: var(--spacing-5);
  background: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--border-color-light);
  box-shadow: var(--shadow-sm);
}

.stat-item {
  display: flex;
  flex-direction: column;
  padding: var(--spacing-3) var(--spacing-5);
  border-radius: var(--border-radius);
  background: var(--gray-50);
  min-width: 120px;
}

.stat-item.stat-warning {
  background: var(--warning-light);
}

.stat-item.stat-success {
  background: var(--success-light);
}

.stat-number {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  line-height: 1;
}

.stat-warning .stat-number {
  color: #d97706;
}

.stat-success .stat-number {
  color: #059669;
}

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-top: var(--spacing-1);
}

/* === Filter Tabs === */
.filter-tabs {
  display: flex;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-6);
  padding: var(--spacing-1);
  background: var(--gray-100);
  border-radius: var(--border-radius);
  width: fit-content;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  background: transparent;
  border: none;
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  font-family: var(--font-family);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.filter-tab:hover {
  color: var(--text-primary);
}

.filter-tab.active {
  background: var(--bg-primary);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

.filter-tab-warning.active {
  color: #d97706;
}

.filter-tab-success.active {
  color: #059669;
}

.tab-count {
  padding: 2px 8px;
  background: var(--gray-200);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
}

.filter-tab.active .tab-count {
  background: var(--rose-100);
  color: var(--rose-700);
}

.filter-tab-warning.active .tab-count {
  background: var(--warning-light);
  color: #d97706;
}

.filter-tab-success.active .tab-count {
  background: var(--success-light);
  color: #059669;
}

/* === Stocks Grid === */
.stocks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--spacing-4);
}

.stock-card {
  background: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-5);
  border: 1px solid var(--border-color-light);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);
}

.stock-card:hover {
  border-color: var(--rose-200);
  box-shadow: var(--shadow-md);
}

.stock-card-done {
  opacity: 0.7;
  background: var(--gray-50);
}

.stock-card-done:hover {
  opacity: 1;
}

.stock-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-4);
  padding-bottom: var(--spacing-4);
  border-bottom: 1px solid var(--border-color-light);
}

.stock-info {
  flex: 1;
  min-width: 0;
}

.stock-collection {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stock-format {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.status-indicator {
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.status-pending {
  background: var(--warning-light);
  color: #d97706;
}

.status-done {
  background: var(--success-light);
  color: #059669;
}

/* === Stock Metrics === */
.stock-metrics {
  display: flex;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-4);
}

.metric {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  background: var(--gray-50);
  border-radius: var(--border-radius);
}

.metric-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-value {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
}

.metric-demand {
  color: var(--rose-600);
}

.stock-input-wrapper {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.stock-adjust-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: var(--bg-primary);
  border-radius: var(--border-radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  box-shadow: var(--shadow-xs);
}

.stock-adjust-btn:hover:not(:disabled) {
  background: var(--rose-100);
  color: var(--rose-600);
}

.stock-adjust-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stock-adjust-btn svg {
  width: 14px;
  height: 14px;
}

.stock-input {
  width: 60px;
  padding: var(--spacing-2);
  border: 1.5px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  font-family: var(--font-family);
  text-align: center;
  color: var(--text-primary);
  background: var(--bg-primary);
}

.stock-input:focus {
  outline: none;
  border-color: var(--rose-400);
  box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.12);
}

/* Remove number input spinners */
.stock-input::-webkit-outer-spin-button,
.stock-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.stock-input {
  -moz-appearance: textfield;
}

/* === Stock Actions === */
.stock-actions {
  padding-top: var(--spacing-4);
  border-top: 1px solid var(--border-color-light);
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
  
  .stats-summary {
    flex-wrap: wrap;
  }
  
  .stat-item {
    flex: 1;
    min-width: 100px;
  }
  
  .filter-tabs {
    width: 100%;
    overflow-x: auto;
  }
  
  .stocks-grid {
    grid-template-columns: 1fr;
  }
  
  .stock-metrics {
    flex-direction: column;
  }
}
</style>


