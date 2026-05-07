# Plan technique — Stamp App v2

## Synthèse fonctionnelle

| Sujet | Comportement v2 |
|---|---|
| Commande kit A/B | 2 collections du catalogue : 2 papiers cartonnés de l'une + 3 de l'autre (utilisatrice choisit quelle collection donne 2 et quelle donne 3) |
| Commande kit C | 1 collection du catalogue : les 5 papiers cartonnés automatiquement inclus |
| Contenu commun | Toujours : 1 feuille papier spé + 1 embellissement (définis dans le catalogue) |
| Papier supp (3.50€) | ×2 sur toutes les quantités de papiers cartonnés (2→4, 3→6, 5→10) |
| Collection | Définie par son nom + liste de 5 papiers cartonnés (bibliothèque globale, réutilisables) |
| Catalogue | Titre = "Mois YYYY" + 1 papier spé + 1 embellissement + 3 ou 4 collections |
| Prix A/B/C | Globaux et distincts (A ≠ B ≠ C), configurables via icône engrenage |
| Commande hors kit | Même liste que les kit, badge distinctif, auto +1 point fidélité si montant > 70€ |
| Points fidélité | Sur fiche cliente, automatique + éditable manuellement |
| Stocks | Suivi des quantités à commander : papiers cartonnés + papier spé + embellissement + collections. Bonus : bilan comptable mensuel |

---

## Phase 1 — Base de données ✅ (complété le 2026-05-04)

### Tables à supprimer
`commandes`, `commande_collections`, `groupe_collections`, `groupes_collections`, `collections`, `stocks`

### Tables à conserver et modifier
**`clients`** — ajouter :
```sql
points_fidelite INTEGER NOT NULL DEFAULT 0
```

### Nouvelles tables

---

**`settings`** — stockage des valeurs configurables depuis l'interface
```
cle TEXT PRIMARY KEY    -- "prix_A", "prix_B", "prix_C"
valeur TEXT NOT NULL
```
Permet de modifier les prix sans toucher au code. Initialisé avec 3 entrées au premier lancement. Les prix A, B et C sont distincts.

---

**`papiers_cartonnes`** — bibliothèque globale, réutilisable entre collections et catalogues
```
id
nom TEXT NOT NULL
created_at
```

---

**`catalogues`** — catalogue mensuel
```
id
titre TEXT NOT NULL       -- "Avril 2026", validation format : mot(s) + espace + YYYY
papier_spe TEXT           -- nom du papier spécial
embellissement TEXT       -- nom de l'embellissement
created_at, updated_at
```
Le titre est la clé fonctionnelle du catalogue (affiché partout). Validation applicative du format `Mois YYYY` à la saisie.

---

**`collections`** — 3 ou 4 collections par catalogue
```
id
catalogue_id FK → catalogues (CASCADE)
nom TEXT NOT NULL
ordre INTEGER NOT NULL    -- 1 à 4
created_at
UNIQUE(catalogue_id, ordre)
```

---

**`collection_papiers`** — jusqu'à 5 papiers cartonnés par collection
```
id
collection_id FK → collections (CASCADE)
papier_cartonne_id FK → papiers_cartonnes
ordre INTEGER NOT NULL    -- 1 à 5
UNIQUE(collection_id, papier_cartonne_id)
```

---

**`commandes`** — table unifiée kit + hors kit
```
id
client_id FK → clients (CASCADE)
type TEXT CHECK IN ('kit', 'hors_kit')

-- Champs kit (nullable)
format_type TEXT CHECK IN ('A','B','C')
papier_supplementaire INTEGER DEFAULT 0
produit_promo_texte TEXT
produit_promo_prix REAL
autres_texte TEXT
autres_prix REAL

-- Champs hors kit (nullable)
montant REAL
date_commande TEXT
cadeau_texte TEXT
cadeau_valeur REAL

-- Champs communs
methode_paiement TEXT CHECK IN ('Paypal','chèque','virement')
reglee INTEGER DEFAULT 0
created_at, updated_at
```

---

**`commande_collections`** — collections impliquées dans une commande kit
```
id
commande_id FK → commandes (CASCADE)
collection_id FK → collections
nb_feuilles INTEGER NOT NULL    -- 2, 3 ou 5
UNIQUE(commande_id, collection_id)
```
- Format A/B : 2 lignes (une avec nb_feuilles=2, l'autre avec nb_feuilles=3)
- Format C : 1 ligne (nb_feuilles=5)
- Validation applicative : les collections doivent appartenir au même catalogue

---

**`commande_papiers_selectionnes`** — papiers cartonnés choisis pour une commande kit
```
id
commande_id FK → commandes (CASCADE)
papier_cartonne_id FK → papiers_cartonnes
UNIQUE(commande_id, papier_cartonne_id)
```
- Format A/B : 5 lignes au total (2 papiers de la collection "×2" + 3 de la collection "×3")
- Format C : 5 lignes (tous les papiers de la collection, insérés automatiquement)
- Chaque ligne = 1 feuille (×2 si `papier_supplementaire`)

---

### Logique stocks (calculée à la volée)

**Papiers cartonnés — quantité à commander, par nom :**
```sql
SELECT pc.nom,
  SUM(CASE WHEN c.papier_supplementaire = 1 THEN 2 ELSE 1 END) AS nb_feuilles
FROM commande_papiers_selectionnes cps
JOIN commandes c ON c.id = cps.commande_id AND c.type = 'kit'
JOIN papiers_cartonnes pc ON pc.id = cps.papier_cartonne_id
GROUP BY pc.id
ORDER BY nb_feuilles DESC
```

**Papier spé — quantité à commander, par nom :**
```sql
SELECT cat.papier_spe, COUNT(DISTINCT c.id) AS nb_feuilles
FROM commandes c
JOIN commande_collections cc ON cc.commande_id = c.id
JOIN collections col ON col.id = cc.collection_id
JOIN catalogues cat ON cat.id = col.catalogue_id
WHERE c.type = 'kit'
GROUP BY cat.papier_spe
```

**Embellissement — même logique que papier spé.**

**Collections — deux métriques :**
- Nombre de commandes ayant utilisé chaque collection (pour savoir combien de lots commander)
- Somme des feuilles (nb_feuilles dans commande_collections)

**Bonus — bilan comptable mensuel (sous-onglet dans Stocks si faisable) :**
- Chiffre d'affaires du mois (somme des commandes réglées)
- Répartition par méthode de paiement
- Résumé des produits "autres" et "promo" commandés

---

## Phase 2 — Backend ✅ (complété le 2026-05-07)

### Routes à supprimer
- `/api/groupes` (toutes)
- `/api/collections` (ancien modèle)
- `/api/stocks` (logique à réécrire)

### Nouvelles routes

**Settings**
- `GET /api/settings` — retourne les prix A, B, C
- `PUT /api/settings` — modifie un ou plusieurs prix

**Papiers cartonnés**
- `GET /api/papiers-cartonnes?search=...` — autocomplete par nom
- `POST /api/papiers-cartonnes` — création

**Catalogues**
- `GET /api/catalogues` — liste tous les catalogues
- `GET /api/catalogues/:id` — détail avec collections + papiers de chaque collection
- `POST /api/catalogues` — création (validation format titre)
- `PUT /api/catalogues/:id` — modification
- `DELETE /api/catalogues/:id` — suppression cascade

**Collections**
- `POST /api/catalogues/:id/collections` — ajout (max 4 par catalogue)
- `PUT /api/collections/:id` — modification nom
- `DELETE /api/collections/:id`
- `PUT /api/collections/:id/papiers` — remplace la liste (max 5)

**Commandes**
- `GET /api/commandes` — toutes (kit + hors kit), triées par date
- `GET /api/commandes/:id`
- `POST /api/commandes` — création + validation même catalogue (A/B) + logique points fidélité
- `PUT /api/commandes/:id`
- `DELETE /api/commandes/:id`

**Clients**
- Routes existantes mises à jour pour inclure `points_fidelite`

**Stocks**
- `GET /api/stocks` — agrégation complète (papiers cartonnés + papier spé + embellissement + collections)
- `GET /api/stocks/bilan?mois=YYYY-MM` — bilan comptable mensuel (bonus)
- `POST /api/stocks/recalculate` — recalcul forcé

---

## Phase 3 — Frontend ✅ (complété le 2026-05-04)

### Vue à remplacer
- `GroupesView.vue` → `CataloguesView.vue`

### Vues à réécrire

**`CataloguesView.vue`** (remplace GroupesView)
- Liste des catalogues (titre mois/année)
- CRUD catalogue
- Formulaire : titre (avec validation format) + papier spé + embellissement + 3 ou 4 collections
- Pour chaque collection : nom + liste de papiers cartonnés (autocomplete sur la bibliothèque)

**`CommandesView.vue`**
- Liste unifiée kit + hors kit (badge de type sur chaque ligne)
- Formulaire kit — cascade :
  1. Sélection catalogue
  2. Sélection format (A, B ou C)
  3. Si A/B : choisir quelle collection donne 2 et quelle donne 3 → sélectionner les papiers cartonnés dans chaque liste
  4. Si C : choisir 1 collection → les 5 papiers auto-sélectionnés (affichés en lecture seule)
  5. Options : papier supp, produit promo (texte + prix), autres (texte + prix), méthode paiement
- Formulaire hors kit : montant, date, texte cadeau, valeur cadeau, méthode paiement
- Prix total calculé en temps réel à la saisie

### Vues à mettre à jour

**`ClientsView.vue`** — points de fidélité affichés sur la fiche + champ éditable

**`StocksView.vue`** — nouveau calcul, groupé par catégorie :
- Onglet principal : papiers cartonnés / papier spé / embellissement / collections (à traiter / traité)
- Onglet bonus : bilan comptable mensuel (si implémenté)

**`DashboardView.vue`** — stats mises à jour (kit + hors kit confondus)

### Paramètres (prix A/B/C)
Icône engrenage dans le header/nav → **modale** avec formulaire simple (prix A, prix B, prix C). Pas de page dédiée.

### Composants à créer
- **`CatalogueForm.vue`** — formulaire catalogue complet (collections + papiers)
- **`CommandeKitForm.vue`** — formulaire kit avec cascade et sélection des papiers
- **`CommandeHorsKitForm.vue`** — formulaire hors kit
- **`ParametresModal.vue`** — modale de configuration des prix

### Composants réutilisés
- **`SearchableSelect.vue`** — autocomplete papiers cartonnés

---

## Phase 4 — Ordre d'exécution

```
1.  ✅ Reset DB + nouveau schéma SQL
2.  ✅ Données initiales : INSERT settings (prix A, B, C)
3.  ✅ Backend : settings + papiers_cartonnes
4.  ✅ Backend : catalogues + collections + collection_papiers
5.  ✅ Backend : commandes (kit + hors kit) + commande_collections + commande_papiers_selectionnes
6.  ✅ Backend : stocks (nouveau calcul) + bilan mensuel (bonus)
7.  ✅ Frontend : ParametresModal (engrenage)
8.  ✅ Frontend : CataloguesView + CatalogueForm
9.  ✅ Frontend : CommandesView (kit + hors kit)
10. ✅ Frontend : ClientsView (points fidélité)
11. ✅ Frontend : StocksView (nouveau calcul + onglet bilan)
12. ✅ Frontend : DashboardView (ajustements)
```
