let lockCount = 0;
let initialOverflow = '';

/**
 * Locks document scrolling until every active overlay has released its lock.
 * The returned release function is deliberately idempotent for watcher and
 * unmount cleanup paths that can both run during navigation.
 */
export function lockBodyScroll() {
  if (lockCount === 0) {
    initialOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
  let released = false;

  return () => {
    if (released) return;
    released = true;
    lockCount -= 1;
    if (lockCount === 0) {
      document.body.style.overflow = initialOverflow;
      initialOverflow = '';
    }
  };
}
