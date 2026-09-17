<template>
  <article class="catalogue-collection">
    <form class="catalogue-inline-form" @submit.prevent="rename">
      <label :for="`${uid}-name`">Nom de la collection<input :id="`${uid}-name`" v-model="name" :disabled="disabled" required /></label>
      <Button v-if="!disabled" type="submit" variant="secondary" size="sm" :disabled="name === collection.nom">Renommer</Button>
    </form>
    <p class="catalogue-hint">{{ collection.papiers.length }}/5 papiers enregistrés · minimum 1, maximum 5 papiers différents</p>
    <div v-if="!editing" class="catalogue-paper-list">
      <p v-if="!collection.papiers.length">Aucun papier. Cette collection doit être complétée avant publication.</p>
      <span v-for="paper in collection.papiers" :key="paper.id" class="catalogue-paper-tag">{{ paper.nom }}</span>
      <Button v-if="!disabled" variant="secondary" size="sm" @click="startEdit">Choisir les papiers</Button>
    </div>
    <div v-else class="catalogue-paper-editor">
      <p class="catalogue-hint">Retirer un papier ici change seulement son association à cette collection. Le papier reste dans la bibliothèque.</p>
      <ul class="catalogue-paper-selection">
        <li v-for="paper in selected" :key="paper.id"><span>{{ paper.nom }}</span><button type="button" :disabled="disabled" :aria-label="`Retirer ${paper.nom} de la sélection`" @click="selected = selected.filter(item => item.id !== paper.id)">Retirer</button></li>
      </ul>
      <p v-if="!selected.length" class="catalogue-hint">Aucun papier sélectionné. Vous pouvez enregistrer cette collection incomplète en brouillon.</p>
      <p role="status">{{ selected.length }}/5 sélectionnés{{ selected.length === 5 ? ' — maximum atteint' : '' }}</p>
      <label :for="`${uid}-search`">Bibliothèque de papiers<input :id="`${uid}-search`" v-model="query" type="search" placeholder="Rechercher ou créer un papier" :disabled="disabled || selected.length >= 5" /></label>
      <p v-if="searching" role="status">Recherche…</p>
      <p v-if="searchError" class="catalogue-error" role="alert">{{ searchError }}</p>
      <div v-if="selected.length < 5" class="catalogue-search-results">
        <button v-for="paper in results" :key="paper.id" type="button" :disabled="disabled || selected.some(item => item.id === paper.id)" @click="choose(paper)">{{ paper.nom }}{{ selected.some(item => item.id === paper.id) ? ' — déjà sélectionné' : '' }}</button>
        <button v-if="query.trim() && !exactMatch" type="button" :disabled="disabled || searching || creating || Boolean(searchError)" @click="createPaper">{{ creating ? 'Création…' : `Créer « ${query.trim()} » dans la bibliothèque` }}</button>
        <p v-if="!searching && !results.length && !query.trim()" class="catalogue-hint">Recherchez un papier par son nom.</p>
      </div>
      <div class="catalogue-actions"><Button variant="secondary" size="sm" :disabled="disabled || creating" @click="cancelEdit">Annuler</Button><Button size="sm" :disabled="disabled || creating" @click="savePapers">Enregistrer les papiers</Button></div>
    </div>
    <details v-if="collection.papiers.length && !disabled && !editing" class="catalogue-library-edit">
      <summary>Renommer un papier de bibliothèque</summary>
      <p class="catalogue-hint">Le nouveau nom sera affiché dans toutes les collections utilisant ce papier. Les commandes passées gardent leur désignation historique.</p>
      <form class="catalogue-inline-form" @submit.prevent="renamePaper">
        <label :for="`${uid}-paper`">Papier<select :id="`${uid}-paper`" v-model="renamedPaperId" :disabled="disabled"><option value="">Choisir un papier</option><option v-for="paper in collection.papiers" :key="paper.id" :value="paper.id">{{ paper.nom }}</option></select></label>
        <label :for="`${uid}-paper-name`">Nouveau nom<input :id="`${uid}-paper-name`" v-model="paperName" :disabled="disabled" required /></label>
        <Button type="submit" variant="secondary" size="sm" :disabled="disabled || !renamedPaperId">Renommer</Button>
      </form>
    </details>
    <p v-if="localError" class="catalogue-error" role="alert">{{ localError }}</p>
  </article>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue';
import Button from './Button.vue';
import { cataloguesAPI, papierCartonnesAPI } from '../services/api';
const props = defineProps({ collection: { type: Object, required: true }, mutate: { type: Function, required: true }, disabled: Boolean });
const emit = defineEmits(['dirty']);
const uid = useId();
const name = ref(props.collection.nom);
const editing = ref(false);
const selected = ref([]);
const query = ref('');
const results = ref([]);
const searching = ref(false);
const creating = ref(false);
const searchError = ref('');
const localError = ref('');
const renamedPaperId = ref('');
const paperName = ref('');
let timer;
let version = 0;
const exactMatch = computed(() => results.value.find(paper => paper.nom.toLocaleLowerCase('fr') === query.value.trim().toLocaleLowerCase('fr')));
const dirty = computed(() => name.value !== props.collection.nom || editing.value || Boolean(renamedPaperId.value));
watch(dirty, value => emit('dirty', value));
watch(renamedPaperId, id => { paperName.value = props.collection.papiers.find(paper => paper.id === id)?.nom || ''; });
watch(query, value => {
  clearTimeout(timer);
  const token = ++version;
  searching.value = true; searchError.value = ''; results.value = [];
  timer = setTimeout(async () => {
    try { const papers = await papierCartonnesAPI.search(value.trim()); if (token === version) results.value = papers; }
    catch (failure) { if (token === version) searchError.value = failure.message; }
    finally { if (token === version) searching.value = false; }
  }, 200);
});
onBeforeUnmount(() => { clearTimeout(timer); version++; });
async function rename() {
  if (!name.value.trim() || props.disabled) return;
  if (await props.mutate(() => cataloguesAPI.updateCollection(props.collection.id, name.value.trim()), 'Collection renommée.')) name.value = props.collection.nom;
}
function startEdit() { selected.value = [...props.collection.papiers]; editing.value = true; query.value = ''; results.value = []; localError.value = ''; }
function cancelEdit() { editing.value = false; query.value = ''; version++; clearTimeout(timer); searching.value = false; }
function choose(paper) {
  if (props.disabled || selected.value.length >= 5 || selected.value.some(item => item.id === paper.id)) return;
  selected.value.push(paper); query.value = ''; results.value = [];
}
async function createPaper() {
  if (props.disabled || creating.value || searching.value || selected.value.length >= 5 || !query.value.trim()) return;
  creating.value = true; localError.value = '';
  try { choose(await papierCartonnesAPI.create(query.value.trim())); }
  catch (failure) { localError.value = failure.message; }
  finally { creating.value = false; }
}
async function savePapers() {
  if (creating.value) return;
  if (await props.mutate(() => cataloguesAPI.setPapiersCollection(props.collection.id, selected.value.map(paper => paper.id)), 'Papiers enregistrés.')) cancelEdit();
}
async function renamePaper() {
  if (!renamedPaperId.value || !paperName.value.trim() || props.disabled) return;
  if (await props.mutate(() => papierCartonnesAPI.update(renamedPaperId.value, paperName.value.trim()), 'Papier renommé dans la bibliothèque.')) { renamedPaperId.value = ''; paperName.value = ''; }
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
.catalogue-library-edit summary { cursor: pointer; color: var(--text-secondary); padding: var(--spacing-2) 0; }
.catalogue-library-edit form { margin-top: var(--spacing-3); }
</style>
