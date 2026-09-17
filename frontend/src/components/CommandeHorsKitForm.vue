<template>
  <Modal :is-open="isOpen && !confirmClose" :title="isEditing ? 'Modifier la commande hors kit' : 'Nouvelle commande hors kit'" max-width="520px" @close="requestClose">
    <form class="hors-kit-form" @submit.prevent="handleSubmit">

      <!-- Sélection cliente -->
      <FormSelect
        v-model="form.client_id"
        label="Cliente"
        placeholder="Sélectionner une cliente..."
        :options="clientsOptions"
        :error="errors.client_id"
        :disabled="isEditing || locked"
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
        :disabled="locked"
        required
      >
        <template #suffix>€</template>
      </FormInput>

      <!-- Note fidélité -->
      <div v-if="!isEditing && Number(form.montant) > 70" class="fidelite-note">
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
        :disabled="locked"
      />

      <!-- Cadeau -->
      <div class="extras-row">
        <FormInput
          v-model="form.cadeau_texte"
          label="Cadeau (texte)"
          placeholder="Ex: Carte cadeau"
          :disabled="locked"
        />
        <FormInput
          v-model="form.cadeau_valeur"
          label="Valeur cadeau"
          type="number"
          placeholder="0"
          :min="0"
          :step="0.01"
          :error="errors.cadeau_valeur"
          :disabled="locked"
        >
          <template #suffix>€</template>
        </FormInput>
      </div>

      <!-- Méthode de paiement -->
      <div class="form-field">
        <label class="form-label">Méthode de paiement</label>
        <div class="paiement-radios" role="radiogroup" aria-label="Méthode de paiement">
          <button
            v-for="p in paiementOptions"
            :key="p"
            type="button"
            role="radio"
            :aria-checked="form.methode_paiement === p"
            :disabled="locked"
            :class="['paiement-radio', { selected: form.methode_paiement === p }]"
            @click="selectPayment(p)"
            @keydown.left.prevent="movePayment(-1)"
            @keydown.right.prevent="movePayment(1)"
          >
            {{ p }}
          </button>
          <button
            type="button"
            role="radio"
            :aria-checked="!form.methode_paiement"
            :disabled="locked"
            :class="['paiement-radio', { selected: !form.methode_paiement }]"
            @click="selectPayment('')"
            @keydown.left.prevent="movePayment(-1)"
            @keydown.right.prevent="movePayment(1)"
          >Aucun</button>
        </div>
      </div>

      <!-- Erreur globale -->
      <p v-if="props.commande?.reglee" class="form-error-global" role="alert">Une commande réglée ne peut pas être modifiée.</p>
      <p v-if="clientLoadError" class="form-error-global" role="alert">
        {{ clientLoadError }} <Button variant="ghost" size="sm" :disabled="loadingClients" @click="loadClients">Réessayer</Button>
      </p>
      <p v-if="errors._global" class="form-error-global" role="alert">{{ errors._global }}</p>
    </form>

    <template #footer>
      <Button variant="secondary" :disabled="locked" @click="requestClose">Annuler</Button>
      <Button :disabled="locked || Boolean(clientLoadError)" @click="handleSubmit" :loading="saving">{{ isEditing ? 'Enregistrer' : 'Créer' }}</Button>
    </template>
  </Modal>
  <ConfirmDialog
    :is-open="confirmClose"
    title="Abandonner les modifications ?"
    message="Les saisies de cette commande ne seront pas enregistrées."
    confirm-text="Abandonner"
    variant="danger"
    @confirm="discard"
    @cancel="confirmClose = false"
  />
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import Modal from './Modal.vue';
import Button from './Button.vue';
import ConfirmDialog from './ConfirmDialog.vue';
import FormSelect from './FormSelect.vue';
import FormInput from './FormInput.vue';
import { clientsAPI } from '../services/api';
import { useCommandesStore } from '../stores/commandes';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  commande: { type: Object, default: null },
});

const emit = defineEmits(['close', 'saved']);

const paiementOptions = ['Paypal', 'chèque', 'virement'];

const clients = ref([]);
const saving = ref(false);
const loadingClients = ref(false);
const clientLoadError = ref('');
const errors = ref({});
const confirmClose = ref(false);
const baseline = ref('');
const commandesStore = useCommandesStore();

const isEditing = computed(() => Boolean(props.commande?.id));
const locked = computed(() => saving.value || loadingClients.value || Boolean(props.commande?.reglee));
const dirty = computed(() => baseline.value && JSON.stringify(form.value) !== baseline.value);

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
  clients.value
    .filter(c => !c.archive || Number(form.value.client_id) === c.id)
    .map(c => ({ value: String(c.id), label: `${c.prenom} ${c.nom}` }))
);

const handleSubmit = async () => {
  if (locked.value || clientLoadError.value) return;
  errors.value = {};

  if (!form.value.client_id) errors.value.client_id = 'Requis';
  const montant = Number(form.value.montant);
  const cadeauValeur = form.value.cadeau_valeur === '' || form.value.cadeau_valeur === null
    ? null
    : Number(form.value.cadeau_valeur);
  if (form.value.montant === '' || form.value.montant === null) {
    errors.value.montant = 'Requis';
  } else if (!Number.isFinite(montant) || montant < 0) {
    errors.value.montant = 'Le montant doit être un nombre positif ou nul';
  }
  if (cadeauValeur !== null && (!Number.isFinite(cadeauValeur) || cadeauValeur < 0)) {
    errors.value.cadeau_valeur = 'La valeur doit être un nombre positif ou nul';
  }

  if (Object.keys(errors.value).length > 0) return;

  saving.value = true;
  try {
    const payload = {
      montant,
      methode_paiement: form.value.methode_paiement || null,
      date_commande: form.value.date_commande || null,
      cadeau_texte: form.value.cadeau_texte || null,
      cadeau_valeur: cadeauValeur,
    };

    const commande = isEditing.value
      ? await commandesStore.updateCommande(props.commande.id, payload)
      : await commandesStore.createCommande({
        ...payload,
        type: 'hors_kit',
        client_id: parseInt(form.value.client_id, 10),
      });
    form.value = defaultForm();
    errors.value = {};
    baseline.value = '';
    emit('saved', commande);
    emit('close');
  } catch (error) {
    errors.value._global = error.message;
  } finally {
    saving.value = false;
  }
};

function selectPayment(payment) {
  if (!locked.value) form.value.methode_paiement = payment;
}

function movePayment(direction) {
  if (locked.value) return;
  const values = [...paiementOptions, ''];
  const index = values.indexOf(form.value.methode_paiement);
  selectPayment(values[(index + direction + values.length) % values.length]);
}

function formFromCommande(commande) {
  return {
    client_id: commande?.client_id ? String(commande.client_id) : '',
    montant: commande?.montant ?? '',
    date_commande: commande?.date_commande || '',
    cadeau_texte: commande?.cadeau_texte || '',
    cadeau_valeur: commande?.cadeau_valeur ?? '',
    methode_paiement: commande?.methode_paiement || '',
  };
}

function requestClose() {
  if (saving.value || loadingClients.value) return;
  if (dirty.value) confirmClose.value = true;
  else emit('close');
}

function discard() {
  confirmClose.value = false;
  baseline.value = '';
  emit('close');
}

function fallbackClient(commande) {
  const client = commande?.client;
  if (!commande?.client_id || !client) return null;
  return { id: commande.client_id, nom: client.nom || commande.client_nom || '', prenom: client.prenom || commande.client_prenom || '', archive: 1 };
}

async function loadClients() {
  loadingClients.value = true;
  clientLoadError.value = '';
  try {
    clients.value = await clientsAPI.getAll({ includeArchives: true });
    if (isEditing.value && !clients.value.some(client => client.id === props.commande.client_id)) {
      const client = await clientsAPI.getById(props.commande.client_id);
      clients.value.push(client);
    }
  } catch (error) {
    const client = fallbackClient(props.commande);
    if (client) clients.value = [client];
    clientLoadError.value = error.message || 'Impossible de charger les clientes.';
  } finally {
    loadingClients.value = false;
  }
}

watch(() => props.isOpen, async (open) => {
  if (open) {
    form.value = formFromCommande(props.commande);
    errors.value = {};
    baseline.value = JSON.stringify(form.value);
    await loadClients();
  } else {
    confirmClose.value = false;
  }
});

onBeforeRouteLeave(() => {
  if (!props.isOpen) return;
  if (saving.value || loadingClients.value) return false;
  if (dirty.value) return window.confirm('Quitter et abandonner les saisies de cette commande ?');
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
  background: transparent;
  transition: all var(--transition-fast);
}

.paiement-radio:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.paiement-radio:disabled {
  cursor: not-allowed;
  opacity: 0.55;
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
