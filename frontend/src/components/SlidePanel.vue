<template>
  <Teleport to="body">
    <Transition name="slide-panel">
      <div v-if="isOpen" class="slide-panel-overlay" @click.self="$emit('close')">
        <div class="slide-panel" :style="{ maxWidth: maxWidth }">
          <!-- Header -->
          <div class="slide-panel-header">
            <h2 class="slide-panel-title">{{ title }}</h2>
            <button class="slide-panel-close" @click="$emit('close')" title="Fermer (Échap)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="slide-panel-body">
            <slot></slot>
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="slide-panel-footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { watch, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  title: { type: String, default: '' },
  maxWidth: { type: String, default: '480px' },
});

const emit = defineEmits(['close']);

// Escape key handler
const onKeydown = (e) => {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close');
  }
};

// Body scroll lock
watch(() => props.isOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : '';
});

onMounted(() => {
  document.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = '';
});
</script>

<style scoped>
/* === Overlay === */
.slide-panel-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-overlay);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: var(--z-modal-backdrop);
  display: flex;
  justify-content: flex-end;
}

/* === Panel === */
.slide-panel {
  width: 100%;
  height: 100vh;
  background: var(--bg-primary);
  box-shadow: -8px 0 40px rgba(44, 44, 36, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* === Header === */
.slide-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-5) var(--spacing-6);
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.slide-panel-title {
  font-family: var(--font-heading);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin: 0;
  letter-spacing: var(--letter-spacing-tight);
}

.slide-panel-close {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--muted);
  border-radius: var(--border-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.slide-panel-close:hover {
  background: var(--destructive-light);
  color: var(--destructive);
  transform: scale(1.05);
}

.slide-panel-close svg {
  width: 18px;
  height: 18px;
}

/* === Body === */
.slide-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-6);
}

/* === Footer === */
.slide-panel-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-3);
  padding: var(--spacing-4) var(--spacing-6);
  border-top: 1px solid var(--border-light);
  background: var(--bg-tertiary);
  flex-shrink: 0;
}

/* === Transitions === */
.slide-panel-enter-active {
  transition: opacity 0.3s ease;
}
.slide-panel-enter-active .slide-panel {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-panel-leave-active {
  transition: opacity 0.25s ease;
}
.slide-panel-leave-active .slide-panel {
  transition: transform 0.25s cubic-bezier(0.4, 0, 1, 1);
}

.slide-panel-enter-from {
  opacity: 0;
}
.slide-panel-enter-from .slide-panel {
  transform: translateX(100%);
}
.slide-panel-leave-to {
  opacity: 0;
}
.slide-panel-leave-to .slide-panel {
  transform: translateX(100%);
}

/* === Responsive === */
@media (max-width: 640px) {
  .slide-panel {
    max-width: 100% !important;
  }
}
</style>
