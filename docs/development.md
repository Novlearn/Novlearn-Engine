# Développement et maintenance

## Installation et commandes

Utiliser Node **≥24.19.0 <25** et npm **≥11.17.0 <12**, comme
[package.json](../package.json). Les dépendances sont figées dans le lock ;
CortexJS 0.151.0 est l’unique dépendance mathématique principale. TypeScript 6.0.3,
Vitest, ESLint et Prettier appartiennent à l’outillage. Aucun framework dans le cœur.

Sous PowerShell, à la racine :

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd pack --dry-run
```

| Script existant             | Fonction                                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| `npm.cmd run build`         | Compile `src` en ESM/déclarations/source maps dans `dist` et copie les lanceurs OS                   |
| `npm.cmd run typecheck`     | Vérifie sources, tests et configuration Vitest sans émission                                         |
| `npm.cmd run lint`          | Exécute ESLint sur le dépôt                                                                          |
| `npm.cmd run format:check`  | Vérifie le format Prettier                                                                           |
| `npm.cmd run format`        | Formate le dépôt ; pour une mission ciblée, préférer `npx.cmd prettier --write <fichiers-autorisés>` |
| `npm.cmd test`              | Build puis Vitest                                                                                    |
| `npm.cmd run check`         | Build → typecheck → lint → format → Vitest ; s’arrête au premier échec                               |
| `npm.cmd pack --dry-run`    | `prepack` reconstruit puis inspecte le contenu distribuable, sans publication                        |
| `npm.cmd run smoke:package` | Produit et installe un vrai tarball dans un consommateur indépendant, vérifie Node/TS/bundle         |

La distribution inclut `dist` et le README. Les docs détaillées, fixtures,
rapports privés et exemples applicatifs restent dans le dépôt. Les sous-chemins
publics sont `node-host`, `legacy` et `remote-host`, en plus de l’entrée portable ;
aucun import de fichier interne ne fait partie du contrat public.

## Code et tests

La [carte des modules](architecture.md#modules-et-versions) explique le code.
`tsconfig.json` active strict, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes` et les contrôles de membres/variables inutilisés.
Les contrats JSON sont validés runtime en plus de leurs types TypeScript.

Les tests importent généralement `novlearn-exercise-engine`, donc le package
construit, et non une copie du code métier. Les injections de panne ciblent les
modules internes sans élargir l’API publique. Vitest utilise Node, un worker et
un timeout de 5 s par test : ce timeout **ne préempte pas** CortexJS synchrone.

| Groupe                                           | Vérification utile                                                                      |
| ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| contracts/composition/canonical                  | Copies inertes, champs/versions, IDs, goldens et snapshots complets                     |
| generation/tuples/computed/named-parameters      | Grilles, exclusions, flux, dépendances/cycles, contraintes et budgets                   |
| math-input/substitution/school-math/log-affine   | Source/raw, domaines avant réduction et profils admis                                   |
| grading/algebra-grading/collection-grading/forms | Vrais positifs/négatifs, témoins de forme, contre-exemples, indétermination et pannes   |
| display-elements/instantiation                   | Références/cohérence des données, atomicité et secrets injectés dans les projections    |
| corpus/legacy-adapter                            | Octets/hash/inventaire, transcriptions et huit adaptations distinctes                   |
| mathlive-input/e2e                               | Rejeu des sorties MathLive et du parcours vertical archivés, sans rouvrir le navigateur |
| node-host/transport-cli et tests Python          | Interruption OS, quotas, protocole, récupération et autorité serveur                    |
| package/snapshot-version et outils release       | Exports fermés, vrai tarball, versions persistées et rollback                           |

Les oracles BigInt indépendants vérifient produits croisés, discriminants, PGCD,
signes, Pythagore et encadrements π/e. Les snapshots protègent la stabilité,
sans suffire à prouver la vérité mathématique. Des limitations testées restent
des limitations. Les conditions de plateforme Windows sont conservées ; leurs
skips Linux ne constituent pas une validation Windows.

Pour une suite ciblée après build :

```powershell
npm.cmd test -- tests/grading.test.ts tests/forms.test.ts
```

Les suites Python et les contrôles OS Linux ont des prérequis séparés : consulter
[ADR 015](adr/015-private-python-transport.md) et [demo](demo.md). Le banc MathLive
a son propre package/lock ; [son guide](mathlive-compatibility.md) donne les commandes.

## Vérifier le projet en pratique

### Contrôles courants

Sous PowerShell, avec Node 24.19.x/npm 11.17.x :

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd pack --dry-run
```

`check` doit être vert pour une validation globale. L’audit documentaire avait
rencontré `EPERM` lors du parcours d’un cache Python, avant les tests. Les scripts
`format` et `format:check` excluent désormais `.cache/**` et `.npm-cache/**`
**dès l’énumération**, avec des globs négatifs quotés. `.prettierignore` reste
applicable aux fichiers protégés ; une règle ignore seule intervenait trop tard
pour ce parcours de la CLI 3.9.10. Aucun droit ou fichier Python modifié.
Voir [D49](decisions.md#d49--exclure-les-caches-dès-le-parcours-prettier-12-octobre-2026).
Pour exécuter les tests indépendamment du format :

```powershell
npm.cmd test
```

Cette commande reconstruit le package et lance toutes les suites Vitest. La
dernière exécution équivalente (`npx.cmd vitest run` après build) a passé
1533 tests/29 fichiers sous Windows, sans skip, en environ 8 minutes 22 secondes.
Elle inclut les tests natifs Windows et le rejeu des captures MathLive/E2E ; elle
ne relance pas le navigateur ni les suites Python ou contrôles OS Linux.

### Vérifier le package réellement installé

```powershell
npm.cmd run smoke:package
```

Ce script construit un tarball et l’installe dans un consommateur isolé, puis
vérifie imports Node, types stricts et bundle navigateur. Il peut nécessiter
l’accès au registre pour les dépendances épinglées. Il ne publie aucun package.
L’exécution du bundle dans un vrai navigateur et le rollback de deux artefacts
ont leurs procédures dans [release](release.md).

### FastAPI et parcours navigateur

Prérequis : Docker Desktop en mode Linux, image du banc et dépendances Linux
dans `.cache/linux-python`, comme décrit dans [demo](demo.md). Le cache doit
être préparé depuis les requirements/lock du banc sous Linux, pas depuis les
modules compilés Windows. Installer MathLive puis construire :

```powershell
npm.cmd ci --prefix tools/mathlive --ignore-scripts --no-audit --no-fund
npm.cmd run build
./examples/e2e/run.ps1 test
./examples/e2e/run.ps1 start -Faults
# Ouvrir http://127.0.0.1:4318/ et suivre les scénarios de docs/demo.md.
./examples/e2e/run.ps1 stop
```

`test` lance la découverte des suites Python de transport et du parcours vertical
dans un conteneur borné. `start` lance le banc interactif : vérifier clavier,
collage, décimaux français, réponses correctes/fausses/incomplètes/indéterminées,
QCM par IDs, reprise, ancienne manche et erreurs techniques. Le serveur est
local, avec identité/store de démonstration. Une nouvelle capture doit être
distinguée du simple rejeu des fixtures existantes.

Le banc MathLive seul se lance avec `node tools/mathlive/server.mjs` sur le port
4317 après installation de ses dépendances ; sa procédure et les formats de
saisie sont dans [mathlive-compatibility](mathlive-compatibility.md).

### Garanties OS Linux

Dans un **environnement Linux dédié déjà borné** (cgroup v2, mémoire/swap/pids
admissibles selon [ADR 015](adr/015-private-python-transport.md)), après build :

```sh
node tools/check-linux.mjs
node tools/check-legacy-host.mjs
```

Ces contrôles vérifient interruption réelle, mémoire, crash/récupération et huit
adaptations dans des workers neufs. Ils ne se lancent pas dans PowerShell Windows
ni sur un hôte Linux sans quotas. Les tests Python ne remplacent pas ces preuves OS.

La [dernière requalification](certification/windows-requalification.md) distingue
suite source Windows verte, tarball Windows bloqué, et nouveaux contrôles
Linux/Python positifs. Aucun nouveau navigateur ou hébergement applicatif qualifié.

## Étendre le moteur

Avant toute modification, lire README, progress, décisions, lot concerné et
[AGENTS.md](../AGENTS.md). Travailler uniquement dans ce dépôt et sur le lot
autorisé. Les anciennes étapes archivées ne relancent pas automatiquement un lot.

Pour ajouter un comportement mathématique, commencer par un besoin CDC et un
profil précis : famille, domaine, méthode de preuve, bornes et états hors profil.
Réutiliser CortexJS pour parsing/substitution/calcul. Préserver source/raw et
vérifier descendants/domaine/témoins de forme avant réduction. Tester différence
prouvée, contre-exemples, cas non définis, indétermination et panne ; aucune
comparaison inconnue ne devient un verdict incorrect par défaut.

Pour ajouter un élément, étendre l’union typée, la validation structurelle et des
références, le mapping des champs mathématiques, les contrôles après substitution
et la projection par sélection. Décider explicitement sa visibilité privée/publique.
Tester chaque branche sous injection de secrets, références invalides et échec
atomique. Les pixels, l’édition et les calculs analytiques non demandés restent
externes. Une interface seule ne suffit pas à déclarer l’élément disponible.

Pour étendre un contrat, vérifier ses unions, champs autorisés, cohérence runtime,
copie JSON, sérialisation, projection, signatures/export types et consommation
du tarball. Une rupture exige versionnement et plan explicite de compatibilité ;
ne pas réintroduire des modèles parallèles V1–V4. Actualiser capacités, matrice,
ADR/décisions et progression après les preuves effectives.

Interdits permanents : `eval`, `new Function`, `Math.random` pour la génération,
algèbre par regex, objets boxed publics et fallback hors contraintes. Les
originaux [corpus](exercises_rows.json) et [copie](../tests/fixtures/legacy/exercises_rows.original.json)
doivent rester identiques en octets ; le CDC est intouchable.

## Distribution, CI et versions

La [CI configurée](../.github/workflows/ci.yml) s’exécute sur push, pull request
ou lancement manuel, avec matrice Ubuntu/Windows, Node 24.19.0 et actions figées
par SHA. Elle lance `npm ci`, `npm run check`, `npm pack --dry-run` et
`npm run smoke:package`. Cette configuration ne prouve aucune exécution distante
pendant une session locale ; rapporter seulement les contrôles exécutés.

Après un changement pertinent, exécuter check/pack et, si le contenu ou les
contrats distribués changent, qualifier un consommateur indépendant. Le
[guide release](release.md) distingue le smoke automatisé, la preuve navigateur
réelle et le rejeu de deux archives. Un `pack --dry-run` seul ne prouve pas une
installation externe réussie.

Schéma 5, révision pédagogique, version de générateur et artefact moteur ont des
rôles distincts. La release 0.2.1 fournit un tarball et un SHA-256 immuables ;
conserver aussi le lock du consommateur pour distinguer les dépendances exactes.
Un upgrade CortexJS exige la revue des profils, contre-exemples, vecteurs, saisies
réelles et anciennes tentatives. Le garde de versions de snapshot ne remplace
pas les droits et l’origine serveur.

La [release](release.md) et le [déploiement du host](DEPLOYMENT.md) sont gérés
par les workflows Engine. La configuration des applications, leur stockage SQL
et leurs permissions restent du ressort des dépôts consommateurs.

## Documentation

Conserver une explication actuelle par responsabilité ; déposer les rapports
détaillés dans les archives avec date/statut. Vérifier liens relatifs, ancres,
chemins, imports/signatures et exemples contre le package construit. Consigner
les commandes, résultat et environnement dans [progress](progress.md).
Un bug découvert pendant une mission documentaire est signalé, sans corriger le
moteur hors périmètre. L’audit initial a été livré sans commit ; le commit local
de documentation est ensuite explicitement demandé, sans push automatique.

### Certifier le tarball installé sur le profil Linux choisi

Depuis PowerShell Windows, avec Docker Desktop local et l’image épinglée déjà
installée, passer le chemin d’un tarball local à tools/check-installed-package.ps1.
Ce banc installe l’archive et les dépendances déjà présentes hors ligne, puis
exécute les sept opérations sous cgroup v2 borné, sans réseau. Les artefacts et
empreintes restent dans un nouveau dossier .cache/installed-package-*.
Voir [le bilan et la commande réellement exécutée](certification/linux-requalification.md).
Le smoke standard conserve aussi le contrôle Windows, ses éventuels échecs et
les preuves portables ; un passage source ne remplace pas le test du package.
