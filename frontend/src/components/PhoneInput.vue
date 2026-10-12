<template>
  <div class="phone-field">
    <label :for="inputId" class="phone-label">Téléphone</label>
    <div class="phone-control" :class="{ 'phone-control-focused': focused, 'phone-control-error': error }">
      <input
        :id="inputId"
        ref="inputRef"
        :value="modelValue"
        type="tel"
        inputmode="tel"
        autocomplete="tel"
        placeholder="06 12 34 56 78"
        :aria-invalid="Boolean(error)"
        :aria-describedby="error ? feedbackId : hintId"
        @input="handleInput"
        @focus="focused = true"
        @blur="focused = false"
      />
    </div>
    <p :id="hintId" class="phone-hint">L’espacement est ajouté automatiquement.</p>
    <p v-if="error" :id="feedbackId" class="phone-error" role="alert">{{ error }}</p>
  </div>
</template>

<script setup>
import { nextTick, ref, useId } from 'vue';
import { formatFrenchPhone, phoneCaretPosition } from '../utils/client-input';

const props = defineProps({
  modelValue: { type: String, default: '' },
  error: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue']);
const uid = useId();
const inputId = `telephone-${uid}`;
const hintId = `telephone-hint-${uid}`;
const feedbackId = `telephone-feedback-${uid}`;
const inputRef = ref(null);
const focused = ref(false);

const handleInput = async event => {
  const input = event.target;
  const rawValue = input.value;
  const cursor = input.selectionStart ?? rawValue.length;
  const formatted = formatFrenchPhone(rawValue);
  const nextCursor = phoneCaretPosition(formatted, rawValue, cursor);

  input.value = formatted;
  emit('update:modelValue', formatted);
  await nextTick();
  inputRef.value?.setSelectionRange(nextCursor, nextCursor);
};
</script>

<style scoped>
.phone-field { display: flex; flex-direction: column; gap: var(--spacing-2); min-width: 0; }
.phone-label { color: var(--text-primary); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); }
.phone-control { display: flex; align-items: center; min-height: var(--control-height); background: var(--card); border: 1.5px solid var(--border); border-radius: var(--control-radius); transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.phone-control:hover:not(.phone-control-error) { border-color: var(--muted-foreground); }
.phone-control-focused:not(.phone-control-error) { border-color: var(--primary); box-shadow: var(--control-focus-ring); }
.phone-control-error { border-color: var(--error); }
.phone-control-error.phone-control-focused { box-shadow: var(--control-error-ring); }
.phone-control input { width: 100%; min-width: 0; min-height: calc(var(--control-height) - 3px); padding: var(--control-padding); border: 0; outline: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: var(--font-size-sm); line-height: 1.5; }
.phone-control input::placeholder { color: var(--text-tertiary); }
.phone-hint, .phone-error { margin: 0; padding-left: 0; font-size: var(--font-size-xs); }
.phone-hint { color: var(--text-secondary); }
.phone-error { color: var(--error); }
@media (max-width: 640px) { .phone-control input { font-size: 16px; } }
</style>
