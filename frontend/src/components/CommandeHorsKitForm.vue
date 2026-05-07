<template>
  <Modal :is-open="isOpen" title="Nouvelle commande hors kit" max-width="520px" @close="$emit('close')">
    <form class="hors-kit-form" @submit.prevent="handleSubmit">

      <!-- Sélection cliente -->
      <FormSelect
        v-model="form.client_id"
        label="Cliente"
        placeholder="Sélectionner une cliente..."
        :options="clientsOptions"
        :error="errors.client_id"
        required
      />

      <!-- Montant -->
      <FormInput
        v-model="form.montant"
        label="Montant"
        type="number"
        placeholder="0.00"
        :min="0"
        :step="0.01"
        :error="errors.montant"
        required
      >
        <template #suffix>€</template>
      </FormInput>

      <!-- Note fidélité -->
      <div v-if="Number(form.montant) > 70" class="fidelite-note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        Montant &gt; 70€ — +1 point fidélité automatique
      </div>

      <!-- Date commande -->
      <FormInput
        v-model="form.date_commande"
        label="Date de commande"
        type="date"
        :error="errors.date_commande"
      />

      <!-- Cadeau -->
      <div class="extras-row">
        <FormInput
          v-model="form.cadeau_texte"
          label="Cadeau (texte)"
          placeholder="Ex: Carte cadeau"
        />
        <FormInput
          v-model="form.cadeau_valeur"
          label="Valeur cadeau"
          type="number"
          placeholder="0"
          :min="0"
          :step="0.01"
        >
          <template #suffix>€</template>
        </FormInput>
      </div>

      <!-- Méthode de paiement -->
      <div class="form-field">
        <label class="form-label">Méthode de paiement</label>
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
      </div>

      <!-- Erreur globale -->
      <p v-if="errors._global" class="form-error-global">{{ errors._global }}</p>
    </form>

    <template #footer>
      <Button variant="secondary" @click="$emit('close')">Annuler</Button>
      <Button @click="handleSubmit" :loading="saving">Créer</Button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import Modal from './Modal.vue';
import Button from './Button.vue';
import FormSelect from './FormSelect.vue';
import FormInput from './FormInput.vue';
import { clientsAPI, commandesAPI } from '../services/api';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'saved']);

const paiementOptions = ['Paypal', 'chèque', 'virement'];

const clients = ref([]);
const saving = ref(false);
const errors = ref({});

const form = ref(defaultForm());

function defaultForm() {
  return {
    client_id: '',
    montant: '',
    date_commande: '',
    cadeau_texte: '',
    cadeau_valeur: '',
    methode_paiement: '',
  };
}

const clientsOptions = computed(() =>
  clients.value.map(c => ({ value: String(c.id), label: `${c.prenom} ${c.nom}` }))
);

const handleSubmit = async () => {
  errors.value = {};

  if (!form.value.client_id) errors.value.client_id = 'Requis';
  if (form.value.montant === '' || form.value.montant === null) {
    errors.value.montant = 'Requis';
  } else if (parseFloat(form.value.montant) < 0) {
    errors.value.montant = 'Le montant doit être positif';
  }

  if (Object.keys(errors.value).length > 0) return;

  saving.value = true;
  try {
    const payload = {
      type: 'hors_kit',
      client_id: parseInt(form.value.client_id),
      montant: parseFloat(form.value.montant),
      methode_paiement: form.value.methode_paiement || null,
      date_commande: form.value.date_commande || null,
      cadeau_texte: form.value.cadeau_texte || null,
      cadeau_valeur: form.value.cadeau_valeur !== '' ? parseFloat(form.value.cadeau_valeur) : null,
    };

    await commandesAPI.create(payload);
    form.value = defaultForm();
    errors.value = {};
    emit('saved');
    emit('close');
  } catch (error) {
    console.error('Erreur création commande hors kit:', error);
    errors.value._global = error.message;
  } finally {
    saving.value = false;
  }
};

watch(() => props.isOpen, async (open) => {
  if (open) {
    form.value = defaultForm();
    errors.value = {};
    try {
      clients.value = await clientsAPI.getAll();
    } catch (e) {
      console.error('Erreur chargement clients:', e);
    }
  }
});
</script>

<style scoped>
.hors-kit-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-4);
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

/* === Note fidélité === */
.fidelite-note {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--warning-light);
  border-radius: var(--border-radius);
  font-size: var(--font-size-sm);
  color: var(--warning-dark);
  font-weight: var(--font-weight-medium);
}

.fidelite-note svg {
  width: 16px;
  height: 16px;
  color: var(--secondary);
  flex-shrink: 0;
}

/* === Extras row === */
.extras-row {
  display: grid;
  grid-template-columns: 1fr 150px;
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

/* === Erreur globale === */
.form-error-global {
  font-size: var(--font-size-sm);
  color: var(--error, #c0392b);
  padding: var(--spacing-3);
  background: var(--error-light, #fde8e8);
  border-radius: var(--border-radius);
  margin: 0;
}
</style>
