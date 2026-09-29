<template>
  <Layout>
    <div class="catalogue-workspace papers-workspace">
      <header class="page-header">
        <div>
          <h1 class="page-title">Bibliothèque des papiers</h1>
          <p class="page-subtitle">Créez une seule fois vos papiers, puis réutilisez-les dans vos catalogues.</p>
        </div>
      </header>

      <section class="catalogue-section paper-create-section">
        <div>
          <h2>Nouveau papier</h2>
          <p>Les espaces au début et à la fin ainsi que les différences de majuscules ne créent pas de doublon.</p>
        </div>
        <form class="catalogue-inline-form" @submit.prevent="createPaper">
          <label for="paper-name">Nom du papier<input id="paper-name" v-model="newName" autocomplete="off" placeholder="Ex. Kraft naturel" required /></label>
          <Button type="submit" :loading="creating" :disabled="!newName.trim()">Créer le papier</Button>
        </form>
      </section>

      <p v-if="error" class="catalogue-alert catalogue-error" role="alert">{{ error }}</p>
      <p v-if="notice" class="catalogue-alert catalogue-success" role="status">{{ notice }}</p>

      <div class="catalogue-toolbar papers-toolbar">
        <label for="paper-search">Rechercher<input id="paper-search" v-model="search" type="search" placeholder="Nom du papier" /></label>
        <label for="paper-filter">Afficher<select id="paper-filter" v-model="filter"><option value="actifs">Papiers actifs</option><option value="archives">Papiers archivés</option></select></label>
      </div>

      <p v-if="loading" class="catalogue-section" role="status">Chargement de la bibliothèque…</p>
      <div v-else-if="!visiblePapers.length" class="empty-state">
        <h2>{{ search ? 'Aucun papier trouvé' : filter === 'archives' ? 'Aucun papier archivé' : 'La bibliothèque est vide' }}</h2>
        <p>{{ search ? 'Essayez un autre nom ou créez ce papier avec le formulaire ci-dessus.' : filter === 'archives' ? 'Les papiers archivés apparaîtront ici.' : 'Créez votre premier papier pour le proposer dans les collections.' }}</p>
      </div>
      <section v-else class="papers-list" aria-label="Papiers de la bibliothèque">
        <article v-for="paper in visiblePapers" :key="paper.id" class="paper-card">
          <div class="paper-card-heading">
            <div>
              <h2>{{ paper.nom }}</h2>
              <span class="catalogue-status" :class="{ published: !paper.archive }">{{ paper.archive ? 'Archivé' : 'Actif' }}</span>
            </div>
          </div>

          <form v-if="editingId === paper.id" class="catalogue-inline-form" @submit.prevent="renamePaper(paper)">
            <label :for="`paper-${paper.id}-name`">Nouveau nom<input :id="`paper-${paper.id}-name`" v-model="editedName" required /></label>
            <div class="catalogue-actions">
              <Button variant="secondary" size="sm" :disabled="busyId === paper.id" @click="cancelRename">Annuler</Button>
              <Button type="submit" size="sm" :loading="busyId === paper.id" :disabled="!editedName.trim()">Enregistrer</Button>
            </div>
          </form>
          <div v-else class="catalogue-actions">
            <Button variant="secondary" size="sm" :disabled="busyId !== null" @click="startRename(paper)">Renommer</Button>
            <Button v-if="paper.archive" variant="secondary" size="sm" :loading="busyId === paper.id" :disabled="busyId !== null && busyId !== paper.id" @click="restorePaper(paper)">Restaurer</Button>
            <Button v-else variant="danger" size="sm" :disabled="busyId !== null" @click="paperToArchive = paper">Archiver</Button>
          </div>
        </article>
      </section>
    </div>

    <ConfirmDialog
      :is-open="Boolean(paperToArchive)"
      title="Archiver ce papier ?"
      :message="paperToArchive ? `« ${paperToArchive.nom} » ne sera plus proposé dans les nouvelles sélections. Il restera visible dans les collections existantes et les commandes passées.` : ''"
      confirm-text="Archiver"
      variant="danger"
      :loading="busyId === paperToArchive?.id"
      @confirm="archivePaper"
      @cancel="paperToArchive = null"
    />
  </Layout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import Layout from '../components/Layout.vue';
import Button from '../components/Button.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import { papierCartonnesAPI } from '../services/api';

const papers = ref([]);
const loading = ref(false);
const creating = ref(false);
const busyId = ref(null);
const error = ref('');
const notice = ref('');
const newName = ref('');
const search = ref('');
const filter = ref('actifs');
const editingId = ref(null);
const editedName = ref('');
const paperToArchive = ref(null);
const normalizeName = value => value.trim().normalize('NFC').toLocaleLowerCase('fr');

const visiblePapers = computed(() => {
  const needle = normalizeName(search.value);
  return papers.value.filter(paper => Boolean(paper.archive) === (filter.value === 'archives')
    && normalizeName(paper.nom).includes(needle));
});

function replacePaper(updated) {
  papers.value = papers.value.map(paper => paper.id === updated.id ? updated : paper);
}
function beginAction() { error.value = ''; notice.value = ''; }
async function loadPapers() {
  loading.value = true;
  beginAction();
  try { papers.value = await papierCartonnesAPI.search('', { includeArchives: true }); }
  catch (failure) { error.value = failure.message; }
  finally { loading.value = false; }
}
async function createPaper() {
  if (!newName.value.trim() || creating.value) return;
  creating.value = true;
  beginAction();
  try {
    const created = await papierCartonnesAPI.create(newName.value.trim());
    papers.value.push(created);
    papers.value.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    notice.value = `« ${created.nom} » a été ajouté à la bibliothèque.`;
    newName.value = '';
    filter.value = 'actifs';
  } catch (failure) { error.value = failure.message; }
  finally { creating.value = false; }
}
function startRename(paper) { editingId.value = paper.id; editedName.value = paper.nom; beginAction(); }
function cancelRename() { editingId.value = null; editedName.value = ''; }
async function renamePaper(paper) {
  if (!editedName.value.trim() || busyId.value !== null) return;
  busyId.value = paper.id;
  beginAction();
  try {
    const updated = await papierCartonnesAPI.update(paper.id, editedName.value.trim());
    replacePaper(updated);
    notice.value = `« ${updated.nom} » a été renommé. Les commandes passées conservent leur ancien libellé.`;
    cancelRename();
  } catch (failure) { error.value = failure.message; }
  finally { busyId.value = null; }
}
async function setArchive(paper, archive) {
  if (busyId.value !== null) return;
  busyId.value = paper.id;
  beginAction();
  try {
    const updated = await papierCartonnesAPI.setArchive(paper.id, archive);
    replacePaper(updated);
    notice.value = archive ? `« ${updated.nom} » a été archivé.` : `« ${updated.nom} » est de nouveau disponible.`;
    filter.value = archive ? 'archives' : 'actifs';
  } catch (failure) { error.value = failure.message; }
  finally { busyId.value = null; paperToArchive.value = null; }
}
const archivePaper = () => paperToArchive.value && setArchive(paperToArchive.value, true);
const restorePaper = paper => setArchive(paper, false);

onMounted(loadPapers);
</script>

<style scoped>
.papers-workspace { max-width: 980px; }
.paper-create-section { margin-bottom: var(--spacing-6); }
.paper-create-section > div { display: grid; gap: var(--spacing-2); }
.papers-toolbar { margin-top: var(--spacing-6); }
.papers-list { display: grid; gap: var(--spacing-3); }
.paper-card { display: grid; gap: var(--spacing-4); padding: var(--spacing-5); border: 1px solid var(--border); border-radius: var(--border-radius-xl); background: var(--card); }
.paper-card-heading > div { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-3); }
.paper-card h2 { min-width: 0; font-family: var(--font-heading); font-size: var(--font-size-lg); overflow-wrap: anywhere; }
.paper-card .catalogue-inline-form { padding-top: var(--spacing-3); border-top: 1px solid var(--border-light); }
@media (max-width: 640px) { .paper-card-heading > div { align-items: flex-start; flex-direction: column; } }
</style>
