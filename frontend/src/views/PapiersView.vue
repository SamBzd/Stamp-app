<template>
  <Layout title="Papiers" subtitle="Ta bibliothèque, à réutiliser dans les collections de tes catalogues.">
    <div class="papers-view">
      <div class="papers-toolbar">
        <Button id="paper-create-toggle" :aria-expanded="createExpanded" :aria-controls="createExpanded ? 'paper-create-form' : undefined" :disabled="mutating" @click="toggleCreation">Nouveau papier</Button>
      </div>
      <section class="papers-panel" aria-labelledby="papers-heading">
        <header id="papers-heading" class="papers-heading" tabindex="-1">
          <h2>Bibliothèque</h2>
          <div class="papers-tools">
            <p role="status">{{ visiblePapers.length }} / {{ filteredCount }}<span class="sr-only"> papiers affichés</span></p>
            <button id="paper-filter-toggle" class="paper-filter-toggle" type="button" :aria-expanded="filtersExpanded" aria-controls="paper-filter-fields" :disabled="mutating" @click="toggleFilters">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
              Filtres <span v-if="activeFilterCount" class="paper-filter-count">{{ activeFilterCount }}</span>
              <svg class="paper-filter-chevron" :class="{ expanded: filtersExpanded }" aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m4 6 4 4 4-4"/></svg>
            </button>
          </div>
        </header>
        <form v-if="createExpanded" id="paper-create-form" class="paper-create-form" @submit.prevent="createPaper">
          <div class="paper-field">
            <label for="paper-name">Nom du nouveau papier</label>
            <input id="paper-name" v-model="newName" :disabled="mutating" autocomplete="off" placeholder="Ex. Kraft naturel" :aria-invalid="Boolean(error && errorScope === 'create')" :aria-describedby="error && errorScope === 'create' ? 'paper-name-hint paper-create-error' : 'paper-name-hint'" required />
            <p id="paper-name-hint">Les différences de majuscules et les espaces aux extrémités ne créent pas de doublon.</p>
            <p v-if="error && errorScope === 'create'" id="paper-create-error" class="paper-error" role="alert">{{ error }}</p>
          </div>
          <div class="paper-form-actions"><Button variant="secondary" :disabled="mutating" @click="toggleCreation">Annuler</Button><Button type="submit" :loading="creating" :disabled="mutating || loading || Boolean(loadError) || !newName.trim()">Créer le papier</Button></div>
        </form>
        <div v-show="filtersExpanded" id="paper-filter-fields" class="paper-filters" role="region" aria-label="Recherche et filtres des papiers">
          <div class="paper-field"><label for="paper-search">Rechercher un papier</label><input id="paper-search" :value="search" @input="changeSearch" :disabled="mutating" type="search" placeholder="Nom du papier…" autocomplete="off" /></div>
          <div class="paper-field"><label for="paper-filter">Afficher</label><select id="paper-filter" :value="filter" @change="changeFilter" :disabled="mutating"><option value="actifs">Papiers actifs</option><option value="archives">Papiers archivés</option></select></div>
          <button v-if="activeFilterCount" class="paper-reset" type="button" :disabled="mutating" @click="resetFilters">Effacer les filtres</button>
        </div>
        <p v-if="error && errorScope === 'archive'" class="paper-message paper-error" role="alert">{{ error }}</p>
        <p v-if="notice" class="paper-message paper-notice" role="status">{{ notice }}</p>
        <p v-if="loading" class="papers-state" role="status">Chargement de la bibliothèque…</p>
        <div v-else-if="loadError" class="papers-state" role="alert"><p class="paper-error">{{ loadError }}</p><Button variant="secondary" @click="loadPapers">Réessayer</Button></div>
        <div v-else-if="!visiblePapers.length" class="papers-state papers-empty">
          <h3>{{ search.trim() ? 'Aucun papier trouvé' : filter === 'archives' ? 'Aucun papier archivé' : 'Ta bibliothèque commence ici' }}</h3>
          <p>{{ search.trim() ? 'Essaie un autre nom ou efface les filtres.' : filter === 'archives' ? 'Les papiers archivés restent disponibles ici pour être renommés ou restaurés.' : 'Crée un papier pour le retrouver dans les collections de tes catalogues.' }}</p>
          <button v-if="activeFilterCount" class="paper-reset" type="button" :disabled="mutating" @click="resetFilters">Effacer les filtres</button>
          <Button v-else-if="!createExpanded" @click="toggleCreation">Créer un papier</Button>
        </div>
        <ul v-else class="papers-list" aria-label="Papiers de la bibliothèque">
          <li v-for="paper in visiblePapers" :key="paper.id" class="paper-row" :class="{ 'paper-editing': editingId === paper.id }">
            <form v-if="editingId === paper.id" class="paper-rename-form" @submit.prevent="renamePaper(paper)">
              <div class="paper-field"><label :for="`paper-${paper.id}-name`">Renommer « {{ paper.nom }} »</label><input :id="`paper-${paper.id}-name`" v-model="editedName" :disabled="mutating" :aria-invalid="Boolean(error && errorScope === 'rename')" :aria-describedby="error && errorScope === 'rename' ? `paper-${paper.id}-error` : undefined" autocomplete="off" required @keydown.esc.prevent="cancelRenameWithFocus(paper.id)" /><p v-if="error && errorScope === 'rename'" :id="`paper-${paper.id}-error`" class="paper-error" role="alert">{{ error }}</p></div>
              <div class="paper-form-actions"><Button variant="secondary" :disabled="mutating" @click="cancelRenameWithFocus(paper.id)">Annuler</Button><Button type="submit" :loading="busyId === paper.id" :disabled="mutating || !editedName.trim() || editedName.trim() === paper.nom">Enregistrer</Button></div>
            </form>
            <template v-else>
              <div class="paper-summary"><h3>{{ paper.nom }}</h3><span v-if="paper.archive" class="paper-status">Archivé</span></div>
              <div class="paper-actions">
                <button :id="`paper-rename-${paper.id}`" class="paper-action" type="button" :aria-label="`Renommer ${paper.nom}`" :disabled="mutating" @click="startRename(paper)">Renommer</button>
                <button v-if="paper.archive" :id="`paper-archive-${paper.id}`" class="paper-action" type="button" :aria-label="`Restaurer ${paper.nom}`" :disabled="mutating" @click="restorePaper(paper)">{{ busyId === paper.id ? 'Restauration…' : 'Restaurer' }}</button>
                <button v-else :id="`paper-archive-${paper.id}`" class="paper-action paper-archive" type="button" :aria-label="`Archiver ${paper.nom}`" :disabled="mutating" @click="requestArchive(paper)">Archiver</button>
              </div>
            </template>
          </li>
        </ul>
      </section>
    </div>
    <ConfirmDialog :is-open="Boolean(paperToArchive)" title="Archiver ce papier ?" :message="paperToArchive ? `« ${paperToArchive.nom} » ne sera plus proposé dans les nouvelles sélections. Il restera visible dans les collections existantes et les commandes passées.` : ''" confirm-text="Archiver" variant="danger" :loading="busyId === paperToArchive?.id" @confirm="archivePaper" @cancel="paperToArchive = null" />
  </Layout>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import Layout from '../components/Layout.vue';
import Button from '../components/Button.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import { papierCartonnesAPI } from '../services/api';

const papers = ref([]), loading = ref(false), creating = ref(false), busyId = ref(null);
const error = ref(''), notice = ref(''), loadError = ref('');
const errorScope = ref('');
const newName = ref(''), search = ref(''), filter = ref('actifs');
const editingId = ref(null), editedName = ref(''), paperToArchive = ref(null);
const createExpanded = ref(false), filtersExpanded = ref(false);
const mutating = computed(() => creating.value || busyId.value !== null);
const normalizeName = value => value.trim().normalize('NFC').toLocaleLowerCase('fr');
const matches = (paper, needle = search.value, state = filter.value) => Boolean(paper.archive) === (state === 'archives') && normalizeName(paper.nom).includes(normalizeName(needle));
const visiblePapers = computed(() => papers.value.filter(paper => matches(paper)));
const filteredCount = computed(() => papers.value.filter(paper => Boolean(paper.archive) === (filter.value === 'archives')).length);
const activeFilterCount = computed(() => Number(Boolean(search.value.trim())) + Number(filter.value === 'archives'));
const renameDirty = computed(() => editingId.value !== null && editedName.value !== papers.value.find(paper => paper.id === editingId.value)?.nom);
const dirty = computed(() => renameDirty.value || (createExpanded.value && Boolean(newName.value.trim())));
const focus = async id => {
  await nextTick();
  const element = document.getElementById(id) || document.getElementById('papers-heading');
  element?.focus();
  element?.scrollIntoView({ block: 'nearest' });
};
function beginAction() { error.value = ''; errorScope.value = ''; notice.value = ''; }
function sortPapers() { papers.value.sort((a, b) => a.nom.localeCompare(b.nom, 'fr')); }
function replacePaper(updated) { papers.value = papers.value.map(paper => paper.id === updated.id ? updated : paper); sortPapers(); }
function cancelRename() { editingId.value = null; editedName.value = ''; }
function discardRename() {
  if (mutating.value || (renameDirty.value && !window.confirm('Abandonner le nom non enregistré ?'))) return false;
  cancelRename(); return true;
}
function cancelRenameWithFocus(id) { if (discardRename()) void focus(`paper-rename-${id}`); }
function discardCreation() {
  if (mutating.value || (createExpanded.value && newName.value.trim() && !window.confirm('Abandonner le nouveau papier non enregistré ?'))) return false;
  createExpanded.value = false; newName.value = ''; return true;
}
async function toggleCreation() {
  if (mutating.value) return;
  if (createExpanded.value) { if (discardCreation()) await focus('paper-create-toggle'); }
  else if (discardRename()) { beginAction(); createExpanded.value = true; await focus('paper-name'); }
}
async function toggleFilters() {
  if (mutating.value) return;
  filtersExpanded.value = !filtersExpanded.value;
  await focus(filtersExpanded.value ? 'paper-search' : 'paper-filter-toggle');
}
function allowFilters(needle, state) {
  const edited = papers.value.find(paper => paper.id === editingId.value);
  return !mutating.value && (!edited || matches(edited, needle, state) || discardRename());
}
function changeSearch(event) {
  if (allowFilters(event.target.value, filter.value)) search.value = event.target.value;
  else event.target.value = search.value;
}
function changeFilter(event) {
  if (allowFilters(search.value, event.target.value)) filter.value = event.target.value;
  else event.target.value = filter.value;
}
async function resetFilters() {
  if (!allowFilters('', 'actifs')) return;
  search.value = ''; filter.value = 'actifs';
  await focus(filtersExpanded.value ? 'paper-search' : 'paper-filter-toggle');
}
async function loadPapers() {
  if (loading.value || mutating.value) return;
  loading.value = true; loadError.value = '';
  try { papers.value = await papierCartonnesAPI.search('', { includeArchives: true }); sortPapers(); }
  catch (failure) { loadError.value = failure.message; }
  finally { loading.value = false; }
}
async function createPaper() {
  if (!newName.value.trim() || mutating.value || loading.value || loadError.value) return;
  creating.value = true; beginAction();
  let focusTarget = 'paper-name';
  try {
    const created = await papierCartonnesAPI.create(newName.value.trim());
    papers.value.push(created); sortPapers();
    notice.value = `« ${created.nom} » a été ajouté à la bibliothèque.`;
    newName.value = ''; createExpanded.value = false; filter.value = 'actifs'; search.value = '';
    focusTarget = `paper-rename-${created.id}`;
  } catch (failure) { error.value = failure.message; errorScope.value = 'create'; }
  finally { creating.value = false; }
  await focus(focusTarget);
}
async function startRename(paper) {
  if (mutating.value || !discardCreation() || !discardRename()) return;
  editingId.value = paper.id; editedName.value = paper.nom; beginAction();
  await focus(`paper-${paper.id}-name`);
}
async function renamePaper(paper) {
  if (!editedName.value.trim() || mutating.value) return;
  busyId.value = paper.id; beginAction();
  try {
    const updated = await papierCartonnesAPI.update(paper.id, editedName.value.trim());
    replacePaper(updated);
    notice.value = `« ${updated.nom} » a été renommé. Les commandes passées conservent leur ancien libellé.`;
    cancelRename();
  } catch (failure) { error.value = failure.message; errorScope.value = 'rename'; }
  finally { busyId.value = null; }
  await focus(editingId.value !== null ? `paper-${paper.id}-name` : `paper-rename-${paper.id}`);
}
async function requestArchive(paper) {
  if (mutating.value || !discardCreation() || !discardRename()) return;
  paperToArchive.value = paper;
}
async function setArchive(paper, archive) {
  if (mutating.value) return;
  busyId.value = paper.id; beginAction();
  try {
    replacePaper(await papierCartonnesAPI.setArchive(paper.id, archive));
    notice.value = archive ? `« ${paper.nom} » a été archivé.` : `« ${paper.nom} » est de nouveau disponible.`;
    filter.value = archive ? 'archives' : 'actifs';
  } catch (failure) { error.value = failure.message; errorScope.value = 'archive'; }
  finally { busyId.value = null; paperToArchive.value = null; }
  await focus(`paper-archive-${paper.id}`);
}
const archivePaper = () => paperToArchive.value && setArchive(paperToArchive.value, true);
async function restorePaper(paper) { if (discardCreation() && discardRename()) await setArchive(paper, false); }
onBeforeRouteLeave(() => !mutating.value && (!dirty.value || window.confirm('Quitter la bibliothèque et abandonner la saisie non enregistrée ?')));
const warnBeforeUnload = event => { event.preventDefault(); event.returnValue = ''; };
watch([dirty, mutating], ([hasChanges, isBusy]) => {
  if (hasChanges || isBusy) window.addEventListener('beforeunload', warnBeforeUnload);
  else window.removeEventListener('beforeunload', warnBeforeUnload);
});
onBeforeUnmount(() => window.removeEventListener('beforeunload', warnBeforeUnload));
onMounted(loadPapers);
</script>

<style scoped>
.papers-view { min-width: 0; width: 100%; }
.papers-toolbar { display: flex; justify-content: flex-end; margin-bottom: 14px; }
.papers-panel { background: var(--card); border-radius: 12px; overflow: hidden; box-shadow: var(--shadow-sm); }
.papers-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px 16px; padding: 6px 18px; min-height: 56px; border-bottom: 1px solid var(--border-light); }
.papers-heading h2 { color: var(--primary); font-size: var(--font-size-base); font-weight: var(--font-weight-semibold); }
.papers-tools { display: flex; align-items: center; gap: 12px; }
.papers-tools > p { color: var(--text-secondary); font-size: var(--font-size-xs); font-variant-numeric: tabular-nums; }
.paper-filter-toggle { display: inline-flex; align-items: center; gap: 6px; padding: 8px; min-height: 44px; background: transparent; border: 0; border-radius: 6px; color: var(--text-secondary); font: inherit; font-size: var(--font-size-xs); cursor: pointer; }
.paper-filter-toggle:hover, .paper-filter-toggle[aria-expanded="true"] { background: var(--primary-light); color: var(--primary); }
.paper-filter-toggle svg { width: 17px; height: 17px; }
.paper-filter-toggle .paper-filter-chevron { width: 12px; height: 12px; }
.paper-filter-chevron.expanded { transform: rotate(180deg); }
.paper-filter-count { padding: 1px 4px; min-width: 17px; border-radius: 4px; background: var(--primary); color: var(--primary-foreground); text-align: center; }
.paper-create-form, .paper-filters, .paper-rename-form { display: flex; align-items: flex-end; flex-wrap: wrap; gap: 12px; }
.paper-create-form, .paper-filters { padding: 18px; border-bottom: 1px solid var(--border-light); }
.paper-create-form { background: var(--primary-light); }
.paper-field { display: grid; gap: 6px; flex: 1 1 240px; min-width: 0; }
.paper-field label { color: var(--primary); font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); overflow-wrap: anywhere; }
.paper-field input, .paper-field select { width: 100%; min-width: 0; min-height: 44px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--card); color: var(--text-primary); font: inherit; font-size: var(--font-size-sm); }
.paper-field > p { font-size: var(--font-size-xs); color: var(--text-secondary); }
.paper-field > p.paper-error { color: var(--error-dark); }
.paper-form-actions, .paper-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.paper-reset { padding: 8px 0; min-height: 44px; border: 0; background: transparent; color: var(--primary); font: inherit; font-size: var(--font-size-xs); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.paper-message { margin: 14px 18px; padding: 12px; border-radius: 6px; font-size: var(--font-size-sm); overflow-wrap: anywhere; }
.paper-error { color: var(--error-dark); }
.paper-message.paper-error { background: var(--error-light); }
.paper-notice { background: var(--success-light); color: var(--success-dark); }
.papers-state { display: grid; justify-items: start; gap: 12px; padding: 24px 18px; }
.papers-empty { justify-items: center; text-align: center; padding-block: 40px; }
.papers-state h3 { color: var(--primary); font-size: var(--font-size-lg); }
.papers-state p { color: var(--text-secondary); font-size: var(--font-size-sm); }
.papers-state p.paper-error { color: var(--error-dark); }
.papers-list { list-style: none; padding: 0; margin: 0; }
.paper-row { display: flex; align-items: center; justify-content: space-between; gap: 12px 24px; min-height: 64px; padding: 10px 18px; }
.paper-row + .paper-row { border-top: 1px solid var(--border-light); }
.paper-row:hover { background: var(--surface-hover); }
.paper-row.paper-editing { background: var(--surface-selected); }
.paper-summary { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px 12px; min-width: 0; }
.paper-summary h3 { overflow-wrap: anywhere; font-size: var(--font-size-base); font-weight: 600; color: var(--primary); }
.paper-status { font-size: var(--font-size-xs); color: var(--text-secondary); }
.paper-action { min-height: 44px; padding: 8px; border: 0; border-radius: 6px; background: transparent; color: var(--primary); font: inherit; font-size: var(--font-size-xs); cursor: pointer; }
.paper-action:hover { background: var(--card); }
.paper-action.paper-archive { color: var(--text-secondary); }
.paper-actions { flex-shrink: 0; }
.paper-rename-form { width: 100%; }
button:disabled { opacity: .55; cursor: not-allowed; }
input, select, button, #papers-heading { scroll-margin-block: 12px var(--dock-clearance, 120px); }
@media (max-width: 600px) {
  .papers-heading, .paper-create-form, .paper-filters { padding-inline: 12px; }
  .papers-tools { gap: 6px; }
  .paper-row { flex-wrap: wrap; padding-inline: 16px; gap: 4px 12px; }
  .paper-summary { flex-basis: 100%; }
  .paper-actions { width: 100%; justify-content: flex-end; }
  .paper-form-actions { width: 100%; justify-content: flex-end; }
}
</style>
