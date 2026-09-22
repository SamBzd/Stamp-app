import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const layout = await readFile(new URL('../src/components/Layout.vue', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');

test('la navigation expose toutes les routes métier et marque la route active', () => {
  for (const [path, label] of [['/', 'Commandes'], ['/clients', 'Clientes'], ['/catalogues', 'Catalogues'], ['/stocks', 'Stocks']]) {
    assert.match(layout, new RegExp(`path: '${path.replace('/', '\\/')}'`));
    assert.match(layout, new RegExp(`label: '${label}'`));
  }
  assert.match(layout, /:aria-current="isActive\(item\.path\) \? 'page' : undefined"/);
  assert.match(layout, /route\.path\.startsWith\(path\)/);
});

test('le menu de navigation est actionnable, ferme avec Échap et rend le focus', () => {
  assert.match(layout, /aria-label="Ouvrir la navigation"/);
  assert.match(layout, /:aria-expanded="menuOpen"/);
  assert.match(layout, /focusFirstNavigationItem/);
  assert.match(layout, /event\.key === 'Escape'/);
  assert.match(layout, /event\.key === 'Tab'/);
  assert.match(layout, /last\.focus\(\)/);
  assert.match(layout, /first\.focus\(\)/);
  assert.match(layout, /restoreFocus: true/);
  assert.match(layout, /document\.addEventListener\('pointerdown', onPointerdown\)/);
});

test('la barre ne conserve aucune action globale factice', () => {
  assert.doesNotMatch(layout, /focus-search|new-order|Rechercher|Nouvelle commande/);
  assert.doesNotMatch(layout, /icon-rail|rail-item/);
});

test('les paires de texte principales restent à un contraste AA', () => {
  const readToken = token => styles.match(new RegExp(`${token}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1];
  const luminance = hex => {
    const values = hex.match(/[0-9a-f]{2}/gi).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
  };
  const ratio = (foreground, background) => (Math.max(luminance(foreground), luminance(background)) + .05) / (Math.min(luminance(foreground), luminance(background)) + .05);
  for (const [foreground, background] of [['--text-primary', '--bg-app'], ['--text-secondary', '--bg-app'], ['--primary', '--bg-primary'], ['--error-dark', '--bg-primary']]) {
    assert.ok(ratio(readToken(foreground), readToken(background)) >= 4.5, `${foreground} sur ${background}`);
  }
});
