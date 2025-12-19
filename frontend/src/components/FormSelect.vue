<template>
  <div class="form-field">
    <label v-if="label" :for="selectId" class="form-label">
      {{ label }}
      <span v-if="required" class="form-required">*</span>
    </label>
    <div class="select-wrapper" :class="{ 'select-error': error, 'select-focused': isFocused }">
      <select
        :id="selectId"
        ref="selectRef"
        :value="modelValue"
        :required="required"
        :disabled="disabled"
        class="form-select"
        @change="handleChange"
        @focus="handleFocus"
        @blur="handleBlur"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option 
          v-for="option in options" 
          :key="option.value" 
          :value="option.value"
          :disabled="option.disabled"
        >
          {{ option.label }}
        </option>
      </select>
      <span class="select-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </span>
    </div>
    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-else-if="hint" class="form-hint">{{ hint }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
  options: {
    type: Array,
    required: true,
    validator: (options) => options.every(opt => opt.value !== undefined && opt.label !== undefined),
  },
  placeholder: {
    type: String,
    default: '',
  },
  required: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
  hint: {
    type: String,
    default: '',
  },
});

const selectId = computed(() => `select-${Math.random().toString(36).substr(2, 9)}`);
const selectRef = ref(null);
const isFocused = ref(false);

const emit = defineEmits(['update:modelValue']);

const handleChange = (event) => {
  emit('update:modelValue', event.target.value);
};

const handleFocus = () => {
  isFocused.value = true;
};

const handleBlur = () => {
  isFocused.value = false;
};

// Expose focus method
defineExpose({
  focus: () => selectRef.value?.focus(),
});
</script>

<style scoped>
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-4);
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
}

.form-required {
  color: var(--rose-500);
}

.select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--bg-primary);
  border: 1.5px solid var(--border-color);
  border-radius: var(--border-radius);
  transition: all var(--transition-fast);
}

.select-wrapper:hover:not(.select-error) {
  border-color: var(--gray-300);
}

.select-focused:not(.select-error) {
  border-color: var(--rose-400);
  box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.12);
}

.select-error {
  border-color: var(--error);
}

.select-error.select-focused {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
}

.form-select {
  flex: 1;
  padding: var(--spacing-3) var(--spacing-10) var(--spacing-3) var(--spacing-4);
  border: none;
  background: transparent;
  font-size: var(--font-size-sm);
  font-family: var(--font-family);
  color: var(--text-primary);
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  min-width: 0;
  width: 100%;
}

.form-select:focus {
  outline: none;
}

.form-select:disabled {
  background: var(--gray-50);
  color: var(--text-tertiary);
  cursor: not-allowed;
}

.form-select option {
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: var(--spacing-2);
}

.form-select option:disabled {
  color: var(--text-tertiary);
}

.select-icon {
  position: absolute;
  right: var(--spacing-3);
  pointer-events: none;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.select-icon svg {
  width: 16px;
  height: 16px;
}

.form-error {
  font-size: var(--font-size-xs);
  color: var(--error);
  margin: 0;
}

.form-hint {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin: 0;
}
</style>
