<template>
  <Layout class="stocks-layout" title="Fournitures" subtitle="Suivez chaque fourniture, de la commande jusqu’au traitement.">
    <div class="stocks-view">
      <div class="stocks-navigation">
      <div class="tabs" role="tablist" aria-label="Fournitures et bilan">
        <button id="fournitures-tab" class="tab-btn" :class="{ active: activeTab === 'fournitures' }" role="tab" :aria-selected="activeTab === 'fournitures'" aria-controls="fournitures-panel" @click="activeTab = 'fournitures'" @keydown.left.prevent="moveTabFocus($event, -1)" @keydown.right.prevent="moveTabFocus($event, 1)">Fournitures</button>
        <button id="bilan-tab" class="tab-btn" :class="{ active: activeTab === 'bilan' }" role="tab" :aria-selected="activeTab === 'bilan'" aria-controls="bilan-panel" @click="activeTab = 'bilan'" @keydown.left.prevent="moveTabFocus($event, -1)" @keydown.right.prevent="moveTabFocus($event, 1)">Bilan mensuel</button>
      </div>
      <span class="atelier-tag">Mon atelier</span>
      </div>

      <section v-if="activeTab === 'fournitures'" id="fournitures-panel" role="tabpanel" aria-labelledby="fournitures-tab">
        <div class="workflow-toolbar">
          <p>Glisse une pile vers une colonne, ou sélectionne-la pour la déplacer.</p>
          <Button variant="secondary" :loading="stocksStore.loadingWorkflow" :disabled="stocksStore.mutatingWorkflow" @click="refreshWorkflow">Actualiser</Button>
        </div>

        <div v-if="stocksStore.workflow?.alertes?.length" class="workflow-alerts" role="region" aria-labelledby="workflow-alerts-title">
          <div class="workflow-alerts-heading">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>
            <div><h2 id="workflow-alerts-title">Points d’attention</h2><p>Ces écarts proviennent de commandes modifiées ou supprimées.</p></div>
          </div>
          <ul>
            <li v-for="alert in stocksStore.workflow.alertes" :key="JSON.stringify([alert.type, alert.nom, alert.code])">
              <strong>{{ fournitureTypeLabel(alert.type) }} · {{ alert.nom }}</strong>
              <span>{{ alert.message }}<template v-if="alert.quantite > 1"> (×{{ alert.quantite }})</template></span>
            </li>
          </ul>
        </div>

        <div v-if="stocksStore.workflowError" class="error-state workflow-error" role="alert">
          <p>{{ stocksStore.workflowError }}</p>
          <Button v-if="!stocksStore.workflow" variant="secondary" @click="refreshWorkflow">Réessayer</Button>
        </div>
        <div v-if="stocksStore.loadingWorkflow && !stocksStore.workflow" class="loading-state" role="status">
          <div class="loading-spinner"></div><span class="loading-state-text">Chargement des fournitures…</span>
        </div>

        <div v-else-if="stocksStore.workflow" class="kanban" aria-label="Workflow des fournitures">
          <section
            v-for="column in columns"
            :key="column.etat"
            class="kanban-column"
            :class="{ 'kanban-column-drop': dragOverState === column.etat }"
            :aria-labelledby="`column-${column.index}`"
            @dragenter.prevent="dragOverState = column.etat"
            @dragover.prevent
            @dragleave.self="clearDragOver(column.etat)"
            @drop.prevent="dropOn(column.etat)"
          >
            <header class="kanban-column-header">
              <h2 :id="`column-${column.index}`">{{ column.etat }}</h2>
              <span class="column-count" :aria-label="`${column.groupes.length} piles`">{{ column.groupes.length }}</span>
            </header>
            <div class="kanban-column-content">
              <article
                v-for="group in column.groupes"
                :key="fournitureGroupKey(group)"
                class="fourniture-card atelier-glass"
                :class="{ 'fourniture-card-dragging': draggedGroup === group }"
                :role="group.etat === 'Traité' ? undefined : 'button'"
                :tabindex="group.etat === 'Traité' ? undefined : 0"
                draggable="true"
                @click="group.etat !== 'Traité' && openMove(group)"
                @keydown.enter.prevent="group.etat !== 'Traité' && openMove(group)"
                @keydown.space.prevent="group.etat !== 'Traité' && openMove(group)"
                @dragstart="startDrag($event, group)"
                @dragend="endDrag"
              >
                <div class="fourniture-card-heading">
                  <span class="fourniture-type">{{ fournitureTypeLabel(group.type) }}</span>
                  <span class="fourniture-quantity" :aria-label="`${group.quantite} unités`">×{{ group.quantite }}</span>
                </div>
                <h3>{{ group.nom }}</h3>
                <div v-if="group.etat === 'Traité'" class="fourniture-actions">
                  <button type="button" class="finish-button" :disabled="stocksStore.mutatingWorkflow" @click.stop="archiveGroup = group">Terminer</button>
                </div>
              </article>
              <div v-if="column.groupes.length === 0" class="column-empty">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14M12 5v14"/></svg>
                <span>Aucune fourniture</span>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section v-if="activeTab === 'bilan'" id="bilan-panel" role="tabpanel" aria-labelledby="bilan-tab">
        <div class="bilan-toolbar">
          <div class="bilan-period">
            <MonthPicker v-model="selectedMois" :disabled="stocksStore.loadingBilan" />
            <Button :loading="stocksStore.loadingBilan" @click="handleLoadBilan">Charger</Button>
          </div>
          <p>Commandes réglées, selon leur mois de création.</p>
        </div>
        <div v-if="stocksStore.loadingBilan" class="bilan-state loading-state" role="status"><div class="loading-spinner"></div><span class="loading-state-text">Chargement du bilan de {{ formatMonth(selectedMois) }}…</span></div>
        <div v-else-if="stocksStore.bilanError" class="bilan-state bilan-error" role="alert"><p>{{ stocksStore.bilanError }}</p><Button variant="secondary" @click="handleLoadBilan">Réessayer</Button></div>
        <div v-else-if="stocksStore.bilan" class="bilan-content">
          <section class="bilan-ca-card" aria-labelledby="bilan-month-title">
            <div><h2 id="bilan-month-title">Bilan de {{ formatMonth(stocksStore.bilan.mois) }}</h2><p>Aux prix enregistrés dans les commandes.</p></div>
            <div><div class="bilan-ca-label">Chiffre d'affaires</div><div class="bilan-ca-value">{{ formatCurrency(stocksStore.bilan.chiffre_affaires_cents) }}</div></div>
          </section>
          <section class="bilan-section" aria-labelledby="bilan-payment-title">
            <header class="bilan-section-heading"><h3 id="bilan-payment-title">Répartition par méthode de paiement</h3></header>
            <p v-if="stocksStore.bilan.par_methode_paiement.length === 0" class="empty-section">Aucune donnée de paiement</p>
            <div v-else class="stock-table-wrapper" tabindex="0" role="region" aria-labelledby="bilan-payment-title"><table class="stock-table"><thead><tr><th scope="col">Méthode</th><th scope="col" class="col-number">Commandes</th><th scope="col" class="col-number">Montant</th></tr></thead><tbody><tr v-for="item in stocksStore.bilan.par_methode_paiement" :key="item.methode_paiement"><th scope="row" class="cell-name">{{ item.methode_paiement || 'Non renseigné' }}</th><td class="cell-number">{{ item.nb_commandes }}</td><td class="cell-number">{{ formatCurrency(item.total_cents) }}</td></tr></tbody></table></div>
          </section>
          <div class="bilan-details">
            <section class="bilan-section" aria-labelledby="bilan-promo-title">
              <header class="bilan-section-heading"><h3 id="bilan-promo-title">Produits promotionnels</h3></header>
              <p v-if="!stocksStore.bilan.produits_promo?.length" class="empty-section">Aucun produit promotionnel ce mois-ci</p>
              <ul v-else class="promo-list"><li v-for="item in stocksStore.bilan.produits_promo" :key="JSON.stringify([item.texte, item.prix_cents])" class="promo-item"><div class="promo-info"><span class="promo-texte">{{ item.texte }}</span><span class="promo-price">{{ formatCurrency(item.prix_cents) }}</span></div><span class="promo-count"><span class="sr-only">Quantité : </span>× {{ item.nb_fois }}</span></li></ul>
            </section>
            <section class="bilan-section" aria-labelledby="bilan-other-title">
              <header class="bilan-section-heading"><h3 id="bilan-other-title">Autres articles</h3></header>
              <p v-if="stocksStore.bilan.autres.length === 0" class="empty-section">Aucun autre article ce mois-ci</p>
              <ul v-else class="promo-list"><li v-for="item in stocksStore.bilan.autres" :key="JSON.stringify([item.texte, item.prix_cents])" class="promo-item"><div class="promo-info"><span class="promo-texte">{{ item.texte }}</span><span class="promo-price">{{ formatCurrency(item.prix_cents) }}</span></div><span class="promo-count"><span class="sr-only">Quantité : </span>× {{ item.nb_fois }}</span></li></ul>
            </section>
          </div>
          <p class="bilan-note">Les suppléments ci-dessus détaillent les prix historiques. Ils sont déjà inclus dans le prix automatique ; après un prix manuel, leur somme ne reconstitue pas nécessairement le total payé.</p>
        </div>
        <div v-else class="bilan-state empty-state">
          <div class="empty-state-icon"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></div>
          <h3 class="empty-state-title">Aucun bilan chargé</h3><p class="empty-state-description">Sélectionne un mois et clique sur « Charger ».</p>
        </div>
      </section>
    </div>

    <Modal :is-open="Boolean(moveDialog)" title="Quantité à déplacer" max-width="460px" @close="closeMove">
      <form v-if="moveDialog" id="move-form" class="move-form" @submit.prevent="submitMove">
        <p><strong>{{ fournitureTypeLabel(moveDialog.group.type) }} · {{ moveDialog.group.nom }}</strong></p>
        <template v-if="!moveDialog.targetLocked"><label for="move-target">Déplacer vers</label><select id="move-target" v-model="moveDialog.target" :disabled="stocksStore.mutatingWorkflow"><option v-for="state in destinationStates" :key="state" :value="state">{{ state }}</option></select></template>
        <label for="move-quantity">Quantité à déplacer</label>
        <input id="move-quantity" v-model.number="moveDialog.quantite" type="number" inputmode="numeric" min="1" :max="moveDialog.group.quantite" :disabled="stocksStore.mutatingWorkflow" :aria-invalid="moveQuantityError" aria-describedby="move-quantity-help" />
        <p id="move-quantity-help" class="form-help">Entre 1 et {{ moveDialog.group.quantite }} unité(s).</p>
        <p v-if="moveQuantityError" class="form-error" role="alert">Choisis une quantité disponible.</p>
        <p v-else-if="mutationError" class="form-error" role="alert">{{ mutationError }}</p>
      </form>
      <template #footer><Button variant="secondary" :disabled="stocksStore.mutatingWorkflow" @click="closeMove">Annuler</Button><Button type="submit" form="move-form" :loading="stocksStore.mutatingWorkflow" :disabled="moveQuantityError">Déplacer</Button></template>
    </Modal>

    <ConfirmDialog :is-open="Boolean(archiveGroup)" :loading="stocksStore.mutatingWorkflow" title="Terminer cette pile ?" :message="archiveMessage" confirm-text="Terminer" variant="danger" @confirm="submitArchive" @cancel="archiveGroup = null" />
  </Layout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import Button from '../components/Button.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import Layout from '../components/Layout.vue';
import Modal from '../components/Modal.vue';
import MonthPicker from '../components/MonthPicker.vue';
import { formatBilanMonth } from '../utils/bilan';
import { useStocksStore } from '../stores/stocks';
import { formatMoney } from '../utils/commande-kit';
import { FOURNITURE_STATES, fournitureGroupKey, fournitureTypeLabel, validMoveQuantity, workflowColumns } from '../utils/fournitures';

const stocksStore = useStocksStore();
const activeTab = ref('fournitures');
const moveDialog = ref(null);
const archiveGroup = ref(null);
const draggedGroup = ref(null);
const dragOverState = ref('');
const mutationError = ref('');
const now = new Date();
const selectedMois = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

const columns = computed(() => workflowColumns(stocksStore.workflow?.groupes));
const destinationStates = computed(() => FOURNITURE_STATES.filter(state => state !== moveDialog.value?.group.etat));
const moveQuantityError = computed(() => moveDialog.value ? !validMoveQuantity(moveDialog.value.quantite, moveDialog.value.group.quantite) : false);
const archiveMessage = computed(() => archiveGroup.value ? `Les ${archiveGroup.value.quantite} unité(s) de « ${archiveGroup.value.nom} » seront retirées durablement du tableau.` : '');

const refreshWorkflow = () => stocksStore.fetchWorkflow();
const showFeedback = (message) => window.dispatchEvent(new CustomEvent('toast', {
  detail: { message, type: 'success', duration: 5000 },
}));
const openMove = (group, target = '') => {
  const destinations = FOURNITURE_STATES.filter(state => state !== group.etat);
  mutationError.value = '';
  moveDialog.value = { group, target: target || destinations[0], targetLocked: Boolean(target), quantite: group.quantite };
};
const closeMove = () => { if (!stocksStore.mutatingWorkflow) { moveDialog.value = null; mutationError.value = ''; } };
const submitMove = async () => {
  if (!moveDialog.value || moveQuantityError.value) return;
  const { group, target, quantite } = moveDialog.value;
  try {
    await stocksStore.moveWorkflowGroup({ type: group.type, nom: group.nom, etat_source: group.etat, etat_cible: target, quantite });
    showFeedback(`${quantite} unité(s) déplacée(s) vers « ${target} ».`);
    moveDialog.value = null;
  } catch { mutationError.value = stocksStore.workflowError; }
};
const submitArchive = async () => {
  if (!archiveGroup.value) return;
  const group = archiveGroup.value;
  try {
    await stocksStore.archiveWorkflowGroup({ type: group.type, nom: group.nom, quantite: group.quantite });
    showFeedback(`${group.quantite} unité(s) terminée(s) et retirée(s) du tableau.`);
    archiveGroup.value = null;
  } catch { archiveGroup.value = null; }
};
const startDrag = (event, group) => { draggedGroup.value = group; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', fournitureGroupKey(group)); };
const endDrag = () => { draggedGroup.value = null; dragOverState.value = ''; };
const clearDragOver = state => { if (dragOverState.value === state) dragOverState.value = ''; };
const dropOn = state => { const group = draggedGroup.value; endDrag(); if (group && group.etat !== state) openMove(group, state); };
const moveTabFocus = (event, direction) => {
  const tabs = [...event.currentTarget.parentElement.querySelectorAll('[role="tab"]')];
  const current = tabs.indexOf(event.currentTarget);
  tabs[(current + direction + tabs.length) % tabs.length]?.click();
  tabs[(current + direction + tabs.length) % tabs.length]?.focus();
};
const handleLoadBilan = () => stocksStore.fetchBilan(selectedMois.value);
const formatMonth = formatBilanMonth;
const formatCurrency = (value) => {
  return value < 0 ? `-${formatMoney(-value)}` : formatMoney(value);
};

onMounted(refreshWorkflow);
</script>

<style scoped>
.stocks-layout :deep(.main-content) { min-width: 0; }
.stocks-view { width: 100%; min-width: 0; }
.page-title { font-family: var(--font-heading); }
.stocks-navigation { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--spacing-3); margin-bottom: var(--spacing-4); }
.atelier-tag { padding: 6px 17px 7px 12px; background: var(--accent); color: var(--text-primary); font-weight: var(--font-weight-semibold); clip-path: polygon(0 0, 97% 3%, 100% 30%, 96% 64%, 98% 100%, 0 96%, 2% 48%); }
.tabs { display: flex; gap: 4px; padding: 4px; min-width: 0; border: 1px solid var(--border); border-radius: 10px; background: var(--card); }
.tab-btn { min-height: 44px; padding: 10px 16px; border: 0; border-radius: 6px; background: transparent; color: var(--text-primary); font: inherit; font-size: var(--font-size-base); font-weight: var(--font-weight-semibold); cursor: pointer; }
.tab-btn:hover { background: var(--surface-hover); }
.tab-btn.active { background: var(--primary); color: var(--primary-foreground); }
.tab-btn:focus-visible, .fourniture-card:focus-visible, .fourniture-card button:focus-visible, .move-form :is(select, input):focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }
.workflow-toolbar { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-4); margin-bottom: var(--spacing-5); }
.workflow-toolbar p { max-width: 70ch; color: var(--text-secondary); line-height: var(--line-height-relaxed); }
.workflow-alerts { display: grid; gap: var(--spacing-4); margin-bottom: var(--spacing-5); padding: var(--spacing-4); border: 1px solid var(--warning); border-radius: var(--border-radius-xl); background: var(--warning-light); }
.workflow-alerts-heading { display: flex; align-items: flex-start; gap: var(--spacing-3); }
.workflow-alerts-heading svg { width: 22px; flex: 0 0 22px; color: var(--warning-dark); }
.workflow-alerts h2 { margin: 0; font-size: var(--font-size-lg); }
.workflow-alerts p { color: var(--text-secondary); }
.workflow-alerts ul { display: grid; gap: var(--spacing-2); padding-left: var(--spacing-6); }
.workflow-alerts li span { display: block; color: var(--text-secondary); }
.workflow-error { margin-bottom: var(--spacing-4); }
.kanban { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); align-items: stretch; gap: var(--spacing-3); }
.kanban-column { min-width: 0; border-radius: var(--border-radius-lg); background: var(--card); box-shadow: var(--shadow-sm); transition: background-color var(--transition-fast); }
.kanban-column-drop { outline: 3px solid var(--primary); outline-offset: 2px; background: var(--primary-light); }
.kanban-column-header { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: var(--spacing-2); min-height: 48px; padding: var(--spacing-3); border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0; background: var(--atelier-header); color: var(--primary-foreground); }
.kanban-column-header h2 { min-width: 0; overflow-wrap: anywhere; font-size: var(--font-size-sm); line-height: var(--line-height-tight); }
.column-count { color: var(--atelier-counter); font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); font-variant-numeric: tabular-nums; }
.kanban-column-content { display: grid; align-content: start; gap: var(--spacing-3); min-height: 302px; padding: var(--spacing-3); }
.fourniture-card { display: grid; gap: var(--spacing-3); min-width: 0; padding: var(--spacing-3); border: 0; border-radius: var(--atelier-card-radius); cursor: grab; transition: opacity var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast); }
.fourniture-card:hover { box-shadow: 0 4px 12px rgb(108 75 96 / 13%), 0 1px 2px rgb(108 75 96 / 6%); }
.fourniture-card:active { cursor: grabbing; }
.fourniture-card-dragging { opacity: .45; }
.fourniture-card-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--spacing-2); }
.fourniture-type { color: var(--text-secondary); font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); line-height: var(--line-height-normal); }
.fourniture-quantity { flex: 0 0 auto; padding: 3px 8px; border-radius: var(--border-radius-sm); border: 1px solid var(--atelier-glass-edge); color: var(--primary); font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); font-variant-numeric: tabular-nums; }
.fourniture-card h3 { overflow-wrap: anywhere; font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); line-height: var(--line-height-normal); }
.fourniture-actions { display: grid; gap: var(--spacing-2); }
.fourniture-actions button { min-height: 44px; padding: var(--spacing-2) var(--spacing-3); border: 1px solid var(--border); border-radius: var(--border-radius-sm); background: var(--card); color: var(--text-primary); font: inherit; font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); cursor: pointer; }
.fourniture-actions button:hover { border-color: var(--primary); color: var(--primary); }
.fourniture-actions button:disabled { cursor: not-allowed; opacity: .55; }
.fourniture-actions .finish-button { border-color: var(--destructive); color: var(--destructive); }
.column-empty { display: grid; min-height: 130px; place-items: center; align-content: center; gap: var(--spacing-2); color: var(--text-tertiary); text-align: center; font-size: var(--font-size-sm); }
.column-empty svg { width: 26px; }
.move-form { display: grid; gap: var(--spacing-3); }
.move-form label { font-weight: var(--font-weight-semibold); }
.move-form :is(select, input) { width: 100%; min-height: 44px; padding: var(--spacing-2) var(--spacing-3); border: 1px solid var(--border); border-radius: var(--border-radius-sm); background: var(--card); color: var(--text-primary); font: inherit; }
.move-form input[aria-invalid="true"] { border-color: var(--error); }
.form-help { color: var(--text-secondary); font-size: var(--font-size-sm); }
.form-error { color: var(--error-dark); font-weight: var(--font-weight-medium); }
.bilan-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px 24px; padding: 20px; margin-bottom: 16px; border-radius: var(--border-radius-xl); background: var(--card); box-shadow: var(--shadow-sm); }
.bilan-period { display: flex; align-items: end; gap: 12px; min-width: 0; }
.bilan-toolbar p, .bilan-ca-card p { color: var(--text-secondary); font-size: var(--font-size-sm); }
.bilan-content { display: grid; gap: 16px; min-width: 0; }
.bilan-ca-card { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 20px 32px; padding: 24px; border-radius: var(--border-radius-xl); background: var(--card); box-shadow: var(--shadow-sm); min-width: 0; }
.bilan-ca-card h2 { margin-bottom: 8px; font-size: var(--font-size-xl); color: var(--primary); }
.bilan-ca-label { color: var(--text-secondary); font-size: var(--font-size-sm); }
.bilan-ca-value { font-family: var(--font-heading); font-size: clamp(28px, 3vw, 40px); line-height: 1.2; font-weight: var(--font-weight-bold); color: var(--primary); font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.bilan-details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: 16px; }
.bilan-section { min-width: 0; overflow: hidden; border-radius: var(--border-radius-xl); background: var(--card); box-shadow: var(--shadow-sm); }
.bilan-section-heading { padding: 20px; border-bottom: 1px solid var(--border-light); }
.bilan-section-heading h3 { font-size: var(--font-size-base); color: var(--primary); }
.stock-table-wrapper { max-width: 100%; overflow-x: auto; }
.stock-table-wrapper:focus-visible { outline: 2px solid var(--primary); outline-offset: -3px; }
.stock-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
.stock-table th, .stock-table td { padding: 12px 20px; text-align: left; }
.stock-table thead th { color: var(--text-secondary); font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); border-bottom: 1px solid var(--border-light); }
.stock-table tbody th { font-weight: var(--font-weight-medium); overflow-wrap: anywhere; }
.stock-table tbody tr + tr > * { border-top: 1px solid var(--border-light); }
.stock-table tbody tr:hover { background: var(--surface-hover); }
.stock-table .col-number, .stock-table .cell-number { text-align: right; font-variant-numeric: tabular-nums; }
.stock-table .cell-number { white-space: nowrap; }
.empty-section { padding: 20px; color: var(--text-secondary); font-size: var(--font-size-sm); }
.promo-list { list-style: none; padding: 0; margin: 0; }
.promo-item { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 20px; }
.promo-item + .promo-item { border-top: 1px solid var(--border-light); }
.promo-item:hover { background: var(--surface-hover); }
.promo-info { display: grid; min-width: 0; gap: 4px; }
.promo-texte { overflow-wrap: anywhere; font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); }
.promo-price { color: var(--text-secondary); font-size: var(--font-size-sm); overflow-wrap: anywhere; }
.promo-count { flex-shrink: 0; color: var(--primary); font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); font-variant-numeric: tabular-nums; }
.bilan-note { max-width: 90ch; color: var(--text-secondary); font-size: var(--font-size-sm); line-height: 1.6; }
.bilan-state { padding: 24px; border-radius: var(--border-radius-xl); background: var(--card); }
.bilan-error { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; padding: var(--feedback-padding); border-radius: var(--feedback-radius); background: var(--error-light); color: var(--error-dark); overflow-wrap: anywhere; }
@media (max-width: 900px) { .kanban { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) {
  .workflow-toolbar { align-items: stretch; flex-direction: column; }
  .kanban { grid-template-columns: 1fr; }
  .kanban-column-content { min-height: 120px; }
  .tabs { overflow-x: auto; }
  .tab-btn { flex: 1 0 auto; }
  .bilan-toolbar, .bilan-ca-card { padding: 16px; }
  .bilan-period { width: 100%; flex-wrap: wrap; }
  .bilan-period :deep(.month-picker) { flex: 1 1 170px; }
  .bilan-details { grid-template-columns: minmax(0, 1fr); }
  .stock-table th, .stock-table td { padding: 12px 10px; }
  .bilan-section-heading { padding: 16px; }
}
@media (prefers-reduced-motion: reduce) { .kanban-column, .fourniture-card { transition: none; } }
</style>
