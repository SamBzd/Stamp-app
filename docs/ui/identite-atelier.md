# Identité UI — Atelier Sauge d’origine

Le 20 novembre 2026, Sam valide la palette **Sauge d’origine** et son application
à toute l’interface en [issue #51](https://github.com/SamBzd/Stamp-app/issues/51).
Cette décision remplace exclusivement les couleurs prune/citron des maquettes
du 3 octobre. Le design et l’UX actuels sont conservés : disposition, dimensions,
polices, formes, icônes, animations et interactions. Le contrat de couleurs actuel
est [Sauge d’origine](palette-sauge-origine.md) ; les anciennes recettes restent
historiques et ne prouvent aucune livraison de cette palette sur le NAS.

Les valeurs ci-dessous sont relevées dans les maquettes validées. Leurs noms
de tokens sont une proposition de formalisation, pas une nouvelle direction
artistique. L’[issue #39](issue-ui-atelier.md) encadre la réalisation par jalons.
Le [socle et Fournitures](recette-jalon1/README.md) sont implémentés localement
et Sam a autorisé la progression vers Commandes le 9 octobre. La recette consolidée reste ouverte ; voir la
[validation actuelle](validation-issue39.md). [Commandes](recette-jalon2/README.md) est validé par Sam
le 9 octobre ; la suite est proposée dans le [cadrage du jalon 3](jalon3-cadrage.md).

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
maquettes. La palette Sauge d’origine validée en #51 prime désormais sur leurs
anciennes couleurs ; leur géométrie ne doit pas être réintroduite au détriment
de l’interface actuelle.

## Intention

Un atelier de scrapbooking contemporain : chaleureux, personnel, cadré et
lisible. Le bricolage est suggéré, pas reproduit sur chaque élément de travail.
Limiter l’identité à trois familles de signatures communes :

1. Lettrage créatif « Stamp App » et étiquettes découpées pour les titres et
   « Mon atelier ».
2. Bandeau sauge, fond ivoire et surfaces de travail blanc cassé.
3. Verre clair maîtrisé sur le dock et certaines cartes, sans filtrer le texte.

À éviter : texture kraft généralisée, cartes-papiers inclinées, cadres
illustratifs, badges partout, grandes ombres, dégradés décoratifs omniprésents
et animations spectaculaires. Le dock-ruban coupé aux ciseaux était une piste,
pas une exigence de la version validée.

## Palette

| Rôle | Valeur | Application |
| --- | --- | --- |
| Fond ivoire | `#FDFCF8` | Autour des zones de travail |
| Surface blanc cassé | `#FEFEFA` | Colonnes, listes, détails, formulaires |
| Vert sauge | `#5D7052` | Bandeau, titres, actions, en-têtes et repère actif |
| Texte principal | `#2C2C24` | Informations et valeurs importantes |
| Texte secondaire | `#57594F` | Descriptions et métadonnées |
| Texte sur sauge | `#FFFFFF` | Bandeau et actions principales |
| Compteurs sur sauge | `#F3F4F1` | Compteurs des colonnes |
| Accent beige | `#D8C8AE` | Étiquette « Mon atelier », trait du logo |
| Beige doux | `#F0EBE5` | Surfaces secondaires et résumé |
| Survol | `#F0F2EB` | Lignes et fiches |
| Sélection | `#E3E8DA` | Élément sélectionné avec trait sauge |
| Bordure de champ | `#8B917F` | Contours des contrôles |
| Séparateur | `#E3E4D9` | Séparateurs fins |

Historique remplacé sur les couleurs par #51 : Sam avait validé le 9 octobre
2026 la proposition prune de survol/sélection, pour
mieux distinguer les lignes du fond citron. Cette décision remplace le citron
de sélection des maquettes initiales ; leurs fichiers de référence restent
historiques. Les tokens applicatifs dédiés sont `--surface-hover` et
`--surface-selected` ; `--primary-light` garde ses autres usages.
Sam a ensuite validé la composition Catalogues et demandé d’aligner les listes
Clientes/Commandes : fiches horizontales compactes, sans en-tête de colonnes
prune ni colonnes fixes. Les onglets restent dans l’en-tête blanc et le détail
sélectionné à droite ; voir la [recette](recette-fiches/README.md).
Pour Catalogues, Sam a ensuite demandé que création et préparation remplacent
ce détail : liste 1/4, formulaire 3/4, retour à 2/3–1/3 lorsqu’une autre fiche
est choisie, transition douce et mouvement réduit respecté. Voir la
[recette 3B.2](recette-jalon3b2/README.md).

Les couleurs d’erreur, de succès, d’information et d’avertissement restent
sémantiques, associées à un libellé ou une icône. Les contrastes de la nouvelle
palette et les limites des preuves sont consignés dans [le contrat #51](palette-sauge-origine.md).

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
- Tableau continu : séparateurs fins, survol sauge pâle, sélection sauge plus
  soutenue et petit repère sauge,
  pas une carte en verre par cellule ou par ligne.
- Cartes Kanban : relief léger, bord optique, voile blanc de référence 16 %,
  contenu net ; ne pas recolorer chaque carte avec un aplat de marque.
- Dock : verre presque incolore, bord lumineux fin, transparence visible,
  icônes et textes lisibles ; aucun gros bouton actif contrasté. Sam a demandé
  son maintien fixe en bas de l’écran. Les détails et formulaires desktop vont
  jusqu’en bas sous ce dock ; leur marge finale est interne aux zones défilantes.
  Les listes Clientes, Catalogues et Commandes demandées par Sam le 10 octobre
  2026 suivent la hauteur de leur contenu : aucune grande surface vide sous
  une liste courte. Une liste longue est plafonnée avant le dock et défile
  indépendamment. Le filtrage recalcule cette hauteur. Les autres vues réservent
  la hauteur réelle du dock dans le contenu. Les confirmations gardent leur couche modale.
- La maquette simule une réfraction de bord, pas le matériau natif d’Apple.
  Son filtre SVG est limité à Chromium ; Safari utilise le repli CSS
  `blur(3px) saturate(120%)`. Ne pas transposer sa détection de navigateur ou
  son moteur optique comme une obligation technique.
- Le repli, l’absence de `backdrop-filter` et une préférence de transparence
  réduite doivent conserver un fond lisible et l’identité. Safari reste non testé et n’est plus une condition de livraison ;
  Chrome est utilisé par la cliente et Zen est validé par Sam.
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
  Kanban ou aux Commandes. La recherche cliente sur les deux pages Kits/Hors kit
  et le filtre catalogue sur Kits ont été demandés par Sam le 9 octobre 2026 ;
  ils utilisent les données réelles. Ne pas confondre mois et date complète.
- Les alertes, confirmations, états vides/erreurs/chargement et actions métier
  absents du prototype restent visibles dans l’interface réelle.

Contrats à conserver : [Commandes](../commandes-ui.md) et
[workflow Fournitures](../workflow-fournitures-api.md). Une différence qui
nécessite un choix produit doit être soumise à Sam avant développement.

## Validation avant généralisation

Premier écran réel : Fournitures. Comparer aux références à largeur et zoom
identiques, avec des fixtures locales, puis obtenir la validation visuelle de
Sam avant Commandes et les autres pages.

Les vues 1 280 × 800, 1 440 × 900 et 1 024 × 768 CSS servent de repères de
recette, sans imposer une machine précise. Tester également le zoom navigateur
à 200 %, les noms longs, un tableau dense,
les cinq colonnes remplies, les erreurs et le clavier.

Une case de recette technique réussie ne vaut pas validation esthétique.
Toute adaptation qui change la palette, le logo, les étiquettes, la disposition
principale ou la présence du verre demande une comparaison expliquée avec Sam.

## Composants communs — 10 octobre 2026

Sam a autorisé l’harmonisation des champs, sélecteurs, confirmations, erreurs
et notifications. Les contrôles utilisent les tokens communs : fond blanc,
rayon 6 px, hauteur minimale 44 px, bord neutre et focus sauge. Les champs de formulaire
sur écran étroit passent à 16 px de texte pour éviter le zoom automatique de saisie.
Les erreurs gardent leur texte et leurs liens accessibles ; les sélecteurs
et cases communes associent désormais leur erreur ou aide au contrôle.
Les confirmations restent modales, sobres et verrouillées pendant une mutation.
Les notifications sont en haut à droite (en haut sur écran étroit), avec
annonce accessible, fermeture clavier et pile défilante dégagée du dock.
La [recette dédiée](recette-composants-communs/README.md) conserve les preuves.

Les dates utilisent un calendrier commun blanc cassé et sauge, en semaine commençant
le lundi. Tout le contrôle déploie le calendrier dessous, dans le formulaire,
en poussant la suite du contenu. Un second clic le replie. Il permet de choisir un jour,
de changer directement de mois/année, de saisir JJ/MM/AAAA et d’effacer ou
d’annuler. Le mois du bilan garde son sélecteur spécifique.
Voir la [recette des calendriers](recette-calendriers/README.md).

Le [cadrage de validation du 11 octobre 2026](validation-issue39.md) précise
les navigateurs retenus et remplace les anciennes conditions Mac/Safari.
