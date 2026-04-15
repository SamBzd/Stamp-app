# Stamp App — Instructions pour Claude

## Contexte projet
Application de gestion de commandes pour une seule utilisatrice, hébergée sur un NAS.
Projet personnel, pas d'authentification. Une seule utilisatrice.

**On travaille actuellement sur la v2.** Le plan complet est dans `PlanV2.md`. Le lire en début de session si ce n'est pas déjà fait.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | Vue.js 3 (Composition API) + Pinia + Vue Router |
| Backend | Express.js 5 (CommonJS) |
| Base de données | SQLite via `better-sqlite3` |
| Build frontend | Vite |
| Dev runner | `concurrently` |

---

## Commandes

```bash
# Installer toutes les dépendances (racine + backend + frontend)
npm run install:all

# Lancer backend + frontend en dev
npm run dev

# Backend seul (port 3000)
cd backend && npm run dev

# Frontend seul (port 5173)
cd frontend && npm run dev

# Vérifier que le backend tourne
curl http://localhost:3000/api/health
```

---

## Structure

```
Stamp-app/
├── backend/
│   └── src/
│       ├── index.js          # Serveur Express, enregistrement des routes
│       ├── db/               # Accès BDD (fonctions better-sqlite3)
│       └── routes/           # Une route par entité
├── frontend/
│   └── src/
│       ├── views/            # Pages (une par section de l'app)
│       ├── components/       # Composants réutilisables
│       ├── stores/           # Stores Pinia (une par entité)
│       ├── services/api.js   # Appels HTTP centralisés
│       └── router/           # Vue Router
└── db/
    ├── app.db                # Base SQLite
    └── schema.sql            # Schéma de référence (à tenir à jour)
```

---

## Conventions backend

- Framework : Express.js en **CommonJS** (`require`, pas `import`)
- Une route par fichier dans `backend/src/routes/`
- Chaque nouveau fichier de route doit être enregistré dans `backend/src/index.js`
- BDD : toutes les requêtes SQL passent par des fonctions dans `backend/src/db/`
- Réponses API : toujours `res.json({...})`, erreurs avec le bon code HTTP
- Pas de ORM — SQL brut via `better-sqlite3`

## Conventions frontend

- **Composition API uniquement** (`<script setup>`)
- État global dans les stores Pinia (`frontend/src/stores/`)
- Appels API centralisés dans `frontend/src/services/api.js`
- Composants UI réutilisables dans `frontend/src/components/`
- Pas de logique métier dans les composants — elle va dans les stores

---

## Base de données

- Fichier : `db/app.db`
- Après toute modification du schéma, mettre à jour `db/schema.sql`
- **Ne jamais modifier `app.db` directement** sans passer par une migration ou un reset contrôlé
- En dev v2 : on repart d'un schéma vierge (reset complet, pas de migration)

---

## Règles importantes

- Toujours lire les fichiers existants avant de modifier ou créer du code
- Ne pas modifier le frontend avant que le backend correspondant soit testé
- Chaque phase du plan doit être validée (curl ou test manuel) avant de passer à la suivante
- Ne pas ajouter de dépendances sans que ce soit nécessaire
