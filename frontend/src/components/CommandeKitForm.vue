<template>
  <Modal :is-open="isOpen && !confirmClose" :title="commande ? `Modifier le kit #${commande.id}` : 'Nouveau kit'" max-width="760px" @close="requestClose">
    <form :id="formId" class="kit-form" novalidate @submit.prevent="handleSubmit">
      <p v-if="loading" role="status">Chargement des clientes et catalogues…</p>
      <div v-if="loadError" class="error-box" role="alert"><p>{{ loadError }}</p><Button variant="secondary" @click="loadForm">Réessayer</Button></div>
      <div v-if="Object.keys(errors).length" ref="errorSummary" tabindex="-1" class="error-box" role="alert">
        <p>La commande n’a pas été enregistrée.</p>
        <ul><li v-for="(message, key) in errors" :key="key"><a v-if="errorTarget(key)" :href="`#${errorTarget(key)}`" @click.prevent="focusError(key)">{{ message }}</a><span v-else>{{ message }}</span></li></ul>
      </div>
      <fieldset :disabled="loading || saving || Boolean(loadError) || Boolean(commande?.reglee)" class="form-body">
        <p v-if="commande" class="notice">L’édition recalcule le prix et la composition depuis le catalogue actuel. L’ancien prix {{ formatMoney(commande.prix_applique_cents) }} ({{ commande.prix_origine }}) n’est pas reconduit automatiquement.</p>
        <p v-if="commande?.reglee" class="notice">Cette commande est réglée et ne peut plus être modifiée.</p>
        <section>
          <h3>1. Cliente et catalogue</h3>
          <div class="field">
            <label :for="id('client_id')">Cliente *</label>
            <select :id="id('client_id')" v-model="form.client_id" :disabled="Boolean(commande)" :aria-invalid="Boolean(errors.client_id)">
              <option value="" disabled>Choisir une cliente…</option>
              <option v-if="commande" :value="String(commande.client_id)">{{ commande.client?.prenom }} {{ commande.client?.nom }} — cliente conservée</option>
              <template v-else><option v-for="client in clients" :key="client.id" :value="String(client.id)">{{ client.prenom }} {{ client.nom }}</option></template>
            </select>
            <p v-if="errors.client_id" class="field-error">{{ errors.client_id }}</p>
            <p v-if="!commande && !clients.length && !loading" class="hint">Aucune cliente active. Créez ou restaurez une cliente avant de commander.</p>
          </div>
          <div class="field">
            <label :for="id('catalogue_id')">Catalogue *</label>
            <select :id="id('catalogue_id')" :value="form.catalogue_id" :disabled="!form.client_id" :aria-invalid="Boolean(errors.catalogue_id)" @change="changeCatalogue($event.target.value)">
              <option value="" disabled>Choisir un catalogue publié…</option>
              <option v-for="catalogue in catalogues" :key="catalogue.id" :value="String(catalogue.id)">{{ catalogue.titre }}{{ catalogue.id === commande?.catalogue_id && (catalogue.archive || catalogue.statut !== 'publie') ? ' — catalogue d’origine' : '' }}</option>
            </select>
            <p v-if="!catalogues.length && !loading" class="hint">Aucun catalogue publié disponible. Préparez et publiez un catalogue avant de commander.</p>
            <p v-if="catalogueDetail && !formats.length" class="field-error">Le catalogue est devenu incomplet. Complétez-le ou choisissez un autre catalogue.</p>
            <p v-if="catalogueDetail?.archive || catalogueDetail?.statut === 'brouillon'" class="hint">Le catalogue d’origine reste utilisable pour cette édition s’il est complet.</p>
          </div>
        </section>
        <section v-if="catalogueDetail">
          <h3>2. Format et composition</h3>
          <fieldset class="choices"><legend>Format *</legend>
            <label v-for="format in ['A', 'B', 'C']" :key="format" class="choice" :class="{ selected: form.format_type === format, unavailable: !formats.includes(format) }">
              <input :id="id(`format-${format}`)" type="radio" :name="id('format_type')" :value="format" :checked="form.format_type === format" :disabled="!formats.includes(format)" @change="changeFormat(format)" />
              <span><strong>Format {{ format }}</strong><span>{{ formatMoney(catalogueDetail[`prix_${format}_cents`]) }}</span><small>{{ format === 'C' ? '1 collection' : formats.includes(format) ? '2 collections' : '2 collections requises' }}</small></span>
            </label>
          </fieldset>
          <p class="hint">Tarifs propres à « {{ catalogueDetail.titre }} ».</p>
          <div v-for="(line, index) in form.collections" :key="index" class="collection-slot">
            <div class="field">
              <label :for="id(`collection_${index}`)">{{ form.format_type === 'C' ? 'Collection' : `Collection ${index + 1}` }} *</label>
              <select :id="id(`collection_${index}`)" :value="line.collection_id" :aria-invalid="Boolean(errors[`collection_${index}`])" @change="changeCollection(index, $event.target.value)">
                <option value="" disabled>Choisir une collection…</option>
                <option v-for="collection in catalogueDetail.collections" :key="collection.id" :value="String(collection.id)" :disabled="form.format_type !== 'C' && String(form.collections[1 - index]?.collection_id) === String(collection.id)">{{ collection.nom }}</option>
              </select>
              <p v-if="errors[`collection_${index}`]" class="field-error">{{ errors[`collection_${index}`] }}</p>
            </div>
            <fieldset v-if="form.format_type !== 'C'" class="contributions"><legend>Contribution de cette collection</legend>
              <label v-for="quantity in [2, 3]" :key="quantity"><input type="radio" :name="id(`contribution-${index}`)" :checked="line.nb_feuilles === quantity" @change="setKitContribution(form, catalogueDetail, index, quantity)" /> {{ quantity }} feuilles</label>
            </fieldset>
            <div v-if="line.collection_id" :id="id(`papiers_${index}`)" tabindex="-1" class="papers">
              <p v-if="form.format_type === 'C'" class="hint">Conservez au moins un exemplaire de chaque papier et complétez jusqu’à 5 feuilles.</p>
              <div v-for="paper in line.papiers" :key="paper.papier_cartonne_id" class="paper-row">
                <label :for="id(`quantity-${index}-${paper.papier_cartonne_id}`)">{{ paperName(index, paper.papier_cartonne_id) }}</label>
                <input :id="id(`quantity-${index}-${paper.papier_cartonne_id}`)" v-model.number="paper.quantite_base" type="number" inputmode="numeric" :min="form.format_type === 'C' ? 1 : 0" :max="line.nb_feuilles" step="1" :aria-invalid="Boolean(errors[`papiers_${index}`])" :aria-describedby="errors[`papiers_${index}`] ? id(`paper-error-${index}`) : undefined" />
                <span class="hint">base {{ paper.quantite_base || 0 }} → à préparer {{ (paper.quantite_base || 0) * multiplier }}</span>
              </div>
              <p class="allocation" role="status">{{ allocated(line) }} / {{ line.nb_feuilles }} feuilles de base — {{ remainingText(line) }}</p>
              <p v-if="errors[`papiers_${index}`]" :id="id(`paper-error-${index}`)" class="field-error">{{ errors[`papiers_${index}`] }}</p>
            </div>
          </div>
        </section>
        <section v-if="form.format_type">
          <h3>3. Matériaux et suppléments</h3>
          <div v-if="catalogueDetail.rubans.length === 2" class="field"><label :for="id('ruban_id')">Ruban *</label><select :id="id('ruban_id')" v-model="form.ruban_id" :aria-invalid="Boolean(errors.ruban_id)"><option value="" disabled>Choisir un ruban…</option><option v-for="ruban in catalogueDetail.rubans" :key="ruban.id" :value="String(ruban.id)">{{ ruban.nom }}</option></select><p v-if="errors.ruban_id" class="field-error">{{ errors.ruban_id }}</p></div>
          <p v-else class="hint">{{ catalogueDetail.rubans.length ? `Ruban inclus automatiquement : ${catalogueDetail.rubans[0].nom} ×1` : 'Aucun ruban dans ce catalogue.' }}</p>
          <label class="check"><input v-model="form.papier_supplementaire" type="checkbox" /> Papier supplémentaire (+3,50 €) — les papiers sont doublés</label>
          <p class="hint">Le ruban, le papier spécial et l’embellissement restent chacun en un exemplaire.</p>
          <div v-for="category in supplementCategories" :key="category.key" class="extras-row">
            <div class="field"><label :for="id(`${category.key}_texte`)">{{ category.label }} — libellé</label><input :id="id(`${category.key}_texte`)" v-model="form[`${category.key}_texte`]" type="text" :aria-invalid="Boolean(errors[`${category.key}_texte`])" /><p v-if="errors[`${category.key}_texte`]" class="field-error">{{ errors[`${category.key}_texte`] }}</p></div>
            <div class="field"><label :for="id(`${category.key}_prix`)">Montant (€)</label><input :id="id(`${category.key}_prix`)" v-model="form[`${category.key}_prix`]" inputmode="decimal" placeholder="0,00" :aria-invalid="Boolean(errors[`${category.key}_prix`])" /><p v-if="errors[`${category.key}_prix`]" class="field-error">{{ errors[`${category.key}_prix`] }}</p></div>
          </div>
          <p class="hint">Renseignez ensemble le libellé et le montant ; laissez les deux vides pour ne pas ajouter de supplément.</p>
        </section>
        <section v-if="form.format_type">
          <h3>4. Prix et paiement</h3>
          <p class="price-line">Total calculé <strong>{{ formatMoney(pricing.automatic) }}</strong></p>
          <label class="check"><input :checked="form.prix_manuel" type="checkbox" @change="toggleManual($event.target.checked)" /> Corriger manuellement le total</label>
          <div v-if="form.prix_manuel" class="field"><label :for="id('prix_manuel_euros')">Total manuel (€) *</label><input :id="id('prix_manuel_euros')" v-model="form.prix_manuel_euros" inputmode="decimal" :aria-invalid="Boolean(errors.prix_manuel_euros)" /><p v-if="errors.prix_manuel_euros" class="field-error">{{ errors.prix_manuel_euros }}</p></div>
          <div class="extras-row"><div class="field"><label :for="id('methode_paiement')">Méthode de paiement *</label><select :id="id('methode_paiement')" v-model="form.methode_paiement" :aria-invalid="Boolean(errors.methode_paiement)"><option value="" disabled>Choisir…</option><option v-for="payment in PAYMENTS" :key="payment" :value="payment">{{ payment }}</option></select><p v-if="errors.methode_paiement" class="field-error">{{ errors.methode_paiement }}</p></div><div class="field"><label :for="id('date_commande')">Date de commande</label><input :id="id('date_commande')" v-model="form.date_commande" type="date" /></div></div>
        </section>
        <section v-if="form.format_type" class="summary" aria-label="Résumé avant enregistrement">
          <h3>Résumé du kit</h3><p>{{ catalogueDetail.titre }} · Format {{ form.format_type }}</p>
          <div v-for="(line, index) in form.collections" :key="index"><strong>{{ collectionName(line) || 'Collection à choisir' }}</strong><ul><li v-for="paper in line.papiers.filter(p => Number(p.quantite_base) > 0)" :key="paper.papier_cartonne_id">{{ paperName(index, paper.papier_cartonne_id) }} : {{ paper.quantite_base }} de base → {{ paper.quantite_base * multiplier }} à préparer</li></ul></div>
          <p>Papiers : {{ form.collections.reduce((sum, line) => sum + allocated(line), 0) }} de base → {{ form.collections.reduce((sum, line) => sum + allocated(line), 0) * multiplier }} à préparer</p>
          <p v-if="selectedRuban">Ruban : {{ selectedRuban.nom }} ×1</p><p v-if="catalogueDetail.papier_spe">Papier spécial : {{ catalogueDetail.papier_spe }} ×1</p><p v-if="catalogueDetail.embellissement">Embellissement : {{ catalogueDetail.embellissement }} ×1</p>
          <p>Tarif du format : {{ formatMoney(catalogueDetail[`prix_${form.format_type}_cents`]) }} · Option : {{ formatMoney(form.papier_supplementaire ? OPTION_CENTS : 0) }}</p>
          <p v-for="category in supplementCategories.filter(c => form[`${c.key}_texte`] || form[`${c.key}_prix`])" :key="category.key">{{ category.label }} : {{ form[`${category.key}_texte`] }} — {{ formatMoney(pricing.supplements[category.key].prix_cents) }}</p>
          <p class="price-line">Total à enregistrer <strong>{{ formatMoney(pricing.applied) }}</strong></p><p>Origine du prix : {{ form.prix_manuel ? 'manuelle' : 'automatique' }} · Commande non réglée</p><p class="hint">Le détail enregistré affichera les prix et la composition confirmés par le serveur.</p>
        </section>
      </fieldset>
    </form>
    <template #footer><Button variant="secondary" :disabled="saving" @click="requestClose">Annuler</Button><Button type="submit" :form="formId" :disabled="loading || Boolean(loadError) || !catalogueDetail || Boolean(commande?.reglee)" :loading="saving">{{ commande ? 'Enregistrer' : 'Créer le kit' }}</Button></template>
  </Modal>
  <ConfirmDialog :is-open="confirmClose" title="Abandonner les modifications ?" message="Les saisies de cette commande ne seront pas enregistrées." confirm-text="Abandonner" variant="danger" @confirm="discard" @cancel="confirmClose = false" />
</template>

<script setup>
import { ref, computed, watch, useId, nextTick } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import Modal from './Modal.vue';
import Button from './Button.vue';
import ConfirmDialog from './ConfirmDialog.vue';
import { clientsAPI, cataloguesAPI } from '../services/api';
import { useCommandesStore } from '../stores/commandes';
import { OPTION_CENTS, PAYMENTS, defaultKitForm, availableFormats, selectKitFormat, selectKitCollection, setKitContribution, kitFormFromCommande, kitPricing, prepareKitPayload, formatMoney, centsToInput } from '../utils/commande-kit';
const props = defineProps({ isOpen: { type: Boolean, default: false }, commande: { type: Object, default: null } });
const emit = defineEmits(['close', 'saved']);
const store = useCommandesStore();
const prefix = useId();
const id = key => `${prefix}-${key}`;
const formId = id('form');
const form = ref(defaultKitForm());
const clients = ref([]);
const catalogues = ref([]);
const catalogueDetail = ref(null);
const errors = ref({});
const errorSummary = ref(null);
const loading = ref(false);
const saving = ref(false);
const loadError = ref('');
const confirmClose = ref(false);
const baseline = ref('');
let loadGeneration = 0;
const supplementCategories = [{ key: 'produit_promo', label: 'Produit promo' }, { key: 'autres', label: 'Autres' }];
const dirty = computed(() => baseline.value && JSON.stringify(form.value) !== baseline.value);
const formats = computed(() => availableFormats(catalogueDetail.value, props.commande?.catalogue_id ?? null));
const pricing = computed(() => kitPricing(form.value, catalogueDetail.value));
const multiplier = computed(() => form.value.papier_supplementaire ? 2 : 1);
const selectedRuban = computed(() => catalogueDetail.value?.rubans.find(r => r.id === Number(form.value.ruban_id)));
const allocated = line => line.papiers.reduce((sum, p) => sum + (Number(p.quantite_base) || 0), 0);
function remainingText(line) { const remaining = line.nb_feuilles - allocated(line); return remaining > 0 ? `${remaining} à répartir` : remaining < 0 ? `${-remaining} en trop` : 'répartition complète'; }
const collectionName = line => catalogueDetail.value?.collections.find(c => c.id === Number(line.collection_id))?.nom;
const paperName = (index, paperId) => catalogueDetail.value?.collections.find(c => c.id === Number(form.value.collections[index].collection_id))?.papiers.find(p => p.id === paperId)?.nom;
function errorTarget(key) { if (key === 'format_type') return id('format-C'); if (key === 'collections') return id('collection_0'); return ['client_id', 'catalogue_id', 'ruban_id', 'methode_paiement', 'prix_manuel_euros', 'collection_0', 'collection_1', 'papiers_0', 'papiers_1', 'produit_promo_texte', 'produit_promo_prix', 'autres_texte', 'autres_prix'].includes(key) ? id(key) : null; }
function focusError(key) { document.getElementById(errorTarget(key))?.focus(); }
function changeCatalogue(value) {
  form.value.catalogue_id = value; catalogueDetail.value = catalogues.value.find(c => c.id === Number(value)) || null;
  form.value.format_type = ''; form.value.collections = []; form.value.ruban_id = catalogueDetail.value?.rubans.length === 1 ? String(catalogueDetail.value.rubans[0].id) : '';
  form.value.prix_manuel = false; form.value.prix_manuel_euros = ''; errors.value = {};
}
function changeFormat(value) { selectKitFormat(form.value, value); errors.value = {}; }
function changeCollection(index, value) { selectKitCollection(form.value, catalogueDetail.value, index, value); errors.value = {}; }
function toggleManual(value) { form.value.prix_manuel = value; if (value) form.value.prix_manuel_euros = centsToInput(pricing.value.automatic); }
async function loadForm() {
  const generation = ++loadGeneration; const existing = props.commande;
  loading.value = true; loadError.value = ''; errors.value = {}; baseline.value = ''; form.value = defaultKitForm(); catalogueDetail.value = null; clients.value = []; catalogues.value = [];
  try {
    const [activeClients, available, original] = await Promise.all([clientsAPI.getAll(), cataloguesAPI.getAll({ utilisables: true }), existing ? cataloguesAPI.getById(existing.catalogue_id) : Promise.resolve(null)]);
    if (generation !== loadGeneration || !props.isOpen) return;
    clients.value = activeClients.filter(c => !c.archive); catalogues.value = available.filter(c => !c.archive && c.statut === 'publie');
    if (existing) { if (!catalogues.value.some(c => c.id === original.id)) catalogues.value.push(original); else catalogues.value = catalogues.value.map(c => c.id === original.id ? original : c); catalogueDetail.value = original; form.value = kitFormFromCommande(existing, original); }
    baseline.value = JSON.stringify(form.value);
  } catch (error) { if (generation === loadGeneration && props.isOpen) loadError.value = `Impossible de préparer la commande : ${error.message}`; }
  finally { if (generation === loadGeneration) loading.value = false; }
}
async function handleSubmit() {
  if (saving.value || loading.value || loadError.value || props.commande?.reglee) return;
  const prepared = prepareKitPayload(form.value, catalogueDetail.value, { originalCatalogueId: props.commande?.catalogue_id ?? null }); errors.value = prepared.errors;
  if (Object.keys(errors.value).length) { await nextTick(); errorSummary.value?.focus(); return; }
  saving.value = true;
  try { const saved = props.commande ? await store.updateCommande(props.commande.id, prepared.payload) : await store.createCommande(prepared.payload); baseline.value = JSON.stringify(form.value); emit('saved', saved); emit('close'); }
  catch (error) { errors.value = { _global: error.message }; await nextTick(); errorSummary.value?.focus(); }
  finally { saving.value = false; }
}
function requestClose() { if (saving.value) return; if (dirty.value) confirmClose.value = true; else emit('close'); }
function discard() { confirmClose.value = false; baseline.value = ''; emit('close'); }
watch(() => props.isOpen, open => { if (open) loadForm(); else { ++loadGeneration; confirmClose.value = false; } }, { immediate: true });
onBeforeRouteLeave(() => { if (!props.isOpen) return; if (saving.value) return false; if (dirty.value) return window.confirm('Quitter et abandonner les saisies de cette commande ?'); });
</script>

<style scoped>
.kit-form, .form-body { display: flex; flex-direction: column; gap: var(--spacing-5); }
.form-body { border: 0; padding: 0; margin: 0; min-width: 0; }
section { display: flex; flex-direction: column; gap: var(--spacing-3); min-width: 0; }
h3, p { margin: 0; }
h3 { font-family: var(--font-heading); font-size: var(--font-size-base); }
.field { display: flex; flex-direction: column; gap: var(--spacing-2); min-width: 0; }
label, legend { font-weight: var(--font-weight-medium); font-size: var(--font-size-sm); }
input:not([type=radio]):not([type=checkbox]), select { width: 100%; min-height: 44px; padding: var(--spacing-2) var(--spacing-3); border: 1.5px solid var(--border); border-radius: var(--border-radius); background: var(--bg-primary); color: var(--text-primary); font: inherit; box-sizing: border-box; }
input:focus-visible, select:focus-visible, a:focus-visible, [tabindex]:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }
input[type=radio], input[type=checkbox] { accent-color: var(--primary); width: 18px; height: 18px; flex-shrink: 0; }
input:disabled, select:disabled, .unavailable { opacity: .55; cursor: not-allowed; }
.choices { display: flex; gap: var(--spacing-3); border: 0; padding: 0; margin: 0; }
.choices legend { margin-bottom: var(--spacing-2); }
.choice { display: flex; align-items: flex-start; flex: 1; gap: var(--spacing-2); border: 1.5px solid var(--border); padding: var(--spacing-3); border-radius: var(--border-radius); cursor: pointer; }
.choice > span { display: flex; flex-direction: column; gap: var(--spacing-1); }
.choice.selected { background: var(--primary-light); border-color: var(--primary); }
.hint, small { font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.5; font-weight: normal; }
.notice, .summary, .collection-slot { background: var(--bg-tertiary); padding: var(--spacing-4); border-radius: var(--border-radius); line-height: 1.5; }
.collection-slot { display: flex; flex-direction: column; gap: var(--spacing-3); }
.contributions { display: flex; gap: var(--spacing-4); padding: 0; margin: 0; border: 0; }
.contributions label, .check { display: flex; align-items: center; gap: var(--spacing-2); min-height: 44px; cursor: pointer; }
.paper-row { display: grid; grid-template-columns: minmax(0, 1fr) 72px minmax(0, 1fr); gap: var(--spacing-3); align-items: center; margin-bottom: var(--spacing-2); }
.paper-row label { overflow-wrap: anywhere; }
.allocation { font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); }
.extras-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 180px); gap: var(--spacing-3); }
.price-line { display: flex; justify-content: space-between; align-items: baseline; gap: var(--spacing-3); }
.price-line strong { font-size: var(--font-size-xl); font-variant-numeric: tabular-nums; }
.field-error, .error-box { color: var(--error); font-size: var(--font-size-sm); }
.error-box { background: var(--error-light); padding: var(--spacing-4); border-radius: var(--border-radius); }
.error-box a { color: inherit; }
.error-box ul, .summary ul { margin: var(--spacing-2) 0; padding-left: var(--spacing-5); }
.summary { overflow-wrap: anywhere; }
@media (max-width: 640px) { .choices { flex-direction: column; } .extras-row { grid-template-columns: minmax(0, 1fr); } .paper-row { grid-template-columns: minmax(0, 1fr) 72px; } .paper-row .hint { grid-column: 1 / -1; } .contributions { flex-wrap: wrap; } }
</style>
