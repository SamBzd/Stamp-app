<template>
  <Layout>
    <div class="stocks-view">
      <!-- Page Header -->
      <header class="page-header">
        <div>
          <h1 class="page-title">Stocks</h1>
          <p class="page-subtitle">Gestion des commandes fournisseur</p>
        </div>
        <Button variant="secondary" @click="recalculateStocks" :loading="recalculating">
          <template #icon>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </template>
          Actualiser
        </Button>
      </header>

      <!-- Two States Toggle -->
      <div class="state-toggle">
        <button 
          :class="['toggle-btn', 'toggle-todo', { active: currentTab === 'todo' }]"
          @click="currentTab = 'todo'"
        >
          <span class="toggle-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </span>
          <span class="toggle-label">À traiter</span>
          <span class="toggle-count">{{ todoItems.length }}</span>
        </button>
        <button 
          :class="['toggle-btn', 'toggle-done', { active: currentTab === 'done' }]"
          @click="currentTab = 'done'"
        >
          <span class="toggle-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </span>
          <span class="toggle-label">Traité</span>
          <span class="toggle-count">{{ doneItems.length }}</span>
        </button>
      </div>

      <!-- Main Content -->
      <div v-if="stocksStore.loading" class="loading-state">
        <div class="loading-spinner"></div>
        <span class="loading-state-text">Chargement...</span>
      </div>

      <div v-else>
        <!-- Tab: À traiter -->
        <div v-if="currentTab === 'todo'" class="tab-content">
          <div v-if="todoItems.length === 0" class="empty-tab">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h3>Aucun article à traiter</h3>
            <p>Toutes les collections demandées ont été traitées</p>
          </div>

          <div v-else class="items-list">
            <div 
              v-for="item in todoItems" 
              :key="`${item.collection_id}-${item.format}`" 
              class="item-card item-todo"
            >
              <div class="item-main">
                <div class="item-format" :class="`format-${item.format.toLowerCase()}`">{{ item.format }}</div>
                <div class="item-info">
                  <h3 class="item-name">{{ item.collection_nom }}</h3>
                  <p class="item-demand">
                    <strong>{{ item.quantite_commande }}</strong> demandé{{ item.quantite_commande > 1 ? 's' : '' }}
                  </p>
                </div>
              </div>
              <button class="action-btn action-done" @click="markAsDone(item)" title="Marquer comme traité">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Tab: Traité -->
        <div v-if="currentTab === 'done'" class="tab-content">
          <div v-if="doneItems.length === 0" class="empty-tab">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
              </svg>
            </div>
            <h3>Aucun article traité</h3>
            <p>Les articles validés apparaîtront ici</p>
          </div>

          <div v-else class="items-list">
            <div 
              v-for="item in doneItems" 
              :key="`${item.collection_id}-${item.format}`" 
              class="item-card item-done"
            >
              <div class="item-main">
                <div class="item-format" :class="`format-${item.format.toLowerCase()}`">{{ item.format }}</div>
                <div class="item-info">
                  <h3 class="item-name">{{ item.collection_nom }}</h3>
                  <p class="item-stock" v-if="item.quantite_stock > 0">
                    <strong>{{ item.quantite_stock }}</strong> en stock
                  </p>
                  <p class="item-stock" v-else>Traité</p>
                </div>
              </div>
              <button class="action-btn action-undo" @click="markAsTodo(item)" title="Remettre à commander">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                </svg>
              </button>
            </div>
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

const currentTab = ref('todo');
const recalculating = ref(false);

// 2 états simples :
// - À commander : gere === 0 et demande > 0
// - C'est bon : gere === 1 ou stock > 0

const todoItems = computed(() => {
  return stocksStore.stocks
    .filter(s => s.quantite_commande > 0 && s.gere === 0)
    .sort((a, b) => b.quantite_commande - a.quantite_commande);
});

const doneItems = computed(() => {
  return stocksStore.stocks
    .filter(s => s.gere === 1 || s.quantite_stock > 0)
    .sort((a, b) => (a.collection_nom || '').localeCompare(b.collection_nom || ''));
});

// Actions
const markAsDone = async (item) => {
  try {
    await stocksStore.markAsGere(item.collection_id, item.format);
    await stocksStore.fetchStocks();
  } catch (error) {
    console.error('Erreur:', error);
  }
};

const markAsTodo = async (item) => {
  try {
    await stocksStore.markAsNonGere(item.collection_id, item.format);
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
  max-width: 800px;
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

/* === State Toggle === */
.state-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-6);
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-5);
  background: var(--bg-primary);
  border: 2px solid var(--border-color-light);
  border-radius: var(--border-radius-xl);
  cursor: pointer;
  transition: all var(--transition-normal);
  font-family: var(--font-family);
}

.toggle-btn:hover {
  border-color: var(--gray-300);
}

.toggle-todo.active {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-color: #f59e0b;
}

.toggle-done.active {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border-color: #10b981;
}

.toggle-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-icon svg {
  width: 24px;
  height: 24px;
}

.toggle-label {
  flex: 1;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  text-align: left;
}

.toggle-count {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.6);
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--border-radius-full);
  min-width: 40px;
  text-align: center;
}

/* === Tab Content === */
.tab-content {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* === Empty Tab === */
.empty-tab {
  text-align: center;
  padding: var(--spacing-16);
  background: var(--gray-50);
  border-radius: var(--border-radius-xl);
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto var(--spacing-4);
  color: var(--text-tertiary);
}

.empty-icon svg {
  width: 100%;
  height: 100%;
}

.empty-tab h3 {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-2) 0;
}

.empty-tab p {
  font-size: var(--font-size-md);
  color: var(--text-secondary);
  margin: 0;
}

/* === Items List === */
.items-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.item-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-4) var(--spacing-5);
  background: var(--bg-primary);
  border-radius: var(--border-radius-xl);
  border-left: 4px solid;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);
}

.item-card:hover {
  box-shadow: var(--shadow-md);
}

.item-todo {
  border-left-color: #f59e0b;
}

.item-done {
  border-left-color: #10b981;
  opacity: 0.8;
}

.item-done:hover {
  opacity: 1;
}

.item-main {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  flex: 1;
  min-width: 0;
}

.item-format {
  width: 44px;
  height: 44px;
  border-radius: var(--border-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: white;
  flex-shrink: 0;
}

.format-a { background: #2563eb; }
.format-b { background: var(--rose-500); }
.format-c { background: #059669; }

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-1) 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-demand {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
}

.item-demand strong {
  color: #f59e0b;
}

.item-stock {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
}

.item-stock strong {
  color: #10b981;
}

/* === Action Button === */
.action-btn {
  width: 48px;
  height: 48px;
  border: none;
  border-radius: var(--border-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.action-btn svg {
  width: 24px;
  height: 24px;
}

.action-done {
  background: #d1fae5;
  color: #059669;
}

.action-done:hover {
  background: #10b981;
  color: white;
  transform: scale(1.05);
}

.action-undo {
  background: var(--gray-100);
  color: var(--text-secondary);
}

.action-undo:hover {
  background: var(--gray-200);
  color: var(--text-primary);
}

/* === Loading === */
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

/* === Responsive === */
@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    gap: var(--spacing-4);
  }
  
  .state-toggle {
    grid-template-columns: 1fr;
  }
  
  .toggle-label {
    display: none;
  }
  
  .item-card {
    padding: var(--spacing-3) var(--spacing-4);
  }
  
  .item-format {
    width: 36px;
    height: 36px;
    font-size: var(--font-size-md);
  }
  
  .action-btn {
    width: 40px;
    height: 40px;
  }
  
  .action-btn svg {
    width: 20px;
    height: 20px;
  }
}
</style>
