# Livraison NAS — 14 octobre 2026

## Version et résultat

Le commit applicatif `6cc981766bdff0a298812508ff3974c9bfef0cef` a été livré
sur NAS le 14 octobre 2026. Sam a autorisé la bascule, effectué les opérations
sous guidage, validé la nouvelle application et confirmé la fermeture de SSH.
Les PR documentaires ultérieures ne changent pas les images livrées.

La production utilise des images figées et une base neuve dans un dossier
persistant distinct. Les deux services sont sains et le frontend atteint l’API.
Seules les clientes ont été reprises, avec points zéro et dernière commande
vide ; aucun ancien catalogue, commande, matériel, stock ou bilan n’est importé.
Les données finales, l’absence des fixtures de test et les paramètres ont été
validés par Sam avant autorisation de reprendre les saisies.

L’inventaire NAS, les chemins et identifiants précis d’images, empreintes,
rapports d’import et commandes de terrain restent exclusivement dans la note
locale ignorée par Git. Ce compte rendu ne publie aucun contenu client.

## Preuves et limites

| Étape | Résultat |
| --- | --- |
| Validation du code | 99 tests backend, 72 frontend, build Vue et Docker Compose passent ; [CI du commit livré](https://github.com/SamBzd/Stamp-app/actions/runs/38422337417) réussie |
| Collecte NAS | Versions, architecture, montages, droits, images et contexte de lancement relevés |
| Restauration | Sauvegarde Hyper Backup extraite dans un dossier séparé, contrôle SQLite, anciennes images démarrées sur copie, données reconnues par Sam |
| Images nouvelles | Construction depuis une archive du commit retenu, empreinte identique avant/après transfert, exécution sur NAS vérifiée |
| Import de recette | Source en lecture seule, cible neuve contrôlée ; copie d’exécution distincte de la cible intacte |
| Recette métier NAS | Cliente fictive, catalogue publié, kit C, hors-kit, règlement, fournitures, bilan et persistance après redémarrage validés |
| Sauvegarde finale | Écrivains connus arrêtés ; copie autonome SQLite, intégrité et clés étrangères contrôlées, empreinte relevée et protection Hyper Backup confirmée |
| Import final | Source actualisée, précontrôle puis import exclusif des clientes ; intégrité, relations, réinitialisation et tables métier vides contrôlées sous l’utilisateur du backend |
| Bascule | Nouveau backend puis frontend, services sains, sondes HTTP, données et paramètres confirmés par Sam |
| Sauvegarde nouvelle base | Nouveau dossier ajouté à Hyper Backup, sauvegarde réussie et présence de la base confirmées |
| Fin d’intervention | Tests retirés, production saine, anciens conteneurs arrêtés, SSH désactivé |

La recette NAS est ciblée et confirmée manuellement par Sam ; elle n’est pas
une couverture exhaustive. Les archives UI conservent leurs limites : Safari
non testé/non bloquant, certains critères de contraste et de zoom/clavier Zen
non démontrés séparément. La sauvegarde Hyper Backup de la nouvelle base est
présente ; une seconde restauration de cette base finale n’a pas été testée.

L’ancien backend a quitté avec code 1. Un essai Docker local antérieur avait
quitté avec code 137. Aucun arrêt gracieux n’est revendiqué : la copie finale
a été produite par SQLite après arrêt des écrivains, puis contrôlée. Le succès
d’une sauvegarde de fichiers active ne prouve pas à lui seul la cohérence d’un
ensemble SQLite/WAL ; voir [l’exploitation](operations.md#sauvegarde-et-restauration).

## Recette synthétique exécutée sur NAS

Toutes les mutations de recette ont eu lieu sur une copie jetable :

- kit C avec un papier, cinq feuilles, prix 10 euros ;
- cinq feuilles et un spécial dans les fournitures ; déplacement de deux feuilles,
  répartition trois à commander / deux commandées ;
- bilan zéro avant règlement du kit, puis 10 euros ; actions de modification
  et suppression non proposées une fois réglé ;
- hors-kit de 80 euros : bilan inchangé avant règlement, puis 90 euros ;
- après redémarrage : deux commandes réglées, bilan 90 euros, fournitures trois/deux
  et un point de fidélité conservés.

Ces fixtures n’ont pas été utilisées pour la production.

## Ménage et retour arrière

Les conteneurs, volumes et réseaux de test, dossiers de travail et archive de
transfert NAS ont été retirés. Un volume vide et une image inutilisée ont aussi
été supprimés après contrôle ; aucun nettoyage Docker global n’a été exécuté.
Les couches encore utilisées restent conservées par Docker.

L’ancien code, ses images et conteneurs arrêtés, sa base et la sauvegarde finale
restent disponibles pour le retour arrière. Leur retrait exige une décision
après validation en usage réel. Après reprise des saisies, arrêter et sauvegarder
la nouvelle base avant tout retour, puis décider du traitement des nouvelles
données ; aucune restauration descendante automatique.

Le DNS local souhaité pour la cliente est reporté. L’accès local existant est
conservé. La clôture du suivi #13 reste à traiter dans GitHub après review.

Pour une prochaine livraison : [exploitation](operations.md),
[checklist](release-checklist.md), [contrat d’import](schema-import-clients.md).
