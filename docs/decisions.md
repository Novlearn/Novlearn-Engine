# D�cisions et ADR

Les ADR d�crivent les raisons et cons�quences techniques. Les bilans ne sont
pas des d�cisions actives suppl�mentaires. **Active** signifie toujours applicable
avec ses extensions ; **Superseded** signifie remplac�e ; **Historical** d�signe
une observation ou une autorisation attach�e � une mission pass�e.

Le [journal D01-D47](archive/decisions.md) conserve les formulations et arbitrages
originaux. Il n'autorise pas automatiquement de nouvelles op�rations. Les
[capacit�s](features.md) et [architecture](architecture.md) font r�f�rence pour
l'API actuelle, quand un ancien ADR d�crit une �tape de d�veloppement.

## Registre des ADR

| ADR                                                              | Statut actuel                                              | D�cision, justification et alternatives                                                                                      |
| ---------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [001 - Cour portable](adr/001-core-boundary.md)                  | Active                                                     | ESM/TS strict et boxed internes pour partager le moteur ; CJS et microservice sans besoin �cart�s                            |
| [002 - Preuves](adr/002-mathematical-evidence.md)                | Active                                                     | Source/domaine/forme distincts pour �viter les r�ductions trompeuses ; heuristique seule insuffisante                        |
| [003 - Autorit�](adr/003-server-authority.md)                    | Active                                                     | Snapshot serveur et projection s�lectionn�e ; client d�tenteur du verdict/seed/policy �cart�                                 |
| [004 - Contrat initial](adr/004-first-contract.md)               | Superseded par 008                                         | Question 103 transcrite manuellement et enveloppe v1 ; conservation/provenance historique utile                              |
| [005 - Parsing](adr/005-math-input.md)                           | Active, �tendue par M1/M6/M7                               | Cortex raw et gardes sans r��criture ; noms longs explicites pour pr�server la multiplication implicite                      |
| [006 - G�n�ration initiale](adr/006-deterministic-generation.md) | Superseded par 008 pour les contrats                       | Motifs du flux/tuples/calcul�s conserv�s ; plus d'enveloppes variables-v1/v2/v3 concurrentes                                 |
| [007 - Instance initiale](adr/007-native-instantiation.md)       | Superseded par 008 pour les contrats                       | Motifs de substitution/atomicit�/IDs conserv�s ; snapshots v1-v4 non admis                                                   |
| [008 - Consolidation](adr/008-canonical-consolidation.md)        | Active                                                     | Sch�ma 5 et un seul pipeline faute de consommateurs des prototypes ; compatibilit� interne exp�rimentale abandonn�e          |
| [009 - �l�ments](adr/009-display-elements.md)                    | Active                                                     | Donn�es prescrites valid�es/substitu�es ; rendu et calcul analytique non exig� restent externes                              |
| [010 - Num�rique/discret](adr/010-numeric-grading.md)            | Active                                                     | Certificats exacts/tol�rance officielle/infinis/QCM/texte ; float et �galit� heuristique universelle �cart�s                 |
| [011 - Alg�bre/collections](adr/011-algebra-collections.md)      | Active                                                     | Coefficients/produits crois�s/solutions born�s et domaines raw ; aucun solveur g�n�ral                                       |
| [012 - Formes](adr/012-pedagogical-forms.md)                     | Active, �tendue par 016                                    | Source originale et factorisation compl�te sur Q born�e ; factorisation sur R/extraction syst�matique du contenu non exig�es |
| [013 - Lyc�e](adr/013-school-known-answers.md)                   | Active                                                     | Parsing/substitution et attendus connus ; solveurs g�n�raux de limite/d�riv�e exclus                                         |
| [014 - H�te Windows](adr/014-isolated-node-host.md)              | Active ; preuves historiques et tests Windows de cet audit | Processus neuf/Job OS/watchdog ; worker partag� ou heap seul insuffisants ; tests natifs Windows de cet audit PASS           |
| [015 - Transport/Linux](adr/015-private-python-transport.md)     | Active                                                     | CLI et superviseurs persistants, contextes neufs, cgroup born� ; service HTTP Node non retenu                                |
| [016 - Adaptation](adr/016-reviewed-legacy-adaptation.md)        | Active                                                     | Recette explicite et rapport complet ; renommage aveugle et JavaScript historique �cart�s ; profil 106 born�                 |

Les textes historiques restent dat�s. Leurs mentions � futur �, � six exports �
ou � aucune migration � d�crivent le lot concern� ; elles n'annulent pas les
livraisons ult�rieures. Les preuves M7/M11/M12 sont accessibles depuis progress.

## D�cisions de pilotage et arbitrages maintenus

| IDs historiques                 | Applicabilit� actuelle                                                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| D01-D07, D19-D21                | Fronti�res portables, CortexJS, preuve/source/domaine, autorit� et composition toujours applicables                                          |
| D09                             | Choix d'outillage TS 6.0.3 pr�sent ; sa justification est historique, un upgrade exige v�rification                                          |
| D10/D13/D14/D27                 | Pr�cis�s par D38-D40 / ADR 010-012 : familles et tol�rances born�es, m�mes domaines par d�faut et factorisation sur Q                        |
| D12/D16/D23/D24/D28/D30/D32/D33 | Contrats exp�rimentaux remplac�s par D34/ADR 008 ; noms �tendus ensuite par D36                                                              |
| D25/D26                         | Liste plate/sections et IDs communs maintenus, couverture d'�l�ments �largie en M2                                                           |
| D08/D22/D31/D35                 | Historique des p�rim�tres, ordre moteur avant UI et autorisation de la mission autonome achev�e ; aucune autorisation nouvelle               |
| D11/D17/D43/D44                 | CLI/h�te local tranch�s par ADR 014-015 ; SLO et provisioning de production toujours s�par�s                                                 |
| D18/D29                         | Registre/licence/adoption et emplacement d'UI n�cessitent encore leur d�cision applicative                                                   |
| D36-D47                         | Noms, �l�ments, correction, formes, saisie, isolation, adaptation, d�monstration et artefacts livr�s sous profils ; ADR et preuves ci-dessus |

### D34 - Consolidation canonique (retenue, 11 octobre 2026)

Active : sch�ma unique 5, package priv� 0.1.0, une g�n�ration/instanciation,
pas de `instantiationVersion` redondant ni compatibilit� implicite des prototypes.
Justification et cons�quences : [ADR 008](adr/008-canonical-consolidation.md).
[Formulation originale](archive/decisions.md#d34--consolidation-canonique-retenue-11-octobre-2026).

### D35 - Mission autonome V1 et r�f�rence officielle (11 octobre 2026)

Historical : l'autorisation d'encha�ner et commiter les lots M0-M12 concernait
cette mission, maintenant achev�e. Le nom r�el `CDC_r�f�rence.md` avait �t�
confirm� ; ses octets restent prot�g�s. La demande initiale interdisait le commit
automatique ; l'utilisateur a ensuite explicitement demand� le commit local de
la documentation, sans autoriser de lot fonctionnel ou push.
[Texte original](archive/decisions.md#d35--mission-autonome-v1-et-r�f�rence-officielle-11-octobre-2026).

### D48 - R�f�rence documentaire actuelle (12 octobre 2026)

La pr�sente demande autorise l'audit, fusion/r��criture et archivage documentaire.
D�cision : conserver les chemins op�rationnels progress/decisions/roadmap et
la matrice CDC ; regrouper le fonctionnement dans architecture/features/usage/
development, avec un index. Les anciens bilans restent dat�s et consultables,
sans copie active concurrente. Le CDC r�el reste � `docs/CDC_r�f�rence.md`.

Alternative �cart�e : conserver toutes les anciennes sp�cifications comme
r�f�rences actuelles, car elles annoncent des manques d�j� livr�s. Aucune nouvelle
fonctionnalit�, contrat, fixture, d�pendance ou r�gle AGENTS n'est modifi�e.
Les exemples sont v�rifi�s contre les exports r�els ; les preuves anciennes sont
s�par�es des nouvelles ex�cutions. Cons�quence : reprise courte, historique
pr�serv�, aucun lot suivant ou commit lanc� automatiquement.

Les 1533 tests Windows de cet audit passent sans skip, incluant l'isolation
native. Ce r�sultat actualise le refus observ� en M9/M12 sans r��crire leurs
preuves ; aucune cause de changement de politique OS n'est affirm�e.

Apr�s livraison de l'audit sans commit, l'utilisateur demande un commit propre et
les instructions pour tester et poursuivre le projet. Le commit regroupe uniquement
les Markdown documentaires, avec revue du staging et contr�les de conservation.
Le guide development pr�cise les niveaux de test ; aucun nouveau lot, push ou
d�ploiement n'est engag�.

### D49 - Exclure les caches d�s le parcours Prettier (12 octobre 2026)

La demande suivante s�lectionne la fiabilisation du contr�le global. Avec la CLI
install�e Prettier 3.9.10, `expandPatternsInternal` �num�re les chemins avant que
le filtre des fichiers ignore soit appliqu�. `.cache/` est d�j� ignor�, mais un
`scandir` interdit peut donc faire �chouer `prettier --check .` avant ce filtre.

D�cision : ajouter les globs n�gatifs quot�s `!.cache/**` et `!.npm-cache/**`
aux deux scripts npm `format` et `format:check`. Ils sont int�gr�s aux exclusions
du parcours lui-m�me. Garder `.prettierignore` pour les �diteurs et les fichiers
prot�g�s (CDC, corpus, lock, artefacts). Pas de script interm�diaire, d�pendance,
changement de permissions ou suppression du cache. Les sources et documents
restent dans le p�rim�tre contr�l�, y compris leurs archives.

Alternatives �cart�es : modifier les droits Python ou effacer le cache pour faire
passer le contr�le ; un nouvel ajout `.cache/` � `.prettierignore`, d�j� pr�sent ;
restreindre le contr�le � une liste fixe de fichiers qui oublierait des ajouts.
La [CLI officielle](https://prettier.io/docs/cli#file-patterns) recommande de
quoter les globs pour que leur expansion reste identique entre plateformes.
Le comportement exact est v�rifi� dans la version locale et par ex�cution.

Bilan finalis� le 13 octobre : format PASS, sonde hors cache refus�e, contr�le
complet de confirmation 1533 tests/29 fichiers PASS sans skip et pack157 PASS.
Deux timeouts du premier passage et leur rejeu sont conserv�s dans progress ;
aucun seuil de test modifi� pour obtenir le r�sultat final.

Le 13 octobre, l'utilisateur demande explicitement de commiter tous les changements
de ce compl�ment : package.json et les quatre documents de suivi/maintenance.
Les caches et logs locaux restent hors Git ; aucun push ou lot suivant autoris�.

### D50 - R�sultats de certification V1 et statut d'isolation (13 octobre 2026)

La demande de certification autorise l'audit, le banc local et ses rapports,
sans changement du CDC, du corpus ou d'un d�p�t applicatif. Ajouter un banc
reproductible sur les huit fixtures adapt�es, leurs �l�ments et questions, quatre
seeds, correction, projection publique et rejeu JSON.

La suite compl�te a �t� r�ellement relanc�e : build/typecheck/lint/format PASS,
Vitest 1508 PASS / 25 FAIL. Les 23 tests Windows `node-host` et deux tests CLI
retournent `unavailable`; le launcher ne fournit qu'un diagnostic syst�me
g�n�rique. Ne pas attribuer une cause qui n'est pas prouv�e. Le smoke du tarball
dans un consommateur s�par� passe. Le rapport machine consigne les instances et
r�ponses ; le rapport humain s�pare ces observations des anciens benchmarks
Linux/Python/navigateur, non relanc�s.

Cons�quence : CDC-42 � requalifier, CDC-46 non d�montr� dans cet environnement,
CDC-47 et CDC-48 partiels. Le verdict de certification est � non pr�t � pour
pilote/adoption; le cour portable reste pr�t aux tests locaux sur profils exerc�s.
Un cas faux candidat pour `ln(k)` demeure ind�termin�, pas incorrect. La suite
doit repasser dans un environnement o� le launcher peut effectivement d�marrer
avant toute d�claration de qualification. Aucun commit automatique, CI distante,
publication, production ou migration n'est inclus.

### D51 - Requalification locale et smoke natif du package (13-14 octobre 2026)

L'utilisateur autorise explicitement les corrections locales Engine et leur
certification, sans assouplir les tests ni modifier d'environnement distant.
Ajouter un diagnostic natif born� sans chemin/message priv� et son test de
refus. Renforcer le smoke avec une ex�cution isol�e r�elle depuis le tarball.
Conserver l'�chec sous Smart App Control comme une porte bloquante : le check
source vert ne qualifie pas le launcher install�, pourtant identique en octets.

Les preuves source, Linux et Python positives sont s�par�es du refus Windows.
Ne pas d�sactiver ou contourner la politique, ni attribuer aux anciens timeouts
une cause non �tablie. Choisir le runtime et requalifier l'artefact exact avant
adoption ; [preuves et r�sultats](certification/windows-requalification.md).

### D52 - Cible Linux born�e et archive install�e (14 octobre 2026)

L'utilisateur retient explicitement � Linux avec cgroup v2 born�, test� dans
Docker local �. Qualifier l'archive exacte par installation npm hors ligne,
sept op�rations publiques, projection, rejeu et arr�t r�el des workers sous
384 MiB, swap 0 et 64 pids. Conserver les refus Windows ant�rieurs et le
passage du dernier artefact comme des preuves distinctes, sans promettre
l'acceptation des futurs binaires ni modifier Smart App Control.

Le banc permanent tools/check-installed-package.ps1 �pingle l'image locale,
le daemon Docker Desktop local, les d�pendances existantes et l'archive ;
aucun r�seau ou privil�ge suppl�mentaire. Les r�sultats sont dans la
[certification Linux](certification/linux-requalification.md). Cette d�cision
ne vaut pas adoption applicative, migration distante, publication ou d�ploiement.

### D53 - R�utilisation locale des nombres de rendu exacts (17 octobre 2026)

L'autorisation humaine D51 / Admin D05 couvre cette correction locale et sa
certification. La charge avanc�e Admin a d�pass� le d�lai natif de cinq secondes ;
une reproduction inchang�e r�ussit � 4 985 ms, sans marge suffisante pour qualifier
sa disponibilit�. Les familles isol�es localisent le co�t pendant l'instanciation.

D�cision : m�moriser uniquement les succ�s num�riques exacts, par source brute
identique, pendant l'unique passage d'une instanciation dont les param�tres et
variables sont d�j� r�solus. Ne m�moriser ni �chec ni formule � scope distinct.
Le validate() final existant recopie chaque occurrence et pr�serve le d�tachement
des AST. Ne pas r�utiliser de contexte Cortex global, modifier une admission,
augmenter les limites ou r�essayer automatiquement pour masquer un refus.

Six tests de sources, chemins, domaine, d�tachement et isolation compl�tent les
tests existants. Qualification compl�te, comparaisons et package Linux born�
requis avant adoption Admin. Le package reste priv� ; aucun registre ou
environnement distant n'est modifi�. Les r�sultats sont consign�s s�par�ment
dans [le relev� cibl�](certification/numeric-render-cache.md).

### D54 - Sampling local officiel des courbes (21 octobre 2026)

L'utilisateur r�pond explicitement � Oui, autoriser cette extension locale et sa
certification � � la proposition Admin D10. Autoriser le calcul des fonctions et
suites dans le moteur, sa certification puis l'int�gration locale Admin ; garder
quotas, d�lais et protections. Aucun changement de l'application �l�ve NovLearn,
base distante, publication r�elle, push ou d�ploiement n'est inclus.
Le profil et les limites sont d�crits dans [le travail en cours](graph-sampling.md).
Cette capacit� s'ajoute au package 0.2.0 sans changer le pipeline des snapshots
sch�ma 5 / engineVersion 0.1.0, ni r��crire les anciens artefacts.

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

### D56 - CI locale et fronti�re de d�ploiement du host (3 novembre 2026)

La CI existante est limit�e aux pull requests vers `main` et aux pushs sur
`main`, avec Node lu depuis `.nvmrc`, cache du lockfile, permissions de lecture
seules et concurrence par r�f�rence. Elle conserve la matrice Ubuntu/Windows
et les contr�les npm d�j� pr�sents.

L'audit demand� constate que `src/node-host/cli.ts` est un transport priv�
stdin/stdout, pas un serveur HTTP : aucun port ni endpoint de sant� n'existe. Le
host Linux requiert en outre un cgroup v2 born� pr�existant. Les exemples FastAPI
sont des d�monstrations, pas un service de production. Aucun Dockerfile/service,
registre d'images, Compose, authentification HTTP, secrets GitHub ou proc�dure
VPS ne sont donc invent�s. Le d�ploiement � deux ports et les workflows qui en
d�pendent attendent une d�cision sur le contrat du service appelable et la
configuration cgroup r�elle. Voir [d�ploiement](DEPLOYMENT.md).

`npm ci` et `npm pack --dry-run` passent localement. `npm run check` passe
build/types/lint/format puis rapporte 1 572 tests pass�s et un timeout Windows
du host � 10,15 s (limite de calcul native : 5 s) ; les autres 31 fichiers
passent. Aucun workflow distant, release ou d�ploiement n'a �t� lanc�.

### D57 - Adaptateur HTTP priv� et d�ploiement VPS du host (3 novembre 2026)

� la suite du constat D56, le prompt autorise explicitement un host appel� par
HTTP sur deux ports isol�s. Ajouter un adaptateur Node priv� versionn�
(`/v1/execute`, Bearer token distinct par environnement, `/healthz` avec sonde
r�elle du worker), sans modifier les r�gles de calcul ni les exports publics.
Le conteneur ex�cute le CLI sous cgroup v2, 384 MiB, swap d�sactiv� et 64 pids.

Ajouter Docker/Compose, bootstrap idempotent sans remplacement des secrets,
utilisateur SSH � commande forc�e, wrapper root avec sudo restreint, publication
GHCR par tag SemVer avec digest conserv� comme release asset, staging automatique
et promotion/rollback production manuels sous approbation GitHub. Le GITHUB_TOKEN
de lecture GHCR passe par le canal SSH chiffr� et n'est conserv� que sous `/run`
pendant le pull ; aucun PAT de registre n'est persistant sur le VPS.

Le code n'a pas �t� d�ploy� : environnements GitHub, cl� SSH, ports, vhosts Apache
et capacit� cgroup du VPS restent � configurer/confirmer par leurs administrateurs.
Contr�le final local : `npm ci`, check complet **1579/1579**, pack dry-run, smoke
du package, format et configuration Compose passent. Dockerfile, scripts Bash,
CI distante et d�ploiement r�el n'ont pas pu �tre ex�cut�s dans cet environnement.
Voir [DEPLOYMENT.md](DEPLOYMENT.md).

### D58 - Build et smoke test du conteneur en CI (4 novembre 2026)

La revue du workflow constate que les contr�les du package ne construisent pas
l'image Docker ni ne d�marrent le host. Ajouter un job Ubuntu apr�s la matrice de
v�rification : construire l'image, la lancer sous les limites de production,
attendre `/healthz`, puis envoyer une requ�te authentifi�e `/v1/execute`. Ce job
utilise un token al�atoire temporaire et `contents: read` ; il ne d�ploie aucun
environnement et n'utilise aucun secret.

V�rification locale de reprise : `npm ci`, `npm pack --dry-run`, smoke du package,
format et `docker compose config --quiet` avec variables factices passent. Les
tentatives compl�tes Vitest rencontrent `ENOENT` dans les r�pertoires temporaires
isol�s de Windows ; une relance avec `TEMP` explicite reste bloqu�e sans r�sultat
et est interrompue. Le daemon Docker local et Bash ne sont pas disponibles ; le
nouveau build/smoke reste � ex�cuter sur le runner GitHub. Aucun workflow distant,
release ou d�ploiement n'a �t� lanc�.

### D59 - Pr�flight et bootstrap VPS depuis un workflow manuel (4 novembre 2026)

L'utilisateur demande un moyen clair d'initialiser le VPS avec les seuls secrets
d�j� disponibles dans le d�p�t Engine. Ajouter un workflow_dispatch unique avec
un mode `preflight` sans changement de configuration et un mode `initialize`
prot�g� par une phrase de confirmation. R�utiliser exclusivement `VPS_HOST`,
`VPS_USERNAME` et `VPS_SSH_KEY`; ne pas ajouter de secrets ni d�marrer d'image
ou conteneur pendant l'initialisation. Le bootstrap conserve ses v�rifications,
ports par d�faut 3151/3152, cgroup v2, configuration idempotente et wrapper
restreint. L'acc�s � `sudo -n` est un pr�requis explicite, non accord� par le
workflow. Le transfert temporaire contient seulement les trois fichiers
n�cessaires et est supprim� apr�s l'ex�cution r�ussie du bootstrap.

La proc�dure et les limites sont document�es dans [DEPLOYMENT.md](DEPLOYMENT.md).
La revue YAML, le pr�flight, l'action SCP, le bootstrap Linux et toute ex�cution
GitHub restent � faire; aucun VPS n'a �t� contact� ou modifi� dans cette mission.

### D60 - Lancement manuel de la CI (4 novembre 2026)

Apr�s le push du formatage `4e911ea`, la branche distante `main` pointe sur le
commit, le workflow CI est activ� et configur� sur les pushs � `main`, mais
l'API GitHub ne retourne aucune ex�cution pour ce SHA. La raison exacte n'est
pas d�montr�e. Ajouter `workflow_dispatch` au m�me workflow pour que la CI
puisse �tre lanc�e explicitement depuis Actions sur `main`; ses jobs restent
des contr�les uniquement, sans publication ni d�ploiement.

### D61 - Autoriser le bootstrap via le compte root existant (4 novembre 2026)

L'utilisateur autorise l'adaptation et le push du workflow et du script pour
r�utiliser provisoirement le compte root d�j� employ� par NovLearn. Accepter
root sans modifier les autres validations du bootstrap, les secrets, les ports
ou la confirmation explicite. Ce choix donne aux workflows utilisant cette cl�
tous les droits root sur le VPS jusqu'au remplacement des acc�s.

Ne pas �crire de r�gle sudo redondante pour root : le passage ult�rieur � un
compte d�di� pourra cr�er la r�gle limit�e au wrapper sans conflit avec une
r�gle install�e pour root. La cr�ation du compte, sa cl� et le changement des
secrets GitHub restent � r�aliser par leurs administrateurs. L'utilisateur
relancera lui-m�me l'initialisation ; aucune ex�cution VPS n'est incluse ici.

### D62 - D�pendances Python et init du conteneur CI (4 novembre 2026)

Apr�s le bootstrap VPS r�ussi, corriger le host-container rouge sans assouplir
le lanceur ni ses contr�les de cgroup ou de parent. Debian `python3-minimal`
sans recommandations omet notamment `ctypes` et `resource` ; installer `python3`
et v�rifier les imports du vrai lanceur dans l'image pendant le build.

Aligner le smoke sur `init: true` du Compose avec `docker run --init`, car le
lanceur refuse un parent PID 1. Conserver m�moire, swap, pids et d�lais. En cas
d'�chec de disponibilit�, afficher uniquement l'�tat cibl� du conteneur et les
r�ponses/logs n�cessaires au diagnostic, sans inspecter sa configuration secr�te.
Les reproductions et limites locales sont consign�es dans progress.

### D63 - R�cup�ration chiffr�e du seul token staging (4 novembre 2026)

R�utiliser l'acc�s SSH GitHub d�j� disponible pour r�pondre � la demande de
r�cup�ration sans intervention de l'administrateur. Limiter le workflow manuel
� main et au token staging existant. Valider l'entr�e base64 avant le passage
SSH, puis chiffrer sur le VPS avec RSA-OAEP/SHA-256 et MGF1/SHA-256. Ne publier
dans les logs que le ciphertext ; le d�chiffrement utilise la cl� priv�e locale,
jamais envoy�e � GitHub ou au VPS. Ne pas afficher ni renouveler le token, changer
les droits SSH/sudo ou configurer des services externes dans cette op�ration.

### D64 - R�concilier la source publi�e avant Engine 0.2.1 (4 novembre 2026)

`main` avait conserv� les corrections r�centes du serveur HTTP, du worker, de la
CI, de Docker et du VPS, mais pas plusieurs sources et tests inclus dans
l'archive officielle `v0.2.0`. R�int�grer les interfaces `remote-host` et les
modules math�matiques/tests de cette release, sans remplacer le serveur HTTP,
le worker ni les fichiers d'exploitation actuels. La nouvelle version du
package est `0.2.1` et le sous-chemin export� reste limit� �
`novlearn-exercise-engine/remote-host`.

Le job Windows produit une archive npm unique, tests compris, afin que le
lanceur natif Windows soit pr�sent. Il calcule son SHA-256 et transf�re le m�me
fichier au job Linux. Le job Linux v�rifie cette empreinte, la passe � l'image
GHCR et attache le tarball exact et le fichier de SHA-256 � la release. Le tag
doit correspondre � `package.json` et provenir de `main`; le seul d�ploiement
automatique reste `staging`. Novlearn staging doit reprendre le binaire et
l'empreinte de la release, jamais un tarball construit s�par�ment. Les checks
locaux Windows incomplets dus aux restrictions du runner ne remplacent pas les
r�sultats CI distants, qui restent obligatoires avant le tag.

### D65 - Pr�server les limites de `main` dans la r�int�gration 0.2.0 (4 novembre 2026)

La source `numeric.ts` de l'archive `v0.2.0` admet des exponentielles � exposant
rationnel. Le domaine r�el peut donc comparer des formes symboliques exactes
telles que `e^{20}` ou `e^{-1/4}`. Appliquer la borne `[-16, 16]` uniquement au
formulaire p�dagogique `power-of-e` d�j� contraint par `main`, et garder les
exposants irrationnels hors profil. S�rialiser les puissances rationnelles de
`e` dans une forme que le consommateur peut r�admettre. Au rejeu vertical,
garder intacte la fixture observ�e ; v�rifier s�par�ment les valeurs
interpol�es de son texte et les autres champs du snapshot, car le moteur
s�rialise d�sormais la pr�sentation math�matique de fa�on normalis�e.

### D66 - Valider le jeton GHCR sans supposer son alphabet (4 novembre 2026)

Le d�ploiement v0.2.1 staging a confirm� que l'action SSH transmettait une valeur
masqu�e et le wrapper r�cent acceptait l'entr�e. Le helper root install� lors du
bootstrap conservait n�anmoins le validateur ant�rieur. Ajouter au workflow
staging un helper s�par�, dont le chemin d'ex�cution impose `staging`, �vite de
remplacer le helper partag� de production. Le workflow transf�re le script dans
un r�pertoire temporaire priv�, v�rifie son empreinte, l'installe au chemin
stage-only, puis d�ploie le digest immuable 0.2.1. Aucun secret n'est lu ni
affich� ; aucune modification au service de production n'est requise.

### D67 - V�rifier le token et le calcul du seul staging (5 novembre 2026)

Conserver le nom serveur `ENGINE_API_TOKEN` et le secret staging existant.
`ENGINE_TOKEN` est un nom c�t� consommateur ; son absence dans Docker ne
prouve pas une absence du secret serveur. Comparer sans divulgation le token
staging � celui du conteneur et exiger un calcul authentifi� HTTP 200 en plus
de `/healthz`. Recr�er uniquement `engine` dans `novlearn-engine-staging`, sans
nouvelle release, sans toucher � Compose partag� ni � la production.
