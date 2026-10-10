# Lot 3B.1 — liste Catalogues et Paramètres

Réalisé localement le 9 octobre 2026 après le « Au boulot » de Sam, conformément
au [cadrage 3B](../jalon3b-cadrage.md). **Composition validée visuellement par Sam.**
Sam a demandé de remplacer le tableau par des fiches horizontales allégées et
un détail sélectionné à droite, harmonisé avec Clientes/Commandes. Le survol
prune a été validé pour tous les tableaux. L’éditeur 3B.2 n’est pas modifié. Sam a autorisé les commits/push de ce lot
et de l’harmonisation Clientes/Commandes après validation de ces listes.

## Résultat à présenter

- Fiches horizontales allégées : nom/statut/formats. Détail à droite avec
  tarifs, matériel, collections/papiers et rubans, puis lien vers la préparation.
  Toutes les informations des anciennes cartes restent consultables.
- Survol prune pâle commun aux tableaux et fiches ; sélection prune plus
  soutenue avec trait prune à gauche, distincte même pendant le survol.
- Liens Catalogues/Paramètres soulignés dans l’en-tête de la zone de travail,
  bouton Nouveau catalogue visible, routes et accès clavier conservés.
- Filtres fermés au chargement, recherche et actifs/archivés inline sur demande.
  Badge/libellé accessible si critères cachés, effacement et retour de focus.
- Paramètres sobre : trois tarifs par défaut, enregistrement explicite,
  validation existante en centimes et erreurs sans perte de saisie. La saisie
  est aussi conservée entre onglets ; prix des catalogues existants inchangés.

| État | Desktop 1280 × 800 | Étroit 375 × 800 |
| --- | --- | --- |
| Liste | [Capture](liste-1280.png) | [Capture](liste-375.png) |
| Détail sélectionné | [Capture](detail-1280.png) | [Capture](detail-375.png) |
| Filtres ouverts | [Capture](filtres-1280.png) | [Capture](filtres-375.png) |
| Paramètres | [Capture](parametres-1280.png) | [Capture](parametres-375.png) |

Autres captures : [liste 1024](liste-1024.png), [filtres 1024](filtres-1024.png),
[paramètres 1024](parametres-1024.png), [liste paysage 800](liste-800.png),
[filtres paysage 800](filtres-800.png), [paramètres paysage 800](parametres-800.png),
[refus tarifaire](parametres-erreur-1280.png), [composition consultée](detail-composition-1280.png),
[détail 1024](detail-1024.png), [détail paysage 800](detail-800.png). Captures de
liste/filtres/Paramètres pleine page ; les images
peuvent donc dépasser la hauteur du viewport. Les captures de détail gardent
le viewport fixe et attendent la fin de la transition. Fixtures fictives uniquement ;
les tarifs des captures étroites reflètent l’enregistrement simulé de la recette.

## Vérification

- `npm run check` réussi : 93 tests backend, 67 frontend, puis build Vue.
- `docker compose config --quiet` et `git diff --check` réussis.
- [Recette Chromium](browser.cjs) spécifique au parcours : chargement de liste,
  recherche/réinitialisation/focus, archives, critères cachés, absence de résultat,
  listes vides, sélection clavier, détail à droite et modal mobile, réponses
  tardives ignorées, erreurs locales/reprise, focus après filtrage/fermeture,
  scroll libre desktop/verrouillé mobile, piège de focus mobile, fermeture
  Échap, tarifs zéro/non définis et composition 4 collections/20 papiers/2 rubans,
  survol/sélection réellement contrôlés sur Catalogues/Clientes/Commandes,
  accès à la préparation, paramètres par URL directe, saisie entre onglets,
  virgule/point/zéro, valeurs refusées, erreur/reprise, verrouillage de soumission,
  retour après enregistrement et conservation des tarifs locaux.
- Contrôle de débordement de page/fiches/panneau/formulaire et captures aux viewports
  CSS 1280 × 800, 1024 × 768, 375 × 800 et 800 × 375. Inspection visuelle de la
  liste et du détail desktop, des détails étroits/paysage et des paramètres.
- Audit indépendant en lecture seule : aucun défaut reproductible dans le
  périmètre, y compris nouvelle liste/panneau, concurrence et survol partagé.
  Une inspection visuelle a révélé un conflit de spécificité entre les styles
  génériques Catalogues et les fiches/bouton de fermeture ; il a été corrigé
  et la recette vérifie aussi les styles calculés (fiche sans cadre, hauteur
  minimum 72 px, fermeture sans bordure). Un nouvel audit indépendant de
  l’état final n’a trouvé aucun défaut reproductible et a confirmé la suite
  complète et la recette Chromium. Les tests API exigent l’autorisation
  d’ouvrir les ports temporaires ; ils passent avec cette autorisation.

Avec l’aperçu Vite en port 5174, lancer `node browser.cjs` depuis ce dossier ;
Playwright doit être accessible à Node. Si besoin, définir
`STAMP_PLAYWRIGHT_MODULE` (chemin du module), `STAMP_CHROMIUM_EXECUTABLE`
(exécutable Chromium) et `STAMP_PREVIEW_URL`. Toutes les API sont interceptées
par les fixtures ; aucune écriture sur les données locales ou NAS.

## Limites et prochaine étape

Le vrai Mac/Safari, la police système et le zoom 200 % restent à vérifier.
La recherche conserve les accents. La conservation des tarifs entre onglets ne
protège pas une saisie lors d’un rechargement ou du départ vers une autre page.
Aucune modification de l’API, du schéma, des prix historiques ou du composant
CataloguePrices partagé avec l’éditeur.

Sam a ensuite demandé d’harmoniser les listes Clientes/Commandes sur ce
format : [recette](../recette-fiches/README.md). Après cette harmonisation,
Sam a ensuite demandé que création/préparation remplace le détail dans cet
espace, avec liste 1/4 et formulaire 3/4. Le lot 3B.2 est réalisé localement,
validé par Sam le 10 octobre 2026 : [recette](../recette-jalon3b2/README.md).
