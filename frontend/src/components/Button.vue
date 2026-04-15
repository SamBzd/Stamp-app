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
  font-weight: var(--font-weight-semibold);
  border-radius: var(--border-radius-full);
  border: none;
  cursor: pointer;
  transition: all var(--transition-normal);
  white-space: nowrap;
  user-select: none;
  position: relative;
  overflow: hidden;
}

.btn:focus-visible {
  outline: 2px solid rgba(93, 112, 82, 0.40);
  outline-offset: 2px;
}

.btn:not(.btn-disabled):not(.btn-loading):hover {
  transform: scale(1.05);
}

.btn:not(.btn-disabled):not(.btn-loading):active {
  transform: scale(0.95);
}

/* === Sizes === */
.btn-sm {
  padding: var(--spacing-2) var(--spacing-5);
  font-size: var(--font-size-sm);
  min-height: 40px;
}

.btn-md {
  padding: var(--spacing-3) var(--spacing-6);
  font-size: var(--font-size-sm);
  min-height: 48px;
}

.btn-lg {
  padding: var(--spacing-3) var(--spacing-8);
  font-size: var(--font-size-base);
  min-height: 56px;
}

/* Icon only buttons */
.btn-icon-only.btn-sm {
  width: 40px;
  padding: 0;
}

.btn-icon-only.btn-md {
  width: 48px;
  padding: 0;
}

.btn-icon-only.btn-lg {
  width: 56px;
  padding: 0;
}

/* === Variants === */
.btn-primary {
  background: var(--primary);
  color: var(--primary-foreground);
  box-shadow: var(--shadow-soft);
}

.btn-primary:hover:not(.btn-disabled):not(.btn-loading) {
  box-shadow: 0 6px 24px -4px rgba(93, 112, 82, 0.30);
}

.btn-secondary {
  background: var(--muted);
  color: var(--text-primary);
  box-shadow: var(--shadow-xs);
}

.btn-secondary:hover:not(.btn-disabled):not(.btn-loading) {
  background: var(--accent);
}

.btn-ghost {
  background: transparent;
  color: var(--primary);
}

.btn-ghost:hover:not(.btn-disabled):not(.btn-loading) {
  background: var(--primary-light);
}

.btn-outline {
  background: transparent;
  color: var(--secondary);
  border: 2px solid var(--secondary);
}

.btn-outline:hover:not(.btn-disabled):not(.btn-loading) {
  background: var(--secondary-light);
}

.btn-danger {
  background: var(--destructive);
  color: white;
  box-shadow: 0 4px 20px -2px rgba(168, 84, 72, 0.20);
}

.btn-danger:hover:not(.btn-disabled):not(.btn-loading) {
  box-shadow: 0 6px 24px -4px rgba(168, 84, 72, 0.35);
}

.btn-success {
  background: var(--primary);
  color: var(--primary-foreground);
  box-shadow: var(--shadow-soft);
}

.btn-success:hover:not(.btn-disabled):not(.btn-loading) {
  box-shadow: 0 6px 24px -4px rgba(93, 112, 82, 0.30);
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
