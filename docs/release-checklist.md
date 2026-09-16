# Checklist de livraison

Utilise cette checklist lorsqu'une version validée localement doit être livrée
sur le NAS. Une livraison réelle exige l'autorisation explicite de Sam ; ce
document ne remplace ni une sauvegarde ni une procédure de restauration testée.

## Avant la livraison

- [ ] La PR est fusionnée dans `main`, la CI est verte et le commit à livrer est identifié.
- [ ] Les règles métier et la recette concernées sont validées.
- [ ] Les notes de migration, de configuration et d'exploitation sont relues.
- [ ] Le volume SQLite réellement utilisé et la version actuellement déployée sont identifiés.
- [ ] Une sauvegarde cohérente de la base est créée hors du volume actif et son contenu est vérifié.
- [ ] La procédure de restauration est connue et testée sur une copie ou un environnement jetable.
- [ ] La fenêtre de maintenance et le plan de retour arrière sont confirmés.

## Livraison

- [ ] Les services qui accèdent à SQLite sont arrêtés avant toute maintenance de la base.
- [ ] La migration est contrôlée en lecture seule, puis appliquée une seule fois selon la procédure documentée.
- [ ] Les images et conteneurs de la version visée sont déployés avec les variables et volumes attendus.
- [ ] Les services démarrent et les journaux ne signalent aucune erreur bloquante.

## Après la livraison

- [ ] La sonde de santé répond et le frontend atteint l'API.
- [ ] Un parcours métier représentatif est contrôlé sans modifier de données réelles inutilement.
- [ ] Les commandes, stocks et bilan concernés sont cohérents avec les données attendues.
- [ ] La version, la date, les migrations appliquées et les contrôles effectués sont consignés dans l'issue ou la PR de livraison.

## En cas d'échec

- [ ] Arrêter l'opération avant toute action corrective non documentée.
- [ ] Conserver les journaux et identifier le point d'échec.
- [ ] Restaurer la sauvegarde uniquement selon la procédure vérifiée et avec autorisation explicite.
- [ ] Documenter l'incident et la décision de reprise avant une nouvelle tentative.
