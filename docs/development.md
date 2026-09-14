# Développement local

> Ces instructions concernent `main`, issue du travail v2 et encore en stabilisation. Elles ne reproduisent pas nécessairement l'environnement Docker du NAS.

## Prérequis

- Node.js 18.20.0 (voir `.nvmrc`)
- npm 8 ou supérieur

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

En développement, l'API écoute sur le port 3000 et Vite sur le port 5173. La sonde locale est disponible à `GET /api/health`.

## Commandes utiles

```bash
# Vérifier le frontend de production
npm run build --prefix frontend

# Vérifier la syntaxe CommonJS du backend
find backend/src -type f -name '*.js' -print0 | xargs -0 -n1 node --check
```

## Conventions

Utilise des versions exactes dans les manifestes npm. N'édite pas les lockfiles à la main. Toute évolution d'API met à jour sa documentation et ses tests.
