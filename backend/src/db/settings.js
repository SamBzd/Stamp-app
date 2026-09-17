const db = require('./connection');
const v = require('./source-validation');

function getSettings() {
  return Object.fromEntries(v.prices.map(key => {
    const storedKey = `prix_catalogue_${key.slice(5)}`;
    const row = db.prepare('SELECT valeur FROM settings WHERE cle = ?').get(storedKey);
    if (!row) throw new Error(`Paramètre manquant : ${storedKey}`);
    return [key, v.price(row.valeur, key)];
  }));
}
const updateSettings = db.transaction(updates => {
  v.fields(updates, v.prices);
  if (!Object.keys(updates).length) v.invalid('Au moins un tarif est requis');
  for (const [key, value] of Object.entries(updates)) {
    v.price(value, key);
    db.prepare('UPDATE settings SET valeur = ? WHERE cle = ?').run(value, `prix_catalogue_${key.slice(5)}`);
  }
  return getSettings();
});
module.exports = { getSettings, updateSettings };
