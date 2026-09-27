<template>
  <div class="email-domain-field">
    <label :for="inputId" class="email-domain-label">Email</label>
    <div class="email-domain-control" :class="{ 'email-domain-control-focused': focused, 'email-domain-control-error': error }">
      <input
        :id="inputId"
        ref="inputRef"
        :value="modelValue"
        type="email"
        inputmode="email"
        autocomplete="email"
        placeholder="marie.dupont@email.com"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="suggestionsOpen"
        :aria-controls="listboxId"
        :aria-activedescendant="activeOptionId"
        :aria-invalid="Boolean(error)"
        :aria-describedby="error ? feedbackId : undefined"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeydown"
      />
    </div>
    <ul v-if="suggestionsOpen" :id="listboxId" class="email-domain-list" role="listbox" aria-label="Domaines email suggérés">
      <li
        v-for="(suggestion, index) in suggestions"
        :id="optionId(index)"
        :key="suggestion"
        role="option"
        :aria-selected="index === highlightedIndex"
        :class="{ 'email-domain-option-active': index === highlightedIndex }"
        @mouseenter="highlightedIndex = index"
        @mousedown.prevent="selectSuggestion(suggestion)"
      >
        {{ suggestion }}
      </li>
    </ul>
    <p class="sr-only" aria-live="polite">{{ suggestionAnnouncement }}</p>
    <p v-if="error" :id="feedbackId" class="email-domain-error" role="alert">{{ error }}</p>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, useId } from 'vue';
import { emailDomainSuggestions } from '../utils/client-input';

const props = defineProps({
  modelValue: { type: String, default: '' },
  error: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue']);
const uid = useId();
const inputId = `email-${uid}`;
const listboxId = `email-domains-${uid}`;
const feedbackId = `email-feedback-${uid}`;
const inputRef = ref(null);
const focused = ref(false);
const dismissed = ref(false);
const highlightedIndex = ref(0);

const suggestions = computed(() => emailDomainSuggestions(props.modelValue));
const suggestionsOpen = computed(() => focused.value && !dismissed.value && suggestions.value.length > 0);
const activeOptionId = computed(() => suggestionsOpen.value ? optionId(highlightedIndex.value) : undefined);
const suggestionAnnouncement = computed(() => suggestionsOpen.value
  ? `${suggestions.value.length} domaine${suggestions.value.length > 1 ? 's' : ''} proposé${suggestions.value.length > 1 ? 's' : ''}. Utilisez les flèches puis Entrée pour choisir.`
  : '');

const optionId = index => `${listboxId}-option-${index}`;

const handleInput = event => {
  dismissed.value = false;
  highlightedIndex.value = 0;
  emit('update:modelValue', event.target.value);
};

const handleFocus = () => {
  focused.value = true;
};

const handleBlur = () => {
  focused.value = false;
};

const selectSuggestion = async suggestion => {
  emit('update:modelValue', suggestion);
  dismissed.value = true;
  await nextTick();
  inputRef.value?.focus();
};

const handleKeydown = event => {
  if (event.key === 'Escape' && suggestionsOpen.value) {
    event.preventDefault();
    event.stopPropagation();
    dismissed.value = true;
    return;
  }
  if (!suggestionsOpen.value) return;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    highlightedIndex.value = (highlightedIndex.value + 1) % suggestions.value.length;
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    highlightedIndex.value = (highlightedIndex.value - 1 + suggestions.value.length) % suggestions.value.length;
  } else if (event.key === 'Enter') {
    event.preventDefault();
    selectSuggestion(suggestions.value[highlightedIndex.value]);
  }
};
</script>

<style scoped>
.email-domain-field { position: relative; display: flex; flex-direction: column; gap: var(--spacing-2); margin-bottom: var(--spacing-3); min-width: 0; }
.email-domain-label { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.email-domain-control { display: flex; align-items: center; min-height: 44px; background: rgba(255, 255, 255, .5); border: 1.5px solid var(--border); border-radius: var(--border-radius-full); transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.email-domain-control:hover:not(.email-domain-control-error) { border-color: var(--muted-foreground); }
.email-domain-control-focused:not(.email-domain-control-error) { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(93, 112, 82, .12); }
.email-domain-control-error { border-color: var(--error); }
.email-domain-control input { width: 100%; min-width: 0; min-height: 44px; padding: var(--spacing-2) var(--spacing-5); border: 0; outline: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: var(--font-size-sm); }
.email-domain-control input::placeholder { color: var(--text-tertiary); }
.email-domain-list { position: absolute; z-index: var(--z-dropdown); top: calc(100% - var(--spacing-1)); right: 0; left: 0; max-height: 240px; overflow-y: auto; padding: var(--spacing-2); border: 1px solid var(--border); border-radius: var(--border-radius); background: var(--card); box-shadow: var(--shadow-lg); list-style: none; }
.email-domain-list li { min-height: 40px; display: flex; align-items: center; padding: var(--spacing-2) var(--spacing-3); border-radius: var(--border-radius-sm); color: var(--text-primary); cursor: pointer; overflow-wrap: anywhere; }
.email-domain-list li:hover, .email-domain-option-active { background: var(--primary-light); }
.email-domain-error { margin: 0; padding-left: var(--spacing-4); color: var(--error); font-size: var(--font-size-xs); }
@media (max-width: 640px) { .email-domain-control input { font-size: 16px; } }
</style>
