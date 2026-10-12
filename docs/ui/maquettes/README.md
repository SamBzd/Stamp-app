# Maquettes de référence — Atelier prune/citron

Copies figées des deux directions validées par Sam le 3 octobre 2026 :

- [Fournitures](fournitures.html) : palette, bandeau, colonnes blanches,
  cartes Liquid Glass et dock clair.
- [Commandes](commandes.html) : même identité sur une liste/détail dense.

## Consultation

Ouvrir les fichiers HTML exportés dans un navigateur. Ils contiennent leur
source dans une iframe isolée et n’appellent aucune API de Stamp App. Les
interactions sont locales et fictives. Les icônes et des utilitaires de
présentation chargent des versions figées depuis `unpkg.com` : une connexion
internet peut être nécessaire pour le rendu complet. Aucune donnée client
réelle n’est incluse.

Les fichiers `sources/*.fragment.html` conservent exactement les fragments
validés dans la conversation, avec leurs defaults (bandeau 150 px, voile de
carte 16 %, lignes Commandes 63 px). Ils ne s’ouvrent pas seuls avec tous les
utilitaires de présentation ; les exports HTML sont les versions consultables.
Les copies ne constituent pas de nouveaux écrans d’application.

L’export a été produit avec le renderer de la skill visualize disponible dans
la session de préparation. Il ne constitue ni une dépendance du projet ni
une commande de build de Stamp App. Les sources figées permettent de refaire
un export ultérieur sans dépendre des chemins personnels de cette session.

## Autorité et limites

Lire la [fiche UI](../identite-atelier.md) et le
[brouillon d’issue](../issue-ui-atelier.md) avant toute transposition.

Ces maquettes font autorité pour la direction visuelle, pas pour les données,
la sémantique ou le métier. En particulier :

- les intitulés de colonnes illustratifs diffèrent des cinq états réels ;
- les sous-titres de collection et mètres de ruban ne sont pas les données
  publiques du workflow anonyme ;
- Commandes illustre des acomptes, plusieurs kits, des notes et filtres qui ne
  doivent pas être ajoutés par cette issue UI ;
- le dock illustratif n’est pas l’inventaire des routes réelles : Papiers doit
  rester accessible et le bilan reste un onglet de Fournitures ;
- les sélecteurs de mois ne prouvent pas l’existence d’un filtrage mensuel du
  Kanban ou des Commandes ;
- les contrôles métier, alertes et états d’erreur omis doivent être conservés.

Les cascades CSS anciennes et les fixtures ont été conservées pour ne pas
réécrire la référence approuvée. Seul le résultat effectif de la dernière
palette fait foi ; ne pas recopier les variantes beige/vert/gris héritées
dans les sources. Les styles et scripts de preview ne sont pas prêts à être
importés dans Vue.

## Vérification de la réalisation

Comparer référence et écran réel à largeur et zoom identiques avec des données
de test comparables. Le rendu de la typo et du verre dépend du navigateur et
du système : une prévisualisation Chromium/Linux n’est pas une recette Safari
sur le Mac de la cliente. Toute divergence significative est explicitée puis
validée avec Sam, écran par écran.
