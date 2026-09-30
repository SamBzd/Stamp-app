import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  FOURNITURE_STATES,
  applyWorkflowArchive,
  applyWorkflowMove,
  fournitureGroupKey,
  fournitureTypeLabel,
  validMoveQuantity,
  workflowColumns,
} from '../src/utils/fournitures.js';

test('le Kanban conserve les cinq états et range chaque pile sans la décomposer', () => {
  const groupes = [
    { type: 'ruban', nom: 'Lin naturel', etat: 'Commandé', quantite: 2 },
    { type: 'papier_collection', nom: 'Sapin', etat: 'À traiter', quantite: 4 },
  ];
  const columns = workflowColumns(groupes);
  assert.deepEqual(columns.map(column => column.etat), FOURNITURE_STATES);
  assert.deepEqual(columns.map(column => column.groupes.length), [1, 1, 0, 0, 0]);
  assert.strictEqual(columns[1].groupes[0], groupes[0]);
  assert.equal(fournitureGroupKey(groupes[0]), '["ruban","Lin naturel","Commandé"]');
  assert.equal(fournitureTypeLabel('papier_collection'), 'Papier de collection');
});

test('la quantité refuse zéro, les fractions et les unités absentes', () => {
  assert.equal(validMoveQuantity(1, 3), true);
  assert.equal(validMoveQuantity('3', 3), true);
  for (const value of [0, -1, 1.5, 4, 'abc']) assert.equal(validMoveQuantity(value, 3), false);
});

test('une mutation acceptée met à jour localement les piles même avant resynchronisation', () => {
  const workflow = { groupes: [
    { type: 'ruban', nom: 'Lin', etat: 'À traiter', quantite: 3 },
    { type: 'ruban', nom: 'Lin', etat: 'Commandé', quantite: 1 },
    { type: 'papier_special', nom: 'Vélin', etat: 'Traité', quantite: 2 },
  ], alertes: [{ code: 'surplus' }] };
  const moved = applyWorkflowMove(workflow, { type: 'ruban', nom: 'Lin', etat_source: 'À traiter', etat_cible: 'Commandé', quantite: 2 });
  assert.deepEqual(moved.groupes.slice(0, 2).map(group => group.quantite), [1, 3]);
  assert.deepEqual(moved.alertes, workflow.alertes);
  const archived = applyWorkflowArchive(moved, { type: 'papier_special', nom: 'Vélin', quantite: 2 });
  assert.equal(archived.groupes.some(group => group.nom === 'Vélin'), false);
});

test('la vue fournit glisser-déposer sans action de déplacement et réduction des mouvements', async () => {
  const source = await readFile(new URL('../src/views/StocksView.vue', import.meta.url), 'utf8');
  assert.match(source, /draggable="true"/);
  assert.match(source, /@drop\.prevent="dropOn\(column\.etat\)"/);
  assert.match(source, /openMove\(group, state\)/);
  assert.match(source, /title="Quantité à déplacer"/);
  assert.doesNotMatch(source, /class="move-button"/);
  assert.doesNotMatch(source, /move-target/);
  assert.match(source, /return match \? match\[2\] \+ '-' \+ match\[1\] : ''/);
  assert.match(source, /Glissez une pile vers la colonne/);
  assert.match(source, /Quantité à déplacer/);
  assert.doesNotMatch(source, /class="move-button"/);
  assert.match(source, /archiveWorkflowGroup/);
  assert.match(source, /Terminer/);
  assert.match(source, /new CustomEvent\('toast'/);
  assert.match(source, /duration: 5000/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /role="tabpanel"/);
});
