# Recette Clientes — lot 3A

> Cadrage de livraison actualisé le 11 octobre 2026 : Chrome est utilisé par
> la cliente, Zen est validé par Sam et Safari est non testé, sans blocage.
> Les réserves Mac/Safari datées ci-dessous sont historiques ; voir la
> [validation actuelle de #39](../validation-issue39.md).

Cette recette conserve les captures historiques du tableau validé initialement.
Sam a ensuite demandé des fiches inspirées de Catalogues : la
[recette d’harmonisation](../recette-fiches/README.md) décrit le rendu actuel.

Réalisation locale du 9 octobre 2026, après autorisation de Sam de passer au lot
suivant. **Sam a validé le rendu final le 9 octobre 2026 et autorisé les commits
et le push.** Catalogues et les lots suivants ne sont pas engagés ;
la prochaine phase est décrite dans le [cadrage 3B](../jalon3b-cadrage.md).

## Composition proposée

Le titre Clientes reprend le bandeau atelier. La liste devient un tableau
compact, avec Actives/Archivées dans son en-tête. Filtres ouvre inline la recherche
et Favoris uniquement ; les critères restent signalés lorsqu’on les replie.
La consultation se place à côté du tableau sur desktop et utilise le panneau
modal existant en dessous de 901 px CSS. Le nom complet figure dans la fiche ;
le nom et l’ancienneté se trouvent directement dans l’en-tête, avec le favori,
sans carte de profil supplémentaire. Les noms longs reviennent à la ligne.

La fiche conserve les coordonnées, les liens email/téléphone, l’adresse,
naissance, dernière commande et relais. Les points sont modifiables inline,
avec une icône de ticket et un crayon : Enregistrer/Annuler, validation entière
positive ou nulle, refus serveur sans perte de saisie et verrou de mutation.
L’historique utilise une ligne verticale et des points par commande, avec numéro,
date et titre catalogue historique ou Hors kit ; un clic ouvre le bon onglet et
le détail correspondant. Format et mode de paiement sont retirés de la fiche.
Le règlement binaire reste discret sur la seconde ligne. Son corps défile, ses actions restent dans le pied.
Les formulaires gardent leur organisation et leurs champs. Ils affichent le refus
serveur et conservent les saisies ; la soumission en cours bloque leur fermeture.
Voir le [contrat Clientes](../../clients-ui.md).

## Captures sur données synthétiques

Ces clientes et coordonnées sont des fixtures interceptées dans Chromium,
pas une extraction de la base NAS. Les captures étroites sont des viewports CSS,
pas une affirmation sur les dimensions ou le zoom du Mac de Sam.

| État | 1 280 × 800 | 1 024 × 768 | 375 × 800 | 800 × 375 |
| --- | --- | --- | --- | --- |
| Liste | [capture](liste-1280.png) | [capture](liste-1024.png) | [capture](liste-375.png) | [capture](liste-800.png) |
| Filtres | [capture](filtres-1280.png) | [capture](filtres-1024.png) | [capture](filtres-375.png) | [capture](filtres-800.png) |
| Fiche | [capture](fiche-1280.png) | [capture](fiche-1024.png) | [capture](fiche-375.png) | [capture](fiche-800.png) |

Compléments : [historique en bas de fiche](historique-1280.png),
[formulaire de création conservé](creation-1280.png),
[édition des points sur mobile](points-edition-375.png) et
[refus d’enregistrement des points](points-erreur-1280.png).
Les captures des panneaux modaux restent cadrées au viewport ; les listes et
les filtres peuvent montrer toute la page. Les captures de fiche et d’historique
restent au viewport pour préserver sa hauteur et son défilement interne.

## Vérifications réalisées

- `npm run check` : 93 tests backend, 67 tests frontend et build réussis.
  La route existante de points est testée sur une base temporaire : mise à jour
  positive/zéro, refus des valeurs invalides et conservation des autres données
  et de l’historique.
- `docker compose config --quiet` et `git diff --check` réussis.
- [Tests du template réel](../../../frontend/test/clients-view.test.js) :
  coordonnées, tableau/contrôles natifs, historique, cliente archivée,
  erreur d’historique, absence de résultat, en-tête et édition de points.
  [Tests du store](../../../frontend/test/clients-store.test.js) et
  [liens/dates/catalogue](../../../frontend/test/client-history.test.js).
- [Recette navigateur](browser.cjs) : onglets au clavier, recherche sans accent,
  favoris, repli/effacement, retour de focus après retrait d’un favori ou filtre
  masquant la sélection ; consultation, fermeture, liens email/téléphone,
  réponses d’historique tardives ignorées et reprise après erreur ; création et
  modification avec refus serveur puis réussite ; soumission verrouillée ;
  confirmation/annulation d’archivage, restauration et refus d’archivage ;
  édition de points (annulation/Échap, vide/négatif/décimal, zéro, refus/reprise,
  mutation verrouillée et focus), liens historiques ouvrant le vrai détail kits
  et hors-kit ; accès existant vers Commandes avec paramètre `client` ; passage desktop/mobile,
  clavier/Échap, verrous de défilement et absence de débordement de page ou interne.
- Audits indépendants en lecture seule : aucun défaut introduit confirmé par
  les auditeurs. Ils ne remplacent pas la recette navigateur. Les contrôles
  navigateur et visuels ont permis de corriger un conflit de retour de focus
  après filtrage et un titre de fiche long coupé à l’intérieur du panneau.
  La revue de la révision a proposé de retirer aussi le statut Réglée/En attente ;
  ce constat n’est pas confirmé : le règlement est distinct du mode de paiement
  dont Sam a demandé le retrait. Ce statut existant est conservé discrètement.

La recette browser nécessite une preview déjà démarrée et un Playwright avec
Chromium disponible. Elle intercepte tous les appels `/api/` et ne modifie pas
la base de la preview. Variables optionnelles : `STAMP_PREVIEW_URL` (défaut
`http://127.0.0.1:5174`), `STAMP_PLAYWRIGHT_MODULE` (défaut `playwright`) et
`STAMP_CHROMIUM_EXECUTABLE`. Exécution : `node docs/ui/recette-jalon3a/browser.cjs`.

## Limites et prochaines décisions

Le vrai Mac/Safari, le viewport réel, le zoom 200 %, la police système, le verre
et la transparence réduite restent à recetter avec Sam. Aucun déploiement NAS.

Limite préexistante vérifiée dans le code et relevée par l’audit : Nouvelle
commande transmet `?client=<id>`, mais les formulaires Commandes ne consomment
pas ce paramètre pour présélectionner la cliente. Le lot 3A conserve cette
navigation ; la présélection doit être cadrée avec le lot des formulaires.

La validation visuelle de Sam permet de préparer le lot Catalogues 3B ;
la recette réelle Safari/Mac reste ouverte. Les états de sélecteurs et la
refonte globale des formulaires restent au lot 3D.
