<template>
  <Modal :isOpen="isOpen" title="Paramètres — Prix" @close="$emit('close')" maxWidth="420px">
    <form @submit.prevent="handleSave" class="parametres-form">
      <div v-if="store.error" class="form-error">{{ store.error }}</div>

      <div class="prix-fields">
        <div class="prix-field">
          <label class="prix-label">Prix Kit A</label>
          <div class="prix-input-wrapper">
            <input v-model.number="form.prix_A" type="number" min="0" step="0.5" class="prix-input" required />
            <span class="prix-suffix">€</span>
          </div>
        </div>
        <div class="prix-field">
          <label class="prix-label">Prix Kit B</label>
          <div class="prix-input-wrapper">
            <input v-model.number="form.prix_B" type="number" min="0" step="0.5" class="prix-input" required />
            <span class="prix-suffix">€</span>
          </div>
        </div>
        <div class="prix-field">
          <label class="prix-label">Prix Kit C</label>
          <div class="prix-input-wrapper">
            <input v-model.number="form.prix_C" type="number" min="0" step="0.5" class="prix-input" required />
            <span class="prix-suffix">€</span>
          </div>
        </div>
      </div>

      <div v-if="saved" class="form-success">Prix enregistrés ✓</div>
    </form>

    <template #footer>
      <Button variant="secondary" @click="$emit('close')">Annuler</Button>
      <Button @click="handleSave" :loading="store.loading">Enregistrer</Button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import Modal from './Modal.vue';
import Button from './Button.vue';
import { useSettingsStore } from '../stores/settings';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
});
const emit = defineEmits(['close']);

const store = useSettingsStore();
const saved = ref(false);

const form = ref({ prix_A: '', prix_B: '', prix_C: '' });

onMounted(async () => {
  await store.fetchSettings();
  syncForm();
});

watch(() => props.isOpen, (val) => {
  if (val) {
    saved.value = false;
    syncForm();
  }
});

function syncForm() {
  form.value.prix_A = store.prix.prix_A;
  form.value.prix_B = store.prix.prix_B;
  form.value.prix_C = store.prix.prix_C;
}

async function handleSave() {
  try {
    await store.updateSettings({
      prix_A: String(form.value.prix_A),
      prix_B: String(form.value.prix_B),
      prix_C: String(form.value.prix_C),
    });
    saved.value = true;
    setTimeout(() => emit('close'), 800);
  } catch {
    // error affichée via store.error
  }
}
</script>

<style scoped>
.parametres-form { display: flex; flex-direction: column; gap: var(--space-4); }
.prix-fields { display: flex; flex-direction: column; gap: var(--space-3); }
.prix-field { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
.prix-label { font-size: var(--text-sm); font-weight: 500; color: var(--text-secondary); min-width: 80px; }
.prix-input-wrapper { display: flex; align-items: center; gap: var(--space-2); }
.prix-input {
  width: 90px;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text-primary);
  font-size: var(--text-base);
  text-align: right;
}
.prix-input:focus { outline: none; border-color: var(--accent); }
.prix-suffix { font-size: var(--text-sm); color: var(--text-secondary); }
.form-error { color: var(--error); font-size: var(--text-sm); padding: var(--space-2); background: var(--error-bg, #fff0f0); border-radius: var(--radius); }
.form-success { color: var(--success, #16a34a); font-size: var(--text-sm); text-align: center; }
</style>
