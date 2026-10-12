# Navigation après sauvegarde — review de la PR #40

## Signalement et vérification du 11 octobre 2026

[Le commentaire Codex](https://github.com/SamBzd/Stamp-app/pull/40#discussion_r4241172761)
suppose que `revealCommande()` déclenche une navigation rejetée tant que
`saving` reste actif dans le formulaire. Le signalement n’est pas reproduit
sur le commit `12adfb6` : les six scénarios ci-dessous réussissent sans
modification du code produit, avec réponse immédiate puis avec réponse
explicitement retenue jusqu’à vérification du verrou de navigation.

| Départ | Création | Destination après sauvegarde |
| --- | --- | --- |
| `/` | Kit | `/` |
| `/` | Hors kit | `/commandes/hors-kit` |
| `/commandes/hors-kit` | Kit | `/commandes/kits` |
| `/commandes/kits` | Hors kit | `/commandes/hors-kit` |
| `/commandes/kits` | Kit | `/commandes/kits` |
| `/commandes/hors-kit` | Hors kit | `/commandes/hors-kit` |

L’accueil `/` utilise déjà la liste Kits (`activeType` par défaut) ; conserver
ce chemin lors de la création d’un Kit est cohérent avec `revealCommande()`.

Les deux formulaires émettent `saved`, puis `close`, et libèrent `saving` dans
le même bloc synchrone. Vue Router 4.6.3 exécute ses gardes via
`runGuardQueue()`, une chaîne de promesses. L’appel initial à `router.replace()`
ne signifie donc pas que les gardes ont déjà lu l’état du formulaire.

La recette vérifie : sauvegarde unique, navigation vers Papiers refusée pendant
la requête, absence de confirmation de sortie, fermeture du formulaire,
URL et identifiant de détail corrects, présence du détail puis présence de
la commande dans la liste après fermeture du détail, absence d’erreur JavaScript.
Elle constitue une preuve sur ces scénarios et ces fixtures, pas sur toutes
les variantes de commande ou tous les environnements.

## Vérification indépendante et décision du 12 octobre 2026

À la demande de Sam, deux agents `gpt-5.6-terra` avec effort `medium` ont
examiné le signalement en lecture seule, sans consulter les conclusions de
la recette ci-dessus :

- L’agent chargé de l’ordre des événements a vérifié avec Vue Router 4.6.3
  que la garde observe `saving = false` après la séquence synchrone
  `saved` → `close` → `finally`. Il ne confirme pas le blocage allégué.
- L’agent chargé du navigateur a vérifié les créations depuis les listes
  opposées avec toutes les API interceptées : POST effectué, URL et onglet
  corrects, détail présent et `.form-panel` retiré dans les deux sens.
  Pour le Kit, il relève aussi la ligne `#commande-open-41` dans la liste.
  Sa tentative de fermeture du détail ne constitue pas une preuve indépendante
  de cette dernière étape, couverte par la recette complète ci-dessus.

Les deux agents évaluent la pertinence du défaut signalé à 1/5. Le contrôle
initial par texte « Nouveau kit » a été écarté car il pouvait sélectionner
le bouton de création permanent ; le contrôle final cible `.form-panel`.
Aucune modification produit n’est appliquée. Ces résultats étayent un faux
positif probable, sans prouver l’absence de défaut hors des scénarios testés.
Sam autorise la documentation de ce point puis le merge de la PR #40.

## Reproduction

Démarrer le frontend avec `npm run dev`, puis, depuis la racine :

```bash
STAMP_PREVIEW_URL=http://localhost:5173 \
STAMP_CAPTURE_DIR=/tmp/stamp-commandes-navigation \
node docs/ui/recette-commandes-navigation/browser.cjs
```

Playwright et Chromium doivent être disponibles. Si fournis hors du projet,
renseigner `STAMP_PLAYWRIGHT_MODULE` et `STAMP_CHROMIUM_EXECUTABLE` avec leurs
chemins. Toutes les API sont interceptées ; les créations restent dans les
fixtures en mémoire et ne touchent aucune base réelle. Aucune dépendance ajoutée.

Résultat attendu : six lignes `OK`, puis
`Recette navigation après sauvegarde réussie`.
