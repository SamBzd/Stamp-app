# Stamp App - Application de gestion de commandes

Application de gestion de clientes et commandes pour une utilisatrice unique, hébergée sur un NAS.

## 📋 Structure du projet

```
Stamp-app/
├── backend/          # API Express.js + SQLite
│   └── src/
│       ├── db.js              # Fonctions d'accès aux données
│       ├── index.js           # Serveur Express
│       ├── migrate.js         # Script de migration principal
│       └── migrate-groupes.js # Script de migration groupes
├── frontend/         # Application Vue.js
│   └── src/
│       ├── components/        # Composants Vue
│       ├── views/            # Vues de l'application
│       └── stores/           # Stores Pinia
├── db/               # Base de données SQLite
│   ├── app.db        # Base de données
│   └── schema.sql    # Schéma SQL complet
└── docs/             # Documentation
    ├── CommandesArchi.md  # Architecture des commandes
    └── MIGRATION.md       # Guide de migration
```

## 🚀 Installation

### Prérequis

- Node.js (v16 ou supérieur)
- npm (v8 ou supérieur)

### Installation des dépendances (centralisée)

**Une seule commande pour installer toutes les dépendances :**

```bash
# À la racine du projet
npm run install:all
```

Cette commande installe automatiquement :
- Les dépendances de la racine (concurrently)
- Les dépendances du backend
- Les dépendances du frontend

**Note :** Les versions sont fixées (sans `^`) pour garantir la reproductibilité.

## 🗄️ Base de données

### Structure de la base de données

Le système utilise les tables suivantes :

- `clients` : Liste des clientes
- `collections` : Collections individuelles
- `groupes_collections` : Groupes de collections avec format (A, B, C)
- `groupe_collections` : Liaison groupes ↔ collections
- `commandes` : Commandes des clientes
- `commande_collections` : Liaison commandes ↔ collections

Pour plus de détails, consultez [CommandesArchi.md](CommandesArchi.md).

## 🏃 Démarrage

### Démarrage en mode développement (recommandé)

**Une seule commande pour lancer backend + frontend :**

```bash
# À la racine du projet
npm run dev
```

Cette commande lance simultanément :
- **Backend** sur `http://localhost:3000` (avec nodemon pour le rechargement automatique)
- **Frontend** sur `http://localhost:5173` (avec Vite pour le hot-reload)

Les logs sont colorés pour distinguer facilement les deux services :
- 🔵 **Backend** (en bleu)
- 🟢 **Frontend** (en vert)

### Démarrage manuel (si nécessaire)

Si vous préférez lancer les services séparément :

```bash
# Backend uniquement
cd backend
npm run dev

# Frontend uniquement (dans un autre terminal)
cd frontend
npm run dev
```

## 🔧 Scripts disponibles

### Scripts racine (recommandés)

- `npm run install:all` : Installe toutes les dépendances (racine, backend, frontend)
- `npm run dev` : Lance backend + frontend en mode développement (une seule commande)

### Scripts backend (dans `backend/`)

- `npm run dev` : Démarre le serveur en mode développement avec nodemon
- `npm start` : Démarre le serveur en mode production

### Scripts frontend (dans `frontend/`)

- `npm run dev` : Démarre le serveur de développement Vite
- `npm run build` : Build pour la production
- `npm run preview` : Prévisualise le build de production

## 📝 Fonctionnalités

### Gestion des clientes (CRUD)
- Créer, lire, modifier, supprimer des clientes
- Gestion des informations de contact

### Gestion des groupes de collections (CRUD)
- Créer des groupes avec format (A, B, C), prix et taille
- Ajouter/supprimer/modifier des collections dans un groupe
- Nombre variable de collections par groupe (1 à N)

### Gestion des commandes (CRUD)
- Créer des commandes liées à une cliente
- Sélectionner un groupe et les collections à inclure
- Gérer les options : papier supplémentaire, articles supplémentaires
- Méthode de paiement (Paypal, chèque, virement)
- Statut de règlement (réglée/non réglée)

## 🏗️ Architecture

L'application suit une architecture en 3 niveaux :

1. **Frontend** (Vue.js) : Interface utilisateur
2. **Backend** (Express.js) : API REST
3. **Base de données** (SQLite) : Stockage des données

## 🔒 Sécurité

- Application destinée à une seule utilisatrice
- Hébergée sur un NAS privé
- Pas d'authentification requise (accès local uniquement)

## 📄 Licence

Projet privé - Usage personnel
