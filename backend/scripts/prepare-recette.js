#!/usr/bin/env node

// Fixtures exclusivement synthétiques, dans un nouveau fichier explicite.
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { initializeSchemaAsCurrent } = require('../src/db/migrations');

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--target' || !path.isAbsolute(args[1])) {
    throw new Error('Usage: node backend/scripts/prepare-recette.js --target /chemin/nouveau.db');
  }
  const target = args[1];
  // wx refuse aussi un lien symbolique ou un fichier vide existant.
  fs.closeSync(fs.openSync(target, 'wx'));
  const bootstrap = new Database(target);
  try {
    initializeSchemaAsCurrent(bootstrap, fs.readFileSync(path.resolve(__dirname, '../../db/schema.sql'), 'utf8'));
  } finally { bootstrap.close(); }

  process.env.STAMP_DB_PATH = target;
  const app = require('../src/app');
  const db = require('../src/db/connection');
  let server;
  try {
    server = await new Promise((resolve, reject) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
      listener.once('error', reject);
    });
    async function api(route, method = 'GET', body) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api${route}`, {
        method, headers: { 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(`${method} ${route}: ${JSON.stringify(result)}`);
      return result;
    }
    const client = await api('/clients', 'POST', {
      nom: 'Recette', prenom: 'Alice', email: 'alice@example.test',
      adresse: 'Adresse synthétique', contacter: 1, relais_prefere: 'Relais test'
    });
    const catalogues = [];
    for (const [titre, counts, rubans] of [
      ['Noël créatif', [1, 1], 2],
      ...[1, 2, 3, 4, 5].map(n => [`C — ${n} papier(s)`, [n], n % 3]),
    ]) {
      const cat = await api('/catalogues', 'POST', { titre, papier_spe: 'Spécial test', embellissement: 'Bijou test' });
      await api(`/catalogues/${cat.id}`, 'PUT', { prix_A_cents: 1234, prix_B_cents: 4029, prix_C_cents: 3525 });
      for (const [index, count] of counts.entries()) {
        const col = await api(`/catalogues/${cat.id}/collections`, 'POST', { nom: `Collection ${index + 1}` });
        const papier_ids = [];
        for (let i = 0; i < count; i++) {
          const paper = await api('/papiers-cartonnes', 'POST', { nom: `${titre} — papier ${index + 1}.${i + 1}` });
          papier_ids.push(paper.id);
        }
        await api(`/collections/${col.id}/papiers`, 'PUT', { papier_ids });
      }
      for (let i = 0; i < rubans; i++) await api(`/catalogues/${cat.id}/rubans`, 'POST', { nom: `Ruban test ${i + 1}` });
      catalogues.push(await api(`/catalogues/${cat.id}/publication`, 'POST', {}));
    }
    const draft = await api('/catalogues', 'POST', { titre: 'Brouillon incomplet' });
    const cat = catalogues[0];
    const base = {
      client_id: client.id, type: 'kit', catalogue_id: cat.id, methode_paiement: 'virement',
      ruban_id: cat.rubans[0].id,
      commande_collections: cat.collections.map((col, i) => ({
        collection_id: col.id, nb_feuilles: i === 0 ? 2 : 3,
        papiers: [{ papier_cartonne_id: col.papiers[0].id, quantite_base: i === 0 ? 2 : 3 }]
      }))
    };
    const paid = await api('/commandes', 'POST', { ...base, format_type: 'A', papier_supplementaire: true,
      produit_promo_texte: 'Promo test', produit_promo_prix_cents: 275, autres_texte: 'Offert', autres_prix_cents: 0 });
    await api(`/commandes/${paid.id}/reglement`, 'PATCH', {});
    const editable = await api('/commandes', 'POST', { ...base, format_type: 'B', prix_applique_cents: 1000 });
    const horsKit = await api('/commandes', 'POST', { client_id: client.id, type: 'hors_kit', montant: 80,
      cadeau_texte: 'Cadeau test', cadeau_valeur: 2.5, methode_paiement: 'Paypal' });
    console.log(JSON.stringify({ target, client_id: client.id,
      catalogues: catalogues.map(c => ({ id: c.id, titre: c.titre })), brouillon_id: draft.id,
      commandes: { reglee: paid.id, modifiable: editable.id, hors_kit: horsKit.id },
      bilan: await api(`/stocks/bilan?mois=${paid.created_at.slice(0, 7)}`) }, null, 2));
  } finally {
    if (server?.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    db.close();
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
