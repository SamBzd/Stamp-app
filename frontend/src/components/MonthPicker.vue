<template>
  <div class="month-picker">
    <span :id="labelId" class="month-label">Mois</span>
    <button ref="trigger" type="button" class="month-input" :disabled="disabled" :aria-labelledby="`${labelId} ${valueId}`" aria-haspopup="dialog" :aria-expanded="open" @click="openPicker">
      <span :id="valueId">{{ formatBilanMonth(modelValue) }}</span>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
    </button>
    <Modal :is-open="open" title="Choisir un mois" max-width="380px" @close="closePicker">
      <div class="month-picker-year">
        <button type="button" aria-label="Année précédente" :disabled="year === 0" @click="year -= 1"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m14 6-6 6 6 6"/></svg></button>
        <strong aria-live="polite" aria-atomic="true">{{ String(year).padStart(4, '0') }}</strong>
        <button type="button" aria-label="Année suivante" :disabled="year === 9999" @click="year += 1"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m10 6 6 6-6 6"/></svg></button>
      </div>
      <div class="month-picker-months" role="group" :aria-label="`Mois de ${year}`">
        <button v-for="month in BILAN_MONTHS" :key="month.value" type="button" :aria-pressed="modelValue === monthValue(month.value)" @click="selectMonth(month.value)">{{ month.label }}</button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { nextTick, ref, useId } from 'vue';
import Modal from './Modal.vue';
import { BILAN_MONTHS, formatBilanMonth } from '../utils/bilan';

const props = defineProps({ modelValue: { type: String, required: true }, disabled: { type: Boolean, default: false } });
const emit = defineEmits(['update:modelValue']);
const uid = useId();
const labelId = `month-label-${uid}`;
const valueId = `month-value-${uid}`;
const trigger = ref(null);
const open = ref(false);
const year = ref(new Date().getFullYear());
const monthValue = month => `${String(year.value).padStart(4, '0')}-${month}`;
const openPicker = () => {
  if (props.disabled) return;
  year.value = Number(props.modelValue.slice(0, 4));
  open.value = true;
};
const closePicker = async () => {
  open.value = false;
  await nextTick();
  trigger.value?.focus();
};
const selectMonth = month => {
  emit('update:modelValue', monthValue(month));
  closePicker();
};
</script>

<style scoped>
.month-picker { display: grid; gap: var(--spacing-2); min-width: 0; }
.month-label { color: var(--text-primary); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); }
.month-input { display: flex; align-items: center; justify-content: space-between; gap: 24px; width: 100%; min-height: var(--control-height); padding: var(--control-padding); border: 1.5px solid var(--border); border-radius: var(--control-radius); background: var(--card); color: var(--text-primary); font: inherit; font-size: var(--font-size-sm); line-height: 1.5; cursor: pointer; }
.month-input:hover:not(:disabled) { border-color: var(--primary); }
.month-input:focus-visible { border-color: var(--primary); outline: 2px solid var(--primary); outline-offset: 2px; box-shadow: var(--control-focus-ring); }
.month-input:disabled { opacity: .6; cursor: wait; }
.month-input svg, .month-picker-year svg { width: 20px; height: 20px; flex-shrink: 0; }
.month-picker-year { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; color: var(--primary); }
.month-picker-year button { display: grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: var(--control-radius); background: var(--muted); color: var(--primary); cursor: pointer; }
.month-picker-year button:disabled { opacity: .5; cursor: not-allowed; }
.month-picker-months { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.month-picker-months button { min-width: 0; min-height: 44px; padding: 8px 4px; border: 1.5px solid var(--border); border-radius: var(--control-radius); background: var(--card); color: var(--text-primary); font: inherit; font-size: var(--font-size-sm); cursor: pointer; overflow-wrap: anywhere; }
.month-picker-months button:hover, .month-picker-months button[aria-pressed="true"] { background: var(--primary-light); border-color: var(--primary); color: var(--primary); }
.month-picker-months button[aria-pressed="true"] { font-weight: var(--font-weight-semibold); }
.month-picker-year button:focus-visible, .month-picker-months button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
@media (max-width: 640px) { .month-input { font-size: 16px; } }
</style>
