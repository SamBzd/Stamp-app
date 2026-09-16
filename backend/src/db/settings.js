const db = require('./connection');

// READ — retourne toutes les settings sous forme d'objet { cle: valeur, ... }
function getSettings() {
  const rows = db.prepare('SELECT cle, valeur FROM settings').all();
  return rows.reduce((acc, row) => {
    // Adaptateur du contrat euros historique jusqu'au lot API paramètres.
    const format = /^prix_catalogue_([ABC])_cents$/.exec(row.cle);
    if (format) acc[`prix_${format[1]}`] = String(row.valeur / 100);
    return acc;
  }, {});
}

// UPDATE — met à jour uniquement les clés fournies dans l'objet updates
// updates = { prix_A: '38', ... } — seules les clés présentes sont mises à jour
function updateSettings(updates) {
  const updateStmt = db.prepare('UPDATE settings SET valeur = ? WHERE cle = ?');

  const updateMany = db.transaction((entries) => {
    for (const [cle, valeur] of entries) {
      const cents = Math.round(Number(valeur) * 100);
      if (!Number.isFinite(Number(valeur)) || cents < 0 || cents > 10000 ||
          Math.abs(Number(valeur) * 100 - cents) > 0.000001) {
        throw new Error('Tarif invalide : montant entre 0 et 100 euros, au centime');
      }
      updateStmt.run(cents, `prix_catalogue_${cle.slice(-1)}_cents`);
    }
  });

  updateMany(Object.entries(updates));
  return getSettings();
}

module.exports = { getSettings, updateSettings };
