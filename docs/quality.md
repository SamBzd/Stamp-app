# Qualité et validation

## Contrôles automatiques

Depuis la racine :

```bash
npm run check
npm run check:docker
```

Le premier vérifie la syntaxe backend, les tests Node backend et frontend,
puis le build Vue. Les tests utilisent des fixtures ou bases temporaires, pas
la base active du NAS. Le second valide le Compose générique sans le démarrer.

La CI [.github/workflows/ci.yml](../.github/workflows/ci.yml) installe les trois
espaces npm avec `npm ci`, utilise `.nvmrc` et exécute ces deux commandes sur
les PR vers `main` et les push sur `main`. Il n’y a pas de linter dédié.
Au commit applicatif livré `6cc9817`, 99 tests backend et 72 frontend passent ;
ce nombre est une preuve datée, pas un seuil figé pour les développements futurs.

## Couverture

| Domaine | Vérifications |
| --- | --- |
| Schéma/import | Schéma neuf, migrations, refus d’ancienne donnée métier, import atomique, source préservée, conversion facultative explicite, répétition CLI |
| Catalogues | Tarifs en centimes, minima/maxima, publication/démotion, archivage et invariance historique |
| Kits/hors-kit | Compositions A/B/C, répétitions, rubans, suppléments et option, prix manuel, rollback, règlement, immutabilité et suppression |
| Fournitures/bilan | Provenances, homonymes, besoins persistants, déplacements, alertes, prix historiques et réponses asynchrones |
| Interface | Conversions, règles de formulaire, parcours, protections des saisies, composants et gestion du focus |

La [matrice métier](recette-metier.md) relie les scénarios aux tests. Les
[recettes UI datées](ui/README.md) complètent les assertions de logique par
les interactions navigateur ; elles ne doivent pas être confondues avec la CI.

## Recettes et limites

Sam a validé les jalons UI puis, sur NAS, une restauration de l’ancienne
application et une recette ciblée de la nouvelle version. La bascule finale,
les données/paramètres et la présence de la nouvelle base dans Hyper Backup
sont confirmées : [livraison](livraison-nas.md).

Les vérifications Chromium incluent le zoom natif 200 %. Zen a une validation
manuelle générale ; les preuves dédiées de tous les critères de zoom/clavier,
contraste composé et repli/transparence ne sont pas exhaustives. Safari reste
non testé et non bloquant. Voir [les limites UI](ui/validation-issue39.md).

Une CI verte ne prouve ni le montage, ni l’intégrité des données NAS, ni une
restauration. Les jeux de test ne sont jamais les bases de livraison finale.
Tout changement métier doit compléter la couverture pertinente. Un nouveau
contrôle de dépendances doit produire un résultat daté avant conclusion.
