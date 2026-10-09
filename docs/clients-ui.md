# Parcours Clientes — lot 3A

La route `/clients` affiche le répertoire dans le socle atelier prune/citron.
Sam a validé cette composition le 9 octobre 2026 et autorisé ses commits/push.
La recette réelle Mac/Safari reste ouverte. Voir la [recette 3A](ui/recette-jalon3a/README.md).

## Répertoire

La liste utilise désormais des fiches horizontales allégées, à la demande de
Sam le 9 octobre 2026 pour l’aligner sur Catalogues : nom/prénom et ville en
premier niveau, email/téléphone en second niveau, favori à droite. L’en-tête
prune de colonnes est supprimé ; les informations se replient naturellement
sans colonnes fixes. Les noms et coordonnées longs restent complets. Chaque
cliente s’ouvre par un bouton natif ; le bouton favori reste une action séparée.
Voir la [recette d’harmonisation](ui/recette-fiches/README.md).

Les onglets Actives/Archivées sont dans l’en-tête de la liste avec leurs totaux.
Ils sont utilisables au clavier avec les flèches, Début et Fin. La recherche et
la case Favoris uniquement se déplient inline avec Filtres ; elles sont repliées
au chargement. Leur badge et le libellé accessible signalent les critères actifs
lorsqu’ils sont cachés. Effacer les filtres conserve l’onglet choisi.

La recherche conserve son contrat existant : sous-chaîne dans le prénom, nom,
email ou ville, sans tenir compte des accents ; téléphone comparé par chiffres.
Les critères sont communs aux onglets et restent en mémoire dans la vue.
Les états de chargement, erreur avec reprise et absence de résultat sont explicites.

## Fiche et actions

À partir de 901 px CSS, la consultation reste à droite de la liste sans bloquer la
liste ni le défilement de la page. En dessous, le même contenu utilise le panneau
modal existant. Le contenu long de la fiche défile dans le panneau ; les actions
restent dans son pied. Email/téléphone, adresse, date de naissance, dernière
commande, relais et historique sont conservés. Le nom et l’ancienneté figurent
directement dans l’en-tête, avec le favori ; la carte de profil redondante est supprimée.

Les points fidélité, identifiés par une icône de ticket, sont modifiables juste
sous l’en-tête avec un crayon. L’éditeur inline propose Enregistrer et Annuler ;
Échap annule la saisie sans fermer la fiche. Un entier positif ou nul est requis,
zéro est conservé, et un refus serveur garde la saisie avec une erreur locale.
L’enregistrement réutilise `PATCH /api/clients/:id/points` et actualise le store.
Les actions concurrentes de fiche et la sélection sont verrouillées pendant la
requête ; une réponse arrivée après la navigation ne réouvre aucune fiche.
Les règles d’acquisition et de calcul de fidélité restent inchangées.

L’historique est une liste compacte sur une ligne verticale, avec un point par
commande : numéro en évidence, date et titre catalogue historique, ou Hors kit.
La date de commande explicite prime sur sa création lorsqu’elle existe ; aucun
format ni mode de paiement n’est affiché. Le règlement binaire reste un libellé
secondaire. Chaque ligne est un lien clavier vers `/commandes/kits?commande=<id>`
ou `/commandes/hors-kit?commande=<id>`, qui ouvre le détail réel correspondant.

Chaque sélection vide l’ancien historique et ignore ses réponses tardives. Une
erreur d’historique reste dans la fiche, avec une reprise, sans remplacer la liste
par une erreur. Les favoris affichent aussi leurs erreurs et verrouillent leur
propre mutation. Une sélection masquée par un changement de critère ferme la
fiche tout en préservant le focus dans le contrôle utilisé.

L’archivage/restauration conserve la confirmation et la fiche pour permettre
l’action inverse, même si la ligne sort de l’onglet courant. Une cliente archivée
reste consultable/modifiable ; Nouvelle commande reste désactivé. L’accès vers
Commandes conserve le chemin `/` et le paramètre `client` existants ; ce lot ne
modifie pas le comportement des formulaires Commandes à l’arrivée.

Les formulaires création/édition gardent leurs champs et leur organisation.
Seuls les verrous de soumission et l’affichage d’erreur serveur dans le formulaire
ont été renforcés. Les saisies restent présentes après un refus serveur.
La fermeture renvoie le focus à une cible visible : ligne, en-tête de la liste
si la ligne a disparu, ou bouton d’ajout pour une création.

Réutilisation de la route de points existante ; aucun changement backend,
schéma, calcul de fidélité ou données NAS.
