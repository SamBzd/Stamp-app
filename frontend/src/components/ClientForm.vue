<template>
  <form @submit.prevent="handleSubmit" class="client-form">
    <div class="form-row">
      <div class="form-group">
        <label for="nom" class="form-label">Nom *</label>
        <input
          id="nom"
          v-model="formData.nom"
          type="text"
          class="form-input"
          required
          placeholder="Dupont"
        />
      </div>

      <div class="form-group">
        <label for="prenom" class="form-label">Prénom *</label>
        <input
          id="prenom"
          v-model="formData.prenom"
          type="text"
          class="form-input"
          required
          placeholder="Marie"
        />
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="email" class="form-label">📧 Email</label>
        <input
          id="email"
          v-model="formData.email"
          type="email"
          class="form-input"
          placeholder="marie.dupont@example.com"
        />
      </div>

      <div class="form-group">
        <label for="telephone" class="form-label">📱 Téléphone</label>
        <input
          id="telephone"
          v-model="formData.telephone_raw"
          type="tel"
          class="form-input"
          placeholder="06 12 34 56 78"
        />
      </div>
    </div>

    <div class="form-group">
      <label for="date_naissance" class="form-label">🎂 Date de naissance</label>
      <input
        id="date_naissance"
        v-model="formData.date_naissance"
        type="text"
        class="form-input"
        placeholder="15 mars 1990"
      />
    </div>

    <div class="form-group">
      <label for="adresse" class="form-label">📍 Adresse</label>
      <input
        id="adresse"
        v-model="formData.adresse"
        type="text"
        class="form-input"
        placeholder="123 rue de la Paix"
      />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="code_postal" class="form-label">Code postal</label>
        <input
          id="code_postal"
          v-model="formData.code_postal"
          type="text"
          class="form-input"
          placeholder="75001"
        />
      </div>

      <div class="form-group">
        <label for="ville" class="form-label">Ville</label>
        <input
          id="ville"
          v-model="formData.ville"
          type="text"
          class="form-input"
          placeholder="Paris"
        />
      </div>
    </div>

    <div class="form-group">
      <label for="relais_prefere" class="form-label">📦 Relais préféré</label>
      <input
        id="relais_prefere"
        v-model="formData.relais_prefere"
        type="text"
        class="form-input"
        placeholder="Relais Colis Paris"
      />
    </div>

    <div class="form-group">
      <label for="derniere_commande" class="form-label">📅 Dernière commande</label>
      <input
        id="derniere_commande"
        v-model="formData.derniere_commande"
        type="text"
        class="form-input"
        placeholder="2024-01-15"
      />
    </div>

    <div class="form-group checkbox-group">
      <label class="checkbox-label">
        <input
          v-model="formData.contacter"
          type="checkbox"
          :true-value="1"
          :false-value="0"
          class="checkbox-input"
        />
        <span>💬 Autoriser le contact</span>
      </label>
    </div>

    <div class="form-actions">
      <button type="button" @click="$emit('cancel')" class="btn btn-cancel">
        Annuler
      </button>
      <button type="submit" class="btn btn-save" :disabled="isLoading">
        {{ isLoading ? 'Enregistrement...' : '💾 Enregistrer' }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  client: {
    type: Object,
    default: null
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['save', 'cancel'])

const formData = ref({
  nom: '',
  prenom: '',
  date_naissance: '',
  adresse: '',
  code_postal: '',
  ville: '',
  email: '',
  telephone_raw: '',
  relais_prefere: '',
  contacter: 0,
  derniere_commande: ''
})

// Remplir le formulaire si on édite un client
watch(() => props.client, (newClient) => {
  if (newClient) {
    formData.value = {
      nom: newClient.nom || '',
      prenom: newClient.prenom || '',
      date_naissance: newClient.date_naissance || '',
      adresse: newClient.adresse || '',
      code_postal: newClient.code_postal || '',
      ville: newClient.ville || '',
      email: newClient.email || '',
      telephone_raw: newClient.telephone_raw || '',
      relais_prefere: newClient.relais_prefere || '',
      contacter: newClient.contacter || 0,
      derniere_commande: newClient.derniere_commande || ''
    }
  } else {
    // Réinitialiser le formulaire pour une nouvelle création
    formData.value = {
      nom: '',
      prenom: '',
      date_naissance: '',
      adresse: '',
      code_postal: '',
      ville: '',
      email: '',
      telephone_raw: '',
      relais_prefere: '',
      contacter: 0,
      derniere_commande: ''
    }
  }
}, { immediate: true })

const handleSubmit = () => {
  // Nettoyer les valeurs vides (les transformer en null pour la DB)
  const cleanedData = {}
  for (const [key, value] of Object.entries(formData.value)) {
    cleanedData[key] = value === '' ? null : value
  }
  
  emit('save', cleanedData)
}
</script>

<style scoped>
.client-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  color: #d63384;
  font-weight: 600;
  font-size: 0.95rem;
}

.form-input {
  padding: 12px 16px;
  border: 2px solid #ffeef8;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: #fff;
  color: #333;
}

.form-input:focus {
  outline: none;
  border-color: #ff6b9d;
  box-shadow: 0 0 0 3px rgba(255, 107, 157, 0.1);
}

.form-input::placeholder {
  color: #bbb;
}

.checkbox-group {
  margin-top: 10px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: #a855f7;
  font-weight: 500;
}

.checkbox-input {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #ff6b9d;
}

.form-actions {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid #ffeef8;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 15px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.btn-save {
  background: linear-gradient(135deg, #ff6b9d 0%, #c44569 100%);
  color: white;
}

.btn-save:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(214, 51, 132, 0.3);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancel {
  background: #f0f0f0;
  color: #666;
}

.btn-cancel:hover {
  background: #e0e0e0;
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>

