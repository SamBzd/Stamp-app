# Essai de navigation intégrée — abandonné le 13 octobre 2026

Sam demande finalement le retour au dock fixe en bas, avec son liquid glass et
le bandeau d’origine. Les modifications de cet essai sont retirées. Les captures
et contrôles ci-dessous documentent uniquement la variante abandonnée.

À la demande de Sam, le dock est intégré au bandeau existant à droite du titre,
en conservant le liquid glass (transparence, flou et reflets). La phrase descriptive
cède sa place à la navigation. Aucune rangée supplémentaire sur desktop : hauteur
mesurée 98 px à 1251 et 1024 px de large. L’espace réservé à l’ancien dock inférieur
est réduit à 20 px ; les contrôles au clavier sur petite hauteur tiennent compte
du bandeau supérieur.

Sous 901 px, un bouton Menu ouvre les cinq liens. Échap ferme le menu et rend le
focus au bouton ; clic extérieur, sortie clavier et navigation ferment le menu.
Les liens gardent leur sémantique de navigation et leur indication de page active.
Un fond opaque et un texte sombre prennent le relais si la transparence est réduite
ou le flou non supporté. Cet essai est abandonné par Sam.

Contrôles Chromium avec l’API locale de démonstration : 1251×824, 1024×768,
375×800 et 800×375 ; pas de débordement horizontal, menu, Échap et changement de
page fonctionnels, aucune erreur navigateur. `npm run check` : 93 tests backend,
72 frontend et build réussis. Docker et contrôle du diff réussis. Le contrôle
existant de navigation est ajusté pour autoriser le retour de focus sur Échap,
tout en interdisant l’autofocus au montage. Aucun nouvel audit, conformément à la
demande de Sam pour ces essais visuels. Aucun commit ni déploiement.

[Desktop](desktop.png) · [Mobile](mobile.png).
