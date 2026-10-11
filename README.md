# NovLearn Exercise Engine

Package TypeScript strict privé, ESM, version 0.1.0. Une seule architecture
canonique : **schemaVersion 5**, un résolveur déterministe, une instanciation
composée et une projection publique par sélection. CortexJS 0.151.0 est la seule
dépendance mathématique ; frameworks et MathLive appartiennent aux applications.

## Utilisation

```ts
import {
  generateVariables,
  gradeAnswer,
  instantiateExercise,
  projectPublicInstance,
} from 'novlearn-exercise-engine';
import type {
  ExerciseDefinition,
  GenerationDefinition,
} from 'novlearn-exercise-engine';

const generation: GenerationDefinition = {
  schemaVersion: 5,
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
const generated = generateVariables(generation, { seed: 42 });
// a=5, b={kind:'rational',numerator:13,denominator:1}, attempts=3, draws=3.

const definition: ExerciseDefinition = {
  schemaVersion: 5,
  kind: 'composed',
  id: 'example',
  revision: '1',
  title: 'Calcul avec @a',
  generation,
  variables: [],
  elements: [
    {
      id: 'q',
      type: 'question',
      text: 'Calculer b.',
      points: 1,
      response: { format: 'latex', kind: 'rational' },
      expectedLatex: 'b',
      policy: { domain: 'rational', form: 'value-only' },
    },
  ],
};
const result = instantiateExercise(definition, {
  seed: 42,
  instanceId: 'official-opaque-id',
});
if (result.ok) {
  const official = result.value; // Snapshot privé à conserver côté serveur.
  const display = projectPublicInstance(official);
  const correction = gradeAnswer(official, {
    schemaVersion: 5,
    instanceId: official.instanceId,
    questionId: 'q',
    answer: { format: 'latex', source: '13' },
  });
  // Aucun attendu, politique, définition, seed ou trace privée dans display.
}
```

Sept fonctions publiques : validateDefinition, validateSubmission, parseMathInput,
generateVariables, instantiateExercise, projectPublicInstance, gradeAnswer.
[Architecture et contrats](docs/architecture.md). Aucun type public expérimental
ExerciseDefinitionV1/V2/V3/V4 conservé.

## Capacités et limites

Integer, decimal exact sur grille, choix numériques finis avec exclusions, tuples
ordonnés de 2 à 8 composantes (choix de lignes ou génération), computed rationnels,
dépendances/cycles et six comparaisons avec opérandes variable/constant/latex.
Noms mathématiques : 1–32 lettres/chiffres, première lettre minuscule et noms
réservés exclus ; paramètres et variables libres disjoints. Dans les formules,
références descriptives explicites `\mathrm{delta}`, `\mathrm{r1}`,
`\mathrm{xSommet}` ; `ab` reste le produit a×b. Textes : `@delta` et `@@`.
Candidat complet retiré si faux, budgets explicites, aucun fallback.
Erreur, indétermination, domaine prouvé vide et recherche épuisée sont distincts.

Liste plate : texte, section, expression, question, QCM simple/multiple. Les données
avancées (graphes/suites/tableaux/arbres/vecteurs/figures/plan complexe/systèmes),
fragments riches et aides privées sont décrits dans [ADR 009](docs/adr/009-display-elements.md).
Catalogue typé privé et indication clavier sans autorité mathématique. Valeurs
partagées, attendu par ID, sources/raw/substitutions privés conservés. @a et @@
dans les textes/labels ; LaTeX natif et substitution CortexJS dans les formules.
Soumission LaTeX/texte brut ou sélection d'IDs QCM par question. `gradeAnswer`
corrige depuis le snapshot officiel : cinq états, valeur/comparaison/forme/preuve
séparées. [Profil numérique et discret M3](docs/adr/010-numeric-grading.md).
Rationnels, q√d exacts, identités fermées/encadrements certifiés π/e, tolérance
absolue/relative officielle inclusive et ±∞ typés ; différences non prouvées
indéterminées. QCM par ensemble d'IDs, texte strict/variantes et normalisation
explicite. Politiques, attendus et tolérances demeurent privés.

M4 : [preuves algébriques, domaines et collections](docs/adr/011-algebra-collections.md).
Polynômes rationnels univariés, fractions avec trous raw conservés et domaine
cofini imposé ; équations/inéquations degré 0–2 comparées par solutions. Ensembles
finis/vide, intervalles français/unions/bornes infinies et quadratiques.
Valeurs sur domaine commun distinguées de l'égalité sur mêmes domaines : x/x
contre 1 refusé par défaut, accepté sous domaine officiel excluant zéro.

Profil rationnel/polynomial : ratios/intermédiaires ≤10^9, AST 128 nœuds/profondeur
16, degré ≤16, puissances entières 0–16 avec domaine contrôlé avant réduction.
Un choix fini n'est pas automatiquement utilisable dans le profil exact.
Parsing public selon [ADR 005](docs/adr/005-math-input.md), distinct du profil
numérique fermé M3 ; profils algébriques M4 internes au correcteur.
M5 : [formes pédagogiques](docs/adr/012-pedagogical-forms.md) sur syntaxe originale,
fraction irréductible, développée/réduite et factorisation complète sur ℚ bornée.
Familles alternatives ou références LaTeX privées certifiées ; valeur égale et
forme non conforme restent distinctes. Forme inconnue conserve l'indétermination.
M6 : [fonctions et réponses connues](docs/adr/013-school-known-answers.md).
`parseMathInput(source, context, 'school-latex-v1')` lit log/exp/trig et limites ;
`expression.mode:'display'` substitue sans preuve de domaine. Correction des
valeurs usuelles exactes et domaines logarithme/tangente contrôlés avant réduction.
L'exemple ln(x−a)/(x−a), x>a et limite droite attendue −∞ est testé, ainsi qu'une
dérivée polynomiale connue. Aucune résolution générale ; hors preuve indéterminé.
Formules de présentation à domaine non vérifié,
nombres de rendu rationnels exacts. Pas de solveur général, de dessin ou d'isolation
préemptive. [Couverture réelle](docs/feature-coverage.md).

## Reproductibilité et rupture expérimentale

[Compatibilité MathLive M7](docs/mathlive-compatibility.md) : banc isolé 0.111.1,
45 observations réelles distinguant API, clavier, collage et clavier virtuel.
Deux formats LaTeX rejoués dans le correcteur officiel, placeholders conservés,
virgule française et alias d'ensembles/intervalles testés. Aucun MathLive dans le
package moteur ; preuve limitée à cette version et aux profils documentés.

Identité de génération : **mulberry32-rejection-v1**, flux local Mulberry32, rangs
par rejet sans biais modulo, singleton sans tirage, ordre déclaré/tri stable.
Définition/révision/ordre/budgets, seed uint32 normalisée, ID et artefacts moteur/
CortexJS identiques donnent le même snapshot. [Vecteurs canoniques](tests/fixtures/canonical/reference-vectors.json).
Schéma : structure ; moteur : artefact ; génération : protocole de tirage/rejet.
Pas de champ d'instanciation redondant.

Anciens contrats, tableaux de paramètres et options expérimentales refusés ; aucun
adaptateur implicite ou rejeu des anciens snapshots. Huit sources originales et
copie inchangées en octets. Question 103 transcrite manuellement au canonique,
aucun exercice historique complet migré. Adaptateurs futurs au Lot 9, hors cœur.

## Développement et documentation

```sh
npm.cmd ci
npm.cmd run check
npm.cmd pack --dry-run
```

check exécute build, typecheck, lint, format et Vitest sur l'entrée distribuée.
Publication désactivée. La mission V1 autorise les lots successifs et leurs
commits locaux validés ; aucun push, migration de production ou déploiement.
[Preuves locales](docs/progress.md).

- [Vision](docs/exercise-engine-vision.md), [spécification](docs/functional-specification.md)
- [Audit initial](docs/consolidation.md), [ADR 008](docs/adr/008-canonical-consolidation.md), [décisions](docs/decisions.md)
- [Roadmap](docs/roadmap.md), [tests](docs/test-strategy.md), [corpus](docs/compatibility.md)
- [Parcours applicatifs](docs/exercise-lifecycle.md), intégration différée
