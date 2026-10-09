<template>
  <Teleport to="body" :disabled="inline">
    <Transition :name="inline ? 'inline-panel' : 'slide-panel'">
      <div v-if="isOpen" class="slide-panel-overlay" :class="{ 'slide-panel-inline': inline }" @click.self="!inline && $emit('close')">
        <div ref="dialog" class="slide-panel" :style="{ maxWidth: inline ? 'none' : maxWidth }" :role="inline ? 'region' : 'dialog'" :aria-modal="inline ? undefined : true" :aria-label="title || 'Détails'" tabindex="-1">
          <!-- Header -->
          <div class="slide-panel-header">
            <slot name="header"><h2 v-if="title" class="slide-panel-title">{{ title }}</h2></slot>
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
import { nextTick, ref, watch, onMounted, onUnmounted } from 'vue';
import { lockBodyScroll } from '../composables/useBodyScrollLock';

const props = defineProps({
  returnFocusId: { type: String, default: '' },
  inline: { type: Boolean, default: false },
  isOpen: { type: Boolean, default: false },
  title: { type: String, default: '' },
  maxWidth: { type: String, default: '480px' },
});

const emit = defineEmits(['close']);
const dialog = ref(null);
let previousFocus;
let releaseScrollLock;

// Escape key handler
const onKeydown = (e) => {
  if (!props.isOpen || !dialog.value) return;
  if (document.querySelector('.modal-overlay')) return;
  if (props.inline && !dialog.value.contains(document.activeElement)) return;
  if (e.key === 'Escape' && props.isOpen) {
    emit('close');
  }
  if (e.key === 'Tab' && !props.inline) {
    const controls = [...dialog.value.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter(element => element.getClientRects().length);
    const first = controls[0];
    const last = controls.at(-1);
    if (!first) { e.preventDefault(); dialog.value.focus(); }
    else if (e.shiftKey && (document.activeElement === first || !dialog.value.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !dialog.value.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  }
};

// Un détail latéral ne bloque ni le défilement ni le focus dans la liste.
watch([() => props.isOpen, () => props.inline], async ([open, inline], previous = []) => {
  const [wasOpen] = previous;
  releaseScrollLock?.();
  releaseScrollLock = undefined;
  if (open) {
    if (!wasOpen) previousFocus = document.activeElement;
    if (!inline) releaseScrollLock = lockBodyScroll();
    await nextTick();
    dialog.value?.querySelector('.slide-panel-close')?.focus();
  } else if (wasOpen) {
    await nextTick();
    // Une mutation peut avoir recréé la ligne qui avait ouvert le détail.
    const target = (props.returnFocusId && document.getElementById(props.returnFocusId))
      || (previousFocus?.isConnected ? previousFocus : null);
    target?.focus();
  }
}, { immediate: true });

onMounted(() => {
  document.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
  releaseScrollLock?.();
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
  margin-left: auto;
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
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-3);
  padding: var(--spacing-4) var(--spacing-6);
  border-top: 1px solid var(--border-light);
  background: var(--bg-tertiary);
  flex-shrink: 0;
}

/* Mode latéral pour Commandes : même contenu et actions, sans overlay. */
.slide-panel-inline { position: static; min-width: 0; z-index: auto; display: block; background: transparent; backdrop-filter: none; -webkit-backdrop-filter: none; }
.slide-panel-inline .slide-panel { height: auto; min-height: 360px; max-height: calc(100dvh - 360px); border-radius: var(--border-radius-xl); box-shadow: var(--shadow-sm); }
.slide-panel-inline .slide-panel-header { padding: 14px 18px; }
.slide-panel-inline .slide-panel-title { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--text-secondary); letter-spacing: normal; }
.slide-panel-inline .slide-panel-body { padding: 0 18px 18px; min-height: 0; overflow-y: auto; }
.slide-panel-inline .slide-panel-footer { padding: 16px 18px; background: var(--card); }
.slide-panel-close { min-width: 44px; min-height: 44px; }

/* === Transitions === */
.slide-panel-enter-active {
  transition: opacity var(--transition-fast);
}
.slide-panel-enter-active .slide-panel {
  transition: transform var(--transition-normal);
}
.slide-panel-leave-active {
  transition: opacity var(--transition-fast);
}
.slide-panel-leave-active .slide-panel {
  transition: transform var(--transition-fast);
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
