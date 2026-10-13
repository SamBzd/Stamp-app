<template>
  <Layout contained title="Catalogues" subtitle="Tes collections, leurs formats et leurs tarifs, au même endroit.">
    <div class="catalogue-workspace catalogue-list-workspace">
      <div class="catalogue-actions"><Button @click="openCreation" :disabled="editorBusy">Nouveau catalogue</Button></div>
      <div class="catalogue-browse" :class="{ 'catalogue-settings-only': tab === 'parametres', 'catalogue-preparing': editorMode }">
      <section class="catalogue-list-panel" v-following-bottom="{ body: followingListBody }" aria-label="Gestion des catalogues">
        <header id="catalogue-list-heading" class="catalogue-list-heading" tabindex="-1">
          <nav class="catalogue-list-tabs" aria-label="Gestion des catalogues">
            <RouterLink to="/catalogues" :aria-current="tab === 'catalogues' ? 'page' : undefined">Catalogues</RouterLink>
            <RouterLink to="/catalogues?onglet=parametres" :aria-current="tab === 'parametres' ? 'page' : undefined">Paramètres</RouterLink>
          </nav>
          <div v-show="tab === 'catalogues'" class="catalogue-list-tools">
            <p v-if="!store.loading && !store.error" role="status">{{ visibleCatalogues.length }} / {{ matchingStatusCount }}<span class="sr-only"> catalogues affichés</span></p>
            <button id="catalogue-filter-toggle" type="button" class="catalogue-filter-toggle" :aria-expanded="filtersExpanded" aria-controls="catalogue-filter-fields" :aria-label="filterSummary ? `Recherche et filtres, ${filterSummary}` : 'Recherche et filtres'" @click="toggleFilters">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
              Filtres <span v-if="activeFilterCount" class="filter-count">{{ activeFilterCount }}</span>
              <svg class="filter-chevron" :class="{ expanded: filtersExpanded }" aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m4 6 4 4 4-4"/></svg>
            </button>
          </div>
        </header>
        <div v-show="tab === 'catalogues'" class="catalogue-list-content">
          <div v-show="filtersExpanded" id="catalogue-filter-fields" class="catalogue-list-filters" role="region" aria-label="Recherche et filtres des catalogues">
            <div class="catalogue-search-field"><label for="catalogue-search">Rechercher un catalogue</label><input id="catalogue-search" v-model="search" type="search" placeholder="Nom du catalogue…" autocomplete="off" /></div>
            <div class="catalogue-status-field"><label for="catalogue-filter">Afficher</label><select id="catalogue-filter" v-model="filter"><option value="actifs">Catalogues actifs</option><option value="archives">Catalogues archivés</option></select></div>
            <button v-if="activeFilterCount" type="button" class="catalogue-filter-reset" @click="resetFilters">Effacer les filtres</button>
          </div>
          <div class="catalogue-list-state" v-if="store.loading" role="status">Chargement des catalogues…</div>
          <div v-else-if="store.error" role="alert" class="catalogue-list-state"><p class="catalogue-error">{{ store.error }}</p><Button variant="secondary" @click="loadCatalogues">Réessayer</Button></div>
          <div v-else-if="!visibleCatalogues.length" class="catalogue-list-state empty-state">
            <h2>{{ search.trim() ? 'Aucun catalogue ne correspond' : filter === 'archives' ? 'Aucun catalogue archivé' : 'Ton premier catalogue commence ici' }}</h2>
            <p>{{ search.trim() ? 'Essaie une autre recherche ou efface les filtres.' : filter === 'archives' ? 'Les catalogues archivés restent consultables et peuvent être restaurés.' : 'Commence par un brouillon, puis ajoute tes papiers et tes tarifs.' }}</p>
            <button v-if="activeFilterCount" type="button" class="catalogue-filter-reset" @click="resetFilters">Effacer les filtres</button>
            <Button v-else @click="openCreation" :disabled="editorBusy">Créer un catalogue</Button>
          </div>
          <ul v-else class="catalogue-list" aria-label="Catalogues">
            <li v-for="catalogue in visibleCatalogues" :key="catalogue.id">
              <button :id="`catalogue-open-${catalogue.id}`" type="button" class="catalogue-open" :aria-pressed="editorMode ? String(catalogue.id) === editorId : detailOpen && detailId === catalogue.id" :disabled="editorBusy" :aria-label="`Voir le détail de ${catalogue.titre}`" @click="selectCatalogue(catalogue)">
                <span class="catalogue-item-heading"><span class="catalogue-name">{{ catalogue.titre }}</span><span class="catalogue-list-status" :class="{ published: catalogue.statut === 'publie' && !catalogue.archive }">{{ catalogueStatus(catalogue) }}</span></span>
                <span class="catalogue-formats">{{ catalogue.formats_disponibles.length ? `Formats ${catalogue.formats_disponibles.join(', ')}` : 'Préparation en cours' }}</span>
                <svg class="catalogue-open-chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>
              </button>
            </li>
          </ul>
        </div>
        <!-- Keep the form mounted across query-only tab changes so unsaved inputs survive. -->
        <section v-show="tab === 'parametres'" class="catalogue-defaults" aria-labelledby="catalogue-defaults-title">
          <div class="catalogue-defaults-intro"><h2 id="catalogue-defaults-title">Tarifs par défaut</h2><p>Chaque nouveau catalogue copie ces tarifs à sa création. Les catalogues existants conservent leurs propres prix.</p></div>
          <p v-if="settings.loading" role="status">Chargement des tarifs…</p>
          <div v-else-if="settings.error" role="alert"><p class="catalogue-error">{{ settings.error }}</p><Button variant="secondary" @click="loadSettings">Réessayer</Button></div>
          <CataloguePrices v-else :prices="settings.prix" :save-prices="saveDefaults" />
        </section>
      </section>
      <div v-if="editorMode" class="catalogue-editor-slot">
        <CatalogueEditor :catalogue-id="editorId" @dirty="editorDirty = $event" @busy="editorBusy = $event" @created="onCreated" @close="exitEditor" />
      </div>
      <div v-else v-show="tab === 'catalogues'" class="catalogue-detail-slot" :class="{ 'catalogue-detail-slot-empty': !detailOpen }">
        <SlidePanel :is-open="detailOpen" :inline="desktopDetails" :title="`Catalogue : ${selectedSummary?.titre || ''}`" :return-focus-id="visibleCatalogues.some(item => item.id === detailId) ? `catalogue-open-${detailId}` : 'catalogue-list-heading'" @close="closeConsultation">
          <template #header><div class="catalogue-detail-heading"><h2>{{ selectedSummary?.titre }}</h2><p>{{ catalogueStatus(detailCatalogue || selectedSummary) }}</p></div></template>
          <p v-if="detailLoading" class="catalogue-detail-state" role="status">Chargement du catalogue…</p>
          <div v-else-if="detailError" class="catalogue-detail-state" role="alert"><p class="catalogue-error">{{ detailError }}</p><Button variant="secondary" @click="viewCatalogue(selectedSummary)">Réessayer</Button></div>
          <div v-else-if="detailCatalogue" class="catalogue-detail-content">
            <p v-if="detailCatalogue.archive" class="catalogue-detail-note">Catalogue archivé : sa composition reste consultable. Sa restauration se fait depuis la préparation.</p>
            <section class="catalogue-detail-section"><h3>Formats disponibles</h3><p>{{ detailCatalogue.formats_disponibles.length ? detailCatalogue.formats_disponibles.join(' · ') : 'Préparation en cours' }}</p></section>
            <section class="catalogue-detail-section"><h3>Tarifs du catalogue</h3><dl class="catalogue-detail-prices"><div v-for="format in formats" :key="format"><dt>Format {{ format }}</dt><dd>{{ formatPrice(detailCatalogue[`prix_${format}_cents`]) }}</dd></div></dl></section>
            <section class="catalogue-detail-section"><h3>Matériel</h3><dl class="catalogue-detail-material"><div><dt>Papier spécial</dt><dd>{{ detailCatalogue.papier_spe || 'Non renseigné' }}</dd></div><div><dt>Embellissement</dt><dd>{{ detailCatalogue.embellissement || 'Non renseigné' }}</dd></div></dl></section>
            <section class="catalogue-detail-section"><h3>Collections <span>{{ detailCatalogue.collections.length }}/4</span></h3><p v-if="!detailCatalogue.collections.length" class="catalogue-secondary">Aucune collection pour le moment.</p><ul v-else class="catalogue-detail-collections"><li v-for="collection in detailCatalogue.collections" :key="collection.id"><h4>{{ collection.nom }}</h4><p v-if="!collection.papiers.length" class="catalogue-secondary">Aucun papier sélectionné.</p><ul v-else><li v-for="papier in collection.papiers" :key="papier.id">{{ papier.nom }}<span v-if="papier.archive" class="catalogue-secondary"> — archivé</span></li></ul></li></ul></section>
            <section class="catalogue-detail-section"><h3>Rubans <span>{{ detailCatalogue.rubans.length }}/2</span></h3><p v-if="!detailCatalogue.rubans.length" class="catalogue-secondary">Aucun ruban.</p><ul v-else class="catalogue-detail-ribbons"><li v-for="ruban in detailCatalogue.rubans" :key="ruban.id">{{ ruban.nom }}</li></ul></section>
          </div>
          <div v-if="desktopDetails && detailCatalogue" class="catalogue-detail-actions"><RouterLink :to="`/catalogues/${detailCatalogue.id}`" class="catalogue-prepare">{{ detailCatalogue.archive ? 'Consulter ou restaurer' : 'Ouvrir la préparation' }}<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg></RouterLink></div>
          <template v-if="!desktopDetails" #footer><RouterLink v-if="detailCatalogue" :to="`/catalogues/${detailCatalogue.id}`" class="catalogue-prepare">{{ detailCatalogue.archive ? 'Consulter ou restaurer' : 'Ouvrir la préparation' }}<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg></RouterLink></template>
        </SlidePanel>
        <div v-if="!detailOpen" class="catalogue-detail-placeholder"><h2>Le détail de ton catalogue</h2><p>Sélectionne une fiche pour retrouver sa composition, son matériel et ses tarifs.</p></div>
      </div>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { vFollowingBottom } from '../directives/followingBottom';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router';
import Layout from '../components/Layout.vue';
import Button from '../components/Button.vue';
import SlidePanel from '../components/SlidePanel.vue';
import { cataloguesAPI } from '../services/api';
import CatalogueEditor from '../components/CatalogueEditor.vue';
import CataloguePrices from '../components/CataloguePrices.vue';
import { useCataloguesStore } from '../stores/catalogues';
import { useSettingsStore } from '../stores/settings';
import { formatPrice, formats } from '../utils/catalogue';
const followingListBody = ".catalogue-list-content:not([style*='display: none']), .catalogue-defaults:not([style*='display: none'])";
const route = useRoute();
const router = useRouter();
const store = useCataloguesStore();
const settings = useSettingsStore();
const search = ref('');
const filter = ref('actifs');
const filtersExpanded = ref(false);
const desktopMedia = window.matchMedia('(min-width: 901px)');
const desktopDetails = ref(desktopMedia.matches);
const updateDesktopDetails = event => { desktopDetails.value = event.matches; };
const editorId = computed(() => String(route.params.id || ''));
const editorMode = computed(() => Boolean(editorId.value));
const editorDirty = ref(false);
const editorBusy = ref(false);
let creationTarget = null;
const detailId = ref(null);
const detailOpen = ref(false);
const selectedSummary = ref(null);
const detailCatalogue = ref(null);
const detailLoading = ref(false);
const detailError = ref('');
let detailGeneration = 0;
const catalogueStatus = catalogue => catalogue?.archive ? 'Archivé' : catalogue?.statut === 'publie' ? 'Publié' : 'Brouillon';
async function viewCatalogue(catalogue) {
  if (!catalogue) return;
  const generation = ++detailGeneration;
  detailId.value = catalogue.id; selectedSummary.value = catalogue;
  detailCatalogue.value = null; detailError.value = ''; detailLoading.value = true; detailOpen.value = true;
  try {
    const detail = await cataloguesAPI.getById(catalogue.id);
    if (generation !== detailGeneration || !detailOpen.value) return;
    detailCatalogue.value = detail; selectedSummary.value = detail;
  } catch (failure) {
    if (generation === detailGeneration && detailOpen.value) detailError.value = failure.message || 'Impossible de charger ce catalogue.';
  } finally {
    if (generation === detailGeneration) detailLoading.value = false;
  }
}
function closeDetail() {
  ++detailGeneration; detailOpen.value = false; detailCatalogue.value = null; selectedSummary.value = null;
  detailLoading.value = false; detailError.value = '';
}
const tab = computed(() => !editorMode.value && route.query.onglet === 'parametres' ? 'parametres' : 'catalogues');
function canNavigate(to) {
  if (creationTarget && String(to.params.id || '') === creationTarget) return true;
  if (editorBusy.value) return false;
  return !editorDirty.value || window.confirm('Des modifications ne sont pas enregistrées. Quitter ce catalogue ?');
}
onBeforeRouteLeave(canNavigate);
onBeforeRouteUpdate(canNavigate);
function openCreation() { router.push('/catalogues/nouveau'); }
function exitEditor() { router.push(editorId.value === 'nouveau' ? '/catalogues' : `/catalogues?catalogue=${encodeURIComponent(editorId.value)}`); }
async function onCreated(catalogue) {
  creationTarget = String(catalogue.id);
  search.value = ''; filter.value = 'actifs';
  try { await router.replace(`/catalogues/${catalogue.id}`); } finally { creationTarget = null; }
}
function selectCatalogue(catalogue) {
  if (editorMode.value && editorId.value === String(catalogue.id)) return;
  if (!editorMode.value && String(route.query.catalogue) === String(catalogue.id)) return viewCatalogue(catalogue);
  router.push(`/catalogues?catalogue=${catalogue.id}`);
}
function closeConsultation() { closeDetail(); router.replace('/catalogues'); }
watch([editorId, () => route.query.catalogue, tab], ([pathId], previous) => {
  closeDetail();
  if (!previous || pathId !== previous[0]) { editorDirty.value = false; editorBusy.value = false; }
  if (editorMode.value || tab.value !== 'catalogues') return;
  const id = Number(route.query.catalogue);
  if (Number.isSafeInteger(id) && id > 0) viewCatalogue(store.catalogues.find(item => item.id === id) || { id, titre: '' });
}, { immediate: true });
const matchingStatusCount = computed(() => store.catalogues.filter(catalogue => Boolean(catalogue.archive) === (filter.value === 'archives')).length);
const visibleCatalogues = computed(() => store.catalogues.filter(catalogue => Boolean(catalogue.archive) === (filter.value === 'archives') && catalogue.titre.toLocaleLowerCase('fr').includes(search.value.trim().toLocaleLowerCase('fr'))));
const activeFilterCount = computed(() => Number(Boolean(search.value.trim())) + Number(filter.value === 'archives'));
const filterSummary = computed(() => [search.value.trim(), filter.value === 'archives' ? 'catalogues archivés' : ''].filter(Boolean).join(', '));
async function toggleFilters() {
  filtersExpanded.value = !filtersExpanded.value;
  if (filtersExpanded.value) { await nextTick(); document.getElementById('catalogue-search')?.focus(); }
}
async function resetFilters() {
  search.value = ''; filter.value = 'actifs';
  await nextTick();
  document.getElementById(filtersExpanded.value ? 'catalogue-search' : 'catalogue-filter-toggle')?.focus();
}
const loadCatalogues = () => store.fetchCatalogues({ includeArchives: true });
const loadSettings = () => settings.fetchSettings().catch(() => {});
const saveDefaults = payload => settings.updateSettings(payload);
watch([search, filter, tab], async () => {
  if (!detailOpen.value || (tab.value === 'catalogues' && visibleCatalogues.value.some(item => item.id === detailId.value))) return;
  const focused = document.activeElement;
  closeDetail();
  await nextTick(); await nextTick();
  if (focused?.isConnected) focused.focus();
});
onMounted(() => { desktopMedia.addEventListener('change', updateDesktopDetails); loadCatalogues(); loadSettings(); });
onUnmounted(() => { desktopMedia.removeEventListener('change', updateDesktopDetails); ++detailGeneration; });
</script>

<style scoped>
.catalogue-actions { flex-shrink: 0; display: flex; justify-content: flex-end; margin-bottom: 14px; }
.catalogue-list-panel { display: flex; flex-direction: column; background: var(--card); border-radius: 12px; overflow: hidden; }
.catalogue-list-heading { flex-shrink: 0; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0 12px; padding: 0 18px; border-bottom: 1px solid var(--border-light); }
.catalogue-list-tabs { display: flex; gap: 16px; }
.catalogue-list-tabs a { display: inline-flex; align-items: center; min-height: 56px; padding: 12px 6px; border-bottom: 2px solid transparent; color: var(--text-secondary); text-decoration: none; font-size: var(--font-size-sm); }
.catalogue-list-tabs a:focus-visible { outline-offset: -3px; }
.catalogue-list-tabs a:hover { color: var(--primary); border-bottom-color: var(--border); }
.catalogue-list-tabs a[aria-current="page"] { color: var(--primary); border-bottom-color: var(--primary); font-weight: 600; }
.catalogue-list-tools { display: flex; align-items: center; gap: 12px; color: var(--text-secondary); font-size: var(--font-size-xs); }
.catalogue-list-workspace .catalogue-filter-toggle { display: inline-flex; align-items: center; gap: 6px; padding: 8px; border: 0; background: transparent; font-size: var(--font-size-xs); color: var(--text-secondary); }
.catalogue-filter-toggle:hover, .catalogue-filter-toggle[aria-expanded="true"] { background: var(--primary-light); color: var(--primary); }
.catalogue-filter-toggle svg { width: 17px; height: 17px; }
.catalogue-filter-toggle .filter-chevron { width: 12px; height: 12px; }
.filter-chevron.expanded { transform: rotate(180deg); }
.filter-count { min-width: 17px; padding: 1px 4px; border-radius: 4px; background: var(--primary); color: var(--primary-foreground); text-align: center; }
.catalogue-list-filters { display: flex; flex-wrap: wrap; align-items: end; gap: 12px; padding: 14px 18px; border-bottom: 1px solid var(--border-light); }
.catalogue-search-field { flex: 1 1 200px; min-width: 0; }
.catalogue-status-field { flex: 0 1 220px; min-width: 0; }
.catalogue-list-workspace .catalogue-list-filters label { font-size: var(--font-size-xs); color: var(--text-secondary); font-weight: 400; margin-bottom: 6px; }
.catalogue-list-workspace .catalogue-filter-reset { border: 0; padding: 8px 0; color: var(--primary); background: transparent; text-decoration: underline; text-underline-offset: 3px; font-size: var(--font-size-xs); }
.catalogue-list-state { display: grid; justify-items: start; gap: 12px; padding: 24px; }
.catalogue-list-state.empty-state { justify-items: center; }
.catalogue-browse { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 16px; align-items: start; transition: grid-template-columns 280ms cubic-bezier(.2,.7,.2,1); }
.catalogue-browse.catalogue-preparing { grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); }
.catalogue-editor-slot { min-height: 0; grid-column: 2; grid-row: 1; min-width: 0; animation: catalogue-editor-enter 220ms ease-out; }
@keyframes catalogue-editor-enter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.catalogue-preparing .catalogue-list-heading { padding-inline: 12px; }
.catalogue-preparing .catalogue-list-tabs { flex-wrap: wrap; gap: 4px; }
.catalogue-preparing .catalogue-list-tabs a { padding-inline: 4px; }
.catalogue-preparing .catalogue-list-tools { width: 100%; justify-content: space-between; }
.catalogue-preparing .catalogue-item-heading { gap: 4px; }
.catalogue-preparing .catalogue-list-status { flex-basis: 100%; }
.catalogue-list-panel { grid-column: 1; min-width: 0; }
.catalogue-settings-only { grid-template-columns: 1fr; }
.catalogue-settings-only .catalogue-list-panel { grid-column: 1; }
.catalogue-detail-slot { grid-column: 2; grid-row: 1; min-width: 0; }
.catalogue-detail-placeholder { background: var(--card); border-radius: var(--border-radius-xl); box-shadow: var(--shadow-sm); padding: 24px 18px; }
.catalogue-detail-placeholder h2 { color: var(--primary); font-size: var(--font-size-lg); margin-bottom: 12px; }
.catalogue-detail-placeholder p { color: var(--text-secondary); line-height: 1.65; }
.catalogue-list { list-style: none; padding: 0; margin: 0; }
.catalogue-list li + li { border-top: 1px solid var(--border-light); }
.catalogue-list-workspace .catalogue-open { position: relative; display: grid; gap: 6px; width: 100%; min-height: 72px; border: 0; border-radius: 0; background: var(--card); text-align: left; padding: 12px 44px 12px 20px; }
.catalogue-list-workspace .catalogue-open:hover { background: var(--surface-hover); }
.catalogue-list-workspace .catalogue-open[aria-pressed="true"] { background: var(--surface-selected); box-shadow: inset 3px 0 var(--primary); }
.catalogue-list-workspace .catalogue-open:focus-visible { outline-offset: -4px; }
.catalogue-item-heading { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 12px; }
.catalogue-name { font-size: var(--font-size-base); font-weight: 600; color: var(--primary); overflow-wrap: anywhere; }
.catalogue-list-status { font-size: var(--font-size-xs); color: var(--text-secondary); }
.catalogue-list-status.published { color: var(--success-dark); }
.catalogue-secondary { color: var(--text-secondary); font-size: var(--font-size-xs); }
.catalogue-formats { color: var(--text-secondary); font-size: var(--font-size-xs); }
.catalogue-open-chevron { position: absolute; top: calc(50% - 9px); right: 18px; width: 18px; height: 18px; color: var(--primary); }
.catalogue-detail-heading { min-width: 0; }
.catalogue-detail-heading h2 { color: var(--primary); font-size: var(--font-size-xl); font-weight: 600; overflow-wrap: anywhere; }
.catalogue-detail-heading p { color: var(--text-secondary); font-size: var(--font-size-xs); margin-top: 4px; }
.catalogue-detail-slot :deep(.slide-panel-header) { gap: 12px; }
.catalogue-detail-actions { display: flex; justify-content: flex-end; padding-top: 16px; margin-top: 16px; border-top: 1px solid var(--border-light); }
.catalogue-detail-state { padding-top: 18px; display: grid; gap: 12px; }
.catalogue-detail-content { font-size: var(--font-size-sm); overflow-wrap: anywhere; }
.catalogue-detail-section { padding: 16px 0; border-bottom: 1px solid var(--border-light); }
.catalogue-detail-section:last-child { border-bottom: 0; padding-bottom: 0; }
.catalogue-detail-section h3 { display: flex; justify-content: space-between; gap: 12px; font-size: var(--font-size-sm); color: var(--primary); font-weight: 600; margin-bottom: 8px; }
.catalogue-detail-section h3 span { color: var(--text-secondary); font-size: var(--font-size-xs); font-weight: 400; }
.catalogue-detail-prices { display: grid; gap: 6px; }
.catalogue-detail-prices div { display: flex; justify-content: space-between; gap: 12px; }
.catalogue-detail-prices dd { font-variant-numeric: tabular-nums; font-weight: 600; }
.catalogue-detail-material { display: grid; gap: 10px; }
.catalogue-detail-material dt { font-size: var(--font-size-xs); color: var(--text-secondary); }
.catalogue-detail-collections { list-style: none; padding: 0; display: grid; gap: 12px; }
.catalogue-detail-collections h4 { font-size: var(--font-size-sm); font-weight: 500; margin-bottom: 4px; }
.catalogue-detail-collections ul, .catalogue-detail-ribbons { padding-left: 18px; }
.catalogue-detail-note { padding: 12px 0; color: var(--text-secondary); font-size: var(--font-size-xs); }
.catalogue-prepare { display: inline-flex; align-items: center; justify-content: center; gap: 12px; min-height: 44px; padding: 10px 14px; background: var(--primary); color: var(--primary-foreground); border-radius: 6px; text-decoration: none; font-size: var(--font-size-sm); }
.catalogue-prepare:hover { filter: brightness(.95); }
.catalogue-prepare svg { flex: 0 0 16px; width: 16px; height: 16px; }
.catalogue-defaults { display: grid; gap: 24px; max-width: 760px; padding: 24px; }
.catalogue-defaults-intro { display: grid; gap: 8px; }
.catalogue-defaults h2 { color: var(--primary); font-size: 20px; font-weight: 600; }
.catalogue-defaults-intro p { color: var(--text-secondary); font-size: var(--font-size-sm); }
.catalogue-defaults :deep(.price-field label) { font-size: var(--font-size-sm); color: var(--primary); }
.catalogue-defaults :deep(.catalogue-hint) { font-size: var(--font-size-xs); }
.catalogue-list-content { min-height: 0; overflow-y: auto; overscroll-behavior: contain; flex: 1; }
.catalogue-defaults { min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
@media (min-width: 901px) {
  .catalogue-list-content { flex: 0 1 auto; scroll-padding-block: 12px; }
  .catalogue-defaults { padding-bottom: var(--dock-clearance); }
  .catalogue-detail-slot :deep(.slide-panel-inline .slide-panel-body) { padding-bottom: var(--dock-clearance); scroll-padding-bottom: 18px; overscroll-behavior: contain; scrollbar-gutter: stable; }
  .catalogue-list-workspace { display: flex; flex-direction: column; min-height: 0; flex: 1; }
  .catalogue-browse { flex: 1; min-height: 0; grid-template-rows: minmax(0, 1fr); align-items: stretch; }
  .catalogue-list-panel { min-height: 0; height: auto; align-self: start; max-height: calc(100% - var(--dock-clearance)); }
  .catalogue-list-heading { flex-shrink: 0; }
  .catalogue-detail-slot { min-height: 0; height: 100%; }
  .catalogue-detail-slot-empty { height: auto; align-self: start; }
  .catalogue-detail-slot :deep(.slide-panel-inline) { height: 100%; }
  .catalogue-detail-slot :deep(.slide-panel-inline .slide-panel) { height: 100%; min-height: 0; max-height: 100%; }
}
@media (max-width: 900px) { .catalogue-browse, .catalogue-browse.catalogue-preparing { grid-template-columns: 1fr; } .catalogue-editor-slot { grid-column: 1; grid-row: 1; } .catalogue-preparing .catalogue-list-panel { grid-row: 2; } .catalogue-list-panel { max-height: 50dvh; } .catalogue-list-panel { grid-column: 1; } .catalogue-detail-placeholder { display: none; } .catalogue-detail-slot { display: contents; } }
@media (max-width: 600px) {
  .catalogue-list-heading { padding-inline: 10px; gap: 0 4px; }
  .catalogue-list-tabs { gap: 8px; }
  .catalogue-list-tabs a { padding-inline: 4px; }
  .catalogue-list-tools { gap: 6px; }
  .catalogue-list-workspace .catalogue-open { padding-left: 16px; }
  .catalogue-list-filters, .catalogue-defaults { padding: 16px 12px; }
}
@media (prefers-reduced-motion: reduce) { .catalogue-browse { transition: none; } .catalogue-editor-slot { animation: none; } }
</style>
