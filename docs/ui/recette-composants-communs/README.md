# Composants communs et listes adaptatives — 10 octobre 2026

Lot demandé par Sam après validation des formulaires intégrés. Sam a autorisé
les commits cohérents et le push sur la branche UI le 10 octobre 2026.

- Champs et sélecteurs : surface blanche, rayon commun 6 px, hauteur minimale
  44 px, focus prune, états invalides et aides/erreurs associées au contrôle.
  La saisie sur écran étroit utilise une police 16 px.
- Confirmations : surface sobre, croix accessible 44 px, boucle clavier,
  annulation préservant les saisies et fermeture verrouillée pendant la mutation.
- Messages d’erreur : tokens communs et texte lisible, sans perdre les saisies.
- Notifications : en haut, annonce accessible et fermeture clavier ; la pile
  peut défiler et reste au-dessus du dock, y compris en paysage.
- Clientes, Catalogues, Commandes : la hauteur des listes dépend du contenu
  affiché et se raccourcit après filtrage. Sur desktop, une liste longue est
  plafonnée avant le dock et garde un défilement indépendant. Les détails et
  formulaires conservent la pleine hauteur et leurs actions accessibles.

| Preuve | Capture |
| --- | --- |
| Une cliente, un catalogue, une commande | [Clientes](clients-court-1280.png), [Catalogues](catalogues-court-1280.png), [Commandes](commandes-court-1280.png) |
| Liste raccourcie après filtrage | [1024 × 768](clients-filtre-1024.png) |
| Champs communs | [Cliente](champs-cliente-1280.png), [Hors kit](champs-hors-kit-1280.png) |
| Confirmation | [Desktop](confirmation-1280.png), [Mobile](confirmation-375.png), [Paysage](confirmation-800.png) |
| Refus serveur préservant les saisies | [Cliente](erreur-cliente-1280.png) |
| Notifications dégagées du dock | [Mobile](notifications-375.png), [Paysage](notifications-800.png) |

La [recette Chromium](browser.cjs) intercepte toutes les API : fixtures fictives,
aucune écriture dans une base locale ou NAS. Elle couvre 0/1/3/35 fiches pour les
trois vues à 1280 × 800, 1024 × 768, 375 × 800 et 800 × 375 ; contrôle également
le filtrage depuis une liste défilée, la dernière ligne accessible, les suggestions
email au clavier, le formatage téléphone, les confirmations, le verrou pendant
l’archivage, le refus serveur et la fermeture des notifications au clavier.
Elle attend la fin des transitions de retrait avant de poursuivre le nettoyage
des notifications et le recalcul du viewport avant les assertions de hauteur.

Validations réussies : `npm run check` (93 tests backend, 67 frontend et build),
`docker compose config --quiet`, `git diff --check`. Les recettes des formulaires,
du défilement Catalogues et des paramètres 3B.1 passent aussi. Un audit indépendant
avec `gpt-5.6-sol`, effort medium, modèle accepté par Sam pour les audits, n’a
trouvé aucun défaut actionnable et a reproduit les trois premières recettes.
Une course de nettoyage des notifications dans la recette a été corrigée.

Avec Vite démarré : `node docs/ui/recette-composants-communs/browser.cjs`.
Variables facultatives : `STAMP_PLAYWRIGHT_MODULE`, `STAMP_CHROMIUM_EXECUTABLE`,
`STAMP_PREVIEW_URL`, `STAMP_CAPTURE_DIR` (conseillé dans `/tmp` pour les régressions).

Limites : Chromium avec API simulées uniquement. Mac/Safari réel, zoom 200 %
et validation esthétique par Sam restent ouverts. Aucun changement de contrat
métier, backend, données, dépendance ou déploiement. Le bilan mensuel reste séparé.
