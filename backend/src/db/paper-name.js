function normalizePaperName(value) {
  return value.trim().normalize('NFC').toLocaleLowerCase('fr');
}

module.exports = { normalizePaperName };
