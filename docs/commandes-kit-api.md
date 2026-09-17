# API commandes kits — issue #7

Ce contrat concerne la future version, pas le NAS. Il utilise le schéma de
l’issue #5 sans migration supplémentaire. L’interface commandes est intégrée
en #9 : voir [le parcours et sa recette navigateur](commandes-ui.md).

## Création

`POST /api/commandes` retourne `201` et le détail de la commande. Exemple A :

```json
{
  "client_id": 1,
  "type": "kit",
  "catalogue_id": 2,
  "format_type": "A",
  "methode_paiement": "virement",
  "commande_collections": [
    {
      "collection_id": 3,
      "nb_feuilles": 2,
      "papiers": [{ "papier_cartonne_id": 5, "quantite_base": 2 }]
    },
    {
      "collection_id": 4,
      "nb_feuilles": 3,
      "papiers": [{ "papier_cartonne_id": 6, "quantite_base": 3 }]
    }
  ],
  "papier_supplementaire": true,
  "ruban_id": 7,
  "produit_promo_texte": "Accessoire promotionnel",
  "produit_promo_prix_cents": 250
}
```

Les IDs JSON sont des entiers strictement positifs, jamais des chaînes. La
cliente doit exister et être active ; le catalogue doit être publié, actif et
complet. `methode_paiement` est obligatoire : `Paypal`, `chèque` ou `virement`.
`date_commande` est optionnelle (chaîne ou `null`). Les champs inconnus et les
snapshots fournis par le client HTTP sont refusés. Un kit est créé non réglé ;
`reglee` n’est pas accepté pour sa création.

- A/B : exactement deux collections distinctes du catalogue, contributions
  `nb_feuilles` 2 et 3, dans un ordre quelconque. La bascule automatique des
  contributions dans le formulaire appartient au lot UI.
- C : exactement une collection, `nb_feuilles: 5`, avec chaque papier source
  présent au moins une fois. Avec cinq papiers, `papiers` peut être omis : le
  serveur prend un exemplaire de chacun. Avec un seul papier, l’omission prend
  cinq exemplaires. Avec deux à quatre papiers, la répartition explicite reste
  obligatoire.
- Chaque ligne `papiers` contient un ID appartenant à sa collection et une
  `quantite_base` entière positive. Un ID apparaît au plus une fois par
  collection ; son nombre d’exemplaires est porté par sa quantité. La somme
  doit être égale à la contribution. Le même papier de bibliothèque peut
  figurer dans les deux collections d’un kit.
- Zéro ruban : aucun choix non nul accepté. Un ruban : inclusion automatique,
  avec choix omis ou `null` autorisé. Deux rubans : `ruban_id` obligatoire et
  correspondant exactement à l’un des deux.
- `papier_supplementaire` accepte booléen ou 0/1 et vaut 0 par défaut. L’option
  coûte 350 centimes et double les quantités de papiers, sans doubler ruban,
  papier spécial ni embellissement. Les snapshots conservent les quantités
  **de base** ; les stocks appliquent le multiplicateur.

## Prix et historique

Le serveur copie le tarif du format depuis le catalogue et calcule : tarif de
format + option + suppléments. Pour `produit_promo` et `autres`, libellé et prix
doivent être tous deux absents/`null`, ou tous deux présents : texte non vide,
prix entier positif ou nul en centimes. Les champs sont
`produit_promo_texte`, `produit_promo_prix_cents`, `autres_texte`,
`autres_prix_cents`.

`prix_applique_cents` optionnel remplace explicitement le total calculé et fixe
`prix_origine: "manuelle"` ; sinon l’origine est `automatique`. Les prix de
supplément, le prix manuel et le total calculé doivent rester des entiers JSON
exacts (`Number.isSafeInteger`) positifs ou nuls. Les tarifs du catalogue restent
limités à 10 000 centimes. Une correction manuelle conserve les lignes de
supplément, qui restent visibles dans les catégories du bilan.

La commande fige titre du catalogue, noms des collections et papiers, répartition,
ruban et matériaux, ainsi que les prix. Toutes les lectures de composition et
les calculs de stocks et de bilan utilisent ces snapshots, jamais les sources
courantes. Les listes générales gardent les champs scalaires existants.
`GET /api/commandes/:id` et les réponses aux mutations ajoutent :

- `client` : identité actuelle de la cliente ;
- `commande_collections` : `id`, `collection_id`, `collection_nom`, `nb_feuilles` ;
- `papiers_selectionnes` : `id`, `commande_collection_id`, `papier_cartonne_id`,
  `nom` figé et `quantite_base` ;
- `ruban` : `{ ruban_id, ruban_nom, quantite: 1 }` ou `null`.

Les papiers sont donc imbriqués dans la requête d’écriture, mais retournés dans
la liste historique `papiers_selectionnes`, reliée aux lignes de collection.

## Modification, règlement et suppression

`PUT /api/commandes/:id` retourne `200`. Pour un kit non réglé, il exige le format
et toute la composition, avec le même contrat qu’à la création, sans `client_id`
ni `type`. `catalogue_id` omis conserve le catalogue d’origine. Le choix de
cliente et le type ne sont pas modifiables. Option, ruban et suppléments sont
réévalués à partir du corps complet : une option omise devient 0, les suppléments
omis sont retirés et un catalogue à deux rubans exige à nouveau le choix.
Méthode de paiement et date omises conservent leurs valeurs.

Le prix et les snapshots sont reconstruits depuis les sources actuelles. Une
ancienne correction manuelle n’est pas reconduite implicitement : elle doit
être envoyée explicitement à nouveau. La totalité des lectures, validations,
remplacements et écritures est transactionnelle. Tout refus ou échec SQL
restaure intégralement la commande et sa composition.

Conformément à l’archivage réservé à l’exclusion des **nouvelles** commandes,
une commande non réglée conserve la possibilité de modifier sa composition sur
son catalogue d’origine archivé ou brouillon, à condition qu’il soit toujours
complet. Un changement de catalogue exige en revanche un catalogue publié et
actif. Une cliente archivée reste associée à ses commandes existantes.

`PATCH /api/commandes/:id/reglement` accepte un corps absent ou `{}` et retourne
le détail réglé (`200`). Il fait uniquement passer `reglee` de 0 à 1, sans
recalculer prix ni composition, même après modification ou archivage des sources.
Les corps non vides sont refusés. `reglee` est refusé dans tous les `PUT`.

Une commande réglée, kit ou hors-kit, refuse toute modification, même vide,
un second règlement et toute suppression (`409`). Les triggers SQL existants
protègent aussi ses snapshots. `DELETE /api/commandes/:id` supprime une commande
non réglée et toutes ses lignes de composition, retourne `204` et retire ses
quantités des stocks.

Le contrat hors-kit conserve `montant` en euros et ses champs existants.
Son `PUT` reste partiel et sa création peut encore porter `reglee: 0/1`
(ou booléen), pour compatibilité. La règle de fidélité historique à la création
est conservée ; sa redéfinition est hors périmètre.

## Stocks, bilan et erreurs

`GET /api/stocks` expose les cinq catégories, rubans compris. Les papiers et
`collections.total_feuilles` comptent l’option ; le ruban et les matériaux ne
sont jamais doublés. Les noms viennent des snapshots : un même ID source
renommé peut donc donner plusieurs lignes historiques, identifiées séparément.
Les quantités de base et les provenances sont explicites depuis l’issue #10 :
voir [le contrat et le parcours Stocks](stocks.md).
Les stocks comprennent les commandes réglées et non réglées conservées.

`GET /api/stocks/bilan?mois=YYYY-MM` ne retient que les commandes réglées, pour
toutes ses catégories, au mois de création. Le chiffre d’affaires d’un kit est
`prix_applique_cents / 100`, y compris après correction manuelle. Les catégories
de supplément conservent leur libellé et leur prix propres.

Les erreurs JSON ont la forme `{ "error": "message" }` : `400` pour un corps,
champ ou composition invalide ; `404` pour commande, cliente ou catalogue
inexistant ; `409` pour une source indisponible/incomplète ou une commande réglée ;
`500` pour un échec interne inattendu, sans détail SQL dans la réponse.
