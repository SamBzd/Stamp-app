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
│  │ - id, nom, created_at                           │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        ▲
                        │ (référencée par)
                        │
┌─────────────────────────────────────────────────────────┐
│  NIVEAU 2 : Groupes de collections (nombre variable)     │
│  ┌──────────────────────────┐  ┌──────────────────────┐ │
│  │ groupes_collections      │  │ groupe_collections   │ │
│  │ - id, nom                │  │ - groupe_id          │ │
│  │ - format_type (A/B/C)    │  │ - collection_id      │ │
│  │ - format_prix            │  │ - ordre              │ │
│  │ - format_taille          │  │                      │ │
│  │ - description            │  │                      │ │
│  └──────────────────────────┘  └──────────────────────┘ │
│         ▲                              ▲                │
│         │                              │                │
│         └──────────┬───────────────────┘                │
│                    │ (1 à N collections)                 │
└─────────────────────────────────────────────────────────┘
                     ▲
                     │ (utilisé dans)
                     │
┌──────────────────────────────────────────────────────────┐
│  NIVEAU 3 : Commandes                                    │
│  ┌───────────────────────────┐  ┌──────────────────────┐ │
│  │ commandes                 │  │ commande_collections │ │
│  │ - id, client_id           │  │ - commande_id        │ │
│  │ - groupe_id               │  │ - collection_id      │ │
│  │ - papier_supplementaire   │  │                      │ │
│  │ - articles_supplementaires│  │                      │ │
│  │ - methode_paiement        │  │                      │ │
│  │ - reglee                  │  │                      │ │
│  └───────────────────────────┘  └──────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Table 1 : `collections`

**Rôle** : Stocke les collections individuelles réutilisables.

**Structure** :
- `id` : Identifiant unique (INTEGER PRIMARY KEY AUTOINCREMENT)
- `nom` : Nom de la collection (TEXT NOT NULL)
- `created_at` : Date de création (TEXT DEFAULT datetime('now'))

**Caractéristiques** :
- Une collection peut être utilisée dans **plusieurs groupes**
- Le nom n'est pas unique (une collection peut avoir le même nom dans différents groupes)
- Collections réutilisables dans différentes combinaisons

**Exemple** :
```sql
INSERT INTO collections (nom) VALUES 
  ('Collection Printemps'),
  ('Collection Été'),
  ('Collection Automne');
```

### Table 2 : `groupes_collections`

**Rôle** : Représente un groupe de collections avec un format associé (A, B ou C) incluant prix et taille.

**Structure** :
- `id` : Identifiant unique
- `nom` : Nom du groupe (UNIQUE)
- `format_type` : Format du groupe - **A, B ou C** (CHECK constraint)
- `format_prix` : Prix du format (REAL NOT NULL DEFAULT 0)
- `format_taille` : Taille du format (TEXT)
- `description` : Description optionnelle du groupe
- `created_at` : Date de création
- `updated_at` : Date de mise à jour

**Caractéristiques** :
- Un groupe peut contenir **un nombre variable de collections** (1 à N)
- Chaque groupe a un **format** (A, B ou C) avec son **prix** et sa **taille**
- Les groupes sont créés une fois puis réutilisés dans plusieurs commandes
- Le nom est unique pour faciliter la recherche
- Le format est lié au groupe, pas à la commande

**Exemple** :
```sql
INSERT INTO groupes_collections (nom, format_type, format_prix, format_taille, description) VALUES 
  ('Groupe Premium', 'A', 25.50, 'A4', 'Collections haut de gamme pour occasions spéciales');
```

### Table 3 : `groupe_collections`

**Rôle** : Table de liaison qui associe un groupe à ses collections (nombre variable).

**Structure** :
- `id` : Identifiant unique
- `groupe_id` : Référence au groupe (FOREIGN KEY)
- `collection_id` : Référence à une collection (FOREIGN KEY)
- `ordre` : Position dans le groupe (INTEGER)

**Contraintes importantes** :
- `UNIQUE(groupe_id, collection_id)` : Empêche d'ajouter la même collection deux fois dans un groupe
- Pas de limite sur le nombre de collections (peut être 1, 2, 3 ou plus)

**Exemple** :
```sql
-- Groupe ID 1 contient les collections 1, 2, 3 dans cet ordre
INSERT INTO groupe_collections (groupe_id, collection_id, ordre) VALUES
  (1, 1, 1),  -- Collection 1 en position 1
  (1, 2, 2),  -- Collection 2 en position 2
  (1, 3, 3);  -- Collection 3 en position 3

-- Un autre groupe peut avoir seulement 2 collections
INSERT INTO groupe_collections (groupe_id, collection_id, ordre) VALUES
  (2, 4, 1),  -- Collection 4 en position 1
  (2, 5, 2);  -- Collection 5 en position 2
```

### Table 4 : `commandes`

**Rôle** : Table principale qui stocke les informations d'une commande.

**Structure** :
- `id` : Identifiant unique
- `client_id` : Référence au client (FOREIGN KEY vers `clients`)
- `groupe_id` : Référence au groupe de collections (FOREIGN KEY vers `groupes_collections`)
- `papier_supplementaire` : Option papier supplémentaire (BOOLEAN, stocké comme INTEGER 0/1)
- `articles_supplementaires` : Champ libre pour articles supplémentaires (TEXT)
- `methode_paiement` : Méthode de paiement - **Paypal, chèque ou virement** (CHECK constraint)
- `reglee` : Indique si la commande est réglée (BOOLEAN, stocké comme INTEGER 0/1)
- `created_at` : Date de création
- `updated_at` : Date de mise à jour

**Contraintes importantes** :
- `methode_paiement` : Doit être 'Paypal', 'chèque' ou 'virement'
- `papier_supplementaire` : Doit être 0 ou 1
- `reglee` : Doit être 0 ou 1
- Le format vient du groupe référencé (via `groupe_id`)
- Une commande ne peut contenir que des collections du groupe référencé

**Exemple** :
```sql
INSERT INTO commandes (
  client_id, groupe_id, papier_supplementaire, 
  articles_supplementaires, methode_paiement, reglee
) VALUES (
  1, 1, 1, 'Articles personnalisés', 'Paypal', 0
);
```

### Table 5 : `commande_collections`

**Rôle** : Table de liaison qui associe une commande à ses collections. Une commande peut contenir 1 ou plusieurs collections du même groupe.

**Structure** :
- `id` : Identifiant unique
- `commande_id` : Référence à la commande (FOREIGN KEY)
- `collection_id` : Référence à une collection (FOREIGN KEY)

**Contraintes importantes** :
- `UNIQUE(commande_id, collection_id)` : Empêche d'ajouter la même collection deux fois dans une commande
- Une commande ne peut contenir que des collections du groupe référencé dans la table `commandes` (vérifié par trigger)
- Pas de limite sur le nombre de collections par commande (peut être 1 ou plus)

**Exemple** :
```sql
-- Commande ID 1 référence le groupe ID 1
-- La commande utilise les collections 1 et 2 du groupe
INSERT INTO commande_collections (commande_id, collection_id) VALUES
  (1, 1),  -- Collection 1 du groupe
  (1, 2);  -- Collection 2 du groupe

-- Une commande peut aussi n'avoir qu'une seule collection
INSERT INTO commande_collections (commande_id, collection_id) VALUES
  (2, 1);  -- Collection 1 uniquement
```

---

## 🔑 Concepts clés {#concepts-cles}

### 1. Groupes de collections (nombre variable)

**Principe** : Les collections sont organisées en **groupes** qui peuvent contenir un nombre variable de collections (1 à N).

**Pourquoi cette approche ?**
- **Flexibilité** : Permet de créer des groupes avec le nombre de collections nécessaire
- **Cohérence** : Les collections d'un groupe sont conçues pour fonctionner ensemble
- **Réutilisabilité** : Un groupe peut être utilisé dans plusieurs commandes
- **Simplicité** : Lors de la création d'une commande, on choisit un groupe plutôt que plusieurs collections individuelles

**Workflow** :
```
1. Créer les collections individuelles
   ↓
2. Créer un groupe avec un format (A, B ou C) et y associer les collections
   ↓
3. Utiliser le groupe dans les commandes
```

### 2. Formats liés aux groupes (A, B, C)

Chaque groupe a un **format_type** (A, B ou C) avec son prix et sa taille. Le format est défini au niveau du groupe, pas de la commande.

**Caractéristiques des formats** :
- **Format A** : Format avec ses caractéristiques (prix, taille)
- **Format B** : Format avec ses caractéristiques (prix, taille)
- **Format C** : Format avec ses caractéristiques (prix, taille)

**Règles métier** :
- Une commande référence un groupe et hérite de son format
- Une commande peut contenir 1 ou plusieurs collections du groupe référencé
- Une commande ne peut pas contenir des collections de groupes différents

**Exemple concret** :
```
Groupe "Premium" (Format A, 25.50€, A4) contient :
  - Collection 1 : "Printemps"
  - Collection 2 : "Été"
  - Collection 3 : "Automne"

Commande utilisant le groupe "Premium" :
  → Utilise Collection 1 et Collection 2 du groupe
  → Format A hérité du groupe (25.50€, A4)
```

### 3. Structure simplifiée des commandes

**Principe** : Une commande référence un groupe et sélectionne les collections de ce groupe à inclure.

**Caractéristiques** :
- Une commande référence **un seul groupe** (via `groupe_id`)
- Une commande peut contenir **1 ou plusieurs collections** de ce groupe
- Les collections sont directement référencées dans `commande_collections`
- Pas de notion d'ordre dans la commande (simplifié)

**Schéma visuel** :
```
Groupe "Premium" (Format A) :
  ┌─────────────────────────────────┐
  │ ordre=1 : Collection "Printemps"│
  │ ordre=2 : Collection "Été"      │
  │ ordre=3 : Collection "Automne"  │
  └─────────────────────────────────┘

Commande :
  ┌─────────────────────────────────────────────┐
  │ groupe_id = 1 (Groupe Premium)              │
  │                                             │
  │ Collections sélectionnées :                 │
  │   - Collection "Printemps"                  │
  │   - Collection "Été"                        │
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
                           ▲
                           │ (N)
                           │
                    commande_collections
                           │
                           │ (1)
                           │
                           ▼
                    commandes (1)
```

### Relations détaillées

#### 1. clients → commandes (1:N)
- Un client peut avoir **plusieurs commandes**
- Une commande appartient à **un seul client**
- **CASCADE DELETE** : Si un client est supprimé, ses commandes sont supprimées automatiquement

#### 2. commandes → groupes_collections (N:1)
- Une commande référence **un seul groupe**
- Un groupe peut être utilisé dans **plusieurs commandes**
- Le format vient du groupe référencé

#### 3. commandes → commande_collections (1:N)
- Une commande peut avoir **1 ou plusieurs collections**
- Une entrée `commande_collections` appartient à **une seule commande**
- **CASCADE DELETE** : Si une commande est supprimée, ses associations sont supprimées

#### 4. groupes_collections → groupe_collections (1:N)
- Un groupe peut contenir **un nombre variable de collections** (1 à N)
- Une entrée `groupe_collections` appartient à **un seul groupe**
- **CASCADE DELETE** : Si un groupe est supprimé, ses associations sont supprimées

#### 5. collections → groupe_collections (1:N)
- Une collection peut être dans **plusieurs groupes**
- Une entrée `groupe_collections` référence **une seule collection**
- **CASCADE DELETE** : Si une collection est supprimée, elle est retirée de tous les groupes

#### 6. collections → commande_collections (1:N)
- Une collection peut être utilisée dans **plusieurs commandes**
- Une entrée `commande_collections` référence **une seule collection**
- Les collections doivent appartenir au groupe référencé par la commande

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
- Pas de contrainte CHECK sur l'ordre
- Permet un nombre variable de collections (1 à N)
- L'ordre est utilisé uniquement pour l'affichage/organisation

**Collections dans les commandes** :
- Pas de limite sur le nombre de collections par commande
- Une commande peut contenir 1 ou plusieurs collections du groupe référencé
- Validation par trigger que les collections appartiennent au groupe

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
UNIQUE(groupe_id, collection_id) -- Une collection ne peut être 2 fois dans un groupe
```
- Garantit l'intégrité des groupes
- Permet un nombre variable de collections

**Commandes-Collections** :
```sql
UNIQUE(commande_id, collection_id)
```
- Empêche d'ajouter la même collection deux fois dans une commande

### Triggers de validation

#### Trigger : Validation collections du même groupe

**Nom** : `check_commande_collections_same_groupe`

**Rôle** : Vérifie qu'une commande ne contient que des collections appartenant au groupe référencé.

**Code** :
```sql
CREATE TRIGGER check_commande_collections_same_groupe
BEFORE INSERT ON commande_collections
FOR EACH ROW
WHEN (
  NOT EXISTS (
    SELECT 1 FROM groupe_collections gc
    INNER JOIN commandes c ON c.groupe_id = gc.groupe_id
    WHERE gc.collection_id = NEW.collection_id
    AND c.id = NEW.commande_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'Une commande ne peut contenir que des collections du groupe référencé');
END;
```

**Exemple d'erreur** :
```sql
-- Commande référence le groupe ID 1
-- Tentative d'ajouter une collection du groupe ID 2
-- ❌ ERREUR : "Une commande ne peut contenir que des collections du groupe référencé"
```

### Règles métier résumées

| Règle | Description | Validation |
|-------|-------------|------------|
| **Groupes** | Un groupe peut contenir un nombre variable de collections (1 à N) | UNIQUE(groupe_id, collection_id) |
| **Format** | Le format (A, B ou C) est lié au groupe avec prix et taille | CHECK(format_type IN ('A', 'B', 'C')) dans groupes_collections |
| **Commandes** | Une commande référence un seul groupe | FOREIGN KEY (groupe_id) |
| **Collections dans commandes** | Une commande peut contenir 1 ou plusieurs collections du groupe | Trigger de validation |
| **Collections** | Une collection peut être dans plusieurs groupes | Pas de contrainte (relation N:N) |
| **Groupes** | Un groupe peut être utilisé dans plusieurs commandes | Pas de contrainte (relation N:N) |
| **Règlement** | Une commande peut être marquée comme réglée ou non | CHECK(reglee IN (0,1)) |

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

**Rôle** : Crée la structure complète pour les groupes de collections et commandes.

**Fonctionnement** :
1. Crée les tables :
   - `collections`
   - `groupes_collections` (avec format_type, format_prix, format_taille)
   - `groupe_collections`
   - `commandes` (avec groupe_id et reglee)
   - `commande_collections` (structure simplifiée)
2. Crée les index et triggers
3. Vérifie que tout est en place

**Utilisation** :
```bash
npm run migrate:groupes
```

**Caractéristiques** :
- Utilise `CREATE TABLE IF NOT EXISTS` : **idempotent** (peut être exécuté plusieurs fois)
- Crée les triggers de validation
- Structure conforme au cahier des charges

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

-- 2. Créer le groupe avec format, prix et taille
INSERT INTO groupes_collections (nom, format_type, format_prix, format_taille, description) VALUES 
  ('Groupe Saisons', 'A', 25.50, 'A4', 'Collections saisonnières complètes');

-- 3. Associer les collections au groupe
INSERT INTO groupe_collections (groupe_id, collection_id, ordre) VALUES
  (1, 1, 1),  -- Printemps en position 1
  (1, 2, 2),  -- Été en position 2
  (1, 3, 3);  -- Automne en position 3
```

### Scénario 2 : Créer une commande

```sql
-- 1. Créer la commande (le format vient du groupe)
INSERT INTO commandes (
  client_id, groupe_id, papier_supplementaire,
  articles_supplementaires, methode_paiement, reglee
) VALUES (
  1, 1, 1, 'Articles personnalisés', 'Paypal', 0
);

-- 2. Associer les collections au groupe (utilise collections 1 et 2)
INSERT INTO commande_collections (commande_id, collection_id) VALUES
  (1, 1),  -- Collection Printemps
  (1, 2);  -- Collection Été
```

### Scénario 3 : Créer une commande avec une seule collection

```sql
-- 1. Créer la commande
INSERT INTO commandes (
  client_id, groupe_id, papier_supplementaire,
  articles_supplementaires, methode_paiement, reglee
) VALUES (
  2, 1, 0, NULL, 'chèque', 0
);

-- 2. Associer une seule collection
INSERT INTO commande_collections (commande_id, collection_id) VALUES
  (2, 1);  -- Collection Printemps uniquement
```

### Scénario 4 : Requête pour récupérer une commande complète

```sql
-- Récupérer une commande avec ses collections et le format du groupe
SELECT 
  c.id AS commande_id,
  c.client_id,
  gc.nom AS groupe_nom,
  gc.format_type,
  gc.format_prix,
  gc.format_taille,
  col.nom AS collection_nom,
  c.papier_supplementaire,
  c.articles_supplementaires,
  c.methode_paiement,
  c.reglee
FROM commandes c
JOIN groupes_collections gc ON c.groupe_id = gc.id
JOIN commande_collections cc ON c.id = cc.commande_id
JOIN collections col ON cc.collection_id = col.id
WHERE c.id = 1;
```

**Résultat** :

commande_id | client_id | groupe_nom    | format_type | format_prix | format_taille | collection_nom      | papier_supplementaire | methode_paiement | reglee
------------|-----------|---------------|-------------|--------------|---------------|---------------------|----------------------|------------------|--------
1           | 1         | Groupe Saisons| A           | 25.50        | A4            | Collection Printemps| 1                     | Paypal           | 0
1           | 1         | Groupe Saisons| A           | 25.50        | A4            | Collection Été      | 1                     | Paypal           | 0


---

## 🔑 Points clés à retenir

### Architecture
- **3 niveaux** : Collections → Groupes → Commandes
- **Groupes flexibles** : Nombre variable de collections (1 à N)
- **Formats liés aux groupes** : Format (A, B ou C) avec prix et taille au niveau du groupe

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

