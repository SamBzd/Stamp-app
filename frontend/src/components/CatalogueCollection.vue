<template>
  <article class="catalogue-collection">
    <h3 v-if="readOnly">{{ collection.nom }}</h3>
    <button v-else v-show="!nameEditing" :id="`${uid}-name-button`" ref="nameButton" type="button" class="collection-name-title" :disabled="disabled" :aria-label="`Modifier le nom de ${collection.nom}`" @click="editName">{{ collection.nom }}<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m15 5 4 4M4 20l4-1 12-12-4-4L5 14z"/></svg></button>
    <form v-show="nameEditing" class="catalogue-inline-form" @submit.prevent="requestRename">
      <label :for="`${uid}-name`">Nom de la collection<input :id="`${uid}-name`" ref="nameInput" v-model="name" :disabled="disabled" :aria-invalid="Boolean(nameError)" :aria-describedby="nameError ? `${uid}-name-error` : undefined" @blur="requestRename" required /></label>
    </form>
    <p v-if="nameError" :id="`${uid}-name-error`" class="catalogue-error" role="alert">{{ nameError }}</p>
    <div class="catalogue-paper-cards">
      <button v-for="slot in 5" :key="slot" :id="`${uid}-paper-${slot - 1}`" type="button" class="catalogue-paper-card" :class="{ empty: !displayedPapers[slot - 1] }" :disabled="disabled || readOnly" :aria-label="displayedPapers[slot - 1] ? `Changer ${displayedPapers[slot - 1].nom}` : `Ajouter un papier à ${collection.nom}`" @click="openPicker(slot - 1)">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path v-if="displayedPapers[slot - 1]" d="M7 3h10l3 3v15H7zM17 3v4h3M4 6v15"/><path v-else d="M12 5v14M5 12h14"/></svg>
        <span>{{ displayedPapers[slot - 1]?.nom || (readOnly ? '—' : 'Ajouter un papier') }}{{ displayedPapers[slot - 1]?.archive ? ' — archivé' : '' }}</span>
      </button>
    </div>
    <div v-if="pickerOpen" class="catalogue-paper-editor">
      <div class="catalogue-section-heading"><h4>Bibliothèque de papiers</h4><Button variant="secondary" size="sm" :disabled="disabled" @click="closePicker">Fermer</Button></div>

      <label :for="`${uid}-search`">Bibliothèque de papiers<input :id="`${uid}-search`" ref="searchInput" v-model="query" type="search" autocomplete="off" placeholder="Ex. Kraft naturel" :disabled="disabled" /></label>
      <p class="sr-only" role="status" aria-live="polite">{{ selectionNotice }}</p>
      <p v-if="searching" role="status">Recherche…</p>
      <p v-if="searchError" class="catalogue-error" role="alert">{{ searchError }}</p>
      <div class="catalogue-search-results">
        <button v-for="paper in availableResults" :key="paper.id" type="button" :disabled="disabled || creating" @click="choose(paper)">{{ selected[pickerSlot]?.id === paper.id ? 'Garder ce papier' : `Ajouter ${paper.nom}` }}</button>
        <p v-if="query.trim() && exactMatch && selected.some((item, index) => item.id === exactMatch.id && index !== pickerSlot)" class="catalogue-hint">« {{ exactMatch.nom }} » est déjà sélectionné.</p>
        <button v-if="query.trim() && !exactMatch" type="button" :disabled="disabled || searching || creating || Boolean(searchError)" @click="createPaper">{{ creating ? 'Création…' : `Créer « ${query.trim()} » dans la bibliothèque` }}</button>
        <p v-if="!searching && query.trim() && !availableResults.length && exactMatch && !selected.some((item, index) => item.id === exactMatch.id && index !== pickerSlot)" class="catalogue-hint">Ce papier est disponible ci-dessus.</p>
      </div>
      <Button v-if="selected[pickerSlot]" variant="secondary" size="sm" :disabled="disabled" @click="removePaper">Retirer ce papier</Button>
    </div>
    <div v-if="papersDirty && !readOnly" class="catalogue-actions"><Button variant="secondary" size="sm" :disabled="disabled || creating" @click="cancelEdit">Annuler</Button><Button size="sm" :disabled="disabled || creating" @click="savePapers">Enregistrer les papiers</Button></div>
    <p v-if="localError" class="catalogue-error" role="alert">{{ localError }}</p>
  </article>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
import Button from './Button.vue';
import { cataloguesAPI, papierCartonnesAPI } from '../services/api';
import { useBlurSave } from '../composables/useBlurSave';
import { usePaperSearch } from '../composables/usePaperSearch';
const props = defineProps({ collection: { type: Object, required: true }, mutate: { type: Function, required: true }, disabled: Boolean, readOnly: Boolean });
const emit = defineEmits(['dirty', 'busy', 'count']);
const uid = useId();
const name = ref(props.collection.nom);
const nameError = ref('');
const editing = ref(false);
const nameEditing = ref(false);
const nameInput = ref(null);
const nameButton = ref(null);
const pickerOpen = ref(false);
const pickerSlot = ref(0);
const selected = ref([]);
const displayedPapers = computed(() => editing.value ? selected.value : props.collection.papiers);
watch(() => displayedPapers.value.length, value => emit('count', value), { immediate: true });
const creating = ref(false);
const localError = ref('');
const searchInput = ref(null);
const selectionNotice = ref('');
const paperSearch = usePaperSearch(value => papierCartonnesAPI.search(value));
const { query, results, searching, error: searchError } = paperSearch;
const normalizeName = value => value.trim().normalize('NFC').toLocaleLowerCase('fr');
const exactMatch = computed(() => results.value.find(paper => normalizeName(paper.nom) === normalizeName(query.value)));
const availableResults = computed(() => results.value.filter(paper => !selected.value.some((item, index) => item.id === paper.id && index !== pickerSlot.value)));
const papersDirty = computed(() => editing.value && (selected.value.length !== props.collection.papiers.length || selected.value.some((paper, index) => paper.id !== props.collection.papiers[index]?.id)));
const dirty = computed(() => name.value !== props.collection.nom || papersDirty.value);
watch(dirty, value => emit('dirty', value));
watch(creating, value => emit('busy', value));
const { requestSave: requestRename } = useBlurSave(() => props.disabled, rename);
async function rename(event) {
  nameError.value = '';
  const trimmed = name.value.trim();
  if (trimmed === props.collection.nom) { name.value = trimmed; nameEditing.value = false; await nextTick(); if (event?.type === 'submit') nameButton.value?.focus(); return; }
  if (!trimmed) { nameError.value = 'Renseignez le nom de la collection.'; return; }
  const restoreSearchFocus = editing.value && document.activeElement === searchInput.value;
  if (await props.mutate(() => cataloguesAPI.updateCollection(props.collection.id, trimmed), 'Collection renommée.')) {
    name.value = props.collection.nom;
    nameEditing.value = false;
    await nextTick();
    if (event?.type === 'submit' && document.activeElement === document.body && nameButton.value?.getClientRects().length) nameButton.value.focus();
    const input = searchInput.value;
    // Restore only focus lost by disabling this search; never reclaim focus
    // from another control or from a different (now visible) step.
    if (restoreSearchFocus && editing.value && document.activeElement === document.body
      && input?.isConnected && !input.disabled && input.getClientRects().length) input.focus();
  }
}
onBeforeUnmount(paperSearch.stop);
async function editName() { if (props.disabled || props.readOnly) return; nameEditing.value = true; await nextTick(); nameInput.value?.focus(); }
function startEdit() { if (!editing.value) { selected.value = [...props.collection.papiers]; editing.value = true; } }
async function openPicker(slot) {
  if (props.disabled || props.readOnly) return;
  startEdit(); pickerSlot.value = Math.min(slot, selected.value.length); pickerOpen.value = true;
  paperSearch.reset(); localError.value = ''; await nextTick(); searchInput.value?.focus();
}
async function closePicker() { pickerOpen.value = false; if (!papersDirty.value) editing.value = false; paperSearch.reset(); await nextTick(); document.getElementById(`${uid}-paper-${Math.min(pickerSlot.value, 4)}`)?.focus(); }
function cancelEdit() { editing.value = false; pickerOpen.value = false; paperSearch.reset(); selectionNotice.value = ''; }
function choose(paper, { allowWhileBusy = false } = {}) {
  if ((!allowWhileBusy && props.disabled) || selected.value.some((item, index) => item.id === paper.id && index !== pickerSlot.value)) return;
  if (pickerSlot.value < selected.value.length) selected.value[pickerSlot.value] = paper;
  else if (selected.value.length < 5) selected.value.push(paper);
  else return;
  selectionNotice.value = `${paper.nom} sélectionné. ${selected.value.length} papiers sur 5.`;
  closePicker();
}
function removePaper() { if (props.disabled || props.readOnly) return; selected.value.splice(pickerSlot.value, 1); closePicker(); }
async function createPaper() {
  if (props.disabled || creating.value || searching.value || (selected.value.length >= 5 && pickerSlot.value >= selected.value.length) || !query.value.trim()) return;
  creating.value = true; localError.value = '';
  try { choose(await papierCartonnesAPI.create(query.value.trim()), { allowWhileBusy: true }); }
  catch (failure) { localError.value = failure.message; }
  finally { creating.value = false; await nextTick(); if (document.activeElement === document.body) document.getElementById(`${uid}-paper-${Math.min(pickerSlot.value, 4)}`)?.focus(); }
}
async function savePapers() {
  if (creating.value) return;
  if (await props.mutate(() => cataloguesAPI.setPapiersCollection(props.collection.id, selected.value.map(paper => paper.id)), 'Papiers enregistrés.')) cancelEdit();
}
</script>

<style scoped>
.catalogue-collection { display: grid; gap: var(--spacing-4); padding: var(--spacing-5); border: 1px solid var(--border); border-radius: var(--border-radius); background: var(--bg-tertiary); }
.catalogue-paper-list, .catalogue-paper-editor { display: flex; flex-wrap: wrap; gap: var(--spacing-3); align-items: center; }
.catalogue-paper-editor { display: grid; width: 100%; }
.catalogue-paper-tag { padding: 6px 12px; border-radius: var(--border-radius-full); background: var(--primary-light); color: var(--primary); overflow-wrap: anywhere; }
.catalogue-paper-selection { list-style: none; display: grid; gap: var(--spacing-2); }
.catalogue-paper-selection li { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-3); }
.catalogue-paper-selection span { overflow-wrap: anywhere; min-width: 0; }
.catalogue-search-results { display: grid; gap: var(--spacing-2); max-height: 240px; overflow-y: auto; }
.catalogue-search-results button { text-align: left; overflow-wrap: anywhere; white-space: normal; }

.catalogue-collection .collection-name-title { display: inline-flex; align-items: center; gap: 8px; justify-self: start; border: 0; background: transparent; padding: 4px 0; color: var(--primary); font-size: 17px; font-weight: 600; text-align: left; }
.collection-name-title svg { width: 18px; height: 18px; flex-shrink: 0; }
.catalogue-paper-cards { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
.catalogue-collection .catalogue-paper-card { min-height: 110px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 12px 8px; white-space: normal; overflow-wrap: anywhere; text-align: center; }
.catalogue-paper-card svg { width: 28px; height: 28px; color: var(--primary); flex-shrink: 0; }
.catalogue-paper-card.empty { border-style: dashed; }
.catalogue-paper-editor { padding: 16px 0; border-top: 1px solid var(--border-light); }
@media (max-width: 1100px) { .catalogue-paper-cards { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 450px) { .catalogue-paper-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
