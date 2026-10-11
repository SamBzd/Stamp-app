<template>
  <section ref="panel" v-if="isOpen" class="form-panel" :aria-label="title" @keydown.esc.stop.prevent="requestClose" @focusin="keepFocusedControlVisible">
    <header class="form-panel-header">
      <button type="button" class="form-panel-close" :disabled="busy" :aria-label="`Fermer : ${title}`" @click="requestClose"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="m6 6 12 12M6 18 18 6"/></svg></button>
      <div><p class="form-panel-eyebrow">Atelier · {{ eyebrow }}</p><h2 ref="heading" tabindex="-1">{{ title }}</h2></div>
    </header>
    <div class="form-panel-body" tabindex="0" role="region" :aria-label="`Formulaire : ${title}`"><slot /><footer v-if="$slots.footer && desktop" class="form-panel-footer form-panel-footer-scrolling"><slot name="footer" /></footer></div>
    <footer v-if="$slots.footer && !desktop" class="form-panel-footer"><slot name="footer" /></footer>
  </section>
</template>

<script setup>
import { nextTick, ref, watch, onMounted, onUnmounted } from 'vue';
import { keepFocusedControlVisible } from '../utils/viewportFocus';
const props = defineProps({ isOpen: Boolean, busy: Boolean, title: String, eyebrow: { type: String, default: 'Création et modification' }, returnFocusId: { type: String, default: '' } });
const emit = defineEmits(['close']);
const heading = ref(null);
const panel = ref(null);
const desktop = ref(window.matchMedia('(min-width: 901px)').matches);
async function positionMobileEditor() {
  desktop.value = window.matchMedia('(min-width: 901px)').matches;
  await nextTick();
  if (props.isOpen && window.matchMedia('(max-width: 900px)').matches) panel.value?.scrollIntoView({ block: 'start' });
}
onMounted(() => window.addEventListener('resize', positionMobileEditor));
onUnmounted(() => window.removeEventListener('resize', positionMobileEditor));
let previousFocus;
function requestClose() {
  if (!props.busy && !document.querySelector('.modal-overlay')) emit('close');
}
watch(() => props.isOpen, async (open, wasOpen) => {
  if (open) previousFocus = document.activeElement;
  await nextTick();
  if (open) { heading.value?.focus(); heading.value?.scrollIntoView({ block: 'nearest' }); await positionMobileEditor(); }
  else if (wasOpen) {
    const target = document.getElementById(props.returnFocusId) || (previousFocus?.isConnected ? previousFocus : null);
    target?.focus();
  }
}, { immediate: true });
</script>

<style scoped>
.form-panel { display: flex; flex-direction: column; min-width: 0; min-height: 0; height: 100%; background: var(--card); border-radius: var(--border-radius-xl); box-shadow: var(--shadow-sm); overflow: hidden; }
.form-panel-header { display: flex; align-items: center; flex-shrink: 0; gap: 12px; padding: 18px 20px; border-bottom: 1px solid var(--border-light); }
.form-panel-header > div { min-width: 0; }
.form-panel-header h2 { color: var(--primary); font-size: 24px; line-height: 1.3; overflow-wrap: anywhere; }
.form-panel-eyebrow { color: var(--text-secondary); font-size: var(--font-size-xs); margin-bottom: 4px; }
.form-panel-close { display: grid; place-items: center; flex: 0 0 44px; width: 44px; height: 44px; border: 1px solid var(--border-light); border-radius: 6px; background: var(--card); color: var(--primary); cursor: pointer; }
.form-panel-close svg { width: 20px; height: 20px; }
.form-panel-close:disabled { opacity: .5; cursor: wait; }
.form-panel-body { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; padding: 20px; scroll-padding-block: 20px; }
.form-panel-body:focus-visible { outline: 2px solid var(--primary); outline-offset: -3px; }
.form-panel-footer { flex-shrink: 0; display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 12px; padding: 16px 20px; border-top: 1px solid var(--border-light); background: var(--card); }
.form-panel-footer-scrolling { margin-top: 20px; padding: 16px 0 0; }
@media (min-width: 901px) { .form-panel-body { padding-bottom: var(--dock-clearance); scroll-padding-bottom: var(--dock-clearance); } }
@media (max-width: 900px) { .form-panel { height: min(70dvh, calc(100dvh - var(--atelier-header-height, 150px) - var(--dock-clearance) - 32px)); min-height: 180px; scroll-margin-top: calc(var(--atelier-header-height, 150px) + 16px); } }
@media (max-width: 600px) { .form-panel-header, .form-panel-body, .form-panel-footer { padding: 12px; } .form-panel-header h2 { font-size: 21px; } }
@media (max-width: 900px) and (max-height: 500px) {
  .form-panel { height: auto; min-height: 0; overflow: visible; }
  .form-panel-body { flex: none; overflow: visible; }
}
</style>
