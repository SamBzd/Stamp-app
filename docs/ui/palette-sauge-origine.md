# Palette Sauge d’origine — #51

Sam a choisi cette variante le **20 novembre 2026**, après comparaison de trois
palettes sur les mêmes écrans Commandes, formulaire kit et Fournitures. Il
autorise son application à toutes les couleurs de l’application, sans changement
de design ni d’UX. [Issue #51](https://github.com/SamBzd/Stamp-app/issues/51).

## Contrat de couleurs

| Rôle | Token applicatif | Valeur |
|---|---|---|
| Fond ivoire | `--bg-app`, `--background` | `#FDFCF8` |
| Surface de travail | `--card`, `--bg-primary`, `--bg-elevated` | `#FEFEFA` |
| Vert historique | `--primary`, `--secondary`, `--atelier-header` | `#5D7052` |
| Texte sur vert | `--primary-foreground`, `--secondary-foreground` | `#FFFFFF` |
| Texte principal | `--text-primary`, `--foreground` | `#2C2C24` |
| Texte secondaire | `--text-secondary`, `--text-tertiary` | `#57594F` |
| Surface secondaire | `--muted`, `--primary-light`, `--bg-secondary`, `--bg-tertiary` | `#F0EBE5` |
| Survol | `--surface-hover` | `#F0F2EB` |
| Sélection | `--surface-selected`, `--primary-medium` | `#E3E8DA` |
| Accent beige | `--accent` | `#D8C8AE` |
| Bordure de champ | `--border`, `--border-color` | `#8B917F` |
| Séparateur | `--border-light`, `--border-color-light` | `#E3E4D9` |
| Compteur sur vert | `--atelier-counter` | `#F3F4F1` |
| Repère du dock et focus | `--atelier-active-mark`, `--border-color-focus` | `#5D7052` |

Succès : `#295A45` sur `#E6F0E9` ; avertissement : `#80511B` sur `#FBF1DF` ;
erreur : `#7C3028` sur `#F9EBE8` ; information : `#36576A` sur `#EAF1F4`.
Les formats A/B/C utilisent respectivement vert, ocre et bleu grisé, avec leurs
lettres et libellés toujours présents. Les noms des fiches sélectionnées et le
libellé de renommage du papier en cours d’édition utilisent `--text-primary` sur `--surface-selected`
pour rester lisibles : le vert principal sur ce fond ne donne que 4,31:1. Ils ne se distinguent pas par la couleur
seule. Ces rôles sont communs à toutes les pages et composants.

Les ombres prune et le voile des modales deviennent sauge. Les paramètres des
ombres (décalage, flou, étalement, alpha), les filtres du verre et son opacité
restent identiques. Les fonds sémantiques des états sont ceux de la maquette
retenue. Aucun sélecteur de thème ni code de démonstration n’est intégré.

## Invariants préservés

Ce changement ne modifie ni HTML, ni logique Vue, ni textes d’interface, ni
routes/API/données. Les tailles, espacements, rayons, polices, graisses, icônes,
ancrages, animations, défilements et comportements clavier restent ceux du
`main` de départ `f2b79b4`. Les anciennes maquettes et recettes prune/citron
restent historiques ; leurs couleurs sont remplacées par ce contrat, pas leurs
preuves réécrites.

## Contrastes de référence

Mesures sur aplats : texte principal/ivoire **13,70:1**, texte secondaire/surface
**7,05:1**, blanc/vert **5,38:1**, compteur/en-tête **4,87:1**. Les tests existants
contrôlent aussi la bordure des champs, le repère actif sur verre composé et
l’avertissement. La recette doit contrôler les autres états sur leur fond réel ;
ces ratios ne constituent pas une certification exhaustive d’accessibilité.

## Validation

La [recette locale du 20 novembre](recette-sauge-origine/README.md) conserve
les captures, la comparaison de géométrie et les résultats.

- `npm run check` : tests existants et build du frontend.
- `docker compose config --quiet`.
- Vérification que le diff applicatif ne change que des valeurs de couleur.
- Comparaison navigateur à données et dimensions identiques : Commandes,
  formulaire et Fournitures ; inspection ciblée Clientes, Catalogues, Papiers,
  Bilan, calendrier, focus et dialogues.
- Audit indépendant en lecture seule avant transmission.

L’application locale de la palette ne prouve pas une livraison sur le NAS.
