# Recette métier — issue #12

## Périmètre et état

Recette locale du contrat validé en #4, sur le socle #5 à #11 :
[21 scénarios initiaux](catalogue-metier.md#scénarios-dacceptation),
[décisions complémentaires](catalogue-model-proposal.md) et
[issue #12](https://github.com/SamBzd/Stamp-app/issues/12).
Toutes les données sont synthétiques ; les bases SQLite des tests sont
temporaires. La production NAS, l’import réel et le déploiement relèvent de #13.

Date : 18 septembre 2026. Référence de départ : `05ea8e1` sur `main`.
Les résultats automatiques portent sur les fichiers locaux de ce lot ; la CI
distante de ce lot restera à vérifier après création de sa PR.
La recette ne sera acceptée qu’après la démonstration validée par Sam.

`OK API/SQL` signifie que les assertions des tests cités ont été exécutées.
`OK logique UI` couvre les utilitaires frontend, sans prouver le câblage Vue.
Les interactions effectivement exécutées dans le navigateur sont détaillées
dans le journal UI ci-dessous. Une étape humaine en attente n’est pas un succès.

## Références des preuves automatiques

Les identifiants suivants désignent les tests par leur début de titre :

| ID | Fichier | Test |
| --- | --- | --- |
| CAT1 | [catalogue-api.test.js](../backend/test/catalogue-api.test.js) | tarifs strictement en centimes, mise à jour atomique et copie indépendante |
| CAT2 | même fichier | publication exige matériaux, collections et papiers |
| CAT3 | même fichier | maxima et associations refusées sans mutation ni démotion |
| CAT4 | même fichier | archivage strict, restauration sans publication |
| CAT5 | même fichier | IDs, références et types invalides |
| CAT6 | même fichier | mutations API et archivage préservent snapshots |
| CAT7 | même fichier | ajout d’une collection vide démote immédiatement |
| KIT1 | [commandes-kit-api.test.js](../backend/test/commandes-kit-api.test.js) | bilan historique en centimes : catalogues distincts, defaults |
| KIT2 | même fichier | A/B accepte les répétitions, les deux répartitions 2/3 |
| KIT3 | même fichier | C couvre 1 à 5 papiers |
| KIT4 | même fichier | option double les feuilles et les contributions |
| KIT5 | même fichier | papier de bibliothèque commun à deux collections |
| KIT6 | même fichier | cardinalité rubans : aucun, inclusion automatique |
| KIT7 | même fichier | compositions invalides sont refusées sans aucune écriture |
| KIT8 | même fichier | tarifs zéro et personnalisés ; prix manuel et suppléments stricts |
| KIT9 | même fichier | brouillons, catalogues archivés et clientes archivées |
| KIT10 | même fichier | PUT remplace toute la composition, recalcule les tarifs courants |
| KIT11 | même fichier | PUT permet la modification du catalogue d’origine archivé |
| KIT12 | même fichier | échec SQL après insertion ou suppression de composition |
| KIT13 | même fichier | règlement conserve les snapshots malgré les mutations source |
| KIT14 | même fichier | suppression non réglée retire toutes ses lignes et quantités |
| KIT15 | même fichier | stocks : papier partagé, homonymes et historiques |
| KIT16 | même fichier | stocks : matériaux homonymes de catalogues différents |
| KIT17 | même fichier | hors-kit conserve son contrat et sa fidélité |
| KIT18 | même fichier | coordonnées et préférences clientes préservées |
| UI1 | [commande-kit.test.js](../frontend/test/commande-kit.test.js) | A/B autorise les répétitions et bascule toujours |
| UI2 | même fichier | C propose les compositions 1 à 5 papiers |
| UI3 | même fichier | zéro, un et deux rubans |
| UI4 | même fichier | option et suppléments composent un total exact |
| UI5 | même fichier | édition utilise les sources actuelles |
| SQL1 | [catalogue-schema.test.js](../backend/test/catalogue-schema.test.js) | schéma neuf et migration v1 vers v2 correspondent exactement |
| SQL2 | même fichier | refuse toute donnée métier ancienne |
| SQL3 | même fichier | sources protégées, snapshots autonomes ; commande réglée et sa composition sont immuables |
| IMP1 | [import-clients.test.js](../backend/test/import-clients.test.js) | importe vers le schéma réel par défaut |
| IMP2 | même fichier | refuse les valeurs ambiguës et les doublons |
| IMP3 | même fichier | annule toute la cible si la seconde insertion échoue |
| IMP4 | même fichier | le précontrôle CLI exige une cible neuve ; ne modifie pas la source |
| DEMO | [prepare-recette.test.js](../backend/test/prepare-recette.test.js) | fixtures de recette : base neuve versionnée |

## Matrice des 21 scénarios initiaux

L’ordre et les numéros correspondent exactement au tableau des règles métier.

| Cas | Résultat attendu vérifié | Preuve | Résultat automatique |
| --- | --- | --- | --- |
| I01 | Nom libre « Noël créatif » sans année accepté | CAT1, DEMO | OK API |
| I02 | Spécial seul, embellissement seul ou les deux publiables | CAT2 | OK API |
| I03 | Aucun matériau : brouillon autorisé, publication refusée | CAT2 | OK API |
| I04 | 1 ou 4 collections autorisées ; 1 collection propose C seul | CAT2, CAT3 | OK API |
| I05 | Aucune collection ou collection vide : publication refusée | CAT2, CAT7 | OK API |
| I06 | 5e collection et 6e papier refusés, mutation annulée | CAT3 | OK API |
| I07 | Papier créé puis réutilisé dans la bibliothèque | CAT3, KIT5 | OK API |
| I08 | 0/1/2 rubans autorisés, 3e refusé | CAT3, KIT6 | OK API |
| I09 | Nouvelle commande sur brouillon refusée côté serveur | KIT9 | OK API |
| I10 | A/B : deux collections distinctes, bascule 2/3 complémentaire | KIT2, KIT7, UI1 | OK API et logique UI |
| I11 | A/B : P ×2 et Q ×3, répétitions autorisées | KIT2, KIT4 | OK API |
| I12 | Même collection, origine étrangère, papier étranger ou mauvais total refusés | KIT7, KIT12 | OK API |
| I13 | C avec 5 papiers : composition automatique 1 de chaque | KIT3, UI2 | OK API et logique UI |
| I14 | C avec 3 papiers : 1 de chaque proposé, 2 feuilles à répartir | KIT3, UI2 | OK API et logique UI |
| I15 | C avec 1 papier : quantité automatique 5 | KIT3, UI2 | OK API et logique UI |
| I16 | C : total différent de 5 ou papier omis refusé | KIT3, UI2 | OK API et logique UI |
| I17 | 1 ruban automatique, choix obligatoire avec 2 | KIT6, UI3 | OK API et logique UI |
| I18 | Option : P ×4/Q ×6, +350 centimes, ruban et matériaux ×1 | KIT4, UI4 | OK API et logique UI |
| I19 | Tarifs propres au catalogue choisi | KIT1, KIT8 | OK API |
| I20 | Édition du tarif : prix passé et contribution au bilan conservés | KIT1, KIT13 | OK API |
| I21 | Retrait/renommage des sources : historique et stocks inchangés | CAT6, KIT13, KIT15, KIT16 | OK API |

## Scénarios complémentaires de #4 et #12

| Cas | Contrat vérifié | Preuve | Résultat automatique |
| --- | --- | --- | --- |
| C01 | Defaults copiés à la création, éditions des paramètres sans effet rétroactif | CAT1, KIT1 | OK API |
| C02 | Tarifs entiers 0–10 000, refus négatifs/décimaux/types invalides atomique | CAT1, KIT8 | OK API |
| C03 | Brouillon complet reste brouillon jusqu’à publication explicite | CAT2, CAT7 | OK API |
| C04 | Perte d’un minimum : démotion transactionnelle après mutation | CAT2, CAT3, CAT7 | OK API |
| C05 | Dépassement d’un maximum : rollback, sans démotion | CAT3 | OK API |
| C06 | Même papier dans deux collections : répartition 2/3 et stocks agrégés | KIT5, KIT15 | OK API |
| C07 | C pour toutes les tailles 1–5 ; collection/papier étranger rejetés en POST et PUT | KIT3, UI2 | OK API et logique UI |
| C08 | Ruban étranger, aucun ruban avec 0, choix obligatoire avec 2 | KIT6 | OK API |
| C09 | Promo/autres : couples libellé/prix complets, entiers non négatifs, 0 accepté | KIT4, KIT8 | OK API |
| C10 | Suppléments invalides rejetés en POST et PUT, prix/composition/stocks préservés | KIT8 | OK API |
| C11 | Correction manuelle explicite, y compris 0, origine mémorisée, suppléments conservés | KIT8, KIT10, KIT13, UI4 | OK API et logique UI |
| C12 | Kit non réglé modifiable : remplacement complet, tarifs actuels, ancienne correction abandonnée | KIT10, UI5 | OK API et logique UI |
| C13 | Origine archivée complète éditable ; nouveau catalogue publié/actif requis | KIT11 | OK API |
| C14 | Échec SQL en création/édition : rollback de composition, prix, stocks et effets cliente | KIT12 | OK API |
| C15 | Règlement dédié sans recalcul, PUT ne modifie pas reglee | KIT13, KIT17 | OK API |
| C16 | Kit/hors-kit réglés immuables et non supprimables | KIT13, KIT17, SQL3 | OK API/SQL |
| C17 | Suppression physique non réglée : lignes et stocks retirés | KIT14 | OK API |
| C18 | Clientes/catalogues seuls archivables/restaurables, exclus des nouvelles créations | CAT4, CAT5, KIT9 | OK API |
| C19 | Sources non supprimables, historiques consultables même après archives | CAT5, CAT6, KIT13, SQL3 | OK API/SQL |
| C20 | Champs hors-kit/clientes conservés ; fidélité historique hors-kit uniquement à la création >70 € | KIT17, KIT18 | OK API |
| C21 | Schéma neuf et chemin versionné compatible identiques ; ancienne donnée métier refusée, sans conversion | SQL1, SQL2 | OK SQL |
| C22 | Import synthétique des seules clientes, coordonnées conservées, dernière commande NULL et fidélité 0 | IMP1 | OK SQL |
| C23 | Doublons normalisés refusés avant écriture, import atomique si insertion échoue | IMP2, IMP3 | OK SQL |
| C24 | Import : précontrôle, cible neuve distincte, source inchangée, relance refusée | IMP4 | OK CLI/SQL |
| C25 | Démonstration reproductible : fixtures synthétiques, fichier existant/lien symbolique refusés | DEMO | OK API/CLI/SQL |

## Démonstration reproductible

Depuis la racine, créer un nouveau dossier temporaire puis un fichier neuf :

```bash
mktemp -d /tmp/stamp-recette-XXXXXX
# Remplacer /tmp/stamp-recette-XXXXXX par le chemin réellement obtenu.
node backend/scripts/prepare-recette.js --target /tmp/stamp-recette-XXXXXX/recette.db
```

Le script initialise le schéma et son historique, puis crée ses fixtures via
une API locale éphémère. Il refuse tout fichier cible existant, même vide ou
symbolique. En cas d’échec après création, le fichier partiel est conservé pour
diagnostic : repartir avec un autre dossier neuf. Il n’a pas d’option de reset.
Les chemins SQLite habituels ne sont pas utilisés.

Dans deux terminaux séparés, en remplaçant le même chemin :

```bash
STAMP_DB_PATH=/tmp/stamp-recette-XXXXXX/recette.db PORT=3100 node backend/src/index.js
VITE_DEV_API_TARGET=http://127.0.0.1:3100 npm run dev --prefix frontend -- --host 127.0.0.1 --port 5174 --strictPort
```

Ouvrir `http://localhost:5174/`. La fixture comprend :

- Alice Recette (`alice@example.test`), préférences synthétiques ;
- « Noël créatif » avec 2 collections et 2 rubans ;
- cinq catalogues C de 1 à 5 papiers, avec 0/1/2 rubans selon la variante ;
- un brouillon incomplet, absent des choix de nouvelle commande ;
- kit A réglé à 1 859 centimes : 1 234 +350 +275 +0 ;
- kit B non réglé corrigé à 1 000 centimes, tarif courant 4 029 ;
- hors-kit non réglée de 80 €, cadeau 2,50 €, paiement Paypal ;
- bilan du mois de création : 1 859 centimes, promo 275, autre 0 ;
- fidélité cliente : 1 point attribué uniquement par la hors-kit.

Les scénarios UI mutent cette base jetable. Pour rejouer depuis l’état initial,
créer une nouvelle fixture. Le rapport JSON expose IDs, mois et bilan attendus.

## Journal de recette navigateur

Exécution Jarvis, 18 septembre 2026, Vite 5174 / API 3100,
base synthétique `/tmp/stamp-recette-HCBR6T/recette.db`.
Pour la présentation à Sam, une nouvelle fixture intacte a ensuite été créée
dans `/tmp/stamp-recette-HCBR6T/demo.db`, servie sur les mêmes ports.

| Parcours | Observation | Résultat |
| --- | --- | --- |
| U01 — Nouvelle commande A | « Noël créatif », deux collections distinctes ; choix déjà retenu désactivé dans l’autre collection ; bascule 3/2 et quantités 3/2 | OK navigateur |
| U02 — Option et suppléments | Résumé 5→10 papiers, 6/4 par collection, option 3,50 €, promo 2,75 €, autre 0 ; total 18,59 € | OK navigateur |
| U03 — Deux rubans | Soumission sans ruban refusée avec alerte ; saisies conservées ; après choix du ruban 2, kit créé et détail serveur correct, ruban ×1 | OK navigateur |
| U04 — C avec trois papiers | A/B désactivés ; 1/1/1 proposé ; total 3 refusé ; correction 3/1/1, création et détail à 35,25 € | OK navigateur |
| U05 — Édition kit B | Ancien total manuel 10 € signalé ; cliente verrouillée, correction décochée ; enregistrement à 40,29 €, origine automatique | OK navigateur |
| U06 — C 1/2/4/5 et rubans 0/1/2 | Créations réussies à 35,25 € : 5, 4/1, 2/1/1/1 et 1/1/1/1/1 ; ruban unique automatique, choix parmi deux | OK navigateur |
| U07 — Règlement, stocks et bilan | Kit #4 réglé à 18,59 €, actions supprimées ; stocks Noël 12/13 feuilles finales ; bilan 37,18 € pour les deux kits réglés, suppléments 0 conservés | OK navigateur |
| U08 — Catalogue | Defaults 0/100/12,34 € enregistrés et copiés dans un nouveau brouillon ; collection vide démote, papier réutilisé depuis bibliothèque, publication explicite ; archive puis restauration en brouillon | OK navigateur |
| U09 — Hors-kit/clientes | Édition #3 à 95,50 €, date 18/09 et chèque, cadeau 2,50 € conservé ; réglée sans actions ; cliente : email/adresse/relais conservés et fidélité toujours 1 | OK navigateur |
| U10 — Historique | Catalogue renommé, matériaux changés, A à 99,99 €, collection vide ajoutée puis complétée, source archivée ; détail #4 conserve Noël créatif, matériaux initiaux, 18,59 € et répartition 3/2 ; stocks Noël toujours 12/13 feuilles finales | OK navigateur pour ces mutations ; renommage papier/collection et retrait d’association vérifiés par API |
| U11 — Robustesse UI | Catalogue C1 archivé par l’API pendant saisie : POST refusé, erreur visible et composition conservée ; fermeture demande confirmation, annulation conserve le formulaire ; après restauration/publication, correction explicite à 0 € créée ; à 390×844 aucun débordement horizontal page/formulaire, Tab passe du total manuel au paiement | OK navigateur sur ces contrôles ciblés |
| U12 — Suppression | Confirmation puis suppression synthétique #9 : détail fermé, liste actualisée et besoins C5 absents des stocks | OK navigateur |
| HUM1 — Démonstration | Acceptation de Sam, retour cliente si nécessaire | En attente de Sam |

## Contrôles et limites de livraison

- `npm run check` : réussi, 80 tests backend, 22 tests frontend, build Vue.
- `docker compose config --quiet` : réussi le 18 septembre 2026.
- CI du socle : [main 05ea8e1](https://github.com/SamBzd/Stamp-app/actions/runs/35322004053)
  et [PR #23](https://github.com/SamBzd/Stamp-app/actions/runs/35321752245) réussies.
- Les dernières CI des têtes fusionnées #5–#11 sont toutes réussies :
  [PR #17](https://github.com/SamBzd/Stamp-app/actions/runs/35147708226),
  [PR #18](https://github.com/SamBzd/Stamp-app/actions/runs/35199271008),
  [PR #19](https://github.com/SamBzd/Stamp-app/actions/runs/35200489640),
  [PR #20](https://github.com/SamBzd/Stamp-app/actions/runs/35226730695),
  [PR #21](https://github.com/SamBzd/Stamp-app/actions/runs/35270939844),
  [PR #22](https://github.com/SamBzd/Stamp-app/actions/runs/35273734327),
  [PR #23](https://github.com/SamBzd/Stamp-app/actions/runs/35321752245).
- Revue indépendante de couverture : aucun bug reproduit ; manque de recette
  UI signalé, assertion explicite de démotion après collection vide ajoutée.
- Premier audit indépendant du diff : test DEMO insuffisant pour garantir les
  variantes annoncées ; assertions explicites sur tailles C 1–5, rubans,
  statut/prix et brouillon ajoutées et test exécuté avec succès.
- Nouvel audit indépendant de l’état corrigé : aucun défaut bloquant identifié ;
  `npm run check`, Docker Compose et `git diff --check` réussis. Point de
  traçabilité mineur (2/5) : le journal navigateur décrit une exécution manuelle,
  sans captures jointes ni suite navigateur automatisée. La validation de Sam
  reste nécessaire.
- Le parcours CLI d’import réussi de bout en bout n’est pas couvert par un
  test dédié : l’import réel et le précontrôle CLI sont testés séparément.
- Écart UI mineur reproduit, pertinence 2/5, corrigé avec l’accord de Sam :
  l’historique cliente affiche désormais « Hors kit » pour une hors-kit et
  « Format A/B/C » pour les kits ; le paiement reste affiché à côté.
  Vérifié dans le navigateur sur la base synthétique : « Format A · virement »,
  « Format B · virement » et « Hors kit · Paypal ». Les contrôles automatisés
  et Docker Compose ont été relancés avec succès après cette correction.
- CI de la future PR #12 et acceptation humaine en attente. Aucun verdict
  d’acceptation de l’issue ni de préparation au déploiement à ce stade.
