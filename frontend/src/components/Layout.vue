<template>
  <div ref="layout" class="app-layout" :class="{ 'app-layout-contained': contained }">
    <a class="skip-link" href="#main-content">Aller au contenu</a>
    <header ref="header" class="atelier-header">
      <div class="atelier-brand">
        <span class="atelier-logo">Stamp App</span>
      </div>
      <h1 v-if="title" id="atelier-page-title" class="atelier-title">{{ title }}</h1>
      <p v-if="subtitle" class="atelier-caption">{{ subtitle }}</p>
    </header>

    <main id="main-content" class="main-content" :aria-labelledby="title ? 'atelier-page-title' : undefined" tabindex="-1">
      <div class="content-wrapper"><slot></slot></div>
    </main>

    <footer class="dock-wrapper">
      <nav ref="dock" id="main-navigation" class="atelier-dock atelier-glass" aria-label="Navigation principale">
        <router-link v-for="item in navItems" :key="item.path" :to="item.path" class="dock-item" :aria-current="isActive(item.path) ? 'page' : undefined">
          <span class="dock-icon" aria-hidden="true" v-html="item.icon"></span>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
    </footer>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { useRoute } from 'vue-router';

defineProps({ contained: Boolean, title: { type: String, default: '' }, subtitle: { type: String, default: '' } });
const route = useRoute();
const layout = ref(null);
const dock = ref(null);
const header = ref(null);
let dockObserver;
onMounted(() => {
  const measure = () => {
    const footer = dock.value?.parentElement;
    if (header.value && layout.value) layout.value.style.setProperty('--atelier-header-height', `${header.value.getBoundingClientRect().height}px`);
    if (footer && layout.value) layout.value.style.setProperty('--dock-clearance', `${footer.getBoundingClientRect().height + 16}px`);
  };
  dockObserver = new ResizeObserver(measure);
  dockObserver.observe(dock.value.parentElement);
  dockObserver.observe(header.value);
  measure();
});
onBeforeUnmount(() => dockObserver?.disconnect());
const navItems = [
  { path: '/', label: 'Commandes', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>' },
  { path: '/clients', label: 'Clientes', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
  { path: '/catalogues', label: 'Catalogues', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/></svg>' },
  { path: '/papiers', label: 'Papiers', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>' },
  { path: '/stocks', label: 'Fournitures', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4Z"/><path d="m3.27 6.96 8.73 5.05 8.73-5.05M12 22.08v-10.07"/></svg>' },
];
const isActive = path => path === '/' ? route.path === '/' || route.path.startsWith('/commandes/') : route.path.startsWith(path);
</script>

<style scoped>
.app-layout { --dock-clearance: 120px; min-height: 100dvh; display: flex; flex-direction: column; background: var(--bg-app); }
.skip-link { position: absolute; top: 8px; left: 8px; z-index: calc(var(--z-sticky) + 1); padding: 12px; background: var(--card); color: var(--text-primary); transform: translateY(-150%); }
.skip-link:focus { transform: none; }
.atelier-header { display: flex; align-items: center; gap: 27px; min-height: var(--atelier-hero-height); padding: 16px var(--atelier-gutter); background: var(--primary); color: var(--primary-foreground); }
.atelier-brand { flex: 0 0 150px; display: grid; justify-items: start; gap: 13px; }
.atelier-logo { position: relative; white-space: nowrap; font-family: var(--font-brand); font-size: 33px; font-style: italic; line-height: 1.15; }
.atelier-logo::after { content: ''; position: absolute; bottom: -5px; left: 2px; right: 0; height: 3px; background: var(--accent); border-radius: 50%; transform: rotate(-3deg); }

.atelier-title { position: relative; isolation: isolate; flex: 0 1 auto; min-width: 0; padding: 8px 25px 9px 17px; color: var(--primary); font-size: 27px; font-weight: 600; line-height: 1.25; overflow-wrap: anywhere; }
.atelier-title::before { content: ''; position: absolute; inset: 0; z-index: -1; background: var(--card); clip-path: polygon(0 4%, 97% 0, 100% 24%, 97% 48%, 100% 72%, 96% 100%, 0 96%, 2% 50%); }
.atelier-caption { max-width: 350px; font-size: var(--font-size-base); line-height: 1.65; }
.main-content { flex: 1; min-width: 0; outline: none; }
.content-wrapper { width: 100%; padding: 20px var(--atelier-gutter) var(--dock-clearance); }
.dock-wrapper { position: fixed; inset: auto 0 0; z-index: var(--z-sticky); pointer-events: none; display: flex; justify-content: center; padding: 0 var(--atelier-gutter) max(20px, env(safe-area-inset-bottom)); }
.atelier-dock { pointer-events: auto; display: flex; justify-content: center; flex-wrap: wrap; gap: 5px; max-width: 100%; padding: 8px 17px; border-radius: var(--atelier-dock-radius); }
.dock-item { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; min-width: 72px; min-height: 58px; padding: 7px 13px 10px; border-radius: 13px; color: var(--text-secondary); font-size: var(--font-size-xs); text-decoration: none; }
.dock-item:hover { background: rgb(255 255 255 / 35%); color: var(--primary); }
.dock-item[aria-current="page"] { color: var(--primary); font-weight: var(--font-weight-semibold); }
.dock-item[aria-current="page"]::after { content: ''; position: absolute; bottom: 3px; width: 20px; height: 3px; border-radius: 3px; background: var(--atelier-active-mark); }
.dock-icon, .dock-icon :deep(svg) { width: 20px; height: 20px; }
.app-layout-contained .atelier-header { position: sticky; top: 0; z-index: var(--z-sticky); flex-shrink: 0; }
@media (min-width: 901px) {
  .app-layout-contained { height: 100dvh; overflow: hidden; }
  .app-layout-contained .main-content { min-height: 0; overflow: hidden; }
  .app-layout-contained .content-wrapper { display: flex; flex-direction: column; height: 100%; min-height: 0; padding-bottom: 0; }
}
@media (max-width: 760px) {
  .atelier-header { flex-wrap: wrap; gap: 12px 20px; }
  .atelier-caption { flex-basis: 100%; max-width: none; line-height: 1.5; }
}
@media (max-width: 480px) {
  .atelier-header { gap: 10px 16px; padding-block: 12px; }
  .atelier-brand { flex-basis: 128px; }
  .atelier-logo { font-size: 28px; }
  .atelier-title { padding: 6px 20px 7px 14px; font-size: 23px; }
  .atelier-dock { gap: 2px; padding: 8px; }
  .dock-item { min-width: 80px; padding-inline: 8px; }
}
</style>
