const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('fr-FR').replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/[^a-z0-9]+/g, ' ').trim();

export function filterCommandes(commandes, { type, search = '', catalogueId = '' }) {
  const words = normalize(search).split(' ').filter(Boolean);
  return commandes.filter(commande => {
    if (commande.type !== type) return false;
    if (type === 'kit' && catalogueId && String(commande.catalogue_id) !== String(catalogueId)) return false;
    const name = normalize(`${commande.client?.prenom || commande.client_prenom || ''} ${commande.client?.nom || commande.client_nom || ''}`);
    return words.every(word => name.includes(word));
  });
}

// Les intitulés viennent des commandes, même si le catalogue est archivé.
export function commandeCatalogueOptions(commandes) {
  const catalogues = new Map();
  for (const commande of commandes) {
    if (commande.type !== 'kit' || commande.catalogue_id == null) continue;
    const value = String(commande.catalogue_id);
    if (!catalogues.has(value)) catalogues.set(value, { value, label: commande.catalogue_titre || `Catalogue #${value}` });
  }
  const options = [...catalogues.values()];
  const titles = new Map();
  for (const option of options) titles.set(option.label, (titles.get(option.label) || 0) + 1);
  return options.map(option => ({ ...option, label: titles.get(option.label) > 1 ? `${option.label} (#${option.value})` : option.label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}
