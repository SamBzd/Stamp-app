#!/usr/bin/env node

const { importClients, inspectSource } = require('../src/db/import-clients');

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--check') {
      options.check = true;
    } else if (argument === '--source' || argument === '--target') {
      const value = args[index + 1];
      if (!value) throw new Error(`Le chemin suivant ${argument} est obligatoire.`);
      options[argument.slice(2)] = value;
      index += 1;
    } else {
      throw new Error(`Argument inconnu : ${argument}`);
    }
  }
  if (!options.source || !options.target) {
    throw new Error('Les options --source et --target sont obligatoires.');
  }
  return options;
}

function run(args, output = console) {
  try {
    const options = parseArguments(args);
    const report = options.check
      ? inspectSource({ sourcePath: options.source, targetPath: options.target })
      : importClients({ sourcePath: options.source, targetPath: options.target });
    output.log(`${options.check ? 'Précontrôle réussi' : 'Import réussi'} : ${report.clientCount} cliente(s).`);
    return 0;
  } catch (error) {
    output.error(error.message);
    output.error('Usage : node backend/scripts/import-clients.js --source <production.db> --target <nouvelle.db> [--check]');
    return 1;
  }
}

if (require.main === module) process.exitCode = run(process.argv.slice(2));

module.exports = { parseArguments, run };
