const db = require('./connection');

/**
 * Retourne les quantités à préparer depuis les snapshots de commande.
 */
function getStocks() {
    const papiers_cartonnes = db.prepare(`
        SELECT cps.papier_cartonne_id, cps.papier_nom AS nom,
          SUM(cps.quantite_base) AS nb_feuilles_base,
          SUM(cps.quantite_base * CASE WHEN c.papier_supplementaire = 1 THEN 2 ELSE 1 END) AS nb_feuilles
        FROM commande_papiers_selectionnes cps
        JOIN commande_collections cc ON cc.id = cps.commande_collection_id
        JOIN commandes c ON c.id = cc.commande_id AND c.type = 'kit'
        GROUP BY cps.papier_cartonne_id, cps.papier_nom
        ORDER BY nb_feuilles DESC, cps.papier_cartonne_id, cps.papier_nom
    `).all();

    // La provenance est elle aussi historique : aucune jointure sur les sources.
    const provenances = db.prepare(`
        SELECT cps.papier_cartonne_id, cps.papier_nom AS nom,
          c.catalogue_id, c.catalogue_titre, cc.collection_id, cc.collection_nom,
          SUM(cps.quantite_base) AS nb_feuilles_base,
          SUM(cps.quantite_base * CASE WHEN c.papier_supplementaire = 1 THEN 2 ELSE 1 END) AS nb_feuilles
        FROM commande_papiers_selectionnes cps
        JOIN commande_collections cc ON cc.id = cps.commande_collection_id
        JOIN commandes c ON c.id = cc.commande_id AND c.type = 'kit'
        GROUP BY cps.papier_cartonne_id, cps.papier_nom, c.catalogue_id,
          c.catalogue_titre, cc.collection_id, cc.collection_nom
        ORDER BY c.catalogue_id, c.catalogue_titre, cc.collection_id, cc.collection_nom
    `).all();
    const provenanceByPaper = new Map();
    for (const provenance of provenances) {
        const key = JSON.stringify([provenance.papier_cartonne_id, provenance.nom]);
        if (!provenanceByPaper.has(key)) provenanceByPaper.set(key, []);
        provenanceByPaper.get(key).push({ ...provenance,
            cle: JSON.stringify([provenance.catalogue_id, provenance.catalogue_titre,
                provenance.collection_id, provenance.collection_nom]) });
    }
    for (const paper of papiers_cartonnes) {
        paper.cle = JSON.stringify([paper.papier_cartonne_id, paper.nom]);
        paper.provenances = provenanceByPaper.get(paper.cle) || [];
    }

    const papier_spe = db.prepare(`
        SELECT c.catalogue_id, c.catalogue_titre,
          c.papier_spe_nom AS papier_spe, SUM(c.papier_spe_quantite) AS nb_commandes
        FROM commandes c
        WHERE c.type = 'kit' AND c.papier_spe_nom IS NOT NULL
        GROUP BY c.catalogue_id, c.catalogue_titre, c.papier_spe_nom
        ORDER BY c.catalogue_id, c.catalogue_titre, c.papier_spe_nom
    `).all();

    const embellissement = db.prepare(`
        SELECT c.catalogue_id, c.catalogue_titre,
          c.embellissement_nom AS embellissement, SUM(c.embellissement_quantite) AS nb_commandes
        FROM commandes c
        WHERE c.type = 'kit' AND c.embellissement_nom IS NOT NULL
        GROUP BY c.catalogue_id, c.catalogue_titre, c.embellissement_nom
        ORDER BY c.catalogue_id, c.catalogue_titre, c.embellissement_nom
    `).all();

    const collections = db.prepare(`
        SELECT cc.collection_id, c.catalogue_id, cc.collection_nom AS nom, c.catalogue_titre,
          COUNT(DISTINCT cc.commande_id) AS nb_commandes,
          SUM(cc.nb_feuilles) AS total_feuilles_base,
          SUM(cc.nb_feuilles * CASE WHEN c.papier_supplementaire = 1 THEN 2 ELSE 1 END) AS total_feuilles
        FROM commande_collections cc
        JOIN commandes c ON c.id = cc.commande_id AND c.type = 'kit'
        GROUP BY cc.collection_id, c.catalogue_id, cc.collection_nom, c.catalogue_titre
        ORDER BY nb_commandes DESC, cc.collection_id, cc.collection_nom, c.catalogue_titre
    `).all();

    const rubans = db.prepare(`
        SELECT cr.ruban_id, c.catalogue_id, c.catalogue_titre,
          cr.ruban_nom AS nom, SUM(cr.quantite) AS quantite
        FROM commande_rubans cr
        JOIN commandes c ON c.id = cr.commande_id AND c.type = 'kit'
        GROUP BY cr.ruban_id, cr.ruban_nom, c.catalogue_id, c.catalogue_titre
        ORDER BY cr.ruban_id, cr.ruban_nom, c.catalogue_titre
    `).all();

    for (const item of papier_spe) item.cle = JSON.stringify([item.catalogue_id, item.catalogue_titre, item.papier_spe]);
    for (const item of embellissement) item.cle = JSON.stringify([item.catalogue_id, item.catalogue_titre, item.embellissement]);
    for (const item of collections) item.cle = JSON.stringify([item.collection_id, item.nom, item.catalogue_id, item.catalogue_titre]);
    for (const item of rubans) item.cle = JSON.stringify([item.ruban_id, item.nom, item.catalogue_id, item.catalogue_titre]);

    return { papiers_cartonnes, papier_spe, embellissement, collections, rubans };
}

/**
 * Retourne un bilan comptable pour un mois donné (format 'YYYY-MM').
 */
function getBilanMensuel(mois) {
    const caRow = db.prepare(`
        SELECT SUM(
          CASE c.type
            WHEN 'hors_kit' THEN COALESCE(c.montant, 0)
            ELSE c.prix_applique_cents / 100.0
          END
        ) as chiffre_affaires
        FROM commandes c
        WHERE c.reglee = 1 AND strftime('%Y-%m', c.created_at) = ?
    `).get(mois);

    const par_methode_paiement = db.prepare(`
        SELECT c.methode_paiement,
          SUM(
            CASE c.type
              WHEN 'hors_kit' THEN COALESCE(c.montant, 0)
              ELSE c.prix_applique_cents / 100.0
            END
          ) as total,
          COUNT(*) as nb_commandes
        FROM commandes c
        WHERE c.reglee = 1 AND strftime('%Y-%m', c.created_at) = ?
        GROUP BY c.methode_paiement
    `).all(mois);

    const produits_promo = db.prepare(`
        SELECT c.produit_promo_texte as texte,
          c.produit_promo_prix_cents / 100.0 as prix,
          COUNT(*) as nb_fois
        FROM commandes c
        WHERE c.reglee = 1 AND strftime('%Y-%m', c.created_at) = ?
          AND c.produit_promo_texte IS NOT NULL
        GROUP BY c.produit_promo_texte, c.produit_promo_prix_cents
        ORDER BY nb_fois DESC
    `).all(mois);

    const autres = db.prepare(`
        SELECT c.autres_texte as texte,
          c.autres_prix_cents / 100.0 as prix,
          COUNT(*) as nb_fois
        FROM commandes c
        WHERE c.reglee = 1 AND strftime('%Y-%m', c.created_at) = ?
          AND c.autres_texte IS NOT NULL
        GROUP BY c.autres_texte, c.autres_prix_cents
        ORDER BY nb_fois DESC
    `).all(mois);

    return {
        mois,
        chiffre_affaires: (caRow && caRow.chiffre_affaires !== null) ? caRow.chiffre_affaires : 0,
        par_methode_paiement,
        produits_promo,
        autres,
    };
}

module.exports = { getStocks, getBilanMensuel };
