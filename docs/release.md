# Distribution pilote privée et adoption

Actualisation documentaire du 12 octobre 2026 : la suite Windows de cet audit
passe **1533 tests / 29 fichiers sans skip**, incluant l’hôte natif et la CLI.
Le refus OS consigné en M9/M12 reste une observation historique ; aucune politique
OS modifiée par cette mission, cause de l’évolution non établie. Les benchmarks,
archives consommées et captures ci-dessous restent les preuves historiques M12,
sans nouvelle exécution de ces bancs. Voir [contrôles actuels](progress.md#contrôles-de-la-réorganisation-documentaire).

Le package ESM0.1.0 utilise le schéma5, CortexJS0.151.0 et le générateur
mulberry32-rejection-v1. Sept fonctions sont exportées à la racine ;
`./legacy` expose adaptLegacyExercise et `./node-host` createNodeHost.
Les contrats sont décrits dans [architecture](architecture.md) et les capacités
dans [la matrice CDC](feature-coverage.md). Publication npm, push, déploiement et
activation de production ne sont pas effectués par cette livraison locale.

## Consommation et environnement

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd pack --dry-run
npm.cmd run smoke:package
```

Le dernier script crée un vrai tarball dans `.cache/package-smoke-<date>/archive`,
l'installe dans un projet avec son propre package.json/lock/node_modules, importe
les sept fonctions et les deux sous-chemins, puis génère et corrige78. Il compile
les déclarations et le contrat de persistance en TypeScript strict, `types:[]`,
sans types ambiants du dépôt. Une installation peut joindre le registre officiel
pour les dépendances figées ; aucune dépendance React/FastAPI/MathLive n'est ajoutée
au package. Le moteur mathématique principal demeure CortexJS ; ses dépendances
transitives sont conservées dans le lock du consommateur.

Le bundle Rolldown1.2.13 existant dans l'outillage est construit avec
`platform:'browser'`. Un plugin refuse les builtins Node, tout import externe
restant est refusé, les modules node-host sont absents. Le bundle exécuté dans
Brave/Chromium155 a lu `1{,}25` intact et exposé exactement les sept fonctions.
Cette preuve ne qualifie pas tous les navigateurs ou versions de bundler.
Le bundle complet sans minification mesure environ5,47Mo ; il ne constitue pas
un budget de livraison frontend recommandé. Les réponses officielles restent
corrigées côté serveur, même si le cœur portable sert à une prévisualisation.

| Cible        | Support vérifié et limite                                                                                              |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Node         | 24.19.0/npm11.17.0, ESM et déclarations strictes ; Node20 du backend voisin doit être mis à niveau avant adoption      |
| Navigateur   | Bundle Rolldown1.2.13, lecture réelle Chromium155 ; hôte Node exclu du bundle                                          |
| MathLive     | 0.111.1, sorties réelles M7/M11 ; indépendant du moteur et pas distribué dans le package                               |
| Hôte Linux   | x86_64, Python3.11+, cgroupv2 déjà borné/swap0/pids bornés ; absence de quota refusée                                  |
| Hôte Windows | JobObject M8 ; refus du lanceur consigné en M9/M12 ; tests natifs de cet audit PASS, sans modification de politique OS |
| FastAPI      | Exemple privé Python, serveur détenteur des instances ; identité/DB/points restent applicatifs                         |

Le quota Linux est partagé avec le superviseur et Python. Les métriques cgroup
ne sont pas le committed memory Windows. Le nettoyage sous pression a été mesuré
jusqu'à18,25s en M9 ; aucun SLO strict de réponse/fermeture ou survie de l'API sous
OOM n'est promis. Les appels synchrones du cœur seul n'ont pas de préemption.

## Identité d'artefact et stockage

La version npm seule ne distingue pas les archives0.1.0 successives de cette
phase privée. Conserver le SHA256 du tarball, son integrity npm, le lock exact
du consommateur et son SHA256, la révision de définition et les versions du
snapshot. Utiliser une archive immuable ; ne pas reconstruire le même identifiant
d'artefact à partir d'un package name/version seuls.

[PersistedAttempt](../examples/persistence/attempt.ts) est un contrat applicatif
privé version1 : identité de tentative/élève, artefact+lock, définition publiée
versionnée, snapshot officiel, soumission et correction. Ses données sont
sérialisables en JSON. Aucun nouveau service, stockage SQL ou export du cœur
n'est ajouté. Cette enveloppe ne doit ni être acceptée depuis le navigateur ni
être envoyée par une projection publique. Empreinte et version ne constituent
pas une authentification ; droits et origine du stockage restent au backend.

`gradeAnswer` refuse les versions schema/engine/generator inconnues avec
state:error/code:official-version. `projectPublicInstance` lève
unsupported-snapshot-version avant toute projection. Ce garde n'est pas un
validateur complet de snapshots externes. Un artefact compatible doit être
sélectionné par un registre privé avant lecture/rejeu ; aucune migration implicite
des anciens contrats expérimentauxV1–V4 n'est fournie.

## Upgrade et rollback effectivement testés

L'archive précédente a été produite depuis `git archive 41a8ef2`, build dans le
répertoire extrait puis pack dans ce même cwd. Son SHA256 est
974e54fa4114d2c427c5022a6f1980ae956ba390953f16f06b5c9eb96cb9989a.
L'archive M12 consommée et photographiée initialement possède SHA256
9bc4999589377c05338c4e48d53749b48260d7df774530095131586e4cc01d2e.
Les rapports distinguent ces preuves de l'archive finale qui peut avoir une
autre empreinte après mise à jour du README/build. Les deux packages0.1.0 sont
réellement installés dans deux consommateurs distincts ; le premier n'est pas
simulé en changeant un numéro de version sur le package courant.

Les consommateurs finaux après README/contrat persistant ont également passé :
Windows157fichiers, SHA256
9f29aeb6a3a60b775cc2f94dbb19f3ad0f2b27e867d0578f5507886db3f1753a ;
Linux156fichiers, SHA256
79a2e6f61291033a27ec202a08cb63066e2a455a4e088df7ed11f3c9957a5afd.
Le fichier supplémentaire Windows est le lanceur compilé job.exe ; les archives
restent identifiées séparément. Le consommateur Linux a réussi sans réseau.
Le rejeu/rollback a été réexécuté contre l'archive Windows finale.
L'hôte importé depuis le consommateur Linux installé a aussi exécuté un vrai
`parseMathInput` sous 384 MiB et pids64 : source `1{,}25` conservée,
durée 1744,509 ms et pic cgroup partagé de 191963136 octets.

```powershell
node tools/release-replay.mjs .cache/package-smoke-<date> .cache/m11-package/novlearn-exercise-engine-0.1.0.tgz
```

Le script persiste une tentative privée depuis l'ancien artefact, relit le JSON
avec son registre d'artefacts, reproduit correction et projection, qualifie ces
cas avec le nouvel artefact, puis revient à l'ancien sans modifier l'instance.
Enveloppe inconnue, hash d'artefact absent, lock différent et version de snapshot
inconnue sont refusés. Les liens définition publiée/id/révision/snapshot et
instance/question de soumission/correction sont aussi vérifiés : neuf
corruptions et deux altérations de seed/snapshot sont refusées, soit onze cas.
Le snapshot entier est aussi régénéré depuis sa définition/seed avec l'artefact
sélectionné et comparé avant le rejeu de correction.
Chaque corruption est vérifiée contre le message du contrôle attendu. Les cas
engine/seed/title partent du JSON persisté, pour ne pas échouer prématurément sur
une différence de prototype interne.
Les tests ne promettent pas la compatibilité de toutes les
versions futures : chaque upgrade nécessite ses propres oracles, snapshots et
cas réels. Les archives, locks et données privées restent dans le cache du banc.

## Adoption progressive

1. Sélectionner côté serveur une liste explicite de définitions/révisions admises
   et l'artefact exact autorisé pour chacune ; un flag client ne l'active pas.
2. Pour chaque définition, valider puis qualifier plusieurs seeds et réponses,
   conserver recette/provenance du legacy et contrôler la projection publique.
3. Garder les tentatives déjà créées sur leur snapshot et artefact d'origine.
   Le remplacement d'une définition crée une nouvelle révision pour les nouvelles
   tentatives ; il ne réécrit pas l'historique.
4. Mesurer durée, quota, état/code de correction et taux d'indétermination par
   profil et artefact. Ne journaliser ni saisie brute, attendu, seed, policy,
   snapshot ou identifiant personnel dans cette télémétrie générale. Les audits
   privés relèvent d'un stockage et de droits distincts.
5. En cas de régression, retirer la nouvelle révision du registre d'activation,
   rétablir l'ancien artefact pour les nouvelles tentatives et conserver les deux
   artefacts pour le rejeu des anciennes. Une correction inconnue reste inconnue.

La CI configurée vérifie Windows/Linux et la consommation du package ; les
actions sont figées sur leurs commits officiels vérifiés le12octobre2026.
Aucune CI distante n'a été lancée. Les vérifications OS et Python locales sont
rapportées séparément ; une suite package Linux avec skips Windows n'est pas une
preuve d'isolation Windows actuelle. Le pilote reste local, sans publication ou
adoption dans les repositories applicatifs.
