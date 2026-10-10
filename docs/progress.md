# État et transmission

Date : 10 octobre 2026. Lots 1 à 4 terminés (bilans ci-dessous). Initialement seul `.codex/config.toml` existait. Git initialisé sur main ; socle versionné par un commit initial à la demande utilisateur. Aucun remote, publication ou modification des dépôts voisins. Les sections historiques conservent les preuves des étapes précédentes.

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

Lire AGENTS, architecture, décisions, compatibility, ADR 004/005/006 et roadmap. Ne pas recopier POC ou ouvrir un correcteur général. Corpus reçu, huit lignes conservées/inventoriées ; première question native : minimum du trinôme (103). API actuelle : validateDefinition/validateSubmission structurels, parseMathInput scalaire LaTeX v1 et generateVariables pour integer/decimal/choice. Aucun calcul d'expression ni garantie de domaine après substitution. Prochaine étape proposée après clarification documentaire : complément 4 bis (tuples/comparaisons simples) avant Lot 5 étendu, uniquement sur nouvelle instruction. Les DTO privés/publics d'instance sont préparatoires, sans constructeur ni projection runtime. TS6 est choisi pour la compatibilité lint ; versions POC TS7 distinctes. Ne pas décider service Node avant mesures. Les autres dépôts restent lecture seule.

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

## Lot 3 — frontière mathématique terminée (10 octobre 2026)

Implémentation par le principal seul, sans délégation : `src/math/input.ts`, exports racine et test de distribution adaptés, `tests/math-input.test.ts`, README, décisions, roadmap et ADR 005. Aucun nouveau package. Contrats du Lot 2 inchangés : validation structurelle séparée du parsing ; la fixture native fournit le contexte de noms pour un test d'intégration.

API `parseMathInput(source, { parameters, variables })` : source inchangée, profil scalaire v1, succès avec syntaxe MathJSON raw et symboles classés, échec avec diagnostics typés bornés. ComputeEngine neuf à chaque appel ; séparateur natif `{,}`, point accepté, virgule nue refusée. Source contrôlée avant parsing pour placeholders, commandes hors profil, commentaires, décimaux incomplets et budgets. Aucune réduction, évaluation, substitution, génération ou correction. `x/x`, `1+2`, `2/4`, `1/0` et √(−1) restent syntaxiques ; domaine non démontré. Matrice des capacités et limites dans ADR 005.

Sondes locales stdin Node sur CortexJS 0.151.0 et lecture des déclarations installées : option réellement typée `form:raw`, comparée à `form:canonical`. Premières sondes JavaScript utilisant l'ancienne option `canonical:false` remplacées après l'échec du build TS2769. Premier check : 92/93 tests passent ; comparaison de code trop large confondait expected/unexpected-closing-delimiter, corrigée avec égalité exacte et régression. Check intermédiaire après correction : 4 fichiers / 97 tests PASS. Deux régressions ajoutées ensuite pour `0y` et `y-y` : un symbole inconnu ne peut pas disparaître par réduction. Ces essais initiaux ne sont pas annoncés comme validations finales.

Vérifications locales finales : `npm.cmd ci` PASS (130 packages depuis lockfile) ; `npm.cmd run check` PASS (build, typecheck, lint, format, 4 fichiers / 99 tests) ; `npm.cmd pack --dry-run` PASS ; formatage ciblé et `git diff --check` PASS. Sondes stdin Node du package construit : API ESM, source intacte, MathJSON raw et rejet de placeholder PASS. Empreintes SHA-256 des deux originaux identiques et inchangées : `0f4d1173a78f9bd41e88678704c212c5147627e7e5a42ee28eb398f25f41c3ae`.

Limites : sous-ensemble scalaire uniquement, noms du contrat v1, diagnostic d'incomplétude conservateur et non universel, syntaxe CortexJS sans fidélité aux commandes/espaces, aucune garantie de domaine ou de ressources synchrones. Pas de CI distante, tests navigateur/MathLive réel, suite POC, installation externe du tarball ou preuve d'isolation exécutés. Aucun corpus migré, dépôt voisin modifié, commit, push ou production. Lot 4 non commencé ; RNG, seed/encodage et ordre des tirages restent à décider sur nouvelle instruction. Les domaines et bornes arithmétiques doivent être spécifiés avant les futurs calculs/corrections.

## Lot 4 — génération déterministe de paramètres (10 octobre 2026)

Inspection du dépôt propre et de la demande jointe, README/progress/décisions/roadmap, architecture, compatibility, ADR 004/005, contrats, frontière mathématique et tests. Le Lot 3 est présent ; la suite existante a été réexécutée avec succès (99 tests) avant l'ajout des nouveaux tests. Travail séquentiel par le principal, sans sous-agent. Aucun autre dépôt inspecté ou modifié pendant ce lot.

Fichiers créés : `src/contracts/decimal-grid.ts`, `src/contracts/parameters.ts`, `src/generation/random.ts`, `src/generation/variables.ts`, `tests/generation.test.ts`, `tests/generation-limit.test.ts`, `docs/adr/006-deterministic-generation.md`. Fichiers modifiés : `src/contracts/types.ts`, `src/contracts/validation.ts`, `src/math/input.ts`, `src/index.ts`, `tests/package.test.ts`, `README.md`, `docs/architecture.md`, `docs/decisions.md`, `docs/roadmap.md`, `docs/progress.md`. Package et lockfile inchangés ; aucune dépendance ajoutée.

API unique ajoutée : `generateVariables(definitions, {seed, generationVersion?})`, résultat discriminé succès/diagnostics. Contrat `GenerationParameterV1` réutilisant integer et ajoutant decimal/choice, valeurs typées sérialisables et métadonnées privées de rejeu. Validation JSON inerte et contrôles entiers du Lot 2 partagés en interne, sans élargir les exports runtime. Famille d'exercice rationnelle inchangée. Parsing raw du Lot 3 conservé ; aucune expression calculée ni seconde voie de parsing créée.

Garanties : bornes inclusives, exclusions uniques dans le domaine, domaines non vides, grille décimale exacte à précision 0…6, choix finis uniques. Mulberry32 avec seeds uint32 numériques ou chaînes canoniques, mapping de rang par rejet du bucket incomplet, ordre du tableau figé, exclusions triées, singleton sans tirage. Chaque appel a son état local. Au plus 16 paramètres et 128 mots par rang ; épuisement → `limit`, sans preuve d'impossibilité ni valeur partielle. Détails des bornes et versionnement dans ADR 006. La conversion de grille est une conversion d'encodage numérique, pas un CAS ; fractions et approximations calculées restent absentes.

Cas réel : fixture native 103 → seed 42 → a=1, b=5, c=0, 3 mots. a>0 et b≠0 vérifiés sur 512 seeds. La source attendue `\frac{-b}{2a}` est parsée par l'API du Lot 3 dans le test d'intégration, avec paramètres et x libre distincts, sans être évaluée. L'abscisse mathématique serait −5/2 ; aucune valeur computed n'est annoncée comme produite par le générateur.

Tests nouveaux : quatre vecteurs golden complets et mots PRNG, rejeu après JSON et changement d'ordre des clés, indépendance de l'état/horloge/Math.random, domaines entiers et tous leurs sous-ensembles d'exclusions sur petites plages, grilles 0…6 sur seeds fixes, limites/bornes négatives/non alignées, artefacts flottants, choix avec doublons et nombres finis extrêmes, entrées non JSON, types différés, versions inconnues et épuisement forcé du budget PRNG sans fallback. Le smoke de fréquence sur 10 000 seeds ne constitue pas une preuve statistique universelle. Pas de bibliothèque de tests de propriétés supplémentaire : propriétés vérifiées par énumérations déterministes.

Deux ajustements pendant les vérifications : imports JSON des nouveaux tests dotés des attributs requis par NodeNext et paramètres de `it.each` corrigés ; diagnostic non JSON classé uniformément `invalid-definition` plutôt qu'en fonction du chemin d'une borne. La revue a également identifié l'acceptation d'un retour à la ligne final par l'ancre regex `$` : contrôle explicite de la longueur des symboles dans validation/parsing et de l'écriture canonique des seeds, avec régressions. Aucun parseur mathématique modifié au-delà du contrôle de contexte.

Vérifications locales réalisées : `npm.cmd ci` PASS (130 packages) ; `npm.cmd run build` et `npm.cmd run typecheck` PASS avant les nouveaux tests ; `npm.cmd test` PASS (4 fichiers / 99 tests existants) ; sondes stdin `node --input-type=module` pour figer quatre vecteurs ; `npm.cmd run format` puis formatage ciblé par `npm.cmd exec -- prettier --write` ; `npm.cmd run check` final PASS (build, typecheck, lint, format et **6 fichiers / 166 tests**). Les deux premiers checks avec nouveaux tests ont échoué sur les problèmes de tests/diagnostic décrits ci-dessus, puis ont été corrigés. `npm.cmd pack --dry-run` PASS (34 fichiers, README/package et dist uniquement, sans corpus/fixtures). Smoke stdin `node --input-type=module` de l'import racine ESM, validation/génération du trinôme, rejeu JSON et parsing de source intacte PASS. `git diff --check` PASS. `Get-FileHash` confirme les deux originaux inchangés : `0f4d1173a78f9bd41e88678704c212c5147627e7e5a42ee28eb398f25f41c3ae`.

Computed et contraintes entre plusieurs paramètres différés conformément à la roadmap : les contrats du Lot 2 ne les représentent pas. Tuples/doublets/triplets/perfect_square sont inventoriés comme formats historiques spécifiques sans contrat canonique, pas implémentés. Aucun exercice migré ; corpus original conservé. Pour le Lot 5, aucune difficulté bloquante démontrée sur les tirages entiers, mais contrat computed/domaine et sérialisation exacte via CortexJS doivent être décidés avant substitution/calcul. Pas d'instance, projection, correction, service, production, CI distante, navigateur, suite POC ou preuve d'isolation ; aucun commit/push/merge. Lot 5 non commencé.

### Versionnement du Lot 4

À la demande explicite de l'utilisateur après le bilan, les changements du Lot 4 sont regroupés dans un commit dédié `feat(generation)` avec description des contrats, garanties de rejeu, tests et fonctionnalités différées. La mention « aucun commit » ci-dessus décrit l'état à la livraison avant cette demande. Revue du diff et retrait d'un BOM UTF-8 involontaire dans decisions.md ; aucune modification de logique après le check à 166 tests. Aucun push ni Lot 5 engagé.

## Clarification documentaire du modèle de génération — 10 octobre 2026

Mission limitée à la documentation, réalisée séquentiellement sans sous-agent. Demande jointe, README/progress/décisions/roadmap, AGENTS, architecture, ADR 006, matrices de compatibilité, contrats et implémentation de génération, exports et tests existants inspectés. Aucun fichier métier, contrat TypeScript, test/fixture, configuration, dépendance ou original historique modifié. Aucun complément 4 bis ni Lot 5 implémenté ; aucune migration, base de données, déploiement ou commit.

Documents modifiés : README, architecture, ADR 006 (spécification cible et JSON documentaires), compatibility (matrice fonctionnelle), roadmap, décisions et présent état. Aucun document redondant créé. Modèle cible adopté : aléatoire numérique, choix, tuple générique à deux modes et calculé ; contraintes communes bornées et recettes mathématiques par composition. Pas de types function/perfect_square/doublet/triplet ni de solveur général. Les valeurs exactes, domaine, source/raw, variables libres et attendu privé restent distincts.

État inchangé : integer/decimal/choice générés et testés ; décimaux/choix uniquement autonomes, définition d'exercice toujours à entiers. Tuples, computed, dépendances/cycles, comparaisons intervariables, conditions mathématiques, recettes calculées, snapshot et projection runtime absents. Les tests de rejet et les cycles d'objets JSON ne prouvent pas leur support. Les JSON étendus portent un marqueur de brouillon non supporté ; seul l'exemple de tirages scalaires correspond aux contrats actuels.

Roadmap ajustée sans recommencer les lots livrés : 4 bis proposé pour tuples et comparaisons simples avant Lot 5 étendu ; graphe computed, exactitude/domaine, contraintes mathématiques, recettes et intégration d'instance au Lot 5. Aucun blocage du scénario scalaire 103 démontré ; le complément évite de figer un snapshot ignorant les groupes requis. Arbitrages ouverts : contrat/version et représentation canonique, tailles/budgets/profil des prédicats, encodage exact computed et noms étendus. Les besoins Admin sont décrits comme capacités moteur futures, sans interface conçue.

Vérifications locales de cette mission : `npm.cmd ci` PASS (130 packages) ; `npm.cmd run check` PASS (build, typecheck, lint, format et 6 fichiers / **166 tests existants**, sans test ajouté) ; `npm.cmd pack --dry-run` PASS (34 fichiers, README/package et dist seulement). Sonde stdin `node --input-type=module` : quatre exemples JSON documentaires décodés, exemple scalaire accepté, trois propositions et version de brouillon refusées par l'API actuelle ; 29 cibles de liens locaux existantes. Formatage ciblé par `npm.cmd exec -- prettier --write`, puis contrôle ciblé et `git diff --check` PASS. Les deux originaux ont toujours le SHA-256 `0f4d1173a78f9bd41e88678704c212c5147627e7e5a42ee28eb398f25f41c3ae`. Revue finale du diff : sept documents Markdown uniquement. Aucun calcul des recettes proposé comme validé ; aucune CI distante, suite navigateur/POC ou migration exécutée. Une tentative de retouche documentaire par Python a échoué car l'exécutable est absent ; la retouche a été réalisée avec Node, sans ajout de dépendance.

### Versionnement de la clarification documentaire

À la demande explicite de l'utilisateur après le bilan, les sept documents sont regroupés dans un commit dédié `docs(generation)`. La mention « aucun commit » ci-dessus décrit la livraison avant cette demande. Seule cette note de versionnement est ajoutée après les vérifications ; aucun code ni test modifié, aucun push ou lot de développement engagé.
