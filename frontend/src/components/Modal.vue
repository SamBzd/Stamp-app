<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click.self="handleClose">
        <div class="modal-container" :style="{ maxWidth: maxWidth }">
          <!-- Barre de titre -->
          <div class="modal-header">
            <h2 class="modal-title">{{ title }}</h2>
            <button class="modal-close" @click="handleClose" title="Fermer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- Contenu -->
          <div class="modal-content" :class="{ 'modal-content-padded': !noPadding }">
            <slot></slot>
          </div>

          <!-- Footer avec actions -->
          <div v-if="$slots.footer" class="modal-footer">
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
  isOpen: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'Modal',
  },
  maxWidth: {
    type: String,
    default: '560px',
  },
  noPadding: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close']);

const handleClose = () => {
  emit('close');
};

// Fermer avec la touche Escape
const handleKeydown = (e) => {
  if (e.key === 'Escape' && props.isOpen) {
    handleClose();
  }
};

// Empêcher le scroll du body quand la modal est ouverte
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(44, 44, 36, 0.35);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: var(--spacing-6);
}

.modal-container {
  background: var(--card);
  border-radius: var(--border-radius-2xl);
  box-shadow: 
    0 25px 50px -12px rgba(93, 112, 82, 0.20),
    0 0 0 1px var(--border-light);
  width: 100%;
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-5) var(--spacing-6);
  background: linear-gradient(180deg, var(--muted) 0%, var(--accent) 100%);
  border-bottom: 1px solid var(--border-light);
  min-height: 56px;
  user-select: none;
}

.modal-title {
  flex: 1;
  font-family: var(--font-heading);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: var(--border-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.modal-close:hover {
  background: var(--primary-light);
  color: var(--primary);
}

.modal-close svg {
  width: 16px;
  height: 16px;
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.modal-content-padded {
  padding: var(--spacing-6);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-3);
  padding: var(--spacing-4) var(--spacing-6);
  background: var(--muted);
  border-top: 1px solid var(--border-light);
}

/* === Transitions === */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-enter-from .modal-container {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}

.modal-leave-to .modal-container {
  transform: scale(0.95);
  opacity: 0;
}

/* === Responsive === */
@media (max-width: 640px) {
  .modal-overlay {
    padding: var(--spacing-4);
    align-items: flex-end;
  }
  
  .modal-container {
    max-height: calc(100vh - 32px);
    border-radius: var(--border-radius-2xl) var(--border-radius-2xl) 0 0;
  }
}
</style>
