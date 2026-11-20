# Recette locale #45 — 20 novembre 2026

Base synthétique indépendante préparée avec `backend/scripts/prepare-recette.js`.
API locale et frontend de cette branche, aucune donnée cliente ni accès NAS.

## Vérifié dans le navigateur Chromium intégré

- Création A : 7 feuilles avant option, 12 après, prix 12,34 € puis 15,84 €.
  Les deux feuilles de collection restent à 1, les cartonnées passent à 4 + 6.
- Création enregistrée puis détail : mêmes noms, format, quantités et total.
- Édition de cette commande vers C : 1 feuille de collection C + 10 cartonnées,
  soit 11 feuilles ; enregistrement puis détail cohérents.
- Fournitures : papiers cartonnés distincts des collections, cartes A/B/C
  séparées ; déplacement de la feuille C vers Commandé conservé après réponse
  et rechargement API, cartes A et B restées À traiter.
- Largeur 1440 px : récapitulatif latéral ; largeur 800 px : récapitulatif
  consultable sous les champs, avec nom/format/quantité et total visibles.
- Aucun avertissement ni erreur console pendant ce parcours.

Captures synthétiques : [A avec option](kit-a-option.jpg),
[édition C](kit-c-edition.jpg), [résumé à 800 px](resume-800px.jpg),
[Fournitures après déplacement](fournitures.jpg).

Les captures ne prouvent pas l’état d’une base ou d’un navigateur NAS. Le
regroupement inter-catalogues, la migration et les anciens kits sont couverts
par les tests automatisés décrits dans [la recette métier #45](../../papiers-collection.md).
La recette de production et l’accord de livraison restent à réaliser.
