# ADR 009 — Données d'éléments, M2

Retenue le 11 octobre 2026 ; CDC 2.1, 6.5, 8 et 9. Contrats, validation,
substitution et projection appartiennent au moteur, dessin/édition aux apps.
Schéma 5 étendu additivement, six exports runtime et anciens vecteurs conservés,
aucune dépendance ajoutée. Instanciation atomique et IDs/ordre stables.

## Admission

DisplayElementData décrit les champs utiles avec NumericField={latex} en entrée
et RenderNumber={numerator,denominator,latex} en sortie. Nombres de rendu par le
parcours rationnel exact fermé/fini existant : coordonnées, fenêtres, fréquences,
probabilités et bornes. Infini par endpoint discriminé, jamais par nombre JS.

Présentation interne display-latex-v1 : même parseur Cortex raw/dictionnaire
local/gardes, opérateurs log/exp/trig/abs/relations admis. Substitution raw, sans
évaluation/canonicalisation ; 128 nœuds/profondeur 16, source/rendu 4096 caractères,
littéraux et choix numériques insérés encodés/bornés comme le profil exact.
Produits symboliques explicités avant
insertion des nombres par le helper partagé. formulaDomain=unverified est public.
Même x/x, 1/0, 0^0 peuvent être présentés en conservant leur structure, jamais
déclarés définis ou égaux. Nombres de rendu/attendus/computed/contraintes conservent
leurs contrôles avant réduction ; parsing public scalaire inchangé.

| Élément          | Données et garanties du profil natif                                                                                                                                                                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| rich-text        | Fragments text/math ordonnés, strong/emphasis, inline/block. Pas de HTML interprété ou découpage inline LaTeX.                                                                                                                                                                          |
| equation/system  | Relations binaires =, ≠, <, ≤, >, ≥ éventuellement parenthésées, membres scalaires. Relations imbriquées/chaînes refusées, IDs locaux uniques, aucun solveur.                                                                                                                           |
| hint/explanation | Fragments instanciés privés, questionId facultatif vers question/QCM ; absents de la projection élève.                                                                                                                                                                                  |
| function-graph   | Variable libre déclarée, formules dans ce seul scope, paramètres communs, IDs/labels/couleur hex six chiffres/showExpression/grille/fenêtre exacte croissante. Pas de sampling/auto-window.                                                                                             |
| sequence-graph   | Points prescrits ordonnés, formule explicite avec indice entier ou récurrence avec variable de terme distincte/valeur initiale. Start/count bornés, 1–64 termes. Pas de termes calculés implicitement.                                                                                  |
| sign-table       | Abscisses exactes ou infinies strictement ordonnées, lignes identifiées, un signe par intervalle et zéro/interdit/null par point ; null à l'infini. Aucun calcul de racines/signes.                                                                                                     |
| variation-table  | Valeurs définies finies, limites unilatérales/exclusions distinctes ; directions prescrites. Cohérence exacte des côtés intérieurs ; increasing/decreasing non stricts, constant exige valeurs finies égales. Infinis incompatibles refusés ; aucune preuve de variation d'une formule. |
| value-table      | Grille rectangulaire, colonnes nommées, cellules texte/math/nombre distinctes.                                                                                                                                                                                                          |
| statistics-table | Valeurs rationnelles et effectifs entiers non négatifs ; pas de moyenne/distribution calculée.                                                                                                                                                                                          |
| probability-tree | Nœuds plats, IDs/parents, une racine, aucun cycle/orphelin. Probabilité requise sur chaque arête non racine, exacte [0,1]. Issues disjointes : somme ≤1, =1 si exhaustive. Témoin entier borné par 64 dénominateurs ≤10^9. Pas de probabilité implicite/produit de chemin.              |
| vectors          | Dimension 2/3, coordonnées exactes, IDs/labels/couleurs/showCoordinates. Pas de norme ou réponse vectorielle implicite.                                                                                                                                                                 |
| geometry         | Points 2D, fenêtre/grille, segment/droite/cercle/polygone avec références existantes, rayon positif/sommets distincts/droite non dégénérée. Pas de preuve d'aire/intersection/congruence.                                                                                               |
| complex-plane    | Parties réelle/imaginaire exactes, IDs/labels/couleurs/fenêtre/grille/showCoordinates ; aucun module/argument calculé ou inventé, notamment en zéro.                                                                                                                                    |

IDs locaux par collection de fonctions/lignes/relations/points/objets/nœuds.
Sections et questions référencent les IDs globaux d'éléments. Références en avant
admises, Map/Set sans lookup hérité. Champs inconnus diagnostiqués, jamais perdus
silencieusement. Propriétés historiques hors contrat restent dans le brut pour M10.

## Métadonnées et confidentialité

Catalogue facultatif privé : chapter, difficulty ordinal positif, skills IDs
uniques, exerciseType flash/classic, needsCalculator booléen, appTitle. Titre
existant conservé ; recherche/publication/progression restent externes. Keyboard
question/QCM numeric/algebraic/fractions-roots/sets-intervals/mcq est une indication
UI sélectionnée publiquement, sans autorité mathématique.

Chaque champ mathématique conserve path/source/raw/substitution/display et
admission exact-rational/display-only dans mathFields privé. mapDisplayData
sélectionne tous les champs, partagé entre instanciation et projection, sans
copie générique du privé. Collections recréées ; public sans traces/source/AST,
catalogue/extensions/attendus/politiques/seed/aides/corrections. Projection toujours
depuis une instance serveur officielle ; aucune authentification d'objet client.

## Preuves et limites

Fixtures synthétiques explicitement identifiées dans display-elements.test.ts.
Les huit lignes reçues observent seulement text/question/mcq et deux graphes.
Graphe sin de 64 testé par transcription native manuelle de ses données observées,
pas adaptation de son exercice ni migration. Types des anciens dépôts documentés
dans functional-specification ; CDC prioritaire autorise geometry minimal.

Tests : toutes les familles, fractions, sources, JSON/rejeu/immutabilité,
scopes/refs/cycles/cardinals, incohérences prouvées, getters non exécutés, types
inconnus, secrets injectés à chaque niveau public. Revue indépendante en lecture
seule et auteur principal unique. Résultats effectifs dans progress.md.
Aucun renderer, sampling, solveur, calcul statistique/norme/module/argument,
MathLive réel, correction élève ou migration historique complète livré. V1 en cours.
