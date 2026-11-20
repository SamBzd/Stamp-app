# Workflow opérationnel des fournitures — issue #30

Ce contrat prépare le futur Kanban sans construire son interface. Il ne reprend
aucune commande existante lors de la migration `0004_workflow_fournitures.sql`.
Une nouvelle commande kit crée immédiatement une ligne persistante par unité
physique. Une ancienne commande kit est initialisée seulement à son premier
`PUT`; une lecture, un règlement ou une suppression ne déclenche aucun backfill.

## Identité et états

Depuis #45 (migration v5), les types publics sont `papier_collection`,
`papier_cartonne`, `ruban`, `papier_special` et `embellissement`.
Le type `papier_collection` désigne désormais la feuille au nom de la collection ;
les anciennes unités de ce type deviennent `papier_cartonne` à la migration.
L’identité matérielle est le triplet exact `{type, nom, format_type}` : les
majuscules, accents et espaces internes sont significatifs. Les groupes publics
additionnent donc les unités de commandes, collections ou catalogues différents
dès que ce triplet et l’état sont identiques. `format_type` est obligatoire
et vaut A, B ou C pour un papier de collection ; il est `null` pour les autres
types. Les papiers cartonnés gardent leur regroupement historique par nom,
sans format. Le détail est dans [la règle et la migration #45](papiers-collection.md).

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
    { "type": "ruban", "nom": "Lin naturel", "format_type": null, "etat": "Commandé", "quantite": 2 }
  ],
  "alertes": [
    {
      "type": "ruban", "nom": "Lin naturel", "format_type": null, "code": "surplus",
      "message": "Des unités déjà engagées dépassent le besoin actuel.",
      "quantite": 1, "creee_le": "2026-09-30 10:00:00"
    }
  ]
}
```

Aucun objet ne contient d’identifiant d’unité, de commande ou de cliente.

`PATCH /api/fournitures/deplacement` accepte exclusivement `type`, `nom`,
`format_type`, `etat_source`, `etat_cible` et `quantite`. La quantité doit être un entier
strictement positif disponible en totalité dans le groupe source. La réponse
reprend la mutation appliquée.

`POST /api/fournitures/archivage` accepte exclusivement `type`, `nom`,
`format_type` et `quantite`. Pour les deux mutations, `format_type` est requis
pour un papier de collection, omis ou `null` pour les autres types. Seules les unités `Traité` peuvent être archivées. Elles disparaissent
alors définitivement de `groupes`, mais continuent à compter comme besoin déjà
réalisé lors des synchronisations suivantes et ne sont jamais régénérées.

Les corps ou enums invalides produisent `400`; une quantité indisponible produit
`409`; une erreur SQL inattendue reste masquée derrière le `500` API commun.
Toute mutation est atomique.

## Interface Kanban — issue #31

La route `/stocks` présente le workflow sous forme de cinq colonnes toujours
ordonnées : À traiter, Commandé, Disponible, Expédié et Traité. Une carte ne
montre que le type, le nom, le format éventuel et la quantité agrégée de la fourniture. Le
glisser-déposer ouvre un sélecteur de quantité. Pour les cartes hors « Traité »,
un clic ou les touches Entrée/Espace ouvrent aussi le choix de destination et
de quantité ; aucune mutation optimiste ne masque un refus du serveur.

Sur petit écran, les colonnes passent à la verticale dans le même ordre. Les
alertes anonymes du workflow sont affichées au-dessus du tableau. Dans Traité,
« Terminer » archive toute la pile après confirmation. Le bilan mensuel reste
disponible dans un second onglet de la même route.

### Présentation atelier — premier jalon UI #39

Le socle local utilise le bandeau prune, le fond citron, les colonnes blanches
à en-tête prune et compteurs jaunes. Les cinq colonnes restent côte à côte
au-dessus de 900 px CSS ; le repli passe ensuite à deux colonnes, puis à une
jusqu’à 640 px. Les noms longs restent complets. Les cartes et le dock utilisent
une couche de verre derrière le texte, avec repli blanc sans filtre ou en
transparence réduite. Le dock reste dans le flux après le contenu et conserve
les routes métier. Les états, API et règles de déplacement ne changent pas.

Cette réalisation attend la validation visuelle de Sam sur son Mac ; voir
[les captures comparables, écarts et limites](ui/recette-jalon1/README.md).

## Synchronisation avec les commandes

La synchronisation est interne aux transactions `POST`, `PUT` et `DELETE` des
commandes. Les papiers cartonnés reprennent la quantité de composition, doublée par
`papier_supplementaire`. Les kits créés avec v5 ajoutent une feuille de collection
par collection, au format du kit, jamais doublée. Les kits antérieurs restent
sans feuille de collection, même lors de leur premier `PUT` après migration ; ruban, papier spécial et embellissement valent une
unité lorsqu’ils sont présents.

Lors d’un `PUT`, le besoin est réconcilié par triplet exact `{type, nom, format_type}` :

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
