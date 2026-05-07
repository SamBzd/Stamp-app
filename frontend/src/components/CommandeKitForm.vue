<template>
  <Modal :is-open="isOpen" title="Nouveau kit" max-width="640px" @close="$emit('close')">
    <form class="kit-form" @submit.prevent="handleSubmit">

      <!-- 1. Sélection cliente -->
      <FormSelect
        v-model="form.client_id"
        label="Cliente"
        placeholder="Sélectionner une cliente..."
        :options="clientsOptions"
        :error="errors.client_id"
        required
      />

      <!-- 2. Sélection catalogue -->
      <FormSelect
        v-model="form.catalogue_id"
        label="Catalogue"
        placeholder="Sélectionner un catalogue..."
        :options="cataloguesOptions"
        :error="errors.catalogue_id"
        required
        @update:model-value="onCatalogueChange"
      />

      <!-- 3. Sélection format -->
      <div v-if="form.catalogue_id" class="form-field">
        <label class="form-label">Format <span class="form-required">*</span></label>
        <div class="format-radios">
          <label
            v-for="f in ['A', 'B', 'C']"
            :key="f"
            :class="['format-radio', `format-radio-${f.toLowerCase()}`, { selected: form.format_type === f }]"
            @click="selectFormat(f)"
          >
            <span class="format-letter">{{ f }}</span>
            <span class="format-price">{{ settings[`prix_${f}`] ? `${settings[`prix_${f}`]}€` : '—' }}</span>
            <span class="format-info">{{ f === 'C' ? '1 collection' : '2 collections' }}</span>
          </label>
        </div>
        <p v-if="errors.format_type" class="form-error">{{ errors.format_type }}</p>
      </div>

      <!-- 4a. Format A/B : 2 selects de collection avec nb_feuilles -->
      <template v-if="form.format_type && form.format_type !== 'C' && catalogueCollections.length > 0">
        <div v-for="(slot, idx) in 2" :key="`col-${idx}`" class="collection-slot">
          <div class="collection-slot-header">
            <label class="form-label">Collection {{ idx + 1 }} <span class="form-required">*</span></label>
            <div class="nb-feuilles-toggle">
              <button
                type="button"
                :class="['nb-btn', { active: form.collections[idx]?.nb_feuilles === 2 }]"
                @click="setNbFeuilles(idx, 2)"
              >×2</button>
              <button
                type="button"
                :class="['nb-btn', { active: form.collections[idx]?.nb_feuilles === 3 }]"
                @click="setNbFeuilles(idx, 3)"
              >×3</button>
            </div>
          </div>
          <FormSelect
            v-model="form.collections[idx].collection_id"
            :options="cataloguesOptions.length > 0 ? collectionOptions : []"
            placeholder="Sélectionner une collection..."
            :error="errors[`collection_${idx}`]"
            @update:model-value="(val) => onCollectionChange(idx, val)"
          />
          <!-- Papiers de la collection sélectionnée (lecture seule) -->
          <div v-if="getCollectionPapiers(idx).length > 0" class="papiers-preview">
            <span class="papiers-preview-label">Papiers :</span>
            <span
              v-for="papier in getCollectionPapiers(idx)"
              :key="papier.id"
              class="papier-chip"
            >{{ papier.nom }}</span>
          </div>
        </div>

        <!-- Sélection des papiers pour format A/B -->
        <div v-if="allPapiersAB.length > 0" class="form-field">
          <label class="form-label">
            Papiers sélectionnés
            <span class="form-hint-inline">(issues des collections choisies)</span>
          </label>
          <div class="papiers-grid">
            <label
              v-for="papier in allPapiersAB"
              :key="papier.id"
              :class="['papier-btn', { selected: form.papiers_selectionnes.includes(papier.id) }]"
            >
              <input
                type="checkbox"
                :value="papier.id"
                v-model="form.papiers_selectionnes"
                class="visually-hidden"
              />
              {{ papier.nom }}
            </label>
          </div>
        </div>
      </template>

      <!-- 4b. Format C : 1 select collection, papiers affichés en lecture seule -->
      <template v-if="form.format_type === 'C' && catalogueCollections.length > 0">
        <div class="form-field">
          <FormSelect
            v-model="form.collections[0].collection_id"
            label="Collection"
            placeholder="Sélectionner une collection..."
            :options="collectionOptions"
            :error="errors.collection_0"
            required
            @update:model-value="(val) => onCollectionChange(0, val)"
          />
          <div v-if="getCollectionPapiers(0).length > 0" class="papiers-preview papiers-preview-block">
            <span class="papiers-preview-label">Papiers (automatiques) :</span>
            <div class="papiers-chips">
              <span
                v-for="papier in getCollectionPapiers(0)"
                :key="papier.id"
                class="papier-chip"
              >{{ papier.nom }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- 5. Options supplémentaires -->
      <div v-if="form.format_type" class="form-extras">
        <label class="checkbox-label">
          <input type="checkbox" v-model="form.papier_supplementaire" />
          <span>Papier supplémentaire (+{{ PAPIER_SUPP_PRIX }}€)</span>
        </label>

        <div class="extras-row">
          <FormInput
            v-model="form.produit_promo_texte"
            label="Produit promo (texte)"
            placeholder="Ex: Carnet de voyage"
          />
          <FormInput
            v-model="form.produit_promo_prix"
            label="Prix promo"
            type="number"
            placeholder="0"
            :min="0"
          />
        </div>

        <div class="extras-row">
          <FormInput
            v-model="form.autres_texte"
            label="Autres (texte)"
            placeholder="Ex: Marque-pages"
          />
          <FormInput
            v-model="form.autres_prix"
            label="Prix autres"
            type="number"
            placeholder="0"
            :min="0"
          />
        </div>
      </div>

      <!-- 6. Méthode de paiement -->
      <div v-if="form.format_type" class="form-field">
        <label class="form-label">Méthode de paiement <span class="form-required">*</span></label>
        <div class="paiement-radios">
          <label
            v-for="p in paiementOptions"
            :key="p"
            :class="['paiement-radio', { selected: form.methode_paiement === p }]"
            @click="form.methode_paiement = p"
          >
            {{ p }}
          </label>
        </div>
        <p v-if="errors.methode_paiement" class="form-error">{{ errors.methode_paiement }}</p>
      </div>

      <!-- 7. Prix total -->
      <div v-if="form.format_type && totalPrice > 0" class="prix-total-bar">
        <span class="prix-total-label">Prix total estimé</span>
        <span class="prix-total-value">{{ totalPrice.toFixed(2) }}€</span>
      </div>
    </form>

    <template #footer>
      <Button variant="secondary" @click="$emit('close')">Annuler</Button>
      <Button @click="handleSubmit" :loading="saving">Créer</Button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import Modal from './Modal.vue';
import Button from './Button.vue';
import FormSelect from './FormSelect.vue';
import FormInput from './FormInput.vue';
import { clientsAPI, cataloguesAPI, settingsAPI, commandesAPI } from '../services/api';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'saved']);

const PAPIER_SUPP_PRIX = 3.5;

const paiementOptions = ['Paypal', 'chèque', 'virement'];

// Data
const clients = ref([]);
const catalogues = ref([]);
const settings = ref({ prix_A: 0, prix_B: 0, prix_C: 0 });
const catalogueDetail = ref(null);
const saving = ref(false);
const errors = ref({});

// Form state
const form = ref(defaultForm());

function defaultForm() {
  return {
    client_id: '',
    catalogue_id: '',
    format_type: '',
    methode_paiement: '',
    papier_supplementaire: false,
    produit_promo_texte: '',
    produit_promo_prix: '',
    autres_texte: '',
    autres_prix: '',
    papiers_selectionnes: [],
    collections: [
      { collection_id: '', nb_feuilles: 2 },
      { collection_id: '', nb_feuilles: 3 },
    ],
  };
}

// Options
const clientsOptions = computed(() =>
  clients.value.map(c => ({ value: String(c.id), label: `${c.prenom} ${c.nom}` }))
);

const cataloguesOptions = computed(() =>
  catalogues.value.map(c => ({ value: String(c.id), label: c.titre }))
);

const catalogueCollections = computed(() =>
  catalogueDetail.value?.collections || []
);

const collectionOptions = computed(() =>
  catalogueCollections.value.map(c => ({ value: String(c.id), label: c.nom }))
);

// Papiers de la collection à l'index idx
const getCollectionPapiers = (idx) => {
  const colId = form.value.collections[idx]?.collection_id;
  if (!colId) return [];
  const col = catalogueCollections.value.find(c => String(c.id) === String(colId));
  return col?.papiers || [];
};

// Tous les papiers des 2 collections (A/B)
const allPapiersAB = computed(() => {
  const p0 = getCollectionPapiers(0);
  const p1 = getCollectionPapiers(1);
  const seen = new Set();
  return [...p0, ...p1].filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
});

// Prix total
const totalPrice = computed(() => {
  const base = parseFloat(settings.value[`prix_${form.value.format_type}`]) || 0;
  const supp = form.value.papier_supplementaire ? PAPIER_SUPP_PRIX : 0;
  const promo = parseFloat(form.value.produit_promo_prix) || 0;
  const autres = parseFloat(form.value.autres_prix) || 0;
  return base + supp + promo + autres;
});

// Handlers
const onCatalogueChange = async (val) => {
  form.value.format_type = '';
  form.value.collections = defaultForm().collections;
  form.value.papiers_selectionnes = [];
  catalogueDetail.value = null;
  if (val) {
    try {
      catalogueDetail.value = await cataloguesAPI.getById(parseInt(val));
    } catch {
      catalogueDetail.value = null;
    }
  }
};

const selectFormat = (f) => {
  form.value.format_type = f;
  form.value.collections = f === 'C'
    ? [{ collection_id: '', nb_feuilles: 5 }]
    : [{ collection_id: '', nb_feuilles: 2 }, { collection_id: '', nb_feuilles: 3 }];
  form.value.papiers_selectionnes = [];
};

const setNbFeuilles = (idx, nb) => {
  form.value.collections[idx].nb_feuilles = nb;
};

const onCollectionChange = (idx, val) => {
  form.value.collections[idx].collection_id = val;
  form.value.papiers_selectionnes = [];
};

// Submit
const handleSubmit = async () => {
  errors.value = {};

  if (!form.value.client_id) errors.value.client_id = 'Requis';
  if (!form.value.catalogue_id) errors.value.catalogue_id = 'Requis';
  if (!form.value.format_type) errors.value.format_type = 'Requis';
  if (!form.value.methode_paiement) errors.value.methode_paiement = 'Requis';

  if (form.value.format_type === 'C') {
    if (!form.value.collections[0]?.collection_id) {
      errors.value.collection_0 = 'Requis';
    }
  } else if (form.value.format_type) {
    if (!form.value.collections[0]?.collection_id) errors.value.collection_0 = 'Requis';
    if (!form.value.collections[1]?.collection_id) errors.value.collection_1 = 'Requis';
    if (
      form.value.collections[0]?.collection_id &&
      form.value.collections[1]?.collection_id &&
      form.value.collections[0].collection_id === form.value.collections[1].collection_id
    ) {
      errors.value.collection_1 = 'Doit être différente de la 1ère collection';
    }
  }

  if (Object.keys(errors.value).length > 0) return;

  saving.value = true;
  try {
    const collectionsData = form.value.collections
      .filter(c => c.collection_id)
      .map(c => ({
        collection_id: parseInt(c.collection_id),
        nb_feuilles: c.nb_feuilles,
      }));

    const payload = {
      type: 'kit',
      client_id: parseInt(form.value.client_id),
      format_type: form.value.format_type,
      methode_paiement: form.value.methode_paiement,
      papier_supplementaire: form.value.papier_supplementaire ? 1 : 0,
      produit_promo_texte: form.value.produit_promo_texte || null,
      produit_promo_prix: form.value.produit_promo_prix !== '' ? parseFloat(form.value.produit_promo_prix) : null,
      autres_texte: form.value.autres_texte || null,
      autres_prix: form.value.autres_prix !== '' ? parseFloat(form.value.autres_prix) : null,
      collections: collectionsData,
      papiers_selectionnes: form.value.format_type !== 'C' ? form.value.papiers_selectionnes : [],
    };

    await commandesAPI.create(payload);
    form.value = defaultForm();
    errors.value = {};
    catalogueDetail.value = null;
    emit('saved');
    emit('close');
  } catch (error) {
    console.error('Erreur création commande kit:', error);
    errors.value._global = error.message;
  } finally {
    saving.value = false;
  }
};

// Charger les données à l'ouverture
watch(() => props.isOpen, async (open) => {
  if (open) {
    form.value = defaultForm();
    errors.value = {};
    catalogueDetail.value = null;
    try {
      [clients.value, catalogues.value] = await Promise.all([
        clientsAPI.getAll(),
        cataloguesAPI.getAll(),
      ]);
    } catch (e) {
      console.error('Erreur chargement données formulaire kit:', e);
    }
    try {
      const s = await settingsAPI.get();
      settings.value = { prix_A: s.prix_A || 0, prix_B: s.prix_B || 0, prix_C: s.prix_C || 0 };
    } catch {
      settings.value = { prix_A: 0, prix_B: 0, prix_C: 0 };
    }
  }
});
</script>

<style scoped>
.kit-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

/* === Format radios === */
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.form-required {
  color: var(--secondary);
}

.form-hint-inline {
  font-weight: var(--font-weight-normal);
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.form-error {
  font-size: var(--font-size-xs);
  color: var(--error, #c0392b);
  padding-left: var(--spacing-2);
}

.format-radios {
  display: flex;
  gap: var(--spacing-3);
}

.format-radio {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--spacing-3);
  border: 2px solid var(--border);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: center;
}

.format-radio:hover {
  border-color: var(--primary);
}

.format-radio.selected {
  border-color: var(--primary);
  background: var(--primary-light);
}

.format-letter {
  font-family: var(--font-heading);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
}

.format-radio-a .format-letter { color: var(--format-a, var(--primary)); }
.format-radio-b .format-letter { color: var(--format-b, var(--secondary)); }
.format-radio-c .format-letter { color: var(--format-c, #1d4ed8); }

.format-price {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.format-info {
  font-size: 10px;
  color: var(--text-tertiary);
}

/* === Collection slot === */
.collection-slot {
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-xl);
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.collection-slot-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nb-feuilles-toggle {
  display: flex;
  gap: var(--spacing-1);
}

.nb-btn {
  padding: 4px 12px;
  border: 1.5px solid var(--border);
  border-radius: var(--border-radius-full);
  background: var(--bg-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  font-family: var(--font-family);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.nb-btn.active {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--primary-foreground);
}

/* === Papiers preview === */
.papiers-preview {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  padding-top: var(--spacing-2);
  border-top: 1px solid var(--border-light);
}

.papiers-preview-block {
  flex-direction: column;
  align-items: flex-start;
}

.papiers-preview-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  font-weight: var(--font-weight-medium);
}

.papier-chip {
  padding: 2px 10px;
  background: var(--muted);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.papiers-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

/* === Papiers sélection grid === */
.papiers-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.papier-btn {
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-2) var(--spacing-4);
  border: 1.5px solid var(--border);
  border-radius: var(--border-radius-full);
  background: var(--bg-primary);
  font-size: var(--font-size-sm);
  font-family: var(--font-family);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.papier-btn.selected {
  background: var(--primary-light);
  border-color: var(--primary);
  color: var(--primary);
  font-weight: var(--font-weight-semibold);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* === Extras === */
.form-extras {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-xl);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  cursor: pointer;
}

.extras-row {
  display: grid;
  grid-template-columns: 1fr 140px;
  gap: var(--spacing-3);
}

/* === Paiement radios === */
.paiement-radios {
  display: flex;
  gap: var(--spacing-2);
}

.paiement-radio {
  flex: 1;
  padding: var(--spacing-2) var(--spacing-3);
  border: 1.5px solid var(--border);
  border-radius: var(--border-radius-sm);
  text-align: center;
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-family: var(--font-family);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.paiement-radio:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.paiement-radio.selected {
  background: var(--primary-light);
  border-color: var(--primary);
  color: var(--primary);
  font-weight: var(--font-weight-semibold);
}

/* === Prix total === */
.prix-total-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-4);
  background: var(--primary-light);
  border-radius: var(--border-radius);
  border: 1px solid rgba(93, 112, 82, 0.15);
}

.prix-total-label {
  font-size: var(--font-size-sm);
  color: var(--primary);
}

.prix-total-value {
  font-family: var(--font-heading);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--primary);
}
</style>
