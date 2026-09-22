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
import { formatFrenchPhone } from '../utils/client-input';

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

function caretAfterDigits(value, digitCount) {
  if (digitCount === 0) return 0;
  let seen = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (/\d/.test(value[index])) seen += 1;
    if (seen === digitCount) return index + 1;
  }
  return value.length;
}

const handleInput = async event => {
  const input = event.target;
  const rawValue = input.value;
  const cursor = input.selectionStart ?? rawValue.length;
  const digitsBeforeCursor = rawValue.slice(0, cursor).replace(/\D/g, '').length;
  const formatted = formatFrenchPhone(rawValue);
  const nextCursor = caretAfterDigits(formatted, digitsBeforeCursor);

  input.value = formatted;
  emit('update:modelValue', formatted);
  await nextTick();
  inputRef.value?.setSelectionRange(nextCursor, nextCursor);
};
</script>

<style scoped>
.phone-field { display: flex; flex-direction: column; gap: var(--spacing-2); min-width: 0; }
.phone-label { color: var(--text-primary); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); }
.phone-control { display: flex; align-items: center; min-height: 44px; background: rgba(255, 255, 255, .5); border: 1.5px solid var(--border); border-radius: var(--border-radius-full); transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.phone-control:hover:not(.phone-control-error) { border-color: var(--muted-foreground); }
.phone-control-focused:not(.phone-control-error) { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(93, 112, 82, .12); }
.phone-control-error { border-color: var(--error); }
.phone-control input { width: 100%; min-width: 0; min-height: 44px; padding: var(--spacing-2) var(--spacing-5); border: 0; outline: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: var(--font-size-sm); }
.phone-control input::placeholder { color: var(--text-tertiary); }
.phone-hint, .phone-error { margin: 0; padding-left: var(--spacing-4); font-size: var(--font-size-xs); }
.phone-hint { color: var(--text-tertiary); }
.phone-error { color: var(--error); }
@media (max-width: 640px) { .phone-control input { font-size: 16px; } }
</style>
