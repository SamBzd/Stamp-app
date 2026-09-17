<template>
  <form class="catalogue-prices" @submit.prevent="save" novalidate>
    <div v-if="Object.keys(errors).length > 1" ref="validationSummary" tabindex="-1" role="alert" class="catalogue-error">
      <p>Vérifiez les tarifs :</p>
      <ul><li v-for="(message, format) in errors" :key="format"><a :href="`#${uid}-${format}`">Format {{ format }} : {{ message }}</a></li></ul>
    </div>
    <div class="price-grid">
      <div v-for="format in formats" :key="format" class="price-field">
        <label :for="`${uid}-${format}`">Format {{ format }}</label>
        <div class="price-input">
          <input :id="`${uid}-${format}`" v-model="values[format]" type="text" inputmode="decimal"
            :disabled="disabled || saving" :aria-invalid="Boolean(errors[format])"
            :aria-describedby="errors[format] ? `${uid}-${format}-error` : `${uid}-hint`" />
          <span aria-hidden="true">€</span>
        </div>
        <p v-if="errors[format]" :id="`${uid}-${format}-error`" class="catalogue-error">{{ errors[format] }}</p>
      </div>
    </div>
    <p :id="`${uid}-hint`" class="catalogue-hint">De 0 à 100 € par format, deux décimales maximum. La virgule et le point sont acceptés.</p>
    <p v-if="error" ref="serverError" tabindex="-1" class="catalogue-error" role="alert">{{ error }}</p>
    <p v-if="success" role="status" class="catalogue-success">Tarifs enregistrés.</p>
    <Button v-if="!disabled" type="submit" variant="secondary" :loading="saving" :disabled="!dirty">Enregistrer les tarifs</Button>
  </form>
</template>

<script setup>
import { computed, nextTick, ref, useId, watch } from 'vue';
import Button from './Button.vue';
import { centsToInput, eurosToCents, formats } from '../utils/catalogue';
const props = defineProps({ prices: { type: Object, required: true }, savePrices: { type: Function, required: true }, disabled: Boolean });
const emit = defineEmits(['dirty']);
const uid = useId();
const values = ref({});
const baseline = ref({});
const saving = ref(false);
const errors = ref({});
const error = ref('');
const success = ref(false);
const validationSummary = ref(null);
const serverError = ref(null);
const dirty = computed(() => formats.some(format => values.value[format] !== baseline.value[format]));
watch(dirty, value => { emit('dirty', value); if (value) success.value = false; });
// Keep an in-progress edit when an unrelated catalogue mutation refreshes its detail.
watch(() => formats.map(format => props.prices[`prix_${format}_cents`]), () => {
  if (dirty.value) return;
  values.value = Object.fromEntries(formats.map(format => [format, centsToInput(props.prices[`prix_${format}_cents`])]));
  baseline.value = { ...values.value };
}, { immediate: true });
async function save() {
  if (saving.value || props.disabled) return;
  errors.value = {}; error.value = ''; success.value = false;
  const payload = {};
  for (const format of formats) {
    try { payload[`prix_${format}_cents`] = eurosToCents(values.value[format]); }
    catch (failure) { errors.value[format] = failure.message; }
  }
  if (Object.keys(errors.value).length) {
    await nextTick();
    if (validationSummary.value) validationSummary.value.focus();
    else document.getElementById(`${uid}-${Object.keys(errors.value)[0]}`)?.focus();
    return;
  }
  saving.value = true;
  try {
    const saved = await props.savePrices(payload);
    if (saved === false) return;
    baseline.value = { ...values.value };
    success.value = true;
  } catch (failure) { error.value = failure.message; await nextTick(); serverError.value?.focus(); }
  finally { saving.value = false; }
}
</script>

<style scoped>
.catalogue-prices { display: grid; gap: var(--spacing-4); }
.price-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--spacing-4); }
.price-field { display: grid; align-content: start; gap: var(--spacing-2); min-width: 0; }
.price-field label { font-weight: 600; }
.price-input { display: flex; align-items: center; gap: var(--spacing-2); }
.price-input input { width: 100%; min-width: 0; font-variant-numeric: tabular-nums; }
@media (max-width: 480px) { .price-grid { grid-template-columns: 1fr; } }
</style>
