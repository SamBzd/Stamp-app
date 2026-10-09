# Identité UI — Atelier prune / citron

Direction visuelle validée par Sam le 3 octobre 2026 sur les maquettes
Fournitures et Commandes. Cette fiche prépare la future interface de `main` ;
elle ne décrit ni une réalisation terminée ni la production du NAS.

Les valeurs ci-dessous sont relevées dans les maquettes validées. Leurs noms
de tokens sont une proposition de formalisation, pas une nouvelle direction
artistique. L’[issue #39](issue-ui-atelier.md) encadre la réalisation par jalons.
Le [socle et Fournitures](recette-jalon1/README.md) sont implémentés localement ;
leur validation visuelle sur le Mac reste attendue.

## Références et priorité

- [Fournitures](maquettes/fournitures.html) : référence du Kanban, de la palette
  et du dock ; [source figée](maquettes/sources/fournitures.fragment.html).
- [Commandes](maquettes/commandes.html) : référence d’un écran dense avec liste
  et détail ; [source figée](maquettes/sources/commandes.fragment.html).
- [Tokens de référence](tokens-reference.json) : valeurs documentaires,
  organisées en primitives, rôles sémantiques et composants ; aucun import
  dans l’application.
- [Mode de consultation et limites](maquettes/README.md).

Les contrats métier et routes de `main` priment sur le contenu fictif des
maquettes. L’apparence validée prime sur les styles antérieurs beige/vert,
les palettes rejetées et les recommandations génériques de skills.

## Intention

Un atelier de scrapbooking contemporain : chaleureux, personnel, cadré et
lisible. Le bricolage est suggéré, pas reproduit sur chaque élément de travail.
Limiter l’identité à trois familles de signatures communes :

1. Lettrage créatif « Stamp App » et étiquettes découpées pour les titres et
   « Mon atelier ».
2. Bandeau prune, fond citron clair et surfaces de travail blanches.
3. Verre clair maîtrisé sur le dock et certaines cartes, sans filtrer le texte.

À éviter : texture kraft généralisée, cartes-papiers inclinées, cadres
illustratifs, badges partout, grandes ombres, dégradés décoratifs omniprésents
et animations spectaculaires. Le dock-ruban coupé aux ciseaux était une piste,
pas une exigence de la version validée.

## Palette

| Rôle | Valeur | Application |
| --- | --- | --- |
| Fond citron | `#FCF3CF` | Autour des zones de travail, à la place du gris |
| Surface blanche | `#FFFFFF` | Colonnes, tableaux, détails, formulaires |
| Prune douce | `#6C4B60` | Bandeau, titres secondaires, repères de marque |
| Prune des en-têtes | `#745668` | En-têtes Kanban et tableau |
| Texte principal | `#30232D` | Informations et valeurs importantes |
| Texte secondaire | `#61505B` | Descriptions et métadonnées |
| Texte sur prune | `#FFF8FC` | Libellés du bandeau et des en-têtes |
| Jaune accent | `#E4B63C` | Étiquette « Mon atelier », trait du logo |
| Jaune des compteurs | `#F6DA86` | Compteurs sur les en-têtes prune |
| Or du repère actif | `#A67408` | Petit trait du dock, pas un fond opaque |
| Citron de sélection | `#FFF8DE` | Ligne sélectionnée et rappel ponctuel |
| Séparateur de tableau | `#EAE3E8` | Division discrète, pas contour de carte |

Le jaune ne devient pas une couleur de texte sur blanc. Les couleurs
d’erreur, de succès et d’avertissement restent sémantiques, associées à un
libellé ou une icône ; ne pas les remplacer indistinctement par la prune.

Repères de contraste calculés sur aplats : texte secondaire/citron 6,72:1,
blanc/prune douce 7,47:1, compteur jaune/en-tête prune 4,67:1,
repère or/citron 3,68:1. Ces mesures ne valident pas à elles seules le verre,
les bordures de champs ni tous les états interactifs : les contrôler sur
leur fond réellement composé lors de l’implémentation.

## Typographie

Texte d’interface : `-apple-system, BlinkMacSystemFont, system-ui, sans-serif`
pour utiliser la police système sur le Mac cible. Ne pas télécharger ou
embarquer une copie de San Francisco. Logo uniquement : lettrage créatif
observé dans les maquettes (`Snell Roundhand`, `Apple Chancery`, cursive,
italique). Il n’existe pas encore de fichier de logo vectoriel autonome.

| Usage | Taille de référence | Graisse |
| --- | --- | --- |
| Logo complet « Stamp App » | 33 px | Lettrage créatif |
| Titre de page, dans l’étiquette | 27 px | 600 |
| Nom principal dans le détail | 21 px | 600 |
| Texte courant | 14 px | 400 |
| Tableau dense / cartes | 13–14 px | 400 ; 500–600 pour la hiérarchie |
| Texte secondaire | 12–13 px | 400 |

Les 11 px de certaines métadonnées du prototype ne sont pas une consigne
pour réduire les informations essentielles. Les montants et quantités sont
alignés, avec chiffres tabulaires. Aucun titre d’interface en police créative
hors logo ; aucun alignement logo / titre / sous-titre en colonne systématique.

## Composition desktop

| Élément | Repère issu des maquettes |
| --- | --- |
| Largeur utile | Toute la largeur disponible, moins les marges |
| Marges desktop | 24 px de chaque côté |
| Bandeau | 150 px de référence, contenu horizontal |
| Espacement Kanban / zones principales | 12 px / 16 px |
| Rayon des colonnes / panneaux | 10 px / 12 px |
| Rayon des cartes en verre / dock | 12 px / 23 px |
| Ligne de tableau avec deux niveaux de texte | 63 px de référence |
| Liste / détail Commandes | Rapport 1,7 / 1, détail lisible, pas une largeur fixe globale |

Ne pas conserver une colonne centrale étroite avec des côtés inutilisés.
Les cinq colonnes du Kanban doivent rester côte à côte au viewport desktop
cible ; ne pas reprendre automatiquement le seuil actuel de 1 100 px qui
les fait passer à deux colonnes. À largeur réduite ou au zoom, réorganiser
le contenu avant de réduire la typo ou cacher des informations métier.

Le dock reste au bas de l’interface, accessible et hors des zones d’actions.
Si sa position devient persistante, réserver sa place dans le contenu :
aucun chevauchement d’une carte, d’un bouton, d’un message ou du focus clavier.

## Surfaces et Liquid Glass

- Colonnes et panneaux blancs, bien délimités par leur surface et les
  espacements, sans gros cadre de couleur.
- Tableau continu : séparateurs fins, sélection citron et petit repère jaune,
  pas une carte en verre par cellule ou par ligne.
- Cartes Kanban : relief léger, bord optique, voile blanc de référence 16 %,
  contenu net ; ne pas teinter chaque carte en prune ou en jaune.
- Dock : verre presque incolore, bord lumineux fin, transparence visible,
  icônes et textes lisibles ; aucun gros bouton actif contrasté.
- La maquette simule une réfraction de bord, pas le matériau natif d’Apple.
  Son filtre SVG est limité à Chromium ; Safari utilise le repli CSS
  `blur(3px) saturate(120%)`. Ne pas transposer sa détection de navigateur ou
  son moteur optique comme une obligation technique.
- Le repli, l’absence de `backdrop-filter` et une préférence de transparence
  réduite doivent conserver un fond lisible et l’identité. La qualité du rendu
  Safari sur le vrai Mac reste à valider avec Sam.
- Aucune dépendance supplémentaire n’est requise par cette fiche. Reprendre
  des composants Vue et des tokens propres, pas la cascade expérimentale des
  maquettes, leurs fixtures, le moteur de démonstration ou les outils du host.

## Ce qui reste à transposer, sans changement métier

- Fournitures : conserver `À traiter`, `Commandé`, `Disponible`, `Expédié`,
  `Traité`, dans cet ordre. Les intitulés `À commander` / `Reçu` de la maquette
  ne remplacent pas ces états. Une carte reste anonyme : type, nom, quantité ;
  pas de collection ou de cliente ajoutée depuis le prototype.
- Commandes : conserver kits et hors-kit, composition/prix historiques,
  règlement binaire et protections existantes. Les acomptes, le reste à payer,
  plusieurs kits par commande, les notes et filtres fictifs de la maquette ne
  constituent pas de nouvelles fonctions à développer.
- Navigation : reprendre les destinations réelles Commandes `/`, Clientes
  `/clients`, Catalogues `/catalogues`, Papiers `/papiers`, Fournitures `/stocks`.
  Le bilan reste dans l’onglet de `/stocks`, pas dans une nouvelle route.
  « Stocks » et « Bilan » du dock illustratif ne suppriment pas Papiers.
- Les sélecteurs de mois illustratifs n’imposent pas de filtre mensuel au
  Kanban ou aux Commandes. Restyler les contrôles existants ; ne pas inventer
  de filtrage et ne pas confondre mois et date complète.
- Les alertes, confirmations, états vides/erreurs/chargement et actions métier
  absents du prototype restent visibles dans l’interface réelle.

Contrats à conserver : [Commandes](../commandes-ui.md) et
[workflow Fournitures](../workflow-fournitures-api.md). Une différence qui
nécessite un choix produit doit être soumise à Sam avant développement.

## Validation avant généralisation

Premier écran réel : Fournitures. Comparer aux références à largeur et zoom
identiques, avec des fixtures locales, puis obtenir la validation visuelle de
Sam sur son Mac 13" avant Commandes et les autres pages.

Les vues 1 280 × 800, 1 440 × 900 et 1 024 × 768 CSS servent de repères de
recette, pas d’affirmation sur le réglage d’affichage du Mac. Mesurer également
son viewport réel, tester le zoom à 200 %, les noms longs, un tableau dense,
les cinq colonnes remplies, les erreurs et le clavier.

Une case de recette technique réussie ne vaut pas validation esthétique.
Toute adaptation qui change la palette, le logo, les étiquettes, la disposition
principale ou la présence du verre demande une comparaison expliquée avec Sam.
