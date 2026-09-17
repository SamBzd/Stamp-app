function invalid(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
function object(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) invalid('Un objet JSON est requis');
}
function fields(data, allowed) {
  object(data);
  for (const key of Object.keys(data)) {
    if (!allowed.includes(key)) invalid(`Champ non autorisé : ${key}`);
  }
}
function name(value, field = 'nom') {
  if (typeof value !== 'string' || !value.trim()) invalid(`${field} doit être une chaîne non vide`);
  return value.trim();
}
function material(value, field) {
  if (value === null) return null;
  if (typeof value !== 'string') invalid(`${field} doit être une chaîne ou null`);
  return value.trim() || null;
}
function price(value, field) {
  if (!Number.isInteger(value) || value < 0 || value > 10000) invalid(`${field} doit être un entier entre 0 et 10000 centimes`);
  return value;
}
function id(value) {
  if (!Number.isSafeInteger(value) || value <= 0) invalid('ID invalide');
  return value;
}
function archive(data) {
  fields(data, ['archive']);
  if (typeof data.archive !== 'boolean') invalid('archive doit être un booléen');
  return data.archive;
}
const prices = ['prix_A_cents', 'prix_B_cents', 'prix_C_cents'];
module.exports = { invalid, object, fields, name, material, price, id, archive, prices };
