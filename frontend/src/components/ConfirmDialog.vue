<template>
  <Modal
    :is-open="isOpen"
    :title="title"
    max-width="420px"
    @close="handleCancel"
  >
    <div class="confirm-content">
      <div v-if="icon" class="confirm-icon" :class="`confirm-icon-${variant}`">
        <svg v-if="variant === 'danger'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
      </div>
      <p class="confirm-message">{{ message }}</p>
    </div>
    <template #footer>
      <Button variant="secondary" @click="handleCancel">
        {{ cancelText }}
      </Button>
      <Button :variant="confirmVariant" @click="handleConfirm">
        {{ confirmText }}
      </Button>
    </template>
  </Modal>
</template>

<script setup>
import { computed } from 'vue';
import Modal from './Modal.vue';
import Button from './Button.vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'Confirmation',
  },
  message: {
    type: String,
    required: true,
  },
  confirmText: {
    type: String,
    default: 'Confirmer',
  },
  cancelText: {
    type: String,
    default: 'Annuler',
  },
  variant: {
    type: String,
    default: 'info',
    validator: (v) => ['info', 'danger'].includes(v),
  },
  icon: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['confirm', 'cancel']);

const confirmVariant = computed(() => {
  return props.variant === 'danger' ? 'danger' : 'primary';
});

const handleConfirm = () => {
  emit('confirm');
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<style scoped>
.confirm-content {
  text-align: center;
  padding: var(--spacing-4) 0;
}

.confirm-icon {
  width: 60px;
  height: 60px;
  border-radius: var(--border-radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--spacing-5);
}

.confirm-icon svg {
  width: 28px;
  height: 28px;
}

.confirm-icon-danger {
  background: var(--destructive-light);
  color: var(--destructive);
}

.confirm-icon-info {
  background: var(--primary-light);
  color: var(--primary);
}

.confirm-message {
  font-size: var(--font-size-md);
  color: var(--text-primary);
  line-height: 1.5;
  margin: 0;
}
</style>
