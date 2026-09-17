<template>
  <Layout>
    <div class="catalogue-workspace">
      <header class="page-header">
        <div><h1 class="page-title">Catalogues</h1><p class="page-subtitle">Préparez vos collections et publiez les catalogues prêts à commander.</p></div>
        <Button @click="router.push('/catalogues/nouveau')">Nouveau catalogue</Button>
      </header>
      <nav class="catalogue-tabs" aria-label="Gestion des catalogues">
        <RouterLink to="/catalogues" :aria-current="tab === 'catalogues' ? 'page' : undefined" :class="{ active: tab === 'catalogues' }">Catalogues</RouterLink>
        <RouterLink to="/catalogues?onglet=parametres" :aria-current="tab === 'parametres' ? 'page' : undefined" :class="{ active: tab === 'parametres' }">Paramètres</RouterLink>
      </nav>
      <section v-if="tab === 'parametres'" class="catalogue-section settings-section">
        <h2>Tarifs par défaut</h2>
        <p>Chaque nouveau catalogue copie ces tarifs à sa création. Les catalogues existants conservent leurs propres prix.</p>
        <p v-if="settings.loading" role="status">Chargement des tarifs…</p>
        <div v-else-if="settings.error" role="alert"><p class="catalogue-error">{{ settings.error }}</p><Button variant="secondary" @click="loadSettings">Réessayer</Button></div>
        <CataloguePrices v-else :prices="settings.prix" :save-prices="saveDefaults" />
      </section>
      <template v-else>
        <div class="catalogue-toolbar">
          <label for="catalogue-search">Rechercher un catalogue<input id="catalogue-search" v-model="search" type="search" placeholder="Nom du catalogue" /></label>
          <label for="catalogue-filter">Afficher<select id="catalogue-filter" v-model="filter"><option value="actifs">Catalogues actifs</option><option value="archives">Catalogues archivés</option></select></label>
        </div>
        <p v-if="store.loading" role="status" class="catalogue-section">Chargement des catalogues…</p>
        <div v-else-if="store.error" role="alert" class="catalogue-section"><p class="catalogue-error">{{ store.error }}</p><Button variant="secondary" @click="loadCatalogues">Réessayer</Button></div>
        <div v-else-if="!visibleCatalogues.length" class="empty-state">
          <h2>{{ search ? 'Aucun résultat' : filter === 'archives' ? 'Aucun catalogue archivé' : 'Votre prochain catalogue commence ici' }}</h2>
          <p>{{ filter === 'archives' ? 'Les catalogues archivés restent consultables et peuvent être restaurés.' : 'Un nom libre, vos papiers et vos tarifs. Vous pouvez commencer par un brouillon.' }}</p>
          <Button v-if="!search && filter === 'actifs'" @click="router.push('/catalogues/nouveau')">Créer un catalogue</Button>
        </div>
        <div v-else class="catalogue-grid">
          <RouterLink v-for="catalogue in visibleCatalogues" :key="catalogue.id" :to="`/catalogues/${catalogue.id}`" class="catalogue-list-card">
            <div class="catalogue-card-top"><span class="catalogue-status" :class="{ published: catalogue.statut === 'publie' && !catalogue.archive }">{{ catalogue.archive ? 'Archivé' : catalogue.statut === 'publie' ? 'Publié' : 'Brouillon' }}</span><span aria-hidden="true">↗</span></div>
            <h2>{{ catalogue.titre }}</h2>
            <p>{{ catalogue.collections.length }} collection{{ catalogue.collections.length > 1 ? 's' : '' }} · {{ catalogue.rubans.length }} ruban{{ catalogue.rubans.length > 1 ? 's' : '' }}</p>
            <p class="catalogue-materials">{{ [catalogue.papier_spe, catalogue.embellissement].filter(Boolean).join(' · ') || 'Matériel à compléter' }}</p>
            <dl class="catalogue-card-prices"><div v-for="format in formats" :key="format"><dt>{{ format }}</dt><dd>{{ formatPrice(catalogue[`prix_${format}_cents`]) }}</dd></div></dl>
            <p class="catalogue-hint">{{ catalogue.archive ? 'Consulter ou restaurer' : catalogue.formats_disponibles.length ? `Disponible : ${catalogue.formats_disponibles.join(', ')}` : 'Préparation en cours' }}</p>
          </RouterLink>
        </div>
      </template>
    </div>
  </Layout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Layout from '../components/Layout.vue';
import Button from '../components/Button.vue';
import CataloguePrices from '../components/CataloguePrices.vue';
import { useCataloguesStore } from '../stores/catalogues';
import { useSettingsStore } from '../stores/settings';
import { formatPrice, formats } from '../utils/catalogue';
const route = useRoute();
const router = useRouter();
const store = useCataloguesStore();
const settings = useSettingsStore();
const search = ref('');
const filter = ref('actifs');
const tab = computed(() => route.query.onglet === 'parametres' ? 'parametres' : 'catalogues');
const visibleCatalogues = computed(() => store.catalogues.filter(catalogue => Boolean(catalogue.archive) === (filter.value === 'archives') && catalogue.titre.toLocaleLowerCase('fr').includes(search.value.trim().toLocaleLowerCase('fr'))));
const loadCatalogues = () => store.fetchCatalogues({ includeArchives: true });
const loadSettings = () => settings.fetchSettings().catch(() => {});
const saveDefaults = payload => settings.updateSettings(payload);
onMounted(() => { loadCatalogues(); loadSettings(); });
</script>

<style scoped>
.catalogue-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 290px), 1fr)); gap: var(--spacing-5); }
.catalogue-list-card { display: grid; gap: var(--spacing-3); padding: var(--spacing-6); background: var(--card); border: 1px solid var(--border); border-radius: var(--border-radius-xl); color: var(--text-primary); text-decoration: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.catalogue-list-card:hover { border-color: var(--primary); box-shadow: var(--shadow-card-hover); }
.catalogue-list-card h2 { font-family: var(--font-heading); font-size: 24px; overflow-wrap: anywhere; }
.catalogue-card-top { display: flex; align-items: center; justify-content: space-between; }
.catalogue-materials { color: var(--text-secondary); overflow-wrap: anywhere; }
.catalogue-card-prices { display: flex; gap: var(--spacing-6); padding: var(--spacing-4) 0; border-top: 1px solid var(--border); }
.catalogue-card-prices dt { font-size: 13px; color: var(--text-secondary); }
.catalogue-card-prices dd { font-weight: 600; font-variant-numeric: tabular-nums; }
.settings-section { max-width: 740px; }
</style>
