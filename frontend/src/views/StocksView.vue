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

      <!-- Stats Summary -->
      <div class="stats-summary">
        <div class="summary-card summary-card-todo">
          <div class="summary-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div class="summary-content">
            <span class="summary-value">{{ todoItems.length }}</span>
            <span class="summary-label">À traiter</span>
          </div>
        </div>
        <div class="summary-card summary-card-done">
          <div class="summary-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="summary-content">
            <span class="summary-value">{{ doneItems.length }}</span>
            <span class="summary-label">Traité</span>
          </div>
        </div>
      </div>

      <!-- Two States Toggle -->
      <div class="state-toggle">
        <button 
          :class="['toggle-btn', { active: currentTab === 'todo' }]"
          @click="currentTab = 'todo'"
        >
          <span class="toggle-icon toggle-icon-todo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </span>
          <span class="toggle-label">À traiter</span>
          <span v-if="todoItems.length > 0" class="toggle-count toggle-count-todo">{{ todoItems.length }}</span>
        </button>
        <button 
          :class="['toggle-btn', { active: currentTab === 'done' }]"
          @click="currentTab = 'done'"
        >
          <span class="toggle-icon toggle-icon-done">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </span>
          <span class="toggle-label">Traité</span>
          <span v-if="doneItems.length > 0" class="toggle-count toggle-count-done">{{ doneItems.length }}</span>
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
            <h3>Parfait !</h3>
            <p>Tous les articles ont été traités</p>
          </div>

          <div v-else class="items-list">
            <div 
              v-for="(item, index) in todoItems" 
              :key="`${item.collection_id}-${item.format}`" 
              class="item-card item-todo"
              :style="{ animationDelay: `${index * 0.05}s` }"
            >
              <div class="item-main">
                <div :class="['format-badge format-badge-xl', `format-badge-${item.format.toLowerCase()}`]">
                  {{ item.format }}
                </div>
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
              v-for="(item, index) in doneItems" 
              :key="`${item.collection_id}-${item.format}`" 
              class="item-card item-done"
              :style="{ animationDelay: `${index * 0.05}s` }"
            >
              <div class="item-main">
                <div :class="['format-badge format-badge-xl', `format-badge-${item.format.toLowerCase()}`]">
                  {{ item.format }}
                </div>
                <div class="item-info">
                  <h3 class="item-name">{{ item.collection_nom }}</h3>
                  <p class="item-stock" v-if="item.quantite_stock > 0">
                    <strong>{{ item.quantite_stock }}</strong> en stock
                  </p>
                  <p class="item-stock item-stock-done" v-else>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Traité
                  </p>
                </div>
              </div>
              <button class="action-btn action-undo" @click="markAsTodo(item)" title="Remettre à traiter">
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
  max-width: 900px;
  margin: 0 auto;
  animation: fadeInUp 0.4s ease-out;
}

/* === Page Title === */
.page-title {
  font-family: var(--font-heading);
}

/* === Stats Summary === */
.stats-summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-5);
  margin-bottom: var(--spacing-6);
}

.summary-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-5) var(--spacing-6);
  background: var(--card);
  border-radius: var(--border-radius-2xl);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
  transition: all var(--transition-normal);
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
}

.summary-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--border-radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.summary-icon svg {
  width: 24px;
  height: 24px;
}

.summary-card-todo .summary-icon {
  background: var(--warning-light);
  color: var(--warning-dark);
}

.summary-card-done .summary-icon {
  background: var(--success-light);
  color: var(--success-dark);
}

.summary-content {
  display: flex;
  flex-direction: column;
}

.summary-value {
  font-family: var(--font-heading);
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--foreground);
  line-height: 1;
}

.summary-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-top: var(--spacing-1);
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
  padding: var(--spacing-4) var(--spacing-5);
  background: var(--card);
  border: 2px solid var(--border-light);
  border-radius: var(--border-radius-2xl);
  cursor: pointer;
  transition: all var(--transition-normal);
  font-family: var(--font-family);
}

.toggle-btn:hover {
  border-color: var(--border);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.toggle-btn.active {
  border-color: var(--primary);
  background: var(--primary-light);
  box-shadow: 0 0 0 4px rgba(93, 112, 82, 0.08);
}

.toggle-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--border-radius);
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-icon svg {
  width: 18px;
  height: 18px;
}

.toggle-icon-todo {
  background: var(--warning-light);
  color: var(--warning-dark);
}

.toggle-icon-done {
  background: var(--success-light);
  color: var(--success-dark);
}

.toggle-label {
  flex: 1;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--foreground);
  text-align: left;
}

.toggle-count {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--border-radius-full);
  min-width: 32px;
  text-align: center;
}

.toggle-count-todo {
  background: var(--warning-light);
  color: var(--warning-dark);
}

.toggle-count-done {
  background: var(--success-light);
  color: var(--success-dark);
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
  background: linear-gradient(135deg, var(--muted) 0%, var(--success-light) 100%);
  border-radius: var(--border-radius-2xl);
  border: 2px dashed var(--success);
}

.empty-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto var(--spacing-5);
  background: var(--success-light);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--success-dark);
}

.empty-icon svg {
  width: 36px;
  height: 36px;
}

.empty-tab h3 {
  font-family: var(--font-heading);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--success-dark);
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
  background: var(--card);
  border-radius: var(--border-radius-xl);
  border-left: 4px solid;
  box-shadow: var(--shadow-card);
  transition: all var(--transition-normal);
  animation: fadeInUp 0.4s ease-out backwards;
}

.item-card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

.item-todo {
  border-left-color: var(--warning);
}

.item-done {
  border-left-color: var(--success);
  opacity: 0.85;
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

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-family: var(--font-heading);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--foreground);
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
  color: var(--warning-dark);
  font-weight: var(--font-weight-bold);
}

.item-stock {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
}

.item-stock strong {
  color: var(--success-dark);
  font-weight: var(--font-weight-bold);
}

.item-stock-done {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  color: var(--success-dark);
}

.item-stock-done svg {
  width: 14px;
  height: 14px;
}

/* === Action Button === */
.action-btn {
  width: 52px;
  height: 52px;
  border: none;
  border-radius: var(--border-radius-xl);
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
  background: var(--success-light);
  color: var(--success-dark);
}

.action-done:hover {
  background: var(--success);
  color: var(--primary-foreground);
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(93, 112, 82, 0.25);
}

.action-undo {
  background: var(--muted);
  color: var(--text-secondary);
}

.action-undo:hover {
  background: var(--accent);
  color: var(--foreground);
  transform: scale(1.05);
}

/* === Responsive === */
@media (max-width: 640px) {
  .stats-summary {
    grid-template-columns: 1fr;
  }
  
  .state-toggle {
    grid-template-columns: 1fr;
  }
  
  .toggle-label {
    flex: 1;
  }
  
  .item-card {
    padding: var(--spacing-3) var(--spacing-4);
  }
  
  .action-btn {
    width: 44px;
    height: 44px;
  }
  
  .action-btn svg {
    width: 20px;
    height: 20px;
  }
}
</style>


