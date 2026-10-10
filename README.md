# NovLearn Exercise Engine

Complément Lot 5 (11 octobre 2026) : calculs rationnels exacts, dépendances et contraintes arithmétiques bornées sous `variables-v3`, intégrés aux exercices v4. Les sections v1/v2/v3 ci-dessous conservent leurs profils historiques. Correcteur, éléments avancés et UI restent différés.

Moteur partagé TypeScript, initialisé le 10 octobre 2026. Contrats natifs, parsing scalaire LaTeX, génération déterministe et instances v1/v2/v3/v4 avec attendus privés/projection publique. Tuples, comparaisons et calculs rationnels livrés ; correction et UI différées.

## Variables calculées — complément Lot 5

```ts
import { generateVariables } from 'novlearn-exercise-engine';
import type { GenerationDefinitionV3 } from 'novlearn-exercise-engine';

const generation: GenerationDefinitionV3 = {
  schemaVersion: 3,
  definitions: [
    { name: 'b', kind: 'computed', latex: '2a+3' },
    { name: 'a', kind: 'integer', min: 1, max: 10, exclusions: [] },
  ],
  constraints: [
    {
      kind: 'comparison',
      left: { variable: 'b' },
      operator: '<',
      right: { constant: 15 },
    },
    {
      kind: 'comparison',
      left: { variable: 'b' },
      operator: '>',
      right: { constant: 7 },
    },
  ],
  maxAttempts: 128,
  maxDraws: 4096,
};
const result = generateVariables(generation, {
  seed: 42,
  generationVersion: 'variables-v3',
});
// a=5, b={kind:'rational',numerator:13,denominator:1}
// attempts=3, draws=3 ; computed=[{name:'b',dependencies:['a']}].
```

`computed.latex` réutilise le profil rationnel fermé de substitution CortexJS. Les références aux scalaires/composantes/calculs sont extraites par le parseur ; inconnues et cycles refusés avant RNG. Ordre topologique stable, sans tirage pour les calculs. `a/b` avec a=3,b=2 donne le ratio 3/2 ; 0.1+0.2 donne 3/10. Les restrictions facultatives `{domain:'integer'|'rational',min?,max?,exclusions?}` contrôlent exactement le résultat, sans clamp. Les comparaisons ajoutent des opérandes `{latex:'a^2+b^2'}` / `{latex:'c^2'}`.

Chaque tentative tire tout le contexte, calcule les dépendances puis vérifie restrictions et contraintes. Faux → nouveau candidat ; indéterminé, formule non définie ou erreur → diagnostic terminal, aucune valeur partielle. Exclure les tirages entraînant une division par zéro. Budgets v2 conservés, ratios/intermédiaires ≤10^9, AST ≤128 nœuds/profondeur 16, puissances entières 0…16. En LaTeX, écrire `a^{16}` pour un exposant à plusieurs chiffres. Racines, irrationnels, complexes et solveur hors profil.

`ExerciseDefinitionV4` porte `generation:GenerationDefinitionV3` et les éléments v2. Les mêmes fonctions `instantiateExercise` / `projectPublicInstance` sélectionnent `variables-v3` / `composed-instance-v4`. Contexte résolu une seule fois, partagé entre questions/expressions/textes/QCM. Snapshot privé : seed/versions/attempts/draws, valeurs exactes plates, groups/computed (liaisons sans valeurs dupliquées), définition/source/restrictions et attendus par ID. Projection : contenu affichable sélectionné ; aucun calcul/attendu/politique/seed transmis automatiquement. Noms d'une lettre hors e/i conservés ; r/s remplacent r1/r2 dans les exemples natifs. Détails : [ADR 006](docs/adr/006-deterministic-generation.md), [ADR 007](docs/adr/007-native-instantiation.md).

Package ESM privé `novlearn-exercise-engine`, déclarations TypeScript et export racine uniquement. CortexJS 0.151.0 est la seule dépendance mathématique ; MathLive appartient aux interfaces des applications.

## Développement

Node 24.19.0 et npm 11.17.0 ont été vérifiés localement. Sur PowerShell, utiliser `npm.cmd` si `npm.ps1` est bloqué, sans modifier l'ExecutionPolicy.

```sh
npm.cmd ci
npm.cmd run check
npm.cmd pack --dry-run
```

`check` construit le package, vérifie les types, le lint, le formatage et les tests de distribution. `npm test` construit puis lance Vitest ; `npm run format` applique Prettier. Le cache npm reste local au dépôt. Les dépendances directes sont épinglées et le lockfile doit être conservé.

## Documentation

- [Vision et périmètre](docs/exercise-engine-vision.md)
- [Spécification fonctionnelle et inventaire des types d'éléments](docs/functional-specification.md)
- [Parcours Admin, élève, correction et duels](docs/exercise-lifecycle.md)
- [Architecture et frontière FastAPI](docs/architecture.md)
- [Couverture fonctionnelle globale et preuves manquantes](docs/feature-coverage.md)
- [Audit de cohérence et arbitrages](docs/architecture-review.md)
- [Décisions et arbitrages multi-agents](docs/decisions.md)
- [Sources et analyses indépendantes](docs/analysis.md)
- [Stratégie de tests](docs/test-strategy.md)
- [Roadmap complète et critères de passage](docs/roadmap.md)
- [État réel, vérifications et transmission](docs/progress.md)
- [Spécification de génération actuelle et cible](docs/adr/006-deterministic-generation.md)
- [Matrice de couverture de génération](docs/compatibility.md#matrice-de-couverture-fonctionnelle--génération)
- [ADR](docs/adr/001-core-boundary.md)
- [API, substitution et limites d'instanciation](docs/adr/007-native-instantiation.md)

Les huit lignes historiques reçues dans `docs/exercises_rows.json` sont conservées avec leur empreinte et inventoriées dans [compatibility.md](docs/compatibility.md). Une question de minimum de trinôme (ligne 103) est transcrite manuellement pour le premier contrat de valeur rationnelle. Aucun adaptateur de migration des huit exercices n'est implémenté. Les tests du POC constituent des observations externes ; ils ne valident pas ce nouveau moteur.

## API actuelle

Le contrat v2 retient une liste plate avec sections et variables communes : texte/expression/question/QCM simple et multiple. Chaque question possède son ID et son attendu privés ; les politiques mathématiques restent privées. Les futures comparaisons symboliques exigent les mêmes domaines par défaut, avec domaine imposé explicite possible par question. Le natif v1 est conservé. L'audit conclut **cohérente avec réserves**, notamment sur computed/contraintes générales, correcteur, isolation et adoption applicative.

```ts
import {
  validateDefinition,
  validateSubmission,
} from 'novlearn-exercise-engine';

const result = validateDefinition(input); // input: unknown
if (result.ok) {
  // Contrat v1, v2 ou v3 validé structurellement, copie détachée.
  // Aucun parsing, calcul ou preuve mathématique effectué.
  const definition = result.value;
} else {
  // Diagnostics avec chemins JSON Pointer.
  const diagnostics = result.diagnostics;
}
```

`validateSubmission` conserve le LaTeX brut (y compris incomplet) et refuse les champs client de seed, politique ou verdict. Un succès structurel n'est pas une autorisation de correction : le serveur doit retrouver l'instance officielle et appliquer les contrôles mathématiques. Types de définition/instances v1, v2 et v3 exportés ; `SubmissionV1` reste le transport LaTeX, sans transport QCM livré. Les instances sont construites par l'API du Lot 5 ci-dessous, sans validateur public de snapshots arbitraires. Depuis une entrée `unknown`, vérifier `schemaVersion` avant d'accéder aux champs propres à chaque version ; les entrées déjà typées conservent leur type de résultat via surcharges.

```ts
import { parseMathInput } from 'novlearn-exercise-engine';

const parsed = parseMathInput(String.raw`\frac{-b}{2a}`, {
  parameters: ['a', 'b'],
  variables: ['x'],
});
if (parsed.ok) {
  const syntax = parsed.syntax; // MathJSON raw, sans objet boxed ni calcul.
  const symbols = parsed.symbols; // paramètres, variables libres, constantes.
} else {
  const diagnostics = parsed.diagnostics; // codes stables, chemin/offset si disponible.
}
// parsed.source conserve toujours exactement le LaTeX fourni.
```

Le profil `scalar-latex-v1` accepte fractions, puissances, racines et arithmétique avec noms du contrat v1. `1.25` et `1{,}25` sont décimaux ; `1,25` est refusé comme ambigu. Les placeholders sont refusés avant parsing. Le MathJSON raw conserve `x/x` comme division et `1+2` comme addition : aucun calcul ni canonicalisation. Un succès ne prouve ni domaine, ni forme pédagogique, ni valeur ; `1/0` reste parsable. Sources limitées à 4096 unités UTF-16 ; parsing synchrone sans garantie de deadline. API, matrice de support et limites dans [ADR 005](docs/adr/005-math-input.md).

La publication reste désactivée (`private: true`). Licence, nom/registre de distribution et premier contrat public seront décidés avant une release pilote.

## Génération de paramètres — Lot 4

```ts
import { generateVariables } from 'novlearn-exercise-engine';

const generated = generateVariables(
  [
    { name: 'a', kind: 'integer', min: 1, max: 3, exclusions: [] },
    { name: 'b', kind: 'integer', min: -6, max: 6, exclusions: [0] },
    { name: 'c', kind: 'integer', min: -5, max: 5, exclusions: [] },
  ],
  { seed: 42, generationVersion: 'parameters-v1' },
);
// { ok: true,
//   values: { a: {kind:'integer', value:1},
//             b: {kind:'integer', value:5},
//             c: {kind:'integer', value:0} },
//   replay: {engineVersion:'0.0.0', generationVersion:'parameters-v1',
//            seed:'42', draws:3} }
// En cas d'échec : {ok:false, diagnostics:[{code, path, message}]}.
```

La liste `parameters` d'une définition native validée peut être fournie directement. Le résultat ne construit pas d'instance et ses métadonnées de rejeu restent privées. Conserver la définition/révision et l'ordre du tableau pour rejouer la génération. Seed uint32 ou chaîne décimale canonique ; Mulberry32, tirages locaux sans horloge ni `Math.random`, mapping de rang sans biais modulo, limite de 128 mots par rang. Un domaine singleton ne consomme aucun mot.

Types supportés : `integer`, `decimal` et `choice`. Le contrat `GenerationParameterV1` ajoute les deux derniers pour les tirages autonomes ; `ExerciseDefinitionV1` reste la famille à paramètres entiers. Exemple décimal : `{name:'d', kind:'decimal', min:-0.3, max:0.3, precision:1, exclusions:[0]}` renvoie `{kind:'decimal', coefficient, precision:1}`, représentant exactement `coefficient/10`. Les bornes non alignées sont intersectées avec la grille ; les exclusions doivent être alignées. Pas de snap ni de tolérance pour les artefacts flottants. Exemple choix : `{name:'f', kind:'choice', values:[-2, 0.125, 7]}` renvoie un nombre de cette liste ; doublons refusés, sans poids implicites.

Au plus 16 paramètres et 128 exclusions/choix. Entiers dans ±1 000 000, précision décimale 0…6 et coefficients de grille dans ±1 000 000 000. Domaines vides, définitions invalides, types/version inconnus et limites dépassées produisent des diagnostics explicites, sans valeur partielle ni fallback. Sous `parameters-v1`, contraintes entre paramètres, computed et tuples restent refusés. La fixture du trinôme garantit a>0 ; `generateVariables` reste limité aux tirages, tandis que `instantiateExercise` calcule désormais l'abscisse −b/(2a).

La cible retient **aléatoire numérique, choix, tuple générique et calculé**. Tuples/comparaisons simples livrés au 4 bis ; computed et contraintes par expressions différés. Aucun type `function`, `perfect_square` ou doublet/triplet. Les JSON marqués draft dans ADR 006 restent des propositions distinctes du contrat variables-v2 livré.

## Instanciation native — Lot 5

```ts
import {
  instantiateExercise,
  projectPublicInstance,
} from 'novlearn-exercise-engine';

// definition : contrat natif entier v1, fourni par le serveur.
const result = instantiateExercise(definition, {
  seed: 42,
  instanceId: 'opaque-id-supplied-by-server',
});
if (result.ok) {
  const official = result.value; // Snapshot privé complet et détaché.
  const display = projectPublicInstance(official); // DTO public sélectionné.
  // Fixture native 103 : a=1,b=5,c=0 ; énoncé x^2+5x.
  // official.expectedMath.value :
  // {kind:'rational', numerator:-5, denominator:2}
  // official.expectedLatex : '-\\frac{5}{2}'
} else {
  // diagnostics : étape, chemin JSON Pointer, code et message.
}
```

La définition reste inchangée. Sources, syntaxe raw, substitution, valeur exacte et affichage sont séparés. Seed/moteur/génération/instanciation et snapshot restent privés ; la projection sélectionne uniquement ID, titre, énoncé et question. L'appelant doit utiliser un ID opaque indépendant de la seed et retrouver son état officiel côté serveur. Même définition/révision, seed, ID et versions → même JSON ; aucun état global, horloge ou réseau.

Dans `title`, `statement.text`, `question.text`, `@a` désigne un paramètre et `@@` échappe `@` ; les noms ordinaires restent du texte. Les formules utilisent les symboles natifs du champ LaTeX, sans `@`. CortexJS fixe les produits implicites symboliques puis substitue les paramètres en raw. Les juxtapositions purement numériques ambiguës sont refusées : utiliser `\cdot`. Les restrictions sont contrôlées avant réduction : `x/x`, division par zéro, variable libre dans l'attendu, racines et familles non couvertes échouent explicitement, sans instance partielle.

Profil borné : rationnels fermés exacts, expression polynomiale d'énoncé de degré structurel ≤16, dénominateurs fermés non nuls, exposants entiers 0…16 (base symbolique à la puissance zéro refusée). Décimaux jusqu'à six places sans groupement de chiffres ; numérateurs/dénominateurs fermés ≤1 000 000 000, AST ≤128 nœuds/profondeur 16. Les contrôles sont synchrones et ne garantissent pas une deadline. Détails, contrat privé concrétisé et limites dans [ADR 007](docs/adr/007-native-instantiation.md).

Dans le contrat v1 : texte, expression d'énoncé, question rationnelle unique. QCM et collections utilisent le contrat v2 ci-dessous ; graphes/tableaux et autres familles restent différés. `extensions` est conservé privé sans interprétation. Aucun adaptateur du corpus, correcteur élève, règle de forme, renderer ou Lot 6 implémenté.

## Composition multiquestion — Lot 5 bis

`ExerciseDefinitionV2` (`schemaVersion:2`, `kind:composed`) porte `id`, `revision`, `title`, `parameters`, `variables`, `elements` et des `extensions` privées facultatives. Les paramètres réutilisent integer/decimal/choice du Lot 4, sans nouveau PRNG. `instantiateExercise` et `projectPublicInstance` sont les mêmes fonctions ; le snapshot v2 utilise `composed-instance-v2` et conserve les valeurs typées. La version d'instanciation facultative doit correspondre au schéma.

Branches d'éléments : texte/section (`text`), expression (`latex`, `label` textuel facultatif), question (`text`, `points`, `response`, `expectedLatex`, `policy`) et QCM (`text`, `points`, `mode`, `options`, `expectedOptionIds` privés). Chaque élément porte un ID unique et peut référencer une section par `sectionId`. Les sections restent plates. `@a`/`@@` s'appliquent aux textes et labels ; les formules passent par CortexJS dans leur champ dédié.

Une question attend soit un rationnel exact (`response:{format:latex,kind:rational}`, politique rationnelle value-only), soit une expression polynomiale préparée (`kind:expression`, politique polynomial value-only), sans preuve d'équivalence ni forme pédagogique. Son `expected` privé reste attaché à son ID dans `instance.elements`. Le QCM simple/multiple conserve l'ordre et les IDs d'options, avec contenu texte ou LaTeX rationnel fermé ; collisions exactes après substitution refusées. La projection sélectionne chaque branche et ses objets imbriqués, sans attendu, politique, trace mathématique ni métadonnées privées.

Le [scénario natif à cinq éléments](tests/fixtures/contracts/quadratic-multiquestion.definition.json) utilise a=2,b=−4,c=5 : `2x²−4x+5`, abscisse 1 et minimum 3. [Tests](tests/composition.test.ts) : association par ID après réordonnancement, rejeu JSON, fractions, génération intégrée, QCM, diagnostics et secrets imbriqués exclus. Il s'agit d'une fixture synthétique, pas d'une migration historique. Limites et audit initial dans [ADR 007](docs/adr/007-native-instantiation.md#lot-5-bis--composition-v2).

Au plus 128 éléments, 64 options par QCM et les budgets JSON/math existants ; les budgets agrégés du snapshot peuvent être plus restrictifs. Graphes/tableaux, relations/systèmes, options QCM symboliques, tuples, computed et contraintes intervariables restent explicitement refusés. Verdict : **Lot 5 validé avec réserves** pour la composition scalaire ; la cible complète de roadmap n'est pas clôturée. Aucune correction élève ou intégration officielle livrée.

## Tuples et contraintes — Lot 4 bis

La même API accepte un contrat de génération versionné :

```ts
import { generateVariables } from 'novlearn-exercise-engine';
import type { GenerationDefinitionV2 } from 'novlearn-exercise-engine';

const generation: GenerationDefinitionV2 = {
  schemaVersion: 2,
  definitions: [
    {
      id: 'ordered',
      kind: 'tuple',
      mode: 'generate',
      components: [
        { name: 'a', kind: 'integer', min: 1, max: 10, exclusions: [] },
        { name: 'b', kind: 'integer', min: 1, max: 10, exclusions: [] },
      ],
    },
  ],
  constraints: [
    {
      kind: 'comparison',
      left: { variable: 'a' },
      operator: '<',
      right: { variable: 'b' },
    },
  ],
  maxAttempts: 128,
  maxDraws: 1024,
};
const result = generateVariables(generation, {
  seed: 42,
  generationVersion: 'variables-v2',
});
// a=5, b=6 ; attempts=2, draws=4.
// values contient les scalaires typés ; groups=[{id:'ordered',components:['a','b']}].
```

Le mode `choice` utilise les mêmes domaines de composantes et ajoute, par exemple, `values:[[3,4,5],[5,12,13],[8,15,17]]` pour une arité trois : une ligne entière est tirée. Seed 42 choisit (3,4,5), seed 0 choisit (8,15,17). Les exclusions de composantes retirent les lignes concernées. Choice scalaire v2 accepte `exclusions` optionnel ; choice v1 reste inchangé.

Six opérateurs : `< <= > >= == !=`. Opérandes `{variable:'a'}` ou `{constant:3}`, entre scalaires et groupes. Limites : 16 valeurs nommées, arité 2…8, 32 contraintes, 128 tentatives et 65 536 mots RNG ; `maxAttempts/maxDraws` obligatoires. Noms d'une lettre hors e/i ; choix/constants exacts sur six décimales au plus, coefficient ±1 000 000 000. Aucun prédicat LaTeX, tuple imbriqué, calculé ou solveur.

Un échec v2 ne contient aucune valeur/groupe ; métadonnées privées de rejeu (seed, draws, attempts) et diagnostic distinct : `empty-domain`, `attempts-exhausted`, `indeterminate-constraint`, `comparison-failed` ou `limit`. Options invalides rejetées avant ce rejeu. Pas d'uniformité générale ni de deadline préemptive. [Contrat détaillé](docs/adr/006-deterministic-generation.md#décisions-lot-4-bis--variables-v2-11-octobre-2026).

`ExerciseDefinitionV3` réutilise les éléments v2, avec `schemaVersion:3` et `generation` à la place de `parameters`. `instantiateExercise` sélectionne `variables-v2/composed-instance-v3`, substitue les mêmes valeurs partout et conserve les groupes dans `PrivateInstanceV3.generation`. `projectPublicInstance` sélectionne les champs publics v3. Les six fonctions publiques restent les mêmes ; les nouveaux types sont exportés. Depuis `unknown`, vérifier `schemaVersion`. V1/v2 restent acceptés sans changement de leurs vecteurs.
