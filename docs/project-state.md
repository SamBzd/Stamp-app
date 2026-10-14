# État du projet

## Production et sources de vérité

Stamp App est utilisée par une seule personne sur Mac, dans Chrome, et hébergée
avec Docker sur un NAS Synology. La cliente y accède sur son réseau local.

La version stabilisée a été livrée le **14 octobre 2026**, depuis le commit
applicatif `6cc981766bdff0a298812508ff3974c9bfef0cef`. Sam a exécuté les
opérations, validé les données et paramètres, puis confirmé les services sains,
la sauvegarde de la nouvelle base et la fermeture de SSH.

| Référence | Rôle |
| --- | --- |
| Commit applicatif `6cc9817` | Code des images effectivement livrées |
| `main` | Base de développement ; un merge ne constitue pas un déploiement |
| Branche `production` | Ancienne application conservée pour le retour arrière |
| Archive de `v2` | Historique de la refonte, sans développement actif |
| `db/dev.db` | Données locales de développement, ignorées par Git |
| Copies SQLite locales | Ne prouvent ni les données ni le montage NAS actuels |

Le code et `db/schema.sql` de la référence examinée font autorité technique.
L’état réel des données et de la configuration NAS exige des preuves de terrain.
L’inventaire, les chemins, identifiants d’images et commandes spécifiques au NAS
restent dans des notes locales exclues de Git ; aucun secret ou contenu client
ne doit être publié.

## Périmètre livré

- Clientes : coordonnées, préférences, historique, archivage et restauration.
- Catalogues : brouillon/publication, compositions, tarifs locaux et paramètres.
- Bibliothèque de papiers : création, réutilisation, renommage et archivage protégé.
- Commandes kits et hors kit : création, édition non réglée, règlement et historique.
- Fournitures : besoins persistants, déplacements partiels et alertes anonymes.
- Bilan : montants réglés historiques, exposés en centimes par l’API.
- Interface atelier : listes et panneaux intégrés, calendriers, clavier et zoom
  Chromium ; les limites de recette restent documentées, Safari non bloquant.

Seules les clientes ont été reprises vers une base neuve : points à zéro,
dernière commande vide, aucun catalogue, commande, fourniture, stock ou bilan
historique importé. Les paramètres de la cible neuve ont été validés par Sam.
Voir [le compte rendu de livraison](livraison-nas.md).

## Suivi après livraison

- DNS local reporté jusqu’à accès au poste ou identification du routeur cible.
- Retrait de l’ancienne application à décider après validation en usage réel.
  Après nouvelles saisies, un retour arrière exige leur préservation.
- Clôture du suivi GitHub à décider lors de la review documentaire.
- Nettoyage des modules hérités et évolution de la fidélité : chantiers distincts,
  à qualifier et autoriser, sans extension automatique du périmètre livré.

La [chronologie de stabilisation](archive/chronologie-stabilisation.md) et les
[recettes UI datées](ui/README.md) gardent la trace des décisions et essais.
Elles ne constituent pas une liste de travaux encore ouverts.
