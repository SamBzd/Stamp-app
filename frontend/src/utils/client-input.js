export const COMMON_EMAIL_DOMAINS = [
  'gmail.com',
  'orange.fr',
  'outlook.com',
  'hotmail.com',
  'yahoo.fr',
  'free.fr',
  'laposte.net',
  'icloud.com',
];

export function emailDomainSuggestions(value, domains = COMMON_EMAIL_DOMAINS) {
  const email = String(value ?? '');
  const separator = email.indexOf('@');
  if (separator <= 0 || email.indexOf('@', separator + 1) !== -1) return [];

  const localPart = email.slice(0, separator);
  const fragment = email.slice(separator + 1).toLowerCase();
  return domains
    .filter(domain => domain.startsWith(fragment) && domain !== fragment)
    .map(domain => `${localPart}@${domain}`);
}

function groupPairs(value) {
  return value.match(/.{1,2}/g)?.join(' ') ?? '';
}

export function formatFrenchPhone(value) {
  const input = String(value ?? '');
  if (!input) return '';
  if (!/^[+\d\s().-]+$/.test(input)) return input;

  const compact = input.replace(/[\s().-]/g, '');
  if (/^0\d{0,9}$/.test(compact)) return groupPairs(compact);

  const international = compact.match(/^\+33(\d{0,9})$/);
  if (international) {
    const [, subscriber] = international;
    return subscriber ? `+33 ${subscriber[0]}${subscriber.length > 1 ? ` ${groupPairs(subscriber.slice(1))}` : ''}` : '+33';
  }

  const internationalWithPrefix = compact.match(/^0033(\d{0,9})$/);
  if (internationalWithPrefix) {
    const [, subscriber] = internationalWithPrefix;
    return subscriber ? `00 33 ${subscriber[0]}${subscriber.length > 1 ? ` ${groupPairs(subscriber.slice(1))}` : ''}` : '00 33';
  }

  const countryCode = compact.match(/^33(\d{0,9})$/);
  if (countryCode) {
    const [, subscriber] = countryCode;
    return subscriber ? `33 ${subscriber[0]}${subscriber.length > 1 ? ` ${groupPairs(subscriber.slice(1))}` : ''}` : '33';
  }

  if (/^[67]\d{0,8}$/.test(compact)) {
    return `${compact[0]}${compact.length > 1 ? ` ${groupPairs(compact.slice(1))}` : ''}`;
  }

  return input;
}

function searchable(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function matchesClientSearch(client, query) {
  const normalizedQuery = searchable(query).trim();
  if (!normalizedQuery) return true;

  const textMatch = [client.nom, client.prenom, client.email, client.ville]
    .some(value => searchable(value).includes(normalizedQuery));
  if (textMatch) return true;

  const queryDigits = normalizedQuery.replace(/\D/g, '');
  return Boolean(queryDigits) && String(client.telephone_raw ?? '').replace(/\D/g, '').includes(queryDigits);
}
