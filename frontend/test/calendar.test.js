import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calendarWeeks, dateValue, formatDateValue, parseDate, parseTypedDate, shiftMonth, todayValue } from '../src/utils/calendar.js';

test('les dates civiles refusent les jours inexistants et acceptent les années bissextiles', () => {
  for (const value of ['2023-02-29', '1900-02-29', '2026-04-31', '2026-13-01', '0000-01-01', '', '2026-1-1']) assert.equal(parseDate(value), null, value);
  for (const value of ['2024-02-29', '2000-02-29', '0001-01-01', '0099-12-31', '9999-12-31']) assert.equal(dateValue(parseDate(value)), value);
});

test('la saisie française conserve exactement la date API sans conversion de fuseau', () => {
  assert.equal(dateValue(parseTypedDate(' 09/04/1985 ')), '1985-04-09');
  assert.equal(dateValue(parseTypedDate('2024-02-29')), '2024-02-29');
  assert.equal(parseTypedDate('31/02/2026'), null);
  assert.equal(formatDateValue('1985-04-09'), '09/04/1985');
  assert.equal(todayValue(new Date(2026, 9, 10, 23, 59)), '2026-10-10');
});

test('le changement de mois conserve le jour ou le dernier jour disponible', () => {
  assert.equal(dateValue(shiftMonth(parseDate('2024-01-31'), 1)), '2024-02-29');
  assert.equal(dateValue(shiftMonth(parseDate('2024-02-29'), 12)), '2025-02-28');
  assert.equal(dateValue(shiftMonth(parseDate('2026-01-15'), -1)), '2025-12-15');
});

test('les semaines commencent lundi et chaque jour du mois apparaît une seule fois', () => {
  const weeks = calendarWeeks(2026, 1);
  assert.equal(weeks.length, 5);
  assert.deepEqual(weeks[0], [null, null, null, null, null, null, '2026-02-01']);
  const days = weeks.flat().filter(Boolean);
  assert.equal(days.length, 28);
  assert.equal(days.at(-1), '2026-02-28');
  assert.equal(calendarWeeks(2024, 1).flat().filter(Boolean).length, 29);
});
