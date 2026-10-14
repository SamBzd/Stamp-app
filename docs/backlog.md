# Suivi après livraison

Cette page distingue les suites convenues des constats à qualifier. Elle
n’autorise aucune intervention NAS, évolution métier ou suppression.

## Suites connues

- Préparer le DNS local de la cliente lorsque le poste ou routeur sera accessible.
- Décider du retrait de l’ancien déploiement après validation en usage réel,
  en tenant compte des saisies et sauvegardes postérieures à la bascule.
- Clôturer le suivi GitHub à partir du [compte rendu de livraison](livraison-nas.md).

## À qualifier séparément

- Les modules Groupes et la vue Dashboard hérités restent dans le dépôt,
  hors navigation active ; évaluer leur retrait avec leurs usages API.
- La fidélité reste attribuée uniquement à la création d’une hors-kit de plus
  de 70 euros. Aucun recalcul en édition/suppression n’est promis ni autorisé.
- Toute mise à jour de dépendances demande un audit actuel, pas la reprise
  automatique des alertes de l’ancien audit v2.
- Anciennes copies SQLite dans l’historique Git : une éventuelle purge serait
  un chantier distinct avec sauvegarde et accord explicite.

Les validations de composition, publication, prix historiques, tests et CI
ont été livrées ; les anciens constats sont conservés dans
[l’archive de l’audit v2](archive/audit-v2.md).
