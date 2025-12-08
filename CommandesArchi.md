# Architecture Technique - Gestion des Commandes et Groupes de Collections

## 📋 Table des matières
1. [Vue d'ensemble de l'architecture](#vue-densemble)
2. [Structure de la base de données](#structure-db)
3. [Concepts clés](#concepts-cles)
4. [Relations entre les tables](#relations-tables)
5. [Contraintes et règles métier](#contraintes-regles)
6. [Système de migrations](#migrations)
7. [Points techniques importants](#points-techniques)

---

## 🏗️ Vue d'ensemble de l'architecture {#vue-densemble}

Le système de gestion des commandes repose sur une architecture en **3 niveaux** :

```
┌─────────────────────────────────────────┐
│   Frontend (Vue.js)                     │
│   - Interface de création de commandes  │
│   - Sélection de groupes de collections │
└──────────────┬──────────────────────────┘
               │ HTTP (REST API)
               │ JSON
┌──────────────▼──────────────────────────┐
│   Backend (Express.js)                  │
│   - Routes API REST pour commandes      │
│   - Validation des formats              │
│   - Gestion des groupes                 │
└──────────────┬──────────────────────────┘
               │ SQL Queries
┌──────────────▼──────────────────────────┐
│   Base de données (SQLite)              │
│   - Tables: commandes, collections,     │
│     groupes_collections, etc.           │
│   - Triggers de validation              │
│   - Contraintes d'intégrité             │
└─────────────────────────────────────────┘
```

### Technologies utilisées
- **Backend** : Node.js + Express.js + better-sqlite3
- **Base de données** : SQLite avec triggers et contraintes
- **Migrations** : Scripts Node.js pour appliquer les schémas
- **Communication** : HTTP REST API (JSON)

---

## 🗄️ Structure de la base de données {#structure-db}

### Vue d'ensemble des tables

Le système utilise **5 tables principales** organisées en 3 niveaux :

```
┌─────────────────────────────────────────────────────────┐
│  NIVEAU 1 : Collections individuelles                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │ collections                                      │   │
│  │ - id, nom (unique), created_at                   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        ▲
                        │ (référencée par)
                        │
┌─────────────────────────────────────────────────────────┐
│  NIVEAU 2 : Groupes de 3 collections                    │
│  ┌──────────────────────────┐  ┌──────────────────────┐ │
│  │ groupes_collections      │  │ groupe_collections   │ │
│  │ - id, nom, description   │  │ - groupe_id          │ │
│  │                          │  │ - collection_id      │ │
│  │                          │  │ - ordre (1,2,3)      │ │
│  └──────────────────────────┘  └──────────────────────┘ │
│         ▲                              ▲                │
│         │                              │                │
│         └──────────┬───────────────────┘                │
│                    │ (exactement 3 collections)         │
└─────────────────────────────────────────────────────────┘
                     ▲
                     │ (utilisé dans)
                     │
┌──────────────────────────────────────────────────────────┐
│  NIVEAU 3 : Commandes                                    │
│  ┌───────────────────────────┐  ┌──────────────────────┐ │
│  │ commandes                 │  │ commande_collections │ │
│  │ - id, client_id           │  │ - commande_id        │ │
│  │ - format_type (A/B/C)     │  │ - groupe_id          │ │
│  │ - papier_supplementaire   │  │ - ordre_collection   │ │
│  │ - format_description      │  │   (1,2,3)            │ │
│  │ - format_prix             │  │ - ordre_commande     │ │
│  │ - articles_supplementaires│  │   (1,2)              │ │
│  │ - methode_paiement        │  │                      │ │
│  └───────────────────────────┘  └──────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Table 1 : `collections`

**Rôle** : Stocke les collections individuelles réutilisables.

**Structure** :
- `id` : Identifiant unique (INTEGER PRIMARY KEY AUTOINCREMENT)
- `nom` : Nom de la collection (TEXT NOT NULL UNIQUE)
- `created_at` : Date de création (TEXT DEFAULT datetime('now'))

**Caractéristiques** :
- Une collection peut être utilisée dans **plusieurs groupes**
- Le nom est **unique** pour éviter les doublons
- Collections réutilisables dans différentes combinaisons

**Exemple** :
```sql
INSERT INTO collections (nom) VALUES 
  ('Collection Printemps'),
  ('Collection Été'),
  ('Collection Automne');
```

### Table 2 : `groupes_collections`

**Rôle** : Représente un groupe de 3 collections qui seront toujours utilisées ensemble.

**Structure** :
- `id` : Identifiant unique
- `nom` : Nom du groupe (UNIQUE)
- `description` : Description optionnelle du groupe
- `created_at` : Date de création

**Caractéristiques** :
- Un groupe contient **exactement 3 collections** (garanti par la table de liaison)
- Les groupes sont créés une fois puis réutilisés dans plusieurs commandes
- Le nom est unique pour faciliter la recherche

**Exemple** :
```sql
INSERT INTO groupes_collections (nom, description) VALUES 
  ('Groupe Premium', 'Collections haut de gamme pour occasions spéciales');
```

### Table 3 : `groupe_collections`

**Rôle** : Table de liaison qui associe un groupe à ses 3 collections.

**Structure** :
- `id` : Identifiant unique
- `groupe_id` : Référence au groupe (FOREIGN KEY)
- `collection_id` : Référence à une collection (FOREIGN KEY)
- `ordre` : Position dans le groupe (1, 2 ou 3) - CHECK constraint

**Contraintes importantes** :
- `UNIQUE(groupe_id, ordre)` : Garantit qu'il n'y a qu'une collection par position
- `UNIQUE(groupe_id, collection_id)` : Empêche d'ajouter la même collection deux fois dans un groupe
- `CHECK (ordre IN (1,2,3))` : Limite à 3 collections maximum

**Exemple** :
```sql
-- Groupe ID 1 contient les collections 1, 2, 3 dans cet ordre
INSERT INTO groupe_collections (groupe_id, collection_id, ordre) VALUES
  (1, 1, 1),  -- Collection 1 en position 1
  (1, 2, 2),  -- Collection 2 en position 2
  (1, 3, 3);  -- Collection 3 en position 3
```

### Table 4 : `commandes`

**Rôle** : Table principale qui stocke les informations d'une commande.

**Structure** :
- `id` : Identifiant unique
- `client_id` : Référence au client (FOREIGN KEY vers `clients`)
- `format_type` : Type de format - **A, B ou C** (CHECK constraint)
- `papier_supplementaire` : Option papier supplémentaire (BOOLEAN, stocké comme INTEGER 0/1)
- `format_description` : Description du format choisi
- `format_prix` : Prix du format (REAL)
- `articles_supplementaires` : Champ libre pour articles supplémentaires (TEXT)
- `methode_paiement` : Méthode de paiement - **Paypal, chèque ou virement** (CHECK constraint)
- `created_at` : Date de création
- `updated_at` : Date de mise à jour

**Contraintes importantes** :
- `format_type` : Doit être 'A', 'B' ou 'C'
- `methode_paiement` : Doit être 'Paypal', 'chèque' ou 'virement'
- `papier_supplementaire` : Doit être 0 ou 1

**Exemple** :
```sql
INSERT INTO commandes (
  client_id, format_type, papier_supplementaire, 
  format_description, format_prix, methode_paiement
) VALUES (
  1, 'A', 1, 'Format A4 Premium', 25.50, 'Paypal'
);
```

### Table 5 : `commande_collections`

**Rôle** : Table de liaison qui associe une commande à un groupe de collections, en spécifiant quelle(s) collection(s) du groupe utiliser.

**Structure** :
- `id` : Identifiant unique
- `commande_id` : Référence à la commande (FOREIGN KEY)
- `groupe_id` : Référence au groupe de collections (FOREIGN KEY)
- `ordre_collection` : Quelle collection du groupe utiliser (1, 2 ou 3)
- `ordre_commande` : Position dans la commande (1 ou 2)

**Contraintes importantes** :
- `UNIQUE(commande_id, ordre_commande)` : Garantit qu'il n'y a qu'une collection par position dans la commande
- `CHECK (ordre_collection IN (1,2,3))` : Doit référencer une collection existante dans le groupe
- `CHECK (ordre_commande IN (1,2))` : Maximum 2 collections par commande

**Exemple** :
```sql
-- Commande ID 1 utilise le groupe ID 1
-- Format A : utilise les collections 1 et 2 du groupe
INSERT INTO commande_collections (commande_id, groupe_id, ordre_collection, ordre_commande) VALUES
  (1, 1, 1, 1),  -- Première collection de la commande = collection 1 du groupe
  (1, 1, 2, 2);  -- Deuxième collection de la commande = collection 2 du groupe
```

---

## 🔑 Concepts clés {#concepts-cles}

### 1. Groupes de 3 collections

**Principe** : Les collections sont organisées en **groupes de 3** qui sont créés ensemble et utilisés ensemble.

**Pourquoi cette approche ?**
- **Cohérence** : Les 3 collections d'un groupe sont conçues pour fonctionner ensemble
- **Réutilisabilité** : Un groupe peut être utilisé dans plusieurs commandes
- **Simplicité** : Lors de la création d'une commande, on choisit un groupe plutôt que 3 collections individuelles

**Workflow** :
```
1. Créer 3 collections individuelles
   ↓
2. Créer un groupe et y associer les 3 collections
   ↓
3. Utiliser le groupe dans les commandes
```

### 2. Formats de commande (A, B, C)

Chaque commande a un **format_type** qui détermine le nombre maximum de collections :

| Format | Collections max | Ordre commande autorisé |
|--------|-----------------|-------------------------|
| **A**  | 2               | 1, 2                    |
| **B**  | 2               | 1, 2                    |
| **C**  | 1               | 1 uniquement            |

**Règles métier** :
- Format **A ou B** : La commande peut utiliser jusqu'à 2 collections du groupe (ordre_collection 1 et/ou 2)
- Format **C** : La commande ne peut utiliser qu'1 collection du groupe (ordre_collection 1 uniquement)

**Exemple concret** :
```
Groupe "Premium" contient :
  - Collection 1 : "Printemps"
  - Collection 2 : "Été"
  - Collection 3 : "Automne"

Commande Format A :
  → Utilise Collection 1 et Collection 2 du groupe

Commande Format C :
  → Utilise uniquement Collection 1 du groupe
```

### 3. Ordre dans les groupes vs Ordre dans les commandes

**Deux notions d'ordre différentes** :

1. **`ordre` dans `groupe_collections`** (1, 2, 3)
   - Position de la collection **dans le groupe**
   - Fixe : défini lors de la création du groupe
   - Exemple : Collection "Printemps" est toujours en position 1 du groupe "Premium"

2. **`ordre_commande` dans `commande_collections`** (1, 2)
   - Position de la collection **dans la commande**
   - Variable : dépend de la commande
   - Exemple : Dans une commande Format A, on peut utiliser la collection 1 du groupe en position 1 de la commande, et la collection 2 du groupe en position 2

**`ordre_collection`** : Indique quelle collection du groupe utiliser (1, 2 ou 3)

**Schéma visuel** :
```
Groupe "Premium" :
  ┌─────────────────────────────────┐
  │ ordre=1 : Collection "Printemps"│
  │ ordre=2 : Collection "Été"      │
  │ ordre=3 : Collection "Automne"  │
  └─────────────────────────────────┘

Commande Format A :
  ┌─────────────────────────────────────────────┐
  │ ordre_commande=1                            │
  │   → utilise ordre_collection=1 (Printemps)  │
  │                                             │
  │ ordre_commande=2                            │
  │   → utilise ordre_collection=2 (Été)        │
  └─────────────────────────────────────────────┘
```

---

## 🔗 Relations entre les tables {#relations-tables}

### Schéma relationnel complet

```
clients (1) ──────< (N) commandes
                           │
                           │ (1)
                           │
                           ▼
                    commande_collections (N)
                           │
                           │ (N)
                           │
                           ▼
                    groupes_collections (1)
                           │
                           │ (1)
                           │
                           ▼
                    groupe_collections (N)
                           │
                           │ (N)
                           │
                           ▼
                    collections (1)
```

### Relations détaillées

#### 1. clients → commandes (1:N)
- Un client peut avoir **plusieurs commandes**
- Une commande appartient à **un seul client**
- **CASCADE DELETE** : Si un client est supprimé, ses commandes sont supprimées automatiquement

#### 2. commandes → commande_collections (1:N)
- Une commande peut avoir **1 ou 2 collections** (selon le format)
- Une entrée `commande_collections` appartient à **une seule commande**
- **CASCADE DELETE** : Si une commande est supprimée, ses associations sont supprimées

#### 3. groupes_collections → groupe_collections (1:N)
- Un groupe contient **exactement 3 collections**
- Une entrée `groupe_collections` appartient à **un seul groupe**
- **CASCADE DELETE** : Si un groupe est supprimé, ses associations sont supprimées

#### 4. collections → groupe_collections (1:N)
- Une collection peut être dans **plusieurs groupes**
- Une entrée `groupe_collections` référence **une seule collection**
- **CASCADE DELETE** : Si une collection est supprimée, elle est retirée de tous les groupes

#### 5. groupes_collections → commande_collections (1:N)
- Un groupe peut être utilisé dans **plusieurs commandes**
- Une entrée `commande_collections` référence **un seul groupe**

---

## ⚙️ Contraintes et règles métier {#contraintes-regles}

### Contraintes au niveau base de données

#### 1. Contraintes CHECK

**Format type** :
```sql
CHECK (format_type IN ('A', 'B', 'C'))
```
- Garantit que seuls les formats A, B ou C sont acceptés
- Validation au niveau SQLite

**Méthode de paiement** :
```sql
CHECK (methode_paiement IN ('Paypal', 'chèque', 'virement'))
```
- Limite les valeurs possibles
- Facilite la validation côté application

**Ordre dans les groupes** :
```sql
CHECK (ordre IN (1,2,3))
```
- Garantit exactement 3 collections par groupe
- Empêche d'ajouter une 4ème collection

**Ordre dans les commandes** :
```sql
CHECK (ordre_commande IN (1,2))
```
- Limite à 2 collections maximum par commande
- Format C ne peut utiliser que l'ordre 1 (vérifié par trigger)

#### 2. Contraintes UNIQUE

**Collections** :
```sql
UNIQUE(nom) -- dans collections
```
- Empêche les doublons de noms de collections

**Groupes** :
```sql
UNIQUE(nom) -- dans groupes_collections
```
- Empêche les doublons de noms de groupes

**Groupes-Collections** :
```sql
UNIQUE(groupe_id, ordre)        -- Une seule collection par position
UNIQUE(groupe_id, collection_id) -- Une collection ne peut être 2 fois dans un groupe
```
- Garantit l'intégrité des groupes

**Commandes-Collections** :
```sql
UNIQUE(commande_id, ordre_commande)
```
- Garantit qu'il n'y a qu'une collection par position dans une commande

### Triggers de validation

#### Trigger 1 : Validation format C - Ordre

**Nom** : `check_format_c_collections`

**Rôle** : Empêche d'ajouter une collection avec `ordre_commande != 1` si le format est C.

**Code** :
```sql
CREATE TRIGGER check_format_c_collections
BEFORE INSERT ON commande_collections
FOR EACH ROW
WHEN (
  (SELECT format_type FROM commandes WHERE id = NEW.commande_id) = 'C'
  AND NEW.ordre_commande != 1
)
BEGIN
  SELECT RAISE(ABORT, 'Le format C ne peut avoir qu''une seule collection (ordre_commande = 1)');
END;
```

**Exemple d'erreur** :
```sql
-- Commande avec format_type = 'C'
-- Tentative d'ajouter une collection avec ordre_commande = 2
-- ❌ ERREUR : "Le format C ne peut avoir qu'une seule collection (ordre_commande = 1)"
```

#### Trigger 2 : Validation format C - Nombre maximum

**Nom** : `check_format_c_max_collections`

**Rôle** : Empêche d'ajouter une deuxième collection si le format est C.

**Code** :
```sql
CREATE TRIGGER check_format_c_max_collections
BEFORE INSERT ON commande_collections
FOR EACH ROW
WHEN (
  (SELECT format_type FROM commandes WHERE id = NEW.commande_id) = 'C'
  AND EXISTS (SELECT 1 FROM commande_collections WHERE commande_id = NEW.commande_id)
)
BEGIN
  SELECT RAISE(ABORT, 'Le format C ne peut avoir qu''une seule collection');
END;
```

**Exemple d'erreur** :
```sql
-- Commande Format C avec déjà 1 collection
-- Tentative d'ajouter une deuxième collection
-- ❌ ERREUR : "Le format C ne peut avoir qu'une seule collection"
```

#### Trigger 3 : Validation existence collection dans groupe

**Nom** : `check_collection_exists_in_groupe`

**Rôle** : Vérifie que la collection référencée (`ordre_collection`) existe bien dans le groupe.

**Code** :
```sql
CREATE TRIGGER check_collection_exists_in_groupe
BEFORE INSERT ON commande_collections
FOR EACH ROW
WHEN (
  NOT EXISTS (
    SELECT 1 FROM groupe_collections 
    WHERE groupe_id = NEW.groupe_id 
    AND ordre = NEW.ordre_collection
  )
)
BEGIN
  SELECT RAISE(ABORT, 'La collection à l''ordre spécifié n''existe pas dans ce groupe');
END;
```

**Exemple d'erreur** :
```sql
-- Groupe qui n'a que les collections 1 et 2
-- Tentative d'utiliser ordre_collection = 3
-- ❌ ERREUR : "La collection à l'ordre spécifié n'existe pas dans ce groupe"
```

### Règles métier résumées

| Règle | Description | Validation |
|-------|-------------|------------|
| **Groupes** | Un groupe contient exactement 3 collections | UNIQUE(groupe_id, ordre) + CHECK(ordre IN (1,2,3)) |
| **Format A/B** | Maximum 2 collections par commande | CHECK(ordre_commande IN (1,2)) |
| **Format C** | Maximum 1 collection par commande | Triggers + CHECK(ordre_commande IN (1,2)) |
| **Collections** | Une collection peut être dans plusieurs groupes | Pas de contrainte (relation N:N) |
| **Groupes** | Un groupe peut être utilisé dans plusieurs commandes | Pas de contrainte (relation N:N) |

---

## 🔄 Système de migrations {#migrations}

### Principe

Les migrations permettent d'appliquer les modifications du schéma SQL à la base de données existante de manière **sécurisée et reproductible**.

### Structure des fichiers

```
db/
  ├── schema.sql              # Schéma complet (clients + commandes)
  ├── clientsInit.sql         # Données initiales clients
  └── app.db                  # Base de données SQLite

backend/src/
  ├── migrate.js              # Migration initiale (tables commandes)
  └── migrate-groupes.js      # Migration groupes de collections
```

### Script de migration initiale (`migrate.js`)

**Rôle** : Crée les tables de base pour les commandes.

**Fonctionnement** :
1. Lit le fichier `schema.sql`
2. Extrait la partie après le premier `COMMIT` (section commandes)
3. Exécute le SQL sur la base de données
4. Vérifie que les tables ont été créées

**Utilisation** :
```bash
npm run migrate
```

**Caractéristiques** :
- Utilise `CREATE TABLE IF NOT EXISTS` : **idempotent** (peut être exécuté plusieurs fois)
- Affiche des messages de progression
- Vérifie le résultat après exécution

### Script de migration groupes (`migrate-groupes.js`)

**Rôle** : Met à jour la structure pour ajouter les groupes de collections.

**Fonctionnement** :
1. Supprime l'ancienne table `commande_collections` (si elle existe)
2. Crée les nouvelles tables :
   - `groupes_collections`
   - `groupe_collections`
   - `commande_collections` (nouvelle structure)
3. Crée les index et triggers
4. Vérifie que tout est en place

**Utilisation** :
```bash
npm run migrate:groupes
```

**Caractéristiques** :
- **Destructif** : Supprime l'ancienne table (à utiliser avec précaution)
- Crée les triggers de validation
- Idempotent pour les nouvelles tables

### Bonnes pratiques

1. **Toujours sauvegarder** la base de données avant une migration
2. **Tester** les migrations sur une copie de la base de données
3. **Vérifier** que les migrations sont idempotentes quand possible
4. **Documenter** les changements dans le schéma

---

## 🔧 Points techniques importants {#points-techniques}

### 1. Index pour les performances

**Index créés** :

```sql
-- Recherche rapide des commandes d'un client
CREATE INDEX ix_commandes_client_id ON commandes(client_id);

-- Filtrage par format
CREATE INDEX ix_commandes_format_type ON commandes(format_type);

-- Recherche des collections d'un groupe
CREATE INDEX ix_groupe_collections_groupe_id ON groupe_collections(groupe_id);

-- Recherche des commandes utilisant un groupe
CREATE INDEX ix_commande_collections_groupe_id ON commande_collections(groupe_id);

-- Recherche des collections d'une commande
CREATE INDEX ix_commande_collections_commande_ordre ON commande_collections(commande_id, ordre_commande);
```

**Pourquoi ces index ?**
- Les requêtes `WHERE client_id = ?` sont fréquentes → index sur `client_id`
- Les filtres par format sont courants → index sur `format_type`
- Les jointures entre commandes et groupes sont nombreuses → index sur les clés étrangères

### 2. CASCADE DELETE

**Comportement** :
- Supprimer un client → Toutes ses commandes sont supprimées
- Supprimer une commande → Toutes ses associations `commande_collections` sont supprimées
- Supprimer un groupe → Toutes ses associations `groupe_collections` sont supprimées
- Supprimer une collection → Elle est retirée de tous les groupes

**Avantages** :
- **Intégrité référentielle** : Pas d'orphelins dans la base
- **Simplicité** : Pas besoin de supprimer manuellement les dépendances

**Attention** :
- Supprimer un client supprime **toutes** ses commandes (irréversible)
- Supprimer une collection la retire de **tous** les groupes

### 3. Requêtes préparées (better-sqlite3)

**Exemple** :
```javascript
const stmt = db.prepare('SELECT * FROM commandes WHERE client_id = ?');
const commandes = stmt.all(clientId);
```

**Avantages** :
- **Sécurité** : Protection contre les injections SQL
- **Performance** : La requête est compilée une fois, réutilisée plusieurs fois
- **Simplicité** : Pas besoin de gérer async/await (synchrone)

### 4. Validation à deux niveaux

**Niveau 1 : Base de données** (Triggers + CHECK constraints)
- Garantit l'intégrité même si l'application a un bug
- Dernière ligne de défense

**Niveau 2 : Application** (Backend)
- Validation avant insertion
- Messages d'erreur plus clairs pour l'utilisateur
- Meilleure expérience utilisateur

**Recommandation** : Toujours valider dans l'application ET dans la base de données.

### 5. Structure modulaire

**Séparation des responsabilités** :
- `schema.sql` : Définition de la structure
- `migrate.js` : Application du schéma
- `db.js` : Fonctions d'accès aux données (à créer)
- `index.js` : Routes API (à créer)

**Avantages** :
- **Maintenabilité** : Chaque fichier a un rôle clair
- **Testabilité** : Chaque couche peut être testée indépendamment
- **Évolutivité** : Facile d'ajouter de nouvelles fonctionnalités

---

## 📊 Exemples d'utilisation

### Scénario 1 : Créer un groupe de collections

```sql
-- 1. Créer les collections individuelles
INSERT INTO collections (nom) VALUES 
  ('Collection Printemps'),
  ('Collection Été'),
  ('Collection Automne');

-- 2. Créer le groupe
INSERT INTO groupes_collections (nom, description) VALUES 
  ('Groupe Saisons', 'Collections saisonnières complètes');

-- 3. Associer les 3 collections au groupe
INSERT INTO groupe_collections (groupe_id, collection_id, ordre) VALUES
  (1, 1, 1),  -- Printemps en position 1
  (1, 2, 2),  -- Été en position 2
  (1, 3, 3);  -- Automne en position 3
```

### Scénario 2 : Créer une commande Format A

```sql
-- 1. Créer la commande
INSERT INTO commandes (
  client_id, format_type, papier_supplementaire,
  format_description, format_prix, methode_paiement
) VALUES (
  1, 'A', 1, 'Format A4 Premium', 25.50, 'Paypal'
);

-- 2. Associer le groupe à la commande (utilise collections 1 et 2)
INSERT INTO commande_collections (commande_id, groupe_id, ordre_collection, ordre_commande) VALUES
  (1, 1, 1, 1),  -- Collection 1 du groupe en position 1 de la commande
  (1, 1, 2, 2);  -- Collection 2 du groupe en position 2 de la commande
```

### Scénario 3 : Créer une commande Format C

```sql
-- 1. Créer la commande Format C
INSERT INTO commandes (
  client_id, format_type, papier_supplementaire,
  format_description, format_prix, methode_paiement
) VALUES (
  2, 'C', 0, 'Format C Standard', 15.00, 'chèque'
);

-- 2. Associer le groupe (utilise uniquement collection 1)
INSERT INTO commande_collections (commande_id, groupe_id, ordre_collection, ordre_commande) VALUES
  (2, 1, 1, 1);  -- Collection 1 du groupe en position 1 de la commande

-- ❌ Tentative d'ajouter une deuxième collection (sera bloquée par le trigger)
-- INSERT INTO commande_collections (commande_id, groupe_id, ordre_collection, ordre_commande) VALUES
--   (2, 1, 2, 2);  -- ERREUR : Format C ne peut avoir qu'une seule collection
```

### Scénario 4 : Requête pour récupérer une commande complète

```sql
-- Récupérer une commande avec ses collections
SELECT 
  c.id AS commande_id,
  c.format_type,
  c.methode_paiement,
  gc.nom AS groupe_nom,
  col.nom AS collection_nom,
  cc.ordre_collection,
  cc.ordre_commande
FROM commandes c
JOIN commande_collections cc ON c.id = cc.commande_id
JOIN groupes_collections gc ON cc.groupe_id = gc.id
JOIN groupe_collections gcol ON gc.id = gcol.groupe_id AND gcol.ordre = cc.ordre_collection
JOIN collections col ON gcol.collection_id = col.id
WHERE c.id = 1
ORDER BY cc.ordre_commande;
```

**Résultat** :

commande_id | format_type | methode_paiement | groupe_nom    | collection_nom      | ordre_collection | ordre_commande
------------|-------------|------------------|---------------|---------------------|------------------|---------------
1           | A           | Paypal           | Groupe Saisons| Collection Printemps| 1                | 1
1           | A           | Paypal           | Groupe Saisons| Collection Été      | 2                | 2


---

## 🔑 Points clés à retenir

### Architecture
- **3 niveaux** : Collections → Groupes → Commandes
- **Groupes de 3** : Collections toujours utilisées ensemble
- **Formats** : A/B (max 2 collections) vs C (max 1 collection)

### Base de données
- **Triggers** : Validation automatique des règles métier
- **Contraintes** : Intégrité garantie au niveau SQL
- **Index** : Performance optimisée pour les requêtes fréquentes

### Migrations
- **Scripts séparés** : Chaque migration a son propre script
- **Idempotence** : Les migrations peuvent être réexécutées (quand possible)
- **Vérification** : Les scripts vérifient le résultat

### Bonnes pratiques
- **Validation double** : Application + Base de données
- **CASCADE DELETE** : Intégrité référentielle automatique
- **Requêtes préparées** : Sécurité et performance

---

## 📝 Résumé de l'architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    COLLECTIONS                              │
│  (Entités individuelles réutilisables)                      │
│                                                             │
│  collections                                                │
│    - id, nom (unique)                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ (3 par groupe)
                     │
┌────────────────────▼────────────────────────────────────────┐
│                    GROUPES                                  │
│  (3 collections toujours utilisées ensemble)                │
│                                                             │
│  groupes_collections                                        │
│    - id, nom, description                                   │
│                                                             │
│  groupe_collections                                         │
│    - groupe_id, collection_id, ordre (1,2,3)                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ (utilisé dans)
                     │
┌────────────────────▼────────────────────────────────────────┐
│                    COMMANDES                                │
│  (Format A/B: max 2 collections, Format C: max 1)           │
│                                                             │
│  commandes                                                  │
│    - id, client_id                                          │
│    - format_type (A/B/C)                                    │
│    - papier_supplementaire, format_description, etc.        │
│                                                             │
│  commande_collections                                       │
│    - commande_id, groupe_id                                 │
│    - ordre_collection (1,2,3)                               │
│    - ordre_commande (1,2)                                   │
└─────────────────────────────────────────────────────────────┘
```

---

**Document créé le** : 2024  
**Version** : 1.0  
**Auteur** : Architecture technique complète du système de gestion des commandes et groupes de collections

