<template>
  <article class="catalogue-collection">
    <form class="catalogue-inline-form" @submit.prevent="rename">
      <label :for="`${uid}-name`">Nom de la collection<input :id="`${uid}-name`" v-model="name" :disabled="disabled" required /></label>
      <Button v-if="!disabled" type="submit" variant="secondary" size="sm" :disabled="name === collection.nom">Renommer</Button>
    </form>
    <p class="catalogue-hint">{{ collection.papiers.length }}/5 papiers enregistrés · minimum 1, maximum 5 papiers différents</p>
    <div v-if="!editing" class="catalogue-paper-list">
      <p v-if="!collection.papiers.length">Aucun papier. Cette collection doit être complétée avant publication.</p>
      <span v-for="paper in collection.papiers" :key="paper.id" class="catalogue-paper-tag">{{ paper.nom }}{{ paper.archive ? ' — archivé' : '' }}</span>
      <Button v-if="!disabled" variant="secondary" size="sm" @click="startEdit">Choisir les papiers</Button>
    </div>
    <div v-else class="catalogue-paper-editor">
      <p class="catalogue-hint">Retirer un papier ici change seulement son association à cette collection. Le papier reste dans la bibliothèque.</p>
      <ul class="catalogue-paper-selection">
        <li v-for="paper in selected" :key="paper.id"><span>{{ paper.nom }}{{ paper.archive ? ' — archivé' : '' }}</span><button type="button" :disabled="disabled" :aria-label="`Retirer ${paper.nom} de la sélection`" @click="selected = selected.filter(item => item.id !== paper.id)">Retirer</button></li>
      </ul>
      <p v-if="!selected.length" class="catalogue-hint">Aucun papier sélectionné. Vous pouvez enregistrer cette collection incomplète en brouillon.</p>
      <p role="status">{{ selected.length }}/5 sélectionnés{{ selected.length === 5 ? ' — maximum atteint' : '' }}</p>
      <p class="catalogue-hint">Recherchez un papier existant ou saisissez un nouveau nom pour le créer.</p>
      <label :for="`${uid}-search`">Bibliothèque de papiers<input :id="`${uid}-search`" ref="searchInput" v-model="query" type="search" autocomplete="off" placeholder="Ex. Kraft naturel" :disabled="disabled || selected.length >= 5" /></label>
      <p class="sr-only" role="status" aria-live="polite">{{ selectionNotice }}</p>
      <p v-if="searching" role="status">Recherche…</p>
      <p v-if="searchError" class="catalogue-error" role="alert">{{ searchError }}</p>
      <div v-if="selected.length < 5" class="catalogue-search-results">
        <button v-for="paper in availableResults" :key="paper.id" type="button" :disabled="disabled || creating" @click="choose(paper)">Ajouter {{ paper.nom }}</button>
        <p v-if="query.trim() && exactMatch && selected.some(item => item.id === exactMatch.id)" class="catalogue-hint">« {{ exactMatch.nom }} » est déjà sélectionné.</p>
        <button v-if="query.trim() && !exactMatch" type="button" :disabled="disabled || searching || creating || Boolean(searchError)" @click="createPaper">{{ creating ? 'Création…' : `Créer « ${query.trim()} » dans la bibliothèque` }}</button>
        <p v-if="!searching && query.trim() && !availableResults.length && exactMatch && !selected.some(item => item.id === exactMatch.id)" class="catalogue-hint">Ce papier est disponible ci-dessus.</p>
      </div>
      <div class="catalogue-actions"><Button variant="secondary" size="sm" :disabled="disabled || creating" @click="cancelEdit">Annuler</Button><Button size="sm" :disabled="disabled || creating" @click="savePapers">Enregistrer les papiers</Button></div>
    </div>
    <p v-if="localError" class="catalogue-error" role="alert">{{ localError }}</p>
  </article>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
import Button from './Button.vue';
import { cataloguesAPI, papierCartonnesAPI } from '../services/api';
import { usePaperSearch } from '../composables/usePaperSearch';
const props = defineProps({ collection: { type: Object, required: true }, mutate: { type: Function, required: true }, disabled: Boolean });
const emit = defineEmits(['dirty']);
const uid = useId();
const name = ref(props.collection.nom);
const editing = ref(false);
const selected = ref([]);
const creating = ref(false);
const localError = ref('');
const searchInput = ref(null);
const selectionNotice = ref('');
const paperSearch = usePaperSearch(value => papierCartonnesAPI.search(value));
const { query, results, searching, error: searchError } = paperSearch;
const normalizeName = value => value.trim().normalize('NFC').toLocaleLowerCase('fr');
const exactMatch = computed(() => results.value.find(paper => normalizeName(paper.nom) === normalizeName(query.value)));
const availableResults = computed(() => results.value.filter(paper => !selected.value.some(item => item.id === paper.id)));
const dirty = computed(() => name.value !== props.collection.nom || editing.value);
watch(dirty, value => emit('dirty', value));
onBeforeUnmount(paperSearch.stop);
async function rename() {
  if (!name.value.trim() || props.disabled) return;
  if (await props.mutate(() => cataloguesAPI.updateCollection(props.collection.id, name.value.trim()), 'Collection renommée.')) name.value = props.collection.nom;
}
function startEdit() { selected.value = [...props.collection.papiers]; editing.value = true; paperSearch.reset(); localError.value = ''; nextTick(() => searchInput.value?.focus()); }
function cancelEdit() { editing.value = false; paperSearch.reset(); selectionNotice.value = ''; }
function choose(paper, { allowWhileBusy = false } = {}) {
  if ((!allowWhileBusy && props.disabled) || selected.value.length >= 5 || selected.value.some(item => item.id === paper.id)) return;
  selected.value.push(paper);
  selectionNotice.value = `${paper.nom} ajouté. ${selected.value.length} papier${selected.value.length > 1 ? 's' : ''} sur 5 sélectionné${selected.value.length > 1 ? 's' : ''}.`;
  paperSearch.reset();
  nextTick(() => searchInput.value?.focus());
}
async function createPaper() {
  if (props.disabled || creating.value || searching.value || selected.value.length >= 5 || !query.value.trim()) return;
  creating.value = true; localError.value = '';
  try { choose(await papierCartonnesAPI.create(query.value.trim()), { allowWhileBusy: true }); }
  catch (failure) { localError.value = failure.message; }
  finally { creating.value = false; }
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
</style>
