# �tat et reprise

## Diagnostic et recr�ation Engine staging - 5 novembre 2026

Le run Engine `41924601043` a d�ploy� le digest 0.2.1 avec succ�s.
Le run Novlearn `42006269028` observe ensuite HTTP 503 sur un calcul
authentifi�. Son diagnostic inspecte `ENGINE_TOKEN`, alors que bootstrap,
Compose et serveur Engine utilisent `ENGINE_API_TOKEN`. Cette absence ne
prouve donc pas un d�faut de chargement du token.

Le workflow manuel staging ajoute une comparaison priv�e du token du fichier
staging avec celui du conteneur, une sonde `/run`, puis la recr�ation du seul
service `engine` du projet staging avec le digest et le token existants.
La sonde est r�p�t�e apr�s disponibilit�. Aucun token n'est affich�, aucun
fichier/service de production ni d�p�t consommateur n'est modifi�.
R�sultats distants de cette intervention � consigner apr�s ex�cution.

## Publication Engine 0.2.1 et relance staging - 4 novembre 2026

Le run CI `41887866785` passe sur Ubuntu et Windows, ainsi que le job
`host-container`. Le tag `v0.2.1` cible `8513666` et la release GitHub est
publi�e. L'asset exact `novlearn-exercise-engine-0.2.1.tgz` porte le SHA-256
`6d1d52f38297d6f91be0eaa4aea57eb63f61973eae4cc83d86fd0aa6651dd85a` ; l'image
GHCR publi�e est �pingl�e par digest
`sha256:d1916edf981fd23b57f543937d83411df77b7dc5da290e24db9f41cbf544a4ea`.

Le job de d�ploiement initial `41889427068` a �chou� avant toute modification
du VPS staging : l'action SSH a re�u une valeur masqu�e, le validateur dans le
checkout a accept� l'entr�e et le helper root d�j� install� a refus� son ancien
format de jeton. Le workflow de relance `41920817429` a ensuite confirm� que le
helper root d�j� install� sur le VPS conserve l'ancien validateur ; aucun
conteneur n'a �t� mis � jour. Le VPS confirme une session root issue du workflow
de bootstrap. Le correctif ajoute donc un ex�cutable s�par�
`novlearn-engine-deploy-staging`,
strictement limit� � staging, install� apr�s transfert temporaire et v�rification
de son SHA-256. Le helper partag� de production n'est pas remplac�. La migration
Novlearn attend toujours un d�ploiement staging sain. Aucun secret n'a �t� lu ni
affich� et aucun conteneur de production n'a �t� touch�.

Le correctif `11254b5` et la CI `41921624551` sont verts sur Ubuntu et Windows,
avec le job `host-container` et les nouveaux contr�les de syntaxe/format du
jeton. Le run staging `41920817429`, lanc� sur la version pr�c�dente, reste en
�chec ; il doit �tre relanc� depuis le workflow mis � jour avant d'engager la
migration Novlearn.

## Contexte initial de r�conciliation Engine 0.2.1 - historique

L'audit distant confirme `main` � `968696a9929614f04021dc53f7669e8c305adf4e`,
avec la CI de ce commit r�ussie, la release `v0.2.0` publi�e et `v0.2.1`
encore absente � l'audit initial. Le tag publi� contient des modules
`remote-host`, math�matiques et tests qui n'avaient pas �t� r�int�gr�s dans
`main`. Le package Novlearn staging consomme ces interfaces et �pingle
l'archive `v0.2.0` par SHA-256.

Le commit `63b7235` restaure ces sources et tests, garde le serveur HTTP et le
worker de `main`, et ajoute un test du client export� contre le gestionnaire
HTTP actuel.
Le workflow de release empaquette une seule fois sur Windows pour inclure le
lanceur natif, puis v�rifie et transf�re ces m�mes octets au job Linux, qui b�tit
l'image GHCR et attache le tarball exact et son SHA-256 � la release. Le seul
d�ploiement automatique reste l'environnement GitHub `staging`.

Contr�les locaux r�ellement ex�cut�s : `npm.cmd ci` PASS ; tests cibl�s des
interfaces restaur�es et du package, **66/66 PASS** ; `npm.cmd pack --dry-run`
PASS, 189 fichiers ; `npm.cmd run smoke:package` PASS. Les empreintes des
tarballs construits localement diff�rent entre builds Windows, car le build
compile le lanceur natif ; elles ne sont donc pas d�clar�es comme l'empreinte de
release. Le run CI `41881350792` a r�v�l� 6 assertions en conflit avec les
limites d'admissibilit� de `main` et une assertion de replay qui comparait �
l'identique le texte math�matique historique et sa nouvelle pr�sentation
normalis�e. Les limites d'exposant de `main` sont r�tablies pour le formulaire
p�dagogique `power-of-e`, et le replay conserve la fixture observ�e en s�parant
champs fonctionnels et pr�sentation normalis�e. Le run CI `41885496618` a
ensuite �chou� sur les cas `e^{20}`, `e^{-1/4}` et `e^{-1/5}` : la borne ne doit
pas restreindre les exponentielles rationnelles exactes du domaine r�el g�n�ral,
et leur affichage doit rester r�admissible. La borne `[-16, 16]` est maintenant
appliqu�e uniquement selon le formulaire `power-of-e` ; la s�rialisation garde
les puissances rationnelles de `e` sous une forme r�admissible. **241 tests
cibl�s** catalogue/grading/log-affine/replay passent localement ; build, types,
lint, formatage, `npm.cmd pack --dry-run` (189 fichiers) et le smoke test package
passent. L'empreinte du smoke local est variable et n'est pas celle de la
release. Vitest complet reste bloqu� sans r�sultat observable dans le runner
Windows local. Le run CI `41887866785` a ensuite pass� la suite compl�te sur
Ubuntu et Windows, et le job `host-container`. La release, l'archive et l'image
sont d�taill�es en t�te de ce document. Le correctif du filtre a �t� pouss� dans
`505e181` ; son CI `41892821636` est vert. Le d�ploiement staging doit encore
�tre d�clench� manuellement avec le nouveau workflow d�di�, puis sa sant� v�rifi�e
avant de reprendre la migration Novlearn.

## Lecture chiffr�e du token staging - 4 novembre 2026

L'utilisateur cherche � r�cup�rer le token staging sans demander l'acc�s SSH �
l'administrateur. Ajout d'un workflow manuel sur main et d'un script qui utilisent
les trois secrets VPS existants. Le token est lu sur le VPS et chiffr� avec la
cl� publique RSA fournie ; seuls les octets chiffr�s sont affich�s dans Actions.
La cl� priv�e reste locale, hors Git, dans un r�pertoire � acc�s Windows limit�.
Les configurations VPS, les tokens et les services ne sont pas modifi�s ; seul
un dossier temporaire contenant la cl� publique est cr�� puis supprim�.

V�rifications locales : syntaxe Bash, chiffrement et d�chiffrement RSA-OAEP
SHA-256 sur un token factice, absence de sa valeur claire dans la sortie et refus
de cl�/token malform�s passent. La lecture r�elle du VPS reste � effectuer apr�s
publication. Aucun token n'est affich� dans la conversation ni ajout� � Vercel.

## Bootstrap r�ussi et correction du conteneur CI - 4 novembre 2026

Le run GitHub `Initialize Engine VPS #4` a termin� le bootstrap avec le compte
existant : les fichiers de d�ploiement et tokens sont install�s, aucun conteneur
n'a d�marr� et Apache n'a pas �t� modifi�. La CI `#13` du commit `33adc4b` a
r�ussi sa matrice Ubuntu/Windows mais �chou� � la disponibilit� du host Docker.

Deux causes ont �t� reproduites localement. L'image installe `python3-minimal`
sans les modules standard requis par le lanceur (`ModuleNotFoundError: ctypes`).
Apr�s installation de `python3`, le smoke reste non sain sans `--init` : Node
est PID 1 et le lanceur refuse ce parent pour garantir sa terminaison. Compose
utilise d�j� `init: true`. Le Dockerfile installe d�sormais Python complet et
importe le vrai lanceur pendant le build sans ex�cuter sa fonction principale.
Le smoke CI utilise `--init` et affiche l'�tat limit� du conteneur, ses logs et
la r�ponse de sant� en cas de refus, sans afficher sa configuration ni son token.

V�rifications locales : construction de l'ancienne image, reproduction du module
manquant, build corrig�, reproduction du 503 sans init et smoke CI corrig� avec
`/healthz` puis calcul authentifi� r�ussis sous 384 MiB / swap 0 / 64 pids.
Le profil Compose passe �galement (read-only, utilisateur 1000, capacit�s retir�es,
no-new-privileges, tmpfs) avec refus 401 sans token et 409 pour mauvaise archive.
La cr�ation d'un nouveau r�seau Docker local est bloqu�e par l'�puisement de ses
plages ; ce contr�le Compose utilise donc un override local `network_mode: bridge`.
Le fichier de d�ploiement n'est pas modifi�. Les conteneurs de test sont supprim�s.
La nouvelle CI distante reste � observer apr�s push ; aucune image GHCR ni aucun
d�ploiement VPS n'est effectu� par ce correctif.

## Bootstrap avec le compte root existant - 4 novembre 2026

Le run GitHub `Initialize Engine VPS #3` a valid� le pr�flight et copi� les
fichiers, puis �chou� avant le bootstrap : le compte SSH observ� est UID 0 et
la validation refusait root. � la demande de l'utilisateur, le workflow et le
script acceptent d�sormais ce compte existant. La validation du nom reste
active et son erreur d�clenche le nettoyage du dossier temporaire du run.
Le bootstrap n'ajoute aucune r�gle sudo pour root ; une initialisation ult�rieure
avec un compte d�di� peut donc cr�er sa propre r�gle limit�e au wrapper.

La CI `#12` a r�ussi les v�rifications Ubuntu et Windows, mais son job Docker a
�chou� en attendant `/healthz`. Ce probl�me reste distinct et non corrig� ici.
Le pr�sent changement ne lance aucun workflow ni aucune commande sur le VPS.

V�rifications cibl�es : syntaxe Bash du bootstrap et du bloc SSH du workflow,
admission des noms root/non-root, refus des noms malform�s, absence de r�gle sudo
cr��e pour root, cr�ation pour un compte d�di�, r�ex�cution et refus d'une r�gle
existante diff�rente passent dans un dossier temporaire local. Format Prettier
des fichiers YAML/Markdown modifi�s v�rifi�. Aucun bootstrap complet ni nouveau
build Docker ex�cut� ; le smoke conteneur rouge reste � diagnostiquer.

## Lancement manuel du CI - 4 novembre 2026

Le commit `4e911ea` de formatage est bien sur `main`, mais l'API GitHub ne
retourne aucune ex�cution CI associ�e. Le workflow est activ� et �coute les pushs
sur `main`; la cause exacte de l'absence d'�v�nement n'est pas �tablie. Ajout de
`workflow_dispatch` au CI pour permettre de contr�ler un commit via Actions sans
modifier les workflows de release ou de d�ploiement. Aucun lancement manuel
suppl�mentaire effectu� depuis ce correctif.

## Workflow manuel de pr�-v�rification et bootstrap VPS - 4 novembre 2026

Ajout local d'un workflow `workflow_dispatch` unique qui r�utilise les secrets
du d�p�t `VPS_HOST`, `VPS_USERNAME` et `VPS_SSH_KEY`. Le mode `preflight` v�rifie
SSH, sudo non interactif, Docker/Compose, cgroup v2, outils, ports et �tat Engine
sans modifier la configuration ou d�marrer de service. Le mode `initialize`
exige une phrase de confirmation, copie les trois scripts/configurations utiles
dans un dossier temporaire priv�, puis lance le bootstrap VPS existant. Les ports
par d�faut restent 3151/3152. La documentation pr�cise les droits requis et le
fait que l'initialisation ne publie ni image ni conteneur et ne modifie pas Apache.

Aucun workflow distant n'a �t� lanc�. Le compte VPS, son droit `sudo -n`, les
pr�requis et les secrets r�els ne sont pas observables localement. Le workflow,
les actions SSH/SCP, le bootstrap Linux et le pr�flight attendent une revue et une
ex�cution contr�l�e sur GitHub; aucun d�ploiement n'a �t� effectu�.

## Livraison locale CI/CD du host - 3 novembre 2026

La CI vise maintenant les PR vers `main` et les pushs sur `main`. Le host dispose
d'un adaptateur HTTP priv� versionn� avec token par environnement et sonde de
disponibilit�. Docker/Compose, scripts bootstrap/d�ploiement/rollback, publication
GHCR par digest, staging automatique et promotion/rollback prod sous approbation
sont ajout�s. Instructions pour Alexandre dans [DEPLOYMENT.md](DEPLOYMENT.md).

Aucun secret GitHub, release, publication ou d�ploiement distant cr��. Le VPS,
ses ports/cgroup, Apache et les GitHub Environments restent � configurer. Check
complet final : 1579/1579 tests ; `npm.cmd pack --dry-run`, smoke du package et
`docker compose config --quiet` passent. Le daemon Docker est inaccessible et
Bash est bloqu� par l'isolation Windows ; image, scripts Linux et CI distante
non ex�cut�s.

La revue du 4 novembre a ajout� au workflow CI un job Ubuntu qui construit
l'image et exerce le host conteneuris� sous limites m�moire/processus, avec
health check et requ�te authentifi�e. Il attend le succ�s de la matrice
Node/Windows et n'utilise aucun secret. Contr�le local de reprise : `npm ci`,
pack dry-run, smoke du package et configuration Compose passent. Vitest n'a
pas termin� dans ce sandbox Windows : 26 suites ne trouvent pas les fichiers
temporaires Vitest (`ENOENT`), 7 suites et 158 tests passent avant l'�chec ;
une relance avec `TEMP` explicite reste bloqu�e et a �t� interrompue. Le daemon
Docker local et Bash ne sont pas disponibles, donc le nouveau job conteneur
attend son ex�cution sur GitHub Actions. Aucun d�ploiement ni release r�el.

## Extension locale des courbes - 21 octobre 2026

[Sampling D54 / Admin D10](graph-sampling.md) autoris�, en cours : 109 tests cibl�s passent, dont 28 nouveaux cas de sampling ; build/types stricts passent. Le premier contr�le complet a termin� avec dix �checs conserv�s ; les correctifs cibl�s passent et le second contr�le complet reste � ex�cuter. Host Linux et tarball restent � qualifier avant adoption Admin. Aucun crit�re, protection ou environnement distant modifi�.

## R�gression de disponibilit� des figures Admin - 17 octobre 2026

La [correction cibl�e](certification/numeric-render-cache.md), autoris�e par
l'accord humain D51 / Admin D05, r�duit les recalculs num�riques exacts identiques
pendant une seule instanciation. Le profil Linux et son d�lai de cinq secondes
restent inchang�s. Ni formule, diagnostic d'erreur, g�n�ration suivante ni autre
contexte n'utilisent ce cache. Le d�tachement final existant est conserv�.

**1 540 tests / 30 fichiers, z�ro skip**, build/types/lint/format et smoke du
tarball passent. Linux : six g�n�rations compl�tes en 2,41-2,64 s sous le d�lai
natif inchang� de cinq secondes, projections identiques, dix comparaisons
priv�es/diagnostiques exactes, sept op�rations, 12 contr�les OS et huit parcours
historiques passent. L'archive qualifi�e commence par d4d3abc4 ; la preuve garde
son SHA256 complet. L'Admin conserve son archive ant�rieure jusqu'� migration
locale de son empreinte SQL et adoption coordonn�e ; aucun re�u n'est r��crit.
Aucune publication distante ni modification de protection Windows.

## Certification locale du profil Linux - 14 octobre 2026

L'utilisateur choisit Linux sous cgroup v2 born�. La [certification locale](certification/linux-requalification.md)
valide l'archive exacte 650128cd.9190290 : installation hors ligne, sept op�rations
publiques, rejeu priv�, projection et arr�t des workers. Les preuves source
Windows (1534 sans skip), Linux OS (12), historiques (8), Python/FastAPI (13) et
ESM/types/bundle passent s�par�ment. Aucune nouvelle CI distante ou session
navigateur n'est annonc�e. L'adoption applicative reste ext�rieure � ce bilan.

Les observations suivantes, notamment les refus Windows, restent historiques.

## Requalification locale - 13-14 octobre 2026

La [reprise autoris�e](certification/windows-requalification.md) valide la suite
source standard : **1 534 PASS, 29 fichiers, aucun skip**, 377,21 s. Le smoke
renforc� du tarball install� reste **FAIL** : Smart App Control bloque le
launcher Windows non sign� (Code Integrity 3077). La certification de l'artefact
Windows n'est pas acquise. Linux : 12 contr�les OS, 8 parcours historiques et
13 tests Python/FastAPI passent dans Docker local born� et sans r�seau.

Aucune limite ou protection Windows n'est modifi�e ; aucun environnement
distant ou CDC n'est touch�. Le choix du runtime est demand� avant adoption.
Les sections suivantes conservent les observations historiques du 13 octobre.

## �tat actuel - 13 octobre 2026

### Audit de certification fonctionnelle V1 - 13 octobre 2026

Demande de certification ex�cut�e dans le d�p�t seulement. Rapport :
[certification/report.md](certification/report.md), r�sultats complets :
[corpus-report.json](certification/corpus-report.json). Le nouveau banc
`tools/certify-corpus.mjs` v�rifie les huit adaptations autoris�es sur quatre
seeds chacune : validation, �l�ments/questions, attendus, r�ponses simul�es,
projection, s�rialisation et rejeu. Il rel�ve z�ro r�ponse correcte rejet�e sur
les cas certifi�s ; les r�ponses invalides sont rejet�es. Pour la ligne 6,
r�pondre `0` � `ln(k)` donne `indeterminate` aux quatre seeds, ce qui pr�serve
l'absence de preuve plut�t que d'affirmer `incorrect`.

V�rifications r�elles : build, typecheck, lint et format PASS ; smoke du vrai
tarball dans un projet consommateur s�par� PASS (Node/ESM/types/bundle browser).
`npm.cmd run check` �choue avec **1508 PASS / 25 FAIL**, 29 fichiers, 359,49 s.
Les 23 tests `node-host` et 2 tests CLI �chouent avec `unavailable` au lancement
du worker isol� Windows. Le rapport du launcher est g�n�rique ; cause syst�me
pr�cise non �tablie. CDC-42 passe � � � requalifier �, CDC-46 � non d�montr� ici �
et CDC-47/48 � partiel � dans la matrice. **Verdict courant : non pr�t pour pilote
ni adoption**, malgr� le cour portable pr�t � tester localement.

`npm.cmd pack --dry-run` PASS (157 fichiers). Python/FastAPI, nouveau navigateur
MathLive, cgroup Linux et CI distante non ex�cut�s dans cette mission. CDC et trois copies
historiques sont rest�s inchang�s en octets. D�tails et correctifs prioris�s dans
le rapport. Cette nouvelle preuve remplace les affirmations ant�rieures de
passage Windows pour l'�tat courant, sans r��crire leur chronologie.

**Dernier lot fonctionnel termin� : M12**, commit
`008d0ce78c93ae698f794180618d38402f87a216`. Le package priv� 0.1.0, sch�ma 5,
est qualifi� comme **V1 locale sur les profils document�s**. La
[matrice CDC](feature-coverage.md) conserve 48 lignes : 46 exigences P0/P1
qualifi�es et deux exclusions explicites. Cela ne vaut pas adoption en production.

**Lot fonctionnel en cours : aucun.** Le compl�ment d'outillage Prettier est
termin� apr�s l'audit documentaire au commit `19bf028` ; aucun comportement
du moteur modifi�. L'intervention initiale �tait un audit documentaire. Aucun
Goal actif dans cette session � l'ouverture ; arbre Git initial propre au commit
`0db2304`. L'audit a d'abord �t� livr� sans commit. L'utilisateur demande ensuite
explicitement son commit documentaire local et un guide des tests/restes � faire.
Aucun push, publication, SQL ou d�ploiement autoris� par cette demande.

Les principaux livrables sont g�n�ration commune, donn�es d'�l�ments,
multiquestions/QCM, correction sous preuve, formes, h�te/transport priv�s,
adaptations locales et preuves de distribution/rejeu. Les
[capacit�s et limites](features.md) d�crivent leur port�e exacte.

## Fiabilisation Prettier - compl�ment d'outillage

Les scripts npm `format` et `format:check` ajoutent les globs n�gatifs quot�s
`!.cache/**` et `!.npm-cache/**` pour exclure les caches d�s leur �num�ration.
`.prettierignore` les filtrait d�j�, mais apr�s le parcours de la CLI 3.9.10,
trop tard pour �viter le `scandir` Python interdit. [D49](decisions.md#d49--exclure-les-caches-d�s-le-parcours-prettier-12-octobre-2026).

`npm.cmd ci --cache .npm-cache --no-audit --no-fund` PASS, 132 packages, lock inchang�.
`npm.cmd run format:check` passe avec le cache Python toujours pr�sent. Les sondes
confirment qu'un JSON mal format� dans le cache est ignor�, mais qu'un JSON mal
format� hors cache est signal� et retourne exit 1 ; sondes ensuite retir�es.
`format` et `format:check` partagent les m�mes exclusions. R�f�rences prot�g�es
inchang�es, sans ajout de d�pendance ou modification de droits/cache Python.

**Compl�ment termin� ; bilan finalis� le 13 octobre 2026.** Le contr�le complet
de confirmation passe : build/types/lint/format puis **1533 tests / 29 fichiers
PASS sans skip**, en **595,96 s**, avec le timeout Vitest habituel et sans filtre.
Log : `.cache/prettier-fix-check-confirmation.log` (ex�cution du 12 octobre).

Le premier passage avait franchi Prettier puis termin� avec 1531 tests PASS et
deux timeouts � 5000 ms dans le groupe des infinis (570 s). Le rejeu cibl� des
sept cas passe en 2,58 s ; les 142 autres cas du fichier �taient hors s�lection.
Le contr�le complet de confirmation ci-dessus passe ensuite sans cette s�lection.
Aucun test d�sactiv�, timeout relev� ou comportement math�matique modifi� ;
la cause des fluctuations de dur�e reste � surveiller s�par�ment.

`npm.cmd pack --dry-run` du 13 octobre PASS (157 fichiers). Les r�f�rences
prot�g�es et le lock restent inchang�s. La correction concerne seulement les deux
scripts et leur documentation ; l'utilisateur demande explicitement leur commit
local le 13 octobre. Ce bilan accompagne le commit, sans push ni nouveau lot.
Les r�sultats de l'audit
documentaire ci-dessous restent historiques, notamment son �chec de format.

**Points d'attention pour l'adoption :** les tests natifs Windows passent dans
cet audit, apr�s un refus historique M9/M12 dont la cause d'�volution n'est pas
�tablie. Linux n�cessite un cgroup v2 born�, avec m�moire partag�e
et nettoyage sans SLO strict. Authentification/store/rendu des bancs restent
de d�monstration. Registre/licence, production et catalogue complet sont s�par�s.
**Prochaine �tape :** choisir explicitement une mission de la
[roadmap](roadmap.md#travaux-restants--non-engag�s), sans relancer automatiquement
les lots livr�s.

## Preuves de la livraison M12 - historiques

| Contr�le livr� en M12      | R�sultat consign� et limite                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Check complet Linux        | 1501 tests PASS, 32 tests Windows SKIP ; build/types/lint/format inclus, 478,61 s                                        |
| Python/FastAPI             | 13 tests PASS ; [tests](../tests/integration/python/test_vertical.py) et parcours HTTP infini                            |
| Isolation Linux            | 12 contr�les OS PASS sous 384 MiB/swap 0/pids 64 ; quota et r�cup�ration document�s                                      |
| Distribution               | Vrais tarballs Windows/Linux, Node/TS/bundle et navigateur r�el ; [rapports](../tests/fixtures/release)                  |
| Persistance/rejeu/rollback | Deux archives r�ellement consomm�es, 11 corruptions refus�es ; [rapport](../tests/fixtures/release/rollback-report.json) |
| Saisie/int�gration         | 45 observations MathLive M7 et 17 M11 ; [MathLive](mathlive-compatibility.md), [banc vertical](demo.md)                  |

Ces suites et captures ne sont pas toutes r�ex�cut�es par la mission documentaire.
Les empreintes de tarballs pr�c�dents dans [release](release.md) identifient des
artefacts historiques ; changer le README peut changer l'archive suivante.
Le [journal archiv�](archive/progress.md) conserve les commandes, �checs
interm�diaires, arbitrages, mesures, chemins de cache et preuves de chaque lot.

## Contr�les de la r�organisation documentaire

| Commande / contr�le r�ellement ex�cut�               | R�sultat                                                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `npm.cmd ci --cache .npm-cache --no-audit --no-fund` | PASS, 132 packages install�s, Node 24.19.0/npm 11.17.0, lock inchang�                                                          |
| `npm.cmd run check`                                  | Build/typecheck/lint PASS ; arr�t au format : `EPERM` lors du parcours du cache Python ; Vitest non atteint par cette commande |
| `npx.cmd vitest run` s�par�ment                      | **1533 tests PASS / 29 fichiers**, sans skip, **502,23 s** ; Windows natif ex�cut�                                             |
| Prettier cibl� sur les 45 Markdown concern�s         | PASS ; CDC/AGENTS/CHANGELOG pr�serv�s, aucun parcours des caches                                                               |
| Exemples                                             | README et usage compil�s stricts avec imports publics puis ex�cut�s ; exemple d'h�te compil� uniquement                        |
| Liens et conservation                                | Liens/cibles/ancres locaux v�rifi�s ; 12 archives pr�serv�es modulo rep�re/liens/format, 48 exigences inchang�es               |
| `npm.cmd pack --dry-run`                             | PASS, 157 fichiers ; aucune publication                                                                                        |
| Git / empreintes                                     | Diff documentaire uniquement, `git diff --check` PASS ; CDC et corpus inchang�s                                                |

Au moment de la livraison documentaire, le contr�le cibl� du format contournait
le parcours inaccessible du cache, sans modifier configuration ou permissions.
Le `check` global �tait alors **non passant** ; ce r�sultat historique n'est pas
pr�sent� comme PASS. Le compl�ment Prettier ci-dessus d�crit le correctif ult�rieur.
Les tests Windows qualifient les sc�narios ex�cut�s aujourd'hui ; les benchmarks
Python/Linux, captures navigateur et installations externes ne sont pas relanc�s.
Les scripts de v�rification ad hoc et logs sont dans `.cache/docs-audit` et
`.cache/docs-audit-*.log`, hors distribution et Git.

R�f�rences prot�g�es � comparer en fin de mission :

- CDC pr�sent � `docs/CDC_r�f�rence.md` : SHA-256
  `ffb97d8f1b3401e462da6411d4dde671a06d9522a6d745e28d06fb2f2e9459ae`.
- Corpus et copie originale : SHA-256
  `0f4d1173a78f9bd41e88678704c212c5147627e7e5a42ee28eb398f25f41c3ae`.

Le [rapport d'audit](audit.md) donne inventaire, corrections et p�rim�tre du diff.

## Reprendre apr�s interruption

1. Lire [AGENTS](../AGENTS.md), [README](../README.md), ce document,
   [d�cisions](decisions.md) et le lot concern� dans [roadmap](roadmap.md).
2. Contr�ler `git status --short` et `git log -5 --oneline`. Ne pas �craser un
   travail existant ; si une autre session d�veloppe sur cette branche, isoler
   l'intervention ou attendre sa stabilisation.
3. Identifier la mission et son autorisation actuelles. D35 d�crit une ancienne
   mission autonome achev�e ; elle n'autorise pas de nouveaux lots. Le commit
   documentaire est maintenant explicitement demand� par l'utilisateur.
   Le CDC demeure la cible fonctionnelle.
4. Consulter les profils, IDs CDC, tests et ADR pertinents. Rechercher une preuve
   historique dans les archives seulement si n�cessaire ; ses anciennes listes
   de t�ches ne constituent pas l'�tat courant.
5. Cette r�organisation et ses contr�les sont termin�s ; le commit documentaire
   demand� regroupe guides, archives, ADR et preuves locales. Pour d�velopper
   ensuite, s�lectionner un seul lot explicitement demand�.
   Le compl�ment Prettier exclut les caches d�s leur parcours ; consulter ses
   r�sultats ci-dessus pour le dernier contr�le global.
6. Ex�cuter les commandes appropri�es, rapporter environnement et r�sultats
   effectifs, puis mettre � jour d�cisions/progress/matrice. Respecter les r�gles
   de commit de la nouvelle mission ; aucune CI distante pr�sum�e.

## Commits rep�res

| �tape                             | Commit                                        |
| --------------------------------- | --------------------------------------------- |
| Consolidation canonique           | `6c7a9d1`                                     |
| M0 / M1 / M2                      | `e072a57` / `8ef7de5` / `d8a39a2`             |
| M3 / M4 / M5 / M6                 | `5d45d77` / `1836dbb` / `b64ae3d` / `066bca8` |
| M7 / M8 / M9                      | `2c970d0` / `6f62be7` / `00e9a1a`             |
| M10 / M11 / M12                   | `63e43f7` / `41a8ef2` / `008d0ce`             |
| Enregistrement de livraison / CDC | `82f6b0e` / `0db2304`                         |

Le d�tail des livraisons et crit�res figure dans la roadmap ; ce tableau sert
uniquement � retrouver les �tats Git et les preuves de reprise.

### D55 - S�rialisation des attendus num�riques Admin (30 octobre 2026)

La mission Admin/Engine autoris�e reproduit un attendu rendu par Cortex avec des
s�parateurs de groupes, puis refus� par le profil num�rique inchang�. Les deux
chemins num�riques s�rialisent d�sormais avec digitGroup: 0. Aucune admission,
contrainte, forme, limite, source originale ou autorit� math�matique n'est rel�ch�e.
Le test numeric-display-roundtrip couvre rationnels/r�els, n�gatifs, grands nombres,
rejeu et maintien du refus des entr�es group�es hors profil.

L'archive distribu�e Admin 0.1.1 est construite depuis baa48c45 et ce correctif,
sans les travaux 0.2.0 pr�existants. SHA256 :
c7116f9310da49478deb43ca64e04b974efd34765b45a22294c13b5235bdf927.
Sch�ma 5 et pipeline 0.1.0 conserv�s ; les octets de pr�sentation peuvent changer.
Conserver l'archive exacte pour le rejeu et renouveler les re�us. Les sources de
d�veloppement restent en 0.2.0 ; aucun tarball ancien n'est remplac�.

Qualification candidate : build/types/lint ; 1542/1544 tests au premier passage,
deux timeouts alg�briques � 5 s pendant des builds concurrents ; relance compl�te
du fichier alg�brique 126/126 sans concurrence, m�me d�lai. Le contr�le compos�
s'arr�te au format d'un ancien CDC de la copie de r�f�rence, conserv�. Le banc
officiel du package install� Linux passe sous 384 Mio / swap 0 / 64 pids et r�seau
coup�, avec arr�t des workers et rejeu. Cela ne qualifie pas Vercel ni NovLearn.
Les manifests, patch exact de release et anciennes archives sont conserv�s dans
Novlearn-admin/vendor ; aucune d�pendance applicative au dossier voisin.

## Audit CI/CD et d�ploiement VPS - 3 novembre 2026

La CI GitHub existante est resserr�e sur PR vers `main` et push sur `main`, avec
concurrence par r�f�rence, Node depuis `.nvmrc` et permissions minimales. Le
d�ploiement VPS demand� est bloqu� par l'�tat du d�p�t : le host est un CLI
stdin/stdout, sans HTTP, ports ni endpoint de sant� ; le profil Linux exige un
cgroup v2 pr�configur�. Pas de service, secrets, Docker/Compose ou d�ploiement
fictifs ajout�s. Voir [D56](decisions.md#d56--ci-locale-et-fronti�re-de-d�ploiement-du-host-3-novembre-2026)
et [d�ploiement](DEPLOYMENT.md).

Contr�les locaux : `npm.cmd ci` PASS ; `npm.cmd run check` passe
build/types/lint/format, puis **1572 tests PASS / 1 FAIL**. Le seul �chec est le
test Windows du host, timeout apr�s 10,15 s au lieu de la limite native de 5 s ;
31 autres fichiers passent. Un premier Vitest s�par� a �chou� sur le chemin
temporaire des workers ; le contr�le complet suivant a utilis� le r�pertoire
temporaire autoris�. `npm.cmd pack --dry-run` PASS. CI distante et d�ploiement
non ex�cut�s.
