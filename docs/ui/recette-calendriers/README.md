# Calendriers communs — 10 octobre 2026

À la demande de Sam, la totalité du champ date déploie un calendrier blanc et
prune directement dans le formulaire, sous le champ. Il pousse le contenu
suivant ; un second clic le replie. Il concerne les naissances Clientes et
les dates de commande Kit/Hors kit. Aucun endpoint ni schéma ne change.
Sam a autorisé les commits cohérents et le push sur la branche UI le
10 octobre 2026 ; aucun déploiement.

La sélection affiche JJ/MM/AAAA et conserve YYYY-MM-DD pour l’API, sans
conversion de fuseau. Le calendrier commence lundi, distingue le jour choisi
et aujourd’hui, et propose mois, année directe, saisie manuelle, Aujourd’hui,
Effacer et Annuler. Une date inexistante est refusée. Annuler, Échap et le
repli par le champ ne changent pas la valeur ; le focus revient au champ.

Les flèches parcourent les jours/semaines ; Début/Fin parcourent la semaine,
Page précédente/suivante le mois (avec Maj pour l’année), Entrée/Espace
choisissent le jour. Entrée/Espace sur le champ déploient/replient en gardant
le focus ; Flèche bas entre directement dans les jours. Un seul jour figure
dans le parcours Tab, qui permet aussi de continuer le formulaire. Échap dans
le calendrier replie uniquement celui-ci. L’année saisie avec Entrée ne
soumet pas le formulaire. Aucun overlay ni verrou de défilement n’est ajouté.
Depuis un autre champ, Échap conserve la fermeture habituelle du formulaire,
avec confirmation d’abandon dès qu’une saisie a changé.
Le déploiement est animé et respecte la préférence de mouvement réduit.
Les champs verrouillés ne peuvent pas ouvrir le calendrier. La grille reprend
les [commandes clavier W3C](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)
et le déclencheur suit le [modèle de déploiement W3C](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/).

À faible hauteur (largeur ≤900 px, hauteur ≤500 px), le formulaire prend la
hauteur naturelle de son contenu et utilise le défilement de page. Le focus
reste visible entre le bandeau et le dock. Les autres dimensions gardent le
défilement indépendant du panneau.

Preuves : [desktop 1280 × 800](calendrier-1280.png), [1024 × 768](calendrier-1024.png),
[mobile 375 × 800](calendrier-375.png), [paysage 800 × 375](calendrier-800.png).

La [recette Chromium](browser.cjs) lit uniquement la base de démonstration
locale (cliente 1, kit non réglé 2). Elle intercepte toutes les écritures API
et renvoie une erreur simulée : aucune donnée réelle n’est enregistrée.
Elle vérifie les clics à gauche du champ, allongement/repli du formulaire,
absence de popup, ouverture clavier, focus et sortie par Tab,
navigation des jours/mois, 29 février, année directe, sélection, annulation,
effacement, bornes d’années 1/9999, verrou pendant une mutation différée,
dimensions mobile/paysage, animation, trois payloads ISO et conservation des dates après
erreur serveur. Variables : STAMP_PREVIEW_URL (défaut port 5174),
STAMP_PLAYWRIGHT_MODULE, STAMP_CHROMIUM_EXECUTABLE et STAMP_CAPTURE_DIR.

Les tests unitaires couvrent jours impossibles, années bissextiles, années
1/99/9999, saisie française, mois tronqués et semaines commençant lundi.
`npm run check` (API, frontend, build), `docker compose config --quiet` et
`git diff --check` réussis. Validation navigateur Chromium réussie.
Mac/Safari, VoiceOver et validation
esthétique de Sam restent à réaliser.

Deux audits indépendants ont été réalisés en lecture seule. Le premier a
reproduit un stub DatePicker manquant dans le test SSR Clientes, corrigé et
revérifié. Le second n’a trouvé aucun défaut fonctionnel et a relevé un
survol parasite de toute la semaine, hérité du CSS global des tableaux,
classé 3/5. Ce défaut cosmétique a été confirmé dans Chromium. Un correctif
scoped d’une ligne est préparé dans `/tmp/stamp-calendriers-survol.patch` et
vérifié par injection temporaire dans le navigateur, sans application au
dépôt : accord de Sam demandé conformément à son contrat Jarvis.

Pour le passage au calendrier intégré, une revue distincte a confirmé la
zone de 40 px du corps de formulaire à 800 × 375 (constat 4/5). Le défilement
de page et le maintien du focus entre bandeau/dock corrigent cette limite ;
la recette complète et la recette antérieure des formulaires passent ensuite.
La création de nouveaux agents ayant atteint la limite de la session, ces
missions sont confiées en lecture seule à deux auditeurs de lots antérieurs,
distincts et sans transmission des avis du premier au second.
La revue finale a vérifié la recette, les animations normales/réduites et les
payloads sans défaut fonctionnel confirmé restant. Elle propose seulement
une priorité globale d’Échap pour le calendrier (2/5) : le comportement
documenté hors calendrier est conservé, avec confirmation d’abandon vérifiée.
