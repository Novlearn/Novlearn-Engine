# NovLearn Exercise Engine

Moteur partagé TypeScript, initialisé le 10 octobre 2026. Ce dépôt est distinct du POC. Le Lot 2 fournit un premier contrat natif versionné et sa validation structurelle ; génération, parsing mathématique, correction et interface utilisateur restent à développer.

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

`validateSubmission` conserve le LaTeX brut (y compris incomplet) et refuse les champs client de seed, politique ou verdict. Un succès structurel n'est pas une autorisation de correction : le serveur doit retrouver l'instance officielle et appliquer la future frontière mathématique. Types `ExerciseDefinitionV1`, `SubmissionV1`, `PrivateInstanceV1` et `PublicInstanceV1` exportés ; les deux types d'instance restent préparatoires, sans constructeur, projection ou validateur runtime.

La publication reste désactivée (`private: true`). Licence, nom/registre de distribution et premier contrat public seront décidés avant une release pilote.
