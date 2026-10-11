# Zoom navigateur natif à 200 % — issue #39

## Reproduction

Démarrer le frontend (`npm run dev`), puis exécuter :

```bash
STAMP_PREVIEW_URL=http://localhost:5173 \
STAMP_CAPTURE_DIR=/tmp/stamp-zoom-captures \
node docs/ui/recette-zoom/browser.cjs
```

Playwright et son Chromium doivent être disponibles. Si ces outils sont fournis
hors du projet, renseigner `STAMP_PLAYWRIGHT_MODULE` (chemin du module) et
`STAMP_CHROMIUM_EXECUTABLE` (chemin de l’exécutable). Aucune dépendance ajoutée.
Toutes les API sont interceptées avec des données synthétiques ; la recette
n’écrit pas dans la base de développement ou de production.

## Méthode et périmètre

Un profil Chromium temporaire configure son zoom de page natif à 200 % via
`partition.default_zoom_level`, puis est supprimé après fermeture. Le navigateur
est lancé avec une zone de contenu de 1280 × 800 pixels physiques : la recette
vérifie **640 × 400 pixels CSS**, `devicePixelRatio = 2` et
`visualViewport.scale = 1`. Elle ne modifie ni le CSS de l’application ni les
préférences du navigateur de Sam.

Le réglage suit les [préférences de zoom de Chromium](https://chromium.googlesource.com/chromium/src/+/114.0.5735.90/chrome/browser/ui/zoom/chrome_zoom_level_prefs.cc).

Sept pages sont contrôlées sans débordement horizontal : Accueil, Clientes,
Commandes hors-kit, Kits, Catalogues, Papiers et Stocks. Le parcours clavier
contrôle la visibilité et l’absence de recouvrement des champs/actions des
formulaires Clientes et Commandes, de la création et préparation d’un catalogue,
et de la création/du renommage d’un papier. Les fixtures ne constituent pas une
recette des données réelles de la cliente ni de toutes les variantes métier.

Résultat attendu : `Recette zoom natif 200 % réussie`, sans erreur JavaScript.
Les captures sont écrites dans `STAMP_CAPTURE_DIR`.

## Résultat du 11 octobre 2026

La recette passe sous Chromium. Elle a reproduit puis validé la correction du
focus initial masqué par le dock dans Papiers et Catalogues. La protection déjà
présente dans FormPanel est partagée via `viewportFocus.js` pour les fenêtres
étroites et courtes (≤ 900 × 500 pixels CSS).

Cette preuve ne couvre pas le zoom natif dans Zen, les contrastes composés,
ni les préférences de transparence réduite.

Captures du viewport physique : [création Papiers](papier-creation-200.png),
[préparation Catalogue](catalogue-preparation-200.png).
