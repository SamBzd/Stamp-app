<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click.self="handleClose">
        <div class="modal-container" :style="{ maxWidth: maxWidth }">
          <!-- Barre de titre macOS style -->
          <div class="modal-header">
            <div class="traffic-lights">
              <button 
                class="traffic-light red" 
                @click="handleClose"
                title="Fermer"
              ></button>
              <button 
                class="traffic-light yellow" 
                @click="handleMinimize"
                title="Réduire"
              ></button>
              <button 
                class="traffic-light green"
                title="Agrandir"
              ></button>
            </div>
            <h2 class="modal-title">{{ title }}</h2>
            <div class="modal-header-spacer"></div>
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

const emit = defineEmits(['close', 'minimize']);

const handleClose = () => {
  emit('close');
};

const handleMinimize = () => {
  emit('minimize');
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
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: var(--spacing-6);
}

.modal-container {
  background: var(--bg-primary);
  border-radius: var(--border-radius-xl);
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  width: 100%;
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  padding: var(--spacing-4) var(--spacing-5);
  background: linear-gradient(180deg, var(--gray-50) 0%, var(--gray-100) 100%);
  border-bottom: 1px solid var(--border-color);
  min-height: 52px;
  user-select: none;
}

.traffic-lights {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.traffic-light {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.traffic-light:hover {
  filter: brightness(0.9);
}

.traffic-light.red { 
  background: var(--macos-red);
  box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.1);
}

.traffic-light.yellow { 
  background: var(--macos-yellow);
  box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.1);
}

.traffic-light.green { 
  background: var(--macos-green);
  box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.1);
}

/* Icons inside traffic lights on hover */
.traffic-lights:hover .traffic-light.red::after {
  content: '×';
  font-size: 11px;
  font-weight: bold;
  color: rgba(74, 0, 0, 0.8);
  line-height: 1;
}

.traffic-lights:hover .traffic-light.yellow::after {
  content: '−';
  font-size: 14px;
  font-weight: bold;
  color: rgba(92, 69, 0, 0.8);
  line-height: 0.7;
}

.traffic-lights:hover .traffic-light.green::after {
  content: '+';
  font-size: 12px;
  font-weight: bold;
  color: rgba(0, 74, 0, 0.8);
  line-height: 1;
}

.modal-title {
  flex: 1;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0;
  text-align: center;
  padding: 0 var(--spacing-4);
}

.modal-header-spacer {
  width: 52px; /* Équilibre les contrôles */
  flex-shrink: 0;
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
  background: var(--gray-50);
  border-top: 1px solid var(--border-color);
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
    border-radius: var(--border-radius-xl) var(--border-radius-xl) 0 0;
  }
}
</style>
