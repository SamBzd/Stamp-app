# Bilan des commandes — issue #11

Ce contrat concerne `main` stabilisée, pas la production du NAS. Aucun schéma,
import historique ni migration supplémentaire n’est nécessaire.

## Chaîne des prix

Les paramètres tarifaires par défaut sont copiés à la création d’un catalogue.
Modifier les defaults ne change aucun catalogue existant. Le catalogue conserve
ses tarifs propres, modifiables indépendamment. À la création ou lors d’une
édition explicite de kit non réglé, le serveur mémorise le tarif du format,
l’option et les suppléments, puis leur total dans `prix_applique_cents`.

Une dérogation manuelle remplace ce total, sans effacer les composants de prix
historiques. Le règlement ne recalcule rien. Une mutation des paramètres, des
tarifs ou des libellés source seule ne réécrit aucune commande. L’archivage
cliente/catalogue n’affecte pas le bilan. Les commandes réglées sont immuables.
Une édition non réglée recalcule depuis son catalogue actuel, jamais depuis
les defaults ; une ancienne dérogation n’est pas reconduite implicitement.

## Contrat API

`GET /api/stocks/bilan?mois=YYYY-MM` sélectionne uniquement `reglee = 1` et
`strftime('%Y-%m', created_at) = mois`, dans toutes les catégories. Le mois ne
dépend donc ni de `date_commande`, ni de la date de règlement.

```json
{
  "mois": "2023-06",
  "chiffre_affaires_cents": 7,
  "par_methode_paiement": [
    { "methode_paiement": "Paypal", "total_cents": 7, "nb_commandes": 1 }
  ],
  "produits_promo": [{ "texte": "Promo", "prix_cents": 103, "nb_fois": 1 }],
  "autres": [{ "texte": "Accessoire", "prix_cents": 207, "nb_fois": 1 }]
}
```

Chaque kit contribue exactement son `prix_applique_cents` : aucune relecture
settings/catalogue, aucune reprise de prix inconnu, aucun second ajout d’option
ou de supplément. Les détails promo/autres sont regroupés par libellé **et**
prix enregistrés ; ils ne sont pas une ventilation forcée du total manuel.
Le chiffre d’affaires égale la somme des totaux par paiement.
Les sommes sont lues en entiers exacts ; un total dépassant les entiers JSON
exacts provoque une erreur plutôt qu’un montant arrondi silencieusement.

Le contrat hors-kit conserve `montant` enregistré en euros. À l’entrée du
calcul du bilan, chaque montant est converti en centimes par arrondi au centime
le plus proche (`ROUND(montant * 100)` SQLite), puis les entiers sont additionnés.
Le montant stocké n’est pas modifié. Les méthodes `Paypal`, `chèque`, `virement`
et la catégorie hors-kit sans méthode (`null`) sont conservées.

Un mois vide retourne zéro et trois tableaux vides. Les anciens champs en
euros `chiffre_affaires`, `total` et `prix` sont remplacés par leurs champs
`*_cents` : l’API et son interface doivent être livrées ensemble.

## Interface et validations

L’onglet Bilan affiche les centimes en euros uniquement en présentation, avec
le même formateur exact que les commandes. Il consomme `par_methode_paiement`
et `autres`, et distingue deux détails de même libellé mais de prix différents.
Les textes expliquent le filtre temporel et la différence entre composants
historiques et total manuel. Aucun changement de design n’est introduit.

`backend/test/commandes-kit-api.test.js` couvre deux catalogues distincts,
defaults copiés, mutations tarifaires sans réécriture, édition explicite,
option/suppléments non doublés, dérogation, règlement sans recalcul,
non réglée exclue de toutes les catégories, archives, périodes et hors-kit.
`frontend/test/bilan-view.test.js` compile le véritable template Vue et vérifie
son rendu avec le contrat API, les homonymes tarifaires et un mois vide.
Les contrôles de livraison sont `npm run check` et `docker compose config`.
