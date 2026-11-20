const messages = {};
const date = Object.fromEntries(
  new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).formatToParts(new Date()).map(({ type, value }) => [type, Number(value)])
);
const dialog = document.querySelector('dialog');
const days = document.querySelector('#days');
let openThrough = 0;
if (date.year > 2026) openThrough = 24;
if (date.year === 2026 && date.month === 12) openThrough = Math.min(date.day, 24);

if (openThrough === 0) {
  document.querySelector('#availability').textContent = 'La première case s’ouvre le 1er décembre 2026.';
}

for (let day = 1; day <= 24; day += 1) {
  const item = document.createElement('li');
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = day;
  button.disabled = day > openThrough;
  button.setAttribute('aria-label', button.disabled ? day + ' décembre, à venir' : day + ' décembre');
  button.addEventListener('click', () => {
    dialog.querySelector('#day-title').textContent = day + ' décembre';
    dialog.querySelector('#surprise').textContent = messages[day] || 'Cette case attend encore sa surprise.';
    dialog.showModal();
  });
  item.append(button);
  days.append(item);
}
