<template>
  <div class="form-field">
    <label v-if="label" :for="inputId" class="form-label">
      {{ label }}
      <span v-if="required" class="form-required">*</span>
    </label>
    <div class="input-wrapper" :class="{ 'input-error': error, 'input-focused': isFocused }">
      <span v-if="$slots.prefix" class="input-prefix">
        <slot name="prefix"></slot>
      </span>
      <input
        :id="inputId"
        ref="inputRef"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :readonly="readonly"
        :min="min"
        :max="max"
        :step="step"
        :autocomplete="autocomplete"
        class="form-input"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown.enter="$emit('enter')"
      />
      <span v-if="$slots.suffix" class="input-suffix">
        <slot name="suffix"></slot>
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
  type: {
    type: String,
    default: 'text',
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
  readonly: {
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
  min: {
    type: [String, Number],
    default: undefined,
  },
  max: {
    type: [String, Number],
    default: undefined,
  },
  step: {
    type: [String, Number],
    default: undefined,
  },
  autocomplete: {
    type: String,
    default: 'off',
  },
});

const inputId = computed(() => `input-${Math.random().toString(36).substr(2, 9)}`);
const inputRef = ref(null);
const isFocused = ref(false);

const emit = defineEmits(['update:modelValue', 'enter']);

const handleInput = (event) => {
  let value = event.target.value;
  if (props.type === 'number') {
    value = value === '' ? '' : parseFloat(value);
    if (isNaN(value)) value = '';
  }
  emit('update:modelValue', value);
};

const handleFocus = () => {
  isFocused.value = true;
};

const handleBlur = () => {
  isFocused.value = false;
};

// Expose focus method
defineExpose({
  focus: () => inputRef.value?.focus(),
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

.input-wrapper {
  display: flex;
  align-items: center;
  background: var(--bg-primary);
  border: 1.5px solid var(--border-color);
  border-radius: var(--border-radius);
  transition: all var(--transition-fast);
  overflow: hidden;
}

.input-wrapper:hover:not(.input-error) {
  border-color: var(--gray-300);
}

.input-focused:not(.input-error) {
  border-color: var(--rose-400);
  box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.12);
}

.input-error {
  border-color: var(--error);
}

.input-error.input-focused {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
}

.form-input {
  flex: 1;
  padding: var(--spacing-3) var(--spacing-4);
  border: none;
  background: transparent;
  font-size: var(--font-size-sm);
  font-family: var(--font-family);
  color: var(--text-primary);
  min-width: 0;
  width: 100%;
}

.form-input:focus {
  outline: none;
}

.form-input:disabled {
  background: var(--gray-50);
  color: var(--text-tertiary);
  cursor: not-allowed;
}

.form-input::placeholder {
  color: var(--text-tertiary);
}

/* Remove number input spinners */
.form-input[type="number"] {
  -moz-appearance: textfield;
}

.form-input[type="number"]::-webkit-outer-spin-button,
.form-input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.input-prefix,
.input-suffix {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--spacing-3);
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

.input-prefix {
  border-right: 1px solid var(--border-color);
  background: var(--gray-50);
}

.input-suffix {
  border-left: 1px solid var(--border-color);
  background: var(--gray-50);
}

.form-error {
  font-size: var(--font-size-xs);
  color: var(--error);
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
}

.form-hint {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin: 0;
}
</style>
