<template>
  <div class="date-field">
    <label :id="`${controlId}-label`" :for="controlId" class="date-label">{{ label }}</label>
    <button :id="controlId" ref="trigger" type="button" class="date-input" :class="{ 'date-error': error }" :disabled="disabled" :aria-labelledby="`${controlId}-label ${controlId}-value`" :aria-invalid="Boolean(error)" :aria-describedby="error ? `${controlId}-error` : undefined" :aria-controls="`${controlId}-calendar`" :aria-expanded="open" @click="togglePicker" @keydown.down.prevent="openPicker(true)" @keydown.esc="onTriggerEscape">
      <span :id="`${controlId}-value`" :class="{ 'date-placeholder': !modelValue }">{{ formatDateValue(modelValue) || 'Choisir une date' }}</span>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
    </button>
    <p v-if="error" :id="`${controlId}-error`" class="date-feedback" role="alert">{{ error }}</p>
    <Transition name="calendar-expand">
    <div v-if="open" :id="`${controlId}-calendar`" class="calendar-expansion" role="region" :aria-labelledby="`${controlId}-label`" @keydown.esc.stop.prevent="closePicker">
      <div class="calendar-clip">
      <div class="calendar-content">
        <div class="calendar-navigation">
          <button type="button" class="calendar-arrow" aria-label="Mois précédent" :disabled="year === 1 && month === 0" @click="moveMonth(-1)"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m14 6-6 6 6 6"/></svg></button>
          <select :value="month" aria-label="Mois du calendrier" @change="setMonth(Number($event.target.value))"><option v-for="(name, index) in CALENDAR_MONTHS" :key="name" :value="index">{{ name }}</option></select>
          <input :value="year" type="number" min="1" max="9999" step="1" aria-label="Année du calendrier" @change="setYear($event)" @keydown.enter.stop.prevent="$event.target.blur()" />
          <button type="button" class="calendar-arrow" aria-label="Mois suivant" :disabled="year === 9999 && month === 11" @click="moveMonth(1)"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m10 6 6 6-6 6"/></svg></button>
        </div>
        <p :id="`${controlId}-month`" class="calendar-month" aria-live="polite" aria-atomic="true">{{ CALENDAR_MONTHS[month] }} {{ year }}</p>
        <table ref="grid" class="calendar-grid" role="grid" :aria-labelledby="`${controlId}-month`" :aria-describedby="`${controlId}-keys`">
          <thead><tr><th v-for="day in CALENDAR_WEEKDAYS" :key="day" scope="col" :abbr="day">{{ day.slice(0, 2) }}</th></tr></thead>
          <tbody><tr v-for="(week, index) in weeks" :key="index"><td v-for="(value, column) in week" :key="column" :aria-selected="value ? value === modelValue : undefined">
            <button v-if="value" type="button" :data-date="value" :tabindex="value === focusedDate ? 0 : -1" :aria-label="dayLabel(value)" :aria-current="value === today ? 'date' : undefined" @focus="focusedDate = value" @keydown="handleDayKey($event, value)" @click="selectDate(value)">{{ Number(value.slice(-2)) }}</button>
          </td></tr></tbody>
        </table>
        <p :id="`${controlId}-keys`" class="calendar-hint">Flèches pour changer de jour · Entrée pour choisir</p>
        <div class="calendar-manual">
          <label :for="`${controlId}-typed`">Saisir une date (JJ/MM/AAAA)</label>
          <div class="calendar-manual-row"><input :id="`${controlId}-typed`" v-model="typedDate" type="text" inputmode="numeric" placeholder="JJ/MM/AAAA" :autocomplete="autocomplete" :aria-invalid="Boolean(typedError)" :aria-describedby="typedError ? `${controlId}-typed-error` : undefined" @input="typedError = ''" @keydown.enter.prevent="applyTypedDate" /><button type="button" @click="applyTypedDate">Valider</button></div>
          <p v-if="typedError" :id="`${controlId}-typed-error`" class="date-feedback" role="alert">{{ typedError }}</p>
        </div>
        <div class="calendar-actions"><button type="button" @click="selectDate(today)">Aujourd’hui</button><button type="button" @click="selectDate('')">Effacer</button><button type="button" @click="closePicker">Annuler</button></div>
      </div>
      </div>
    </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, useId, watch } from 'vue';
import { CALENDAR_MONTHS, CALENDAR_WEEKDAYS, calendarWeeks, dateValue, formatDateValue, parseDate, parseTypedDate, shiftMonth, todayValue } from '../utils/calendar';

const props = defineProps({ modelValue: { type: String, default: '' }, label: { type: String, default: 'Date' }, id: { type: String, default: '' }, error: { type: String, default: '' }, disabled: { type: Boolean, default: false }, autocomplete: { type: String, default: 'off' } });
const emit = defineEmits(['update:modelValue']);
const uid = useId();
const controlId = computed(() => props.id || `date-${uid}`);
const trigger = ref(null), grid = ref(null), open = ref(false);
const year = ref(new Date().getFullYear()), month = ref(0), focusedDate = ref('');
const typedDate = ref(''), typedError = ref(''), today = ref(todayValue());
const weeks = computed(() => calendarWeeks(year.value, month.value));
const formatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeZone: 'UTC' });
const dayLabel = value => formatter.format(parseDate(value));
const focusDay = async () => { await nextTick(); grid.value?.querySelector(`[data-date="${focusedDate.value}"]`)?.focus(); };
function showDate(date) {
  year.value = date.getUTCFullYear(); month.value = date.getUTCMonth(); focusedDate.value = dateValue(date);
}
async function openPicker(focus = false) {
  // matches(':disabled') inclut le verrou du fieldset parent.
  if (props.disabled || trigger.value?.matches(':disabled')) return;
  if (!open.value) {
    today.value = todayValue();
    showDate(parseDate(props.modelValue) || parseDate(today.value));
    typedDate.value = formatDateValue(props.modelValue); typedError.value = '';
    open.value = true;
  }
  if (focus) await focusDay();
}
function togglePicker() { if (open.value) closePicker(); else openPicker(); }
function onTriggerEscape(event) { if (open.value) { event.stopPropagation(); event.preventDefault(); closePicker(); } }
async function closePicker() { open.value = false; await nextTick(); trigger.value?.focus(); }
function selectDate(value) { emit('update:modelValue', value); closePicker(); }
function applyTypedDate() {
  const date = parseTypedDate(typedDate.value);
  if (!date) { typedError.value = 'Saisis une date valide au format JJ/MM/AAAA.'; return; }
  selectDate(dateValue(date));
}
function moveMonth(delta, focus = false) {
  const date = shiftMonth(parseDate(focusedDate.value), delta);
  if (date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) return;
  showDate(date); if (focus) focusDay();
}
function setMonth(value) { moveMonth(value - month.value); }
function setYear(event) {
  const value = Number(event.target.value);
  if (!Number.isInteger(value) || value < 1 || value > 9999) { event.target.value = year.value; return; }
  moveMonth((value - year.value) * 12);
}
function handleDayKey(event, value) {
  const date = parseDate(value), weekday = (date.getUTCDay() + 6) % 7;
  const deltas = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday };
  if (event.key === 'PageUp' || event.key === 'PageDown') {
    event.preventDefault(); moveMonth((event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1), true);
  } else if (event.key in deltas) {
    event.preventDefault();
    date.setUTCDate(date.getUTCDate() + deltas[event.key]);
    if (date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) return;
    showDate(date); focusDay();
  }
}
watch(() => props.disabled, value => { if (value && open.value) closePicker(); });
defineExpose({ focus: () => trigger.value?.focus() });
</script>

<style scoped>
.date-field { display: grid; align-content: start; align-self: start; width: 100%; gap: var(--spacing-2); min-width: 0; margin-bottom: var(--spacing-4); container-type: inline-size; }
.date-label, .calendar-manual label { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.date-input { width: 100%; min-height: var(--control-height); display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: var(--control-padding); border: 1.5px solid var(--border); border-radius: var(--control-radius); background: var(--card); color: var(--text-primary); font: inherit; font-size: var(--font-size-sm); text-align: left; cursor: pointer; }
.date-input:hover:not(:disabled) { border-color: var(--primary); }
.date-input:disabled { background: var(--muted); color: var(--text-tertiary); cursor: not-allowed; }
.date-input.date-error { border-color: var(--error); }
.date-placeholder { color: var(--text-tertiary); }
.date-input svg, .calendar-arrow svg { width: 20px; height: 20px; flex-shrink: 0; }
.date-feedback { margin: 0; color: var(--error); font-size: var(--font-size-xs); }
.calendar-expansion { display: grid; grid-template-rows: 1fr; max-width: 440px; transition: grid-template-rows var(--transition-normal), opacity var(--transition-fast); }
.calendar-clip { min-height: 0; overflow: hidden; }
.calendar-content { padding: 12px; border: 1px solid var(--border); border-radius: var(--control-radius); background: var(--card); }
.calendar-navigation { display: grid; grid-template-columns: 44px minmax(0, 1fr) 82px 44px; gap: 8px; align-items: center; }
.calendar-navigation input, .calendar-navigation select, .calendar-manual input { min-width: 0; width: 100%; min-height: 44px; border: 1.5px solid var(--border); border-radius: var(--control-radius); background: var(--card); color: var(--text-primary); padding: 8px; font: inherit; font-size: var(--font-size-sm); }
.calendar-navigation input { appearance: textfield; -moz-appearance: textfield; }
.calendar-navigation input::-webkit-inner-spin-button, .calendar-navigation input::-webkit-outer-spin-button { -webkit-appearance: none; }
.calendar-arrow, .calendar-actions button, .calendar-manual button { min-height: 44px; padding: 8px 12px; border: 0; border-radius: var(--control-radius); background: var(--muted); color: var(--primary); font: inherit; font-size: var(--font-size-sm); cursor: pointer; }
.calendar-arrow { display: grid; place-items: center; padding: 0; }
.calendar-arrow:disabled { opacity: .5; cursor: not-allowed; }
.calendar-month { margin: 16px 0 8px; color: var(--primary); font-weight: var(--font-weight-semibold); }
.calendar-grid { width: 100%; table-layout: fixed; border-collapse: collapse; }
.calendar-grid th { padding: 8px 0; font-size: var(--font-size-xs); color: var(--text-secondary); font-weight: var(--font-weight-medium); }
.calendar-grid td { padding: 0; text-align: center; }
.calendar-grid tbody tr:hover { background: transparent; }
.calendar-grid button { width: 100%; min-height: 44px; padding: 4px; border: 2px solid transparent; border-radius: var(--control-radius); background: var(--card); color: var(--text-primary); font: inherit; font-size: var(--font-size-sm); cursor: pointer; }
.calendar-grid button:hover { background: var(--primary-light); }
.calendar-grid button[aria-current="date"] { border-color: var(--primary); }
.calendar-grid td[aria-selected="true"] button { background: var(--primary); color: var(--primary-foreground); font-weight: var(--font-weight-semibold); }
.calendar-hint { font-size: var(--font-size-xs); color: var(--text-secondary); margin: 12px 0; }
.calendar-manual { display: grid; gap: 8px; padding-top: 16px; border-top: 1px solid var(--border-light); }
.calendar-manual-row { display: flex; gap: 8px; }
.calendar-manual button { background: var(--primary); color: var(--primary-foreground); }
.calendar-actions { width: 100%; display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-light); }
.date-input:focus-visible, .calendar-content button:focus-visible, .calendar-actions button:focus-visible, .calendar-content input:focus-visible, .calendar-content select:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
@media (max-width: 640px) { .date-input, .calendar-navigation input, .calendar-navigation select, .calendar-manual input { font-size: 16px; } .calendar-navigation { gap: 4px; grid-template-columns: 44px minmax(0, 1fr) 74px 44px; } }
.calendar-expand-enter-from, .calendar-expand-leave-to { grid-template-rows: 0fr; opacity: 0; }
@container (max-width: 330px) {
  .calendar-navigation { grid-template-columns: 44px minmax(0, 1fr) 44px; gap: 4px; }
  .calendar-navigation select { grid-column: 2; grid-row: 1; }
  .calendar-navigation input { grid-column: 2; grid-row: 2; }
  .calendar-arrow:first-child { grid-column: 1; grid-row: 1 / span 2; }
  .calendar-arrow:last-child { grid-column: 3; grid-row: 1 / span 2; }
  .calendar-actions { justify-content: flex-start; }
}
@media (prefers-reduced-motion: reduce) { .calendar-expansion { transition: none; } }
</style>
