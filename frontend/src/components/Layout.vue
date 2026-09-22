<template>
  <div class="app-layout">
    <header class="topbar">
      <button ref="navigationButton" class="navigation-trigger" type="button" aria-label="Ouvrir la navigation" aria-controls="main-navigation" :aria-expanded="menuOpen" @click="toggleMenu">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      <span class="topbar-brand">Stamp App</span>
    </header>

    <div v-if="menuOpen" class="navigation-scrim" aria-hidden="true"></div>
    <nav v-if="menuOpen" id="main-navigation" ref="navigationMenu" class="navigation-menu" aria-label="Navigation principale" @click.stop>
      <p class="navigation-menu-title">Aller à</p>
      <router-link v-for="item in navItems" :key="item.path" :to="item.path" class="navigation-item" :class="{ 'navigation-item-active': isActive(item.path) }" :aria-current="isActive(item.path) ? 'page' : undefined" @click="closeMenu">
        <span class="navigation-icon" aria-hidden="true" v-html="item.icon"></span>
        <span>{{ item.label }}</span>
      </router-link>
    </nav>

    <main ref="mainContent" class="main-content" tabindex="-1"><div class="content-wrapper"><slot></slot></div></main>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const menuOpen = ref(false);
const navigationButton = ref(null);
const navigationMenu = ref(null);
const mainContent = ref(null);
const navItems = [
  { path: '/', label: 'Commandes', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>' },
  { path: '/clients', label: 'Clientes', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
  { path: '/catalogues', label: 'Catalogues', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/></svg>' },
  { path: '/stocks', label: 'Stocks', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4Z"/><path d="m3.27 6.96 8.73 5.05 8.73-5.05M12 22.08v-10.07"/></svg>' },
];
const isActive = path => path === '/' ? route.path === '/' : route.path.startsWith(path);
const focusFirstNavigationItem = async () => { await nextTick(); navigationMenu.value?.querySelector('a')?.focus(); };
const openMenu = () => { menuOpen.value = true; focusFirstNavigationItem(); };
const closeMenu = ({ restoreFocus = false } = {}) => { menuOpen.value = false; if (restoreFocus) nextTick(() => navigationButton.value?.focus()); };
const toggleMenu = () => menuOpen.value ? closeMenu({ restoreFocus: true }) : openMenu();
const onKeydown = event => {
  if (!menuOpen.value) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeMenu({ restoreFocus: true });
    return;
  }
  if (event.key === 'Tab') {
    const links = [...(navigationMenu.value?.querySelectorAll('a') ?? [])];
    const first = links[0];
    const last = links.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
};
const onPointerdown = event => { if (menuOpen.value && !navigationMenu.value?.contains(event.target) && !navigationButton.value?.contains(event.target)) closeMenu(); };
watch(() => route.fullPath, async () => { closeMenu(); await nextTick(); mainContent.value?.focus(); });
onMounted(() => { document.addEventListener('keydown', onKeydown); document.addEventListener('pointerdown', onPointerdown); });
onBeforeUnmount(() => { document.removeEventListener('keydown', onKeydown); document.removeEventListener('pointerdown', onPointerdown); });
</script>

<style scoped>
.app-layout { min-height: 100dvh; background: var(--bg-app); }
.topbar { position: sticky; top: 0; z-index: var(--z-sticky); display: flex; align-items: center; gap: var(--spacing-3); min-height: 56px; padding: var(--spacing-2) var(--spacing-4); border-bottom: 1px solid var(--border-light); background: var(--bg-frosted); backdrop-filter: blur(18px) saturate(130%); -webkit-backdrop-filter: blur(18px) saturate(130%); }
.navigation-trigger { display: inline-grid; width: 44px; height: 44px; place-items: center; border: 1px solid transparent; border-radius: var(--border-radius-sm); background: transparent; color: var(--text-primary); cursor: pointer; transition: background-color var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast); }
.navigation-trigger:hover, .navigation-trigger[aria-expanded="true"] { background: var(--primary-light); border-color: var(--border); color: var(--primary); }
.navigation-trigger svg { width: 20px; height: 20px; }
.topbar-brand { font-family: var(--font-heading); font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); color: var(--text-primary); letter-spacing: var(--letter-spacing-tight); }
.navigation-scrim { position: fixed; inset: 0; z-index: calc(var(--z-sticky) - 1); background: var(--bg-overlay); }
.navigation-menu { position: fixed; top: calc(56px + var(--spacing-2)); left: var(--spacing-3); z-index: calc(var(--z-sticky) + 1); display: grid; min-width: min(300px, calc(100vw - var(--spacing-6))); gap: var(--spacing-1); padding: var(--spacing-2); border: 1px solid var(--border-light); border-radius: var(--border-radius); background: var(--bg-frosted); box-shadow: var(--shadow-md); backdrop-filter: blur(18px) saturate(130%); -webkit-backdrop-filter: blur(18px) saturate(130%); }
.navigation-menu-title { padding: var(--spacing-2) var(--spacing-3); color: var(--text-secondary); font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); text-transform: uppercase; letter-spacing: var(--letter-spacing-wide); }
.navigation-item { display: flex; align-items: center; gap: var(--spacing-3); min-height: 44px; padding: var(--spacing-2) var(--spacing-3); border: 1px solid transparent; border-radius: var(--border-radius-sm); color: var(--text-primary); font-weight: var(--font-weight-medium); text-decoration: none; transition: background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast); }
.navigation-item:hover { background: var(--primary-light); color: var(--primary); }
.navigation-item-active { border-color: var(--primary); background: var(--primary-light); color: var(--primary); font-weight: var(--font-weight-semibold); }
.navigation-icon { display: inline-grid; width: 22px; height: 22px; place-items: center; }
.navigation-icon :deep(svg) { width: 20px; height: 20px; }
.main-content { min-height: calc(100dvh - 56px); outline: none; }
.content-wrapper { width: min(100%, 1280px); margin: 0 auto; padding: var(--spacing-6) var(--spacing-4); }
@media (min-width: 768px) { .topbar { padding-inline: var(--spacing-6); } .content-wrapper { padding: var(--spacing-8); } .navigation-menu { left: var(--spacing-6); } }
@media (prefers-reduced-motion: reduce) { .navigation-trigger, .navigation-item { transition: none; } }
</style>
