# Checklist de livraison

Utilise cette checklist lorsqu'une version validée localement doit être livrée
sur le NAS. Une livraison réelle exige l'autorisation explicite de Sam ; ce
document ne remplace ni une sauvegarde ni une procédure de restauration testée.

Cette checklist est un modèle pour une nouvelle livraison, pas un relevé
de cases de la bascule passée. Le [compte rendu du 14 octobre](livraison-nas.md)
documente la reprise initiale des seules clientes dans un stockage distinct.
Les futures migrations en place concernent uniquement une base compatible.

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
- [ ] La migration ou l’import nécessaire est précontrôlé, puis exécuté selon
      la procédure autorisée ; aucune opération inutile ni reset implicite.
- [ ] Les images et conteneurs de la version visée sont déployés avec les variables et volumes attendus.
- [ ] Les services sont sains et le routage frontend/API fonctionne ; tout
      diagnostic de journal évite de publier les données personnelles.

## Après la livraison

- [ ] La sonde de santé répond et le frontend atteint l'API.
- [ ] Un parcours métier représentatif est contrôlé sans modifier de données réelles inutilement.
- [ ] Les commandes, stocks et bilan concernés sont cohérents avec les données attendues.
- [ ] La sauvegarde couvre le nouveau stockage et une sauvegarde réussie est
      vérifiée ; ne pas confondre présence des fichiers et restauration testée.
- [ ] Les accès temporaires sont refermés, les essais retirés et le retour
      arrière conservé selon la durée décidée.
- [ ] La version, la date, les migrations et contrôles sont consignés dans
      la synthèse partagée ; les détails privés restent locaux.

## En cas d'échec

- [ ] Arrêter l'opération avant toute action corrective non documentée.
- [ ] Conserver les journaux et identifier le point d'échec.
- [ ] Restaurer la sauvegarde uniquement selon la procédure vérifiée et avec autorisation explicite.
- [ ] Documenter l'incident et la décision de reprise avant une nouvelle tentative.
