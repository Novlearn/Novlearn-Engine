# État et reprise

## Refus du mode inspect — 5 novembre 2026

Le run `42056334750` trouve le vhost actif dans
`/etc/apache2/sites-available/novlearn.fr-le-ssl.conf` et confirme le port
3151, puis échoue avant toute écriture Apache : la seconde recherche textuelle
exige un ServerName littéral et un `SSLEngine on` dans le même bloc. Les logs
ne donnent pas le contenu du vhost et ne permettent pas d'identifier laquelle
de ces hypothèses est fausse. La sélection utilise désormais le numéro de ligne
fourni par `apachectl -S`, avec vérification du nom staging et du port 443.
Un nom quoted/schéma/port et TLS hérité sont admis ; les vhosts partagés avec
la production restent refusés. Un diagnostic structurel limité aux lignes,
noms et présence des directives TLS aide à qualifier un éventuel nouveau refus.
Le contenu complet et les secrets ne sont pas journalisés. Aucun workflow VPS
n'est relancé par cette correction ; sauvegarde et rollback restent inchangés.

## Route publique Engine staging — préparation du 5 novembre 2026

Le constat utilisateur est un POST `/run` public redirigé en 307 vers
`/accueil`. Le bootstrap réussi `41818738477` utilisait le port staging 3151.
Le nouveau workflow manuel `repair-staging-apache.yml` vérifie ce port contre
le `.env` staging et Docker, puis cible uniquement le vhost HTTPS staging.
Sauvegarde, configtest, reload gracieux et retour automatique sur erreur sont
prévus, avec restauration manuelle par identifiant de sauvegarde.
Procédure et limites : [réparation Apache staging](apache-staging.md).

Six tests Python locaux passent (patch exact, préservation, refus et erreurs
de transaction) après avoir dirigé TEMP/TMP vers un dossier autorisé du dépôt.
La première tentative utilisait un répertoire temporaire Windows inaccessible.
`npm.cmd run check` passe build/types/lint/format puis échoue au chargement de
33 suites sur leurs caches sandbox ENOENT ; 151 tests passent dans 5 fichiers.
`npm.cmd pack --dry-run` passe (189 fichiers). Le test Apache réel est préparé
en CI sur runner jetable, pas exécuté localement. Aucun workflow VPS déclenché,
aucun accès SSH direct, aucun merge ou déploiement production. La réception
publique 401 puis la qualification Admin Vercel restent à réaliser.

La CI dédiée de la PR #3, run `42050956362`, job `127326603914`, passe
les sept tests sans skip, dont le routage sur un vrai Apache de runner Linux
et les cas de retour arrière. Elle ne contacte pas le VPS.

## Diagnostic et recréation Engine staging - 5 novembre 2026

Le run Engine `41924601043` a déployé le digest 0.2.1 avec succès.
Le run Novlearn `42006269028` observe ensuite HTTP 503 sur un calcul
authentifié. Son diagnostic inspecte `ENGINE_TOKEN`, alors que bootstrap,
Compose et serveur Engine utilisent `ENGINE_API_TOKEN`. Cette absence ne
prouve donc pas un défaut de chargement du token.

Le workflow manuel staging ajoute une comparaison privée du token du fichier
staging avec celui du conteneur, une sonde `/run`, puis la recréation du seul
service `engine` du projet staging avec le digest et le token existants.
La sonde est répétée après disponibilité. Aucun token n'est affiché, aucun
fichier/service de production ni dépôt consommateur n'est modifié.
Le workflow Engine `42007563347`, exécuté depuis
`fix/staging-authenticated-redeploy` au commit `37e7612`, est PASS.
Avant recréation : `ENGINE_API_TOKEN_present=true staging_env_match=true`,
puis HTTP 503 / `unavailable`. Après recréation : même token, HTTP 200 et
`ok=true`. Le problème n'était donc pas un token absent ; la cause interne de
l'indisponibilité initiale n'est pas établie par ces sondes.

Le rejeu du contrôle Novlearn `42006269028` (tentative 2, job `127178686928`)
confirme `/healthz=200`, `authenticatedCalculation=true` et des empreintes
requête/réponse identiques à la release 0.2.1. Il échoue ensuite sur le contrôle
Apache `/api/exercises` vers Next port 3001, hors du périmètre Engine demandé.
Apache et les sources Novlearn restent inchangés ; aucun merge dans main,
aucune nouvelle image/release, aucun déploiement production.

Contrôles locaux : `git diff --check`, Prettier ciblé et
`npm.cmd pack --dry-run` PASS. `npm.cmd run check` passe build, types, lint et
format, puis échoue : 33 suites ne chargent pas leur cache temporaire sandbox
(ENOENT), un test host Windows dépasse son délai ; 172 tests passent.
Bash local est refusé et Docker Desktop indisponible ; le script Bash a été
réellement exécuté avec succès par le workflow staging distant.

## Publication Engine 0.2.1 et relance staging — 4 novembre 2026

Le run CI `41887866785` passe sur Ubuntu et Windows, ainsi que le job
`host-container`. Le tag `v0.2.1` cible `8513666` et la release GitHub est
publiée. L'asset exact `novlearn-exercise-engine-0.2.1.tgz` porte le SHA-256
`6d1d52f38297d6f91be0eaa4aea57eb63f61973eae4cc83d86fd0aa6651dd85a` ; l'image
GHCR publiée est épinglée par digest
`sha256:d1916edf981fd23b57f543937d83411df77b7dc5da290e24db9f41cbf544a4ea`.

Le job de déploiement initial `41889427068` a échoué avant toute modification
du VPS staging : l'action SSH a reçu une valeur masquée, le validateur dans le
checkout a accepté l'entrée et le helper root déjà installé a refusé son ancien
format de jeton. Le workflow de relance `41920817429` a ensuite confirmé que le
helper root déjà installé sur le VPS conserve l'ancien validateur ; aucun
conteneur n'a été mis à jour. Le VPS confirme une session root issue du workflow
de bootstrap. Le correctif ajoute donc un exécutable séparé
`novlearn-engine-deploy-staging`,
strictement limité à staging, installé après transfert temporaire et vérification
de son SHA-256. Le helper partagé de production n'est pas remplacé. La migration
Novlearn attend toujours un déploiement staging sain. Aucun secret n'a été lu ni
affiché et aucun conteneur de production n'a été touché.

Le correctif `11254b5` et la CI `41921624551` sont verts sur Ubuntu et Windows,
avec le job `host-container` et les nouveaux contrôles de syntaxe/format du
jeton. Le run staging `41920817429`, lancé sur la version précédente, reste en
échec ; il doit être relancé depuis le workflow mis à jour avant d'engager la
migration Novlearn.

## Contexte initial de réconciliation Engine 0.2.1 — historique

L’audit distant confirme `main` à `968696a9929614f04021dc53f7669e8c305adf4e`,
avec la CI de ce commit réussie, la release `v0.2.0` publiée et `v0.2.1`
encore absente à l'audit initial. Le tag publié contient des modules
`remote-host`, mathématiques et tests qui n’avaient pas été réintégrés dans
`main`. Le package Novlearn staging consomme ces interfaces et épingle
l’archive `v0.2.0` par SHA-256.

Le commit `63b7235` restaure ces sources et tests, garde le serveur HTTP et le
worker de `main`, et ajoute un test du client exporté contre le gestionnaire
HTTP actuel.
Le workflow de release empaquette une seule fois sur Windows pour inclure le
lanceur natif, puis vérifie et transfère ces mêmes octets au job Linux, qui bâtit
l’image GHCR et attache le tarball exact et son SHA-256 à la release. Le seul
déploiement automatique reste l’environnement GitHub `staging`.

Contrôles locaux réellement exécutés : `npm.cmd ci` PASS ; tests ciblés des
interfaces restaurées et du package, **66/66 PASS** ; `npm.cmd pack --dry-run`
PASS, 189 fichiers ; `npm.cmd run smoke:package` PASS. Les empreintes des
tarballs construits localement diffèrent entre builds Windows, car le build
compile le lanceur natif ; elles ne sont donc pas déclarées comme l’empreinte de
release. Le run CI `41881350792` a révélé 6 assertions en conflit avec les
limites d’admissibilité de `main` et une assertion de replay qui comparait à
l’identique le texte mathématique historique et sa nouvelle présentation
normalisée. Les limites d’exposant de `main` sont rétablies pour le formulaire
pédagogique `power-of-e`, et le replay conserve la fixture observée en séparant
champs fonctionnels et présentation normalisée. Le run CI `41885496618` a
ensuite échoué sur les cas `e^{20}`, `e^{-1/4}` et `e^{-1/5}` : la borne ne doit
pas restreindre les exponentielles rationnelles exactes du domaine réel général,
et leur affichage doit rester réadmissible. La borne `[-16, 16]` est maintenant
appliquée uniquement selon le formulaire `power-of-e` ; la sérialisation garde
les puissances rationnelles de `e` sous une forme réadmissible. **241 tests
ciblés** catalogue/grading/log-affine/replay passent localement ; build, types,
lint, formatage, `npm.cmd pack --dry-run` (189 fichiers) et le smoke test package
passent. L’empreinte du smoke local est variable et n’est pas celle de la
release. Vitest complet reste bloqué sans résultat observable dans le runner
Windows local. Le run CI `41887866785` a ensuite passé la suite complète sur
Ubuntu et Windows, et le job `host-container`. La release, l'archive et l'image
sont détaillées en tête de ce document. Le correctif du filtre a été poussé dans
`505e181` ; son CI `41892821636` est vert. Le déploiement staging doit encore
être déclenché manuellement avec le nouveau workflow dédié, puis sa santé vérifiée
avant de reprendre la migration Novlearn.

## Lecture chiffrée du token staging — 4 novembre 2026

L'utilisateur cherche à récupérer le token staging sans demander l'accès SSH à
l'administrateur. Ajout d'un workflow manuel sur main et d'un script qui utilisent
les trois secrets VPS existants. Le token est lu sur le VPS et chiffré avec la
clé publique RSA fournie ; seuls les octets chiffrés sont affichés dans Actions.
La clé privée reste locale, hors Git, dans un répertoire à accès Windows limité.
Les configurations VPS, les tokens et les services ne sont pas modifiés ; seul
un dossier temporaire contenant la clé publique est créé puis supprimé.

Vérifications locales : syntaxe Bash, chiffrement et déchiffrement RSA-OAEP
SHA-256 sur un token factice, absence de sa valeur claire dans la sortie et refus
de clé/token malformés passent. La lecture réelle du VPS reste à effectuer après
publication. Aucun token n'est affiché dans la conversation ni ajouté à Vercel.

## Bootstrap réussi et correction du conteneur CI — 4 novembre 2026

Le run GitHub `Initialize Engine VPS #4` a terminé le bootstrap avec le compte
existant : les fichiers de déploiement et tokens sont installés, aucun conteneur
n'a démarré et Apache n'a pas été modifié. La CI `#13` du commit `33adc4b` a
réussi sa matrice Ubuntu/Windows mais échoué à la disponibilité du host Docker.

Deux causes ont été reproduites localement. L'image installe `python3-minimal`
sans les modules standard requis par le lanceur (`ModuleNotFoundError: ctypes`).
Après installation de `python3`, le smoke reste non sain sans `--init` : Node
est PID 1 et le lanceur refuse ce parent pour garantir sa terminaison. Compose
utilise déjà `init: true`. Le Dockerfile installe désormais Python complet et
importe le vrai lanceur pendant le build sans exécuter sa fonction principale.
Le smoke CI utilise `--init` et affiche l'état limité du conteneur, ses logs et
la réponse de santé en cas de refus, sans afficher sa configuration ni son token.

Vérifications locales : construction de l'ancienne image, reproduction du module
manquant, build corrigé, reproduction du 503 sans init et smoke CI corrigé avec
`/healthz` puis calcul authentifié réussis sous 384 MiB / swap 0 / 64 pids.
Le profil Compose passe également (read-only, utilisateur 1000, capacités retirées,
no-new-privileges, tmpfs) avec refus 401 sans token et 409 pour mauvaise archive.
La création d'un nouveau réseau Docker local est bloquée par l'épuisement de ses
plages ; ce contrôle Compose utilise donc un override local `network_mode: bridge`.
Le fichier de déploiement n'est pas modifié. Les conteneurs de test sont supprimés.
La nouvelle CI distante reste à observer après push ; aucune image GHCR ni aucun
déploiement VPS n'est effectué par ce correctif.

## Bootstrap avec le compte root existant — 4 novembre 2026

Le run GitHub `Initialize Engine VPS #3` a validé le préflight et copié les
fichiers, puis échoué avant le bootstrap : le compte SSH observé est UID 0 et
la validation refusait root. À la demande de l'utilisateur, le workflow et le
script acceptent désormais ce compte existant. La validation du nom reste
active et son erreur déclenche le nettoyage du dossier temporaire du run.
Le bootstrap n'ajoute aucune règle sudo pour root ; une initialisation ultérieure
avec un compte dédié peut donc créer sa propre règle limitée au wrapper.

La CI `#12` a réussi les vérifications Ubuntu et Windows, mais son job Docker a
échoué en attendant `/healthz`. Ce problème reste distinct et non corrigé ici.
Le présent changement ne lance aucun workflow ni aucune commande sur le VPS.

Vérifications ciblées : syntaxe Bash du bootstrap et du bloc SSH du workflow,
admission des noms root/non-root, refus des noms malformés, absence de règle sudo
créée pour root, création pour un compte dédié, réexécution et refus d'une règle
existante différente passent dans un dossier temporaire local. Format Prettier
des fichiers YAML/Markdown modifiés vérifié. Aucun bootstrap complet ni nouveau
build Docker exécuté ; le smoke conteneur rouge reste à diagnostiquer.

## Lancement manuel du CI — 4 novembre 2026

Le commit `4e911ea` de formatage est bien sur `main`, mais l'API GitHub ne
retourne aucune exécution CI associée. Le workflow est activé et écoute les pushs
sur `main`; la cause exacte de l'absence d'événement n'est pas établie. Ajout de
`workflow_dispatch` au CI pour permettre de contrôler un commit via Actions sans
modifier les workflows de release ou de déploiement. Aucun lancement manuel
supplémentaire effectué depuis ce correctif.

## Workflow manuel de pré-vérification et bootstrap VPS — 4 novembre 2026

Ajout local d'un workflow `workflow_dispatch` unique qui réutilise les secrets
du dépôt `VPS_HOST`, `VPS_USERNAME` et `VPS_SSH_KEY`. Le mode `preflight` vérifie
SSH, sudo non interactif, Docker/Compose, cgroup v2, outils, ports et état Engine
sans modifier la configuration ou démarrer de service. Le mode `initialize`
exige une phrase de confirmation, copie les trois scripts/configurations utiles
dans un dossier temporaire privé, puis lance le bootstrap VPS existant. Les ports
par défaut restent 3151/3152. La documentation précise les droits requis et le
fait que l'initialisation ne publie ni image ni conteneur et ne modifie pas Apache.

Aucun workflow distant n'a été lancé. Le compte VPS, son droit `sudo -n`, les
prérequis et les secrets réels ne sont pas observables localement. Le workflow,
les actions SSH/SCP, le bootstrap Linux et le préflight attendent une revue et une
exécution contrôlée sur GitHub; aucun déploiement n'a été effectué.

## Livraison locale CI/CD du host — 3 novembre 2026

La CI vise maintenant les PR vers `main` et les pushs sur `main`. Le host dispose
d'un adaptateur HTTP privé versionné avec token par environnement et sonde de
disponibilité. Docker/Compose, scripts bootstrap/déploiement/rollback, publication
GHCR par digest, staging automatique et promotion/rollback prod sous approbation
sont ajoutés. Instructions pour Alexandre dans [DEPLOYMENT.md](DEPLOYMENT.md).

Aucun secret GitHub, release, publication ou déploiement distant créé. Le VPS,
ses ports/cgroup, Apache et les GitHub Environments restent à configurer. Check
complet final : 1579/1579 tests ; `npm.cmd pack --dry-run`, smoke du package et
`docker compose config --quiet` passent. Le daemon Docker est inaccessible et
Bash est bloqué par l'isolation Windows ; image, scripts Linux et CI distante
non exécutés.

La revue du 4 novembre a ajouté au workflow CI un job Ubuntu qui construit
l'image et exerce le host conteneurisé sous limites mémoire/processus, avec
health check et requête authentifiée. Il attend le succès de la matrice
Node/Windows et n'utilise aucun secret. Contrôle local de reprise : `npm ci`,
pack dry-run, smoke du package et configuration Compose passent. Vitest n'a
pas terminé dans ce sandbox Windows : 26 suites ne trouvent pas les fichiers
temporaires Vitest (`ENOENT`), 7 suites et 158 tests passent avant l'échec ;
une relance avec `TEMP` explicite reste bloquée et a été interrompue. Le daemon
Docker local et Bash ne sont pas disponibles, donc le nouveau job conteneur
attend son exécution sur GitHub Actions. Aucun déploiement ni release réel.

## Extension locale des courbes — 21 octobre 2026

[Sampling D54 / Admin D10](graph-sampling.md) autorisé, en cours : 109 tests ciblés passent, dont 28 nouveaux cas de sampling ; build/types stricts passent. Le premier contrôle complet a terminé avec dix échecs conservés ; les correctifs ciblés passent et le second contrôle complet reste à exécuter. Host Linux et tarball restent à qualifier avant adoption Admin. Aucun critère, protection ou environnement distant modifié.

## Régression de disponibilité des figures Admin — 17 octobre 2026

La [correction ciblée](certification/numeric-render-cache.md), autorisée par
l’accord humain D51 / Admin D05, réduit les recalculs numériques exacts identiques
pendant une seule instanciation. Le profil Linux et son délai de cinq secondes
restent inchangés. Ni formule, diagnostic d’erreur, génération suivante ni autre
contexte n’utilisent ce cache. Le détachement final existant est conservé.

**1 540 tests / 30 fichiers, zéro skip**, build/types/lint/format et smoke du
tarball passent. Linux : six générations complètes en 2,41–2,64 s sous le délai
natif inchangé de cinq secondes, projections identiques, dix comparaisons
privées/diagnostiques exactes, sept opérations, 12 contrôles OS et huit parcours
historiques passent. L’archive qualifiée commence par d4d3abc4 ; la preuve garde
son SHA256 complet. L’Admin conserve son archive antérieure jusqu’à migration
locale de son empreinte SQL et adoption coordonnée ; aucun reçu n’est réécrit.
Aucune publication distante ni modification de protection Windows.

## Certification locale du profil Linux — 14 octobre 2026

L’utilisateur choisit Linux sous cgroup v2 borné. La [certification locale](certification/linux-requalification.md)
valide l’archive exacte 650128cd…9190290 : installation hors ligne, sept opérations
publiques, rejeu privé, projection et arrêt des workers. Les preuves source
Windows (1534 sans skip), Linux OS (12), historiques (8), Python/FastAPI (13) et
ESM/types/bundle passent séparément. Aucune nouvelle CI distante ou session
navigateur n’est annoncée. L’adoption applicative reste extérieure à ce bilan.

Les observations suivantes, notamment les refus Windows, restent historiques.

## Requalification locale — 13–14 octobre 2026

La [reprise autorisée](certification/windows-requalification.md) valide la suite
source standard : **1 534 PASS, 29 fichiers, aucun skip**, 377,21 s. Le smoke
renforcé du tarball installé reste **FAIL** : Smart App Control bloque le
launcher Windows non signé (Code Integrity 3077). La certification de l'artefact
Windows n'est pas acquise. Linux : 12 contrôles OS, 8 parcours historiques et
13 tests Python/FastAPI passent dans Docker local borné et sans réseau.

Aucune limite ou protection Windows n'est modifiée ; aucun environnement
distant ou CDC n'est touché. Le choix du runtime est demandé avant adoption.
Les sections suivantes conservent les observations historiques du 13 octobre.

## État actuel — 13 octobre 2026

### Audit de certification fonctionnelle V1 — 13 octobre 2026

Demande de certification exécutée dans le dépôt seulement. Rapport :
[certification/report.md](certification/report.md), résultats complets :
[corpus-report.json](certification/corpus-report.json). Le nouveau banc
`tools/certify-corpus.mjs` vérifie les huit adaptations autorisées sur quatre
seeds chacune : validation, éléments/questions, attendus, réponses simulées,
projection, sérialisation et rejeu. Il relève zéro réponse correcte rejetée sur
les cas certifiés ; les réponses invalides sont rejetées. Pour la ligne 6,
répondre `0` à `ln(k)` donne `indeterminate` aux quatre seeds, ce qui préserve
l’absence de preuve plutôt que d’affirmer `incorrect`.

Vérifications réelles : build, typecheck, lint et format PASS ; smoke du vrai
tarball dans un projet consommateur séparé PASS (Node/ESM/types/bundle browser).
`npm.cmd run check` échoue avec **1508 PASS / 25 FAIL**, 29 fichiers, 359,49 s.
Les 23 tests `node-host` et 2 tests CLI échouent avec `unavailable` au lancement
du worker isolé Windows. Le rapport du launcher est générique ; cause système
précise non établie. CDC-42 passe à « à requalifier », CDC-46 « non démontré ici »
et CDC-47/48 « partiel » dans la matrice. **Verdict courant : non prêt pour pilote
ni adoption**, malgré le cœur portable prêt à tester localement.

`npm.cmd pack --dry-run` PASS (157 fichiers). Python/FastAPI, nouveau navigateur
MathLive, cgroup Linux et CI distante non exécutés dans cette mission. CDC et trois copies
historiques sont restés inchangés en octets. Détails et correctifs priorisés dans
le rapport. Cette nouvelle preuve remplace les affirmations antérieures de
passage Windows pour l’état courant, sans réécrire leur chronologie.

**Dernier lot fonctionnel terminé : M12**, commit
`008d0ce78c93ae698f794180618d38402f87a216`. Le package privé 0.1.0, schéma 5,
est qualifié comme **V1 locale sur les profils documentés**. La
[matrice CDC](feature-coverage.md) conserve 48 lignes : 46 exigences P0/P1
qualifiées et deux exclusions explicites. Cela ne vaut pas adoption en production.

**Lot fonctionnel en cours : aucun.** Le complément d’outillage Prettier est
terminé après l’audit documentaire au commit `19bf028` ; aucun comportement
du moteur modifié. L’intervention initiale était un audit documentaire. Aucun
Goal actif dans cette session à l’ouverture ; arbre Git initial propre au commit
`0db2304`. L’audit a d’abord été livré sans commit. L’utilisateur demande ensuite
explicitement son commit documentaire local et un guide des tests/restes à faire.
Aucun push, publication, SQL ou déploiement autorisé par cette demande.

Les principaux livrables sont génération commune, données d’éléments,
multiquestions/QCM, correction sous preuve, formes, hôte/transport privés,
adaptations locales et preuves de distribution/rejeu. Les
[capacités et limites](features.md) décrivent leur portée exacte.

## Fiabilisation Prettier — complément d’outillage

Les scripts npm `format` et `format:check` ajoutent les globs négatifs quotés
`!.cache/**` et `!.npm-cache/**` pour exclure les caches dès leur énumération.
`.prettierignore` les filtrait déjà, mais après le parcours de la CLI 3.9.10,
trop tard pour éviter le `scandir` Python interdit. [D49](decisions.md#d49--exclure-les-caches-dès-le-parcours-prettier-12-octobre-2026).

`npm.cmd ci --cache .npm-cache --no-audit --no-fund` PASS, 132 packages, lock inchangé.
`npm.cmd run format:check` passe avec le cache Python toujours présent. Les sondes
confirment qu’un JSON mal formaté dans le cache est ignoré, mais qu’un JSON mal
formaté hors cache est signalé et retourne exit 1 ; sondes ensuite retirées.
`format` et `format:check` partagent les mêmes exclusions. Références protégées
inchangées, sans ajout de dépendance ou modification de droits/cache Python.

**Complément terminé ; bilan finalisé le 13 octobre 2026.** Le contrôle complet
de confirmation passe : build/types/lint/format puis **1533 tests / 29 fichiers
PASS sans skip**, en **595,96 s**, avec le timeout Vitest habituel et sans filtre.
Log : `.cache/prettier-fix-check-confirmation.log` (exécution du 12 octobre).

Le premier passage avait franchi Prettier puis terminé avec 1531 tests PASS et
deux timeouts à 5000 ms dans le groupe des infinis (570 s). Le rejeu ciblé des
sept cas passe en 2,58 s ; les 142 autres cas du fichier étaient hors sélection.
Le contrôle complet de confirmation ci-dessus passe ensuite sans cette sélection.
Aucun test désactivé, timeout relevé ou comportement mathématique modifié ;
la cause des fluctuations de durée reste à surveiller séparément.

`npm.cmd pack --dry-run` du 13 octobre PASS (157 fichiers). Les références
protégées et le lock restent inchangés. La correction concerne seulement les deux
scripts et leur documentation ; l’utilisateur demande explicitement leur commit
local le 13 octobre. Ce bilan accompagne le commit, sans push ni nouveau lot.
Les résultats de l’audit
documentaire ci-dessous restent historiques, notamment son échec de format.

**Points d’attention pour l’adoption :** les tests natifs Windows passent dans
cet audit, après un refus historique M9/M12 dont la cause d’évolution n’est pas
établie. Linux nécessite un cgroup v2 borné, avec mémoire partagée
et nettoyage sans SLO strict. Authentification/store/rendu des bancs restent
de démonstration. Registre/licence, production et catalogue complet sont séparés.
**Prochaine étape :** choisir explicitement une mission de la
[roadmap](roadmap.md#travaux-restants--non-engagés), sans relancer automatiquement
les lots livrés.

## Preuves de la livraison M12 — historiques

| Contrôle livré en M12      | Résultat consigné et limite                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Check complet Linux        | 1501 tests PASS, 32 tests Windows SKIP ; build/types/lint/format inclus, 478,61 s                                        |
| Python/FastAPI             | 13 tests PASS ; [tests](../tests/integration/python/test_vertical.py) et parcours HTTP infini                            |
| Isolation Linux            | 12 contrôles OS PASS sous 384 MiB/swap 0/pids 64 ; quota et récupération documentés                                      |
| Distribution               | Vrais tarballs Windows/Linux, Node/TS/bundle et navigateur réel ; [rapports](../tests/fixtures/release)                  |
| Persistance/rejeu/rollback | Deux archives réellement consommées, 11 corruptions refusées ; [rapport](../tests/fixtures/release/rollback-report.json) |
| Saisie/intégration         | 45 observations MathLive M7 et 17 M11 ; [MathLive](mathlive-compatibility.md), [banc vertical](demo.md)                  |

Ces suites et captures ne sont pas toutes réexécutées par la mission documentaire.
Les empreintes de tarballs précédents dans [release](release.md) identifient des
artefacts historiques ; changer le README peut changer l’archive suivante.
Le [journal archivé](archive/progress.md) conserve les commandes, échecs
intermédiaires, arbitrages, mesures, chemins de cache et preuves de chaque lot.

## Contrôles de la réorganisation documentaire

| Commande / contrôle réellement exécuté               | Résultat                                                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `npm.cmd ci --cache .npm-cache --no-audit --no-fund` | PASS, 132 packages installés, Node 24.19.0/npm 11.17.0, lock inchangé                                                          |
| `npm.cmd run check`                                  | Build/typecheck/lint PASS ; arrêt au format : `EPERM` lors du parcours du cache Python ; Vitest non atteint par cette commande |
| `npx.cmd vitest run` séparément                      | **1533 tests PASS / 29 fichiers**, sans skip, **502,23 s** ; Windows natif exécuté                                             |
| Prettier ciblé sur les 45 Markdown concernés         | PASS ; CDC/AGENTS/CHANGELOG préservés, aucun parcours des caches                                                               |
| Exemples                                             | README et usage compilés stricts avec imports publics puis exécutés ; exemple d’hôte compilé uniquement                        |
| Liens et conservation                                | Liens/cibles/ancres locaux vérifiés ; 12 archives préservées modulo repère/liens/format, 48 exigences inchangées               |
| `npm.cmd pack --dry-run`                             | PASS, 157 fichiers ; aucune publication                                                                                        |
| Git / empreintes                                     | Diff documentaire uniquement, `git diff --check` PASS ; CDC et corpus inchangés                                                |

Au moment de la livraison documentaire, le contrôle ciblé du format contournait
le parcours inaccessible du cache, sans modifier configuration ou permissions.
Le `check` global était alors **non passant** ; ce résultat historique n’est pas
présenté comme PASS. Le complément Prettier ci-dessus décrit le correctif ultérieur.
Les tests Windows qualifient les scénarios exécutés aujourd’hui ; les benchmarks
Python/Linux, captures navigateur et installations externes ne sont pas relancés.
Les scripts de vérification ad hoc et logs sont dans `.cache/docs-audit` et
`.cache/docs-audit-*.log`, hors distribution et Git.

Références protégées à comparer en fin de mission :

- CDC présent à `docs/CDC_référence.md` : SHA-256
  `ffb97d8f1b3401e462da6411d4dde671a06d9522a6d745e28d06fb2f2e9459ae`.
- Corpus et copie originale : SHA-256
  `0f4d1173a78f9bd41e88678704c212c5147627e7e5a42ee28eb398f25f41c3ae`.

Le [rapport d’audit](audit.md) donne inventaire, corrections et périmètre du diff.

## Reprendre après interruption

1. Lire [AGENTS](../AGENTS.md), [README](../README.md), ce document,
   [décisions](decisions.md) et le lot concerné dans [roadmap](roadmap.md).
2. Contrôler `git status --short` et `git log -5 --oneline`. Ne pas écraser un
   travail existant ; si une autre session développe sur cette branche, isoler
   l’intervention ou attendre sa stabilisation.
3. Identifier la mission et son autorisation actuelles. D35 décrit une ancienne
   mission autonome achevée ; elle n’autorise pas de nouveaux lots. Le commit
   documentaire est maintenant explicitement demandé par l’utilisateur.
   Le CDC demeure la cible fonctionnelle.
4. Consulter les profils, IDs CDC, tests et ADR pertinents. Rechercher une preuve
   historique dans les archives seulement si nécessaire ; ses anciennes listes
   de tâches ne constituent pas l’état courant.
5. Cette réorganisation et ses contrôles sont terminés ; le commit documentaire
   demandé regroupe guides, archives, ADR et preuves locales. Pour développer
   ensuite, sélectionner un seul lot explicitement demandé.
   Le complément Prettier exclut les caches dès leur parcours ; consulter ses
   résultats ci-dessus pour le dernier contrôle global.
6. Exécuter les commandes appropriées, rapporter environnement et résultats
   effectifs, puis mettre à jour décisions/progress/matrice. Respecter les règles
   de commit de la nouvelle mission ; aucune CI distante présumée.

## Commits repères

| Étape                             | Commit                                        |
| --------------------------------- | --------------------------------------------- |
| Consolidation canonique           | `6c7a9d1`                                     |
| M0 / M1 / M2                      | `e072a57` / `8ef7de5` / `d8a39a2`             |
| M3 / M4 / M5 / M6                 | `5d45d77` / `1836dbb` / `b64ae3d` / `066bca8` |
| M7 / M8 / M9                      | `2c970d0` / `6f62be7` / `00e9a1a`             |
| M10 / M11 / M12                   | `63e43f7` / `41a8ef2` / `008d0ce`             |
| Enregistrement de livraison / CDC | `82f6b0e` / `0db2304`                         |

Le détail des livraisons et critères figure dans la roadmap ; ce tableau sert
uniquement à retrouver les états Git et les preuves de reprise.

### D55 — Sérialisation des attendus numériques Admin (30 octobre 2026)

La mission Admin/Engine autorisée reproduit un attendu rendu par Cortex avec des
séparateurs de groupes, puis refusé par le profil numérique inchangé. Les deux
chemins numériques sérialisent désormais avec digitGroup: 0. Aucune admission,
contrainte, forme, limite, source originale ou autorité mathématique n'est relâchée.
Le test numeric-display-roundtrip couvre rationnels/réels, négatifs, grands nombres,
rejeu et maintien du refus des entrées groupées hors profil.

L'archive distribuée Admin 0.1.1 est construite depuis baa48c45 et ce correctif,
sans les travaux 0.2.0 préexistants. SHA256 :
c7116f9310da49478deb43ca64e04b974efd34765b45a22294c13b5235bdf927.
Schéma 5 et pipeline 0.1.0 conservés ; les octets de présentation peuvent changer.
Conserver l'archive exacte pour le rejeu et renouveler les reçus. Les sources de
développement restent en 0.2.0 ; aucun tarball ancien n'est remplacé.

Qualification candidate : build/types/lint ; 1542/1544 tests au premier passage,
deux timeouts algébriques à 5 s pendant des builds concurrents ; relance complète
du fichier algébrique 126/126 sans concurrence, même délai. Le contrôle composé
s'arrête au format d'un ancien CDC de la copie de référence, conservé. Le banc
officiel du package installé Linux passe sous 384 Mio / swap 0 / 64 pids et réseau
coupé, avec arrêt des workers et rejeu. Cela ne qualifie pas Vercel ni NovLearn.
Les manifests, patch exact de release et anciennes archives sont conservés dans
Novlearn-admin/vendor ; aucune dépendance applicative au dossier voisin.

## Audit CI/CD et déploiement VPS — 3 novembre 2026

La CI GitHub existante est resserrée sur PR vers `main` et push sur `main`, avec
concurrence par référence, Node depuis `.nvmrc` et permissions minimales. Le
déploiement VPS demandé est bloqué par l'état du dépôt : le host est un CLI
stdin/stdout, sans HTTP, ports ni endpoint de santé ; le profil Linux exige un
cgroup v2 préconfiguré. Pas de service, secrets, Docker/Compose ou déploiement
fictifs ajoutés. Voir [D56](decisions.md#d56--ci-locale-et-frontière-de-déploiement-du-host-3-novembre-2026)
et [déploiement](DEPLOYMENT.md).

Contrôles locaux : `npm.cmd ci` PASS ; `npm.cmd run check` passe
build/types/lint/format, puis **1572 tests PASS / 1 FAIL**. Le seul échec est le
test Windows du host, timeout après 10,15 s au lieu de la limite native de 5 s ;
31 autres fichiers passent. Un premier Vitest séparé a échoué sur le chemin
temporaire des workers ; le contrôle complet suivant a utilisé le répertoire
temporaire autorisé. `npm.cmd pack --dry-run` PASS. CI distante et déploiement
non exécutés.
