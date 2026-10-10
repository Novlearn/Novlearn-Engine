# ADR 007 — Instanciation rationnelle native

**Archive de décisions expérimentales.** Depuis le 11 octobre 2026, les anciens contrats/options ne sont plus disponibles. [ADR 008](008-canonical-consolidation.md) les remplace ; profils mathématiques et preuves historiques conservés. [API actuelle](../architecture.md).

## Complément Lot 5 — instance v4

Le 11 octobre 2026, `ExerciseDefinitionV4` remplace seulement le schéma et la génération de v3 : generation schemaVersion 3 / variables-v3. La même orchestration résout une seule fois toutes les valeurs, puis les réutilise dans titres/textes/expressions/questions/QCM. Substitution étendue aux ratios calculés, sans nouveau profil d'élément. Prose : ratio `3/2`, entier calculé `3` ; LaTeX substitué par CortexJS. Variables libres disjointes conservées, attendus privés attachés aux IDs. Une question échouée ne retourne aucune instance partielle.

Snapshot `PrivateInstanceV4` / `composed-instance-v4` : définition détachée (sources/restrictions), seed/versions/tirages/tentatives, paramètres typés exacts, groupes et liaisons computed ordonnées. Le ratio apparaît uniquement dans la table de valeurs ; les liaisons ne le dupliquent pas. Données JSON-sérialisables, rejeu avec mêmes entrées/artefacts. Projection `PublicInstanceV4` : même sélection de branches/objets imbriqués qu'en v2/v3, aucun attendu/politique/dépendance/calcul/source privé/seed. Un auteur peut choisir d'afficher une valeur dans un texte public ; la projection ne cache pas ce contenu volontairement publié.

API inchangée : nouvelles surcharges/types, aucun second instanciateur/résolveur public. v1/v2/v3 et snapshots historiques conservés. Diagnostics génération préfixés `/generation`, erreurs mathématiques/indéterminations terminales distinctes des essais épuisés. Tests generation-v3 : discriminant −24 et sommet 1 dans deux questions, partage/rejeu/IDs/permutation/projection, fraction en texte/QCM et échec atomique. Les descriptions antérieures restent historiques. Correcteur, éléments avancés, UI et transport différés.

Statut : retenu pour la tranche native du Lot 5, 10 octobre 2026. La demande autorise l'instanciation du premier trinôme et interdit de reconstruire les capacités absentes du Lot 4. Le complément 4 bis et le Lot 5 étendu restent différés. Aucun blocage du scénario scalaire 103 : ses paramètres entiers et ses domaines locaux sont déjà disponibles.

Les sections natives ci-dessous décrivent le contrat v1 conservé. La mission **Lot 5 bis** ajoute le sous-ensemble composé scalaire v2 en fin de document ; elle ne clôture pas tuples/computed/contraintes de la cible complète.

## API et contrats

`instantiateExercise(definition: unknown, {instanceId, seed, generationVersion?, instantiationVersion?})` retourne `{ok:true,value:PrivateInstanceV1}` ou `{ok:false,diagnostics}`. `projectPublicInstance(instance)` sélectionne explicitement les champs de `PublicInstanceV1` et crée des objets détachés. Aucun export de substitution, boxed expression, ComputeEngine, renderer ou correcteur.

La définition reste `ExerciseDefinitionV1`, `schemaVersion:1`, `kind:rational-value`, paramètres **entiers uniquement**, variables libres distinctes, énoncé texte + expression LaTeX, question unique et politique rationnelle de valeur. Decimal/choice du Lot 4 restent des API autonomes ; leurs encodages sont testés dans la frontière interne de substitution mais ne deviennent pas des définitions natives admises. Aucun contrat computed/tuple/contrainte intervariable ajouté.

Les DTO d'instance auparavant préparatoires sont concrétisés : `instantiationVersion:rational-instance-v1`, compteur privé `generation.draws`, `statementMath` et `expectedMath` ajoutés. Les champs existants sont conservés, notamment `expectedLatex`, qui porte désormais l'affichage calculé. Les nouvelles propriétés sont requises dans le type privé ; les objets construits manuellement selon l'ancien DTO préparatoire doivent être reconstruits par l'API. Définition et soumission historiques v1 inchangées. Une instance privée contient le snapshot complet de définition, sources, MathJSON raw, MathJSON substitué, affichage et `{kind:rational,numerator,denominator}` exact. Aucune division numérique arrondie ou approximation stockée.

L'ID opaque vient du serveur appelant ; le moteur ne le dérive jamais de la seed et ne génère pas d'identifiant aléatoire. Le serveur conserve cette instance officielle et fournit la définition, révision, seed et politique. La projection n'authentifie pas un snapshot reçu d'un client. Aucun validateur public de snapshots arbitraires livré : le constructeur valide ses entrées, invariants mathématiques et données JSON finales. Aucun correcteur serveur connecté.

## Ordre et substitution

1. Valider/copier les données JSON inertes de définition et options.
2. Appeler `generateVariables` du Lot 4 avec `parameters-v1`, sans nouveau PRNG ni essais supplémentaires.
3. Substituer les gabarits de texte autorisés.
4. Parser l'énoncé et l'attendu avec `parseMathInput` du Lot 3 ; conserver les sources et la syntaxe raw.
5. Encoder les littéraux décimaux bornés comme ratios entiers. Fixer les produits implicites symboliques en `Multiply` via CortexJS `map`/`function` en raw, puis substituer les seuls paramètres via `subs(...,{canonical:false})`.
6. Contrôler opérateurs, arités, domaines et budgets sur la substitution raw. Évaluer les sous-expressions fermées uniquement après contrôle de leurs descendants. Un dénominateur doit être fermé, rationnel et non nul.
7. Produire l'affichage par `canonical.evaluate()` et exiger un ratio exact de l'attendu via `toRational()`. Ne pas utiliser `N`, `simplify`, `isIdenticallyEqual` ou une comparaison pédagogique.
8. Construire une instance complète et contrôler une dernière fois les données JSON et budgets ; tout échec retourne uniquement des diagnostics avec étape et chemin de champ/sous-expression.

Les lettres des expressions sont les symboles déclarés du profil natif, sans `@`. Le texte ordinaire ne passe jamais dans un parseur mathématique. Les seuls gabarits sont `title`, `statement.text`, `question.text` : `@a` remplace le paramètre entier a, `@@` produit un caractère `@`, un `@` isolé reste littéral. Un marqueur consomme le nom entier composé de lettres ASCII/chiffres/underscore ; `@ab` ne remplace pas `@a` partiellement et échoue si ab n'est pas déclaré. Pour un email littéral contenant `@nom`, écrire `@@nom`. Les noms simples `a`, `ab`, `alpha` restent inchangés. Les sources dans le snapshot et les extensions privées ne sont jamais substituées.

Ces textes sont opaques, y compris leurs éventuels `$...$` : ils n'ont pas de substitution algébrique interne, de simplification ou de garantie de parenthésage. Toute formule paramétrée exige le champ LaTeX dédié. Les marqueurs historiques `@a` dans les formules ne sont pas adaptés implicitement ; la transcription manuelle de 103 fournit déjà les symboles natifs. Les noms historiques multi-caractères restent au Lot 9 après évolution de contrat.

## Profil mathématique et limites

Support : arithmétique rationnelle fermée, addition/soustraction/négation, multiplication explicite ou implicite **symbolique**, fractions à dénominateur fermé non nul, parenthèses, puissances entières 0…16 sous les restrictions ci-dessous ; expression polynomiale d'énoncé avec variables libres conservées. L'attendu ne doit contenir aucune variable libre avant réduction : même `x-x` ou `0x` est refusé comme `not-calculable` dans ce premier profil.

CortexJS peut interpréter `3` juxtaposé à une fraction comme un nombre mixte. Un produit symbolique `bc` ne doit pas changer de sens après insertion de b=3 et c=5/4 : on fixe son opérateur avant substitution. Toute juxtaposition raw purement numérique est refusée comme ambiguë ; écrire `3\cdot\frac{1}{4}`. La syntaxe originale conserve `InvisibleOperator`, la substitution exécutable conserve `Multiply`. Ce choix est couvert par une régression sur `a-bc`.

Domaines : `x/x`, `0/x`, fractions avec variables libres au dénominateur, racines, constantes irrationnelles et fonctions partielles sont refusés explicitement. La réduction ne peut donc pas cacher leur singularité. Exposants négatifs, fractionnaires ou symboliques refusés. `0^0` et une base symbolique à la puissance zéro sont refusés, sans analyse générale de non-nullité. Aucun solveur de domaines ou démonstration d'équivalence de fonctions partielles. L'affichage est une dérivée de la source admise, sans garantie de forme pédagogique.

Budgets additionnels : 128 nœuds MathJSON, profondeur 16, degré structurel conservateur ≤16, numérateurs et dénominateurs des valeurs rationnelles fermées/intermédiaires ≤1 000 000 000 en valeur absolue, dénominateur positif. Littéraux décimaux jusqu'à six places et encodage borné, sans tolérance ni arrondi. Une garde sur la source refuse les décimaux longs que le parseur pourrait arrondir avant encodage ; les chiffres groupés par espaces ou commandes d'espacement sont également refusés, pour éviter une précision perdue entre groupes. Les bornes des coefficients polynomiaux dérivés ne constituent pas encore celles du correcteur futur. Les contrôles JSON finaux peuvent imposer une limite plus restrictive aux structures imbriquées dans le snapshot. Textes et affichages ≤4096 unités UTF-16. CortexJS : iterationLimit 1024, recursionLimit 64 ; une `CancellationError` détectée devient `limit`. Calculs synchrones, sans garantie de deadline/mémoire ni préemption ; isolation au Lot 8.

La documentation officielle décrit [substitution et évaluation symbolique](https://cortexjs.io/compute-engine/guides/symbolic-computing/) ; les signatures réellement utilisées viennent des déclarations et sondes du package **0.151.0** installé (`form:raw`, `subs` avec `canonical:false`, `function` avec `form:raw`, `toRational`). Une mise à jour exige le rejeu des tests avant de préserver une garantie.

## Rejeu et couverture

Même définition/révision, même ordre des paramètres, même seed normalisée, même ID fourni et mêmes versions de package/CortexJS/génération/instanciation → même JSON sérialisé. Aucun état mutable global, heure ou réseau dans le parcours. La seed et le compteur de tirages restent privés. La projection exclut par sélection définition, extensions, seed, paramètres explicites, attendu, politique et flags. Elle ne prétend pas cacher les coefficients visibles dans l'énoncé ni une réponse que l'on peut calculer à partir de cet énoncé.

Le premier exercice **natif transcrit** de 103 fonctionne avec seed 42 : a=1, b=5, c=0, énoncé `x^2+5x`, attendu exact −5/2. Le cas fixe a=2,b=−4,c=3 produit `2x^2-4x+3` et abscisse 1. Un autre test a=3,b=−2,c=5 distingue abscisse 1/3 et minimum 14/3. Aucune migration automatique ni instanciation du graphe historique annoncée ; les huit lignes restent byte-identiques.

Éléments admis : texte, expression scalaire d'énoncé, question rationnelle unique. Équations/relations, QCM et IDs d'options, tableaux de signes/variations, graphiques, suites, statistiques, arbres de probabilités, vecteurs et plan complexe ne disposent pas de contrat natif d'instanciation ici. Un champ inconnu produit un diagnostic de définition ; son contenu conservé dans `extensions` reste privé et **non fonctionnel**. Le Lot 9 porte l'adaptation historique et la qualification des familles ; toute nouvelle famille nécessite ensuite son contrat et son lot explicitement autorisé, sans renderer dans le cœur.

Avant le Lot 6 : définir ses bornes/familles de comparaison, recontrôler admissibilité et domaine de la saisie élève, séparer preuve exacte/indétermination/erreur et formes, utiliser uniquement un snapshot officiel retrouvé côté serveur. Le Lot 5 étendu de la roadmap requiert toujours les arbitrages du 4 bis et une nouvelle instruction pour tuples/computed/contraintes ; aucun de ces systèmes ni le Lot 6 ne commence dans cette mission.

## Lot 5 bis — composition v2

### Audit initial, avant intervention

État observé sur arbre propre ; `npm.cmd ci` puis `npm.cmd run check` passent à **301 tests / 8 fichiers**. Les preuves référencent les fonctions et tests réellement inspectés, pas les types seuls.

| Fonctionnalité                                        | État initial                                                                  | Preuve                                                    | Écart / risque                                               |
| ----------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------ |
| Pipeline définition → génération → instance           | Implémenté et testé, natif v1                                                 | `instantiateExercise`, tests `instantiation.test.ts`      | Une question entière seulement                               |
| Liste d'éléments, sections, références                | Absente                                                                       | `ExerciseDefinitionV1`, `validateDefinition`              | Aucun discriminant d'élément natif ; champs de liste refusés |
| Questions multiples et association par ID             | Absente                                                                       | `d.question` dans `instantiateExercise`                   | Seule la première question structurelle représentable        |
| QCM simple/multiple                                   | Absent                                                                        | Types v1 et exports                                       | Pas d'options, cardinalité, collision ou projection          |
| Substitution mathématique / domaine / source          | Implémentés et testés sur profil borné                                        | `instantiateMath`, `substitution.test.ts`                 | Pas de domaine universel ni d'attendu symbolique public      |
| Gabarits texte `@a` et `@@`                           | Implémentés et testés                                                         | `textTemplate`, tests d'instance                          | Trois champs ; prose/LaTeX inline opaque                     |
| Rationnels exacts de chaque attendu                   | Partiel : un seul attendu                                                     | `expectedMath.value`, `toRational`, oracle sur 64 seeds   | Calcul exact ne vaut pas correction                          |
| Decimal/choice                                        | Partiel : générateur autonome testé                                           | `generateVariables`, `validateParameters`, génération     | Non intégrés à définition/snapshot v1                        |
| Tuples / exclusions locales / contraintes             | Tuples et intervariables absents ; exclusions locales implémentées et testées | ADR 006, `generation.test.ts`, `generation-limit.test.ts` | 4 bis proposé, pas à reconstruire dans l'instance            |
| Computed / graphe de dépendances                      | Absents                                                                       | Contrats et modules de génération                         | Cible étendue du 5 liée au schéma de groupes ouvert          |
| Projection publique                                   | Implémentée et testée, natif v1                                               | `projectPublicInstance`, test d'injection de secrets      | Nouvelles branches non prouvées initialement                 |
| Rejeu / inertie / diagnostics                         | Implémentés et testés, natif v1                                               | Validation JSON, tests contrats/instances                 | À étendre à la composition et aux objets imbriqués           |
| Correction, scores, React, migration, isolation forte | Hors périmètre de cette intervention                                          | Aucun export `gradeAnswer`, aucun framework               | Lots 6–11 / applications, preuves séparées                   |

La documentation n'est pas contradictoire sur le modèle retenu : D25/D26 confirment liste plate et premier périmètre. L'écart est entre cible et livré. La roadmap recommande 4 bis avant le **snapshot avec groupes/computed**, tandis que la demande impose le multiquestion sans reconstruire les capacités absentes du Lot 4. Arbitrage minimal adopté : un **schéma v2 explicitement scalaire**, v1/RNG conservés, aucun groupe/calcul/contrainte accepté implicitement. Le snapshot avec groupes reste ouvert ; aucune spécification réécrite pour faire passer ces absences pour support.

### Contrat et API livrés

`ExerciseDefinitionV2` : `schemaVersion:2`, `kind:composed`, identité/révision/titre, paramètres integer/decimal/choice du Lot 4, variables libres, `elements` plats et `extensions` privées. `ExerciseElementV2` discrimine :

- `text` et `section` : `id`, `text` ; section sans parent récursif.
- `expression` : `id`, `latex`, `label` textuel facultatif. Une étiquette telle que `f(x) =` est de la prose affichable ; le moteur ne parse pas une équation.
- `question` : `id`, `text`, points descriptifs positifs, `response:{format:latex,kind:rational|expression}`, `expectedLatex`, politique privée `{domain:rational|polynomial,form:value-only}` cohérente avec le format.
- `mcq` : `id`, `text`, points, `mode:single|multiple`, options avec `id`/contenu typé texte ou LaTeX, `expectedOptionIds` privés. Simple exige exactement un ID ; multiple exige une sélection non vide, sans doublon, d'IDs existants.

Tous les IDs d'éléments sont uniques, ceux d'options uniques par QCM. `sectionId` facultatif référence une section existante, indépendamment de l'ordre ; réordonner conserve les références. Toute métadonnée libre passe uniquement dans `extensions` privées. Aucun contenu générique `any`, champ de politique client ou flag correct d'option.

Les **six exports runtime existants** restent les seuls : `validateDefinition` accepte v1/v2, `instantiateExercise` construit les deux schémas, `projectPublicInstance` projette chaque schéma. Les surcharges préservent les résultats des entrées typées ; depuis `unknown`, le consommateur discrimine `schemaVersion`. C'est une évolution de type à prendre en compte pour les helpers qui supposaient toujours v1 ; leurs tests conservent les assertions et ajoutent une garde explicite. `validateSubmission`/`SubmissionV1` restent le transport LaTeX par question, sans soumission QCM ni lookup/auth livrés.

Version facultative d'instanciation : `rational-instance-v1` pour v1, `composed-instance-v2` pour v2 ; discordance → erreur d'options. La génération conserve strictement `parameters-v1`. Les options restent validées comme JSON inerte avant lecture de seed/version.

### Pipeline et invariants

La même fonction valide/détache la définition, appelle **une fois** `generateVariables` puis parcourt les éléments. Elle réutilise `textTemplate`, `parseMathInput` et `instantiateMath` existants ; `src/math` et `src/generation` sont inchangés. Decimal conserve coefficient/précision dans le snapshot et sa graphie décimale exacte dans les textes ; choice conserve son type et son nombre, sans prétendre que tout nombre JS fini satisfait le profil mathématique exact. Une valeur utilisée dans un champ mathématique doit encore passer les limites d'encodage de l'ADR.

Chaque question privée contient son `expected` **dans l'élément identifié**, sans deuxième table concurrente. Rationnel : source/syntaxe/substitution/affichage et ratio exact. Expression : source/syntaxe/substitution/affichage dans le profil polynomial existant, variables libres conservées. Aucun coefficient de correcteur extrait, aucune preuve d'équivalence ou de forme. Les restrictions sont vérifiées avant réduction : `x/x`, division par zéro, puissance ambiguë et famille inconnue produisent un échec explicite. Toutes les questions partagent les mêmes valeurs ; un échec ultérieur ne retourne pas les éléments déjà préparés.

QCM : ordre d'options conservé, aucun tirage supplémentaire. Contenu mathématique limité aux rationnels **fermés**, avec traces privées `optionMath`. Collisions de textes/affichages identiques ou ratios rationnels égaux après substitution refusées ; prose sémantiquement équivalente, rendu HTML/espaces et équivalence symbolique générale ne sont pas analysés. Les options mathématiques symboliques sont refusées comme non calculables ; aucune comparaison indéterminée n'est acceptée comme différence.

`PrivateInstanceV2` conserve définition complète, versions, génération typée, titre et éléments privés. Projection : reconstruction de chaque branche, réponse/option/contenu et référence de section par sélection ; zéro spread de données d'auteur, aucun attendu/politique/extension/trace/seed même dans les objets imbriqués. Les petites constructions d'identité portent seulement ID/sectionId préalablement sélectionnés. Le snapshot doit toujours provenir de l'état serveur officiel ; la projection ne l'authentifie pas et ne peut pas décider si un auteur a écrit une solution dans un champ public volontairement affiché.

Diagnostics existants réutilisés, `unsupported-type` ajouté à la validation pour les éléments non admis ; étapes `definition/options/generation/text/statement/expected/option/instance`, JSON Pointer et, pour les erreurs d'éléments, `elementId`/`questionId`. La validation structurelle fournit les chemins avant génération. Aucun fallback ni instance partielle.

Budgets : 128 éléments, 64 options/sélection par QCM, textes 4096, paramètres/variables 16 chacun et contraintes JSON/math déjà décrites. Le budget agrégé final (10 000 nœuds, profondeur 16, collections 128) peut refuser un snapshot volumineux même si chaque champ est individuellement admis. Sources/options/v1 restent immuables et données détachées. Même définition/révision/ordre/seed normalisée/ID et mêmes artefacts/versions → même JSON ; package 0.0.0 ne promet toujours pas de rejeu entre builds différents.

### Preuves et réserves

[Fixture native](../../tests/fixtures/contracts/quadratic-multiquestion.definition.json) et [tests](../../tests/composition.test.ts) : cinq éléments, a=2,b=−4,c=5, expression `2x^2-4x+5`, abscisse 1 et minimum 3. Association conservée après réordonnancement, sections et une question sans paramètres, attendu polynomial, fractions exactes, décimaux/choix intégrés, source gelée non mutée, aller-retour JSON et 24 seeds avec oracles BigInt indépendants pour **les deux** réponses. QCM simple/multiple : cardinal/IDs/références, permutation, collisions après substitution, projection avec secrets injectés dans toutes les branches/objets imbriqués. Échecs de deuxième question, domaine sensible, placeholder/symbole inconnu, erreur/version de génération, code/getter hostile et précision hors borne sont explicites. Les anciens tests restent présents.

Verdict : **Lot 5 validé avec réserves** pour l'instanciation composée scalaire documentée ; la cible complète de roadmap n'est pas clôturée. Restent : 4 bis tuples/comparaisons, puis complément du Lot 5 pour computed/graphe/contraintes mathématiques et snapshot de groupes ; aucun de ces besoins n'est réimplémenté ici. Figures/relations et autres formats sont différés volontairement. L'absence de correcteur, de renderer et d'isolation forte appartient aux lots/applications suivants.

Un Lot 6 rationnel borné peut être engagé **sur instruction distincte** avec association par question, snapshot officiel, familles/bornes et états explicites. Le contrat polynomial préparé n'est pas une certification de correcteur polynomial ; les options QCM préparées ne sont pas une correction de soumission. Isolation du Lot 8 et adoption serveur restent nécessaires avant correction officielle en production. Aucun Lot 6 commencé.

## Lot 4 bis — Intégration minimale v3

Le 11 octobre 2026, ExerciseDefinitionV3 réutilise les éléments/variables v2, remplace parameters par generation:GenerationDefinitionV2 et porte schemaVersion 3. instantiateExercise appelle une fois le générateur commun variables-v2, consomme son contexte plat et conserve groups/attempts dans PrivateInstanceV3 ; composed-instance-v3 et projection publique v3 par les mêmes branches. Diagnostics de génération v3 préfixés /generation. V1/v2 conservent leurs formats/algorithmes ; aucun profil mathématique ni QCM nouveau. Bilans précédents historiques.

Tests generation-v2 : provenance/rejeu, mêmes valeurs pour texte/expression/question, oracle rationnel d'aire, choix/décimaux exacts (-3/40), x libre conservé, versions/collisions et génération échouée sans instance partielle. Indétermination injectée propagée à v3. Calculés/dépendances : responsabilités de generation et math avant consommation par instantiation, prochain complément distinct. Aucun complément Lot 5 commencé.
