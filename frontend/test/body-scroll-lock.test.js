import test from 'node:test';
import assert from 'node:assert/strict';

global.document = { body: { style: { overflow: 'auto' } } };
const { lockBodyScroll } = await import('../src/composables/useBodyScrollLock.js');

test('un verrou de défilement imbriqué restaure la valeur initiale une seule fois', () => {
  const releasePanel = lockBodyScroll();
  const releaseModal = lockBodyScroll();
  assert.equal(document.body.style.overflow, 'hidden');

  releasePanel();
  assert.equal(document.body.style.overflow, 'hidden');

  releaseModal();
  assert.equal(document.body.style.overflow, 'auto');
  releaseModal();
  assert.equal(document.body.style.overflow, 'auto');
});
