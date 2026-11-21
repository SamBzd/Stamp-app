const fs = require('node:fs');
const path = require('node:path');
const { getDatabasePath } = require('./config');

function getMaintenancePath() {
  return path.join(path.dirname(getDatabasePath()), '.stamp-maintenance');
}

function isMaintenanceActive() {
  try {
    fs.lstatSync(getMaintenancePath());
    return true;
  } catch (error) {
    // Une erreur de lecture doit aussi empêcher les écritures.
    return error.code !== 'ENOENT';
  }
}

module.exports = { getMaintenancePath, isMaintenanceActive };
