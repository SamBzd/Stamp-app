import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const layout = await readFile(new URL('../src/components/Layout.vue', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');

test('la navigation expose toutes les routes métier et marque la route active', () => {
  for (const [path, label] of [['/', 'Commandes'], ['/clients', 'Clientes'], ['/catalogues', 'Catalogues'], ['/papiers', 'Papiers'], ['/stocks', 'Fournitures']]) {
    assert.match(layout, new RegExp(`path: '${path.replace('/', '\\/')}'`));
    assert.match(layout, new RegExp(`label: '${label}'`));
  }
  assert.match(layout, /:aria-current="isActive\(item\.path\) \? 'page' : undefined"/);
  assert.match(layout, /route\.path\.startsWith\(path\)/);
  assert.match(app, /watch\(\[\(\) => route\.path, \(\) => route\.matched.length\]/);
  assert.doesNotMatch(app, /route\.fullPath/);
});

test('le dock expose des liens permanents et un accès direct au contenu', () => {
  assert.match(layout, /<nav\b[^>]*\bid="main-navigation"/);
  assert.match(layout, /<router-link v-for="item in navItems"/);
  assert.doesNotMatch(layout, /v-if="menuOpen"|navigation-trigger/);
  assert.match(layout, /href="#main-content"/);
  assert.match(app, /document.getElementById\('main-content'\)\?\.focus\(\)/);
  assert.doesNotMatch(layout, /autofocus|\.focus\(/);
  assert.doesNotMatch(app, /immediate: true|onMounted/);
  assert.match(app, /if \(!previousMatches \|\| path === previousPath\) return/);
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
  const readRgba = token => styles.match(new RegExp(`${token}:\\s*rgba\\((\\d+),\\s*(\\d+),\\s*(\\d+),\\s*([\\d.]+)\\)`, 'i'))?.slice(1).map(Number);
  const composite = (overlay, background) => {
    const base = background.match(/[0-9a-f]{2}/gi).map(value => parseInt(value, 16));
    return `#${overlay.slice(0, 3).map((value, index) => Math.round(value * overlay[3] + base[index] * (1 - overlay[3])).toString(16).padStart(2, '0')).join('')}`;
  };
  for (const [foreground, background] of [['--text-primary', '--bg-app'], ['--text-secondary', '--bg-app'], ['--primary', '--bg-primary'], ['--error-dark', '--bg-primary'], ['--primary-foreground', '--primary'], ['--primary-foreground', '--atelier-header'], ['--atelier-counter', '--atelier-header']]) {
    assert.ok(ratio(readToken(foreground), readToken(background)) >= 4.5, `${foreground} sur ${background}`);
  }
  assert.ok(ratio(readToken('--border'), readToken('--card')) >= 3, 'bordure de champ sur blanc');
  const glassOnCitron = composite(readRgba('--atelier-glass-veil'), readToken('--bg-app'));
  assert.ok(ratio(readToken('--text-secondary'), glassOnCitron) >= 4.5, 'texte du dock sur verre composé');
  assert.ok(ratio(readToken('--atelier-active-mark'), glassOnCitron) >= 3, 'repère actif sur verre composé');
  assert.ok(ratio(readToken('--warning-dark'), composite(readRgba('--warning-light'), readToken('--card'))) >= 4.5, '--warning-dark sur --warning-light composé');
});
