# Utiliser les API publiques

Les exemples de ce guide forment **un seul programme TypeScript** : copier les
blocs `ts` dans leur ordre dans un projet ESM qui a installé le tarball du package.
Ils sont compilés en mode strict et exécutés pendant l’audit documentaire.
Les valeurs et diagnostics observés sont indiqués ci-dessous. Ce programme
illustre le cœur synchrone avec des données de confiance ; l’intégration de
saisies non fiables utilise [l’hôte serveur isolé](adr/015-private-python-transport.md).

## Les sept fonctions de l’entrée portable

| Fonction exportée       | Signature utile / résultat                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| `validateDefinition`    | `unknown` → `{ok:true,value:ExerciseDefinition}` ou diagnostics structurels                                     |
| `validateSubmission`    | `unknown` → `{ok:true,value:AnswerSubmission}` ou diagnostics structurels                                       |
| `parseMathInput`        | `source`, contexte facultatif, profil public facultatif → source/syntaxe/symboles ou diagnostics                |
| `generateVariables`     | `unknown`, `{seed,generationVersion?}` → `values/groups/computed/replay` ou diagnostics                         |
| `instantiateExercise`   | `unknown`, `{instanceId,seed,generationVersion?}` → `{ok:true,value:ExerciseInstance}` ou diagnostics           |
| `projectPublicInstance` | Snapshot officiel de confiance → `PublicInstance` ; version inconnue : exception `unsupported-snapshot-version` |
| `gradeAnswer`           | Snapshot officiel de confiance, soumission `unknown` → `CorrectionResult` par question                          |

La seed est obligatoire : entier uint32 ou chaîne décimale canonique, sans
zéro initial. `generationVersion`, facultative, vaut exclusivement
`mulberry32-rejection-v1`. Les types sont exportés avec `import type`.
Les sous-chemins `legacy` et `node-host` sont traités dans les guides spécialisés.

## 1. Définir les variables et un exercice à deux questions

`b` dépend de `a` et peut être déclaré avant lui : la résolution réordonne les
calculs. Le tuple choisit une ligne entière `(u,v)`. Une exclusion retire `a=2`.
Les deux contraintes demandent `7<b<15`. `x` reste une inconnue libre, jamais tirée.

```ts
import {
  generateVariables,
  gradeAnswer,
  instantiateExercise,
  parseMathInput,
  projectPublicInstance,
  validateDefinition,
  validateSubmission,
} from 'novlearn-exercise-engine';
import type {
  AnswerSubmission,
  ExerciseDefinition,
  GenerationDefinition,
} from 'novlearn-exercise-engine';

const generation: GenerationDefinition = {
  schemaVersion: 5,
  definitions: [
    { name: 'b', kind: 'computed', latex: '2a+3' },
    { name: 'a', kind: 'integer', min: 1, max: 10, exclusions: [2] },
    {
      id: 'pair',
      kind: 'tuple',
      mode: 'choice',
      components: [
        { name: 'u', kind: 'integer', min: 1, max: 12, exclusions: [] },
        { name: 'v', kind: 'integer', min: 1, max: 12, exclusions: [] },
      ],
      values: [
        [3, 4],
        [5, 12],
      ],
    },
  ],
  constraints: [
    {
      kind: 'comparison',
      left: { variable: 'b' },
      operator: '>',
      right: { constant: 7 },
    },
    {
      kind: 'comparison',
      left: { variable: 'b' },
      operator: '<',
      right: { constant: 15 },
    },
  ],
  maxAttempts: 128,
  maxDraws: 4096,
};

const definition: ExerciseDefinition = {
  schemaVersion: 5,
  kind: 'composed',
  id: 'documentation-example',
  revision: '1',
  title: 'Calculs pour a = @a',
  generation,
  variables: [{ name: 'x', domain: 'real' }],
  elements: [
    {
      id: 'intro',
      type: 'text',
      text: 'On prend a=@a et le couple (@u; @v). @@ est littéral.',
    },
    { id: 'formula', type: 'expression', latex: 'a x+b', label: 'f(x) =' },
    {
      id: 'q-b',
      type: 'question',
      text: 'Calculer 2a+3.',
      points: 1,
      response: { format: 'latex', kind: 'rational' },
      expectedLatex: 'b',
      policy: { domain: 'rational', form: 'value-only' },
    },
    {
      id: 'q-half',
      type: 'question',
      text: 'Calculer a/2.',
      points: 1,
      response: { format: 'latex', kind: 'rational' },
      expectedLatex: '\\frac{a}{2}',
      policy: { domain: 'rational', form: 'value-only' },
    },
  ],
};
const validated = validateDefinition(definition);
if (!validated.ok) throw new Error(JSON.stringify(validated.diagnostics));
```

Les textes ordinaires sont opaques, y compris leur LaTeX inline éventuel.
Mettre les formules paramétrées dans un champ mathématique dédié ou un fragment
`math`. Pour un nom long, écrire par exemple `latex:'\\mathrm{delta}'` dans le
code TypeScript ; `@delta` s’utilise dans le texte.

## 2. Générer les valeurs

Le succès de génération porte directement `values`, sans propriété `value`.
Les calculés restent des ratios exacts même lorsqu’ils sont entiers.

```ts
const generated = generateVariables(generation, { seed: 42 });
if (!generated.ok) throw new Error(JSON.stringify(generated.diagnostics));
if (
  generated.values.a?.kind !== 'integer' ||
  generated.values.a.value !== 3 ||
  generated.values.b?.kind !== 'rational' ||
  generated.values.b.numerator !== 9 ||
  generated.values.b.denominator !== 1 ||
  generated.replay.attempts !== 7 ||
  generated.replay.draws !== 14
) {
  throw new Error('Le résultat documenté pour seed 42 a changé.');
}
console.log(
  JSON.stringify(
    {
      values: generated.values,
      groups: generated.groups,
      computed: generated.computed,
      replay: generated.replay,
    },
    null,
    2,
  ),
);
```

Sortie observée et vérifiée avec seed 42 :

| Valeur | Encodage                                                |
| ------ | ------------------------------------------------------- |
| a      | `{kind:'integer',value:3}`                              |
| u / v  | `{kind:'integer',value:3}` / `{kind:'integer',value:4}` |
| b      | `{kind:'rational',numerator:9,denominator:1}`           |
| Rejeu  | `seed:'42'`, `attempts:7`, `draws:14`                   |

`groups` lie `pair` à `['u','v']`, `computed` lie `b` à `['a']` ; `replay`
identifie moteur/générateur/seed et compte les mots RNG et tentatives.
Ajouter une déclaration aléatoire ou changer son ordre peut changer tout le flux.

## 3. Instancier

La définition décrit les règles et sources avant tirage. L’instance contient
leurs valeurs et affichages résolus, ainsi que les attendus privés des deux
questions. Le serveur fournit un ID opaque indépendant de la seed et conserve
le snapshot ; l’ID fixe ci-dessous sert seulement à l’exemple reproductible.

```ts
const instanceOptions = { seed: 42, instanceId: 'documentation-official' };
const instantiated = instantiateExercise(definition, instanceOptions);
if (!instantiated.ok) throw new Error(JSON.stringify(instantiated.diagnostics));
const official = instantiated.value;
if (
  JSON.stringify(official.generation.values) !==
  JSON.stringify(generated.values)
) {
  throw new Error('Les contextes de génération doivent être identiques.');
}
```

Un diagnostic d’instanciation porte `stage/path/code`, et éventuellement
`elementId/questionId`. `stage:'expected'` signifie défaut d’attendu officiel,
pas faute élève. Aucun échec ne retourne les éléments déjà traités comme instance.

## 4. Projeter la vue publique

```ts
const publicView = projectPublicInstance(official);
console.log(JSON.stringify(publicView, null, 2));
const publicJson = JSON.stringify(publicView);
for (const privateKey of ['expected', 'policy', 'generation', 'definition']) {
  if (publicJson.includes(`"${privateKey}":`))
    throw new Error('Champ privé exposé.');
}
```

La vue contient `schemaVersion/instanceId/title/elements`, avec formats des
questions et contenu affichable. Elle ne transporte pas les attendus, bonnes
options, seed, politique ou traces. Ce contrôle illustratif complète les tests
de projection par branche ; le backend assure toujours provenance et droits.

## 5. Soumettre et corriger une question

La soumission ne transmet aucune politique. Pour construire une réponse correcte
dans ce programme de vérification, on utilise la valeur privée générée ; dans
l’application, `source` provient de la saisie élève.

```ts
const expectedB = generated.values.b;
if (!expectedB || expectedB.kind !== 'rational')
  throw new Error('b doit être rationnel.');
const submission: AnswerSubmission = {
  schemaVersion: 5,
  instanceId: publicView.instanceId,
  questionId: 'q-b',
  answer: { format: 'latex', source: String(expectedB.numerator) },
};
const checkedSubmission = validateSubmission(submission);
if (!checkedSubmission.ok)
  throw new Error(JSON.stringify(checkedSubmission.diagnostics));
const correction = gradeAnswer(official, submission);
if (correction.state !== 'correct') throw new Error(JSON.stringify(correction));
console.log(correction);
```

Ici : `state:'correct'`, `value:'equal'`, `comparison:'exact'`,
`form:'not-required'`, `proof:'exact-number'`. La deuxième question reste non
répondue pour l’application ; le moteur n’agrège pas les résultats en score.

| État            | Comment l’interpréter                                                                        |
| --------------- | -------------------------------------------------------------------------------------------- |
| `correct`       | Valeur et forme requise démontrées, ou tolérance officielle satisfaite                       |
| `incorrect`     | Différence, domaine différent ou violation de forme démontrés ; lire les dimensions séparées |
| `invalid`       | Structure, association, format, syntaxe, saisie vide ou domaine invalide                     |
| `indeterminate` | Profil, valeur, domaine ou forme non démontrés ; ne pas convertir en faute                   |
| `error`         | Défaut officiel, version inconnue ou panne technique ; aucune faute mathématique attribuée   |

Pour un QCM, `answer` vaut `{format:'selection',optionIds:['option-1']}` et
`questionId` désigne un élément `mcq`. Pour le texte, utiliser
`{format:'text',source:'...'}` face à une question de réponse `text` avec
`expectedTexts`. Les définitions complètes testées sont dans
[grading.test.ts](../tests/grading.test.ts) et les
[exercices adaptés](../tests/fixtures/legacy/adapted).

## 6. Rejouer exactement

```ts
const replayed = instantiateExercise(JSON.parse(JSON.stringify(definition)), {
  ...instanceOptions,
  seed: '42',
  generationVersion: 'mulberry32-rejection-v1',
});
if (!replayed.ok) throw new Error(JSON.stringify(replayed.diagnostics));
if (JSON.stringify(replayed.value) !== JSON.stringify(official)) {
  throw new Error('Le snapshot JSON doit être identique.');
}
```

Conserver définition/révision/ordre/budgets, seed canonique, ID et artefact
exact avec son lock. `engineVersion:'0.1.0'` seul ne distingue pas tous les builds
privés ; la [procédure de distribution](release.md) utilise les empreintes
d’archives et un registre serveur. Les anciens snapshots expérimentaux ne sont
pas rejoués implicitement.

## 7. Diagnostiquer les erreurs

```ts
const unknown = instantiateExercise(
  { ...definition, title: '@missing' },
  instanceOptions,
);
if (
  unknown.ok ||
  !unknown.diagnostics.some((d) => d.code === 'missing-variable')
) {
  throw new Error('Variable textuelle inconnue attendue.');
}

const impossible = generateVariables(
  {
    schemaVersion: 5,
    definitions: [
      { name: 'a', kind: 'integer', min: 1, max: 1, exclusions: [1] },
    ],
    constraints: [],
    maxAttempts: 1,
    maxDraws: 1,
  },
  { seed: 42 },
);
if (
  impossible.ok ||
  !impossible.diagnostics.some((d) => d.code === 'empty-domain')
) {
  throw new Error('Domaine vide attendu, sans fallback.');
}

const invalidExpression = parseMathInput('\\frac{1}{}');
if (invalidExpression.ok) throw new Error('Expression incomplète attendue.');

const unsupportedFormat = gradeAnswer(official, {
  ...submission,
  answer: { format: 'matrix', source: '1' },
});
if (
  unsupportedFormat.state !== 'invalid' ||
  unsupportedFormat.code !== 'submission-contract'
) {
  throw new Error('Format de transport non supporté attendu.');
}
const outsideProfile = gradeAnswer(official, {
  ...submission,
  answer: { format: 'latex', source: '\\sin(1)' },
});
if (outsideProfile.state !== 'indeterminate')
  throw new Error('Indétermination attendue.');
console.log('Exemples documentaires : PASS');
```

Autres diagnostics testés : `dependency-cycle`, `attempts-exhausted`,
`undefined-expression` et `indeterminate-constraint` dans
[computed](../tests/computed.test.ts) et [pannes](../tests/computed-failures.test.ts).
Le format de transport inconnu est invalide ; une expression mathématique hors
profil admis ne prouve pas une réponse fausse. Les erreurs de l’hôte
(`timeout`, `crash`, `unavailable`, etc.) restent distinctes du verdict mathématique.
