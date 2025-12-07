<script setup>
import { onMounted } from 'vue'
import { useClientsStore } from '../stores/clients'

const store = useClientsStore()

onMounted(() => {
  store.fetchClients()
})
</script>

<template>
  <div>
    <h1>Clients</h1>

    <!-- Loading -->
    <p v-if="store.isLoading">Chargement…</p>

    <!-- Error -->
    <p v-if="store.error">Erreur : {{ store.error }}</p>

    <!-- Liste brute -->
    <ul v-if="!store.isLoading && !store.error">
      <li v-for="c in store.clients" :key="c.nom + c.prenom">
        {{ c.nom }} {{ c.prenom }}
      </li>
    </ul>
  </div>
</template>
