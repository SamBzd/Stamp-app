import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue';

// Save after the pointer's click, so a blur never disables its destination
// before that click runs. Queue while another mutation is still pending.
export function useBlurSave(isDisabled, save) {
  let pointerDown = false;
  let pending = false;
  let saving = false;
  let pendingValue;
  let pendingFocusTarget;
  let timer;
  async function flush() {
    if (!pending || saving || isDisabled()) return;
    pending = false;
    saving = true;
    // During a keyboard blur, activeElement can still be body; relatedTarget
    // identifies the next control before the browser finishes moving focus.
    const focused = document.activeElement;
    const focusTarget = focused === document.body ? pendingFocusTarget : focused;
    try {
      await save(pendingValue);
      await nextTick();
      const target = focusTarget?.isConnected ? focusTarget : document.getElementById(focusTarget?.id || '');
      if (document.activeElement === document.body && target?.isConnected
        && !target.disabled && target.getClientRects().length) target.focus();
    }
    finally {
      saving = false;
      if (pending && !pointerDown && !isDisabled()) flush();
    }
  }
  function requestSave(value, event = value) {
    // Disabling the focused field during our own save causes a synthetic blur.
    // It must not queue an automatic retry, especially after a server refusal.
    if (saving) return;
    pending = true;
    pendingValue = value;
    pendingFocusTarget = event?.type === 'blur' ? event.relatedTarget : document.activeElement;
    if (!pointerDown) flush();
  }
  function pointerStarted() { pointerDown = true; }
  function pointerEnded() {
    pointerDown = false;
    if (pending) {
      clearTimeout(timer);
      timer = setTimeout(flush, 0);
    }
  }
  function cancelPending() {
    pending = false;
    pendingFocusTarget = null;
    clearTimeout(timer);
  }
  watch(isDisabled, disabled => { if (!disabled && pending && !pointerDown) flush(); });
  onMounted(() => {
    document.addEventListener('pointerdown', pointerStarted, true);
    document.addEventListener('pointerup', pointerEnded);
    document.addEventListener('pointercancel', pointerEnded);
  });
  onBeforeUnmount(() => {
    cancelPending();
    document.removeEventListener('pointerdown', pointerStarted, true);
    document.removeEventListener('pointerup', pointerEnded);
    document.removeEventListener('pointercancel', pointerEnded);
  });
  return { requestSave, cancelPending };
}
