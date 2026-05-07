<template>
  <Layout>
    <div class="stocks-view">
      <!-- Page Header -->
      <header class="page-header">
        <div>
          <h1 class="page-title">Stocks</h1>
          <p class="page-subtitle">Calcul et suivi des besoins fournisseur</p>
        </div>
      </header>

      <!-- Tabs -->
      <div class="tabs">
        <button
          :class="['tab-btn', { active: activeTab === 'stocks' }]"
          @click="activeTab = 'stocks'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          Stocks
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'bilan' }]"
          @click="activeTab = 'bilan'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Bilan mensuel
        </button>
      </div>

      <!-- ===== ONGLET STOCKS ===== -->
      <div v-if="activeTab === 'stocks'" class="tab-content">
        <!-- Toolbar -->
        <div class="stocks-toolbar">
          <Button @click="handleRecalculate" :loading="stocksStore.loading">
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"/>
                <polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </template>
            Actualiser
          </Button>
        </div>

        <div v-if="stocksStore.loading && !stocksStore.stocks" class="loading-state">
          <div class="loading-spinner"></div>
          <span class="loading-state-text">Chargement...</span>
        </div>

        <div v-else-if="stocksStore.error" class="error-state">
          <p>{{ stocksStore.error }}</p>
          <Button variant="secondary" @click="stocksStore.fetchStocks()">Réessayer</Button>
        </div>

        <div v-else-if="stocksStore.stocks" class="stocks-sections">

          <!-- Papiers cartonnés -->
          <section class="stock-section">
            <h2 class="section-title">
              <span class="section-dot section-dot-blue"></span>
              Papiers cartonnés
            </h2>
            <div v-if="!stocksStore.stocks.papiers_cartonnes || stocksStore.stocks.papiers_cartonnes.length === 0" class="empty-section">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>Aucun papier cartonné à commander</span>
            </div>
            <div v-else class="stock-table-wrapper">
              <table class="stock-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th class="col-number">Feuilles à commander</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in stocksStore.stocks.papiers_cartonnes" :key="item.nom">
                    <td class="cell-name">{{ item.nom }}</td>
                    <td class="cell-number">
                      <span class="badge-count">{{ item.nb_feuilles }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- Papier spécial -->
          <section class="stock-section">
            <h2 class="section-title">
              <span class="section-dot section-dot-purple"></span>
              Papier spécial
            </h2>
            <div v-if="!stocksStore.stocks.papier_spe || stocksStore.stocks.papier_spe.length === 0" class="empty-section">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>Aucun papier spécial à commander</span>
            </div>
            <div v-else class="stock-table-wrapper">
              <table class="stock-table">
                <thead>
                  <tr>
                    <th>Papier spécial</th>
                    <th class="col-number">Nb commandes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in stocksStore.stocks.papier_spe" :key="item.papier_spe">
                    <td class="cell-name">{{ item.papier_spe }}</td>
                    <td class="cell-number">
                      <span class="badge-count">{{ item.nb_commandes }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- Embellissement -->
          <section class="stock-section">
            <h2 class="section-title">
              <span class="section-dot section-dot-amber"></span>
              Embellissement
            </h2>
            <div v-if="!stocksStore.stocks.embellissement || stocksStore.stocks.embellissement.length === 0" class="empty-section">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>Aucun embellissement à commander</span>
            </div>
            <div v-else class="stock-table-wrapper">
              <table class="stock-table">
                <thead>
                  <tr>
                    <th>Embellissement</th>
                    <th class="col-number">Nb commandes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in stocksStore.stocks.embellissement" :key="item.embellissement">
                    <td class="cell-name">{{ item.embellissement }}</td>
                    <td class="cell-number">
                      <span class="badge-count">{{ item.nb_commandes }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- Collections -->
          <section class="stock-section">
            <h2 class="section-title">
              <span class="section-dot section-dot-green"></span>
              Collections
            </h2>
            <div v-if="!stocksStore.stocks.collections || stocksStore.stocks.collections.length === 0" class="empty-section">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>Aucune collection à commander</span>
            </div>
            <div v-else class="stock-table-wrapper">
              <table class="stock-table">
                <thead>
                  <tr>
                    <th>Collection</th>
                    <th>Catalogue</th>
                    <th class="col-number">Nb commandes</th>
                    <th class="col-number">Total feuilles</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in stocksStore.stocks.collections" :key="item.nom + item.catalogue_titre">
                    <td class="cell-name">{{ item.nom }}</td>
                    <td class="cell-secondary">{{ item.catalogue_titre }}</td>
                    <td class="cell-number">
                      <span class="badge-count">{{ item.nb_commandes }}</span>
                    </td>
                    <td class="cell-number">{{ item.total_feuilles }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

        </div>

        <div v-else class="empty-state">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
          </div>
          <h3 class="empty-state-title">Aucune donnée</h3>
          <p class="empty-state-description">Cliquez sur "Actualiser" pour calculer les stocks</p>
          <Button @click="handleRecalculate" :loading="stocksStore.loading">Actualiser</Button>
        </div>
      </div>

      <!-- ===== ONGLET BILAN MENSUEL ===== -->
      <div v-if="activeTab === 'bilan'" class="tab-content">
        <!-- Sélecteur de mois -->
        <div class="bilan-toolbar">
          <div class="month-picker">
            <label class="month-label" for="month-input">Mois</label>
            <input
              id="month-input"
              v-model="selectedMois"
              type="month"
              class="month-input"
            />
          </div>
          <Button @click="handleLoadBilan" :loading="stocksStore.loading">
            Charger
          </Button>
        </div>

        <div v-if="stocksStore.loading" class="loading-state">
          <div class="loading-spinner"></div>
          <span class="loading-state-text">Chargement du bilan...</span>
        </div>

        <div v-else-if="stocksStore.error" class="error-state">
          <p>{{ stocksStore.error }}</p>
        </div>

        <div v-else-if="stocksStore.bilan" class="bilan-content">

          <!-- CA total -->
          <div class="bilan-ca-card">
            <div class="bilan-ca-label">Chiffre d'affaires</div>
            <div class="bilan-ca-value">{{ formatCurrency(stocksStore.bilan.chiffre_affaires) }}</div>
          </div>

          <!-- Répartition par méthode de paiement -->
          <section class="bilan-section">
            <h2 class="section-title">
              <span class="section-dot section-dot-green"></span>
              Répartition par méthode de paiement
            </h2>
            <div v-if="!stocksStore.bilan.par_methode || stocksStore.bilan.par_methode.length === 0" class="empty-section">
              <span>Aucune donnée de paiement</span>
            </div>
            <div v-else class="stock-table-wrapper">
              <table class="stock-table">
                <thead>
                  <tr>
                    <th>Méthode</th>
                    <th class="col-number">Nb commandes</th>
                    <th class="col-number">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in stocksStore.bilan.par_methode" :key="item.methode_paiement">
                    <td class="cell-name">{{ item.methode_paiement || 'Non renseigné' }}</td>
                    <td class="cell-number">
                      <span class="badge-count">{{ item.nb_commandes }}</span>
                    </td>
                    <td class="cell-number">{{ formatCurrency(item.montant) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- Produits promo -->
          <section class="bilan-section">
            <h2 class="section-title">
              <span class="section-dot section-dot-amber"></span>
              Produits promotionnels
            </h2>
            <div v-if="!stocksStore.bilan.produits_promo || stocksStore.bilan.produits_promo.length === 0" class="empty-section">
              <span>Aucun produit promotionnel ce mois-ci</span>
            </div>
            <div v-else class="promo-list">
              <div
                v-for="item in stocksStore.bilan.produits_promo"
                :key="item.texte"
                class="promo-item"
              >
                <div class="promo-info">
                  <span class="promo-texte">{{ item.texte }}</span>
                  <span class="promo-price">{{ formatCurrency(item.prix) }}</span>
                </div>
                <span class="promo-count">× {{ item.nb_fois }}</span>
              </div>
            </div>
          </section>

          <!-- Autres articles -->
          <section class="bilan-section">
            <h2 class="section-title">
              <span class="section-dot section-dot-blue"></span>
              Autres articles
            </h2>
            <div v-if="!stocksStore.bilan.autres_articles || stocksStore.bilan.autres_articles.length === 0" class="empty-section">
              <span>Aucun autre article ce mois-ci</span>
            </div>
            <div v-else class="promo-list">
              <div
                v-for="item in stocksStore.bilan.autres_articles"
                :key="item.texte"
                class="promo-item"
              >
                <div class="promo-info">
                  <span class="promo-texte">{{ item.texte }}</span>
                  <span class="promo-price">{{ formatCurrency(item.prix) }}</span>
                </div>
                <span class="promo-count">× {{ item.nb_fois }}</span>
              </div>
            </div>
          </section>

        </div>

        <div v-else class="empty-state">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <h3 class="empty-state-title">Aucun bilan chargé</h3>
          <p class="empty-state-description">Sélectionnez un mois et cliquez sur "Charger"</p>
        </div>
      </div>

    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Layout from '../components/Layout.vue';
import Button from '../components/Button.vue';
import { useStocksStore } from '../stores/stocks';

const stocksStore = useStocksStore();

const activeTab = ref('stocks');

// Mois courant au format YYYY-MM
const now = new Date();
const selectedMois = ref(
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
);

const handleRecalculate = async () => {
  try {
    await stocksStore.recalculate();
  } catch (error) {
    console.error('Erreur recalcul:', error);
  }
};

const handleLoadBilan = async () => {
  await stocksStore.fetchBilan(selectedMois.value);
};

const formatCurrency = (value) => {
  if (value == null) return '—';
  return Number(value).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
};

onMounted(async () => {
  await stocksStore.fetchStocks();
});
</script>

<style scoped>
.stocks-view {
  max-width: var(--content-max-width);
  animation: fadeInUp 0.4s ease-out;
}

/* === Page Title === */
.page-title {
  font-family: var(--font-heading);
}

/* === Tabs === */
.tabs {
  display: flex;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-6);
  border-bottom: 2px solid var(--border-light);
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-5);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab-btn svg {
  width: 16px;
  height: 16px;
}

.tab-btn:hover {
  color: var(--foreground);
  background: var(--muted);
  border-radius: var(--border-radius) var(--border-radius) 0 0;
}

.tab-btn.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

/* === Tab Content === */
.tab-content {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* === Toolbars === */
.stocks-toolbar,
.bilan-toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-6);
}

.month-picker {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.month-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
}

.month-input {
  padding: var(--spacing-2) var(--spacing-4);
  border: 1.5px solid var(--border);
  border-radius: var(--border-radius);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  color: var(--foreground);
  background: var(--card);
  outline: none;
  transition: border-color var(--transition-fast);
}

.month-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(93, 112, 82, 0.1);
}

/* === Sections === */
.stocks-sections {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-8);
}

.stock-section,
.bilan-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  font-family: var(--font-heading);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--foreground);
  margin: 0;
}

.section-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.section-dot-blue   { background: var(--info); }
.section-dot-purple { background: #8b5cf6; }
.section-dot-amber  { background: var(--secondary); }
.section-dot-green  { background: var(--success); }

/* === Tables === */
.stock-table-wrapper {
  background: var(--card);
  border-radius: var(--border-radius-xl);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.stock-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.stock-table thead tr {
  background: var(--muted);
  border-bottom: 1px solid var(--border-light);
}

.stock-table th {
  padding: var(--spacing-3) var(--spacing-5);
  text-align: left;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wider);
}

.stock-table th.col-number {
  text-align: right;
}

.stock-table tbody tr {
  border-bottom: 1px solid var(--border-light);
  transition: background var(--transition-fast);
}

.stock-table tbody tr:last-child {
  border-bottom: none;
}

.stock-table tbody tr:hover {
  background: var(--muted);
}

.stock-table td {
  padding: var(--spacing-4) var(--spacing-5);
  color: var(--foreground);
}

.cell-name {
  font-weight: var(--font-weight-medium);
}

.cell-secondary {
  color: var(--text-secondary);
}

.cell-number {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.badge-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  padding: var(--spacing-1) var(--spacing-2);
  background: var(--primary-light);
  color: var(--primary);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

/* === Bilan CA === */
.bilan-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-8);
}

.bilan-ca-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  padding: var(--spacing-6) var(--spacing-8);
  background: linear-gradient(135deg, var(--primary) 0%, var(--success-dark) 100%);
  border-radius: var(--border-radius-2xl);
  box-shadow: 0 4px 20px rgba(93, 112, 82, 0.25);
}

.bilan-ca-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wider);
}

.bilan-ca-value {
  font-family: var(--font-heading);
  font-size: var(--font-size-4xl);
  font-weight: 800;
  color: white;
  line-height: 1;
}

/* === Promo List === */
.promo-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.promo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-3) var(--spacing-5);
  background: var(--card);
  border-radius: var(--border-radius-xl);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
  transition: all var(--transition-fast);
}

.promo-item:hover {
  border-color: var(--border);
  transform: translateX(2px);
}

.promo-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  min-width: 0;
}

.promo-texte {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.promo-price {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  flex-shrink: 0;
}

.promo-count {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--primary);
  flex-shrink: 0;
}

/* === Empty states === */
.empty-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-5) var(--spacing-6);
  background: var(--muted);
  border-radius: var(--border-radius-xl);
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
  font-style: italic;
}

.empty-section svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--success);
}

/* === Responsive === */
@media (max-width: 640px) {
  .bilan-ca-value {
    font-size: var(--font-size-3xl);
  }

  .stocks-toolbar,
  .bilan-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .month-picker {
    width: 100%;
    justify-content: space-between;
  }

  .month-input {
    flex: 1;
  }
}
</style>
