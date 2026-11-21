# Recette Docker locale de raccordement

## Migrations SQLite automatiques

La recette dédiée suivante n'utilise que des bases synthétiques et des projets
Docker aléatoires ; elle ne contacte pas le NAS. Elle vérifie la migration v4→v5,
la restauration réelle après sonde défaillante, une coupure avant activation,
puis une coupure après réouverture avec une nouvelle saisie HTTP à préserver.
Les métadonnées de publication sont des fixtures ; les tests de publication
couvrent séparément les preuves GitHub. Les images locales sont conservées,
les conteneurs, réseaux et données de recette sont retirés.
Exécuter avec UID 1000 ou avec `sudo` ; la CI utilise `sudo` pour conserver
les permissions réelles UID 1000 des données sans dépendre de l'UID du runner.

```sh
docker build -f backend/Dockerfile -t codex-stamp-cd-backend:local .
docker build -f frontend/Dockerfile -t codex-stamp-cd-frontend:local .
python3 -B deploy/tests/integration/check_sqlite_rollout.py
```

## Raccordement historique

Ce contrôle utilise uniquement des données synthétiques et des ressources
Docker au nom aléatoire. Il ne contacte aucun NAS et ne lit aucune base réelle.
La réponse de publication est une fixture locale ; la preuve GitHub réelle
est vérifiée séparément avant livraison. Les assertions de fichiers, SQLite,
conteneurs, montage relatif, précontrôle et paire déployée sont réelles.

Prérequis : Docker Compose v2, accès à Docker et UID local 1000 (ou root).
Les images Node du projet utilisent UID 1000. Le téléchargement public du
CLI de référence est vérifié par empreinte. Depuis la racine du dépôt :

```sh
docker build -f backend/Dockerfile -t codex-stamp-security-backend:local .
docker build -f frontend/Dockerfile -t codex-stamp-security-frontend:local .
python3 -B deploy/tests/integration/check_stamp_connect.py
CD46_INJECT_COMMIT_FAILURE=1 python3 -B deploy/tests/integration/check_stamp_connect.py
```

Le test démarre la paire initiale sur un port loopback libre, insère une cliente
fictive, appelle le véritable driver de raccordement avec une publication
locale, puis vérifie la nouvelle paire, le maintien du projet voisin et la
cliente après bascule. Les conteneurs, réseau, étiquettes d’images et dossiers
temporaires propres au test sont retirés à la fin. Ce script est opt-in et
n’est pas lancé par `unittest discover`.
Le second lancement injecte une panne au commit d’activation et vérifie sur
les conteneurs réels le retour à l’ancienne paire, la suspension et la cliente
conservée après restauration.
