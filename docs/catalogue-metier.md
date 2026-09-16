# Catalogues et commandes kits — règles validées

## Statut et périmètre

Règles confirmées avec Sam le 16 septembre 2026 à la suite de son échange avec
la cliente. Elles définissent le fonctionnement à implémenter dans `main` ;
elles ne décrivent ni une implémentation terminée ni l'état du NAS.

Le périmètre couvre les catalogues, collections, commandes kits, quantités à
préparer et prix historiques. La création des clientes ne change pas. Les
commandes hors kit et les règles de fidélité ne sont pas redéfinies ici.

## Catalogue

- Le nom est libre : aucune obligation de mois ou d'année.
- Le catalogue contient un papier spécial, un embellissement ou les deux.
  Au moins un des deux doit être renseigné pour être utilisable en commande.
- Il contient de 1 à 4 collections nommées.
- Chaque collection contient de 1 à 5 papiers différents. Un papier peut être
  créé ou repris dans la bibliothèque globale existante.
- Le catalogue contient de 0 à 2 rubans nommés, propres au catalogue : aucune
  bibliothèque de rubans n'est prévue.
- Les prix indicatifs des formats A, B et C sont définis par catalogue.

Un catalogue peut être enregistré comme brouillon incomplet. Un brouillon ne
peut jamais être utilisé pour créer une commande. Sa mise à disposition exige
la validation de sa composition et la définition de ses trois prix.

Un catalogue avec une seule collection respecte le minimum du catalogue, mais
ne permet que le format C : A et B nécessitent deux collections distinctes.

## Création d'une commande kit

Le parcours est : cliente, catalogue utilisable, format, collections,
composition en papiers, ruban éventuel et option papier supplémentaire.

### Formats A et B

- Deux collections distinctes du même catalogue sont obligatoires.
- L'une fournit exactement 2 feuilles et l'autre exactement 3.
- Choisir 2 ou 3 pour une collection affecte automatiquement la valeur
  complémentaire à l'autre : ni 2 + 2 ni 3 + 3 ne sont possibles.
- Pour chaque collection, l'utilisateur choisit les papiers et leurs quantités
  parmi les papiers de cette collection. Les répétitions sont autorisées, y
  compris 2 ou 3 exemplaires du même papier.
- Le total par collection doit correspondre à sa contribution ; le total du
  kit est toujours de 5 feuilles avant l'option supplémentaire.

### Format C

- Une seule collection est utilisée, pour exactement 5 feuilles.
- Un exemplaire de chaque papier de la collection est proposé automatiquement.
- Avec 5 papiers différents, la composition est automatiquement complète.
- Avec moins de 5 papiers, l'utilisateur répartit les exemplaires manquants
  jusqu'à atteindre 5 feuilles, en conservant au moins un exemplaire de chaque
  papier. Les répétitions ne sont pas limitées à deux exemplaires : avec un
  seul papier, la commande en prend 5.

### Ruban et option supplémentaire

- Sans ruban dans le catalogue, aucun ruban n'est requis.
- Avec un ruban, il est inclus automatiquement dans la commande.
- Avec deux rubans, l'utilisateur doit en choisir exactement un.
- Les rubans doivent être comptés dans les quantités à préparer depuis les
  commandes.
- L'option papier supplémentaire coûte 3,50 € et double la quantité de chaque
  papier de la composition : 5 feuilles deviennent 10. Elle ne double pas le
  ruban ; la commande en contient toujours un unique lorsqu'il est requis.

## Commande comme source de vérité

La commande conserve le prix réellement appliqué et sa composition lors de sa
création : papiers et quantités, répartition entre collections, ruban choisi,
papier spécial et embellissement présents, ainsi que les informations de
désignation nécessaires à sa consultation historique.

Les prix du catalogue servent de référence à la création, mais le prix conservé
dans la commande est la source de vérité. Changer les tarifs du catalogue ne
doit pas modifier une commande passée ni son montant dans le bilan.

Les stocks sont calculés depuis les compositions enregistrées dans les
commandes. Renommer ou modifier un papier, une collection, les rubans ou les
éléments d'un catalogue ne doit pas réécrire une ancienne composition ni
changer les quantités à préparer de cette commande. Les calculs ne doivent donc
pas reconstruire l'historique depuis la composition courante du catalogue.

## Scénarios d'acceptation

Ces scénarios sont à couvrir lors de l'implémentation ; ils ne sont pas encore
des tests exécutables ou une validation du code actuel.

| Cas | Résultat attendu |
|---|---|
| Catalogue nommé « Noël créatif », sans année | Nom accepté. |
| Catalogue avec seulement un papier spécial, seulement un embellissement, puis les deux | Les trois compositions sont autorisées. |
| Catalogue sans papier spécial ni embellissement | Peut rester brouillon ; ne peut pas devenir utilisable. |
| Catalogue avec 1 ou 4 collections complètes | Cardinalité autorisée. Avec 1 collection, A/B sont indisponibles. |
| Catalogue sans collection ou avec une collection sans papier | Inutilisable en commande ; préparation en brouillon possible. |
| Ajout d'une cinquième collection ou d'un sixième papier dans une collection | Limite maximale refusée. |
| Création d'un papier nommé puis réutilisation depuis la bibliothèque | Le papier existant peut être associé à une autre collection. |
| Catalogue avec 0, 1 ou 2 rubans | Cardinalités autorisées ; un troisième ruban est refusé. |
| Choix d'un catalogue brouillon dans une commande, y compris via l'API | Commande refusée. |
| A/B : deux collections distinctes ; contribution de la première passée de 2 à 3 | La seconde passe automatiquement de 3 à 2. |
| A/B : première collection, papier P ×2 ; seconde, papier Q ×3 | Commande acceptée : 5 feuilles, répétitions autorisées. |
| A/B : même collection deux fois, collections de catalogues différents, papier étranger ou total incorrect | Commande refusée côté serveur. |
| C : collection avec 5 papiers | Un exemplaire de chacun, automatiquement ; total 5. |
| C : collection avec 3 papiers | Un de chaque proposé ; ajout de 2 exemplaires répartis au choix pour atteindre 5. |
| C : collection avec 1 papier | Quantité finale 5 pour ce papier. |
| C : total différent de 5 ou omission d'un papier de la collection | Commande refusée. |
| Catalogue avec 1 ruban, puis avec 2 rubans | Un inclus automatiquement dans le premier cas ; choix obligatoire d'un seul dans le second. |
| Option supplémentaire sur P ×2 et Q ×3 | Quantités à préparer P ×4 et Q ×6 ; supplément de 3,50 € ; ruban toujours unique. |
| Deux catalogues avec des tarifs A/B/C différents | La référence tarifaire correspond au catalogue choisi. |
| Tarif d'un catalogue modifié après création d'une commande | Prix de cette commande et sa contribution au bilan inchangés. |
| Papier retiré/renommé, collection renommée, ruban ou élément du catalogue modifié après une commande | Composition consultable et quantités historiques inchangées. |

## Préparation des étapes suivantes

1. Concevoir le modèle et la migration : brouillons, prix par catalogue, rubans,
   quantités par papier et composition historique autonome des commandes.
2. Adapter les validations SQL/API, notamment cardinalités, appartenance des
   papiers, contributions par collection et exclusion des brouillons.
3. Adapter le parcours catalogue, puis les commandes A/B/C.
4. Aligner les détails de commande, les stocks et le bilan sur les données de
   commande, puis compléter les tests métier et les contrôles CI.

Avant la migration, définir la reprise des anciennes commandes : le modèle
actuel ne conserve pas leur prix d'origine ni tous les matériaux historiques.
Ne pas inventer ces informations à partir des valeurs courantes. La conversion
des données réelles du NAS reste une étape distincte, sur une copie contrôlée.

Les modalités de saisie ou de correction du prix réellement appliqué, les
bornes tarifaires et le traitement d'une modification rendant un catalogue
utilisable incomplet restent à préciser lors de la conception. Ces choix ne
sont pas implicitement autorisés par les règles ci-dessus.
