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
        :aria-invalid="Boolean(error)"
        :aria-describedby="error || hint ? `${selectId}-feedback` : undefined"
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
      <span class="select-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </span>
    </div>
    <p v-if="error" :id="`${selectId}-feedback`" class="form-error" role="alert">{{ error }}</p>
    <p v-else-if="hint" :id="`${selectId}-feedback`" class="form-hint">{{ hint }}</p>
  </div>
</template>

<script setup>
import { ref, useId } from 'vue';

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

const selectId = useId();
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
  color: var(--secondary);
}

.select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--card);
  border: 1.5px solid var(--border);
  border-radius: var(--control-radius);
  transition: all var(--transition-fast);
}

.select-wrapper:hover:not(.select-error) {
  border-color: var(--muted-foreground);
}

.select-focused:not(.select-error) {
  border-color: var(--primary);
  box-shadow: var(--control-focus-ring);
}

.select-error {
  border-color: var(--error);
}

.select-error.select-focused {
  box-shadow: var(--control-error-ring);
}

.form-select {
  flex: 1;
  padding: 10px 40px 10px 12px;
  border: none;
  background: transparent;
  font-size: var(--font-size-sm);
  font-family: var(--font-family);
  line-height: 1.5;
  color: var(--text-primary);
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  min-width: 0;
  width: 100%;
  min-height: calc(var(--control-height) - 3px);
}

.form-select:focus {
  outline: none;
}

.form-select:disabled {
  background: var(--muted);
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
  right: var(--spacing-4);
  pointer-events: none;
  color: var(--muted-foreground);
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
  padding-left: 0;
}

.form-hint {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin: 0;
  padding-left: 0;
}
@media (max-width: 640px) { .form-select { font-size: 16px; } }
</style>
