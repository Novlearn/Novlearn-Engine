# NovLearn Exercise Engine

Moteur partagé TypeScript, initialisé le 10 octobre 2026. Ce dépôt est distinct du POC. Les Lots 2 à 4 fournissent des contrats natifs, leur validation structurelle, une frontière de parsing scalaire LaTeX et une génération déterministe de paramètres. Le Lot 5 instancie le natif v1 et les documents composés v2 à plusieurs éléments/questions, avec attendus privés et projection publique. Tuples/computed/contraintes intervariables, correction et interface utilisateur restent à développer.

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

Le contrat v2 retient une liste plate avec sections et variables communes : texte/expression/question/QCM simple et multiple. Chaque question possède son ID et son attendu privés ; les politiques mathématiques restent privées. Les futures comparaisons symboliques exigent les mêmes domaines par défaut, avec domaine imposé explicite possible par question. Le natif v1 est conservé. L'audit conclut **cohérente avec réserves**, notamment sur groupes/computed/contraintes, correcteur, isolation et adoption applicative.

```ts
import {
  validateDefinition,
  validateSubmission,
} from 'novlearn-exercise-engine';

const result = validateDefinition(input); // input: unknown
if (result.ok) {
  // Contrat v1 ou v2 validé structurellement, copie détachée.
  // Aucun parsing, calcul ou preuve mathématique effectué.
  const definition = result.value;
} else {
  // Diagnostics avec chemins JSON Pointer.
  const diagnostics = result.diagnostics;
}
```

`validateSubmission` conserve le LaTeX brut (y compris incomplet) et refuse les champs client de seed, politique ou verdict. Un succès structurel n'est pas une autorisation de correction : le serveur doit retrouver l'instance officielle et appliquer les contrôles mathématiques. Types de définition/instances v1 et v2 exportés ; `SubmissionV1` reste le transport LaTeX, sans transport QCM livré. Les instances sont construites par l'API du Lot 5 ci-dessous, sans validateur public de snapshots arbitraires. Depuis une entrée `unknown`, vérifier `schemaVersion` avant d'accéder aux champs propres à v1/v2 ; les entrées déjà typées conservent leur type de résultat via surcharges.

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

Au plus 16 paramètres et 128 exclusions/choix. Entiers dans ±1 000 000, précision décimale 0…6 et coefficients de grille dans ±1 000 000 000. Domaines vides, définitions invalides, types/version inconnus et limites dépassées produisent des diagnostics explicites, sans valeur partielle ni fallback. Contraintes entre paramètres, computed et tuples sont absents. La fixture du trinôme garantit a>0 ; `generateVariables` reste limité aux tirages, tandis que `instantiateExercise` calcule désormais l'abscisse −b/(2a).

La cible décidée retient quatre mécanismes composables : **aléatoire numérique, choix, tuple générique et calculé**. Aucun type indépendant `function`, `perfect_square` ou doublet/triplet ; les familles mathématiques se construisent par formules et contraintes. Les JSON cibles proposés dans [ADR 006](docs/adr/006-deterministic-generation.md) sont explicitement distincts des contrats disponibles. La [roadmap](docs/roadmap.md) propose un complément 4 bis pour tuples et comparaisons simples avant le Lot 5 étendu. La tranche native ci-dessous ne les implémente pas.

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
