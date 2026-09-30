<template>
  <Layout class="stocks-layout">
    <div class="stocks-view">
      <header class="page-header">
        <div>
          <h1 class="page-title">Fournitures</h1>
          <p class="page-subtitle">Suivez chaque fourniture, de la commande jusqu’au traitement.</p>
        </div>
      </header>

      <div class="tabs" role="tablist" aria-label="Fournitures et bilan">
        <button id="fournitures-tab" class="tab-btn" :class="{ active: activeTab === 'fournitures' }" role="tab" :aria-selected="activeTab === 'fournitures'" aria-controls="fournitures-panel" @click="activeTab = 'fournitures'" @keydown.left.prevent="moveTabFocus($event, -1)" @keydown.right.prevent="moveTabFocus($event, 1)">Fournitures</button>
        <button id="bilan-tab" class="tab-btn" :class="{ active: activeTab === 'bilan' }" role="tab" :aria-selected="activeTab === 'bilan'" aria-controls="bilan-panel" @click="activeTab = 'bilan'" @keydown.left.prevent="moveTabFocus($event, -1)" @keydown.right.prevent="moveTabFocus($event, 1)">Bilan mensuel</button>
      </div>

      <section v-if="activeTab === 'fournitures'" id="fournitures-panel" role="tabpanel" aria-labelledby="fournitures-tab">
        <div class="workflow-toolbar">
          <p>Glissez une pile vers la colonne où tu veux la placer.</p>
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
              <span class="column-step" aria-hidden="true">{{ column.index + 1 }}</span>
              <h2 :id="`column-${column.index}`">{{ column.etat }}</h2>
              <span class="column-count" :aria-label="`${column.groupes.length} piles`">{{ column.groupes.length }}</span>
            </header>
            <div class="kanban-column-content">
              <article
                v-for="group in column.groupes"
                :key="fournitureGroupKey(group)"
                class="fourniture-card"
                :class="{ 'fourniture-card-dragging': draggedGroup === group }"
                draggable="true"
                @dragstart="startDrag($event, group)"
                @dragend="endDrag"
              >
                <div class="fourniture-card-heading">
                  <span class="fourniture-type">{{ fournitureTypeLabel(group.type) }}</span>
                  <span class="fourniture-quantity" :aria-label="`${group.quantite} unités`">×{{ group.quantite }}</span>
                </div>
                <h3>{{ group.nom }}</h3>
                <div v-if="group.etat === 'Traité'" class="fourniture-actions">
                  <button type="button" class="finish-button" :disabled="stocksStore.mutatingWorkflow" @click="archiveGroup = group">Terminer</button>
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
          <div class="month-picker">
            <span id="month-label" class="month-label">Mois</span>
            <button type="button" class="month-input" aria-labelledby="month-label month-value" :aria-expanded="monthPickerOpen" aria-controls="month-picker-panel" @click="monthPickerOpen = !monthPickerOpen">
              <span id="month-value">{{ formatMonth(selectedMois) }}</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            </button>
            <div v-if="monthPickerOpen" id="month-picker-panel" class="month-picker-panel" role="dialog" aria-label="Choisir un mois" @keydown.esc="monthPickerOpen = false">
              <div class="month-picker-year">
                <button type="button" aria-label="Année précédente" @click="pickerYear -= 1">‹</button>
                <strong>{{ pickerYear }}</strong>
                <button type="button" aria-label="Année suivante" @click="pickerYear += 1">›</button>
              </div>
              <div class="month-picker-months">
                <button v-for="month in pickerMonths" :key="month.value" type="button" :class="{ active: selectedMois === pickerYear + '-' + month.value }" @click="selectMonth(month.value)">{{ month.label }}</button>
              </div>
            </div>
          </div>
          <Button :loading="stocksStore.loadingBilan" @click="handleLoadBilan">Charger</Button>
        </div>
        <div v-if="stocksStore.loadingBilan" class="loading-state" role="status"><div class="loading-spinner"></div><span class="loading-state-text">Chargement du bilan…</span></div>
        <div v-else-if="stocksStore.bilanError" class="error-state" role="alert"><p>{{ stocksStore.bilanError }}</p></div>
        <div v-else-if="stocksStore.bilan" class="bilan-content">
          <div class="bilan-ca-card"><div class="bilan-ca-label">Chiffre d'affaires</div><div class="bilan-ca-value">{{ formatCurrency(stocksStore.bilan.chiffre_affaires_cents) }}</div><p>Commandes réglées du mois de création, aux prix enregistrés.</p></div>
          <section class="bilan-section">
            <h2 class="section-title"><span class="section-dot section-dot-green"></span>Répartition par méthode de paiement</h2>
            <div v-if="stocksStore.bilan.par_methode_paiement.length === 0" class="empty-section"><span>Aucune donnée de paiement</span></div>
            <div v-else class="stock-table-wrapper"><table class="stock-table"><thead><tr><th>Méthode</th><th class="col-number">Nb commandes</th><th class="col-number">Montant</th></tr></thead><tbody><tr v-for="item in stocksStore.bilan.par_methode_paiement" :key="item.methode_paiement"><td class="cell-name">{{ item.methode_paiement || 'Non renseigné' }}</td><td class="cell-number"><span class="badge-count">{{ item.nb_commandes }}</span></td><td class="cell-number">{{ formatCurrency(item.total_cents) }}</td></tr></tbody></table></div>
          </section>
          <section class="bilan-section">
            <h2 class="section-title"><span class="section-dot section-dot-amber"></span>Produits promotionnels</h2>
            <div v-if="!stocksStore.bilan.produits_promo?.length" class="empty-section"><span>Aucun produit promotionnel ce mois-ci</span></div>
            <div v-else class="promo-list"><div v-for="item in stocksStore.bilan.produits_promo" :key="JSON.stringify([item.texte, item.prix_cents])" class="promo-item"><div class="promo-info"><span class="promo-texte">{{ item.texte }}</span><span class="promo-price">{{ formatCurrency(item.prix_cents) }}</span></div><span class="promo-count">× {{ item.nb_fois }}</span></div></div>
          </section>
          <section class="bilan-section">
            <h2 class="section-title"><span class="section-dot section-dot-blue"></span>Autres articles</h2>
            <div v-if="stocksStore.bilan.autres.length === 0" class="empty-section"><span>Aucun autre article ce mois-ci</span></div>
            <div v-else class="promo-list"><div v-for="item in stocksStore.bilan.autres" :key="JSON.stringify([item.texte, item.prix_cents])" class="promo-item"><div class="promo-info"><span class="promo-texte">{{ item.texte }}</span><span class="promo-price">{{ formatCurrency(item.prix_cents) }}</span></div><span class="promo-count">× {{ item.nb_fois }}</span></div></div>
          </section>
          <p>Les suppléments ci-dessus détaillent les prix historiques. Ils sont déjà inclus dans le prix automatique ; après un prix manuel, leur somme ne reconstitue pas nécessairement le total payé.</p>
        </div>
        <div v-else class="empty-state">
          <div class="empty-state-icon"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></div>
          <h3 class="empty-state-title">Aucun bilan chargé</h3><p class="empty-state-description">Sélectionnez un mois et cliquez sur « Charger ».</p>
        </div>
      </section>
    </div>

    <Modal :is-open="Boolean(moveDialog)" title="Quantité à déplacer" max-width="460px" @close="closeMove">
      <form v-if="moveDialog" id="move-form" class="move-form" @submit.prevent="submitMove">
        <p><strong>{{ fournitureTypeLabel(moveDialog.group.type) }} · {{ moveDialog.group.nom }}</strong></p>
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
import { useStocksStore } from '../stores/stocks';
import { formatMoney } from '../utils/commande-kit';
import { fournitureGroupKey, fournitureTypeLabel, validMoveQuantity, workflowColumns } from '../utils/fournitures';

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
const monthPickerOpen = ref(false);
const pickerYear = ref(now.getFullYear());
const pickerMonths = [
  { value: '01', label: 'Jan.' }, { value: '02', label: 'Fév.' }, { value: '03', label: 'Mars' },
  { value: '04', label: 'Avr.' }, { value: '05', label: 'Mai' }, { value: '06', label: 'Juin' },
  { value: '07', label: 'Juil.' }, { value: '08', label: 'Août' }, { value: '09', label: 'Sept.' },
  { value: '10', label: 'Oct.' }, { value: '11', label: 'Nov.' }, { value: '12', label: 'Déc.' },
];
const moveQuantityError = computed(() => moveDialog.value ? !validMoveQuantity(moveDialog.value.quantite, moveDialog.value.group.quantite) : false);
const archiveMessage = computed(() => archiveGroup.value ? `Les ${archiveGroup.value.quantite} unité(s) de « ${archiveGroup.value.nom} » seront retirées durablement du tableau.` : '');

const refreshWorkflow = () => stocksStore.fetchWorkflow();
const showFeedback = (message) => window.dispatchEvent(new CustomEvent('toast', {
  detail: { message, type: 'success', duration: 5000 },
}));
const openMove = (group, target = '') => {
  mutationError.value = '';
  moveDialog.value = { group, target, quantite: group.quantite };
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
const selectMonth = (month) => {
  selectedMois.value = pickerYear.value + '-' + month;
  monthPickerOpen.value = false;
};
const formatMonth = (mois) => {
  const match = /^(\d{4})-(\d{2})$/.exec(mois || '');
  return match ? match[2] + '-' + match[1] : '';
};
const formatCurrency = (value) => {
  return value < 0 ? `-${formatMoney(-value)}` : formatMoney(value);
};

onMounted(refreshWorkflow);
</script>

<style scoped>
.stocks-layout :deep(.main-content) { min-width: 0; }
.stocks-view { max-width: var(--content-max-width); }
.page-title { font-family: var(--font-heading); }
.tabs { display: flex; gap: var(--spacing-2); margin-bottom: var(--spacing-6); border-bottom: 2px solid var(--border-light); }
.tab-btn { min-height: 44px; padding: var(--spacing-3) var(--spacing-5); margin-bottom: -2px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--text-secondary); font: inherit; font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); cursor: pointer; }
.tab-btn:hover { background: var(--muted); color: var(--foreground); }
.tab-btn.active { border-bottom-color: var(--primary); color: var(--primary); }
.tab-btn:focus-visible, .fourniture-card button:focus-visible, .move-form :is(select, input):focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }
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
.kanban { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); align-items: start; gap: var(--spacing-3); }
.kanban-column { min-width: 0; overflow: hidden; border: 1px solid var(--border); border-radius: var(--border-radius-xl); background: var(--bg-secondary); transition: border-color var(--transition-fast), background-color var(--transition-fast); }
.kanban-column-drop { border-color: var(--primary); background: var(--primary-light); }
.kanban-column-header { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: var(--spacing-2); min-height: 58px; padding: var(--spacing-3); border-bottom: 1px solid var(--border); background: var(--card); }
.kanban-column-header h2 { min-width: 0; overflow-wrap: anywhere; font-size: var(--font-size-sm); line-height: var(--line-height-tight); }
.column-step, .column-count { display: inline-grid; min-width: 26px; height: 26px; place-items: center; border-radius: var(--border-radius-full); font-size: var(--font-size-xs); font-weight: var(--font-weight-bold); font-variant-numeric: tabular-nums; }
.column-step { background: var(--primary); color: var(--primary-foreground); }
.column-count { background: var(--muted); color: var(--text-secondary); }
.kanban-column-content { display: grid; align-content: start; gap: var(--spacing-3); min-height: 180px; padding: var(--spacing-3); }
.fourniture-card { display: grid; gap: var(--spacing-3); min-width: 0; padding: var(--spacing-3); border: 1px solid var(--border-light); border-radius: var(--border-radius); background: var(--card); box-shadow: var(--shadow-sm); cursor: grab; transition: opacity var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast); }
.fourniture-card:hover { border-color: var(--border); box-shadow: var(--shadow-card-hover); }
.fourniture-card:active { cursor: grabbing; }
.fourniture-card-dragging { opacity: .45; }
.fourniture-card-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--spacing-2); }
.fourniture-type { color: var(--text-secondary); font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); line-height: var(--line-height-normal); }
.fourniture-quantity { flex: 0 0 auto; padding: 3px 8px; border-radius: var(--border-radius-full); background: var(--primary-light); color: var(--primary); font-size: var(--font-size-xs); font-weight: var(--font-weight-bold); font-variant-numeric: tabular-nums; }
.fourniture-card h3 { overflow-wrap: anywhere; font-size: var(--font-size-md); line-height: var(--line-height-normal); }
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
.bilan-toolbar { display: flex; align-items: end; gap: var(--spacing-4); margin-bottom: var(--spacing-6); }
.month-picker { position: relative; display: grid; gap: var(--spacing-2); }
.month-label { color: var(--text-secondary); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); }
.month-input { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-5); min-width: 146px; min-height: 44px; padding: var(--spacing-2) var(--spacing-4); border: 1px solid var(--border); border-radius: var(--border-radius); background: var(--card); color: var(--foreground); font: inherit; cursor: pointer; }
.month-input:hover, .month-input:focus-visible { border-color: var(--primary); }.month-input:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }.month-input svg { width: 18px; }
.month-picker-panel { position: absolute; z-index: var(--z-dropdown); top: calc(100% + var(--spacing-2)); left: 0; width: 286px; padding: var(--spacing-3); border: 1px solid var(--border); border-radius: var(--border-radius-xl); background: var(--card); box-shadow: var(--shadow-float); }
.month-picker-year { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-3); }.month-picker-year button { width: 36px; height: 36px; border: 0; border-radius: var(--border-radius-sm); background: var(--muted); color: var(--foreground); font-size: var(--font-size-xl); cursor: pointer; }.month-picker-year button:hover { background: var(--primary-light); color: var(--primary); }
.month-picker-months { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-2); }.month-picker-months button { min-height: 40px; border: 1px solid var(--border-light); border-radius: var(--border-radius-sm); background: var(--card); color: var(--foreground); font: inherit; cursor: pointer; }.month-picker-months button:hover, .month-picker-months button.active { border-color: var(--primary); background: var(--primary-light); color: var(--primary); font-weight: var(--font-weight-semibold); }
.bilan-content, .bilan-section { display: grid; gap: var(--spacing-4); }
.bilan-content { gap: var(--spacing-8); }
.bilan-ca-card { display: grid; gap: var(--spacing-2); padding: var(--spacing-6) var(--spacing-8); border-radius: var(--border-radius-2xl); background: linear-gradient(135deg, var(--primary), var(--success-dark)); color: var(--text-inverse); }
.bilan-ca-label { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); text-transform: uppercase; letter-spacing: var(--letter-spacing-wider); }
.bilan-ca-value { font-family: var(--font-heading); font-size: var(--font-size-4xl); font-weight: 800; }
.section-title { display: flex; align-items: center; gap: var(--spacing-3); font-size: var(--font-size-lg); }
.section-dot { width: 10px; height: 10px; border-radius: 50%; }
.section-dot-blue { background: var(--info); }.section-dot-amber { background: var(--secondary); }.section-dot-green { background: var(--success); }
.stock-table-wrapper { max-width: 100%; overflow-x: auto; border: 1px solid var(--border-light); border-radius: var(--border-radius-xl); background: var(--card); }
.stock-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
.stock-table th, .stock-table td { padding: var(--spacing-3) var(--spacing-5); border-bottom: 1px solid var(--border-light); text-align: left; }
.stock-table th { background: var(--muted); color: var(--text-tertiary); font-size: var(--font-size-xs); text-transform: uppercase; }
.stock-table .col-number, .stock-table .cell-number { text-align: right; font-variant-numeric: tabular-nums; }
.badge-count { display: inline-flex; padding: var(--spacing-1) var(--spacing-2); border-radius: var(--border-radius-full); background: var(--primary-light); color: var(--primary); font-weight: var(--font-weight-bold); }
.empty-section { padding: var(--spacing-5); border-radius: var(--border-radius-xl); background: var(--muted); color: var(--text-tertiary); }
.promo-list { display: grid; gap: var(--spacing-2); }
.promo-item { display: flex; justify-content: space-between; gap: var(--spacing-4); padding: var(--spacing-3) var(--spacing-5); border: 1px solid var(--border-light); border-radius: var(--border-radius-xl); background: var(--card); }
.promo-info { display: flex; min-width: 0; gap: var(--spacing-4); }.promo-texte { overflow-wrap: anywhere; font-weight: var(--font-weight-medium); }.promo-price { color: var(--text-secondary); }.promo-count { color: var(--primary); font-weight: var(--font-weight-bold); }
@media (max-width: 1100px) { .kanban { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) {
  .workflow-toolbar, .bilan-toolbar { align-items: stretch; flex-direction: column; }
  .kanban { grid-template-columns: 1fr; }
  .kanban-column-content { min-height: 120px; }
  .tabs { overflow-x: auto; }
  .tab-btn { flex: 1 0 auto; }
  .bilan-ca-card { padding: var(--spacing-5); }
  .bilan-ca-value { font-size: var(--font-size-3xl); }
}
@media (prefers-reduced-motion: reduce) { .kanban-column, .fourniture-card { transition: none; } }
</style>
