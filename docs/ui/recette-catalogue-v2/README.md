# Catalogue V2 — timeline intégrée

Réalisé localement le 13 octobre 2026 à la demande de Sam sur `codex/petits-fix`.
Validation visuelle de Sam en attente. API, schéma, règles métier, données NAS
et déploiement inchangés. Les captures utilisent uniquement des fixtures.

## Parcours

Liste desktop sur 1/3, formulaire sur 2/3 dans l’espace Catalogues existant.
Quatre étapes à navigation directe : Informations, Composition, Rubans et tarifs,
Vérification. Le titre reste requis avant création du brouillon ; ensuite,
aucune étape n’exige d’avoir terminé la précédente.

Les sections masquées restent montées. La navigation conserve les saisies et
les sélections. Les enregistrements restent explicites par section, sauf le nom
d’une collection ou d’un ruban : sauvegarde à la sortie du champ et avec Entrée, sans bouton
Renommer. Les erreurs conservent la saisie, un nom vide est refusé. Le clic
qui quitte ce champ reste opérationnel (navigation ou choix des papiers). La timeline signale les étapes « À enregistrer » ; Vérification
montre les données enregistrées et renvoie vers les étapes ayant des saisies
en attente ou des conditions manquantes pour publication.

## Recette reproductible

Avec l’aperçu frontend sur `http://127.0.0.1:5176` :

```sh
node docs/ui/recette-catalogue-v2/browser-onglets.cjs
```

Définir si nécessaire `STAMP_PLAYWRIGHT_MODULE`, `STAMP_CHROMIUM_EXECUTABLE`,
`STAMP_PREVIEW_URL` et `STAMP_CAPTURE_DIR`. Playwright et Chromium sont des outils
locaux de recette, sans nouvelle dépendance du projet. Le script intercepte
les API sur des données fictives ; il n’accède à aucune base locale ni NAS.

Couverture : création/refus avec titre requis et charge utile inchangée ;
accès aux tarifs sans collection ; conservation des champs, recherches,
sélections de papiers et erreurs entre étapes ; compteur unique pendant la
sélection ; renommage Entrée/sortie de champ/refus/nom vide, clic de changement
d’étape et d’ouverture des papiers sans seconde tentative ; sauvegardes distinctes ;
création d’un papier et sauvegarde verrouillant la navigation ; prix invalide
puis prix zéro ; résumé et publication explicite ; abandon d’une saisie dans
une étape masquée ; catalogues archivés et restauration ; maxima 4 collections
et 2 rubans ; lien de condition manquante ; navigation clavier ; proportions,
absence de débordement et actions atteignables aux tailles 1280×800,
1024×768, 375×800 et 800×375 ; préférence de mouvement réduit.

## Captures

| Étape | Desktop |
| --- | --- |
| Informations | [Capture](etape-1-1280.png) |
| Composition | [Capture](etape-2-1280.png) |
| Rubans et tarifs | [Capture](etape-3-1280.png) |
| Vérification | [Capture](etape-4-1280.png) |

[Sélection : compteur unique et nom sans bouton](selection-compteur-unique-1280.png).

[Composition étroite](etape-2-375.png) · [Composition paysage](etape-2-800.png).

## Résultats

- `npm run check` : 93 tests backend, 72 frontend et build réussis.
- Tests frontend et build répétés après le dernier ajustement de présentation.
- `docker compose config --quiet` et `git diff --check` réussis.
- Recette V2 réussie aux quatre tailles, avec clics effectifs sur Précédent/Suivant.
- Régression 3B.1 réussie : consultation, filtres, clavier, paramètres et tarifs.
- Audit indépendant en lecture seule par `gpt-5.6-sol` effort `medium`, avec
  l’accord de Sam pour remplacer Terra indisponible : aucun défaut reproductible
  trouvé dans le périmètre. L’auditeur a reproduit indépendamment la recette V2,
  les tests, le build, Docker et le contrôle du diff.

Les anciennes recettes 3B.2, défilement et zoom conservent leur valeur historique,
mais leurs hypothèses de sections simultanées/proportions ne décrivent plus la V2.
Le zoom natif à 200 % et la recette réelle sur le Mac de la cliente n’ont pas été
rejoués pour cette évolution. Validation visuelle de Sam en attente.

## Ajustements après revue de Sam

Compteur des papiers enregistrés masqué pendant la sélection, pour conserver
uniquement le compteur de sélection. Bouton Renommer retiré des collections ;
le nom est enregistré à sortie du champ ou avec Entrée selon le choix de Sam.
Un clic pour changer d’étape ou ouvrir les papiers fonctionne dès la première
tentative. Un refus conserve le nom saisi, un nom vide n’est pas envoyé au serveur.
Les API existantes sont conservées. Build, tests frontend et recette V2 enrichie
sur fixtures réussis après ces changements.

### Focus après renommage

L’audit complémentaire a signalé une perte de focus de la recherche lors du
renommage suivi d’un clic sur Choisir les papiers (pertinence 3/5). Jarvis a
reproduit ce comportement avec une réponse PUT retardée de 100 ms. Sam a
explicitement autorisé la correction. Après sauvegarde réussie, le focus est
rétabli seulement si la recherche l’avait avant la mutation, reste visible et
activée, et si aucun autre contrôle n’a le focus. Un refus conserve le focus
sur son erreur. La recette vérifie la recherche prête à saisir et l’absence
de déplacement du focus lors d’un changement d’étape.

### Allègement après la seconde revue de Sam

Les formulaires d’ajout disparaissent aux plafonds de quatre collections et deux
rubans. Chaque collection vide est accompagnée, dans Vérification, d’un seul
lien Ajouter un papier ; pas de constat et de rappel séparés. Les rubans se
renomment aussi à sortie du champ ou avec Entrée, sans bouton. Les réussites
ordinaires restent annoncées aux lecteurs d’écran sans bandeau visuel ; les
alertes de retour au brouillon et les erreurs restent affichées. Les files de
sauvegarde au blur sont partagées par un composable, sans changement des API.
La recette vérifie les refus et noms vides de rubans, la conservation de saisie,
les clics et focus après sauvegarde retardée, l’absence de champs au plafond et
l’absence de messages doublés dans la vérification. `npm run check` réussi
(93 tests backend, 72 frontend et build), recette V2 réussie aux quatre tailles,
Docker et diff vérifiés.

[Composition au plafond](composition-plafond-1280.png) ·
[Rubans au plafond](rubans-plafond-1280.png) ·
[Vérification des collections vides](verification-collections-vides-1280.png).

### Refus d’un renommage par Entrée

L’audit a signalé deux PUT successifs après une seule soumission par Entrée
refusée (pertinence 4/5), sur collections et rubans. Jarvis a reproduit deux
requêtes sur fixtures : la désactivation du champ focalisé provoquait un blur
remettant sa propre sauvegarde en attente. Le composable ignore désormais les
demandes provoquées pendant sa sauvegarde, tout en conservant la file des saisies
quittées lors d’une autre mutation. La recette compte les requêtes avec latence :
une par action Entrée ou Tab, aucune relance automatique après le refus. Saisies
conservées. Recette enrichie et `npm run check` réussis sur l’état corrigé.

### Continuité du focus clavier

La revue suivante a signalé une perte de focus au clavier après succès avec Tab
ou Entrée (pertinence 4/5). Jarvis a reproduit un focus sur body pour Collection
Tab, Collection Entrée et Ruban Tab. Le composable conserve maintenant la cible
suivante fournie par le blur et la retrouve après réactivation, même si un bouton
a été remonté. Les boutons de choix des papiers disposent d’un identifiant stable.
Un autre contrôle déjà focalisé ou une étape masquée ne reçoit pas de focus forcé.
La recette vérifie Tab vers le contrôle suivant et Entrée vers le nom, ainsi que
les refus et la navigation par clic. Recette et suite complète réussies après
correction (93 backend, 72 frontend, build).

Le signalement concernant le texte local Tarifs enregistrés est hors du retrait
des bandeaux de création : cette confirmation tarifaire est un paragraphe sans
fond ni bandeau, pas un bandeau de création collection/ruban. Elle est conservée
avec les enregistrements tarifaires explicites de cette V2.

### Dernier audit de l’état corrigé

Un nouvel audit indépendant en lecture seule par gpt-5.6-sol medium n’a trouvé
aucun défaut reproductible dans le périmètre des quatre ajustements. L’auditeur
a reproduit la recette complète (latence, requêtes comptées, clavier, clics,
refus, focus et quatre tailles), `npm run check`, Docker et le contrôle du diff.
Les changements restent locaux, non committés ; validation visuelle de Sam en cours.

## Composition en onglets retenue par Sam

La variante Collections en onglets est choisie et réalisée localement. Elle
remplace l’empilement des collections à l’étape Composition : un titre modifiable
au clic et cinq cartes, bibliothèque ouverte au besoin, ajout/remplacement/retrait
associatif, enregistrement ou annulation de la sélection. Les onglets signalent
les comptes et saisies en attente. Les recherches et sélections restent présentes
entre onglets et étapes. Une collection ajoutée devient active ; les liens de
Vérification sélectionnent leur collection. Les sources archivées restent visibles,
les catalogues archivés sont consultables sans mutation.

La recette active `browser-onglets.cjs` couvre création du brouillon avec titre,
ajout et plafond de collections, sélection sur cinq cartes, conservation entre
onglets/étapes, refus et conservation, titre cliquable, sauvegarde Enter/Tab et
focus, comptage des refus (pas de relance automatique), remplacement à cinq,
retrait/annulation, création d’un papier avec verrouillage et focus, résumé vers
la bonne collection, garde d’abandon, archivés, démotion et quatre tailles.
`browser.cjs` décrit la présentation linéaire antérieure et ne doit plus être
utilisé comme recette du formulaire courant. Aucune modification API ni schéma.

### Validation des onglets

La recette Chromium réussit aux largeurs 1280, 1024, 375 et 800 pixels.
`npm run check` réussit (93 tests backend, 72 frontend et build), ainsi que
`docker compose config --quiet` et `git diff --check`.
Captures : [desktop](onglets-1280.png), [mobile](onglets-375.png).

Le premier audit des onglets a signalé un faux état modifié lors de la simple
consultation de la bibliothèque (4/5), reproduit par Jarvis. La protection et les
boutons de sauvegarde comparent désormais les identifiants ordonnés des papiers
avec la composition enregistrée. Une consultation sans changement ou le choix du
papier actuel ne déclenchent plus de confirmation d’abandon. La recette le vérifie.
Le message contradictoire du papier actuel (2/5), reproduit et soumis à Sam,
est corrigé après son accord : « Garder ce papier », sans « déjà sélectionné ».

L’aperçu local a été reconnecté à une API sur une nouvelle base de démonstration
`/tmp/stamp-onglets-preview.db` créée par l’outil de recette. Les données de cet
aperçu sont synthétiques ; aucune base existante ni le NAS ne sont modifiés.
Les changements sont non committés sur `codex/petits-fix` dans `/tmp/stamp-petits-fix`.

Un contrôle navigateur sans interception API confirme le chargement de la
composition du catalogue de démonstration : trois onglets, cinq cartes dans la
collection active, aucune erreur JavaScript.

Le nouvel audit indépendant en lecture seule (gpt-5.6-sol medium autorisé par
Sam) ne trouve aucun défaut reproductible dans ce périmètre après correction.
L’auditeur reproduit la suite complète, Docker, le contrôle du diff et la recette
Chromium aux quatre tailles. La validation visuelle de Sam reste ouverte.

### Bord du détail suivant la dernière ligne

Correction locale demandée par Sam après les onglets : le cadre de consultation
raccourcit lorsque sa dernière action remonte dans la zone visible, sans déplacer
l’en-tête ni modifier le débattement de défilement. Contrôle Chromium avec l’API
réelle de démonstration : à 1251×824 le bord passe de 824 à 729,5 px avec la dernière
action à 711,5 px ; le scroll maximal reste 206 px. Des scrolls répétés vers le bas
ne provoquent aucune dérive ; revenir en haut rétablit le bord à 824 px. Vérifiés
aussi à 1024×768, sur contenu court à 1251×1200 et en panneau mobile à 375×800.
Aucune erreur navigateur. `npm run check` (93 backend, 72 frontend et build),
Docker et contrôle du diff réussis.
[Capture en fin de scroll](detail-bord-suivant.png).
