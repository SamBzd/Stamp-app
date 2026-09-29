# API catalogues, sources, tarifs et archivage — issues #6 et #28

Cette API vise la future version, pas le NAS actuellement déployé. La migration
`0003_papiers_library.sql` ajoute l’archivage de la bibliothèque et l’unicité
normalisée des noms. Les parcours Vue sont intégrés en [#8 et #28](catalogue-ui.md)
et [#9](commandes-ui.md). Le backend compositions kit et règlement est
livré en #7 : voir [le contrat commandes](commandes-kit-api.md).

## Champs et conventions

Les montants JSON sont uniquement des nombres entiers en **centimes**, entre
0 et 10000 inclus. Le même contrat `prix_A_cents`, `prix_B_cents`,
`prix_C_cents` est utilisé pour les paramètres et catalogues. Les anciens champs
en euros `prix_A`, `prix_B`, `prix_C`, ainsi que les nombres envoyés en chaînes,
sont refusés. SQLite conserve les paramètres sous les clés internes
`prix_catalogue_A_cents`, `prix_catalogue_B_cents`, `prix_catalogue_C_cents`.

Les titres et noms sont des chaînes non vides après suppression des espaces
aux extrémités. Le titre est libre et unique, sans obligation de date. Les noms
de papier sont uniques dans la bibliothèque après retrait des espaces externes
et sans distinction de casse. `papier_spe` et `embellissement`
sont des chaînes ou `null` ; une chaîne blanche devient `null`.
Les IDs sont des entiers strictement positifs ; les IDs d’association JSON sont
des nombres, pas des chaînes. Les champs non autorisés sont refusés pour les
mutations de sources, les paramètres et les endpoints d’archivage.
Les champs clientes préexistants conservent leur contrat.

Les réponses catalogue (liste et détail) contiennent les champs SQL : `id`,
`titre`, `papier_spe`, `embellissement`, `statut`, `archive`, les trois tarifs,
`created_at`, `updated_at`, et les structures :

- `collections`: objets `id`, `catalogue_id`, `nom`, `ordre`, `created_at`,
  `papiers` (objets `id`, `nom`, `archive`, `ordre`).
- `rubans`: objets `id`, `catalogue_id`, `nom`, `ordre`.
- `formats_disponibles`: `[]` pour brouillon/archivé, `["C"]` pour un publié
  avec une collection, `["A","B","C"]` à partir de deux collections.

`archive` est retourné comme `0` ou `1` (comme les autres indicateurs SQLite) ;
le corps de l’endpoint d’archivage exige toutefois un booléen JSON.

## Endpoints

| Méthode et chemin | Corps / comportement |
| --- | --- |
| `GET /api/settings` | Retourne les trois tarifs par défaut en centimes. |
| `PUT /api/settings` | Un ou plusieurs des trois tarifs ; mise à jour atomique, sans effet sur les catalogues existants. |
| `GET /api/catalogues` | Liste détaillée, exclut les archivés par défaut. |
| `GET /api/catalogues/:id` | Détail consultable même archivé. |
| `POST /api/catalogues` | `{ titre, papier_spe?, embellissement? }` ; `201`, brouillon, copie atomique des trois tarifs par défaut. Aucun tarif ni statut ne peut être imposé à la création. |
| `PUT /api/catalogues/:id` | Mise à jour partielle de titre, matériaux et/ou tarifs propres ; retourne le catalogue et son statut recalculé. Les tarifs fournis ne peuvent pas être `null`. |
| `POST /api/catalogues/:id/publication` | Corps absent ou `{}` ; valide puis publie, retourne le catalogue. |
| `POST /api/catalogues/:id/collections` | `{ nom }` ; `201`, collection nommée avec ordre automatique, maximum 4. |
| `PUT /api/catalogues/collections/:id` | `{ nom }` ; retourne la collection. |
| `PUT /api/catalogues/collections/:id/papiers` | `{ papier_ids: [id, ...] }` ; remplace atomiquement les associations ordonnées ; maximum 5 IDs distincts existants ; tableau vide autorisé en brouillon. Un papier archivé déjà associé peut être conservé, mais ne peut pas être ajouté à une autre collection. Retourne `{ success: true, catalogue }`. |
| `GET /api/collections` / `GET /api/collections/:id` | Lecture des collections (sans papiers imbriqués). |
| `POST /api/collections` | Alias de création : `{ catalogue_id, nom }`, catalogue obligatoire ; `201`. |
| `PUT /api/collections/:id` | Alias d’édition de nom, même validation transactionnelle. |
| `PUT /api/collections/:id/papiers` | Alias de remplacement des associations, même réponse et transaction. |
| `GET /api/papiers-cartonnes?search=...` | Recherche les papiers actifs (20 résultats avec recherche, 100 sans recherche). `include_archives=true` inclut les archivés et, sans recherche, retourne toute la bibliothèque pour l’écran de gestion. |
| `POST /api/papiers-cartonnes` | `{ nom }` ; `201`, crée un papier réutilisable par association. |
| `PUT /api/papiers-cartonnes/:id` | `{ nom }` ; renomme sans réécrire les snapshots et revalide les catalogues associés. |
| `PATCH /api/papiers-cartonnes/:id/archivage` | Exactement `{ archive: boolean }`. L’archivage est refusé si le papier appartient à un catalogue publié. |
| `POST /api/catalogues/:id/rubans` | `{ nom }` ; `201`, ruban propre au catalogue, ordre automatique, maximum 2. |
| `PUT /api/catalogues/rubans/:id` | `{ nom }` ; retourne le ruban renommé. |
| `PATCH /api/catalogues/:id/archivage` | Exactement `{ archive: boolean }`, retourne le catalogue. |
| `PATCH /api/clients/:id/archivage` | Exactement `{ archive: boolean }`, retourne la cliente. |

`GET /api/clients` exclut aussi les archivées par défaut.
`?include_archives=true` sur les listes clientes/catalogues inclut les archivés.
`?utilisables=true` sur la liste catalogues ne conserve que les publiés actifs.
Les paramètres booléens acceptent seulement `true` ou `false`.
Les détails et les commandes historiques des clientes restent consultables.

## Publication, démotion et conservation

La publication exige au moins un matériau, 1 à 4 collections nommées,
1 à 5 papiers différents par collection, les trois tarifs définis et au plus
2 rubans nommés. Un brouillon devenu complet reste brouillon jusqu’à publication
explicite. Toute mutation catalogue, collection, association, ruban ou papier
associé utilise la même fonction transactionnelle de validation. Un publié
devenu incomplet est rétrogradé dans la transaction ; un dépassement maximal
annule toute l’opération et conserve son statut précédent.

L’archivage ne supprime aucune donnée ni association. Archiver un catalogue
le remet en brouillon ; le restaurer ne le republie pas. Une nouvelle publication
est nécessaire. L’archivage est idempotent. Un papier archivé disparaît des
nouvelles sélections mais reste visible dans les collections existantes et les
snapshots de commande ; il peut être restauré. L’archivage d’un papier utilisé
par un catalogue publié est refusé. Les rubans et collections ne sont pas
supprimables, et aucune source ne peut être effacée. Les tarifs et sources
modifiés ne réécrivent aucun prix ni snapshot de commande.

Une nouvelle commande, kit ou hors kit, pour une cliente archivée est refusée
avant insertion et avant toute mise à jour de fidélité/date. Un catalogue
brouillon ou archivé ne peut pas servir à créer un kit ; le parcours #7 vérifie
également sa composition dans la transaction de commande.

## Erreurs

Les erreurs métier ont la forme JSON `{ error: "message" }`.

- `400` : objet/corps, champ, ID, nom, matériau ou tarif invalide ; paramètres
  inconnus dans un corps source ; papiers répétés ; cardinalité maximale
  dépassée ; publication d’un catalogue incomplet.
- `404` : catalogue, collection, ruban, papier ou cliente inexistant.
- `409` : titre catalogue ou nom papier normalisé déjà utilisé ; archivage d’un
  papier utilisé par un catalogue publié ; ajout d’un papier archivé à une
  nouvelle collection ; publication d’un catalogue archivé ; nouvelle commande
  pour une cliente archivée ou création kit à partir d’un catalogue indisponible.
- `405` : les chemins `DELETE` des clientes/catalogues/collections/papiers/rubans
  refusent toute suppression, y compris pour une source non référencée.
- `500` : erreur interne inattendue, sans détails SQL dans la réponse.

Les paramètres et remplacements d’associations sont atomiques : une valeur
invalide ou une référence absente ne laisse pas de mise à jour partielle.
