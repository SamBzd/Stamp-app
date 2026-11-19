# Livraison automatique sur Synology

## Principe

Depuis l’onglet **Actions** du dépôt, lancer le workflow de livraison sur `main`.
Il rejoue la CI sur le commit choisi, publie les images sous GHCR et attache
`nas-release.json` à la release `nas-<commit>`. Le manifeste associe chaque
service Compose à une référence par digest. Le NAS consulte les releases
publiées par les dépôts déclarés, puis applique la dernière release NAS par date
de publication. Les merges, brouillons et préreleases ne déclenchent aucune bascule.

Le workflow construit pour `linux/amd64`, l’architecture du NAS relevée lors
de la livraison initiale. Le déployeur utilise Python 3.8 ou plus récent et
sa bibliothèque standard.

## Contrôle de publication et limites de confiance

Le manifeste v2 contient l’identifiant de l’exécution Actions et de sa tentative.
Le NAS exige une exécution manuelle terminée avec succès, sur la branche
autorisée (par défaut `main`), pour le même dépôt et le même commit. Il compare
les empreintes SHA-256 des fichiers de tous les workflows exécutés, y compris
la CI et l’éditeur réutilisable, avec `trusted_workflows`, approuvé localement.
Il télécharge ensuite l’artefact `nas-manifest-<tentative>`, contrôle son
empreinte GitHub et exige le même manifeste que celui de la release.
Les archives sont limitées à 1 Mio, leur manifeste à 64 Kio et aucun fichier
de l’archive n’est extrait sur le NAS. Les redirections restent en HTTPS et
ne transmettent pas le jeton d’authentification.

Cette vérification utilise l’API GitHub authentifiée et TLS. Elle ne constitue
pas une signature indépendante de GitHub et ne protège pas contre un compte
autorisé qui publie lui-même du code malveillant. Une personne pouvant modifier
uniquement une release ne peut pas lui substituer un autre manifeste accepté.
Les actions officielles et les images de base sont épinglées par commit/digest.
Leur mise à jour demande une revue et une nouvelle validation.

Pour chaque projet, calculer les empreintes avec `sha256sum` sur les fichiers
locaux relus, puis les copier dans `trusted_workflows`. Les clés sont les
chemins complets `owner/repo/.github/workflows/fichier.yml`. La liste doit
correspondre exactement au workflow appelant et aux workflows réutilisables
qu’il exécute. `release_workflow` vaut `.github/workflows/nas-release.yml`
et `release_branch` vaut `main` par défaut. Ne jamais approuver automatiquement
des empreintes récupérées dans une release non vérifiée.

Les artefacts Actions sont conservés 90 jours. Une release déjà vérifiée et
enregistrée localement reste reconnue après expiration, tant que la politique
locale reste identique. Une première installation, une perte de l’état local
ou une nouvelle politique demande une preuve encore disponible, donc une
nouvelle release si nécessaire. Une release encore en cours de publication
est refusée temporairement et sera vérifiée au passage suivant. Les manifestes
v1 ne sont plus admis. Une erreur de preuve ne lance aucun `docker pull`.
L’artefact ne contient que le petit manifeste, pas les images Docker.

Références officielles : [artefacts Actions et empreintes](https://docs.github.com/en/rest/actions/artifacts),
[immuabilité des artefacts v4](https://github.com/actions/upload-artifact).

## Première mise en service

1. Vérifier les versions de Python, Docker et Compose sur le NAS. Lire les noms
   de projets et services réellement utilisés. Pour le couple Docker et Compose
   1.28.5 relevé sur le NAS, utiliser `docker-compose` et donner `compose_version`
   identique à la version du fichier de base. Pour Compose v2, utiliser
   `["docker", "compose"]` et omettre `compose_version` si le fichier de base
   ne définit pas de version.
2. Copier `deploy/nas_cd.py` dans un dossier contrôlé par l’administrateur.
   Copier `deploy/projects.example.json` vers `projects.local` et renseigner
   les chemins et sondes avec des valeurs absolues. Garder Stamp App désactivé.
   Créer un dossier d’état local persistant avec accès limité à l’utilisateur
   de la tâche, séparé des volumes applicatifs.
3. Pour un dépôt privé, déposer un jeton GitHub avec accès `Contents: read`
   et `Actions: read` à ce dépôt dans le fichier indiqué par `github_token_file`.
   Le même jeton fine-grained peut sélectionner plusieurs projets du même
   propriétaire. Ajouter les permissions à ce jeton existant suffit.
   Il doit aussi lire le contenu de chaque dépôt privé fournissant un workflow
   réutilisable de cette chaîne. Stamp App étant public, le calendrier n’a pas
   besoin de l’ajouter à la sélection privée pour lire son workflow partagé.
   Utiliser le
   compte de la tâche DSM pour ouvrir une session Docker sur GHCR avec un
   accès `read:packages`. Configurer la visibilité des paquets avant de lancer
   la première release. Garder les jetons hors de la configuration JSON.
4. Activer le calendrier de test. Publier une première release et lancer le
   déployeur une fois à la main. Vérifier la page HTTP et la version enregistrée.
   Tester une deuxième release, une sonde en échec et l’absence de nouvelle
   tentative du même artefact rejeté. Le port exemple `8086` écoute uniquement
   sur la boucle locale.
5. Préparer un projet Stamp App de recette avec une base jetable. Valider
   l’adoption, la livraison, le contrôle SQLite et le retour arrière. Pour la
   production, utiliser le Compose réel, le même nom de projet que les
   conteneurs actifs, et le même montage `/data`. Activer la production et
   lancer une première livraison contrôlée avant de livrer le #45.
6. Créer une seule tâche **Script défini par l’utilisateur** dans DSM. Utiliser
   un compte de confiance avec les droits Docker et les chemins absolus
   nécessaires. Exécuter, par exemple, toutes les dix minutes. Conserver la
   sortie de la tâche et activer le signalement des sorties en erreur.

```sh
python3 /path/to/nas_cd.py /path/to/projects.local --state-dir /path/to/cd-state
```

Le premier passage sur un projet déjà actif étiquette localement les images en
cours pour permettre le retour arrière. Pour Stamp App, `require_existing`
impose que tous les services gérés soient en cours d’exécution. Conserver les
images de la version active. Le Compose local garde les montages, les secrets,
le réseau et les dépendances. La surcharge générée `images.compose.json`
remplace seulement les références d’images. Les services gérés ont une instance
chacun et la politique de récupération d’images doit permettre l’utilisation
des images locales. Pour les commandes Compose d’exploitation, utiliser les
deux fichiers du projet, hors bascule en cours.

## Ajouter un projet

1. Appeler `nas-publish.yml` depuis le workflow de livraison du dépôt applicatif,
   en épinglant la référence du workflow partagé. Configurer son accès GitHub
   Actions si le dépôt d’hébergement est privé. Le dépôt appelant garde sa CI
   et son fichier `.github/nas-images.json`. Chaque entrée associe un service
   Compose à son `dockerfile` et à son `context`.
2. Installer le Compose du projet sur le NAS avec ses propres montages et
   ports. Ajouter une entrée dans `projects.local` et donner à la tâche les
   droits de lecture sur les images et le dépôt. Chaque référence autorisée
   doit correspondre à `ghcr.io/<owner>/<repo>-<service>` en minuscules.
   Renseigner aussi les empreintes `trusted_workflows` après revue des fichiers.
3. Lancer le workflow de livraison. Contrôler la sortie DSM, le `state.json`
   du projet et le résultat des sondes.

Le [calendrier](../deploy/examples/calendrier-avent-maman-2026/README.md) est un
projet autonome à copier dans un dépôt de test. Il illustre le fichier d’images,
le Compose et l’appel au workflow partagé.

Le calendrier utilise un UID non privilégié, une racine en lecture seule,
aucune capacité Linux, `no-new-privileges`, un `/tmp` temporaire et des limites
de ressources et de journaux. Il écoute désormais sur `8080` dans le conteneur.
Pour remplacer une première installation sur le port interne `80`, sauvegarder
le Compose et l’état, installer manuellement la nouvelle image avec le nouveau
Compose, sonder le service, puis archiver l’ancien état pour que le déployeur
adopte cette version. En cas d’échec, restaurer ensemble ancien Compose,
ancien état et ancienne image. Ne pas laisser un retour arrière automatique
associer l’ancienne image au nouveau port interne.

La [mise à jour du calendrier initial du 19 novembre 2026](../deploy/maintenance/update-calendar-security-20261119.sh)
est un script ponctuel destiné uniquement à l’installation décrite ci-dessus,
dans `/volume1/docker/nas-cd`. Il fige la release du calendrier et les empreintes
relues, vérifie la preuve de publication avant bascule, sauvegarde script,
configuration, Compose et état, migre le port interne, puis adopte la nouvelle
release. Il doit être exécuté manuellement en root, avec la tâche DSM désactivée
et sans autre commande CD en cours. Le jeton commun doit déjà avoir
`Actions: read`. Télécharger le script depuis un commit figé et comparer
son empreinte fournie avec les instructions avant de l’exécuter.

Une erreur après bascule tente la restauration du Compose, de l’état et des
images précédents et signale si cette restauration échoue. Les sauvegardes
restent dans le dossier `calendar-security-<date>-<pid>` affiché au démarrage.
Une coupure électrique ne peut pas déclencher le traitement d’erreur du shell.
Dans ce cas, garder la tâche désactivée, examiner cette sauvegarde et rétablir
ensemble les fichiers et l’état avant de relancer Compose. Le script n’active
aucune tâche DSM. Il conserve une publication IPv4 sur `0.0.0.0:8086`, à garder
accessible uniquement depuis le LAN et Tailscale. Cette migration ponctuelle
ne s’applique pas automatiquement aux autres projets.

Le premier essai de Sam a confirmé le refus du quota CPU CFS sur le noyau
Synology et la restauration automatique de l’ancienne version. `docker info`
confirme `CPUShares=true`, `CPUCfsQuota=false`, `MemoryLimit=true`,
`SwapLimit=true`, `PidsLimit=false`. Le script utilise donc une priorité CPU
relative `cpu_shares: 128`, une limite RAM de 64 Mio et une limite Unix
`nproc` soft/hard de 64, sans `cpus` ni `pids_limit`.
Le contrôle mémoire/priorité est vérifié avant bascule ; `nproc` est vérifié
dans Docker et dans `/proc/1/limits` après démarrage.

La priorité CPU réduit le poids en cas de contention, sans plafond CPU strict.
`nproc` compte les processus/threads du même UID Linux, y compris dans d’autres
conteneurs avec UID 101 en l’absence de remappage utilisateur ; ce n’est pas
une limite par conteneur. Le calendrier reste non root, sans capacités et ne
peut pas augmenter sa limite dure. Un grand nombre de processus du même UID
ailleurs peut empêcher son démarrage ; les sondes et la restauration restent
actives. Le Compose de développement garde les limites cgroup pour les hôtes
qui les supportent. Références : [priorité CPU relative](https://docs.docker.com/engine/containers/resource_constraints/)
et [limite nproc par utilisateur](https://docs.docker.com/reference/cli/docker/container/run/#for-nproc-usage).

## Recette de sécurité du 19 novembre 2026

Le workflow partagé et le déployeur durcis sont publiés au commit
`61928f728b5bd99289e0e643b0590378007e4460`, avec
[CI réussie](https://github.com/SamBzd/Stamp-app/actions/runs/44548274741).
Le calendrier privé pointe vers ce workflow au commit
`5a8847d4883cf6c5f9aab666c99e60871da697a4`. Sa
[release de sécurité](https://github.com/SamBzd/calendrier-avent-maman-2026/actions/runs/44548360383)
a réussi, validation et publication comprises, avec manifeste v2 et artefact
Actions `nas-manifest-1`. Le déployeur réel a accepté cette release en lecture
seule contre l’API GitHub. Une substitution du digest dans le manifeste de
release a été refusée face au véritable artefact Actions.

Les 27 tests CD passent, dont six tests injectant des échecs dans la migration
manuelle (appels externes simulés, copies et restaurations réelles dans un
dossier temporaire). `npm run check` et `docker compose config` passent.
Les images backend/frontend et calendrier se construisent localement.
Le calendrier démarre sous UID 101, répond en HTTP, dispose de zéro capacité
effective et de `NoNewPrivs=1`, et refuse une écriture dans `/etc`.
Deux revues indépendantes des correctifs et de la migration sont terminées.
Après le premier essai Synology, le profil sans CFS/cgroup PIDs a été testé
localement sur le calendrier, avec HTTP 200, `NanoCpus=0`, `CpuShares=128`,
RAM 64 Mio et `nproc` effectif 64/64. Une revue indépendante ciblée de cette
adaptation est terminée. Le contrôle NAS atteste la configuration Docker et
la limite effective `nproc` ; les valeurs UID/capacités/NNP du processus restent
couvertes par la recette locale et la CI de l’image, pas par une lecture
NAS de `/proc/1/status`.

La mise à jour de sécurité sur le NAS et sa compatibilité effective avec
Docker 20.10.3 / Compose 1.28.5 restent à confirmer par l’exécution de Sam.
Le calendrier initial fonctionne déjà sur le NAS, mais cela ne prouve pas
le déploiement de cette nouvelle release. La tâche DSM reste désactivée et
Stamp App / l’issue #45 ne sont pas livrés par cette recette.

Garder les credentials, le script, les configurations Compose et l’état hors
des montages applicatifs, dans des dossiers administrateur `0700` et des
fichiers `0600`. Aucun socket Docker ni dossier du NAS n’est monté dans le
calendrier. La CD consulte GitHub en sortie ; elle n’ouvre aucun port d’entrée
pour recevoir des webhooks. Le site reste accessible sur son port applicatif.
Le réseau bridge dédié ne bloque pas les sorties Internet ou l’accès aux
services réseau du NAS. Ne pas publier le port sur Internet avant d’avoir
validé séparément le pare-feu, les mises à jour DSM/Docker et l’exposition IPv6.

## Échec, suspension et migration

- `enabled: false` suspend uniquement le projet visé. `--project <nom>` limite
  une exécution à un projet. L’état, le verrou et la release rejetée sont propres
  à chaque projet. Les autres déploiements continuent si un projet échoue.
- Si les sondes échouent après la bascule, le déployeur redémarre les images
  précédentes et conserve les volumes. Lors d’une première livraison sans
  version antérieure, il arrête les services candidats. Après un arrêt du
  déployeur en pleine bascule, le passage suivant tente le retour arrière.
- Pour réessayer explicitement la dernière release rejetée, corriger la cause
  puis relancer avec `--project <nom> --retry`.
- Pour Stamp App, le contrôle avant bascule lance
  `node scripts/migrate-db.js --require-current` avec le backend candidat et
  le montage du projet. SQLite est ouvert en lecture seule. Une migration en
  attente bloque la bascule.
- Si une migration est nécessaire, suspendre le projet et suivre la procédure
  [d’exploitation](operations.md). Répéter
  l’opération sur une copie puis, en maintenance, arrêter les écritures, faire
  la sauvegarde cohérente et migrer avec l’image candidate. Démarrer et sonder
  les images de cette release avant de reprendre les saisies. Le plan de retour
  arrière doit tenir compte de la compatibilité de la base migrée et des
  nouvelles écritures. Une fois la release validée, archiver hors du dossier
  d’état le sous-dossier de ce projet et réactiver le déploiement. Le déployeur
  adopte alors les images déjà en service.
