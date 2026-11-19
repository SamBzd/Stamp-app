# Calendrier de l’Avent – Maman 2026

Point de départ autonome pour le deuxième projet Docker Compose de la CD NAS.
Les 24 cases s’ouvrent à la date locale de Paris. Les surprises sont à ajouter
dans `calendar.js`. Le site reste statique. Toute personne qui accède à
l’image ou au code JavaScript peut lire son contenu.

Pour lancer une instance locale, utilise Docker Compose.

    docker compose up -d --build

Le calendrier est disponible sur [le port local 8086](http://127.0.0.1:8086/).
Pour le raccorder comme projet de test, copie ce dossier dans le nouveau dépôt.
Épingle `nas-publish.yml` à un commit publié de Stamp App et renomme
`.github/workflows/nas-release.yml.example` en `nas-release.yml` et
`ci.yml.example` en `ci.yml` dans le même dossier.

Le conteneur écoute sur `8080` avec l’utilisateur `101:101`, une racine en lecture
seule, aucune capacité Linux, `no-new-privileges` et des limites de ressources.
Le port `8086` écoute par défaut sur `127.0.0.1`. `CALENDAR_BIND_IP` permet de
choisir une autre adresse IPv4. Le réseau dédié garde des connexions sortantes.
La CI teste le démarrage HTTP et les restrictions. Après revue des workflows,
calculer leurs empreintes et les ajouter à `trusted_workflows` sur le NAS,
comme décrit dans [le guide CD](../../../docs/cd-nas.md).
