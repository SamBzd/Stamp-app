const db = require('./connection');
const v = require('./source-validation');

const TYPES = ['papier_collection', 'papier_cartonne', 'ruban', 'papier_special', 'embellissement'];
const STATES = ['À traiter', 'Commandé', 'Disponible', 'Expédié', 'Traité'];
const PENDING = STATES[0];
const TREATED = STATES.at(-1);

function materialKey(type, nom, format = null) {
  return JSON.stringify([type, nom, format]);
}

function addRequirement(requirements, type, nom, quantity, format = null) {
  if (!nom || !quantity) return;
  const key = materialKey(type, nom, format);
  const current = requirements.get(key) || { type, nom, format_type: format, quantity: 0 };
  current.quantity += quantity;
  requirements.set(key, current);
}

function requirementsFromKit(kit) {
  const requirements = new Map();
  const multiplier = kit.scalars.papier_supplementaire ? 2 : 1;
  for (const collection of kit.composition) {
    if (kit.scalars.papier_collection_inclus) {
      addRequirement(requirements, 'papier_collection', collection.collection_nom, 1, kit.scalars.format_type);
    }
    for (const paper of collection.papiers) {
      addRequirement(requirements, 'papier_cartonne', paper.papier_nom, paper.quantite_base * multiplier);
    }
  }
  if (kit.ruban) addRequirement(requirements, 'ruban', kit.ruban.ruban_nom, 1);
  addRequirement(requirements, 'papier_special', kit.scalars.papier_spe_nom, kit.scalars.papier_spe_quantite);
  addRequirement(requirements, 'embellissement', kit.scalars.embellissement_nom, kit.scalars.embellissement_quantite);
  return requirements;
}

function groupWarnings(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const key = JSON.stringify([row.type, row.nom, row.format_type, row.code, row.message]);
    const warning = grouped.get(key) || { type: row.type, nom: row.nom, format_type: row.format_type, code: row.code, message: row.message, quantite: 0 };
    warning.quantite += 1;
    grouped.set(key, warning);
  }
  return [...grouped.values()];
}

function persistAlert(unit, commandeId, code, message) {
  db.prepare(`
    INSERT OR IGNORE INTO fourniture_alertes(
      unite_id,commande_id,type,nom,format_type,code,message,dedupe_key
    ) VALUES (?,?,?,?,?,?,?,?)
  `).run(unit.id, commandeId, unit.type, unit.nom, unit.format_type, code, message, `unite:${unit.id}:${code}`);
  return { type: unit.type, nom: unit.nom, format_type: unit.format_type, code, message };
}

function insertUnits(commandeId, requirement, quantity) {
  const insert = db.prepare(`
    INSERT INTO fourniture_unites(commande_id,type,nom,format_type) VALUES (?,?,?,?)
  `);
  for (let index = 0; index < quantity; index += 1) {
    insert.run(commandeId, requirement.type, requirement.nom, requirement.format_type);
  }
}

// Doit être appelée dans la transaction de mutation de la commande.
function synchronizeCommande(commandeId, kit) {
  const desired = requirementsFromKit(kit);
  const current = db.prepare(`
    SELECT id,type,nom,format_type,etat,archive
    FROM fourniture_unites
    WHERE commande_id=?
    ORDER BY id
  `).all(commandeId);
  const byMaterial = new Map();
  for (const unit of current) {
    const key = materialKey(unit.type, unit.nom, unit.format_type);
    if (!byMaterial.has(key)) byMaterial.set(key, []);
    byMaterial.get(key).push(unit);
  }

  const warnings = [];
  const keys = new Set([...desired.keys(), ...byMaterial.keys()]);
  for (const key of keys) {
    const requirement = desired.get(key);
    const wanted = requirement?.quantity || 0;
    const units = byMaterial.get(key) || [];
    const pending = units.filter(unit => unit.etat === PENDING && !unit.archive);
    const committed = units.filter(unit => unit.etat !== PENDING || unit.archive);
    const removable = Math.min(pending.length, Math.max(0, units.length - wanted));
    if (removable) {
      const ids = pending.slice(-removable).map(unit => unit.id);
      db.prepare(`DELETE FROM fourniture_unites WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
    }

    const remaining = units.length - removable;
    if (remaining < wanted) insertUnits(commandeId, requirement, wanted - remaining);

    if (committed.length > wanted) {
      const code = wanted === 0 ? 'ancien_besoin' : 'surplus';
      const message = wanted === 0
        ? 'Un besoin engagé ne correspond plus à la commande modifiée.'
        : 'Des unités déjà engagées dépassent le besoin actuel.';
      for (const unit of committed.slice(wanted)) {
        warnings.push(persistAlert(unit, commandeId, code, message));
      }
    }
  }
  return groupWarnings(warnings);
}

// Doit être appelée avant le DELETE de la commande, dans sa transaction.
function detachCommande(commandeId) {
  const units = db.prepare(`
    SELECT id,type,nom,format_type,etat,archive
    FROM fourniture_unites
    WHERE commande_id=?
    ORDER BY id
  `).all(commandeId);
  const pendingIds = units
    .filter(unit => unit.etat === PENDING && !unit.archive)
    .map(unit => unit.id);
  if (pendingIds.length) {
    db.prepare(`DELETE FROM fourniture_unites WHERE id IN (${pendingIds.map(() => '?').join(',')})`).run(...pendingIds);
  }
  const warnings = units
    .filter(unit => unit.etat !== PENDING || unit.archive)
    .map(unit => persistAlert(
      unit,
      commandeId,
      'commande_supprimee',
      'Une unité engagée a été conservée après la suppression de sa commande source.'
    ));
  return groupWarnings(warnings);
}

function workflow() {
  const groupes = db.prepare(`
    SELECT type,nom,format_type,etat,COUNT(*) AS quantite
    FROM fourniture_unites
    WHERE archive=0
    GROUP BY type,nom,format_type,etat
    ORDER BY type,nom,format_type,CASE etat
      WHEN 'À traiter' THEN 1 WHEN 'Commandé' THEN 2 WHEN 'Disponible' THEN 3
      WHEN 'Expédié' THEN 4 WHEN 'Traité' THEN 5 END
  `).all();
  const alertes = db.prepare(`
    SELECT type,nom,format_type,code,message,COUNT(*) AS quantite,MIN(created_at) AS creee_le
    FROM fourniture_alertes
    GROUP BY type,nom,format_type,code,message
    ORDER BY MIN(id)
  `).all();
  return { groupes, alertes };
}

function validateGroupMutation(data, allowedFields) {
  v.fields(data, allowedFields);
  if (!TYPES.includes(data.type)) v.invalid(`type doit être l'un de : ${TYPES.join(', ')}`);
  const nom = v.name(data.nom);
  const format = data.format_type ?? null;
  if (data.type === 'papier_collection' ? !['A', 'B', 'C'].includes(format) : format !== null) {
    v.invalid('format_type doit être A, B ou C pour un papier de collection, et null sinon');
  }
  if (!Number.isSafeInteger(data.quantite) || data.quantite <= 0) {
    v.invalid('quantite doit être un entier strictement positif');
  }
  return { type: data.type, nom, format_type: format, quantite: data.quantite };
}

const move = db.transaction(data => {
  const mutation = validateGroupMutation(data, ['type', 'nom', 'format_type', 'etat_source', 'etat_cible', 'quantite']);
  if (!STATES.includes(data.etat_source) || !STATES.includes(data.etat_cible)) {
    v.invalid(`Les états valides sont : ${STATES.join(', ')}`);
  }
  if (data.etat_source === data.etat_cible) v.invalid('etat_source et etat_cible doivent être différents');
  const units = db.prepare(`
    SELECT id FROM fourniture_unites
    WHERE archive=0 AND type=? AND nom=? AND format_type IS ? AND etat=?
    ORDER BY id LIMIT ?
  `).all(mutation.type, mutation.nom, mutation.format_type, data.etat_source, mutation.quantite);
  if (units.length !== mutation.quantite) v.invalid('Quantité indisponible dans le groupe source', 409);
  const ids = units.map(unit => unit.id);
  db.prepare(`
    UPDATE fourniture_unites SET etat=?,updated_at=datetime('now')
    WHERE id IN (${ids.map(() => '?').join(',')})
  `).run(data.etat_cible, ...ids);
  return { ...mutation, etat_source: data.etat_source, etat_cible: data.etat_cible };
});

const archive = db.transaction(data => {
  const mutation = validateGroupMutation(data, ['type', 'nom', 'format_type', 'quantite']);
  const units = db.prepare(`
    SELECT id FROM fourniture_unites
    WHERE archive=0 AND type=? AND nom=? AND format_type IS ? AND etat=?
    ORDER BY id LIMIT ?
  `).all(mutation.type, mutation.nom, mutation.format_type, TREATED, mutation.quantite);
  if (units.length !== mutation.quantite) v.invalid('Quantité traitée insuffisante pour l’archivage', 409);
  const ids = units.map(unit => unit.id);
  db.prepare(`
    UPDATE fourniture_unites
    SET archive=1,archived_at=datetime('now'),updated_at=datetime('now')
    WHERE id IN (${ids.map(() => '?').join(',')})
  `).run(...ids);
  return mutation;
});

module.exports = {
  TYPES,
  STATES,
  workflow,
  move,
  archive,
  synchronizeCommande,
  detachCommande,
  requirementsFromKit
};
