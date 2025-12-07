# Architecture Technique - Gestion des Clients

## 📋 Table des matières
1. [Vue d'ensemble de l'architecture](#vue-densemble)
2. [Backend - Couche Base de Données](#backend-db)
3. [Backend - Couche API REST](#backend-api)
4. [Frontend - Store Pinia](#frontend-store)
5. [Communication Front-Back](#communication)
6. [Frontend - Interface Utilisateur](#frontend-ui)
7. [Flux de données complet](#flux-donnees)

---

## 🏗️ Vue d'ensemble de l'architecture {#vue-densemble}

L'application suit une architecture **3-tiers** classique :

```
┌─────────────────────────────────────────┐
│   Frontend (Vue.js)                      │
│   - Interface utilisateur               │
│   - Store Pinia (gestion d'état)        │
└──────────────┬──────────────────────────┘
               │ HTTP (REST API)
               │ JSON
┌──────────────▼──────────────────────────┐
│   Backend (Express.js)                   │
│   - Routes API REST                      │
│   - Validation des données               │
│   - Gestion des erreurs HTTP             │
└──────────────┬──────────────────────────┘
               │ SQL Queries
┌──────────────▼──────────────────────────┐
│   Base de données (SQLite)              │
│   - Table: clients                       │
│   - better-sqlite3                       │
└─────────────────────────────────────────┘
```

### Technologies utilisées
- **Backend** : Node.js + Express.js + better-sqlite3
- **Frontend** : Vue.js 3 + Pinia + Vue Router
- **Base de données** : SQLite
- **Communication** : HTTP REST API (JSON)

---

## 🗄️ Backend - Couche Base de Données (`db.js`) {#backend-db}

### Rôle
Le fichier `db.js` contient toutes les fonctions qui interagissent directement avec la base de données SQLite. C'est la **couche d'accès aux données** (Data Access Layer).

### Configuration initiale

```javascript
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '../../db/app.db');
const db = new Database(dbPath);
```

**Explication technique** :
- `better-sqlite3` : bibliothèque synchrone pour SQLite (contrairement à `sqlite3` qui est asynchrone)
- `db.prepare()` : compile une requête SQL en une requête préparée réutilisable
- Les requêtes préparées sont **plus rapides** et **plus sûres** (protection contre les injections SQL)

### Fonction 1 : `getAllClients()` - READ (Tous)

```javascript
function getAllClients() {
  const stmt = db.prepare('SELECT * FROM clients ORDER BY nom, prenom');
  return stmt.all();
}
```

**Détails techniques** :
- **Synchrone** : pas de `async/await` car `better-sqlite3` est synchrone
- `stmt.all()` : exécute la requête et retourne **tous les résultats** sous forme de tableau
- Retourne directement un tableau d'objets JavaScript

**Exemple de retour** :
```javascript
[
  { id: 1, nom: 'Dupont', prenom: 'Marie', email: '...', ... },
  { id: 2, nom: 'Martin', prenom: 'Sophie', email: '...', ... }
]
```

### Fonction 2 : `getClientById(id)` - READ (Un seul)

```javascript
function getClientById(id) {
  const stmt = db.prepare('SELECT * FROM clients WHERE id = ?');
  return stmt.get(id);
}
```

**Détails techniques** :
- `?` : **paramètre lié** (bound parameter) - remplace `?` par la valeur de `id`
- `stmt.get(id)` : exécute et retourne **un seul résultat** ou `undefined` si non trouvé
- Protection contre les injections SQL : la valeur est automatiquement échappée

**Pourquoi `?` au lieu de concaténation ?**
```javascript
// ❌ DANGEREUX (injection SQL possible)
db.prepare(`SELECT * FROM clients WHERE id = ${id}`)

// ✅ SÉCURISÉ (échappement automatique)
db.prepare('SELECT * FROM clients WHERE id = ?')
```

### Fonction 3 : `createClient(clientData)` - CREATE

```javascript
function createClient(clientData) {
  const {
    nom,
    prenom,
    date_naissance = null,
    adresse = null,
    // ... autres champs avec valeurs par défaut
  } = clientData;

  const stmt = db.prepare(`
    INSERT INTO clients 
    (nom, prenom, date_naissance, adresse, ...)
    VALUES (?, ?, ?, ?, ...)
  `);

  const result = stmt.run(
    nom, prenom, date_naissance, adresse, ...
  );

  return getClientById(result.lastInsertRowid);
}
```

**Détails techniques** :
- **Déstructuration avec valeurs par défaut** : `date_naissance = null` permet de gérer les champs optionnels
- `stmt.run()` : exécute une requête de **modification** (INSERT, UPDATE, DELETE)
- `result.lastInsertRowid` : contient l'ID auto-généré par SQLite (AUTOINCREMENT)
- Retourne le client créé en le récupérant immédiatement avec `getClientById()`

**Objet `result` retourné par `stmt.run()`** :
```javascript
{
  changes: 1,              // Nombre de lignes modifiées
  lastInsertRowid: 42     // ID du dernier élément inséré
}
```

### Fonction 4 : `updateClient(id, clientData)` - UPDATE

```javascript
function updateClient(id, clientData) {
  const { nom, prenom, ... } = clientData;

  const stmt = db.prepare(`
    UPDATE clients 
    SET nom = ?, prenom = ?, ...
    WHERE id = ?
  `);

  const result = stmt.run(nom, prenom, ..., id);

  if (result.changes === 0) {
    return null; // Client non trouvé
  }

  return getClientById(id);
}
```

**Détails techniques** :
- `result.changes` : nombre de lignes modifiées (0 si aucun client avec cet ID)
- Retourne `null` si le client n'existe pas (permettant au backend de renvoyer 404)
- Retourne le client mis à jour pour confirmer les modifications

### Fonction 5 : `deleteClient(id)` - DELETE

```javascript
function deleteClient(id) {
  const stmt = db.prepare('DELETE FROM clients WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}
```

**Détails techniques** :
- Retourne un **booléen** : `true` si supprimé, `false` si non trouvé
- Simple et efficace pour la gestion des erreurs côté API

---

## 🌐 Backend - Couche API REST (`index.js`) {#backend-api}

### Rôle
Le fichier `index.js` expose les **endpoints HTTP** qui utilisent les fonctions de `db.js`. C'est la **couche de présentation** (Presentation Layer).

### Configuration Express

```javascript
const express = require('express')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
```

**Explication technique** :
- `cors()` : **Cross-Origin Resource Sharing** - autorise les requêtes depuis le frontend (port différent)
- `express.json()` : **middleware** qui parse automatiquement le body JSON des requêtes POST/PUT
- Sans `express.json()`, `req.body` serait `undefined`

### Route 1 : GET `/api/clients` - Liste tous les clients

```javascript
app.get('/api/clients', (req, res) => {
  try {
    const clients = getAllClients();
    res.json(clients);
  } catch (err) {
    console.error('Erreur lecture clients SQLite:', err);
    res.status(500).json({ error: 'Erreur interne serveur' });
  }
});
```

**Détails techniques** :
- `app.get()` : route HTTP GET
- `req` : objet **request** (contient les données de la requête)
- `res` : objet **response** (méthodes pour envoyer la réponse)
- `res.json()` : envoie une réponse JSON avec le header `Content-Type: application/json`
- `res.status(500)` : définit le code HTTP (500 = erreur serveur)
- **Pas de `async/await`** : car `getAllClients()` est synchrone

**Codes HTTP utilisés** :
- `200` : Succès (par défaut)
- `500` : Erreur serveur

### Route 2 : GET `/api/clients/:id` - Récupère un client

```javascript
app.get('/api/clients/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const client = getClientById(id);
    if (!client) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    res.json(client);
  } catch (err) {
    console.error('Erreur lecture client SQLite:', err);
    res.status(500).json({ error: 'Erreur interne serveur' });
  }
});
```

**Détails techniques** :
- `:id` : **paramètre de route** - accessible via `req.params.id`
- `parseInt()` : convertit la string en nombre
- `isNaN()` : vérifie si ce n'est pas un nombre (validation)
- `return` : arrête l'exécution de la fonction (important pour éviter d'exécuter `res.json()` après une erreur)
- Codes HTTP : `400` (Bad Request), `404` (Not Found), `500` (Server Error)

### Route 3 : POST `/api/clients` - Crée un client

```javascript
app.post('/api/clients', (req, res) => {
  try {
    const { nom, prenom } = req.body;

    // Validation des champs obligatoires
    if (!nom || !prenom) {
      return res.status(400).json({ error: 'Les champs nom et prénom sont obligatoires' });
    }

    const newClient = createClient(req.body);
    res.status(201).json(newClient);
  } catch (err) {
    console.error('Erreur création client SQLite:', err);
    
    // Gestion des erreurs de contrainte unique (email)
    if (err.message && err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Un client avec cet email existe déjà' });
    }
    
    res.status(500).json({ error: 'Erreur interne serveur' });
  }
});
```

**Détails techniques** :
- `app.post()` : route HTTP POST
- `req.body` : contient les données JSON envoyées par le client (grâce à `express.json()`)
- **Validation manuelle** : vérifie que `nom` et `prenom` existent
- `res.status(201)` : code HTTP pour "Created" (ressource créée)
- **Gestion d'erreur spécifique** : détecte les erreurs de contrainte UNIQUE (email dupliqué)
- Code HTTP `409` : Conflict (ressource existe déjà)

**Exemple de requête** :
```http
POST /api/clients
Content-Type: application/json

{
  "nom": "Dupont",
  "prenom": "Marie",
  "email": "marie@example.com"
}
```

### Route 4 : PUT `/api/clients/:id` - Met à jour un client

```javascript
app.put('/api/clients/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const { nom, prenom } = req.body;
    if (!nom || !prenom) {
      return res.status(400).json({ error: 'Les champs nom et prénom sont obligatoires' });
    }

    const updatedClient = updateClient(id, req.body);
    if (!updatedClient) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    res.json(updatedClient);
  } catch (err) {
    // ... gestion d'erreurs
  }
});
```

**Détails techniques** :
- `app.put()` : route HTTP PUT (mise à jour complète)
- Même logique de validation que POST
- `updateClient()` retourne `null` si non trouvé → code 404

### Route 5 : DELETE `/api/clients/:id` - Supprime un client

```javascript
app.delete('/api/clients/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const deleted = deleteClient(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    res.status(204).send();
  } catch (err) {
    // ... gestion d'erreurs
  }
});
```

**Détails techniques** :
- `app.delete()` : route HTTP DELETE
- `res.status(204)` : "No Content" - succès mais pas de contenu à retourner
- `res.send()` : envoie une réponse vide (pas de JSON)

---

## 🎯 Frontend - Store Pinia (`stores/clients.js`) {#frontend-store}

### Rôle
Le store Pinia centralise la **gestion d'état** et les **appels API** côté frontend. C'est la couche de communication avec le backend.

### Structure du store

```javascript
export const useClientsStore = defineStore('clients', {
  state: () => ({
    clients: [],
    isLoading: false,
    error: null,
    editingClient: null
  }),
  actions: { ... }
})
```

**Explication technique** :
- `defineStore()` : fonction Pinia pour créer un store réactif
- `state()` : fonction qui retourne l'état initial (doit être une fonction pour éviter le partage d'état)
- Les propriétés du state sont **réactives** : Vue détecte automatiquement les changements

### Fonctions asynchrones - Explication détaillée

#### Pourquoi `async/await` ?

Les fonctions du store sont **asynchrones** car :
1. `fetch()` est une API **asynchrone** du navigateur
2. Les requêtes HTTP prennent du temps (réseau)
3. On ne veut pas bloquer l'interface pendant l'attente

#### Pattern utilisé dans toutes les actions

```javascript
async maFonction() {
  // 1. Activer le chargement
  this.isLoading = true
  this.error = null

  try {
    // 2. Faire la requête HTTP (asynchrone)
    const res = await fetch(...)
    
    // 3. Vérifier le succès
    if (!res.ok) throw new Error(...)
    
    // 4. Traiter la réponse
    const data = await res.json()
    this.clients = data
    
  } catch (err) {
    // 5. Gérer les erreurs
    this.error = err.message
    throw err  // Propager l'erreur pour le composant
  } finally {
    // 6. Toujours désactiver le chargement
    this.isLoading = false
  }
}
```

### Action 1 : `fetchClients()` - READ (Tous)

```javascript
async fetchClients() {
  this.isLoading = true
  this.error = null

  try {
    const res = await fetch(API_URL)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    this.clients = await res.json()
  } catch (err) {
    this.error = err.message
  } finally {
    this.isLoading = false
  }
}
```

**Détails techniques** :
- `fetch(API_URL)` : fait une requête HTTP GET (par défaut)
- `await` : attend que la promesse se résolve
- `res.ok` : booléen (true si status 200-299)
- `await res.json()` : parse le JSON de la réponse (asynchrone aussi)
- `finally` : s'exécute **toujours**, même en cas d'erreur

**Flux d'exécution** :
```
1. isLoading = true  (interface affiche "Chargement...")
2. fetch() démarre    (requête réseau en cours)
3. await → pause     (attente de la réponse)
4. res.json() parse   (conversion JSON → objet JS)
5. this.clients = ... (mise à jour du state → Vue réagit)
6. isLoading = false  (interface cache "Chargement...")
```

### Action 2 : `createClient(clientData)` - CREATE

```javascript
async createClient(clientData) {
  this.isLoading = true
  this.error = null

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(clientData)
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Erreur lors de la création')
    }

    const newClient = await res.json()
    this.clients.push(newClient)
    return newClient
  } catch (err) {
    this.error = err.message
    throw err
  } finally {
    this.isLoading = false
  }
}
```

**Détails techniques** :
- `method: 'POST'` : spécifie la méthode HTTP
- `headers` : métadonnées de la requête
  - `Content-Type: application/json` : indique qu'on envoie du JSON
- `body: JSON.stringify(clientData)` : convertit l'objet JS en string JSON
- `this.clients.push(newClient)` : **mise à jour optimiste** - ajoute immédiatement à la liste
- `throw err` : propage l'erreur pour que le composant puisse la gérer

**Exemple d'utilisation** :
```javascript
try {
  await clientsStore.createClient({ nom: 'Dupont', prenom: 'Marie' })
  // Succès : le client est dans la liste
} catch (err) {
  // Erreur : afficher un message à l'utilisateur
  alert('Erreur : ' + err.message)
}
```

### Action 3 : `updateClient(id, clientData)` - UPDATE

```javascript
async updateClient(id, clientData) {
  // ... chargement et requête

  const updatedClient = await res.json()
  const index = this.clients.findIndex(c => c.id === id)
  if (index !== -1) {
    this.clients[index] = updatedClient
  }
  return updatedClient
}
```

**Détails techniques** :
- `findIndex()` : trouve l'index du client dans le tableau
- `this.clients[index] = updatedClient` : remplace l'ancien par le nouveau
- **Mise à jour optimiste** : la liste est mise à jour immédiatement

### Action 4 : `deleteClient(id)` - DELETE

```javascript
async deleteClient(id) {
  // ... requête DELETE

  this.clients = this.clients.filter(c => c.id !== id)
}
```

**Détails techniques** :
- `filter()` : crée un **nouveau tableau** sans le client supprimé
- **Réactivité Vue** : Vue détecte le changement de référence du tableau

### Actions d'édition

```javascript
setEditingClient(client) {
  this.editingClient = client ? { ...client } : null
}

clearEditingClient() {
  this.editingClient = null
}
```

**Détails techniques** :
- `{ ...client }` : **spread operator** - crée une copie superficielle de l'objet
- Pourquoi une copie ? Pour éviter de modifier directement l'original dans le tableau

---

## 🔄 Communication Front-Back {#communication}

### Flux de données complet

#### Exemple : Créer un client

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Utilisateur clique sur "Ajouter un client"               │
│    (Composant Vue)                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Composant appelle :                                       │
│    await clientsStore.createClient({ nom: '...', ... })     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Store fait la requête HTTP :                              │
│    fetch('http://localhost:3000/api/clients', {              │
│      method: 'POST',                                        │
│      body: JSON.stringify({ nom: '...', ... })              │
│    })                                                        │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP Request
                     │ POST /api/clients
                     │ Body: {"nom":"Dupont","prenom":"Marie"}
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Backend Express reçoit la requête                        │
│    - express.json() parse le body                            │
│    - Route POST /api/clients s'exécute                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Backend appelle :                                         │
│    createClient(req.body)                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. db.js exécute la requête SQL :                           │
│    INSERT INTO clients (nom, prenom, ...)                   │
│    VALUES (?, ?, ...)                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. SQLite retourne le résultat                              │
│    { lastInsertRowid: 42 }                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. db.js récupère le client créé :                          │
│    return getClientById(42)                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. Backend envoie la réponse HTTP :                         │
│    res.status(201).json(newClient)                         │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP Response
                     │ Status: 201 Created
                     │ Body: {"id":42,"nom":"Dupont",...}
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. Store reçoit la réponse :                               │
│     const newClient = await res.json()                       │
│     this.clients.push(newClient)                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 11. Vue détecte le changement du state                      │
│     → L'interface se met à jour automatiquement             │
└─────────────────────────────────────────────────────────────┘
```

### Format des données

#### Requête HTTP (Frontend → Backend)
```http
POST /api/clients HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "nom": "Dupont",
  "prenom": "Marie",
  "email": "marie@example.com",
  "telephone_raw": "06 12 34 56 78"
}
```

#### Réponse HTTP (Backend → Frontend)
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": 42,
  "nom": "Dupont",
  "prenom": "Marie",
  "email": "marie@example.com",
  "telephone_raw": "06 12 34 56 78",
  "created_at": "2024-01-15 10:30:00"
}
```

### Gestion des erreurs

#### Exemple : Email déjà existant

```
1. Frontend envoie POST avec email existant
2. Backend essaie INSERT → Erreur SQLite "UNIQUE constraint"
3. Backend catch l'erreur → res.status(409).json({ error: '...' })
4. Frontend reçoit res.ok = false
5. Store throw new Error(...)
6. Composant catch l'erreur → Affiche message à l'utilisateur
```

---

## 🎨 Frontend - Interface Utilisateur {#frontend-ui}

### Architecture Vue Router

```
/ (Dashboard)
  ├── DashboardView.vue (3 cartes)
  └── /clients (Liste détaillée)
      └── ClientsListView.vue (CRUD complet)
```

### Composants principaux

1. **DashboardView.vue** : Page d'accueil avec 3 cartes
2. **ClientsListView.vue** : Page détaillée de gestion des clients
3. **ClientForm.vue** : Formulaire réutilisable pour créer/modifier

### Utilisation du store dans les composants

```javascript
import { useClientsStore } from '../stores/clients'

const clientsStore = useClientsStore()

// Accéder au state (réactif)
const clients = computed(() => clientsStore.clients)
const isLoading = computed(() => clientsStore.isLoading)

// Appeler les actions
await clientsStore.fetchClients()
await clientsStore.createClient(data)
```

**Points importants** :
- `computed()` : crée une propriété réactive qui se met à jour automatiquement
- `await` : attend la fin de l'action asynchrone
- Vue détecte les changements du store et met à jour l'interface

---

## 📊 Flux de données complet - Exemple READ {#flux-donnees}

### Scénario : Afficher la liste des clients au chargement

```
1. Composant ClientsListView.vue se monte
   ↓
2. onMounted() s'exécute
   ↓
3. clientsStore.fetchClients() est appelé
   ↓
4. Store : isLoading = true
   ↓
5. Store : fetch('http://localhost:3000/api/clients')
   ↓
6. Requête HTTP GET vers le backend
   ↓
7. Backend : app.get('/api/clients') s'exécute
   ↓
8. Backend : getAllClients() est appelé
   ↓
9. db.js : SELECT * FROM clients ORDER BY nom, prenom
   ↓
10. SQLite retourne les données
   ↓
11. db.js retourne le tableau de clients
   ↓
12. Backend : res.json(clients)
   ↓
13. Réponse HTTP 200 avec JSON
   ↓
14. Store : await res.json() parse le JSON
   ↓
15. Store : this.clients = données
   ↓
16. Store : isLoading = false
   ↓
17. Vue détecte le changement de clients
   ↓
18. Composant : v-for affiche les clients
   ↓
19. Interface utilisateur mise à jour
```

---

## 🔑 Points techniques clés à retenir

### Backend
- **better-sqlite3** : synchrone (pas besoin d'async/await)
- **Requêtes préparées** : sécurité et performance
- **Validation** : toujours valider les données avant insertion
- **Codes HTTP** : utiliser les bons codes (200, 201, 400, 404, 409, 500)

### Frontend
- **async/await** : nécessaire pour fetch() (asynchrone)
- **Pinia store** : centralise la logique API
- **Réactivité Vue** : Vue détecte automatiquement les changements du store
- **Gestion d'erreurs** : toujours utiliser try/catch avec les fonctions async

### Communication
- **HTTP REST** : méthode standard de communication
- **JSON** : format d'échange de données
- **CORS** : nécessaire pour autoriser les requêtes cross-origin
- **Headers** : Content-Type important pour le parsing JSON

---

## 📝 Résumé de l'architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vue.js)                         │
│                                                              │
│  Composants Vue                                              │
│    ↓                                                         │
│  Store Pinia (clients.js)                                    │
│    - Gestion d'état                                          │
│    - Appels API avec fetch()                                 │
│    - Fonctions async/await                                   │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP REST API
                     │ (JSON)
┌────────────────────▼────────────────────────────────────────┐
│                    BACKEND (Express.js)                       │
│                                                              │
│  Routes API (index.js)                                       │
│    - Validation                                              │
│    - Gestion erreurs HTTP                                    │
│    ↓                                                         │
│  Fonctions DB (db.js)                                        │
│    - Requêtes SQL préparées                                 │
│    - Logique métier                                          │
└────────────────────┬────────────────────────────────────────┘
                     │ SQL Queries
┌────────────────────▼────────────────────────────────────────┐
│              BASE DE DONNÉES (SQLite)                        │
│                                                              │
│  Table: clients                                              │
│    - Structure définie dans schema.sql                      │
│    - Données initiales dans clientsInit.sql                 │
└─────────────────────────────────────────────────────────────┘
```

---

**Document créé le** : 2024  
**Version** : 1.0  
**Auteur** : Architecture technique complète du système de gestion des clients

