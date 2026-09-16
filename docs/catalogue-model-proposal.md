# Proposition de modèle — catalogues et commandes kits

> Ce document traduit les décisions métier de l’issue #4 en contrat technique
> proposé. Il prépare l’implémentation ; il ne modifie ni le schéma ni les
> données du NAS.

## Décisions confirmées

- La future base repart sans catalogue, collection, commande, stock ni bilan
  hérités de la production.
- Seules les clientes sont reprises. Leur `derniere_commande` devient `NULL`
  et leurs `points_fidelite` sont initialisés à `0`.
- Les prix par défaut A, B et C sont configurés dans les paramètres. Ils sont
  copiés dans chaque nouveau catalogue ; modifier les paramètres n’altère pas
  les catalogues existants.
- Une commande utilise les tarifs enregistrés dans son catalogue puis mémorise
  son prix réellement appliqué. Une commande réglée ne peut plus être modifiée.
- Modifier une commande non réglée recalcule son prix depuis les tarifs alors
  enregistrés dans son catalogue. Une correction manuelle explicite du montant
  reste possible et est mémorisée comme telle.
- Seuls les clientes et les catalogues sont archivables. Les commandes réglées
  restent conservées ; une commande non réglée peut être supprimée.
- Un catalogue utilisable qui redevient incomplet repasse automatiquement en
  brouillon et ne peut plus servir à une nouvelle commande.
- Les papiers cartonnés appartiennent à une bibliothèque globale et sont
  réutilisables dans plusieurs collections et catalogues. Aucun objet n’est
  supprimé automatiquement.

## Catalogue source

`settings` conserve uniquement les trois tarifs par défaut, en centimes :
`prix_catalogue_A_cents`, `prix_catalogue_B_cents` et
`prix_catalogue_C_cents`.

Chaque ligne `catalogues` reçoit ses propres tarifs lors de sa création. Ces
tarifs restent modifiables au niveau du catalogue ; cette modification ne
réécrit jamais les commandes déjà créées :

| Champ | Rôle |
| --- | --- |
| `statut` | `brouillon` ou `publie` |
| `prix_A_cents`, `prix_B_cents`, `prix_C_cents` | tarifs propres au catalogue |
| `papier_spe`, `embellissement` | désignations du matériel inclus |

Une table `catalogue_rubans` contient de zéro à deux rubans nommés par
catalogue. Ils ne font pas partie de la bibliothèque de papiers.

Le titre est libre. Un brouillon peut être incomplet. La publication vérifie :

- au moins un papier spécial ou un embellissement ;
- une à quatre collections ;
- une à cinq papiers différents dans chacune ;
- les trois tarifs définis, chacun étant un nombre entier de 0 à 10 000
  centimes (0 à 100 €) ;
- au plus deux rubans.

Un catalogue publié avec une seule collection ne propose que C. Avec au moins
deux collections, A, B et C sont disponibles. Un brouillon techniquement valide
reste brouillon : seul l’endpoint de publication peut le rendre disponible.
Une modification qui ne satisfait plus un minimum requis remet un catalogue
publié en brouillon dans la même transaction. L’archivage d’un catalogue le
retire des choix de nouvelle commande, sans archiver ni modifier ses
collections, ses papiers ou ses rubans.
À l’inverse, une opération qui dépasserait un maximum (cinquième collection,
sixième papier ou troisième ruban) est refusée et annulée : elle ne transforme
pas le catalogue en brouillon.

Cette vérification est appelée par la même fonction transactionnelle après toute
mutation d’un catalogue, d’une collection, de ses associations de papiers ou de
ses rubans ; elle ne dépend donc pas du seul endpoint de catalogue.

## Commande kit autonome

Une commande kit référence son catalogue pour la navigation, mais sa lecture
historique ne dépend jamais de ses données courantes. Elle conserve :

- les identifiants source du catalogue, des collections, des papiers et du
  ruban, ainsi que leurs désignations figées ;
- le format, le prix de format en centimes, le prix de l’option et le prix
  réellement appliqué ;
- le choix de l’option et son effet sur les quantités ;
- les collections retenues, leur nom figé et leur contribution (2, 3 ou 5) ;
- chaque papier choisi, son identifiant de bibliothèque lorsqu’il existe, son
  nom figé et sa quantité de base ;
- le papier spécial, l’embellissement et le ruban retenu, avec leurs noms
  figés et leur quantité.

La table de composition papier doit être rattachée à la **ligne de collection
de commande**, et non directement à la commande. Chaque ligne de collection et
chaque ligne de ruban conservent aussi leur identifiant source. Elle contient
une quantité strictement positive. Cette structure autorise le même papier de
bibliothèque dans deux collections et préserve sa répartition 2/3. Les stocks
additionnent ensuite les quantités de ces lignes, multipliées par deux seulement
lorsque l’option est choisie.

Les sources catalogue, collection, papier et ruban ne sont pas supprimables par
l’application : leurs références restent donc non nulles et protégées par
`ON DELETE RESTRICT`. Les snapshots conservent malgré tout leurs désignations,
afin que leur consultation reste autonome.

Une commande A/B a exactement deux lignes de collection distinctes du catalogue
soumis, de contributions 2 et 3. Une commande C en a une du catalogue soumis,
de contribution 5. Le ruban retenu appartient aussi à ce catalogue. Les
validations vérifient également que chaque papier appartient à la collection
indiquée et que le total des quantités correspond à sa contribution. Pour le
format C, chaque papier distinct de la collection doit en outre apparaître au
moins une fois dans la composition : il est impossible de commander cinq fois
un seul papier d’une collection qui en contient plusieurs.

Le serveur applique aussi la cardinalité de rubans du catalogue : avec zéro
ruban, aucun ruban n’est accepté ; avec un ruban, il l’ajoute
automatiquement ; avec deux rubans, la requête doit en choisir exactement un.

La création doit refuser un catalogue brouillon. La modification complète de
la composition est autorisée uniquement tant que `reglee = 0`; le passage à
`reglee = 1` fige la commande.

## Conservation, archivage et suppression

Seules les clientes et les catalogues sont archivables. L’archivage les retire
des choix destinés aux nouvelles créations, sans effacer leurs données ni
réécrire une commande existante. Les collections, rubans et papiers restent
actifs dans leur catalogue ou leur bibliothèque ; ils ne sont ni archivables ni
supprimables par l’application.

Une cliente archivée et un catalogue archivé restent consultables. Une cliente
archivée ne peut plus recevoir de nouvelle commande, et un catalogue archivé ne
peut plus servir à en créer une. Les relations ne doivent donc pas utiliser de
suppression en cascade pour les clientes et les commandes.

Une commande réglée est immuable et non supprimable. Une commande non réglée
peut être supprimée physiquement avec toute sa composition : elle disparaît des
listes et des stocks. Elle ne contribue jamais au bilan, qui ne retient que les
commandes réglées.

## Import clientes vers le NAS

La bascule suit cette procédure, hors de l’application :

1. arrêter l’application et réaliser une sauvegarde vérifiable de la base NAS ;
2. extraire les clientes candidates dans une zone temporaire et contrôler les
   doublons d’email normalisé avant toute écriture dans la nouvelle base ;
3. créer la nouvelle base avec le schéma cible, puis importer dans une unique
   transaction uniquement les champs autorisés : identité, coordonnées,
   préférences de contact et date de création ;
4. fixer `derniere_commande` à `NULL` et `points_fidelite` à `0` ;
5. annuler entièrement l’import si un contrôle ou une insertion échoue ;
6. vérifier le nombre de clientes importées et un échantillon de coordonnées ;
7. démarrer la nouvelle version uniquement après validation du rapport ;
8. en cas d’échec, restaurer la sauvegarde plutôt que modifier manuellement la
   base importée.

La structure exacte de la base NAS et le chemin du fichier sont à contrôler au
moment de la bascule ; ils ne se déduisent pas de `main`.

## Contrat API cible

- `GET /api/settings` et `PUT /api/settings` exposent les tarifs par défaut,
  sans réécrire les catalogues existants. Chaque tarif est un entier entre 0 et
  10 000 centimes.
- `POST /api/catalogues` crée un brouillon et copie les trois tarifs par défaut.
- `PUT /api/catalogues/:id` modifie le brouillon ou un catalogue publié ; la
  réponse inclut son statut recalculé. Les tarifs sont validés dans la même
  plage avant enregistrement.
- `POST /api/catalogues/:id/publication` publie uniquement un catalogue valide.
- Les mutations de collections, de leurs papiers et des rubans passent toutes
  par la fonction transactionnelle qui recalcule le statut du catalogue.
- Les opérations qui dépassent une cardinalité maximale répondent `400` et
  annulent la mutation ; elles ne modifient pas le statut du catalogue.
- `PATCH /api/clients/:id/archivage` et `PATCH /api/catalogues/:id/archivage`
  archivent ou restaurent ces seules ressources, sans effacement physique.
- `DELETE /api/commandes/:id` supprime une commande non réglée et sa
  composition ; il répond `409` pour une commande réglée. Les clientes,
  catalogues, collections, papiers et rubans ne disposent pas d’endpoint de
  suppression métier.
- `POST /api/commandes` conserve le contrat existant pour `type = hors_kit`.
  Pour `type = kit`, il reçoit un `catalogue_id`, le format et la composition.
  Le serveur vérifie que toutes les collections et le ruban choisi appartiennent
  à ce catalogue, reconstruit et valide les snapshots dans une transaction,
  puis calcule le prix appliqué depuis les tarifs du catalogue, l’option et les
  suppléments. Un `prix_applique_cents` optionnel autorise une correction
  manuelle explicite ; le serveur le valide comme montant entier positif ou
  nul et mémorise que son origine est manuelle.
- `PUT /api/commandes/:id` remplace de façon atomique la composition d’une
  commande kit non réglée ; il recalcule le prix depuis le catalogue, sauf si
  la requête porte une correction manuelle explicite. Toute commande réglée,
  kit ou hors-kit, répond `409` à une modification. Les champs métier des
  commandes hors-kit restent par ailleurs inchangés.
- `PATCH /api/commandes/:id/reglement` fait uniquement passer une commande non
  réglée, kit ou hors-kit, à l’état réglé. Il ne remplace pas sa composition et
  ne recalcule ni son prix ni ses snapshots. La propriété `reglee` n’est pas
  modifiable par l’endpoint général `PUT`.

Les noms de champs définitifs seront arrêtés avec le schéma SQL afin que les
routes, le service API Vue et les tests utilisent le même contrat.

## Suppléments de kit

Les champs existants `produit_promo` et `autres` sont conservés pour les kits.
Chaque supplément mémorise son libellé et son prix en centimes. Le prix calculé
d’un kit est la somme du tarif de format, de l’option papier et de ces
suppléments ; le bilan conserve leurs catégories et montants. Une correction
manuelle explicite de `prix_applique_cents` remplace ce total calculé, sans
effacer les lignes de supplément qui expliquent la commande.

Pour chaque catégorie, libellé et prix sont indissociables : ils sont tous deux
absents, ou le libellé est non vide et le prix est un entier positif ou nul en
centimes. Ces validations sont appliquées par `POST` et `PUT` avant le calcul
du prix et l’écriture de la commande.

## Matrice de recette à transformer en tests API

| Scénario validé | Couche de test prévue |
| --- | --- |
| Nom libre de catalogue | API catalogue : création acceptée |
| Papier spécial, embellissement, ou les deux | API catalogue : publication acceptée |
| Aucun des deux matériaux | API catalogue : publication refusée |
| Une ou quatre collections ; une collection limite A/B | API catalogue : formats disponibles |
| Catalogue ou collection sans papier | API catalogue/commande : brouillon et refus de commande |
| Cinquième collection ou sixième papier | API catalogue : limites refusées |
| Papier créé puis réutilisé | API papiers/catalogue : association acceptée |
| Zéro, un ou deux rubans ; troisième refusé | API catalogue : cardinalité et choix |
| Catalogue brouillon utilisé en commande | API commande : refus serveur |
| A/B : bascule automatique 2/3 | UI et API commande |
| A/B : répétitions P ×2 et Q ×3 | API commande et stock |
| A/B : collections ou papiers invalides | API commande : refus serveur |
| C avec cinq papiers | API commande : composition automatique |
| C avec trois papiers | UI et API commande : répartition valide |
| C avec un papier | API commande : quantité 5 acceptée |
| C total incorrect ou papier omis | API commande : refus serveur |
| Un ou deux rubans | API commande : inclusion ou choix obligatoire |
| Option sur P ×2 et Q ×3 | API commande et stock : P ×4, Q ×6, ruban ×1 |
| Tarifs propres à deux catalogues | API catalogue/commande : prix copié et appliqué |
| Paramètres modifiés après création d’un catalogue | API paramètres/catalogue/commande : ancien tarif préservé |
| Source renommée ou modifiée après commande | API commande, stock et détail : snapshot inchangé |
| Brouillon devenu valide | API catalogue : reste brouillon jusqu’à publication explicite |
| Cliente ou catalogue archivé | API : choix exclu des nouvelles commandes, données conservées |
| Commande non réglée supprimée | API et stock : composition supprimée, quantités retirées |
| Commande réglée supprimée | API : refus `409`, historique et bilan inchangés |
| Supplément promo ou autre | API commande et bilan : montant inclus et catégorie conservée |
| C avec papier de collection omis | API commande : refus serveur |
| Supplément sans libellé, prix négatif ou décimal | API commande : refus serveur |
| Hors-kit réglée modifiée | API : refus `409`, règlement uniquement par endpoint dédié |
