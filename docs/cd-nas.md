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

## Livrer une modification courante

1. Pousser les changements et les fusionner dans `main`.
2. Dans **GitHub → Actions → Livrer Stamp App sur le NAS**, choisir
   **Run workflow**, sélectionner `main` et lancer le workflow.
3. Attendre la réussite de la CI, de la construction des images et de la
   publication de la release `nas-<commit>`. Le workflow crée lui-même cette
   release et son manifeste ; un push ou un merge seul ne livre rien.
4. La tâche DSM commune consulte les releases toutes les dix minutes, chaque
   jour de `00:00` à `23:50`. Après publication et validation du workflow,
   attendre son prochain passage, puis le téléchargement et le démarrage.
   Les dix minutes sont l'intervalle de détection, pas le délai total depuis
   le push ; une indisponibilité réseau ou un contrôle refusé peut le prolonger.
5. Contrôler la release active dans l'état du projet, les images et révisions
   des deux conteneurs, puis les sondes de l'interface et de l'API. Une CI verte
   ou une release publiée ne prouve pas à elle seule le déploiement sur le NAS.

Une CI en échec empêche la publication par ce workflow. Une preuve de release
non approuvée est refusée avant téléchargement. Si une migration SQLite est
requise, le précontrôle bloque la bascule et conserve la version actuelle ;
suivre la procédure de migration explicite plus bas. Si les sondes échouent
après la bascule, la CD tente de rétablir les images précédentes et enregistre
la release rejetée, sans la relancer automatiquement au passage suivant.
Consulter la sortie DSM et l'état du projet pour confirmer le résultat.

Le calendrier suit le même rythme avec son propre workflow
**Livrer le calendrier sur le NAS** et sa propre configuration. Il n'a pas
de migration SQLite. La tâche DSM traite les projets déclarés séparément.

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

Les 50 tests CD passent, dont six tests injectant des échecs dans la migration
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

Sam a exécuté le script corrigé et confirmé sa sortie sur le NAS le
19 novembre 2026. La preuve Actions et les empreintes ont été acceptées,
la nouvelle image démarrée et la release
`nas-5a8847d4883cf6c5f9aab666c99e60871da697a4` adoptée dans l’état local.
Les assertions de configuration Docker et de limite effective `nproc` passent.
Le second passage du déployeur se termine sans redéploiement. La compatibilité
de cette mise à jour avec Docker 20.10.3 / Compose 1.28.5 est donc vérifiée sur
le NAS, en plus du retour arrière observé lors du premier essai.

Sam confirme ensuite que la tâche DSM est activée toutes les dix minutes.
Sa capture DSM affiche `Normal (0)` pour une exécution du 19 novembre à
16:27:52–16:27:54, mais aucun journal, car le dossier de sortie n’est pas encore
configuré. Cette capture seule ne permettait pas de distinguer un lancement
manuel d’un passage planifié. La fenêtre était initialement limitée à
00:00–00:50 ; Sam l’a corrigée en 00:00–23:50 pour couvrir toute la journée.
L’adoption manuelle de la release est validée. Le contrôle de la release
suivante confirme ensuite la bascule automatique, comme décrit ci-dessous.
Stamp App / l’issue #45 ne sont pas livrés par cette recette.

Une nouvelle release de recette
`nas-c704957f5c4e32e3cccbe87e9768d54e2a127c98` a été publiée le 19 novembre
à 16:30:41, heure de Paris, par
[l’exécution Actions 44555449992](https://github.com/SamBzd/calendrier-avent-maman-2026/actions/runs/44555449992).
Elle apporte seulement une précision de documentation au calendrier ; le
label OCI de révision crée une nouvelle image par digest, distincte de la
release précédente. Le déployeur a accepté sa preuve Actions contre la vraie
API GitHub avec les mêmes empreintes de workflows approuvées.

Après le passage automatique, Sam a fourni la sortie du contrôle en lecture
seule : release enregistrée
`nas-c704957f5c4e32e3cccbe87e9768d54e2a127c98`, révision du conteneur
`c704957f5c4e32e3cccbe87e9768d54e2a127c98` et `DÉPLOIEMENT CONFIRMÉ`.
Ce résultat exige un conteneur actif, la même image que l’état enregistré et
aucune bascule en attente. Le circuit release GitHub → tâche DSM → nouvelle
image du calendrier sur le NAS est donc validé, sans lancement manuel de la CD.

À ce stade de la recette calendrier, l’issue #46 restait ouverte pour
l’intégration et la première livraison contrôlée de Stamp App avant le #45.
Les tests automatisés couvrent le refus d’une
migration, le rollback sur sonde et l’indépendance entre projets. Sur NAS,
le rollback du script de maintenance est observé ; un rollback déclenché par
une sonde du déployeur et le précontrôle sur une copie SQLite restent à
distinguer de cette preuve de bascule réussie.

Pour cette installation, créer ou mettre à jour une seule tâche DSM `NAS-CD`,
exécutée par `root`, tous les jours toutes les dix minutes, avec première
exécution à `00:00` et dernière à `23:50`. Ce compte correspond
aux droits des credentials et fichiers administrateur déjà installés. Utiliser
le script suivant et activer l’enregistrement des sorties de la tâche :

```sh
set -eu
umask 077
export PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
export DOCKER_CONFIG=/volume1/docker/nas-cd/credentials/docker
cd /volume1/docker/nas-cd
/bin/python3 /volume1/docker/nas-cd/nas_cd.py \
  /volume1/docker/nas-cd/projects.json \
  --state-dir /volume1/docker/nas-cd/state
echo 'CD OK'
```

Cette tâche traite tous les projets activés de la configuration ; l’ajout d’un
projet ne demande pas de tâche supplémentaire. Exécuter une fois la tâche depuis
DSM, puis vérifier un passage effectivement planifié, son code de sortie `0`
et `CD OK`. Sans nouvelle release, aucune bascule n’est attendue. Référence :
[création et contrôle des tâches DSM](https://kb.synology.com/en-af/DSM/tutorial/common_mistake_in_task_scheduler_script).

Garder les credentials, le script, les configurations Compose et l’état hors
des montages applicatifs, dans des dossiers administrateur `0700` et des
fichiers `0600`. Aucun socket Docker ni dossier du NAS n’est monté dans le
calendrier. La CD consulte GitHub en sortie ; elle n’ouvre aucun port d’entrée
pour recevoir des webhooks. Le site reste accessible sur son port applicatif.
Le réseau bridge dédié ne bloque pas les sorties Internet ou l’accès aux
services réseau du NAS. Ne pas publier le port sur Internet avant d’avoir
validé séparément le pare-feu, les mises à jour DSM/Docker et l’exposition IPv6.

## Échec, suspension et migration

### Recette NAS isolée avant fusion

[recette-nas-cd46.py](../deploy/maintenance/recette-nas-cd46.py) prépare deux
essais sur le NAS sans raccorder la production ni modifier `projects.json`.
Fournir explicitement les noms des conteneurs backend/frontend réellement
actifs, relevés par `docker inspect`. Le script refuse un autre montage que
`/data`, une base autre que `/data/app.db`, un service arrêté ou deux projets
Compose différents. Exécuter une version figée dont l’empreinte a été vérifiée.

Le premier essai ouvre la base réelle en lecture seule dans un conteneur
temporaire sans réseau et en fait une copie cohérente par l’API backup SQLite.
Seule la copie passe en journal DELETE pour permettre son examen sur montage
en lecture seule. Le CLI `--require-current` relu est téléchargé à un commit
fixe, contrôlé par SHA-256 et monté dans l’image backend déjà utilisée.
Les helpers, dépendances et migrations sont inchangés entre le commit livré
`6cc9817` et cette branche. Une migration factice est ajoutée uniquement au
dossier de migrations de recette ; le CLI doit la refuser sans modifier la copie.
Cela vérifie le nouveau précontrôle sur NAS avec l’image existante ; ce n’est
pas une exécution de la future image Stamp App publiée par le nouveau workflow.

Le second essai démarre un projet calendrier distinct sur un port loopback
temporaire, avec l’image précédente et un état séparé. Il prend la véritable
release `nas-c704957f5c4e32e3cccbe87e9768d54e2a127c98`, dont la preuve GitHub est
vérifiée avant le test, et fige cette réponse uniquement dans le processus de
recette. Une sonde locale répond 503 seulement pour l’image candidate, puis 200
après restauration. Le déployeur doit rétablir l’image antérieure, enregistrer
le rejet et laisser le conteneur intact au second passage.

Les fixtures et la copie de données sont supprimées à la fin ; seul un reçu
JSON de résultats sans données clientes reste dans le dossier administrateur.
Les conteneurs Stamp en service doivent conserver leurs identifiants, images
et dates de démarrage. Le conteneur SQLite temporaire garde ses limites de
ressources Docker par défaut ; il est sans réseau, non root, sans capacités,
avec racine et source réelles en lecture seule. Ces protections sont distinctes
du profil RAM/CPU/nproc du calendrier de recette.

La recette a été exécutée localement en Docker avec une base synthétique et
une publication de test locale ; ces résultats ne sont pas des essais NAS.
Les tests automatisés contrôlent aussi les sélections de conteneurs, le refus
d’un CLI de mauvaise empreinte et le nettoyage après succès/échec. L’exécution
par Sam sur le NAS reste requise avant d’y cocher ces scénarios.

Sam a confirmé `RECETTE NAS RÉUSSIE` le 19 novembre 2026 : précontrôle sur
copie SQLite, rejet d’une migration factice, rollback du déployeur isolé puis
non-réessai sont vérifiés sur le NAS. Les conteneurs Stamp sont inchangés.
Cette preuve ne constitue pas encore un raccordement ni une livraison Stamp.

Le workflow de production étant absent de `main`, GitHub ne permettait pas
encore [son déclenchement manuel](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).
Un lancement `workflow_dispatch` de la CI déjà enregistrée a en revanche été
vérifié depuis `codex/nas-cd`. Une entrée provisoire `publish-nas-rehearsal`
dans cette CI publie uniquement après `check`, sur cette ref exacte et sur
demande booléenne explicite. Les droits d’écriture sont limités au job éditeur.
Cette entrée est à retirer avant la fusion ; `main` reste inchangé pendant
la recette. Elle ne remplace pas le futur workflow de production.

La release Stamp `nas-21c57bfda56c49bae8132a6e13c84a363eb3c3a0` a ainsi été
publiée par [Actions 44584924158](https://github.com/SamBzd/Stamp-app/actions/runs/44584924158),
avec frontend et backend du même commit, CI réussie et preuve vérifiée contre
l’API réelle. Aucun #45 ni changement de schéma n’est inclus.

### Première livraison Stamp contrôlée avant fusion

[connect-stamp-rehearsal.py](../deploy/maintenance/connect-stamp-rehearsal.py)
exige le reçu privé root de la recette NAS réussie, les noms réels des
conteneurs et l’empreinte du Compose relu. Le propriétaire du Compose et de ses
deux dossiers parents doit être root ou membre du groupe NAS `administrators`,
sans écriture groupe/autres ; le driver le vérifie avant toute bascule. Une
modification concurrente par un administrateur déjà autorisé reste hors de
ce contrôle : ne pas lancer une autre maintenance en parallèle. Le script conserve le Compose à son
emplacement original pour préserver les chemins relatifs du montage SQLite.

Le driver vérifie la release authentique de branche avec le graphe approuvé
`ci.yml` + `nas-publish.yml`, tire les images et effectue une nouvelle sauvegarde
cohérente. Cette fois, le précontrôle positif puis le refus de migration
factice sur copie utilisent l’image backend candidate publiée. La sauvegarde
privée persiste pour le retour arrière ; aucun fichier de données n’est copié
dans Git ni affiché dans les sorties.

Les migrations du garde proviennent d’un conteneur candidat créé mais jamais
démarré, puis supprimé avec ses seuls volumes anonymes. Elles ne sont pas
copiées depuis le conteneur de production. Une migration réelle nouvelle
dans l’image candidate bloque donc également le précontrôle sur copie.

Sous verrou du projet, l’état précédent est sauvegardé et Stamp est déclaré
avec `enabled: false` et le marqueur `controlled_release` avant la bascule.
La tâche DSM ignore ce projet suspendu, même si le driver s’interrompt avant
d’avoir écrit un `pending`. Elle ne peut donc pas choisir une autre release
pour cette première livraison. Le driver emploie sa configuration activée
privée et sa réponse GitHub authentifiée figée.

Le déployeur conserve le montage SQLite et applique la paire prévue. Un échec
de contrôle après bascule déclenche une compensation vers l’état précédent ;
le projet reste suspendu. Après tous les contrôles, l’activation dans la
configuration globale est le dernier point de commit. Une coupure électrique
avant ce point laisse volontairement la première livraison suspendue pour
examen humain, sans reprise automatique vers une release non contrôlée.

Pour abandonner une transaction interrompue, le mode explicite
`--rollback-backup /chemin/du/stamp-before-cd46-...` du même driver restaure
seulement les images connues de cette transaction, sans chercher de release.
Il exige le projet encore suspendu avec ce marqueur, le Compose inchangé et
refuse une image tierce ou un projet déjà activé. Il conserve les données
actuelles et la suspension ; il ne restaure pas automatiquement la copie DB.

Les tests du driver couvrent reçu, hash Compose, échec du garde, redémarrage
concurrent, échec d’inscription, bascule interrompue et contrôles post-bascule.
Une [réplique Docker locale](../deploy/tests/integration/README.md) sur données synthétiques valide aussi la paire
backend/frontend, le montage relatif et la persistance d’une cliente fictive.
Ces essais locaux ne sont pas présentés comme une livraison NAS.

Le canal initial explicite utilise `release_workflow=.github/workflows/ci.yml`
et `release_branch=codex/nas-cd`. Après livraison NAS confirmée, retirer l’entrée
temporaire, fusionner selon l’autorisation conditionnelle de Sam, puis préparer
la transition vers `nas-release.yml` / `main` avec les trois empreintes
approuvées. Ne pas présenter le canal de recette comme la livraison depuis main.

Sam a confirmé le 20 novembre 2026 la première livraison contrôlée réussie,
le raccordement de Stamp à la tâche DSM et la release active
`nas-21c57bfda56c49bae8132a6e13c84a363eb3c3a0`. Cette sortie est émise après
les gardes sur copie avec la candidate, la bascule du déployeur, les sondes,
la vérification du montage et le commit d’activation. Les deux conditions de
fusion demandées par Sam sont remplies. L’entrée CI de recette est retirée
avant fusion. Le workflow permanent reste `nas-release.yml` depuis `main`.

La PR #47 est fusionnée dans `main` au commit
`1780b9127cc2886528f9e10c25b03b1f520fa3ff`. La release de branche est classée
prérelease de recette, sans suppression de ses images ni de ses artefacts.
Sam a ensuite confirmé le passage de la politique NAS à `nas-release.yml` /
`main`, avec sauvegarde de la configuration et sans redémarrage à cette étape.

La [publication Actions depuis main](https://github.com/SamBzd/Stamp-app/actions/runs/44724573845)
a réussi : tests applicatifs, build frontend, configuration Docker et 50 tests
du déployeur, puis publication des deux images. La vérification indépendante
par `latest_release` contre la vraie API GitHub a accepté les trois empreintes
de workflows approuvées, le run réussi et l’artefact immuable correspondant.

Après le passage automatique, Sam a confirmé le 20 novembre 2026 :

```text
backend : image et révision confirmées
frontend : image et révision confirmées
Release : nas-1780b9127cc2886528f9e10c25b03b1f520fa3ff
DÉPLOIEMENT MAIN CONFIRMÉ — sondes OK, montage SQLite conservé
```

Ce contrôle en lecture seule exige le canal `main`, cette release active sans
bascule en attente, la preuve Actions enregistrée, les deux conteneurs actifs
avec les identifiants d’images attendus et les labels de révision du commit,
les sondes HTTP réussies et le montage SQLite de production conservé en lecture
et écriture. Il ne constitue pas une comparaison du contenu des données clientes.
Le circuit permanent GitHub → tâche DSM → Stamp App est validé ; le #45 n’est
pas livré. Les essais NAS sur copie SQLite et sur sonde 503 restent les recettes
isolées décrites plus haut, distinctes des tests automatisés.

La version préparée du driver possède l’empreinte SHA-256
`b88d1355e0cf3365ee24a2502f80a8ffa4d0119ce4fae3dd0eb8bd6735293456`.
Télécharger uniquement le fichier du commit explicitement approuvé, dans le
dossier administrateur, puis vérifier cette empreinte avant exécution root :

```sh
sudo curl --fail --show-error --location \
  'https://raw.githubusercontent.com/SamBzd/Stamp-app/COMMIT_APPROUVE/deploy/maintenance/connect-stamp-rehearsal.py' \
  --output /volume1/docker/nas-cd/connect-stamp-rehearsal.py
printf '%s\n' \
  'b88d1355e0cf3365ee24a2502f80a8ffa4d0119ce4fae3dd0eb8bd6735293456  /volume1/docker/nas-cd/connect-stamp-rehearsal.py' \
  | sudo sha256sum --check
sudo chmod 600 /volume1/docker/nas-cd/connect-stamp-rehearsal.py
```

Remplacer `COMMIT_APPROUVE` par le SHA immuable donné avec la procédure, jamais
par un nom de branche. La commande d’exécution doit fournir les conteneurs
relevés, le reçu NAS réussi, l’empreinte réelle du Compose et le commit de
release prévu. Aucun lancement du driver root ne doit précéder ces vérifications.

### Exploitation courante

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
