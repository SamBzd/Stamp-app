import { nextTick } from 'vue';

// On short viewports (including browser zoom), native focus scrolling ignores the fixed dock.
export async function keepFocusedControlVisible(event) {
  if (!window.matchMedia('(max-width: 900px) and (max-height: 500px)').matches) return;
  const target = event.target;
  // Do not move a mouse-focused button between pointer down and click.
  if (!target.matches('input, textarea, :focus-visible')) return;
  await nextTick();
  if (document.activeElement !== target) return;
  const layout = target.closest('.app-layout');
  const top = (layout?.querySelector('.atelier-header')?.getBoundingClientRect().bottom || 0) + 8;
  const bottom = (layout?.querySelector('.dock-wrapper')?.getBoundingClientRect().top || innerHeight) - 8;
  const rect = target.getBoundingClientRect();
  if (rect.bottom > bottom) window.scrollBy({ top: rect.bottom - bottom, behavior: 'instant' });
  else if (rect.top < top) window.scrollBy({ top: rect.top - top, behavior: 'instant' });
}
