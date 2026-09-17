export const formats = ['A', 'B', 'C'];

// Parse the decimal string directly: no floating-point multiplication or rounding.
export function eurosToCents(value) {
  const match = String(value).trim().match(/^(\d{1,3})(?:[.,](\d{1,2}))?$/);
  if (!match) throw new Error('Saisissez un prix de 0 à 100 €, avec deux décimales maximum.');
  const cents = Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'));
  if (cents > 10000) throw new Error('Le prix ne peut pas dépasser 100 €.');
  return cents;
}

export function centsToInput(cents) {
  return Number.isInteger(cents) ? (cents / 100).toFixed(2).replace('.', ',') : '';
}

export function formatPrice(cents) {
  return Number.isInteger(cents)
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
    : 'À définir';
}

export function publicationErrors(catalogue) {
  const errors = [];
  if (!catalogue.papier_spe?.trim() && !catalogue.embellissement?.trim()) errors.push('Renseignez un papier spécial ou un embellissement.');
  if (!catalogue.collections.length) errors.push('Ajoutez au moins une collection.');
  for (const collection of catalogue.collections) {
    if (!collection.papiers.length) errors.push(`Ajoutez au moins un papier à « ${collection.nom} ».`);
  }
  if (formats.some(format => !Number.isInteger(catalogue[`prix_${format}_cents`]))) errors.push('Définissez les trois tarifs A, B et C.');
  return errors;
}
