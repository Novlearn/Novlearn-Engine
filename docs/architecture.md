# Architecture et contrats canoniques

Extension M8 : [ADR014](adr/014-isolated-node-host.md), sous-chemin Node optionnel
distinct du cœur. Processus neuf et quota OS Windows10+/x64, deadline externe et
watchdog natif, cleanup avant slot libéré. Protocole backend privé avec métriques,
sans autorité navigateur. Types Node dev seulement ; aucun import Node dans la
racine portable, sept exports runtime inchangés. Autres hôtes refusés sans quota OS
validé. Transport applicatif/mesures M9 et scénarios M11 restent nécessaires.

Extension M6 : [ADR 013](adr/013-school-known-answers.md). Profil public de lecture
school-latex-v1, limites avec binding Cortex et mode display explicite des
expressions d'énoncé. Fonctions numériques fermées sous contrôle de domaine avant
réduction ; le correcteur et les sept exports runtime restent communs.

Extension M4 : [ADR 011](adr/011-algebra-collections.md), math/algebra et
math/collections sous le correcteur commun. Polynômes/fractions univariés,
relations degré 0–2, ensembles/intervalles, restrictions raw et domaine imposé.
CorrectionResult.domain séparé, equal-on-common-domain distingue domaine et
valeur. ExpectedAnswer algebra/collection porte uniquement une trace JSON.

Extension M3 : [ADR 010](adr/010-numeric-grading.md), grading et math/numeric.
Soumission latex/text/selection ; gradeAnswer officiel par IDs, cinq états et
valeur/comparaison/forme/proof distincts. NumericComparison exacte ou tolérance
officielle inclusive ; QuestionResponse et expectedLatex/expectedTexts validés
ensemble. Réels fermés, infinis typés et correction discrète documentés par profil.

Extension M2 : [ADR 009](adr/009-display-elements.md), contracts/elements,
inspection spécialisée, mapper de champs partagé et contrôles exacts des données
prescrites. Présentation raw Cortex séparée de l'admission exacte, domaine non
vérifié explicite. Catalogue/aides/traces privés, clavier UI non autoritaire.

Référence au 11 octobre 2026 : package privé 0.1.0, schemaVersion 5,
[ADR 008](adr/008-canonical-consolidation.md). Les enveloppes expérimentales ne sont
plus implémentées. [Inventaire initial](consolidation.md).

## Contrats publics

Les [types](../src/contracts/types.ts) sont la référence TypeScript. Les frontières
copient le JSON inerte sans getters, cycles, classes, non-finis, symboles, tableaux
creux ou clés dangereuses. Champs inconnus refusés ; extensions privées conservées.

| Contrat                | Responsabilité                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| ExerciseDefinition     | schemaVersion:5, kind:composed, id/revision/title, generation, variables libres, elements ordonnés, extensions privées    |
| GenerationDefinition   | schemaVersion:5, definitions/constraints/maxAttempts/maxDraws ; même contrat autonome et imbriqué                         |
| VariableDefinition     | ScalarVariableDefinition (integer/decimal/choice), TupleVariableDefinition, ComputedVariableDefinition                    |
| FreeVariableDefinition | Nom et domaine real/integer ; reste symbolique, aucune valeur tirée                                                       |
| ExerciseElement        | text, section, expression, question, mcq ; ID stable, sectionId et extensions facultatifs                                 |
| QuestionDefinition     | Branches question/mcq ; ID d'élément = ID de question                                                                     |
| AnswerDefinition       | Champs privés d'attendu/format/politique ou IDs attendus QCM                                                              |
| GeneratedValue         | Integer:value, decimal:coefficient/precision, choice:value, RationalValue:numerator/denominator                           |
| ExpectedAnswer         | Rationnel exact/trace, réel fermé/trace, expression préparée/trace, variantes texte, sélection d'IDs                      |
| ExerciseInstance       | Définition détachée, engineVersion, generation(version/seed/draws/attempts/values/groups/computed), title/elements privés |
| PublicInstance         | schemaVersion/instanceId/title/elements sélectionnés et détachés                                                          |
| AnswerSubmission       | schemaVersion:5, instanceId/questionId, latex/text/source ou selection/optionIds, même vide/incomplète                    |
| CorrectionResult       | schemaVersion:5, IDs, state/value/comparison/form/domain/proof/code ; aucune trace/attendu privé                          |

Question : text/points, response, expectedLatex ou expectedTexts et GradingPolicy,
cohérence format/kind/domaine contrôlée runtime ; FormPolicy M5 sur syntaxe
originale, familles ou références explicites privées, selon [ADR 012](adr/012-pedagogical-forms.md).
QCM : mode single/multiple, options avec IDs et contenu texte/LaTeX rationnel fermé,
expectedOptionIds privés. Collisions exactes de valeurs/affichages refusées.
Sections plates référencées par ID, indépendamment de leur position.

Les valeurs résident une fois dans generation.values. groups lie IDs et noms
ordonnés de composantes ; computed lie noms et dépendances dans l'ordre calculé.
Attendus dans chaque question identifiée, aucun tableau parallèle concurrent.

Noms : grammaire bornée partagée dans contracts/names.ts, 1–32 lettres/chiffres
avec minuscule initiale, noms réservés exclus. Références mathématiques explicites
`\mathrm{delta}`/`\mathrm{r1}`/`\mathrm{xSommet}` via dictionnaire CortexJS local ;
lettres juxtaposées inchangées. Paramètres/inconnues distincts, substitutions sans
prototype, composantes adressées par leurs noms plats (D36). Source/raw conservés.

## Structure réelle

| Module                          | Travail                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| contracts/types.ts              | Un seul modèle, sans héritage de générations expérimentales                                            |
| contracts/validation.ts         | Copie JSON bornée/primitives/frontières définition et soumission                                       |
| contracts/composition.ts        | Document/éléments/IDs/sections/politiques, inspection de génération commune                            |
| contracts/generation.ts         | Inspection scalaire/tuple/computed/contraintes, domaines/exclusions/grilles/noms                       |
| generation/variables.ts         | Seule orchestration : options, validation, préparation CortexJS, dépendances/tri, calculs/restrictions |
| generation/candidates.ts        | Une boucle atomique : plans, preuves simples d'impossibilité, tirages, calculs, comparaisons, budgets  |
| generation/scalar.ts, random.ts | Rangs et PRNG locaux, sans état global/horloge                                                         |
| contracts/decimal-grid.ts       | Encodage exact de grille, aucune algèbre                                                               |
| math/input.ts                   | Parsing Cortex raw, dictionnaires locaux par profil ; aucune preuve de domaine                         |
| math/substitution.ts            | Admission/domaine avant réduction, substitution CortexJS, rationnel exact/affichage polynomial bornés  |
| math/comparison.ts              | Ordre exact de nombres fermés ; undefined reste indéterminé                                            |
| instantiation.ts                | Validation, un appel generateVariables, parcours d'éléments, snapshot complet/projection               |
| math/numeric.ts                 | Admission réelle fermée, témoins exacts Cortex, bornes constantes et tolérances inclusives             |
| grading.ts                      | Correction par IDs officiels ; cinq états, numérique/discret/algèbre/collections sous preuve           |
| math/algebra.ts                 | Coefficients/produits croisés Cortex exacts, domaines raw, solutions degré0–2                          |
| math/collections.ts             | Ensembles et intervalles/unions normalisés par preuves exactes de bornes                               |
| index.ts                        | Export racine portable : sept fonctions et types détachés                                              |

Aucune conversion vers un ancien schéma. Résolution obligatoire même sans computed,
seule sa liste est vide. L'instanciation ne recalcule pas les dépendances par question.

1. Copier/valider structure/options, domaines locaux, noms, IDs/références/politiques.
2. Préparer computed/opérandes LaTeX et tri topologique stable : inconnues, hors profil,
   cycles avant RNG. Ordre déclaré départage les calculs prêts.
3. Préparer tirages dans l'ordre des déclarations aléatoires/composantes. Prouver
   seulement les impossibilités simples par bornes ou réflexivité.
4. Tirer tout le contexte, calculer chaque computed une fois ; vérifier restrictions
   et toutes les comparaisons même après faux.
5. Faux → retirer le candidat complet sur le flux continu. Singularité/inconnu/erreur
   → diagnostic terminal ; épuisement ≠ preuve d'impossibilité.
6. Instancier tous les éléments/attendus ; erreur → aucune instance partielle.
   Diagnostics stage/path et IDs de question/élément lorsque concernés.
7. Contrôler/copier le snapshot JSON final, sélectionner chaque niveau public,
   y compris response/options/contenus QCM.

Sources/raw/substitution conservés, affichage dérivé. Aucun eval/new Function,
transformation algébrique regex, second parseur, Math.random ou boxed public.
Parsing, évaluation, comparaison numérique, correction et preuve universelle distincts.

## API et frontières applicatives

| Fonction              | Entrée → sortie                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| validateDefinition    | unknown → ValidationResult<ExerciseDefinition>                                                                    |
| validateSubmission    | unknown → ValidationResult<AnswerSubmission>                                                                      |
| parseMathInput        | Source/contexte → source/profile/syntax/symboles ou diagnostics                                                   |
| generateVariables     | Contrat canonique depuis unknown + seed/version unique facultative → values/groups/computed/replay ou diagnostics |
| instantiateExercise   | Définition depuis unknown + instanceId/seed/version de génération facultative → ExerciseInstance ou diagnostics   |
| projectPublicInstance | ExerciseInstance officielle → PublicInstance                                                                      |
| gradeAnswer           | ExerciseInstance officielle + soumission unknown → CorrectionResult par question                                  |

Pas de validateur public de snapshots arbitraires : projection ne prouve pas
provenance. Serveur retrouve état officiel et refuse autorité client sur seed/
politique/verdict. Accès, publication, persistance, points/progression et duels
relèvent des applications. Formes M5 bornées, fonctions au M6 ; transport FastAPI/hôte
terminable mesurés au Lot 8, sans service imposé. Rendu React/MathLive séparé.

Schéma 5 : structure/policies ; révision : identité pédagogique immuable ; moteur
0.1.0 : artefact avec CortexJS épinglé ; mulberry32-rejection-v1 : flux/rangs/ordre/
rejet avec [vecteurs](../tests/fixtures/canonical/reference-vectors.json). Aucun
instantiationVersion redondant. Pas de rejeu promis entre artefacts non identifiés.
Adaptateurs historiques futurs explicites hors fonctions principales, Lot 9.

[Budgets/profils](functional-specification.md). Calculs synchrones/contextes isolés
par appel ; deadline/quota OS/cleanup désormais qualifiés dans l'hôte optionnel M8.
Timeout de promesse/Vitest seul ne coupe pas un calcul synchrone. Navigateur,
CI distante et adoption demandent
leurs preuves propres.
