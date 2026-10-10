# État et transmission

Date : 10 octobre 2026. Lot 1 terminé ; Lot 2 exécuté après réception du corpus (bilan ci-dessous). Initialement seul `.codex/config.toml` existait. Git initialisé sur main ; socle versionné par un commit initial à la demande utilisateur. Aucun remote, publication ou modification des dépôts voisins. Les sections historiques conservent les preuves des étapes précédentes.

## Historique — fondations réalisées

Trois analyses indépendantes natives en lecture seule, confrontation documentée dans analysis.md. Architecture, décisions, stratégie QA, roadmap avec critères de passage et trois ADR. Package privé ESM strict, point d'entrée vide, CortexJS épinglé, Vitest, ESLint, Prettier, CI Linux/Windows, règles AGENTS et README. Aucun correcteur, générateur ou interface utilisateur ajouté.

## Historique — sources au démarrage

Au démarrage, rapports POC et audits/code voisins accessibles mais huit JSON historiques absents des emplacements inspectés ; fixtures synthétiques non substituées au corpus. Corpus ensuite fourni par l'utilisateur dans `docs/exercises_rows.json`. Ancienne conclusion 91 tests contredit rapport/preuves récents 162 Vitest / 23 Edge. Ces suites externes n'ont pas été réexécutées ici. Transport FastAPI, SLO et politiques des autres familles restent ouverts ; premier contrat natif maintenant défini par ADR 004.

## Historique — vérifications des fondations

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

## État courant pour le prochain agent Codex

Lire AGENTS, architecture, décisions, compatibility, ADR 004 et roadmap. Ne pas recopier POC ou ouvrir un correcteur général. Corpus reçu, huit lignes conservées/inventoriées ; première question native : minimum du trinôme (103). API actuelle : validateDefinition/validateSubmission, structure uniquement. Prochain lot proposé : 3, frontière mathématique/source/profils/admissibilité. Les DTO privés/publics d'instance sont préparatoires, sans génération ni projection runtime. TS6 est choisi pour la compatibilité lint ; versions POC TS7 distinctes. Ne pas décider service Node avant mesures ; aucun lot suivant sans nouvelle instruction. Les autres dépôts restent lecture seule.

## Versionnement du socle

Le .gitignore couvre dépendances, build, couverture, caches, logs, rapports de tests, configuration locale, fichiers système et fichiers .env. Les modèles .env.example et .env.template restent versionnables. Le package-lock.json et les configurations du package/CI sont conservés dans le commit.

## Reprise — préparation du Lot 2 (10 octobre 2026)

État initial vérifié : Git propre au commit `8fab5d9`, socle complet, `src/index.ts` vide et deux tests de distribution. README, configurations, src/tests, architecture, décisions, roadmap, stratégie QA, progression, trois ADR et six rapports POC inspectés. Les suites externes POC et navigateur n'ont pas été réexécutées.

Trois sous-agents natifs indépendants ont travaillé en lecture seule ; le principal est le seul auteur des fichiers modifiés :

- Mathématiques (`/root/math_audit`) : contrôle raw avant réduction, placeholder perdu même en raw, trois profils décimaux distincts ; API polynomialCoefficients disponible pour étude bornée future. Les rapports anciens 41/91 tests ne remplacent pas les preuves récentes 162/23 Edge.
- Architecture/compatibilité (`/root/contracts_audit`) : corpus introuvable dans les trois voisins ; fixture de correction explicitement synthétique. Enveloppes différentes, doublets/triplets sans `name` dans Creator contre type élève l'exigeant, computed JS et fallbacks hors contraintes observés. Aucune interface legacy reprise comme contrat certifié.
- Qualité/sécurité (`/root/qa_audit`) : aucun défaut de fondation démontré ; CI distante, bundle navigateur et isolation restent non vérifiés. Aucune sécurité mathématique déduite des deux tests de package.

Arbitrage : architecture et QA envisagent une caractérisation préliminaire du Lot 3 autorisée par la roadmap ; math recommande de rester sur la préparation du Lot 2. Le principal conserve le Lot 2, premier lot non terminé, et ne fige pas d'API de symboles sans corpus. La tranche verticale mathématique suggérée dans la demande n'est donc pas implémentée dans cette reprise.

[compatibility.md](compatibility.md) décrit sources observées, informations de provenance nécessaires, inventaire à remplir, critères de sélection et tests futurs. Roadmap, décisions et stratégie QA précisent ce statut. Aucun contrat runtime, fixture historique, adaptateur, API publique ou test mathématique ajouté. Le Lot 2 reste non terminé ; les Lots 3 et suivants ne sont pas engagés.

Revue indépendante finale par `/root/qa_audit` sur le diff et le nouveau document : aucune garantie fausse démontrée ; critère explicite d'aller-retour sans perte ajouté à sa demande. La revue confirme le statut de préparation, sans validation de migration.

Vérifications de cette reprise : `npm.cmd ci` PASS (130 packages), `npm.cmd run check` PASS avant et après rédaction (build, typecheck, lint, format ; 1 fichier / 2 tests), `npm.cmd pack --dry-run` PASS (6 fichiers), `git diff --check` PASS. Formatage ciblé par `npm.cmd exec -- prettier --write` sur les cinq documents, sans changement supplémentaire. Ces commandes vérifient uniquement le socle actuel, pas un contrat historique. Prochain travail nécessaire : obtenir les huit exports autorisés, leur provenance et les politiques pédagogiques pour reprendre le Lot 2. Aucun push, merge, commit ou dépôt voisin modifié.

## Lot 2 terminé après réception du corpus

L'utilisateur a ensuite ajouté `docs/exercises_rows.json` : huit lignes IDs 1/6/36/64/78/96/103/106, `content` et `competences` encodés en chaînes JSON. Ce fichier préexistant à l'implémentation est conservé sans modification, ainsi que les changements de préparation précédents. Provenance distante/révision d'export non fournies, sans les déduire de created_at. Empreinte SHA-256 et copie originale dans tests/fixtures/legacy ; 558 chemins inventoriés (88 ligne, 448 contenu, 22 compétences). Les huit rapports et la matrice de transcription sont dans compatibility.md.

Les trois agents ont repris leurs analyses en lecture seule sur le corpus réel. Convergence : première question de minimum du trinôme, ligne 103, élément 1780008000003. a=1…3, b=−6…6 sauf 0, c=−5…5 garantissent une abscisse rationnelle −b/(2a) et un minimum unique sur ℝ. La consigne ne demande aucune forme particulière. Le graphe et les champs non convertis restent conservés dans l'original ; transcription native manuelle explicitement distincte d'une migration intégrale.

Incompatibilités démontrées : flags Flash contradictoires en 103 ; distracteur QCM de 78 devenant juste pour u0=1 ; croissance/majoration admises incohérentes en 96 pour k=1/u0=3 ; bornes computed positives de 106 contre c=−a−b négatif. IDs QCM incomplets, exclusions dépendantes et aliases non fusionnés. Les sources mathématiques ont un backslash normal après deux décodages JSON : aucune réécriture/unescape supplémentaire.

Implémentation par le principal seul : types natifs v1 de définition privée, instance privée, affichage public et soumission ; validateDefinition/validateSubmission structurels depuis unknown avec diagnostics JSON Pointer et copie détachée. Paramètres/variables disjoints, contraintes entières bornées et impossibles refusées, extensions JSON privées conservées, champs inconnus et autorité client refusés. DTO d'instance seulement préparatoires ; aucune fonction de projection, génération, substitution, parsing, preuve ou correction ajoutée. ADR 004 retient ce premier contrat. Aucune dépendance ajoutée ; tests documentaires fs/crypto en MJS, fixtures JSON importées dans les tests TypeScript.

Revue indépendante finale par les trois agents : deux défauts démontrés corrigés (accents de la fixture native et clés JSON trop longues), avec régressions ; titre/question/points/paramètres natifs désormais reliés à la source 103 par test. QA a vérifié les corrections et n'a signalé aucun résidu démontré. Les agents n'ont pas écrit de fichiers ni lancé la suite complète ; le principal a exécuté les vérifications suivantes.

| Commande réellement exécutée pour le Lot 2                   | Résultat                                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `npm.cmd ci`                                                 | PASS, 130 packages depuis lockfile                                                    |
| `npm.cmd run build`, `npm.cmd run typecheck`                 | PASS après adaptation des tests                                                       |
| `npm.cmd test`                                               | PASS intermédiaire, 3 fichiers / 38 tests                                             |
| `npm.cmd run check` après corrections                        | PASS build, typecheck, lint, format ; 3 fichiers / **40 tests**                       |
| `npm.cmd pack --dry-run`                                     | PASS, 14 fichiers ; corpus/fixtures absents de l'archive                              |
| Script stdin `node --input-type=module`                      | Import ESM natif et appels définition/soumission PASS ; LaTeX brut conservé           |
| `Get-FileHash` des deux originaux                            | SHA-256 identiques : 0f4d1173a78f9bd41e88678704c212c5147627e7e5a42ee28eb398f25f41c3ae |
| `npm.cmd exec -- prettier --write` ciblé, `git diff --check` | PASS ; originaux ignorés par Prettier                                                 |

Essais corrigés : première sonde `node -e` refusée par un problème de quoting PowerShell, remplacée par stdin ; typecheck initial sur tests Node sans déclarations et dist encore vide, corrigé par tests documentaires MJS/import JSON puis rebuild ; premier check arrêté sur variable inutilisée, corrigée. Une requête `npm.cmd view @types/node version` a été interrompue sans résultat ; aucun package ajouté. La création documentaire a été relancée après un patch combinant suppression/ajout d'un même chemin refusé. Ces essais ne sont pas des validations réussies.

Le Lot 2 est terminé pour les contrats et l'inventaire ; les huit exercices ne sont pas migrés. La validation structurelle n'établit pas la syntaxe, le domaine ou la valeur mathématique de sources LaTeX. Aucune CI distante, suite POC/navigateur, installation de la nouvelle archive dans un consommateur externe ou garantie d'isolation exécutée dans ce lot. Aucun commit/push/merge. Prochain lot recommandé : 3, à engager uniquement sur nouvelle instruction.
