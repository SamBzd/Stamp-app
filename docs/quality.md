# Qualité et validation

## État de départ

Le projet ne possède ni test automatisé, ni linter, ni intégration continue. Le build Vue valide la compilation, mais pas les règles métier ou les effets SQLite.

## Contrôles disponibles

```bash
find backend/src -type f -name '*.js' -print0 | xargs -0 -n1 node --check
npm run build --prefix frontend
npm audit --omit=dev --prefix backend
npm audit --omit=dev --prefix frontend
```

## Cible minimale

1. Tests d'intégration de l'API sur une base SQLite temporaire.
2. Cas de commande kit A/B/C valides et invalides, y compris les quantités et l'appartenance des papiers aux collections.
3. Tests des points de fidélité lors de création, modification et suppression.
4. Vérification du calcul de stock et du bilan mensuel.
5. Exécution automatisée de ces tests et du build dans une CI.

Toute anomalie de données existantes doit être corrigée par une migration ou une procédure explicitement réversible, jamais par une édition manuelle silencieuse.
