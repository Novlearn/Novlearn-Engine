# NovLearn Exercise Engine

Moteur partagé TypeScript, initialisé le 10 octobre 2026. Ce dépôt est distinct du POC. Les Lots 2 à 4 fournissent des contrats natifs, leur validation structurelle, une frontière de parsing scalaire LaTeX et une génération déterministe de paramètres. Instances, calculs paramétriques, correction et interface utilisateur restent à développer.

Package ESM privé `novlearn-exercise-engine`, déclarations TypeScript et export racine uniquement. CortexJS 0.151.0 est la seule dépendance mathématique ; MathLive appartient aux interfaces des applications.

## Développement

Node 24.19.0 et npm 11.17.0 ont été vérifiés localement. Sur PowerShell, utiliser `npm.cmd` si `npm.ps1` est bloqué, sans modifier l'ExecutionPolicy.

```sh
npm ci
npm run check
npm pack --dry-run
```

`check` construit le package, vérifie les types, le lint, le formatage et les tests de distribution. `npm test` construit puis lance Vitest ; `npm run format` applique Prettier. Le cache npm reste local au dépôt. Les dépendances directes sont épinglées et le lockfile doit être conservé.

## Documentation

- [Architecture et frontière FastAPI](docs/architecture.md)
- [Décisions et arbitrages multi-agents](docs/decisions.md)
- [Sources et analyses indépendantes](docs/analysis.md)
- [Stratégie de tests](docs/test-strategy.md)
- [Roadmap complète et critères de passage](docs/roadmap.md)
- [État réel, vérifications et transmission](docs/progress.md)
- [Spécification de génération actuelle et cible](docs/adr/006-deterministic-generation.md)
- [Matrice de couverture de génération](docs/compatibility.md#matrice-de-couverture-fonctionnelle--génération)
- [ADR](docs/adr/001-core-boundary.md)

Les huit lignes historiques reçues dans `docs/exercises_rows.json` sont conservées avec leur empreinte et inventoriées dans [compatibility.md](docs/compatibility.md). Une question de minimum de trinôme (ligne 103) est transcrite manuellement pour le premier contrat de valeur rationnelle. Aucun adaptateur de migration des huit exercices n'est implémenté. Les tests du POC constituent des observations externes ; ils ne valident pas ce nouveau moteur.

## API actuelle

```ts
import {
  validateDefinition,
  validateSubmission,
} from 'novlearn-exercise-engine';

const result = validateDefinition(input); // input: unknown
if (result.ok) {
  // Contrat natif v1 validé structurellement, copie détachée.
  // Aucun parsing, calcul ou preuve mathématique effectué.
  const definition = result.value;
} else {
  // Diagnostics avec chemins JSON Pointer.
  const diagnostics = result.diagnostics;
}
```

`validateSubmission` conserve le LaTeX brut (y compris incomplet) et refuse les champs client de seed, politique ou verdict. Un succès structurel n'est pas une autorisation de correction : le serveur doit retrouver l'instance officielle et appliquer les contrôles mathématiques. Types `ExerciseDefinitionV1`, `SubmissionV1`, `PrivateInstanceV1` et `PublicInstanceV1` exportés ; les deux types d'instance restent préparatoires, sans constructeur, projection ou validateur runtime.

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

Au plus 16 paramètres et 128 exclusions/choix. Entiers dans ±1 000 000, précision décimale 0…6 et coefficients de grille dans ±1 000 000 000. Domaines vides, définitions invalides, types/version inconnus et limites dépassées produisent des diagnostics explicites, sans valeur partielle ni fallback. Contraintes entre paramètres, computed, tuples et fractions calculées sont absents. La fixture du trinôme garantit a>0 ; le générateur ne calcule pas encore l'abscisse −b/(2a).

La cible décidée retient quatre mécanismes composables : **aléatoire numérique, choix, tuple générique et calculé**. Aucun type indépendant `function`, `perfect_square` ou doublet/triplet ; les familles mathématiques se construisent par formules et contraintes. Les JSON cibles proposés dans [ADR 006](docs/adr/006-deterministic-generation.md) sont explicitement distincts des contrats disponibles. La [roadmap](docs/roadmap.md) propose un complément 4 bis pour tuples et comparaisons simples avant les calculs/snapshots du Lot 5. Cette mise à jour est documentaire ; aucun nouveau lot de code commencé.
