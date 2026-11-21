# Recette Sauge d’origine — 20 novembre 2026

Issue [#51](https://github.com/SamBzd/Stamp-app/issues/51), sur la base applicative
`f2b79b4`. Données exclusivement synthétiques, aucune intervention NAS.
Sam a validé la palette avant sa transposition, puis confirmé l’aperçu local
et autorisé le commit, le push et l’ouverture de la PR le 20 novembre 2026,
sans fusion. Contrat dans [palette-sauge-origine.md](../palette-sauge-origine.md).

## Périmètre réellement modifié

Les tokens et les teintes codées directement dans les ombres/voiles passent en
sauge, ivoire et beige. Les couleurs conditionnelles des noms sélectionnés et
du libellé de renommage utilisent l’encre foncée pour garder un contraste lisible.
Aucun template, script Vue, texte produit, appel API ni paramètre de disposition
n’a changé. La normalisation des huit fichiers applicatifs modifiés, après
retrait des commentaires et couleurs et des quatre règles ajoutant uniquement
`color`, donne exactement le même contenu avant et après. Les empreintes de
structure sont conservées dans [couleurs-seulement.json](couleurs-seulement.json).

## Vérifications

- `npm run check` : **105 tests backend, 77 tests frontend et build réussis**.
- `docker compose config --quiet` : réussi.
- Aucun résidu de la palette de marque prune/citron dans les sources actives
  modifiées ; les anciens composants non utilisés et les maquettes historiques
  ne sont pas réécrits.
- Chromium intégré : Commandes, formulaire kit, Clientes, Catalogues, Papiers,
  Fournitures, Bilan, calendrier, confirmation de suppression (annulée),
  renommage papier avec focus clavier (annulé) et Clientes à 375 px.
- Aucune erreur ni alerte console observée pendant ce parcours.

## Géométrie

À 1280 × 900, les mesures du bandeau, de la liste Commandes et du dock sont
identiques entre la maquette retenue et le résultat applicatif. Les valeurs
comparées sont dans [geometrie.json](geometrie.json). La vérification du code
couvre les autres paramètres géométriques inchangés ; ces quelques mesures
n’équivalent pas à une comparaison de tous les pixels ou navigateurs.

## Audits et contraste

Les audits en lecture seule ont relevé le vert principal sur la sélection à
4,31:1, puis précisé le libellé visible du renommage des papiers. Ces constats
ont été vérifiés dans le code et le navigateur. Les noms sélectionnés et le
libellé de renommage utilisent désormais `#2C2C24` sur `#E3E8DA`, sans modifier
les aplats retenus ni la typographie. Le navigateur confirme la paire calculée
sur le libellé réel, avec le focus existant. Le dernier audit indépendant n’a
confirmé aucun défaut dans le périmètre examiné ; il n’a pas relancé la recette
navigateur ou la suite complète. Les validations ci-dessus ont été exécutées
par l’orchestrateur.

## Captures

| Vue ou état | Preuve |
|---|---|
| Commandes et détail | [1280 px](commandes-1280.jpg) |
| Formulaire kit | [1280 px](formulaire-1280.jpg) |
| Clientes | [1280 px](clientes-1280.jpg), [375 px](clientes-375.jpg) |
| Catalogues | [1280 px](catalogues-1280.jpg) |
| Papiers | [1280 px](papiers-1280.jpg) |
| Renommage et focus | [1280 px](renommage-papier-1280.jpg) |
| Fournitures | [1280 px](fournitures-1280.jpg) |
| Bilan | [1280 px](bilan-1280.jpg) |
| Calendrier | [1280 px](calendrier-1280.jpg) |
| Confirmation annulée | [1280 px](confirmation-1280.jpg) |

Safari et le Mac de la cliente n’ont pas été testés. Cette recette locale ne
constitue pas une preuve de livraison de la palette en production.
