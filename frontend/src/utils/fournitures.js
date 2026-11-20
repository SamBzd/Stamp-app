export const FOURNITURE_STATES = ['À traiter', 'Commandé', 'Disponible', 'Expédié', 'Traité'];

export const FOURNITURE_TYPE_LABELS = {
  papier_collection: 'Papier de collection',
  papier_cartonne: 'Papier cartonné',
  ruban: 'Ruban',
  papier_special: 'Papier spécial',
  embellissement: 'Embellissement',
};

export const fournitureGroupKey = group => JSON.stringify([group.type, group.nom, group.format_type ?? null, group.etat]);

export const fournitureName = group => group.format_type ? `${group.nom} · Format ${group.format_type}` : group.nom;

export function workflowColumns(groupes = []) {
  return FOURNITURE_STATES.map((etat, index) => ({
    etat,
    index,
    groupes: groupes.filter(group => group.etat === etat),
  }));
}

export function fournitureTypeLabel(type) {
  return FOURNITURE_TYPE_LABELS[type] || type;
}

export function validMoveQuantity(value, maximum) {
  const quantity = Number(value);
  return Number.isSafeInteger(quantity) && quantity > 0 && quantity <= maximum;
}

function sameGroup(group, mutation, etat) {
  return group.type === mutation.type && group.nom === mutation.nom
    && (group.format_type ?? null) === (mutation.format_type ?? null) && group.etat === etat;
}

export function applyWorkflowMove(workflow, mutation) {
  if (!workflow) return workflow;
  const source = workflow.groupes.find(group => sameGroup(group, mutation, mutation.etat_source));
  if (!source || source.quantite < mutation.quantite) return workflow;

  let targetFound = false;
  const groupes = workflow.groupes.flatMap(group => {
    if (sameGroup(group, mutation, mutation.etat_source)) {
      return group.quantite === mutation.quantite
        ? []
        : [{ ...group, quantite: group.quantite - mutation.quantite }];
    }
    if (sameGroup(group, mutation, mutation.etat_cible)) {
      targetFound = true;
      return [{ ...group, quantite: group.quantite + mutation.quantite }];
    }
    return [group];
  });
  if (!targetFound) groupes.push({
    ...source,
    etat: mutation.etat_cible,
    quantite: mutation.quantite,
  });
  return { ...workflow, groupes };
}

export function applyWorkflowArchive(workflow, mutation) {
  if (!workflow) return workflow;
  const treated = workflow.groupes.find(group => sameGroup(group, mutation, 'Traité'));
  if (!treated || treated.quantite < mutation.quantite) return workflow;
  const groupes = workflow.groupes.flatMap(group => {
    if (!sameGroup(group, mutation, 'Traité')) return [group];
    return group.quantite === mutation.quantite
      ? []
      : [{ ...group, quantite: group.quantite - mutation.quantite }];
  });
  return { ...workflow, groupes };
}
