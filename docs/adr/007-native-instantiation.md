# ADR 007 — Instanciation rationnelle native

Statut : retenu pour la tranche native du Lot 5, 10 octobre 2026. La demande autorise l'instanciation du premier trinôme et interdit de reconstruire les capacités absentes du Lot 4. Le complément 4 bis et le Lot 5 étendu restent différés. Aucun blocage du scénario scalaire 103 : ses paramètres entiers et ses domaines locaux sont déjà disponibles.

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
