import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { emailDomainSuggestions, formatFrenchPhone, matchesClientSearch } from '../src/utils/client-input.js';

test('propose les domaines email après arobase sans imposer de valeur', () => {
  assert.deepEqual(emailDomainSuggestions('marie@', ['gmail.com', 'orange.fr']), ['marie@gmail.com', 'marie@orange.fr']);
  assert.deepEqual(emailDomainSuggestions('marie@gm', ['gmail.com', 'orange.fr']), ['marie@gmail.com']);
  assert.deepEqual(emailDomainSuggestions('marie@gmail.com', ['gmail.com']), []);
  assert.deepEqual(emailDomainSuggestions('@'), []);
});

test('formate progressivement les numéros français sans perdre les formats reconnus par la base', () => {
  assert.equal(formatFrenchPhone('0612345678'), '06 12 34 56 78');
  assert.equal(formatFrenchPhone('06 12 3'), '06 12 3');
  assert.equal(formatFrenchPhone('+33612345678'), '+33 6 12 34 56 78');
  assert.equal(formatFrenchPhone('0033612345678'), '00 33 6 12 34 56 78');
  assert.equal(formatFrenchPhone('612345678'), '6 12 34 56 78');
  assert.equal(formatFrenchPhone('+32 470 12 34 56'), '+32 470 12 34 56');
  assert.equal(formatFrenchPhone(''), '');
});

test('la recherche locale ignore les accents et les séparateurs téléphoniques', () => {
  const client = { nom: 'Noël', prenom: 'Anaïs', email: 'anais@example.com', ville: 'Évry', telephone_raw: '06 12 34 56 78' };
  assert.equal(matchesClientSearch(client, 'noel'), true);
  assert.equal(matchesClientSearch(client, 'anais'), true);
  assert.equal(matchesClientSearch(client, '061234'), true);
  assert.equal(matchesClientSearch(client, 'Lyon'), false);
});

test('le champ email expose une combobox accessible au clavier', async () => {
  const component = await readFile(new URL('../src/components/EmailDomainInput.vue', import.meta.url), 'utf8');
  assert.match(component, /role="combobox"/);
  assert.match(component, /role="listbox"/);
  assert.match(component, /role="option"/);
  assert.match(component, /aria-activedescendant/);
  assert.match(component, /event\.key === 'ArrowDown'/);
  assert.match(component, /event\.key === 'ArrowUp'/);
  assert.match(component, /event\.key === 'Enter'/);
  assert.match(component, /event\.key === 'Escape'/);
  assert.match(component, /event\.stopPropagation\(\)/);
  assert.match(component, /aria-live="polite"/);
});

test('le champ téléphone préserve le curseur lors du formatage', async () => {
  const component = await readFile(new URL('../src/components/PhoneInput.vue', import.meta.url), 'utf8');
  assert.match(component, /inputmode="tel"/);
  assert.match(component, /formatFrenchPhone\(rawValue\)/);
  assert.match(component, /digitsBeforeCursor/);
  assert.match(component, /setSelectionRange\(nextCursor, nextCursor\)/);
});
