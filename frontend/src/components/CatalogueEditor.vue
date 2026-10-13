<template>
  <section class="catalogue-editor" v-following-bottom="{ body: '.catalogue-editor-body', enabled: true }" @focusin="keepFocusedControlVisible" aria-label="Préparation du catalogue">
    <header class="catalogue-editor-header">
      <button type="button" class="catalogue-editor-close" :disabled="blocked" :aria-label="isNew ? 'Fermer la création du catalogue' : 'Fermer la préparation du catalogue'" @click="emit('close')"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="m6 6 12 12M6 18 18 6"/></svg></button>
      <div class="catalogue-editor-title"><h2 ref="heading" tabindex="-1" class="page-title">{{ isNew ? 'Nouveau catalogue' : catalogue?.titre || 'Préparation du catalogue' }}</h2></div>
      <span v-if="catalogue" class="catalogue-status" :class="{ published: catalogue.statut === 'publie' && !catalogue.archive }">{{ catalogue.archive ? 'Archivé' : catalogue.statut === 'publie' ? 'Publié' : 'Brouillon' }}</span>
    </header>
    <nav v-if="!loading && !loadError" class="catalogue-timeline" aria-label="Étapes du catalogue">
      <ol>
        <li v-for="(step, index) in steps" :key="step">
          <button type="button" :aria-current="activeStep === index ? 'step' : undefined" :aria-controls="`catalogue-step-${index}`" :disabled="blocked || (!catalogue && index > 0)" @click="goToStep(index)">
            <span class="catalogue-step-number" aria-hidden="true">{{ index + 1 }}</span>
            <span class="catalogue-step-label">{{ step }}<span v-if="stepDirty[index]" class="catalogue-step-unsaved">À enregistrer</span></span>
          </button>
        </li>
      </ol>
    </nav>
    <div ref="body" class="catalogue-editor-body" tabindex="0" role="region" aria-label="Formulaire du catalogue">
      <p v-if="loading" role="status" class="catalogue-section">Chargement du catalogue…</p>
      <div v-else-if="loadError" class="catalogue-section" role="alert"><p class="catalogue-error">{{ loadError }}</p><Button variant="secondary" @click="load">Réessayer</Button></div>
      <template v-else>
        <p v-if="error" ref="errorSummary" tabindex="-1" class="catalogue-alert catalogue-error" role="alert">{{ error }}</p>
        <p v-if="notice" :class="noticeImportant ? 'catalogue-alert' : 'sr-only'" role="status">{{ notice }}</p>
        <p v-if="catalogue?.archive" class="catalogue-alert">Catalogue archivé. Sa restauration est disponible à l’étape Vérification.</p>
        <!-- Keep every section mounted so navigating never discards an unsaved input. -->
        <section v-show="activeStep === 0" id="catalogue-step-0" class="catalogue-section" aria-labelledby="catalogue-step-title-0">
          <div class="catalogue-section-heading"><h2 id="catalogue-step-title-0" tabindex="-1">Informations</h2><span v-if="identityDirty" class="catalogue-save-state">À enregistrer</span></div>
          <form @submit.prevent="saveIdentity">
            <fieldset :disabled="blocked || Boolean(catalogue?.archive)">
              <label for="catalogue-title">Nom du catalogue<input id="catalogue-title" v-model="identity.titre" placeholder="Ex. Noël créatif" required /></label>
              <div class="catalogue-two-columns"><label for="catalogue-special">Papier spécial<input id="catalogue-special" v-model="identity.papier_spe" placeholder="Ex. Kraft naturel" /></label><label for="catalogue-embellishment">Embellissement<input id="catalogue-embellishment" v-model="identity.embellissement" placeholder="Ex. Dimensionals" /></label></div>
              <Button v-if="!catalogue?.archive" type="submit" :variant="isNew ? 'primary' : 'secondary'" :loading="busy" :disabled="!identity.titre.trim() || (!isNew && !identityDirty)">{{ isNew ? 'Créer le brouillon' : 'Enregistrer les informations' }}</Button>
            </fieldset>
          </form>
        </section>
        <template v-if="catalogue">
          <section v-show="activeStep === 1" id="catalogue-step-1" class="catalogue-section" aria-labelledby="catalogue-step-title-1">
            <div class="catalogue-section-heading"><h2 id="catalogue-step-title-1" tabindex="-1">Collections et papiers</h2><span>{{ catalogue.collections.length }}/4 collections</span></div>
            <div class="catalogue-collection-tabs" aria-label="Collections du catalogue">
              <button v-for="collection in catalogue.collections" :id="`collection-tab-${collection.id}`" :key="collection.id" type="button" :aria-pressed="activeCollectionId === collection.id" :disabled="blocked" @click="activeCollectionId = collection.id"><span>{{ collection.nom }}</span><small>{{ collectionCounts[collection.id] ?? collection.papiers.length }}/5 papiers{{ collectionDirty[collection.id] ? ' · À enregistrer' : '' }}</small></button>
              <button v-if="!catalogue.archive && catalogue.collections.length < 4 && catalogue.collections.length && !addingCollection" type="button" :disabled="blocked" @click="addingCollection = true; focusNewCollection()">Nouvelle collection</button>
            </div>
            <CatalogueCollection v-show="activeCollectionId === collection.id" v-for="collection in catalogue.collections" :key="collection.id" :collection="collection" :mutate="mutate" :disabled="blocked || Boolean(catalogue.archive)" :read-only="Boolean(catalogue.archive)" @count="value => collectionCounts[collection.id] = value" @dirty="value => collectionDirty[collection.id] = value" @busy="value => collectionBusy[collection.id] = value" />
            <form v-if="!catalogue.archive && catalogue.collections.length < 4 && (addingCollection || !catalogue.collections.length)" class="catalogue-inline-form" @submit.prevent="addCollection">
              <label for="new-collection">Nouvelle collection<input id="new-collection" v-model="collectionName" :disabled="blocked || catalogue.collections.length >= 4" required placeholder="Nom de la collection" /></label>
              <Button type="submit" variant="secondary" :disabled="blocked || !collectionName.trim() || catalogue.collections.length >= 4">Ajouter une collection</Button>
              <Button v-if="catalogue.collections.length" variant="secondary" :disabled="blocked" @click="collectionName = ''; addingCollection = false">Annuler</Button>
            </form>
          </section>
          <section v-show="activeStep === 2" id="catalogue-step-2" class="catalogue-section" aria-labelledby="catalogue-step-title-2">
            <h2 id="catalogue-step-title-2" tabindex="-1">Rubans et tarifs</h2>
            <div class="catalogue-step-group">
              <div class="catalogue-section-heading"><h3>Rubans</h3><span>{{ catalogue.rubans.length }}/2</span></div>
              <form v-for="ruban in catalogue.rubans" :key="ruban.id" class="catalogue-inline-form" @submit.prevent="requestRubanRename(ruban, $event)">
                <label :for="`ruban-${ruban.id}`">Ruban {{ ruban.ordre }}<input :id="`ruban-${ruban.id}`" v-model="rubanNames[ruban.id]" :disabled="blocked || Boolean(catalogue.archive)" :aria-invalid="Boolean(rubanErrors[ruban.id])" :aria-describedby="rubanErrors[ruban.id] ? `ruban-error-${ruban.id}` : undefined" @blur="requestRubanRename(ruban, $event)" required /></label>
                <p v-if="rubanErrors[ruban.id]" :id="`ruban-error-${ruban.id}`" class="catalogue-error" role="alert">{{ rubanErrors[ruban.id] }}</p>
              </form>
              <form v-if="!catalogue.archive && catalogue.rubans.length < 2" class="catalogue-inline-form" @submit.prevent="addRuban">
                <label for="new-ruban">Nouveau ruban<input id="new-ruban" v-model="rubanName" :disabled="blocked || catalogue.rubans.length >= 2" required placeholder="Nom du ruban" /></label>
                <Button type="submit" variant="secondary" :disabled="blocked || !rubanName.trim() || catalogue.rubans.length >= 2">Ajouter un ruban</Button>
              </form>
              <p v-if="catalogue.rubans.length === 2" class="catalogue-hint">Maximum de 2 rubans atteint.</p>
            </div>
            <div class="catalogue-step-group">
              <h3>Tarifs du catalogue</h3>
              <CataloguePrices :key="catalogue.id" compact :prices="catalogue" :disabled="Boolean(catalogue.archive) || blocked" :save-prices="savePrices" @dirty="value => pricesDirty = value" />
            </div>
          </section>
          <section v-show="activeStep === 3" id="catalogue-step-3" class="catalogue-section catalogue-verification" aria-labelledby="catalogue-step-title-3">
            <h2 id="catalogue-step-title-3" tabindex="-1">Vérification</h2>
            <div v-if="dirty" class="catalogue-pending" role="status">
              <p>Modifications non enregistrées :</p>
              <ul><li v-for="index in pendingSteps" :key="index"><button type="button" :disabled="blocked" @click="goToStep(index)">{{ steps[index] }}</button></li></ul>
            </div>
            <dl class="catalogue-summary">
              <div><dt>Nom</dt><dd>{{ catalogue.titre }}</dd></div>
              <div><dt>Papier spécial</dt><dd>{{ catalogue.papier_spe || '—' }}</dd></div>
              <div><dt>Embellissement</dt><dd>{{ catalogue.embellissement || '—' }}</dd></div>
              <div><dt>Rubans</dt><dd>{{ catalogue.rubans.map(ruban => ruban.nom).join(' · ') || '—' }}</dd></div>
              <div><dt>Tarifs</dt><dd><span v-for="format in formats" :key="format">{{ format }} : {{ formatPrice(catalogue[`prix_${format}_cents`]) }}</span></dd></div>
            </dl>
            <div class="catalogue-summary-collections">
              <h3>Collections</h3>
              <p v-if="!catalogue.collections.length">Aucune collection.</p>
              <ul v-else><li v-for="collection in catalogue.collections" :key="collection.id"><strong>{{ collection.nom }}</strong><span v-if="collection.papiers.length">{{ collection.papiers.map(paper => `${paper.nom}${paper.archive ? ' (archivé)' : ''}`).join(' · ') }}</span><button v-else-if="!catalogue.archive" type="button" class="catalogue-missing-paper" :disabled="blocked" :aria-label="`Ajouter un papier à « ${collection.nom} »`" @click="goToCollection(collection.id)">Ajouter un papier</button><span v-else>Aucun papier</span></li></ul>
            </div>
            <ul v-if="remainingRequirements.length" class="catalogue-requirements"><li v-for="requirement in remainingRequirements" :key="requirement"><button type="button" :disabled="blocked" @click="goToStep(requirementStep(requirement))">{{ requirement }}</button></li></ul>
            <p v-if="!requirements.length && !catalogue.archive">{{ catalogue.statut === 'publie' ? 'Disponible à la commande' : 'Prêt à publier' }} · {{ catalogue.collections.length === 1 ? 'Format C' : 'Formats A, B et C' }}</p>
            <Button v-if="!catalogue.archive && catalogue.statut === 'brouillon'" :disabled="blocked || dirty || Boolean(requirements.length)" :loading="busy" @click="publish">Publier le catalogue</Button>
            <div class="catalogue-archive-action"><Button variant="secondary" :disabled="blocked || dirty" @click="archiveDialog = true">{{ catalogue.archive ? 'Restaurer le catalogue' : 'Archiver le catalogue' }}</Button></div>
          </section>
          <footer class="catalogue-step-navigation">
            <Button variant="secondary" :disabled="blocked || activeStep === 0" @click="goToStep(activeStep - 1)">Précédent</Button>
            <span>{{ activeStep + 1 }} / {{ steps.length }}</span>
            <Button v-if="activeStep < steps.length - 1" variant="secondary" :disabled="blocked" @click="goToStep(activeStep + 1)">Suivant</Button>
            <Button v-else variant="secondary" :disabled="blocked" @click="emit('close')">Fermer</Button>
          </footer>
        </template>
      </template>
    </div>
    <ConfirmDialog :is-open="archiveDialog" :title="catalogue?.archive ? 'Restaurer le catalogue' : 'Archiver le catalogue'"
      :message="catalogue?.archive ? 'Le catalogue sera restauré en brouillon. Vous pourrez le publier après vérification.' : 'Le catalogue restera consultable et sera retiré des nouvelles commandes. Ses collections, papiers et rubans seront conservés.'"
      :confirm-text="catalogue?.archive ? 'Restaurer' : 'Archiver'" :loading="busy" @confirm="setArchive" @cancel="archiveDialog = false" />
  </section>
</template>

<script setup>
import { vFollowingBottom } from '../directives/followingBottom';
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useBlurSave } from '../composables/useBlurSave';
import { keepFocusedControlVisible } from '../utils/viewportFocus';
import Button from '../components/Button.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import CatalogueCollection from '../components/CatalogueCollection.vue';
import CataloguePrices from '../components/CataloguePrices.vue';
import { cataloguesAPI } from '../services/api';
import { useCataloguesStore } from '../stores/catalogues';
import { catalogueMutationNotice, publicationErrors, formats, formatPrice } from '../utils/catalogue';
const props = defineProps({ catalogueId: { type: String, required: true } });
const emit = defineEmits(['created', 'dirty', 'busy', 'close']);
const store = useCataloguesStore();
const catalogue = ref(null);
const heading = ref(null);
const body = ref(null);
const steps = ['Informations', 'Composition', 'Rubans et tarifs', 'Vérification'];
const activeStep = ref(0);
const identity = ref({ titre: '', papier_spe: '', embellissement: '' });
const identityBaseline = ref(JSON.stringify(identity.value));
const loading = ref(false);
const busy = ref(false);
const loadError = ref('');
const error = ref('');
const errorSummary = ref(null);
const notice = ref('');
const noticeImportant = ref(false);
const collectionName = ref('');
const rubanName = ref('');
const rubanNames = ref({});
const rubanErrors = ref({});
const collectionDirty = ref({});
const collectionCounts = ref({});
const activeCollectionId = ref(null);
const addingCollection = ref(false);
async function focusNewCollection() { await nextTick(); document.getElementById('new-collection')?.focus(); }
watch(() => catalogue.value?.collections.map(collection => collection.id) || [], ids => { if (!ids.includes(activeCollectionId.value)) activeCollectionId.value = ids[0] || null; });
const pricesDirty = ref(false);
const archiveDialog = ref(false);
const collectionBusy = ref({});
const blocked = computed(() => busy.value || Object.values(collectionBusy.value).some(Boolean));
const isNew = computed(() => props.catalogueId === 'nouveau');
watch(blocked, value => emit('busy', value), { immediate: true });
const identityDirty = computed(() => JSON.stringify(identity.value) !== identityBaseline.value);
const dirty = computed(() => identityDirty.value || pricesDirty.value || Object.values(collectionDirty.value).some(Boolean) || Boolean(collectionName.value.trim()) || Boolean(rubanName.value.trim()) || catalogue.value?.rubans.some(ruban => rubanNames.value[ruban.id] !== ruban.nom));
watch(dirty, value => emit('dirty', Boolean(value)), { immediate: true });
const stepDirty = computed(() => [identityDirty.value, Object.values(collectionDirty.value).some(Boolean) || Boolean(collectionName.value.trim()), pricesDirty.value || Boolean(rubanName.value.trim()) || Boolean(catalogue.value?.rubans.some(ruban => rubanNames.value[ruban.id] !== ruban.nom))]);
const pendingSteps = computed(() => stepDirty.value.flatMap((value, index) => value ? [index] : []));
async function goToStep(index) {
  if (blocked.value || index < 0 || index >= steps.length || (!catalogue.value && index > 0)) return;
  activeStep.value = index;
  notice.value = '';
  await nextTick();
  if (!body.value || activeStep.value !== index) return;
  body.value.scrollTop = 0;
  body.value.querySelector(`#catalogue-step-title-${index}`)?.focus({ preventScroll: true });
}
function goToCollection(id) { if (blocked.value) return; activeCollectionId.value = id; goToStep(1); }
function requirementStep(requirement) {
  if (requirement.includes('tarifs')) return 2;
  if (requirement.includes('papier spécial')) return 0;
  return 1;
}
const requirements = computed(() => catalogue.value ? publicationErrors(catalogue.value) : []);
const remainingRequirements = computed(() => requirements.value.filter(requirement => !catalogue.value?.collections.some(collection => !collection.papiers.length && requirement === `Ajoutez au moins un papier à « ${collection.nom} ».`)));
const { requestSave: requestRubanRename, cancelPending: cancelRubanRename } = useBlurSave(() => loading.value || blocked.value || !catalogue.value || Boolean(catalogue.value.archive), renameRuban);
function syncIdentity() {
  identity.value = { titre: catalogue.value?.titre || '', papier_spe: catalogue.value?.papier_spe || '', embellissement: catalogue.value?.embellissement || '' };
  identityBaseline.value = JSON.stringify(identity.value);
}
function remember(value) {
  catalogue.value = value;
  store.rememberCatalogue(value);
  for (const ruban of value.rubans) if (!(ruban.id in rubanNames.value)) rubanNames.value[ruban.id] = ruban.nom;
}
let loadGeneration = 0;
async function load() {
  cancelRubanRename();
  rubanErrors.value = {};
  const generation = ++loadGeneration;
  const id = props.catalogueId;
  loading.value = true; loadError.value = ''; error.value = ''; notice.value = '';
  catalogue.value = null; rubanNames.value = {}; collectionDirty.value = {}; pricesDirty.value = false;
  collectionName.value = ''; rubanName.value = ''; collectionCounts.value = {}; addingCollection.value = false; activeCollectionId.value = null;
  try {
    if (id !== 'nouveau') {
      const detail = await cataloguesAPI.getById(id);
      if (generation !== loadGeneration) return;
      remember(detail);
    }
    syncIdentity();
  } catch (failure) { if (generation === loadGeneration) loadError.value = failure.message; }
  finally { if (generation === loadGeneration) { loading.value = false; await nextTick(); heading.value?.focus(); } }
}
watch(() => props.catalogueId, (id, previousId) => {
  activeStep.value = previousId === 'nouveau' ? 1 : 0;
  load();
}, { immediate: true });
async function mutate(action, message) {
  if (blocked.value) return false;
  busy.value = true; error.value = ''; notice.value = '';
  const previousStatus = catalogue.value?.statut;
  try {
    const result = await action();
    remember(result?.collections ? result : result?.catalogue || await cataloguesAPI.getById(catalogue.value.id));
    noticeImportant.value = previousStatus === 'publie' && catalogue.value.statut === 'brouillon' && !catalogue.value.archive;
    notice.value = catalogueMutationNotice(previousStatus, catalogue.value, message);
    return true;
  } catch (failure) { error.value = failure.message; await nextTick(); errorSummary.value?.focus(); return false; }
  finally { busy.value = false; }
}
async function saveIdentity() {
  if (blocked.value || catalogue.value?.archive || !identity.value.titre.trim()) return;
  const payload = { titre: identity.value.titre.trim(), papier_spe: identity.value.papier_spe.trim() || null, embellissement: identity.value.embellissement.trim() || null };
  if (isNew.value) {
    busy.value = true; error.value = '';
    try {
      const created = await store.createCatalogue(payload);
      identityBaseline.value = JSON.stringify(identity.value);
      emit('created', created);
    } catch (failure) { error.value = failure.message; await nextTick(); errorSummary.value?.focus(); }
    finally { busy.value = false; }
  } else if (await mutate(() => cataloguesAPI.update(catalogue.value.id, payload), 'Informations enregistrées.')) syncIdentity();
}
async function addCollection() {
  if (!collectionName.value.trim() || catalogue.value.collections.length >= 4 || catalogue.value.archive) return;
  if (await mutate(() => cataloguesAPI.addCollection(catalogue.value.id, collectionName.value.trim()), 'Collection ajoutée.')) { collectionName.value = ''; addingCollection.value = false; activeCollectionId.value = catalogue.value.collections.at(-1).id; }
}
async function addRuban() {
  if (!rubanName.value.trim() || catalogue.value.rubans.length >= 2 || catalogue.value.archive) return;
  if (await mutate(() => cataloguesAPI.addRuban(catalogue.value.id, rubanName.value.trim()), 'Ruban ajouté.')) rubanName.value = '';
}
async function renameRuban(ruban) {
  const original = catalogue.value?.rubans.find(item => item.id === ruban.id);
  if (blocked.value || !original || catalogue.value.archive) return;
  rubanErrors.value[ruban.id] = '';
  const value = rubanNames.value[ruban.id]?.trim();
  if (!value) { rubanErrors.value[ruban.id] = 'Renseignez le nom du ruban.'; return; }
  if (value === original.nom) { rubanNames.value[ruban.id] = value; return; }
  const focusedInput = document.activeElement?.matches('input, select, textarea') ? document.activeElement : null;
  if (await mutate(() => cataloguesAPI.updateRuban(ruban.id, value), 'Ruban renommé.')) {
    rubanNames.value[ruban.id] = catalogue.value.rubans.find(item => item.id === ruban.id).nom;
    await nextTick();
    if (document.activeElement === document.body && focusedInput?.isConnected
      && !focusedInput.disabled && focusedInput.getClientRects().length) focusedInput.focus();
  }
}
const savePrices = payload => mutate(() => cataloguesAPI.update(catalogue.value.id, payload), 'Tarifs du catalogue enregistrés.');
const publish = () => { if (!blocked.value && !dirty.value && !requirements.value.length && !catalogue.value.archive) return mutate(() => cataloguesAPI.publish(catalogue.value.id), 'Catalogue publié.'); };
async function setArchive() {
  if (dirty.value || blocked.value) return;
  if (await mutate(() => cataloguesAPI.setArchive(catalogue.value.id, !catalogue.value.archive), catalogue.value.archive ? 'Catalogue restauré en brouillon.' : 'Catalogue archivé.')) archiveDialog.value = false;
}
function warnBeforeUnload(event) {
  if (!dirty.value && !blocked.value) return;
  event.preventDefault();
  event.returnValue = '';
}
watch([dirty, blocked], ([isDirty, isBusy]) => {
  if (isDirty || isBusy) window.addEventListener('beforeunload', warnBeforeUnload);
  else window.removeEventListener('beforeunload', warnBeforeUnload);
}, { immediate: true });
onBeforeUnmount(() => { ++loadGeneration; window.removeEventListener('beforeunload', warnBeforeUnload); });
</script>

<style scoped>
.catalogue-editor { display: flex; flex-direction: column; height: 100%; min-height: 0; min-width: 0; overflow: hidden; background: var(--card); border-radius: 12px; box-shadow: var(--shadow-sm); }
.catalogue-editor-header { display: flex; align-items: start; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--border-light); flex-shrink: 0; background: var(--card); }
.catalogue-editor-title { min-width: 0; flex: 1; }
.catalogue-editor .catalogue-editor-close { flex: 0 0 44px; display: grid; place-items: center; width: 44px; height: 44px; padding: 0; border: 0; background: transparent; color: var(--primary); }
.catalogue-editor-close svg { width: 24px; height: 24px; }
.catalogue-editor .catalogue-editor-close:hover { background: var(--surface-hover); }
.catalogue-editor-header .catalogue-status { flex-shrink: 0; }
.catalogue-editor-body { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; padding: 0 20px var(--dock-clearance, 20px); scroll-padding-block: 16px; scroll-padding-bottom: var(--dock-clearance, 20px); }
.catalogue-editor-body:focus-visible { outline: 2px solid var(--primary); outline-offset: -3px; }
.catalogue-editor .page-title { color: var(--primary); font-size: 24px; line-height: 1.3; }
.catalogue-editor .catalogue-section { padding: 20px 0; border: 0; border-radius: 0; gap: 16px; }
.catalogue-editor .catalogue-section h2 { color: var(--primary); font-size: 17px; font-weight: 600; }
.catalogue-editor .catalogue-section > p { font-size: 13px; }
.catalogue-editor :deep(.catalogue-collection) { background: var(--card); border: 0; border-radius: 0; padding: 12px 0; border-top: 1px solid var(--border-light); gap: 12px; }
.catalogue-editor :deep(.catalogue-paper-tag) { border-radius: 4px; padding: 4px 8px; }
.catalogue-requirements { padding-left: 18px; display: grid; gap: 6px; font-size: 13px; }
.catalogue-archive-action { border-top: 1px solid var(--border-light); padding-top: 12px; }
.catalogue-timeline { flex-shrink: 0; padding: 16px 20px; border-bottom: 1px solid var(--border-light); }
.catalogue-timeline ol { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); list-style: none; padding: 0; gap: 8px; }
.catalogue-timeline li { position: relative; min-width: 0; }
.catalogue-timeline li:not(:last-child)::after { content: ''; position: absolute; height: 1px; background: var(--border); top: 16px; left: calc(50% + 20px); width: calc(100% - 32px); }
.catalogue-timeline button { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%; min-height: 66px; padding: 0 4px; border: 0; background: transparent; color: var(--text-secondary); font-size: 13px; white-space: normal; }
.catalogue-step-number { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border); background: var(--card); font-weight: 600; position: relative; z-index: 1; }
.catalogue-timeline button[aria-current='step'] { color: var(--primary); font-weight: 600; }
.catalogue-timeline button[aria-current='step'] .catalogue-step-number { color: var(--card); background: var(--primary); border-color: var(--primary); }
.catalogue-step-label { display: grid; gap: 2px; text-align: center; }
.catalogue-step-unsaved, .catalogue-save-state { font-size: 12px; font-weight: 400; color: var(--text-secondary); }
.catalogue-step-group { display: grid; gap: 16px; padding-top: 16px; }
.catalogue-step-group + .catalogue-step-group { border-top: 1px solid var(--border-light); margin-top: 8px; }
.catalogue-section h3 { font-size: 15px; font-weight: 600; color: var(--primary); }
.catalogue-step-navigation { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 0; border-top: 1px solid var(--border-light); }
.catalogue-step-navigation > span { font-size: 13px; color: var(--text-secondary); }
.catalogue-summary { display: grid; gap: 12px; }
.catalogue-summary > div { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 12px; }
.catalogue-summary dt { color: var(--text-secondary); }
.catalogue-summary dd { margin: 0; overflow-wrap: anywhere; display: flex; flex-wrap: wrap; gap: 4px 16px; }
.catalogue-summary-collections { display: grid; gap: 12px; }
.catalogue-summary-collections ul { list-style: none; padding: 0; display: grid; gap: 12px; }
.catalogue-summary-collections li { display: grid; gap: 4px; overflow-wrap: anywhere; }
.catalogue-missing-paper { justify-self: start; }
.catalogue-summary-collections li > span { color: var(--text-secondary); }
.catalogue-pending { display: grid; gap: 8px; padding: 12px; background: var(--primary-light); border-radius: 8px; }
.catalogue-pending ul { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
.catalogue-pending button, .catalogue-requirements button, .catalogue-summary-collections .catalogue-missing-paper { background: transparent; border: 0; color: var(--primary); text-align: left; white-space: normal; text-decoration: underline; padding: 4px; }
@media (max-width: 900px) { .catalogue-editor { height: 65dvh; min-height: 240px; } }
@media (max-width: 600px) { .catalogue-timeline { padding: 12px 8px; } .catalogue-timeline ol { gap: 4px; } .catalogue-timeline button { font-size: 12px; } .catalogue-step-navigation { gap: 8px; } .catalogue-editor-header { padding: 12px; gap: 8px; flex-wrap: wrap; } .catalogue-editor-header .catalogue-status { margin-left: 52px; } .catalogue-editor-body { padding: 0 16px var(--dock-clearance, 20px); } .catalogue-editor .page-title { font-size: 21px; } }
.catalogue-collection-tabs { display: flex; flex-wrap: wrap; gap: 8px; }
.catalogue-collection-tabs button { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; white-space: normal; text-align: left; overflow-wrap: anywhere; flex: 1 1 120px; min-width: 0; }
.catalogue-collection-tabs button[aria-pressed="true"] { background: var(--primary); border-color: var(--primary); color: var(--card); }
.catalogue-collection-tabs small { font-size: 12px; }
</style>
