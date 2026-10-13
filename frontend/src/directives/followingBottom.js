// Keep the host fixed; shorten the panel and its trailing scroll space together.
// This preserves the scroll range when the last line rises above the host bottom.
const states = new WeakMap();
export const vFollowingBottom = {
  mounted(panel, binding) {
    const media = window.matchMedia('(min-width: 901px)');
    const state = { config: binding.value, frame: 0, body: null, original: null };
    const restore = () => {
      if (!state.original) return;
      for (const [name, value] of Object.entries(state.original.panel)) panel.style[name] = value;
      for (const [name, value] of Object.entries(state.original.body)) state.body.style[name] = value;
      state.original = null;
    };
    const schedule = () => {
      if (state.frame) return;
      state.frame = requestAnimationFrame(() => {
        state.frame = 0;
        if (!media.matches || state.config?.enabled === false || !panel.getClientRects().length) { restore(); return; }
        const body = panel.querySelector(state.config.body);
        const host = panel.parentElement;
        if (!body || !host || !body.getClientRects().length) { restore(); return; }
        if (state.body !== body) { restore(); state.body = body; }
        const clearance = parseFloat(getComputedStyle(panel).getPropertyValue('--dock-clearance')) || 120;
        const inset = state.config.inset ?? 18;
        const available = host.getBoundingClientRect().bottom - panel.getBoundingClientRect().top - (state.config.reserveDock ? clearance : 0);
        if (available <= 0) return;
        if (!state.original) {
          state.original = { panel: { height: panel.style.height, maxHeight: panel.style.maxHeight, minHeight: panel.style.minHeight }, body: { paddingBottom: body.style.paddingBottom, scrollPaddingBottom: body.style.scrollPaddingBottom } };
          panel.style.height = `${available}px`;
          panel.style.maxHeight = `${available}px`;
          panel.style.minHeight = '0';
          body.style.paddingBottom = `${clearance}px`;
        }
        const children = [...body.children].filter(child => child.getClientRects().length && !['absolute', 'fixed'].includes(getComputedStyle(child).position));
        const last = children.at(-1);
        const gap = last ? Math.max(0, panel.getBoundingClientRect().top + available - last.getBoundingClientRect().bottom - inset) : 0;
        const height = Math.max(0, available - gap);
        const padding = Math.max(inset, clearance - gap);
        for (const [name, value] of [['height', height], ['maxHeight', height]]) {
          if (Math.abs(parseFloat(panel.style[name]) - value) > .5) panel.style[name] = `${value}px`;
        }
        if (Math.abs(parseFloat(body.style.paddingBottom) - padding) > .5) body.style.paddingBottom = `${padding}px`;
        if (body.style.scrollPaddingBottom !== `${inset}px`) body.style.scrollPaddingBottom = `${inset}px`;
        const targets = new Set([host, ...children]);
        for (const target of state.targets) if (!targets.has(target)) state.resize.unobserve(target);
        for (const target of targets) if (!state.targets.has(target)) state.resize.observe(target);
        state.targets = targets;
      });
    };
    state.schedule = schedule;
    state.resize = new ResizeObserver(schedule);
    state.resize.observe(panel.parentElement);
    state.targets = new Set([panel.parentElement]);
    state.mutations = new MutationObserver(schedule);
    state.mutations.observe(panel, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
    panel.addEventListener('scroll', schedule, true);
    media.addEventListener('change', schedule);
    state.stop = () => { cancelAnimationFrame(state.frame); state.resize.disconnect(); state.mutations.disconnect(); panel.removeEventListener('scroll', schedule, true); media.removeEventListener('change', schedule); restore(); };
    states.set(panel, state);
    schedule();
  },
  updated(panel, binding) { const state = states.get(panel); if (state) { state.config = binding.value; state.schedule(); } },
  unmounted(panel) { states.get(panel)?.stop(); states.delete(panel); },
};
