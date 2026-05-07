<template>
  <Modal :isOpen="isOpen" title="Nouvelle commande hors kit" @close="$emit('close')" maxWidth="520px">
    <form @submit.prevent="handleSubmit" class="cmd-form">
      <div v-if="error" class="form-error">{{ error }}</div>

      <div class="form-group">
        <label class="form-label">Cliente *</label>
        <select v-model="form.client_id" class="form-select" required>
          <option value="">Choisir une cliente...</option>
          <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.nom }} {{ c.prenom }}</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Montant (€) *</label>
        <input v-model.number="form.montant" type="number" min="0" step="0.01" class="form-input" required placeholder="0.00" />
        <p v-if="form.montant > 70" class="form-hint form-hint-info">+1 point fidélité automatique</p>
      </div>

      <div class="form-group">
        <label class="form-label">Date de commande</label>
        <input v-model="form.date_commande" type="date" class="form-input" />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Cadeau (description)</label>
          <input v-model="form.cadeau_texte" type="text" class="form-input" placeholder="ex: broche dorée" />
        </div>
        <div class="form-group form-group-small">
          <label class="form-label">Valeur (€)</label>
          <input v-model.number="form.cadeau_valeur" type="number" min="0" step="0.01" class="form-input" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Méthode de paiement</label>
        <select v-model="form.methode_paiement" class="form-select">
          <option value="">Non renseignée</option>
          <option value="Paypal">Paypal</option>
          <option value="chèque">Chèque</option>
          <option value="virement">Virement</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-checkbox-label">
          <input v-model="form.reglee" type="checkbox" :true-value="1" :false-value="0" class="form-checkbox" />
          Commande réglée
        </label>
      </div>
    </form>

    <template #footer>
      <Button variant="secondary" @click="$emit('close')">Annuler</Button>
      <Button @click="handleSubmit" :loading="loading">Créer la commande</Button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import Modal from './Modal.vue';
import Button from './Button.vue';
import { clientsAPI, commandesAPI } from '../services/api';

const props = defineProps({ isOpen: { type: Boolean, default: false } });
const emit = defineEmits(['close', 'saved']);

const clients = ref([]);
const loading = ref(false);
const error = ref(null);

const defaultForm = () => ({
  client_id: '',
  montant: null,
  date_commande: '',
  cadeau_texte: '',
  cadeau_valeur: null,
  methode_paiement: '',
  reglee: 0,
});
const form = ref(defaultForm());

onMounted(async () => {
  clients.value = await clientsAPI.getAll();
});

watch(() => props.isOpen, (val) => {
  if (val) { form.value = defaultForm(); error.value = null; }
});

async function handleSubmit() {
  if (!form.value.client_id) { error.value = 'Veuillez choisir une cliente.'; return; }
  if (!form.value.montant) { error.value = 'Le montant est obligatoire.'; return; }
  loading.value = true;
  error.value = null;
  try {
    const payload = { type: 'hors_kit', ...form.value };
    if (!payload.methode_paiement) delete payload.methode_paiement;
    if (!payload.date_commande) delete payload.date_commande;
    if (!payload.cadeau_texte) delete payload.cadeau_texte;
    if (!payload.cadeau_valeur) delete payload.cadeau_valeur;
    const created = await commandesAPI.create(payload);
    emit('saved', created);
    emit('close');
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.cmd-form { display: flex; flex-direction: column; gap: var(--space-4, 1rem); }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-group-small { max-width: 100px; }
.form-row { display: flex; gap: var(--space-3, 0.75rem); }
.form-row .form-group { flex: 1; }
.form-label { font-size: var(--text-sm, 0.875rem); font-weight: 500; color: var(--text-secondary); }
.form-input, .form-select {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius, 6px);
  background: var(--surface);
  color: var(--text-primary);
  font-size: var(--text-base, 1rem);
  width: 100%;
}
.form-input:focus, .form-select:focus { outline: none; border-color: var(--accent); }
.form-checkbox-label { display: flex; align-items: center; gap: 8px; font-size: var(--text-sm, 0.875rem); cursor: pointer; }
.form-hint { font-size: var(--text-xs, 0.75rem); margin-top: 2px; }
.form-hint-info { color: var(--success, #16a34a); }
.form-error { color: var(--error); font-size: var(--text-sm); padding: 8px; background: var(--error-bg, #fff0f0); border-radius: var(--radius, 6px); }
</style>
