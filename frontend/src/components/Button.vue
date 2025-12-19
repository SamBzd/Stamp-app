<template>
  <button
    :class="[
      'btn',
      `btn-${variant}`,
      `btn-${size}`,
      { 
        'btn-disabled': disabled,
        'btn-loading': loading,
        'btn-icon-only': iconOnly
      }
    ]"
    :disabled="disabled || loading"
    :type="type"
    @click="handleClick"
  >
    <span v-if="loading" class="btn-spinner">
      <svg class="spinner" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.25"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>
    </span>
    <span v-if="$slots.icon && !loading" class="btn-icon">
      <slot name="icon"></slot>
    </span>
    <span v-if="!iconOnly" class="btn-text">
      <slot></slot>
    </span>
  </button>
</template>

<script setup>
const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'ghost', 'danger', 'success', 'outline'].includes(value),
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value),
  },
  type: {
    type: String,
    default: 'button',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  iconOnly: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['click']);

const handleClick = (event) => {
  if (!props.disabled && !props.loading) {
    emit('click', event);
  }
};
</script>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  font-family: var(--font-family);
  font-weight: var(--font-weight-medium);
  border-radius: var(--border-radius);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  user-select: none;
  position: relative;
  overflow: hidden;
}

.btn:focus-visible {
  outline: 2px solid var(--rose-400);
  outline-offset: 2px;
}

.btn:not(.btn-disabled):not(.btn-loading):active {
  transform: scale(0.98);
}

/* === Sizes === */
.btn-sm {
  padding: var(--spacing-2) var(--spacing-3);
  font-size: var(--font-size-sm);
  min-height: 32px;
}

.btn-md {
  padding: var(--spacing-2) var(--spacing-4);
  font-size: var(--font-size-sm);
  min-height: 38px;
}

.btn-lg {
  padding: var(--spacing-3) var(--spacing-6);
  font-size: var(--font-size-base);
  min-height: 44px;
}

/* Icon only buttons */
.btn-icon-only.btn-sm {
  width: 32px;
  padding: 0;
}

.btn-icon-only.btn-md {
  width: 38px;
  padding: 0;
}

.btn-icon-only.btn-lg {
  width: 44px;
  padding: 0;
}

/* === Variants === */
.btn-primary {
  background: linear-gradient(180deg, var(--rose-500) 0%, var(--rose-600) 100%);
  color: white;
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.btn-primary:hover:not(.btn-disabled):not(.btn-loading) {
  background: linear-gradient(180deg, var(--rose-600) 0%, var(--rose-700) 100%);
  box-shadow: 
    0 4px 12px rgba(236, 72, 153, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.btn-secondary {
  background: var(--gray-100);
  color: var(--text-primary);
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.btn-secondary:hover:not(.btn-disabled):not(.btn-loading) {
  background: var(--gray-200);
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
}

.btn-ghost:hover:not(.btn-disabled):not(.btn-loading) {
  background: var(--gray-100);
  color: var(--text-primary);
}

.btn-outline {
  background: transparent;
  color: var(--rose-600);
  border: 1.5px solid var(--rose-300);
}

.btn-outline:hover:not(.btn-disabled):not(.btn-loading) {
  background: var(--rose-50);
  border-color: var(--rose-400);
}

.btn-danger {
  background: linear-gradient(180deg, var(--macos-red) 0%, #e04e4e 100%);
  color: white;
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.btn-danger:hover:not(.btn-disabled):not(.btn-loading) {
  background: linear-gradient(180deg, #e04e4e 0%, #cc4545 100%);
  box-shadow: 
    0 4px 12px rgba(255, 95, 87, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.btn-success {
  background: linear-gradient(180deg, var(--macos-green) 0%, #1db954 100%);
  color: white;
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.btn-success:hover:not(.btn-disabled):not(.btn-loading) {
  background: linear-gradient(180deg, #1db954 0%, #1aa34a 100%);
  box-shadow: 
    0 4px 12px rgba(40, 200, 64, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

/* === States === */
.btn-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-loading {
  cursor: wait;
}

.btn-loading .btn-text {
  opacity: 0.7;
}

/* === Icon & Spinner === */
.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon :deep(svg) {
  width: 16px;
  height: 16px;
}

.btn-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 16px;
  height: 16px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.btn-text {
  display: flex;
  align-items: center;
}
</style>
