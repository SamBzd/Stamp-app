<template>
  <Layout>
    <div class="catalogue-workspace">
      <RouterLink to="/catalogues" class="catalogue-back">← Tous les catalogues</RouterLink>
      <p v-if="loading" role="status" class="catalogue-section">Chargement du catalogue…</p>
      <div v-else-if="loadError" class="catalogue-section" role="alert"><p class="catalogue-error">{{ loadError }}</p><Button variant="secondary" @click="load">Réessayer</Button></div>
      <template v-else>
        <header class="page-header">
          <div><p class="catalogue-eyebrow">{{ isNew ? 'Commencer un brouillon' : 'Atelier catalogue' }}</p><h1 ref="heading" tabindex="-1" class="page-title">{{ isNew ? 'Nouveau catalogue' : catalogue.titre }}</h1></div>
          <span v-if="catalogue" class="catalogue-status" :class="{ published: catalogue.statut === 'publie' && !catalogue.archive }">{{ catalogue.archive ? 'Archivé' : catalogue.statut === 'publie' ? 'Publié' : 'Brouillon' }}</span>
        </header>
        <p v-if="error" ref="errorSummary" tabindex="-1" class="catalogue-alert catalogue-error" role="alert">{{ error }}</p>
        <p v-if="notice" class="catalogue-alert" role="status">{{ notice }}</p>
        <p v-if="catalogue?.archive" class="catalogue-alert">Ce catalogue est conservé pour consultation. Restaurez-le pour reprendre sa préparation ; il faudra ensuite le publier explicitement.</p>
        <div class="catalogue-editor-layout">
          <div class="catalogue-editor-main">
            <section class="catalogue-section">
              <h2>1. Nom et matériel</h2>
              <p>Le nom est libre. Un papier spécial, un embellissement ou les deux sont nécessaires avant publication.</p>
              <form @submit.prevent="saveIdentity">
                <fieldset :disabled="busy || Boolean(catalogue?.archive)">
                  <label for="catalogue-title">Nom du catalogue<input id="catalogue-title" v-model="identity.titre" placeholder="Ex. Noël créatif" required /></label>
                  <div class="catalogue-two-columns"><label for="catalogue-special">Papier spécial<input id="catalogue-special" v-model="identity.papier_spe" placeholder="Ex. Kraft naturel" /></label><label for="catalogue-embellishment">Embellissement<input id="catalogue-embellishment" v-model="identity.embellissement" placeholder="Ex. Dimensionals" /></label></div>
                  <p v-if="isNew" class="catalogue-hint">Le brouillon sera enregistré avec les tarifs par défaut actuels. Sa composition pourra être complétée ensuite.</p>
                  <Button v-if="!catalogue?.archive" type="submit" :variant="isNew ? 'primary' : 'secondary'" :loading="busy" :disabled="!identity.titre.trim() || (!isNew && !identityDirty)">{{ isNew ? 'Créer le brouillon' : 'Enregistrer les informations' }}</Button>
                </fieldset>
              </form>
            </section>
            <template v-if="catalogue">
              <section class="catalogue-section">
                <div class="catalogue-section-heading"><h2>2. Collections et papiers</h2><span>{{ catalogue.collections.length }}/4</span></div>
                <p>De 1 à 4 collections, contenant chacune 1 à 5 papiers différents de la bibliothèque.</p>
                <CatalogueCollection v-for="collection in catalogue.collections" :key="collection.id" :collection="collection" :mutate="mutate" :disabled="busy || Boolean(catalogue.archive)" @dirty="value => collectionDirty[collection.id] = value" />
                <form v-if="!catalogue.archive" class="catalogue-inline-form" @submit.prevent="addCollection">
                  <label for="new-collection">Nouvelle collection<input id="new-collection" v-model="collectionName" :disabled="busy || catalogue.collections.length >= 4" required placeholder="Nom de la collection" /></label>
                  <Button type="submit" variant="secondary" :disabled="busy || !collectionName.trim() || catalogue.collections.length >= 4">Ajouter une collection</Button>
                </form>
                <p v-if="catalogue.collections.length === 4" class="catalogue-hint">Maximum de 4 collections atteint.</p>
              </section>
              <section class="catalogue-section">
                <div class="catalogue-section-heading"><h2>3. Rubans</h2><span>{{ catalogue.rubans.length }}/2</span></div>
                <p>Facultatifs : de 0 à 2 rubans nommés, propres à ce catalogue.</p>
                <form v-for="ruban in catalogue.rubans" :key="ruban.id" class="catalogue-inline-form" @submit.prevent="renameRuban(ruban)">
                  <label :for="`ruban-${ruban.id}`">Ruban {{ ruban.ordre }}<input :id="`ruban-${ruban.id}`" v-model="rubanNames[ruban.id]" :disabled="busy || Boolean(catalogue.archive)" required /></label>
                  <Button v-if="!catalogue.archive" type="submit" variant="secondary" size="sm" :disabled="busy || rubanNames[ruban.id] === ruban.nom">Renommer</Button>
                </form>
                <form v-if="!catalogue.archive" class="catalogue-inline-form" @submit.prevent="addRuban">
                  <label for="new-ruban">Nouveau ruban<input id="new-ruban" v-model="rubanName" :disabled="busy || catalogue.rubans.length >= 2" required placeholder="Nom du ruban" /></label>
                  <Button type="submit" variant="secondary" :disabled="busy || !rubanName.trim() || catalogue.rubans.length >= 2">Ajouter un ruban</Button>
                </form>
                <p v-if="catalogue.rubans.length === 2" class="catalogue-hint">Maximum de 2 rubans atteint.</p>
              </section>
              <section class="catalogue-section">
                <h2>4. Tarifs du catalogue</h2>
                <p>Ces prix sont propres à « {{ catalogue.titre }} ». Les modifier ne change ni les autres catalogues, ni les tarifs par défaut, ni les commandes passées.</p>
                <CataloguePrices :key="catalogue.id" :prices="catalogue" :disabled="Boolean(catalogue.archive) || busy" :save-prices="savePrices" @dirty="value => pricesDirty = value" />
              </section>
            </template>
          </div>
          <aside v-if="catalogue" class="catalogue-publication catalogue-section">
            <h2>{{ catalogue.statut === 'publie' && !catalogue.archive ? 'Disponible à la commande' : 'Avant publication' }}</h2>
            <ul v-if="requirements.length" class="catalogue-requirements"><li v-for="requirement in requirements" :key="requirement">{{ requirement }}</li></ul>
            <p v-else>La composition est complète. {{ catalogue.statut === 'brouillon' ? 'Le catalogue reste brouillon jusqu’à votre publication explicite.' : 'Le catalogue est publié.' }}</p>
            <p v-if="catalogue.collections.length === 1" class="catalogue-hint">Avec une seule collection, seul le format C sera disponible. A et B nécessitent deux collections distinctes.</p>
            <p v-else-if="catalogue.collections.length >= 2" class="catalogue-hint">Formats proposés après publication : A, B et C.</p>
            <p v-if="dirty" class="catalogue-hint">Enregistrez ou annulez vos modifications en cours avant de publier ou archiver.</p>
            <Button v-if="!catalogue.archive && catalogue.statut === 'brouillon'" :disabled="busy || dirty || Boolean(requirements.length)" :loading="busy" @click="publish">Publier le catalogue</Button>
            <p v-if="catalogue.statut === 'publie'" class="catalogue-hint">Une modification rendant sa composition incomplète le remettra automatiquement en brouillon.</p>
            <div class="catalogue-archive-action"><Button variant="secondary" :disabled="busy || dirty" @click="archiveDialog = true">{{ catalogue.archive ? 'Restaurer le catalogue' : 'Archiver le catalogue' }}</Button></div>
          </aside>
        </div>
      </template>
      <ConfirmDialog :is-open="archiveDialog" :title="catalogue?.archive ? 'Restaurer le catalogue' : 'Archiver le catalogue'"
        :message="catalogue?.archive ? 'Le catalogue sera restauré en brouillon. Vous pourrez le publier après vérification.' : 'Le catalogue restera consultable et sera retiré des nouvelles commandes. Ses collections, papiers et rubans seront conservés.'"
        :confirm-text="catalogue?.archive ? 'Restaurer' : 'Archiver'" :loading="busy" @confirm="setArchive" @cancel="archiveDialog = false" />
    </div>
  </Layout>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router';
import Layout from '../components/Layout.vue';
import Button from '../components/Button.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import CatalogueCollection from '../components/CatalogueCollection.vue';
import CataloguePrices from '../components/CataloguePrices.vue';
import { cataloguesAPI } from '../services/api';
import { useCataloguesStore } from '../stores/catalogues';
import { publicationErrors } from '../utils/catalogue';
const route = useRoute();
const router = useRouter();
const store = useCataloguesStore();
const catalogue = ref(null);
const heading = ref(null);
const identity = ref({ titre: '', papier_spe: '', embellissement: '' });
const identityBaseline = ref('');
const loading = ref(false);
const busy = ref(false);
const loadError = ref('');
const error = ref('');
const errorSummary = ref(null);
const notice = ref('');
const collectionName = ref('');
const rubanName = ref('');
const rubanNames = ref({});
const collectionDirty = ref({});
const pricesDirty = ref(false);
const archiveDialog = ref(false);
const isNew = computed(() => route.params.id === 'nouveau');
const identityDirty = computed(() => JSON.stringify(identity.value) !== identityBaseline.value);
const dirty = computed(() => identityDirty.value || pricesDirty.value || Object.values(collectionDirty.value).some(Boolean) || Boolean(collectionName.value.trim()) || Boolean(rubanName.value.trim()) || catalogue.value?.rubans.some(ruban => rubanNames.value[ruban.id] !== ruban.nom));
const requirements = computed(() => catalogue.value ? publicationErrors(catalogue.value) : []);
function syncIdentity() {
  identity.value = { titre: catalogue.value?.titre || '', papier_spe: catalogue.value?.papier_spe || '', embellissement: catalogue.value?.embellissement || '' };
  identityBaseline.value = JSON.stringify(identity.value);
}
function remember(value) {
  catalogue.value = value;
  store.rememberCatalogue(value);
  for (const ruban of value.rubans) if (!(ruban.id in rubanNames.value)) rubanNames.value[ruban.id] = ruban.nom;
}
async function load() {
  loading.value = true; loadError.value = ''; error.value = ''; notice.value = '';
  catalogue.value = null; rubanNames.value = {}; collectionDirty.value = {}; pricesDirty.value = false;
  collectionName.value = ''; rubanName.value = '';
  try { if (!isNew.value) remember(await cataloguesAPI.getById(route.params.id)); syncIdentity(); }
  catch (failure) { loadError.value = failure.message; }
  finally { loading.value = false; await nextTick(); heading.value?.focus(); }
}
watch(() => route.params.id, load, { immediate: true });
async function mutate(action, message) {
  if (busy.value) return false;
  busy.value = true; error.value = ''; notice.value = '';
  const previousStatus = catalogue.value?.statut;
  try {
    const result = await action();
    remember(result?.collections ? result : result?.catalogue || await cataloguesAPI.getById(catalogue.value.id));
    notice.value = previousStatus === 'publie' && catalogue.value.statut === 'brouillon'
      ? 'Le catalogue est revenu en brouillon. Complétez sa composition puis publiez-le à nouveau.' : message;
    return true;
  } catch (failure) { error.value = failure.message; await nextTick(); errorSummary.value?.focus(); return false; }
  finally { busy.value = false; }
}
async function saveIdentity() {
  if (busy.value || catalogue.value?.archive || !identity.value.titre.trim()) return;
  const payload = { titre: identity.value.titre.trim(), papier_spe: identity.value.papier_spe.trim() || null, embellissement: identity.value.embellissement.trim() || null };
  if (isNew.value) {
    busy.value = true; error.value = '';
    try {
      const created = await store.createCatalogue(payload);
      identityBaseline.value = JSON.stringify(identity.value);
      await router.replace(`/catalogues/${created.id}`);
    } catch (failure) { error.value = failure.message; await nextTick(); errorSummary.value?.focus(); }
    finally { busy.value = false; }
  } else if (await mutate(() => cataloguesAPI.update(catalogue.value.id, payload), 'Informations enregistrées.')) syncIdentity();
}
async function addCollection() {
  if (!collectionName.value.trim() || catalogue.value.collections.length >= 4 || catalogue.value.archive) return;
  if (await mutate(() => cataloguesAPI.addCollection(catalogue.value.id, collectionName.value.trim()), 'Collection ajoutée.')) collectionName.value = '';
}
async function addRuban() {
  if (!rubanName.value.trim() || catalogue.value.rubans.length >= 2 || catalogue.value.archive) return;
  if (await mutate(() => cataloguesAPI.addRuban(catalogue.value.id, rubanName.value.trim()), 'Ruban ajouté.')) rubanName.value = '';
}
async function renameRuban(ruban) {
  if (!rubanNames.value[ruban.id]?.trim() || catalogue.value.archive) return;
  if (await mutate(() => cataloguesAPI.updateRuban(ruban.id, rubanNames.value[ruban.id].trim()), 'Ruban renommé.')) rubanNames.value[ruban.id] = catalogue.value.rubans.find(item => item.id === ruban.id).nom;
}
const savePrices = payload => mutate(() => cataloguesAPI.update(catalogue.value.id, payload), 'Tarifs du catalogue enregistrés.');
const publish = () => { if (!dirty.value && !requirements.value.length && !catalogue.value.archive) return mutate(() => cataloguesAPI.publish(catalogue.value.id), 'Catalogue publié.'); };
async function setArchive() {
  if (dirty.value) return;
  if (await mutate(() => cataloguesAPI.setArchive(catalogue.value.id, !catalogue.value.archive), catalogue.value.archive ? 'Catalogue restauré en brouillon.' : 'Catalogue archivé.')) archiveDialog.value = false;
}
const leave = () => !dirty.value || window.confirm('Des modifications ne sont pas enregistrées. Quitter ce catalogue ?');
onBeforeRouteLeave(leave);
onBeforeRouteUpdate(leave);
function warnBeforeUnload(event) {
  if (!dirty.value) return;
  event.preventDefault();
  event.returnValue = '';
}
watch(dirty, isDirty => {
  if (isDirty) window.addEventListener('beforeunload', warnBeforeUnload);
  else window.removeEventListener('beforeunload', warnBeforeUnload);
}, { immediate: true });
onBeforeUnmount(() => window.removeEventListener('beforeunload', warnBeforeUnload));
</script>

<style scoped>
.catalogue-back { display: inline-block; color: var(--text-secondary); margin-bottom: var(--spacing-5); }
.catalogue-eyebrow { color: var(--primary); font-size: 13px; font-weight: 600; margin-bottom: var(--spacing-2); }
.catalogue-editor-layout { display: grid; grid-template-columns: minmax(0, 1fr) 310px; gap: var(--spacing-6); align-items: start; }
.catalogue-editor-main { display: grid; gap: var(--spacing-5); min-width: 0; }
.catalogue-publication { position: sticky; top: 90px; }
.catalogue-requirements { padding-left: var(--spacing-5); display: grid; gap: var(--spacing-2); }
.catalogue-archive-action { border-top: 1px solid var(--border); padding-top: var(--spacing-5); }
@media (max-width: 1100px) { .catalogue-editor-layout { grid-template-columns: 1fr; } .catalogue-publication { position: static; } }
</style>
