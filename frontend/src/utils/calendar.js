// Dates civiles : les calculs UTC évitent les décalages de fuseau et d'heure d'été.
export const CALENDAR_MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
export const CALENDAR_WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const pad = value => String(value).padStart(2, '0');

export function civilDate(year, month, day) {
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export function dateValue(date) {
  return `${String(date.getUTCFullYear()).padStart(4, '0')}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = civilDate(year, month - 1, day);
  return dateValue(date) === value ? date : null;
}

export function parseTypedDate(value) {
  const text = value.trim();
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  return parseDate(match ? `${match[3]}-${match[2]}-${match[1]}` : text);
}

export function formatDateValue(value) {
  return parseDate(value) ? value.split('-').reverse().join('/') : '';
}

export function todayValue(now = new Date()) {
  return `${String(now.getFullYear()).padStart(4, '0')}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function shiftMonth(date, delta) {
  const first = civilDate(date.getUTCFullYear(), date.getUTCMonth() + delta, 1);
  const last = civilDate(first.getUTCFullYear(), first.getUTCMonth() + 1, 0).getUTCDate();
  return civilDate(first.getUTCFullYear(), first.getUTCMonth(), Math.min(date.getUTCDate(), last));
}

export function calendarWeeks(year, month) {
  const offset = (civilDate(year, month, 1).getUTCDay() + 6) % 7;
  const count = civilDate(year, month + 1, 0).getUTCDate();
  const cells = Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1;
    return day > 0 && day <= count ? dateValue(civilDate(year, month, day)) : null;
  });
  return Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
}
