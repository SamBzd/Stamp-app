const path = require('node:path');

function getDatabasePath(env = process.env) {
  const configuredPath = env.STAMP_DB_PATH?.trim();

  if (!configuredPath) {
    throw new Error('STAMP_DB_PATH est obligatoire. Indique le chemin de la base SQLite.');
  }

  return path.resolve(configuredPath);
}

function getPort(env = process.env) {
  const value = env.PORT?.trim() || '3000';
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT doit être un entier compris entre 1 et 65535.');
  }

  return port;
}

function getCorsOrigins(env = process.env) {
  return (env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

module.exports = {
  getCorsOrigins,
  getDatabasePath,
  getPort
};
