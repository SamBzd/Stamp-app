#!/usr/bin/env node

const { importClients, inspectSource } = require('../src/db/import-clients');

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--check') {
      options.check = true;
    } else if (argument === '--empty-birthdates-as-null') {
      options.emptyBirthdatesAsNull = true;
    } else if (argument === '--invalid-optional-fields-as-null') {
      options.invalidOptionalFieldsAsNull = true;
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
    const importOptions = {
      sourcePath: options.source, targetPath: options.target,
      emptyBirthdatesAsNull: options.emptyBirthdatesAsNull,
      invalidOptionalFieldsAsNull: options.invalidOptionalFieldsAsNull
    };
    const report = options.check ? inspectSource(importOptions) : importClients(importOptions);
    output.log(`${options.check ? 'Précontrôle réussi' : 'Import réussi'} : ${report.clientCount} cliente(s).`);
    if (options.emptyBirthdatesAsNull) {
      output.log(`Dates de naissance vides converties en NULL : ${report.emptyBirthdatesConverted}.`);
    }
    if (options.invalidOptionalFieldsAsNull) {
      output.log(`Champs facultatifs incompatibles convertis en NULL : ${JSON.stringify(report.optionalFieldsConverted)}.`);
    }
    return 0;
  } catch (error) {
    output.error(error.message);
    output.error('Usage : node backend/scripts/import-clients.js --source <production.db> --target <nouvelle.db> [--check] [--empty-birthdates-as-null] [--invalid-optional-fields-as-null]');
    return 1;
  }
}

if (require.main === module) process.exitCode = run(process.argv.slice(2));

module.exports = { parseArguments, run };
