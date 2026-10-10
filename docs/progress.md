# État et transmission

Date : 10 octobre 2026. Lot 1 : fondations et analyse ; aucun Lot 2 engagé. Initialement seul `.codex/config.toml` existait. Git initialisé sur main ; socle versionné par un commit initial à la demande utilisateur. Aucun remote, publication ou modification des dépôts voisins.

## Réalisé

Trois analyses indépendantes natives en lecture seule, confrontation documentée dans analysis.md. Architecture, décisions, stratégie QA, roadmap avec critères de passage et trois ADR. Package privé ESM strict, point d'entrée vide, CortexJS épinglé, Vitest, ESLint, Prettier, CI Linux/Windows, règles AGENTS et README. Aucun correcteur, générateur ou interface utilisateur ajouté.

## Sources et blocages de lots futurs

Rapports POC et audits/code voisins accessibles. Huit JSON historiques absents des emplacements inspectés ; fixtures synthétiques non substituées au corpus. Ancienne conclusion 91 tests contredit rapport/preuves récents 162 Vitest / 23 Edge. Ces suites externes n'ont pas été réexécutées ici. Transport FastAPI, SLO, règles de domaine/forme et contrat JSON demeurent ouverts.

## Vérifications de cette mission

Vérifications locales Windows terminées :

| Commande réellement exécutée                                                                                                                        | Résultat                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `node --version`, `npm.cmd --version`, `git --version`                                                                                              | v24.19.0 / 11.17.0 / 2.55.0.windows.5                                              |
| `git init -b main`                                                                                                                                  | Dépôt initialisé                                                                   |
| `npm.cmd view` des versions et peers                                                                                                                | Versions retenues confirmées ; lint exige TypeScript <6.1.0                        |
| `npm.cmd install --ignore-scripts --fetch-retries=0`                                                                                                | 130 packages installés, lockfile créé ; audit 0 vulnérabilité au moment du run     |
| `npm.cmd run format`                                                                                                                                | Formatage appliqué                                                                 |
| `npm.cmd run check`                                                                                                                                 | Build, typecheck, lint, format PASS ; Vitest 1 fichier / 2 tests PASS              |
| `npm.cmd pack --dry-run`                                                                                                                            | Archive de 6 fichiers : README, package.json et dist JS/types/maps                 |
| `node --input-type=module -e ...`                                                                                                                   | Import public ESM Node natif PASS                                                  |
| `npm.cmd ci --offline --ignore-scripts --no-audit --no-fund`                                                                                        | 130 packages réinstallés à partir du lockfile, PASS                                |
| `npm.cmd pack --ignore-scripts`                                                                                                                     | Tarball produit après build                                                        |
| `npm.cmd install --prefix <temp-consumer> <tarball> --cache <workspace-cache> --offline --ignore-scripts --no-audit --no-fund --package-lock=false` | Installation réelle de l'archive en consommateur temporaire, PASS                  |
| `node <temp-consumer>/consumer.mjs`                                                                                                                 | Import de l'archive installée PASS                                                 |
| `node node_modules/typescript/bin/tsc <temp-consumer>/consumer.mts --ignoreConfig --module NodeNext --target ES2023 --strict --noEmit`              | Déclarations et résolution externe PASS                                            |
| `npm.cmd ls --depth=0`                                                                                                                              | Six dépendances directes aux versions épinglées                                    |
| `git status --short`                                                                                                                                | Seuls les nouveaux fichiers de ce dépôt visibles ; dist/cache/node_modules ignorés |

Essais corrigés : npm.ps1 bloqué par ExecutionPolicy (npm.cmd utilisé), premières requêtes registry/cache en sandbox refusées (cache local et accès réseau approuvé utilisés), consommation TypeScript par fichier initialement refusée avec TS5112 (option --ignoreConfig requise, relance réussie). Aucune modification de politique Windows.

La CI GitHub est configurée mais n'a pas été exécutée à distance. Aucune suite mathématique de production ou navigateur ajoutée/exécutée ; les tests actuels vérifient seulement le package. Le tarball et cache sont des artefacts locaux ignorés. Les déclarations vérifiées sont celles de l'entrée volontairement vide ; aucune API métier certifiée.

## Risques prioritaires

Perte de domaine et placeholder au parsing ; virgule française pouvant devenir 314 ; comparaison heuristique surévaluée ; secrets recomposables ; contraintes legacy violées silencieusement ; computed JS dangereux ; timeout non préemptif et mémoire non isolée ; schéma de migration inconnu sans corpus.

## Résumé pour le prochain agent Codex

Lire AGENTS, architecture, decisions, analysis et roadmap. Ne pas recopier POC ou ouvrir un correcteur général. Prochain lot : 2, corpus et contrat minimal, conditionné aux huit documents autorisés. Demander leur provenance et politiques pédagogiques, conserver originaux, inventorier chaque champ. Le package n'exporte encore aucune API métier. TS6 est choisi pour la compatibilité lint ; versions POC TS7 sont distinctes. Ne pas décider service Node avant mesures ; aucune logique complexe/lot suivant sans nouvelle instruction. Les autres dépôts restent lecture seule.

## Versionnement du socle

Le .gitignore couvre dépendances, build, couverture, caches, logs, rapports de tests, configuration locale, fichiers système et fichiers .env. Les modèles .env.example et .env.template restent versionnables. Le package-lock.json et les configurations du package/CI sont conservés dans le commit.
