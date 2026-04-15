import { onMounted, onUnmounted, ref } from 'vue';

/**
 * Global keyboard shortcuts composable
 * @param {Object} shortcuts - Map of key combos to handler functions
 *   e.g. { 'n': openNewOrder, '/': focusSearch, 'Escape': closePanel }
 */
export function useKeyboardShortcuts(shortcuts = {}) {
  const isActive = ref(true);

  const isInputFocused = () => {
    const active = document.activeElement;
    if (!active) return false;
    const tag = active.tagName.toLowerCase();
    return (
      tag === 'input' ||
      tag === 'textarea' ||
      tag === 'select' ||
      active.isContentEditable
    );
  };

  const handleKeydown = (e) => {
    if (!isActive.value) return;

    // Build the key combo string
    let combo = '';
    if (e.ctrlKey || e.metaKey) combo += 'ctrl+';
    if (e.altKey) combo += 'alt+';
    if (e.shiftKey) combo += 'shift+';
    combo += e.key.toLowerCase();

    // Escape always works, even in inputs
    if (e.key === 'Escape' && shortcuts['Escape']) {
      shortcuts['Escape'](e);
      return;
    }

    // ctrl+k always works (global search)
    if (combo === 'ctrl+k' && shortcuts['ctrl+k']) {
      e.preventDefault();
      shortcuts['ctrl+k'](e);
      return;
    }

    // Other shortcuts only work when not in an input
    if (isInputFocused()) return;

    const handler = shortcuts[combo] || shortcuts[e.key];
    if (handler) {
      e.preventDefault();
      handler(e);
    }
  };

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown);
  });

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown);
  });

  return { isActive };
}
