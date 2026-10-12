export function commandeHistoryLink(commande) {
  return {
    path: commande.type === 'hors_kit' ? '/commandes/hors-kit' : '/commandes/kits',
    query: { commande: String(commande.id) },
  };
}

export function commandeHistoryCatalogue(commande) {
  return commande.type === 'hors_kit' ? 'Hors kit' : commande.catalogue_titre?.trim() || 'Catalogue non renseigné';
}

export function commandeHistoryDate(commande) {
  const value = String(commande.date_commande || commande.created_at || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return undefined;
  // Refuser les dates normalisées silencieusement (ex. 31 février).
  const [year, month, day] = value.split('-').map(Number);
  return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day ? value : undefined;
}

export function formatHistoryDate(commande) {
  const value = commandeHistoryDate(commande);
  if (!value) return 'Date non renseignée';
  return new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
