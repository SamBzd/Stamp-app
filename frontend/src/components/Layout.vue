<template>
  <div class="app-layout">
    <!-- Icon Rail (left) -->
    <aside class="icon-rail">
      <div class="rail-brand">
        <div class="rail-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
      </div>

      <nav class="rail-nav">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="rail-item"
          :class="{ 'rail-item-active': isActive(item.path) }"
          :title="item.label"
        >
          <span class="rail-icon" v-html="item.icon"></span>
          <span class="rail-label">{{ item.label }}</span>
          <span v-if="item.badge" class="rail-badge">{{ item.badge }}</span>
        </router-link>
      </nav>

      <div class="rail-footer">
        <div class="rail-version">v1</div>
      </div>
    </aside>

    <!-- Top Bar -->
    <header class="topbar">
      <div class="topbar-left">
        <span class="topbar-brand">Stamp App</span>
      </div>
      <div class="topbar-center">
        <div class="topbar-search" @click="$emit('focus-search')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <span class="topbar-search-placeholder">Rechercher...</span>
          <kbd class="topbar-kbd">/</kbd>
        </div>
      </div>
      <div class="topbar-right">
        <button class="topbar-new-btn" @click="$emit('new-order')" title="Nouvelle commande (N)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>Nouvelle commande</span>
        </button>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="main-content">
      <div class="content-wrapper">
        <slot></slot>
      </div>
    </main>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router';

const route = useRoute();

defineEmits(['new-order', 'focus-search']);

const navItems = [
  { 
    path: '/', 
    label: 'Commandes', 
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="9" cy="21" r="1"/>
      <circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>`
  },
  { 
    path: '/clients', 
    label: 'Clients', 
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>`
  },
  { 
    path: '/groupes', 
    label: 'Catalogues', 
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="9" y1="21" x2="9" y2="9"/>
    </svg>`
  },
  { 
    path: '/stocks', 
    label: 'Stocks', 
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>`
  },
];

const isActive = (path) => {
  if (path === '/') {
    return route.path === '/';
  }
  return route.path.startsWith(path);
};
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background: var(--bg-app);
}

/* ==========================================
   ICON RAIL (left side)
   ========================================== */
.icon-rail {
  width: 68px;
  background: var(--bg-frosted);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-right: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  align-items: center;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  z-index: var(--z-sticky);
  padding: var(--spacing-3) 0;
}

.rail-brand {
  padding: var(--spacing-3) 0 var(--spacing-5);
}

.rail-logo {
  width: 40px;
  height: 40px;
  background: var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-foreground);
  box-shadow: 0 4px 12px rgba(93, 112, 82, 0.30);
}

.rail-logo svg {
  width: 20px;
  height: 20px;
}

/* Rail Navigation */
.rail-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-1);
  width: 100%;
  padding: 0 var(--spacing-2);
}

.rail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 52px;
  padding: var(--spacing-2) 0;
  border-radius: var(--border-radius);
  color: var(--text-tertiary);
  text-decoration: none;
  transition: all var(--transition-fast);
  position: relative;
}

.rail-item:hover {
  background: var(--primary-light);
  color: var(--primary);
}

.rail-item-active {
  background: var(--primary-medium);
  color: var(--primary);
}

.rail-item-active::before {
  content: '';
  position: absolute;
  left: -6px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: var(--primary);
  border-radius: 0 3px 3px 0;
}

.rail-icon {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rail-icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.rail-label {
  font-size: 10px;
  font-weight: var(--font-weight-medium);
  line-height: 1;
  letter-spacing: 0.01em;
}

.rail-badge {
  position: absolute;
  top: 2px;
  right: 4px;
  background: var(--warning);
  color: white;
  font-size: 9px;
  font-weight: var(--font-weight-bold);
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Rail Footer */
.rail-footer {
  padding: var(--spacing-3) 0;
}

.rail-version {
  font-size: 10px;
  color: var(--text-tertiary);
  opacity: 0.5;
}

/* ==========================================
   TOP BAR
   ========================================== */
.topbar {
  position: fixed;
  top: 0;
  left: 68px;
  right: 0;
  height: 56px;
  background: var(--bg-frosted);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  padding: 0 var(--spacing-6);
  gap: var(--spacing-6);
  z-index: calc(var(--z-sticky) - 1);
}

.topbar-left {
  flex-shrink: 0;
}

.topbar-brand {
  font-family: var(--font-heading);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  letter-spacing: var(--letter-spacing-tight);
}

.topbar-center {
  flex: 1;
  display: flex;
  justify-content: center;
  max-width: 480px;
  margin: 0 auto;
}

.topbar-search {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  width: 100%;
  padding: var(--spacing-2) var(--spacing-4);
  background: var(--muted);
  border: 1.5px solid transparent;
  border-radius: var(--border-radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--text-tertiary);
}

.topbar-search:hover {
  background: var(--bg-primary);
  border-color: var(--border);
}

.topbar-search svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.topbar-search-placeholder {
  flex: 1;
  font-size: var(--font-size-sm);
}

.topbar-kbd {
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 1px 6px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-tertiary);
  line-height: 1.4;
}

.topbar-right {
  flex-shrink: 0;
}

.topbar-new-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-5) var(--spacing-2) var(--spacing-3);
  background: var(--primary);
  color: var(--primary-foreground);
  border: none;
  border-radius: var(--border-radius-full);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: 0 2px 8px rgba(93, 112, 82, 0.25);
}

.topbar-new-btn:hover {
  background: var(--success-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(93, 112, 82, 0.35);
}

.topbar-new-btn:active {
  transform: translateY(0);
}

.topbar-new-btn svg {
  width: 18px;
  height: 18px;
}

/* ==========================================
   MAIN CONTENT
   ========================================== */
.main-content {
  flex: 1;
  margin-left: 68px;
  margin-top: 56px;
  min-height: calc(100vh - 56px);
  display: flex;
  flex-direction: column;
}

.content-wrapper {
  flex: 1;
  padding: var(--spacing-6) var(--spacing-8);
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}

/* ==========================================
   RESPONSIVE
   ========================================== */
@media (max-width: 1024px) {
  .topbar-new-btn span {
    display: none;
  }

  .topbar-new-btn {
    padding: var(--spacing-2) var(--spacing-3);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    justify-content: center;
  }

  .content-wrapper {
    padding: var(--spacing-5);
  }
}

@media (max-width: 768px) {
  .icon-rail {
    width: 56px;
  }

  .rail-label {
    display: none;
  }

  .rail-item {
    width: 44px;
  }

  .topbar {
    left: 56px;
    padding: 0 var(--spacing-4);
  }

  .topbar-brand {
    display: none;
  }

  .main-content {
    margin-left: 56px;
  }
}
</style>
