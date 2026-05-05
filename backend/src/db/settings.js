const db = require('./connection');

// READ — retourne toutes les settings sous forme d'objet { cle: valeur, ... }
function getSettings() {
  const rows = db.prepare('SELECT cle, valeur FROM settings').all();
  return rows.reduce((acc, row) => {
    acc[row.cle] = row.valeur;
    return acc;
  }, {});
}

// UPDATE — met à jour uniquement les clés fournies dans l'objet updates
// updates = { prix_A: '38', ... } — seules les clés présentes sont mises à jour
function updateSettings(updates) {
  const updateStmt = db.prepare('UPDATE settings SET valeur = ? WHERE cle = ?');

  const updateMany = db.transaction((entries) => {
    for (const [cle, valeur] of entries) {
      updateStmt.run(String(valeur), cle);
    }
  });

  updateMany(Object.entries(updates));
  return getSettings();
}

module.exports = { getSettings, updateSettings };
