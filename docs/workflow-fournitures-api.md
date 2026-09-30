# Workflow opérationnel des fournitures — issue #30

Ce contrat prépare le futur Kanban sans construire son interface. Il ne reprend
aucune commande existante lors de la migration `0004_workflow_fournitures.sql`.
Une nouvelle commande kit crée immédiatement une ligne persistante par unité
physique. Une ancienne commande kit est initialisée seulement à son premier
`PUT`; une lecture, un règlement ou une suppression ne déclenche aucun backfill.

## Identité et états

Les types publics sont `papier_collection`, `ruban`, `papier_special` et
`embellissement`. L’identité matérielle est la paire exacte `{type, nom}` : les
majuscules, accents et espaces internes sont significatifs. Les groupes publics
additionnent donc les unités de commandes, collections ou catalogues différents
dès que cette paire et l’état sont identiques.

Les états sont exactement `À traiter`, `Commandé`, `Disponible`, `Expédié` et
`Traité`. Toute unité neuve commence dans `À traiter`. Tous les déplacements
entre deux états différents sont manuels et autorisés, y compris vers un état
antérieur. Les mutations par quantité sélectionnent les unités non archivées
les plus anciennes (`id` croissant) dans une transaction.

## Lecture et mutations publiques

`GET /api/fournitures` retourne :

```json
{
  "groupes": [
    { "type": "ruban", "nom": "Lin naturel", "etat": "Commandé", "quantite": 2 }
  ],
  "alertes": [
    {
      "type": "ruban", "nom": "Lin naturel", "code": "surplus",
      "message": "Des unités déjà engagées dépassent le besoin actuel.",
      "quantite": 1, "creee_le": "2026-09-30 10:00:00"
    }
  ]
}
```

Aucun objet ne contient d’identifiant d’unité, de commande ou de cliente.

`PATCH /api/fournitures/deplacement` accepte exclusivement `type`, `nom`,
`etat_source`, `etat_cible` et `quantite`. La quantité doit être un entier
strictement positif disponible en totalité dans le groupe source. La réponse
reprend la mutation appliquée.

`POST /api/fournitures/archivage` accepte exclusivement `type`, `nom` et
`quantite`. Seules les unités `Traité` peuvent être archivées. Elles disparaissent
alors définitivement de `groupes`, mais continuent à compter comme besoin déjà
réalisé lors des synchronisations suivantes et ne sont jamais régénérées.

Les corps ou enums invalides produisent `400`; une quantité indisponible produit
`409`; une erreur SQL inattendue reste masquée derrière le `500` API commun.
Toute mutation est atomique.

## Interface Kanban — issue #31

La route `/stocks` présente le workflow sous forme de cinq colonnes toujours
ordonnées : À traiter, Commandé, Disponible, Expédié et Traité. Une carte ne
montre que le type, le nom et la quantité agrégée de la fourniture. Le
glisser-déposer ouvre un sélecteur de quantité ; aucune mutation optimiste ne
masque un refus du serveur.

Sur petit écran, les colonnes passent à la verticale dans le même ordre. Les
alertes anonymes du workflow sont affichées au-dessus du tableau. Dans Traité,
« Terminer » archive toute la pile après confirmation. Le bilan mensuel reste
disponible dans un second onglet de la même route.

## Synchronisation avec les commandes

La synchronisation est interne aux transactions `POST`, `PUT` et `DELETE` des
commandes. Les papiers reprennent la quantité de composition, doublée par
`papier_supplementaire`; ruban, papier spécial et embellissement valent une
unité lorsqu’ils sont présents.

Lors d’un `PUT`, le besoin est réconcilié par paire exacte `{type, nom}` :

- seules les unités encore `À traiter` peuvent être ajoutées ou retirées ;
- les unités dans un autre état ou archivées comptent comme réalisées ;
- un nouveau besoin crée de nouvelles unités `À traiter` ;
- un besoin disparu conserve ses unités engagées avec `ancien_besoin` ;
- un besoin réduit sous le nombre déjà engagé crée `surplus`.

Les alertes sont persistantes et dédupliquées par unité et par code. Quand une
modification crée ou maintient un écart, la réponse de commande ajoute
`workflow_avertissements`, agrégé par matériau, sans identité cliente/commande.

Lors d’un `DELETE`, les unités `À traiter` sont supprimées. Les unités engagées
ou archivées restent présentes, perdent leur relation à la commande grâce à la
clé étrangère `ON DELETE SET NULL` et reçoivent `commande_supprimee`. Dans ce
cas la réponse est `200` avec `{ "supprimee": true,
"workflow_avertissements": [...] }`. Sans avertissement, le `204` historique
est conservé. Les interdictions sur les commandes réglées restent inchangées.
