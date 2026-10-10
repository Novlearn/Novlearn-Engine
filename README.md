# NovLearn Exercise Engine

Fondations du moteur partagé TypeScript, initialisées le 10 octobre 2026. Ce dépôt est distinct du POC et n'implémente encore ni génération, ni correction, ni interface utilisateur. Le point d'entrée est volontairement vide ; aucun contrat métier n'est gelé.

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

Les huit JSON historiques sont absents des emplacements inspectés. Leur analyse et les contrats de migration sont donc incomplets. Les tests du POC constituent des observations externes ; ils ne valident pas ce nouveau moteur.

La publication reste désactivée (`private: true`). Licence, nom/registre de distribution et premier contrat public seront décidés avant une release pilote.
