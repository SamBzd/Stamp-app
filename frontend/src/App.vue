<template>
  <router-view />
  <Toast />
</template>

<script setup>
import { nextTick, watch } from 'vue';
import { useRoute } from 'vue-router';
import Toast from './components/Toast.vue';

const route = useRoute();
// App reste montée lorsque les vues (et leur Layout) changent.
// Le chargement initial conserve le parcours clavier vers le lien d’évitement.
watch([() => route.path, () => route.matched.length], async ([path], [previousPath, previousMatches]) => {
  if (!previousMatches || path === previousPath) return;
  await nextTick();
  document.getElementById('main-content')?.focus();
});
</script>

<style>
/* Les styles globaux sont dans style.css */
</style>
