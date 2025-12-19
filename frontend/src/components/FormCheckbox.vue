<template>
  <div class="form-field-checkbox">
    <label :for="checkboxId" class="checkbox-label" :class="{ 'checkbox-disabled': disabled }">
      <div class="checkbox-wrapper">
        <input
          :id="checkboxId"
          ref="checkboxRef"
          type="checkbox"
          :checked="modelValue"
          :disabled="disabled"
          class="checkbox-input"
          @change="handleChange"
        />
        <div class="checkbox-custom" :class="{ 'checkbox-checked': modelValue }">
          <svg v-if="modelValue" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
      </div>
      <div class="checkbox-content">
        <span class="checkbox-text">{{ label }}</span>
        <span v-if="description" class="checkbox-description">{{ description }}</span>
      </div>
    </label>
    <p v-if="error" class="form-error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  label: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
});

const checkboxId = computed(() => `checkbox-${Math.random().toString(36).substr(2, 9)}`);
const checkboxRef = ref(null);

const emit = defineEmits(['update:modelValue']);

const handleChange = (event) => {
  emit('update:modelValue', event.target.checked);
};

// Expose focus method
defineExpose({
  focus: () => checkboxRef.value?.focus(),
});
</script>

<style scoped>
.form-field-checkbox {
  margin-bottom: var(--spacing-4);
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-3);
  cursor: pointer;
  user-select: none;
}

.checkbox-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.checkbox-wrapper {
  position: relative;
  flex-shrink: 0;
}

.checkbox-input {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.checkbox-disabled .checkbox-input {
  cursor: not-allowed;
}

.checkbox-custom {
  width: 20px;
  height: 20px;
  border: 2px solid var(--gray-300);
  border-radius: var(--border-radius-xs);
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.checkbox-input:focus-visible + .checkbox-custom {
  outline: 2px solid var(--rose-400);
  outline-offset: 2px;
}

.checkbox-label:hover:not(.checkbox-disabled) .checkbox-custom:not(.checkbox-checked) {
  border-color: var(--rose-400);
}

.checkbox-checked {
  background: linear-gradient(180deg, var(--rose-500) 0%, var(--rose-600) 100%);
  border-color: var(--rose-500);
}

.checkbox-custom svg {
  width: 14px;
  height: 14px;
  color: white;
}

.checkbox-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  padding-top: 1px;
}

.checkbox-text {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  line-height: 1.3;
}

.checkbox-description {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  line-height: 1.4;
}

.form-error {
  font-size: var(--font-size-xs);
  color: var(--error);
  margin: var(--spacing-2) 0 0;
  padding-left: calc(20px + var(--spacing-3));
}
</style>
