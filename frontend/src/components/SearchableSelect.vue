<template>
  <div class="searchable-select" :class="{ 'searchable-select-open': isOpen, 'searchable-select-disabled': disabled }" ref="containerRef">
    <label v-if="label" class="searchable-select-label">{{ label }}</label>
    <div class="searchable-select-input-wrapper" @click="openDropdown">
      <svg class="searchable-select-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        ref="inputRef"
        type="text"
        class="searchable-select-input"
        :placeholder="selectedLabel || placeholder"
        :class="{ 'has-value': selectedLabel && !query }"
        v-model="query"
        @focus="openDropdown"
        @input="onInput"
        @keydown="onKeydown"
        :disabled="disabled"
        autocomplete="off"
      />
      <button v-if="modelValue" class="searchable-select-clear" @click.stop="clearSelection" type="button" title="Effacer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <svg v-else class="searchable-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
    <p v-if="error" class="searchable-select-error">{{ error }}</p>
    
    <!-- Dropdown -->
    <Teleport to="body">
      <div v-if="isOpen" class="searchable-select-dropdown" :style="dropdownStyle" ref="dropdownRef">
        <!-- Recent items -->
        <div v-if="recentItems.length > 0 && !query" class="searchable-select-group">
          <div class="searchable-select-group-label">Récents</div>
          <div
            v-for="(option, i) in recentItems"
            :key="'recent-' + option.value"
            :class="['searchable-select-option', { 'searchable-select-option-active': highlightedIndex === i }]"
            @click="selectOption(option)"
            @mouseenter="highlightedIndex = i"
          >
            <span class="searchable-select-option-text">{{ option.label }}</span>
            <svg v-if="option.value === modelValue" class="searchable-select-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>

        <!-- Separator -->
        <div v-if="recentItems.length > 0 && !query && filteredOptions.length > 0" class="searchable-select-separator"></div>

        <!-- All options -->
        <div v-if="filteredOptions.length > 0" class="searchable-select-group">
          <div v-if="recentItems.length > 0 && !query" class="searchable-select-group-label">Tous</div>
          <div
            v-for="(option, i) in filteredOptions"
            :key="option.value"
            :class="['searchable-select-option', { 'searchable-select-option-active': highlightedIndex === (recentItems.length > 0 && !query ? recentItems.length + i : i) }]"
            @click="selectOption(option)"
            @mouseenter="highlightedIndex = (recentItems.length > 0 && !query ? recentItems.length + i : i)"
          >
            <span class="searchable-select-option-text">{{ option.label }}</span>
            <svg v-if="option.value === modelValue" class="searchable-select-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>

        <!-- No results -->
        <div v-if="filteredOptions.length === 0 && query" class="searchable-select-empty">
          Aucun résultat pour « {{ query }} »
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  label: { type: String, default: '' },
  placeholder: { type: String, default: 'Rechercher...' },
  error: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  recentKey: { type: String, default: '' }, // localStorage key for recents
});

const emit = defineEmits(['update:modelValue']);

const containerRef = ref(null);
const inputRef = ref(null);
const dropdownRef = ref(null);
const isOpen = ref(false);
const query = ref('');
const highlightedIndex = ref(0);
const dropdownStyle = ref({});

// Selected label
const selectedLabel = computed(() => {
  const opt = props.options.find(o => String(o.value) === String(props.modelValue));
  return opt ? opt.label : '';
});

// Recent items from localStorage
const recentItems = computed(() => {
  if (!props.recentKey) return [];
  try {
    const raw = localStorage.getItem(`stamp_recent_${props.recentKey}`);
    if (!raw) return [];
    const recentValues = JSON.parse(raw);
    return recentValues
      .map(v => props.options.find(o => String(o.value) === String(v)))
      .filter(Boolean)
      .slice(0, 3);
  } catch {
    return [];
  }
});

// Filtered options
const filteredOptions = computed(() => {
  if (!query.value) return props.options;
  const q = query.value.toLowerCase();
  return props.options.filter(o => o.label.toLowerCase().includes(q));
});

// All displayed items (for keyboard nav)
const allDisplayed = computed(() => {
  if (recentItems.value.length > 0 && !query.value) {
    return [...recentItems.value, ...filteredOptions.value];
  }
  return filteredOptions.value;
});

// Position dropdown
const updateDropdownPosition = () => {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  dropdownStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    zIndex: 'var(--z-tooltip)',
  };
};

const openDropdown = () => {
  if (props.disabled) return;
  isOpen.value = true;
  highlightedIndex.value = 0;
  nextTick(() => {
    updateDropdownPosition();
    inputRef.value?.focus();
  });
};

const closeDropdown = () => {
  isOpen.value = false;
  query.value = '';
};

const selectOption = (option) => {
  emit('update:modelValue', option.value);
  saveRecent(option.value);
  closeDropdown();
};

const clearSelection = () => {
  emit('update:modelValue', '');
  query.value = '';
};

const saveRecent = (value) => {
  if (!props.recentKey) return;
  try {
    const raw = localStorage.getItem(`stamp_recent_${props.recentKey}`);
    let recents = raw ? JSON.parse(raw) : [];
    recents = recents.filter(v => String(v) !== String(value));
    recents.unshift(value);
    recents = recents.slice(0, 5);
    localStorage.setItem(`stamp_recent_${props.recentKey}`, JSON.stringify(recents));
  } catch { /* ignore */ }
};

const onInput = () => {
  highlightedIndex.value = 0;
  if (!isOpen.value) isOpen.value = true;
};

const onKeydown = (e) => {
  if (!isOpen.value) {
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      openDropdown();
      e.preventDefault();
    }
    return;
  }

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, allDisplayed.value.length - 1);
      break;
    case 'ArrowUp':
      e.preventDefault();
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0);
      break;
    case 'Enter':
      e.preventDefault();
      if (allDisplayed.value[highlightedIndex.value]) {
        selectOption(allDisplayed.value[highlightedIndex.value]);
      }
      break;
    case 'Escape':
      e.preventDefault();
      e.stopPropagation();
      closeDropdown();
      break;
  }
};

// Click outside to close
const onClickOutside = (e) => {
  if (
    containerRef.value && !containerRef.value.contains(e.target) &&
    dropdownRef.value && !dropdownRef.value.contains(e.target)
  ) {
    closeDropdown();
  }
};

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside);
  window.addEventListener('scroll', updateDropdownPosition, true);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', onClickOutside);
  window.removeEventListener('scroll', updateDropdownPosition, true);
});
</script>

<style scoped>
.searchable-select {
  position: relative;
}

.searchable-select-label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-2);
}

.searchable-select-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.searchable-select-icon {
  position: absolute;
  left: var(--spacing-3);
  width: 16px;
  height: 16px;
  color: var(--text-tertiary);
  pointer-events: none;
  transition: color var(--transition-fast);
}

.searchable-select-open .searchable-select-icon {
  color: var(--primary);
}

.searchable-select-input {
  width: 100%;
  padding: var(--spacing-3) var(--spacing-10) var(--spacing-3) var(--spacing-8);
  background: var(--bg-primary);
  border: 1.5px solid var(--border);
  border-radius: var(--border-radius);
  font-size: var(--font-size-sm);
  font-family: var(--font-family);
  color: var(--text-primary);
  transition: all var(--transition-fast);
  cursor: pointer;
}

.searchable-select-input.has-value::placeholder {
  color: var(--text-primary);
  opacity: 1;
}

.searchable-select-input:hover {
  border-color: var(--muted-foreground);
}

.searchable-select-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(93, 112, 82, 0.12);
  cursor: text;
}

.searchable-select-input::placeholder {
  color: var(--text-tertiary);
}

.searchable-select-disabled .searchable-select-input {
  opacity: 0.5;
  cursor: not-allowed;
}

.searchable-select-chevron {
  position: absolute;
  right: var(--spacing-3);
  width: 16px;
  height: 16px;
  color: var(--text-tertiary);
  pointer-events: none;
  transition: transform var(--transition-fast);
}

.searchable-select-open .searchable-select-chevron {
  transform: rotate(180deg);
}

.searchable-select-clear {
  position: absolute;
  right: var(--spacing-2);
  width: 28px;
  height: 28px;
  border: none;
  background: var(--muted);
  border-radius: var(--border-radius-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-tertiary);
  transition: all var(--transition-fast);
}

.searchable-select-clear:hover {
  background: var(--destructive-light);
  color: var(--destructive);
}

.searchable-select-clear svg {
  width: 14px;
  height: 14px;
}

.searchable-select-error {
  font-size: var(--font-size-xs);
  color: var(--error-dark);
  margin-top: var(--spacing-1);
}
</style>

<style>
/* Dropdown (unscoped because it's teleported) */
.searchable-select-dropdown {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-lg);
  max-height: 280px;
  overflow-y: auto;
  padding: var(--spacing-2);
  animation: searchableDropIn 0.15s ease-out;
}

@keyframes searchableDropIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.searchable-select-group-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: var(--spacing-2) var(--spacing-3) var(--spacing-1);
}

.searchable-select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--border-radius-xs);
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  transition: background var(--transition-fast);
}

.searchable-select-option:hover,
.searchable-select-option-active {
  background: var(--primary-light);
}

.searchable-select-option-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.searchable-select-option-check {
  width: 16px;
  height: 16px;
  color: var(--primary);
  flex-shrink: 0;
}

.searchable-select-separator {
  height: 1px;
  background: var(--border-light);
  margin: var(--spacing-2) var(--spacing-3);
}

.searchable-select-empty {
  padding: var(--spacing-5) var(--spacing-3);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
}
</style>
