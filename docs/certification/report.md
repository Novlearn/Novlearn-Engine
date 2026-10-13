# Certification fonctionnelle et audit d’utilisabilité V1

**Exécution : 13 octobre 2026 — dépôt local, Windows x64, Node 24.19.0/npm 11.17.0**

**Référence :** [CDC V1](../CDC_référence.md), inchangé.
**Conclusion : non prêt pour intégration pilote ou adoption.** Le cœur portable et le tarball fonctionnent sur les parcours exercés. Le contrôle complet échoue sur le transport isolé Windows, exigence P0 avant intégration officielle.

## Verdict par niveau

| Niveau                                     | Verdict                                                     | Preuve / limite                                                                                                          |
| ------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Prêt pour tests locaux                     | **Oui, sur le cœur portable et les huit fixtures adaptées** | Banc local ci-dessous : 8 exercices, 4 seeds, 48 questions/instances. La suite globale reste rouge.                      |
| Prêt pour intégration pilote               | **Non**                                                     | Le transport/worker Windows retourne `unavailable`; l’isolation effective n’est donc pas démontrée dans cette exécution. |
| Prêt pour adoption sur le périmètre validé | **Non**                                                     | Pas d’application, de stockage ni d’environnement de production validé; le catalogue complet est absent.                 |
| Verdict global                             | **Non prêt**                                                | Le critère P0 d’isolation et le critère de suite complète verte ne sont pas satisfaits ici.                              |

## Contrôles exécutés

| Commande                        | Résultat                                                                                                                                                                                                                                                                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm.cmd run check`             | **ÉCHEC** : build, typecheck, lint, format PASS ; Vitest **1508 PASS / 25 FAIL**, 29 fichiers, 359,49 s.                                                                                                                                                                                                                   |
| `npm.cmd run smoke:package`     | **PASS** : vrai tarball installé dans un projet consommateur isolé ; imports ESM, déclarations TypeScript strictes, API publique, sous-chemins `legacy`/`node-host`, instanciation/correction, et bundle browser sans builtin Node. SHA-256 du tarball `d165b9c40610ed98e450faac0b0901c986f3a5a920684f0075a0eaa3aa58ad5d`. |
| `node tools/certify-corpus.mjs` | **PASS sur les assertions du banc** ; rapport détaillé dans [corpus-report.json](corpus-report.json).                                                                                                                                                                                                                      |
| Empreintes des originaux        | **PASS** : CDC `ffb97d8f…9459ae`; corpus et copie originale `0f4d1173…f41c3ae`.                                                                                                                                                                                                                                            |

Les 25 échecs sont concentrés dans `tests/node-host.test.mjs` (23) et `tests/transport-cli.test.mjs` (2). Le host renvoie `error: "unavailable"` au lieu des résultats attendus. Le code hôte traduit le code de sortie 70 du launcher en `unavailable`; le launcher n’expose qu’un diagnostic générique `launcher-unavailable`. La cause système précise n’est pas établie par ces traces. Les tests de correction mathématique, package, contrats et autres modules passent dans cette exécution. Aucun test n’a été ignoré pour obtenir le résultat.

`npm.cmd pack --dry-run` a ensuite **PASS**, 157 fichiers. Les tests Python/FastAPI ont été tentés via `./examples/e2e/run.ps1 test`, mais PowerShell a refusé de charger le script parce que l’exécution des scripts est désactivée; aucun test de transport Python n’a donc démarré. Le navigateur réel MathLive, les quotas Linux et la CI distante n’ont pas été relancés. Les preuves antérieures restent datées dans [progress](../progress.md), [MathLive](../mathlive-compatibility.md), [demo](../demo.md) et [release](../release.md) ; elles ne remplacent pas ces contrôles pour cet audit.

## Banc d’exercices et résultats

Le script `tools/certify-corpus.mjs` valide chaque définition canonique, instancie chaque élément et attendu sous les seeds `0, 1, 42, 2026`, vérifie le rejeu JSON déterministe, corrige des réponses attendues, soumet des réponses fausses et invalides, contrôle la projection publique (absence des champs `expected`/`policy`) et sérialise/rejoue l’instance. Le rapport machine contient les valeurs générées, éléments instanciés, attendus, résultats et projections; c’est une preuve interne, pas une charge publique à transmettre à l’élève.

| ID historique | Éléments / questions | Classement de cet audit       | Observation                                                                                                                                                             |
| ------------: | -------------------: | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|             1 |                2 / 1 | Compatible sous recette revue | Limite logarithmique à attendu explicitement déclaré `−∞`; ce test ne demande pas au moteur de prouver la limite.                                                       |
|             6 |                2 / 1 | Partiellement compatible      | Attendu `ln(k)` accepté. La réponse candidate `0` donne `indeterminate` pour les quatre seeds, pas `incorrect`; le profil ne prouve pas cette différence transcendante. |
|            36 |                2 / 1 | Compatible sous recette revue | QCM par IDs; réponse correcte, choix faux et ID inconnu testés.                                                                                                         |
|            64 |                4 / 2 | Partiellement compatible      | QCM/graphique instanciés; « négative » a été arbitrée comme nonpositive, incluant le zéro.                                                                              |
|            78 |                4 / 3 | Partiellement compatible      | Trois questions/QCM; contraintes revues réduisent le domaine historique et évitent les collisions.                                                                      |
|            96 |                2 / 1 | Partiellement compatible      | La contrainte `u0 ≤ 2k` rend cohérente l’affirmation historique de croissance.                                                                                          |
|           103 |                3 / 1 | Compatible sous recette revue | Exercice complet et graphe instanciés; le conflit de flag flash est arbitré par la valeur de ligne observée.                                                            |
|           106 |                3 / 2 | Compatible sous recette revue | Dérivée logarithmique et réponse de forme `e^k`; quatre seeds corrigés, dont la forme demandée est vérifiée.                                                            |

Ces classements portent sur les huit lignes locales et leurs recettes, pas sur tous les documents ayant une structure semblable. Aucun export complet du catalogue n’est fourni. Les champs historiques conservés en métadonnées privées ou arbitrés sont décrits dans [compatibility.md](../compatibility.md) et chaque rapport M10.

## Exigences CDC et limites

La [matrice des 48 IDs](../feature-coverage.md) reste la référence détaillée pour le code, les profils et les tests. Ses 46 lignes P0/P1 qualifiées décrivent la qualification historique locale; cette exécution modifie les constats courants suivants :

| Exigence                             | Statut courant                                   | Motif                                                                                                                                                           |
| ------------------------------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CDC-42 — protocole serveur, P1       | À requalifier dans cet environnement             | Deux tests CLI échouent parce que le worker isolé est indisponible. Les preuves Python/Linux consignées ne sont pas relancées.                                  |
| CDC-46 — isolation effective, P0     | **Non démontré par cette exécution**             | 23 scénarios Windows échouent avant de pouvoir vérifier quotas, watchdog, terminaison et reprise. Preuves Linux antérieures conditionnées à un cgroup v2 borné. |
| CDC-47 — qualité/distribution, P0/P1 | Partiel                                          | Build/types/lint/format et smoke package passent; le critère de suite complète verte échoue. Pack dry-run non relancé.                                          |
| CDC-48 — audit final, P0/P1          | Rapport livré, critères opérationnels incomplets | L’audit identifie les restes; le verdict CDC V1 complet demeure bloqué par CDC-46/47.                                                                           |

Les autres exigences restent selon la matrice qualifiées dans les profils bornés indiqués, pas au-delà. P0/P1 ne signifie pas « toutes les mathématiques du lycée » : les familles inconnues restent indéterminées ou refusées. Le moteur n’est pas un renderer, un éditeur Admin, un service d’identité, un stockage, un outil de migration de production ni un solveur universel.

### Saisie, sécurité et transport

- Les contrats de soumission sont indépendants de MathLive; les vraies observations MathLive 0.111.1 sont archivées et rejouées par les tests. Une nouvelle session navigateur n’a pas été réalisée ici.
- Le smoke package confirme que les exports publics ne comprennent pas les objets boxed CortexJS et que les sous-chemins sont installables. L’assertion de projection du banc confirme l’absence d’attendu et de politique sur les instances publiques générées.
- La suite contient des cas de politique falsifiée, snapshots officiels, TTL, sessions et erreurs; cette exécution complète ne valide toutefois pas le chemin serveur isolé puisqu’il ne démarre pas. Aucune route publique, application NovLearn ou FastAPI de production n’a été testée.
- Les calculs du cœur sont synchrones. Un timeout de promesse/Vitest ne peut pas interrompre un calcul synchrone; les limites d’AST/budgets et l’isolation OS sont donc importantes. Le défaut d’environnement constaté empêche de certifier ce dernier point ici.
- Le CDC et le corpus sont inchangés en octets. Aucun dépôt applicatif ou base de données n’a été touché.

## Correctifs prioritaires

1. Déterminer pourquoi le launcher Windows sort avec le code 70 dans l’environnement de certification; capturer le diagnostic système sans exposer de données sensibles, puis relancer les 30 tests hôte et les deux tests CLI. Ne pas requalifier l’isolation avant qu’ils passent.
2. Relancer `npm.cmd run check` et `npm.cmd pack --dry-run` dans un environnement accepté par les contrôles OS; conserver un résultat complet sans skip.
3. Refaire les tests CLI/Python/FastAPI et l’inspection anti-falsification dans le transport effectivement déployable. Qualifier séparément un hôte Linux avec quotas cgroup admissibles.
4. Obtenir un export autorisé plus complet avant toute déclaration de compatibilité du catalogue; classer et tester chaque document individuellement.
5. Garder la limite de correction de `ln(k)` visible : `0` reste indéterminé dans le profil actuel. Étendre la preuve seulement avec un besoin et un témoin mathématique justifiés.

## Utiliser le moteur sur un nouvel exercice

1. Partir de `ExerciseDefinition` schéma 5, avec ID/révision, génération et une liste complète d’éléments/questions. Lire [usage.md](../usage.md) pour les exports et types.
2. Déclarer séparément paramètres générés et inconnues libres. Ajouter contraintes bornées; ne jamais assouplir une contrainte si aucun tirage ne convient.
3. Pour chaque question, préciser format, famille, domaine, forme et attendu connu. Pour limite/dérivée, déclarer explicitement l’attendu et ne pas supposer qu’un solveur général existe.
4. Lancer `validateDefinition`, `instantiateExercise` avec seed/ID déterministes, puis vérifier tous les éléments et attendus sur plusieurs seeds.
5. Soumettre réponses correctes, fausses, invalides et un cas hors profil; conserver `indeterminate` distinct d’`incorrect`.
6. Produire l’affichage avec `projectPublicInstance`; conserver uniquement l’instance privée officielle côté serveur pour `gradeAnswer`. Sérialiser et rejouer les snapshots sous les versions compatibles.
7. Exécuter tests pertinents, `npm.cmd run check`, `npm.cmd pack --dry-run` et `npm.cmd run smoke:package`. Pour le transport, suivre les préconditions OS de [development.md](../development.md).

## Reproduction du banc historique

Après `npm.cmd run build`, dans ce dépôt :

```powershell
node tools/certify-corpus.mjs
```

Le script utilise les huit définitions adaptées déjà versionnées et écrit [corpus-report.json](corpus-report.json). Il n’écrit jamais dans le corpus original ni dans ses copies. Les sources et les rapports d’adaptation restent les références pour provenance et arbitrages.
