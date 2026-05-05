const db = require('./connection');

/**
 * Retourne un objet structuré avec 4 clés, tout calculé à la volée.
 */
function getStocks() {
    const papiers_cartonnes = db.prepare(`
        SELECT pc.nom,
          SUM(CASE WHEN c.papier_supplementaire = 1 THEN 2 ELSE 1 END) AS nb_feuilles
        FROM commande_papiers_selectionnes cps
        JOIN commandes c ON c.id = cps.commande_id AND c.type = 'kit'
        JOIN papiers_cartonnes pc ON pc.id = cps.papier_cartonne_id
        GROUP BY pc.id
        ORDER BY nb_feuilles DESC
    `).all();

    const papier_spe = db.prepare(`
        SELECT cat.papier_spe, COUNT(DISTINCT c.id) AS nb_commandes
        FROM commandes c
        JOIN commande_collections cc ON cc.commande_id = c.id
        JOIN collections col ON col.id = cc.collection_id
        JOIN catalogues cat ON cat.id = col.catalogue_id
        WHERE c.type = 'kit' AND cat.papier_spe IS NOT NULL
        GROUP BY cat.papier_spe
    `).all();

    const embellissement = db.prepare(`
        SELECT cat.embellissement, COUNT(DISTINCT c.id) AS nb_commandes
        FROM commandes c
        JOIN commande_collections cc ON cc.commande_id = c.id
        JOIN collections col ON col.id = cc.collection_id
        JOIN catalogues cat ON cat.id = col.catalogue_id
        WHERE c.type = 'kit' AND cat.embellissement IS NOT NULL
        GROUP BY cat.embellissement
    `).all();

    const collections = db.prepare(`
        SELECT col.nom, cat.titre as catalogue_titre,
          COUNT(DISTINCT cc.commande_id) AS nb_commandes,
          SUM(cc.nb_feuilles) AS total_feuilles
        FROM commande_collections cc
        JOIN collections col ON col.id = cc.collection_id
        JOIN catalogues cat ON cat.id = col.catalogue_id
        GROUP BY cc.collection_id
        ORDER BY nb_commandes DESC
    `).all();

    return { papiers_cartonnes, papier_spe, embellissement, collections };
}

/**
 * Retourne un bilan comptable pour un mois donné (format 'YYYY-MM').
 */
function getBilanMensuel(mois) {
    const caRow = db.prepare(`
        SELECT SUM(
          CASE c.type
            WHEN 'hors_kit' THEN COALESCE(c.montant, 0)
            ELSE (
              SELECT CAST(s.valeur AS REAL) FROM settings s
              WHERE s.cle = 'prix_' || c.format_type
            ) + CASE WHEN c.papier_supplementaire = 1 THEN 3.5 ELSE 0 END
              + COALESCE(c.produit_promo_prix, 0) + COALESCE(c.autres_prix, 0)
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
              ELSE (
                SELECT CAST(s.valeur AS REAL) FROM settings s
                WHERE s.cle = 'prix_' || c.format_type
              ) + CASE WHEN c.papier_supplementaire = 1 THEN 3.5 ELSE 0 END
                + COALESCE(c.produit_promo_prix, 0) + COALESCE(c.autres_prix, 0)
            END
          ) as total,
          COUNT(*) as nb_commandes
        FROM commandes c
        WHERE c.reglee = 1 AND strftime('%Y-%m', c.created_at) = ?
        GROUP BY c.methode_paiement
    `).all(mois);

    const produits_promo = db.prepare(`
        SELECT c.produit_promo_texte as texte,
          c.produit_promo_prix as prix,
          COUNT(*) as nb_fois
        FROM commandes c
        WHERE strftime('%Y-%m', c.created_at) = ?
          AND c.produit_promo_texte IS NOT NULL
        GROUP BY c.produit_promo_texte, c.produit_promo_prix
        ORDER BY nb_fois DESC
    `).all(mois);

    const autres = db.prepare(`
        SELECT c.autres_texte as texte,
          c.autres_prix as prix,
          COUNT(*) as nb_fois
        FROM commandes c
        WHERE strftime('%Y-%m', c.created_at) = ?
          AND c.autres_texte IS NOT NULL
        GROUP BY c.autres_texte, c.autres_prix
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
