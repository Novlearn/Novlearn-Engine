# Spécification fonctionnelle

M0–M9 livrés : génération/éléments/correction bornées, formes, cas connus du lycée,
MathLive et hôte isolé/transport privé. M10 validé : huit adaptations
réelles, recettes/mappings privés et profil log-affine-positive sur x>0 pour106,
avec forme power-of-e. [ADR016](adr/016-reviewed-legacy-adaptation.md).
Le profil rationnel/polynomial de génération reste distinct. Démonstration
intégrée M11 et consommation/audit final M12 demeurent obligatoires pour la V1.

Référence actuelle au 12 octobre 2026, après [consolidation](consolidation.md).
Contrat canonique schemaVersion 5 ; package privé 0.1.0. Le cahier des charges
CDC_référence.md reste une cible plus large, préservée en octets. Cette mission
conserve les capacités livrées ; la mission V1 autorise la réalisation progressive
des manques (D35). M1 étend les noms descriptifs (D36), sans nouveau moteur.
[Contrats/APIs](architecture.md), [preuves et limites](feature-coverage.md).

## 1. Document et questions

ExerciseDefinition est un document composé : id/revision/title, generation,
variables libres, elements ordonnés et extensions privées. Une question unique
est une liste comportant une question ; aucun format séparé. Questions multiples,
sections explicites et variables communes sont disponibles. Les sections sont
plates et sectionId référence un ID existant indépendamment de l'ordre.

Chaque question porte son ID d'élément, son attendu et sa politique privée.
Réponses référencent instanceId/questionId, jamais l'index d'une liste. Réordonner
conserve les IDs et les associations. Une révision publiée doit rester immuable
côté application ; aucune réutilisation d'ID pour une autre question de sa lignée.

L'instanciation prépare toutes les questions admises. Un échec interdit le retour
d'une instance complète ou partielle ; diagnostics localisés. Dépendances de
valeurs computed distinctes des dépendances pédagogiques/de réponses précédentes,
ces deux dernières étant différées avec les scopes locaux/workflows.

## 2. Éléments : contrat commun et inventaire

Socle ci-dessous : unions discriminées à champs précis ; les profils étendus
de réponses M3–M10 sont définis par leurs ADR et la matrice de couverture.

| Élément        | Définition / instance                                                                                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| text / section | ID, texte, sectionId facultatif (sauf parent de section) ; @a/@@, texte inline opaque, longueur finale contrôlée                                                           |
| expression     | LaTeX, label textuel facultatif ; substitution polynomial/rationnel bornée, variables libres préservées, source/raw conservés privés                                       |
| question       | énoncé/points positifs, response latex rational/expression, expectedLatex, policy rational/polynomial value-only ; ratio exact ou expression préparée privé                |
| mcq            | énoncé/points, mode single/multiple, options texte/LaTeX avec IDs, expectedOptionIds privés ; options rationnelles fermées, collisions exactes après substitution refusées |

IDs d'éléments uniques et d'options uniques par QCM. Simple : un ID attendu ;
multiple : ensemble non vide d'IDs existants sans doublons. Aucun mélange aléatoire
d'options livré. La projection sélectionne chaque branche, mode/response/options,
sans attendus/flags/politiques/traces/extensions/seed. Prose équivalente ou options
symboliques non comparables ne sont pas réputées distinguées mathématiquement.

Données natives M2 : [ADR 009](adr/009-display-elements.md) définit les contrats
effectivement validés/instanciables, leurs profils et leur projection. Catalogue
privé typé et keyboard facultatif disponibles. Les fiches ci-dessous conservent
l'inventaire des besoins et observations avant M2 ; leurs mentions « absent natif »
décrivent cet état antérieur. Les options historiques dépassant les contrats natifs
sont adaptés explicitement en M10 pour les huit documents reçus ; les autres
formats inconnus restent bloqués. Aucun renderer ou migration implicite.

### Graphe de fonction — mathématique et interaction de vue

- Données/configuration : fonctions/expressions, couleurs et légendes, bornes x/y numériques ou expressions, grille ; mode auto explicitement distingué d'une formule. Historique `graph.functions`, xMin/xMax/yMin/yMax, showGrid/showExpression.
- Variables/calculs : substitution et, si requis, préparation bornée d'échantillons avec domaine/erreurs ; aucune inférence d'asymptote/continuité à partir d'un dessin. Samples numériques sont de l'affichage, pas une preuve d'égalité.
- Validation/instance : bornes finies et ordonnées après résolution, expressions admises, budgets de points ; trous/singularités explicités, pas de ligne traversant automatiquement un domaine inconnu.
- Réponse/rendu/Admin : aucune réponse par défaut ; question liée si lecture de courbe. Renderer canvas/SVG, zoom/grille/labels et calcul géométrique de pixels ; Admin fenêtre/fonctions. Calcul mathématique de f(x) via frontière commune, pas réécriture regex dans le renderer.
- État/lot : présent Creator et élève, deux calculs distincts ; absent natif, graphe 103 non transcrit. Complément d'éléments du Lot 5 puis adaptation 9 et UI, après premier périmètre.

### Suite et graphe discret — mathématique

- Données/configuration : mode explicite/récurrent/manuel, indice initial, formule ou récurrence et valeur initiale, nombre de termes ; fenêtre, grille, liaison de points, valeurs et limite donnée. Creator `discreteGraph`, types élève `sequence` et `discrete_graph.points` sans branche de rendu.
- Variables/calculs : termes via CortexJS et contexte local n/terme précédent, avec budget ; une limite affichée est fournie, pas calculée automatiquement ; récurrence de suite distincte d'un cycle interdit de variables calculées scalaires.
- Validation/instance : mode/champs, indices, nombre de termes, état initial et domaine à chaque pas ; échec ou lacune d'affichage documentée, pas NaN transporté. Produire données de suite communes au tableau et au graphe, sans moteurs séparés.
- Réponse/rendu/Admin : pas de réponse automatique ; question associée. Renderer points/liaison/axes, Admin modes/formules/initialisation. Aucune preuve de convergence à partir des points.
- État/lot : Creator rendu/calcul, élève types seuls pour ces blocs ; absent natif. Complément Lot 5 pour suite/données, adaptation 9 et UI spécifique ; aucun solveur de récurrence prévu.

### Tableau de signes — mathématique prescrit

- Données/configuration : variable/fonction, points/bornes/zéros/interdits et signes des intervalles. Creator `signTable.points/signs`, élève `sign_table.points[].sign` : modèles différents.
- Variables/calculs : substituer abscisses/labels ; données prescrites par l'auteur d'abord, aucun calcul automatique des racines ou des signes promis.
- Validation/instance : cardinal points/intervalles, nature des points, ordre démontré des valeurs, domaine et signes admis ; ordre inconnu diagnostic, pas tri lexical. Préparer cellules et intervalles sans dessiner.
- Réponse/rendu/Admin : aucune par défaut ; remplissage futur nécessiterait une question/contrat. Renderer barres/signes et lecture accessible ; Admin points et signes, diagnostics de cohérence.
- État/lot : rendus historiques incompatibles, absent natif. Complément d'éléments Lot 5, adaptation 9 par mapping revu, UI ; calcul analytique autonome différé.

### Tableau de variations — mathématique prescrit

- Données/configuration : points x, valeurs/limites, ruptures et sens de variation. Creator `y/pos` graphique, élève `value/variation` sémantique : ne pas déduire une variation prouvée d'une position top/bottom.
- Variables/calculs : substitution de valeurs ; variations fournies et validées structurellement, pas dérivation automatique.
- Validation/instance : ordre/domaine, cardinal, interdits, directions et valeurs cohérentes dans le profil contrôlable ; limite inconnue explicite. Instance produit données et diagnostics.
- Réponse/rendu/Admin : pas de réponse ; renderer flèches/barres/accessibilité, Admin valeurs/ruptures/directions. Positions de pixels calculées par UI.
- État/lot : présent historiques avec écarts, absent natif ; complément Lot 5, adaptation 9 et UI ; calcul des variations différé.

### Tableau de statistiques — informatif ou mathématique

- Données/configuration : en-têtes, lignes/cellules, et distinction de texte/valeur mathématique si un calcul est demandé ; Creator `statsTable.headers/rows`.
- Variables/calculs : substitution des cellules ; moyennes/fréquences/totaux seulement par formules/attendus explicites dans un profil admis, pas automatiquement.
- Validation/instance : grille rectangulaire et bornée, cellules typées, effectifs non négatifs/total non nul si nécessaire à une formule ; préparer cellules affichables.
- Réponse/rendu/Admin : tableau sans correction implicite ; question associée aux résultats. Renderer tableau accessible, Admin grille/labels/formules.
- État/lot : Creator seul, aucun type/rendu élève identifié ; absent natif. Complément Lot 5 et adaptation 9, UI distincte ; aucun module statistique autonome requis.

### Arbre de probabilités — mathématique

- Données/configuration : nœuds/IDs, parent, événement, probabilité d'arête, affichage éventuel des chemins ; Creator `probaTree.nodes`.
- Variables/calculs : substitution ; produits des probabilités de chemin par math commun si demandé. Arbre de données nécessaire pour ce type, sans imposer une hiérarchie d'exercice.
- Validation/instance : racine/parents/IDs, absence de cycle/orphelin, probabilités dans [0,1], sommes sortantes égales à 1 lorsqu'arbre exhaustif ; preuve exacte ou diagnostic indéterminé. Décider les probabilités manquantes avant annonce du profil.
- Réponse/rendu/Admin : pas de réponse automatique ; question liée. Renderer SVG et disposition géométrique, Admin branches/probabilités ; pas de multiplication métier divergente dans l'UI.
- État/lot : Creator calcule des chemins sans validation exhaustive, absent élève/natif. Complément Lot 5, adaptation 9 et UI ; pas de moteur de probabilités séparé.

### Vecteurs — mathématique et géométrique

- Données/configuration : dimension 2/3, noms, coordonnées, affichage normes/coordonnées ; Creator `vector.vectors`.
- Variables/calculs : substitution coordonnées, norme seulement si profil de racine admis ; projection 3D et pixels relèvent du renderer. Un tuple de génération ne devient pas automatiquement un vecteur.
- Validation/instance : dimension/coordonnées, type réel/finitude, budgets ; exactitude d'une norme séparée de son approximation d'affichage.
- Réponse/rendu/Admin : figure sans réponse ; format de réponse vectorielle demanderait un complément de correction explicite. Renderer axes/flèches/projection/labels, Admin coordonnées/options.
- État/lot : Creator, absent élève/natif ; complément Lot 5/adaptation 9/UI. Produit scalaire/vectoriel non observé comme fonction automatique, non ajouté au cœur.

### Plan complexe — mathématique et géométrique

- Données/configuration : points nommés, parties réelle/imaginaire, grille/labels/module/argument ; Creator `complexPlane.points`.
- Variables/calculs : substitution des composantes, module/argument si demandés ; convention/unité d'argument explicitée, zéro sans argument défini. Pas d'algèbre complexe générale déduite de ce dessin.
- Validation/instance : composantes réelles finies, conventions, noms/budgets ; valeur exacte et angle approximatif distincts.
- Réponse/rendu/Admin : points sans correction implicite ; réponse complexe par contrat de question spécifique. Renderer axes/labels, Admin coordonnées/options ; aucun atan2 métier divergent pour une réponse officielle.
- État/lot : Creator, absent élève/natif ; complément Lot 5/adaptation 9/UI, format complexe par complément Lot 6.

Le CDC prioritaire exige désormais geometry : contrat minimal de points et
segment/droite/cercle/polygone livré en M2 malgré l'inventaire ancien incomplet.
Images et autres blocs non identifiés restent inconnus ; aucun discriminant
générique absorbant leurs champs. Relations/systèmes/suites ont des contrats
natifs documentés ; introduction/conclusion utilisent les textes existants.

## 3. Génération et contraintes

GenerationDefinition : schemaVersion 5, definitions, constraints et budgets
maxAttempts/maxDraws obligatoires. Trois familles : scalaires (integer/decimal/choice), tuples et calculs :

- integer : bornes inclusives entières de valeur absolue ≤10^6, exclusions numériques uniques dans la plage.
- decimal : grille coefficient/10^precision, précision 0–6, coefficients ≤10^9 ;
  bornes intersectées avec la grille, exclusions alignées, aucun snap/tolérance.
- choice : valeurs numériques finies uniques, exclusions facultatives parmi la liste,
  aucun poids implicite. Le tirage ne prouve pas l'utilisabilité mathématique exacte.
- tuple : une identité de groupe et 2–8 composantes scalaires nommées ; mode choice
  sélectionne une ligne complète admise, mode generate tire chaque composante.
  Exclusions locales suppriment des lignes entières. Liaisons vers les seules valeurs
  plates, aucun état numérique dupliqué. Pas de tuples imbriqués/indexation/vectoriel.
- computed : LaTeX rationnel fermé avec dépendances extraites par CortexJS. Résultat
  RationalValue exact, y compris entier/décimal fini ; restrictions facultatives
  integer/rational, bornes/exclusions exactes, sans clamp/réparation.

Noms : 1–32 lettres/chiffres ASCII avec minuscule initiale, réservés exclus (D36),
distincts des variables libres ; IDs de tuples distincts des noms. ≤16 déclarations/
valeurs résolues et ≤16 variables libres. `\mathrm{delta}`, `\mathrm{r1}` et
`\mathrm{xSommet}` sont des références explicites via CortexJS ; les lettres nues
gardent la multiplication implicite, sans conversion du LaTeX historique.

Préparation et tri topologique stable avant RNG ; références inconnues, cycles et
profils invalides diagnostiqués. Tirages dans l'ordre des seules déclarations
aléatoires, composantes dans l'ordre déclaré, computed sans mot RNG.

Contraintes comparison : six relations <, <=, >, >=, ==, != et exactement un opérande
variable/constant/latex par membre. Constantes et restrictions : encodage exact sur
six places, coefficient ≤10^9. Opérandes LaTeX dans le même profil rationnel fermé.
Preuves statiques limitées aux bornes/réflexivité, aucun solveur général.

Chaque tentative tire tout le contexte puis résout les calculs et vérifie toutes
les restrictions/comparaisons. Faux → nouveau candidat complet, flux continu.
Singularité, erreur ou indétermination → arrêt terminal sans valeurs partielles,
y compris après faux. Les tirages singuliers doivent être exclus explicitement.
Domaine local vide ou contradiction simple prouvée ≠ recherche épuisée.

Budgets : ≤128 choix/lignes/exclusions, ≤32 contraintes, 1–128 tentatives,
1–65536 mots RNG et 128 mots maximum par rejet de rang. Mulberry32 local,
rangs sans biais modulo, singleton sans mot, identité mulberry32-rejection-v1.
Pas de preuve d'uniformité générale sous contraintes.

Recettes de composition testées : carrés, discriminants et trinômes à racines
entières, chaînes/fractions et tuple pythagoricien ; aucun générateur spécialisé,
aucun solveur de racines. Oracles BigInt indépendants et vecteurs complets dans
les tests canoniques. Même révision/ordre/budgets/seed/artefacts → mêmes valeurs.

## 4. Instanciation, validation et correction

Pipeline livré : définition privée → validation JSON → génération/résolution/
contraintes communes → textes/formules/attendus de chaque élément → snapshot privé
complet → projection sélectionnée. Une seule résolution et aucun JS historique.
Source/raw/substitution/affichage distincts, calcul CortexJS, admission/domaine avant
réduction. Expression polynomiale : degré structurel ≤16 ; rationnels fermés et
intermédiaires ≤10^9 ; AST ≤128 nœuds/profondeur 16 ; puissances entières 0–16 sous
contrôle de non-nullité pour puissance zéro. Décimaux jusqu'à six places, chiffres
groupés et juxtaposition numérique ambiguë refusés. x/x, 0/x, 0^0, racines,
irrationnels, fonctions partielles et solveurs hors du profil rationnel/polynomial
de génération. Les réponses numériques fermées M3 ont leur admission réelle
spécialisée avant réduction, documentée dans ADR 010.

Parsing scalar-latex-v1 reste plus large : sources préservées, racines et Pi/
ExponentialE parsables mais aucune preuve d'évaluation/domaine. Point et {,} décimaux,
virgule nue ambiguë refusée, placeholders détectés avant CortexJS. [ADR 005](adr/005-math-input.md).

JSON : sources/textes ≤4096 unités UTF-16, IDs/révision/clés ≤128, profondeur ≤16,
≤10000 nœuds, collections ≤128. ≤128 éléments et ≤64 options/sélection QCM. Le
snapshot agrégé peut être refusé malgré des champs individuellement admis.

AnswerSubmission transporte LaTeX/texte brut ou sélection d'IDs sous schéma 5,
source même incomplète. Aucun seed/policy/verdict client. gradeAnswer associe les
IDs à l'instance officielle et rend CorrectionResult, sans authentifier sa provenance.
Validation structurelle ≠ parsing/domaine/preuve ; previews multi-seeds ne prouvent
pas toutes les générations. Le corps portable est synchrone ; M8/M9 démontrent
l'interruption OS dans l'hôte optionnel, avec les limites documentées de quota
partagé et de nettoyage. M11 exerce le transport FastAPI et MathLive réels.

Correction cible : soumission structurée → association officielle → parsing → admissibilité et domaine → preuve de valeur → politique de réponse/forme → résultat. Recueillir les témoins de forme sur source/raw **avant réduction** ; statuer séparément sur la forme après preuve de valeur. Le serveur fournit format, attendu, tolérance et politique.

| Famille / politique           | Règle cible et tests requis                                                                                                   | État / lot                             |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Rationnel exact, forme libre  | Rapports exacts bornés ; 2/4 et 1/2 même valeur ; différences démontrées                                                      | IT M3, preuve Cortex exacte            |
| Fraction irréductible         | Valeur distincte de forme, entier/fraction littérale et PGCD exact, signes/groupements explicites                             | IT M5 validé ; ADR 012                 |
| Polynôme rationnel univarié   | Admissibilité raw, degré/coefficient bornés et preuve exacte ; variable au dénominateur refusée/indéterminée                  | IT M4, coefficients rationnels exacts  |
| Développée/réduite/factorisée | Syntaxe originale, monômes/degrés distincts, irréductibilité complète sur Q bornée ; inconnus conservés                       | IT M5 validé ; ADR 012                 |
| Approximation                 | A+R\|attendu\| officiel inclusif, chaînes décimales exactes ; identité ou bornes certifiées, frontière inconnue indéterminée  | IT M3 par profil, formes M5            |
| Intervalle                    | Ordre des bornes, ouvert/fermé, infinis autorisés aux extrémités sans fermeture ; vide/unions à spécifier                     | IT M4, intervalles/unions sous preuve  |
| Ensemble                      | Valeurs admises, ordre ignoré et doublons selon politique explicite ; vide/singleton ; preuve élément par élément             | IT M4, ordre/doublons ignorés          |
| QCM simple/multiple           | Ensemble exact d'IDs, cardinal/mode ; options affichées indépendantes de leur position ; pas de crédit partiel implicite      | IT M3, erreurs et permutations testées |
| Texte                         | Variantes autorisées, comparaison stricte/normalisation explicitement configurée ; accents conservés, pas de sémantique libre | IT M3                                  |
| Solutions equation/inequality | Type de réponse explicite, solutions degré0–2 ou ensembles connus, domaines respectés                                         | IT M4 ; complex general hors périmètre |

Décision utilisateur : pour les expressions symboliques, **mêmes domaines par défaut** (M4 implémenté, ADR 011) ; une question peut imposer explicitement le domaine de comparaison. `x/x` et `1` ne sont donc pas identiques par défaut. Sous domaine imposé x≠0, le profil M4 peut démontrer l'équivalence ; elle doit aussi prouver que les deux expressions y sont définies. Cette décision ne crée aucun extracteur universel de domaine. Le premier correcteur rationnel/polynomial doit rester dans ses familles bornées, domaines inconnus → indétermination.

Résultats requis : correct (valeur et forme requise démontrées), incorrect (différence ou violation de forme démontrée, motif distinct), saisie invalide (structure/syntaxe/format), indéterminé (preuve, domaine ou forme inconnus), erreur technique (bibliothèque, deadline, protocole). Attendu officiel invalide est un défaut d'exercice, jamais une faute élève. Non répondu est un état de tentative, pas une correction incorrecte. Méthode/preuve, valeur et forme sont des dimensions séparées ; `isIdenticallyEqual()` seul ou quelques évaluations numériques ne constituent pas une preuve universelle.

Une expression mathématiquement valable mais hors famille supportée n'est pas une faute : la correction reste indéterminée avec motif de non-support. Un rejet du profil de parsing doit préciser syntaxe réellement invalide ou capacité non disponible ; il ne suffit pas à prouver que la valeur élève est fausse. Une forme exigée mais non reconnaissable reste inconnue, pas automatiquement violée.

## 5. Évolutions et limites

M6, [ADR 013](adr/013-school-known-answers.md) : profil public school-latex-v1
pour lire fonctions usuelles et limites ; expression mode display substituée
sans évaluation et avec domaine unverified. Réponses numériques fermées sous
preuve exacte, domaines logarithmiques et pôles connus de tangente avant réduction.
La limite droite de ln(x−a)/(x−a), x>a, utilise un attendu officiel −∞ ; une
dérivée polynomiale connue est comparée par M4. Aucun solveur ajouté. Les valeurs
ou domaines non prouvés restent indéterminés, y compris tan(1).

Fonctions connues et isolation/transport livrés M6/M8/M9 ; adaptation explicite M10
validée, adoption/démonstration M11 et audit M12 encore requis. Pas de
déploiement de serveur applicatif, UI de production ou SQL ajouté au cœur.
Anciennes APIs
expérimentales refusées et snapshots non rejouables ; adaptateur explicite ./legacy.
Corpus original intact, transcriptions manuelles64/103 distinctes des conversions
complètes exécutées en M10. Aucune migration de production.
