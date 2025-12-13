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
- npm ou yarn

### Installation des dépendances

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

## 🗄️ Base de données

### Application des migrations

**⚠️ IMPORTANT : Sauvegardez votre base de données avant d'appliquer les migrations !**

```bash
# Sauvegarde (Windows PowerShell)
Copy-Item db\app.db db\app.db.backup

# Application de la migration
cd backend
npm run migrate
```

Pour plus de détails, consultez le [Guide de migration](MIGRATION.md).

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

### Backend

```bash
cd backend
npm run dev    # Mode développement avec nodemon
# ou
npm start      # Mode production
```

Le serveur démarre sur `http://localhost:3000` (par défaut).

### Frontend

```bash
cd frontend
npm run dev    # Mode développement
# ou
npm run build  # Build pour production
```

L'application démarre sur `http://localhost:5173` (par défaut).

## 📚 Documentation

- [Architecture des commandes](CommandesArchi.md) : Documentation complète de l'architecture
- [Guide de migration](MIGRATION.md) : Instructions pour appliquer les migrations

## 🔧 Scripts disponibles

### Backend

- `npm run dev` : Démarre le serveur en mode développement
- `npm start` : Démarre le serveur en mode production
- `npm run migrate` : Applique le schéma complet depuis `schema.sql`
- `npm run migrate:groupes` : Crée/met à jour les tables de groupes

### Frontend

- `npm run dev` : Démarre le serveur de développement
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

Pour plus de détails, consultez [CommandesArchi.md](CommandesArchi.md).

## 🔒 Sécurité

- Application destinée à une seule utilisatrice
- Hébergée sur un NAS privé
- Pas d'authentification requise (accès local uniquement)

## 📄 Licence

Projet privé - Usage personnel
