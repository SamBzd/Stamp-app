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
   à ce dépôt dans le fichier indiqué par `github_token_file`. Utiliser le
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
3. Lancer le workflow de livraison. Contrôler la sortie DSM, le `state.json`
   du projet et le résultat des sondes.

Le [calendrier](../deploy/examples/calendrier-avent-maman-2026/README.md) est un
projet autonome à copier dans un dépôt de test. Il illustre le fichier d’images,
le Compose et l’appel au workflow partagé.

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
