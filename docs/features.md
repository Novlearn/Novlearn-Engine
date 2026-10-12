# Capacités et limites

État du code : package privé 0.1.0, schéma 5, lots M0–M12 livrés localement.
Ce document décrit les **profils opérationnels**. Le [CDC](CDC_référence.md)
fixe les objectifs ; la [matrice](feature-coverage.md) relie ses 48 exigences aux
preuves. « Supporté » signifie contrat, validation, comportement et tests présents.
Un cas refusé ou seulement typé ne devient pas une capacité garantie.

## Génération

| Famille            | Support opérationnel et garanties                                                                                                      | Limites                                                                                | Tests pertinents                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `integer`          | Bornes inclusives, signes, exclusions uniques ; aucun tirage interdit                                                                  | Bornes entières ±10⁶                                                                   | [generation](../tests/generation.test.ts), [limites](../tests/generation-limit.test.ts)                 |
| `decimal`          | Grille exacte coefficient/10^précision ; intersection des bornes avec la grille ; exclusions alignées                                  | Précision 0–6, bornes ±10⁶, coefficients ±10⁹ ; aucun arrondi vers la grille           | [generation](../tests/generation.test.ts), [substitution](../tests/substitution.test.ts)                |
| `choice`           | Choix numériques finis uniques ; exclusions facultatives, sans pondération implicite                                                   | Tirabilité d’un nombre JS fini ne prouve pas son admissibilité dans le calcul exact    | [generation](../tests/generation.test.ts), [canonical](../tests/canonical.test.ts)                      |
| `tuple`            | `choice` tire une ligne entière ; `generate` tire les composantes ; liens ordonnés vers les valeurs plates                             | Arité 2–8 ; pas de tuple imbriqué, indexation ou algèbre vectorielle                   | [tuples](../tests/tuples.test.ts), [pannes](../tests/tuple-failures.test.ts)                            |
| `computed`         | Rationnel fermé exact, dépendances multiples, tri stable, cycles détectés avant RNG ; restrictions entier/rationnel, bornes/exclusions | Pas de calculé irrationnel, complexe ou fonction transcendante ; singularité terminale | [computed](../tests/computed.test.ts), [pannes](../tests/computed-failures.test.ts)                     |
| Contraintes        | Six comparaisons `< <= > >= == !=`, opérandes variable/constante/LaTeX rationnel fermé ; candidat complet retiré si faux               | Pas de solveur général ni langage JS ; inconnue/erreur terminale même après faux       | [computed](../tests/computed.test.ts), [tuples](../tests/tuples.test.ts)                                |
| Reproductibilité   | Flux local Mulberry32, rangs par rejet sans biais modulo, singleton sans mot ; seed/ordre/budgets/artefact figés                       | Aucune uniformité générale promise sous contraintes ; seed seule insuffisante          | [vecteurs](../tests/fixtures/canonical/reference-vectors.json), [canonical](../tests/canonical.test.ts) |
| Recettes scolaires | Carrés, binômes, discriminants carrés, racines entières, chaînes et Pythagore par composition                                          | Aucun générateur spécialisé ni solveur ; primitivité pythagoricienne non automatique   | [named-parameters](../tests/named-parameters.test.ts), [computed](../tests/computed.test.ts)            |

Budgets : 16 déclarations et 16 valeurs nommées au total, 128 choix/lignes/exclusions,
32 contraintes, 1–128 tentatives, 1–65 536 mots RNG ; rejet de rang limité à
128 mots. Un domaine local vide ou une contradiction simple prouvée donne un
échec explicite. `attempts-exhausted` signifie recherche épuisée, sans preuve
générale d’impossibilité. Aucun fallback, clamp, réparation ou reseed.

Noms de 1–32 caractères ASCII, minuscule initiale, puis lettres/chiffres.
Réservés : `e`, `i`, `sin`, `cos`, `tan`, `ln`, `exp`, `sqrt`, `constructor`,
`prototype` et `infinity` (ce dernier sans distinction de casse).
Paramètres et inconnues sont disjoints. Références longues `\mathrm{nom}` dans
les formules, `@nom` dans les textes ; `@@` produit `@`. Les scopes locaux,
majuscules initiales et underscores sont absents du profil natif.

## Exercices et éléments

Tous les types ci-dessous disposent de validation, substitution, instanciation
et projection testées dans [display-elements](../tests/display-elements.test.ts).
Les contrôles portent sur des **données prescrites par l’auteur** : ils ne
prouvent pas automatiquement la courbe, les signes ou les variations d’une fonction.
[ADR 009](adr/009-display-elements.md) fixe leurs règles détaillées.

| Types                                  | Données réellement préparées                                                               | Limites                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `text`, `section`, `rich-text`         | Texte et fragments text/math ordonnés ; sections plates par ID                             | Aucun HTML interprété ni détection automatique de math inline                                                |
| `expression`                           | Substitution/affichage polynomial borné ; `mode:'display'` pour formules plus larges       | Mode display sans preuve de domaine                                                                          |
| `question`, `mcq`                      | Attendus privés par ID, format/politique cohérents, QCM simple/multiple et options stables | Options LaTeX QCM rationnelles fermées ; collisions exactes refusées, pas de comparaison sémantique de prose |
| `equation`, `system`                   | Relations binaires et IDs locaux                                                           | Pas de chaînes de relations ni solveur de système                                                            |
| `hint`, `explanation`                  | Fragments instanciés, référence facultative à une question                                 | Entièrement privés, absents de la projection publique                                                        |
| `function-graph`                       | Formules, variable, fenêtre exacte, grille/labels/couleurs                                 | Aucun dessin, sampling ou fenêtre automatique                                                                |
| `sequence-graph`                       | Points prescrits, formule explicite ou récurrence et valeur initiale                       | 1–64 termes déclarés ; termes non calculés implicitement                                                     |
| `sign-table`, `variation-table`        | Abscisses ordonnées, signes/directions, valeurs et limites unilatérales distinctes         | Cohérence des données, sans calcul des racines ou de la dérivée                                              |
| `value-table`, `statistics-table`      | Grille rectangulaire ou valeurs/effectifs exacts non négatifs                              | Pas de moyenne ou distribution calculée automatiquement                                                      |
| `probability-tree`                     | Racine/parents/IDs sans cycle ; probabilités exactes [0,1], somme ≤1 ou =1 si exhaustif    | Issues déclarées disjointes ; aucun produit de chemin implicite                                              |
| `vectors`, `geometry`, `complex-plane` | Coordonnées exactes, dimensions/références, objets géométriques minimaux                   | Pas de norme, aire, congruence, module, argument ou correction vectorielle/complexe générale                 |

Les nombres de rendu sont des rationnels exacts. Les formules de présentation
portent `formulaDomain:'unverified'`. Catalogue privé typé et `keyboard` indicatif
sont disponibles ; publication, recherche et configuration réelle d’UI sont externes.

Instanciation atomique de toute la liste, variables communes résolues une fois,
questions corrigibles indépendamment, associations conservées après réordonnancement.
Projection détachée par sélection imbriquée, sans définition, seed, génération,
catalogue, extensions, attendus, politiques ou traces. Tests complémentaires :
[composition](../tests/composition.test.ts), [instantiation](../tests/instantiation.test.ts),
[versions](../tests/snapshot-version.test.ts).

## Correction

`gradeAnswer` choisit la famille depuis la question officielle. Le client transmet
seulement LaTeX/texte brut ou IDs QCM. Une structure valide n’est pas une preuve
mathématique. `correct`, `incorrect`, `invalid`, `indeterminate` et `error` restent
distincts ; la valeur, la forme, le domaine et la méthode sont inspectables séparément.
Une question non soumise reste un état applicatif « non répondu ».

| Famille de réponse                  | Preuve et comportement supportés                                                                                                            | Limites principales                                                                                              | Tests / décision                                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `rational`, `real`                  | Rationnels, décimaux exacts, q√d exacts ; identités fermées admises ; encadrements affines d’une constante π ou e                           | Sommes de radicaux incompatibles ou constantes sans preuve suffisante indéterminées ; aucune preuve par float    | [grading](../tests/grading.test.ts), [bornes indépendantes](../tests/numeric-constant-bounds.test.ts), [ADR 010](adr/010-numeric-grading.md) |
| Approximation officielle            | Bande inclusive A+R·\|attendu\| ; A/R chaînes décimales exactes ; frontière incertaine indéterminée                                         | A≤10⁶, R≤1, six décimales ; aucune tolérance implicite                                                           | [grading](../tests/grading.test.ts), ADR 010                                                                                                 |
| `extended-real`                     | ±∞ explicitement saisis, signes distingués ; valeurs finies du profil numérique                                                             | `1/0` invalide ; arithmétique avec infini hors profil                                                            | [grading](../tests/grading.test.ts), [school-math](../tests/school-math.test.ts)                                                             |
| `expression`                        | Polynômes rationnels univariés par coefficients exacts CortexJS                                                                             | Pas de multivarié libre ou radical variable ; `sqrt(x²)` contre `x` indéterminé                                  | [algebra-grading](../tests/algebra-grading.test.ts), [ADR 011](adr/011-algebra-collections.md)                                               |
| `rational-expression`               | Produits croisés exacts et trous raw conservés ; mêmes domaines par défaut ou domaine réel cofini imposé                                    | Zéros de dénominateurs sous profils degré 0–2 / produits / puissances de facteurs admis ; domaine général absent | algebra-grading, ADR 011                                                                                                                     |
| `equation`, `inequality`            | Relations binaires polynomiales dont la différence a degré 0–2 ; comparaison par ensembles de solutions                                     | Pas de solveur général ni conversion implicite entre équation et ensemble                                        | algebra-grading, ADR 011                                                                                                                     |
| `set`, `intervals`                  | Ensembles finis/vide, ordre et répétitions ignorés ; intervalles français/unions, fermetures et bornes infinies/quadratiques sous preuve    | Pas de collections imbriquées ; ordre inconnu indéterminé ; infinis ouverts seulement                            | [collection-grading](../tests/collection-grading.test.ts), ADR 011                                                                           |
| Formes                              | Fraction irréductible, développée, réduite, factorisation complète sur ℚ bornée ; alternatives de familles ou références privées certifiées | Facteur de degré ≥3 indéterminé ; forme analysée sur original ; référence explicite conserve sa structure        | [forms](../tests/forms.test.ts), [ADR 012](adr/012-pedagogical-forms.md)                                                                     |
| Fonctions / attendus connus         | Valeurs usuelles log/exp/trig, domaines contrôlés ; réponse de limite −∞ connue, dérivée polynomiale attendue comparée                      | Aucun solveur de limites/dérivées ; `tan(1)` sans preuve de non-pôle indéterminé                                 | school-math, [ADR 013](adr/013-school-known-answers.md)                                                                                      |
| `log-affine-positive`, `power-of-e` | A·ln(x)+B exact sur x>0 ; e^q rationnel borné, injectivité/positivité ; forme e^q distincte de exp(q)                                       | Profil spécifique de l’historique 106, sans équivalence logarithmique universelle                                | [log-affine](../tests/log-affine.test.ts), [ADR 016](adr/016-reviewed-legacy-adaptation.md)                                                  |
| QCM et texte                        | Ensemble exact d’IDs, ordre ignoré, doublons/inconnus refusés ; texte strict/variantes et normalisation explicite                           | Aucun crédit partiel implicite, évaluation sémantique ou IA                                                      | grading, [contracts](../tests/contracts.test.ts)                                                                                             |

Cas critique : `x/x` contre `1` est refusé par défaut pour différence de domaine,
tout en indiquant `equal-on-common-domain`. Sur ℝ privé de zéro explicitement
imposé, l’égalité peut être prouvée. Valeur égale mais forme violée donne
`incorrect` avec `value:'equal'` ; forme inconnue conserve `indeterminate`.

## Parsing, calcul et bornes

`parseMathInput` exporte deux profils : `scalar-latex-v1` par défaut et
`school-latex-v1` pour log/exp/trig et limites. Les profils de correction et
`display-latex-v1` sont internes : aucun import direct des modules `src/math`.
Le parsing conserve source/raw/symboles et n’effectue pas de calcul ou preuve
de domaine. `1/0` peut être parsé puis refusé à l’exécution.

Le point et `{,}` sont les décimaux admis. Une virgule nue reste ambiguë dans le
profil scalaire ; les collections disposent de leurs conventions. Un entier
juxtaposé à une fraction peut être un nombre mixte : écrire une multiplication
explicite. Placeholder ou script vide est diagnostiqué avant CortexJS.

| Niveau                      | Bornes du profil                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| JSON principal              | Sources/textes ≤4096 unités UTF-16 ; IDs/révisions/clés ≤128 ; profondeur ≤16, ≤10 000 nœuds et collections ≤128                            |
| Document                    | ≤128 éléments, ≤16 inconnues libres, ≤64 options/sélection QCM ; snapshot agrégé contrôlé                                                   |
| Parsing public              | ≤4096 unités UTF-16, groupement ≤32, MathJSON ≤512 nœuds/profondeur 64, ≤16 diagnostics                                                     |
| Calcul rationnel/génération | AST ≤128/profondeur 16, ratios/intermédiaires ≤10⁹, puissance entière 0–16 avec domaine contrôlé                                            |
| Numérique fermé             | Puissances entières −16…16, domaine contrôlé ; q√d/ratios bornés, preuve dérivée ≤256 bits                                                  |
| Algèbre/collections         | Degré structurel ≤16, produits croisés ≤32, preuve dérivée ≤256 bits, ≤64 membres/points/composantes ; AST cumulé peut être plus restrictif |

La simplification et l’évaluation restent limitées à ces profils. L’affichage
réduit n’est pas la source de preuve de forme ou de domaine. Les limites refusées
dans les tests ne sont pas des capacités supplémentaires.

## Intégrations et état de qualification

| Domaine          | État réel et preuves                                                                                                                                           | Ce qui reste absent ou conditionnel                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| MathLive         | 0.111.1, 45 observations M7, 17 observations M11 ; [captures et rejeu](mathlive-compatibility.md), [tests](../tests/mathlive-input.test.mjs)                   | Autres versions, mobiles/navigateurs non qualifiés ; aucun composant MathLive dans le moteur                                                |
| Hôte Node        | Processus neuf, quotas/deadline/file/protocole ; [tests Windows](../tests/node-host.test.mjs), [contrôles Linux](../tools/check-linux.mjs), ADR 014–015        | Windows : tests natifs PASS dans cet audit, refus M9/M12 historique ; Linux : cgroup admissible, quota partagé et nettoyage sans SLO strict |
| FastAPI / duel   | CLI privée et bridge Python ; [banc local](demo.md), [tests verticaux](../tests/integration/python/test_vertical.py) et [rejeu](../tests/e2e/vertical.test.ts) | Auth/store du banc de démonstration ; aucune adoption réelle NovLearn/Colyseus                                                              |
| Huit historiques | Conversions complètes locales et rapports, originaux conservés ; [compatibilité](compatibility.md), [tests](../tests/legacy-adapter.test.ts)                   | Catalogue complet inconnu ; aucune SQL/DB ou migration de production                                                                        |
| Distribution     | Vrais tarballs consommés en Node/TS/bundle/navigateur, persistance/rejeu/rollback M12 ; [release](release.md)                                                  | Registre/licence/adoption à décider ; compatibilité future à requalifier ; CI configurée sans preuve distante dans cet audit                |

Sont absents : renderer React, édition graphique Admin, workflow/scopes locaux P2,
correction à partir d’une réponse précédente, comptes/DB/points/progression,
CAS/solveur universel, matrices et correction vectorielle/complexe générale,
démonstrations ou rédactions libres. Ces exclusions respectent les chapitres 5.5
et 15 du CDC ; elles ne réduisent pas ses objectifs obligatoires.
