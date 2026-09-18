# Quantités à préparer — issue #10

Les stocks sont calculés à la volée depuis les compositions enregistrées des
commandes kits conservées, réglées ou non. Les commandes hors-kit n’ont pas de
composition matérielle et ne contribuent pas. Aucun inventaire ni reprise de
stocks de production n’est introduit.

## Contrat `GET /api/stocks`

Les cinq tableaux existants sont conservés. Les champs ajoutés rendent la
provenance et l’identité des lignes explicites :

| Tableau | Identité et libellés historiques | Quantités |
| --- | --- | --- |
| `papiers_cartonnes` | `papier_cartonne_id`, `nom`, `cle`, `provenances` | `nb_feuilles_base`, `nb_feuilles` (finales) |
| `collections` | `collection_id`, `nom`, `catalogue_id`, `catalogue_titre`, `cle` | `nb_commandes`, `total_feuilles_base`, `total_feuilles` (finales) |
| `rubans` | `ruban_id`, `nom`, `catalogue_id`, `catalogue_titre`, `cle` | `quantite` |
| `papier_spe` | `papier_spe`, `catalogue_id`, `catalogue_titre`, `cle` | `nb_commandes` (unités présentes) |
| `embellissement` | `embellissement`, `catalogue_id`, `catalogue_titre`, `cle` | `nb_commandes` (unités présentes) |

Chaque provenance papier conserve `papier_cartonne_id`, `nom`, `catalogue_id`,
`catalogue_titre`, `collection_id`, `collection_nom`, `nb_feuilles_base`,
`nb_feuilles` et `cle`. Ses quantités sont une ventilation du total papier,
pas des quantités supplémentaires.

Les regroupements utilisent les identifiants source **et les libellés figés**.
Un même papier utilisé dans deux collections est additionné dans une seule
ligne lorsqu’il porte le même libellé enregistré. Deux références différentes
avec le même nom restent distinctes. Après renommage, les nouvelles commandes
peuvent former une nouvelle ligne historique ; les anciennes lignes et leurs
quantités restent inchangées. `cle` est une clé opaque déterministe propre à
chaque ligne d’un tableau, utilisable par l’interface.

Les matériaux spécial/embellissement n’ont pas d’identifiant autonome dans le
schéma : leur identité est le catalogue et la désignation enregistrée. Leur
provenance reste ventilée par titre historique de catalogue. Aucun regroupement
ne dépend du matériel courant ni d’une jointure vers les sources.

L’option multiplie chaque quantité papier de base par deux, une seule fois.
Les contributions par collection appliquent le même calcul. Le ruban reste à
une unité par commande lorsqu’il est enregistré. Les matériaux absents ne
créent pas de ligne et ne sont jamais doublés.

L’archivage d’une cliente ou d’un catalogue, le règlement et les mutations
source ne retirent aucune contribution. La suppression physique d’une commande
non réglée retire immédiatement toute sa composition. Une commande réglée est
non supprimable.

## Parcours Stocks

L’onglet Stocks affiche papiers cartonnés, papier spécial, embellissements,
rubans et collections. Les papiers et collections affichent les quantités de
base et finales. « Origine des feuilles » ouvre une ventilation historique par
catalogue/collection ; les numéros de référence permettent de distinguer les
homonymes. Les libellés enregistrés sont conservés et expliqués en tête de page.
Le catalogue est identifié par son numéro dans chaque catégorie de matériel ;
la ventilation papier indique aussi le numéro de collection. Cela distingue
les sources même lorsqu’un ancien titre de catalogue est réutilisé après un
renommage, ou que deux collections portent le même nom.

« Actualiser » recharge directement `GET /api/stocks`. L’ancien endpoint
`POST /api/stocks/recalculate` reste un no-op de compatibilité côté backend,
mais l’interface ne l’appelle plus. Les chargements et erreurs Stocks/Bilan
sont indépendants ; une ancienne réponse ne remplace pas une actualisation
plus récente. Le contrat et le parcours du bilan sont documentés séparément
en [issue #11](bilan-commandes.md).

## Vérifications

`backend/test/commandes-kit-api.test.js` couvre répétitions, papier partagé,
option (P ×2 + Q ×3 → P ×4 + Q ×6), rubans homonymes, collections homonymes,
matériaux présents/absents, renommage suivi de nouvelles commandes, archivage,
règlement, suppression non réglée et refus de suppression réglée.
`frontend/test/stocks-store.test.js` couvre l’indépendance des états réseau
et l’ordre des réponses. Les contrôles de livraison sont `npm run check`
et `docker compose config`.

Recette navigateur réalisée sur une base SQLite temporaire avec deux commandes
fictives, une sans option et une avec : papiers de base 4/6 → finales 6/9,
matériaux et rubans ×2 au total, contributions par collection concordantes,
ouverture de la provenance et actualisation. Les vues bureau et 375 px ont été
contrôlées : sous 640 px, les tableaux Stocks deviennent des lignes empilées
avec leurs libellés de quantité, sans débordement horizontal. Aucun avertissement
ni erreur navigateur n’a été relevé dans ce parcours.
