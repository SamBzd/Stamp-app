# Développement local

> Ces instructions concernent `main`, issue du travail v2 et encore en stabilisation. Elles ne reproduisent pas nécessairement l'environnement Docker du NAS.

## Prérequis

- Node.js 22.22.2 (voir `.nvmrc`)
- npm 10 ou supérieur

## Installation

Les trois espaces npm ont leur propre lockfile. Depuis la racine :

```bash
npm ci
npm ci --prefix backend
npm ci --prefix frontend
```

## Lancer l'application

```bash
npm run dev
```

`npm run dev` utilise exclusivement `db/dev.db`. Si elle n'existe pas encore, elle est créée vide depuis `db/schema.sql`; `db/app.db` n'est ni lue ni modifiée.

Le schéma est versionné par les fichiers SQL de `db/migrations/`. Une migration
déjà appliquée ne doit jamais être modifiée : ajoute le fichier numéroté suivant.

Tu peux aussi initialiser la base explicitement avant le premier démarrage :

```bash
npm run db:dev:init
```

Pour consulter puis appliquer les migrations en attente sur la base de
développement :

```bash
npm run db:dev:migrate:status
npm run db:dev:migrate
```

L'application refuse de démarrer si une migration est en attente. Son
application reste ainsi une opération explicite et testable.

La migration cible catalogues/kits refuse une base contenant des données métier
anciennes. La [procédure schéma et import](schema-import-clients.md) décrit ce
refus, les structures cibles et la création explicite d'un nouveau fichier avec
les seules clientes. La création de kits attend le futur lot API correspondant.

Cette commande refuse d'écraser une base existante. Pour supprimer puis recréer volontairement la base locale de développement (et donc perdre toutes ses données), lance :

```bash
npm run db:dev:reset
```

En développement, l'API écoute sur le port 3000 et Vite sur le port 5173. La sonde locale est disponible à `GET /api/health`.

## Commandes utiles

```bash
# Vérifier l'API sur une base temporaire et compiler le frontend
npm run check
```

Les tests backend créent leur propre base SQLite dans le répertoire temporaire du système à partir de `db/schema.sql`. Ils n'ouvrent pas `db/app.db`.

## Configuration

Le développement courant ne nécessite aucun fichier `.env` : `npm run dev` fournit le chemin de la base et le frontend utilise le proxy Vite. Les fichiers `.env` locaux sont ignorés par Git.

- `STAMP_DB_PATH` : chemin obligatoire de la base SQLite pour le backend.
- `PORT` : port d'écoute du backend, `3000` par défaut.
- `CORS_ORIGIN` : liste facultative d'origines séparées par des virgules. Sans valeur, aucune origine tierce n'est autorisée.
- `VITE_API_BASE_URL` : URL de l'API vue par le navigateur, `/api` par défaut.
- `VITE_DEV_API_TARGET` : cible du proxy Vite en développement, `http://127.0.0.1:3000` par défaut.

Les fichiers `.env.example` documentent ces variables sans contenir de valeur propre à une machine. Le backend ne charge pas automatiquement un fichier `.env` : l'environnement d'exécution doit lui transmettre les valeurs.

## Vérifier la configuration Docker

Sans construire ni lancer les images :

```bash
npm run check:docker
```

## Conventions

Utilise des versions exactes dans les manifestes npm. N'édite pas les lockfiles à la main. Toute évolution d'API met à jour sa documentation et ses tests.
