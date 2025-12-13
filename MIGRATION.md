# Guide d'application des migrations

Ce guide explique comment appliquer les modifications du schéma de base de données pour respecter le cahier des charges.

## 📋 Prérequis

- Node.js installé
- Base de données SQLite existante (`db/app.db`)
- Les dépendances npm installées (`npm install` dans le dossier `backend`)

## ⚠️ Important : Sauvegarde

**AVANT TOUTE CHOSE**, sauvegardez votre base de données :

```bash
# Sur Windows (PowerShell)
Copy-Item db\app.db db\app.db.backup

# Sur Linux/Mac
cp db/app.db db/app.db.backup
```

## 🔄 Application des migrations

### Option 1 : Migration complète (recommandée)

Cette option applique le schéma complet depuis `schema.sql` :

```bash
cd backend
npm run migrate
```

**Ce que fait cette commande** :
- Lit le fichier `db/schema.sql`
- Applique la section commandes (après le premier COMMIT)
- Crée toutes les tables nécessaires :
  - `collections`
  - `groupes_collections`
  - `groupe_collections`
  - `commandes`
  - `commande_collections`

### Option 2 : Migration groupes uniquement

Si vous avez déjà une base de données avec des tables existantes et que vous voulez seulement créer/mettre à jour les tables de groupes :

```bash
cd backend
npm run migrate:groupes
```

**Ce que fait cette commande** :
- Crée toutes les tables nécessaires pour les groupes et commandes
- Idempotent : peut être exécuté plusieurs fois sans problème

## ✅ Vérification

Après avoir exécuté les migrations, vérifiez que tout s'est bien passé :

```bash
# Les scripts affichent automatiquement les tables créées
# Vous devriez voir :
#   ✓ collections
#   ✓ groupes_collections
#   ✓ groupe_collections
#   ✓ commandes
#   ✓ commande_collections
```

## 🔍 Vérification manuelle (optionnelle)

Vous pouvez vérifier manuellement avec SQLite :

```bash
# Ouvrir la base de données
sqlite3 db/app.db

# Vérifier les tables
.tables

# Vérifier la structure d'une table
.schema groupes_collections
.schema commandes
```

## 📊 Changements principaux

### Nouveau schéma

1. **Groupes de collections** :
   - Nombre variable de collections (pas exactement 3)
   - Format (A, B, C) avec prix et taille liés au groupe

2. **Commandes** :
   - Référence un groupe (via `groupe_id`)
   - Champ `reglee` ajouté (Oui/Non)
   - Format hérité du groupe

3. **Structure simplifiée** :
   - `commande_collections` : liaison directe commande ↔ collection
   - Pas de contraintes d'ordre fixes

## 🐛 En cas de problème

### Erreur : "Table already exists"

C'est normal si les tables existent déjà. Les migrations utilisent `CREATE TABLE IF NOT EXISTS`, donc elles sont idempotentes.

### Erreur : "FOREIGN KEY constraint failed"

Vérifiez que :
- La table `clients` existe (doit être créée avant)
- Les données existantes sont cohérentes

### Erreur : "Database is locked"

Fermez toutes les connexions à la base de données (arrêtez le serveur backend si il tourne).

## 📝 Prochaines étapes

Après avoir appliqué les migrations :

1. **Mettre à jour le code backend** pour utiliser le nouveau schéma
2. **Mettre à jour le code frontend** pour s'adapter aux nouvelles structures
3. **Tester** les fonctionnalités CRUD sur les groupes et commandes

## 🔗 Documentation

Pour plus de détails sur l'architecture, consultez :
- `CommandesArchi.md` : Architecture complète du système
- `db/schema.sql` : Schéma SQL complet
