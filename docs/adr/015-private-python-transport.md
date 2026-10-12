# ADR 015 — Transport privé Python et profils hôte

> Statut documentaire : **Active** (revue du 12 octobre 2026). La décision reste applicable avec les extensions ultérieures. Les mentions de lots futurs, de nombres d’exports et de validation décrivent la date de chaque section ; [l’architecture](../architecture.md) et [les capacités](../features.md) décrivent l’état actuel.

Statut : M9 vérifié sur profil Linux borné, 12 octobre 2026. Aucun branchement applicatif ou
déploiement. M8 livré au commit 6f62be7 ; Linux étend ce lot parce que les sources
du backend cible le demandent. Cette ADR ne certifie pas le serveur déployé.

## Sources observées et proposition

Lecture seule de Novlearn : README ligne31 Python3.11+, requirements FastAPI0.128.0,
Pydantic2.12.0/httpx0.27.0 ; systemd/novlearn-backend.service ligne10 Uvicorn sous
/opt/novlearn. Workflow deploy.yml ligne472 Node20 : incompatible avec le profil
moteur Node24.19.x. Aucune modification, secret lu ou commande applicative exécutée.
Creator est une SPA Vite, sans backend Python local observé. Le pont ci-dessous
est un exemple indépendant dans ce dépôt, pas la description d'un transport existant.

## Protocole et responsabilités

CLI `novlearn-engine` : stdin/stdout JSON UTF-8 strict, un objet par ligne, protocole
requête1 M8 et enveloppe réponse transportVersion1. Corrélation requestId ; erreurs
techniques distinctes du CorrectionResult mathématique. Aucun shell, chemin worker,
commande libre, quota ou option de chaos issu de stdin. `--once` exécute une seule
requête et termine ; mode sans option conserve seulement le superviseur Node.
Chaque calcul est dans un nouveau worker, même avec superviseur persistant.
Une trame1MiB maximum, dix trames en vol maximum, sortie M8 bornée et backpressure.
Plus de dix trames dans un chunk ferme le canal (exit65) plutôt que croître sans
borne. Trame incomplète à EOF refusée. stdout contient exclusivement des réponses.

`examples/python/bridge.py` : stdlib Python3.11+, processus via
create_subprocess_exec avec chemins backend fixes, environnement restreint.
Pool borné1…4, file0…32, délai préflight/file/lancement/I/O déclenchant interruption.
La réponse et le slot attendent ensuite le nettoyage, sans SLO strict de fermeture.
JSON fini/depth64/nodes32768, limites entrée1MiB et réponse2099200octets ; version,
ID, union réponse et métriques contrôlés. Un slot traite une requête à la fois.
Crash, corruption ou annulation détruisent le superviseur ; pas de réponse tardive
réattribuée à une autre requête. Nettoyage suivi malgré annulations répétées ; close
concurrent attend la même tâche. Le canal est uniquement destiné au backend.

`examples/python/app.py` : exemple FastAPI autonome avec registre officiel privé,
seed serveur, ID opaque, snapshot serveur et projection moteur. Corps HTTP64KiB
avant JSON/Pydantic. Champs supplémentaires refusés, jamais réinjectés dans un
snapshot. Soumission par instance/question ; propriétaire et expiration contrôlés
avant/après correction. Pas d'attendu/seed/politique/métrique privé dans HTTP.
Identités demo-alice/demo-bob et store mémoire16instances sont des fixtures,
à remplacer par l'identité et la persistance de Novlearn. Aucun point/progression
ni route de verdict client provenant des anciens backends repris.

## Mesures Windows observées

[Échantillons bruts](../fixtures/runtime/transport-windows-2026-10-12.json),
tools/bench-transport.py : Python3.13.12, Node24.19.0, Cortex0.151.0, Windows11x64.
20 appels par scénario, x²+2x+1 en parsing scalaire déclaré ; tous workers neufs.
Les deux slots persistants sont préchauffés. Percentiles nearest-rank sur petit
échantillon local ; aucune cible SLO générale ou charge production certifiée.

| Mode                              | p50 ms | p95 ms | requêtes/s | pic worker engagé | pic RSS superviseur |
| --------------------------------- | ------ | ------ | ---------- | ----------------- | ------------------- |
| Froid, 1 slot                     | 723    | 993    | 1,31       | 61,96MB           | 41,64MB             |
| Superviseur persistant, 1 slot    | 612    | 806    | 1,53       | 62,48MB           | 43,02MB             |
| Superviseurs persistants, 2 slots | 859    | 1211   | 2,13       | 62,34MB           | 42,75MB chacun      |

Premier essai concurrent au téléchargement Docker conservé seulement dans le cache,
non retenu pour décision. Le pool2 augmente ici le débit mais la latence monte :
paramètre backend explicite, pas préchauffage de contextes Cortex ou pool math
persistant. Budgets Windows384MiB engagés/worker + heap128MiB, délai calcul5s,
délai transport6s et overhead superviseurs à provisionner séparément.

## Profil Linux vérifié

Lanceur fixe Python stdlib distribué dans node-host/linux/job.py ; Python est déjà
une dépendance de la cible FastAPI. Linuxx86_64 seulement ; aucune compilation
native, bibliothèque mathématique, privilège ou service HTTP Node ajouté.
Le déploiement doit fournir un scope cgroup v2 dédié et déjà borné : memory.max
fini ≤budget demandé, memory.swap.max=0, pids.max fini ≤64. Sans ces conditions,
unavailable avant calcul, jamais fallback par heap/RLIMIT_AS. Le moteur n'écrit
pas dans /sys/fs/cgroup et ne crée aucun scope de production.

La mémoire est ici le quota partagé de tout le scope (superviseur, lanceurs,
workers), distinct du commit par worker Windows et du RSS. peakCgroupBytes est
le pic du scope, pas une mesure exclusive du dernier calcul ; pas de conversion
en peakCommittedBytes. La pression/OOM peut tuer le superviseur : le backend doit
recréer le scope/processus et distinguer cette panne d'une réponse incorrecte.

Processus créé dans le cgroup hérité, barrière d'exécution après trame started,
PR_SET_PDEATHSIG avec contrôle de course parent, watchdog indépendant et pipe de
vie. Parent PID1 refusé : utiliser un init de conteneur ou superviseur externe.
Seccomp x86_64 refuse fork/vfork et clone de processus, autorise les threads V8 ;
clone3 retourne ENOSYS pour fallback pthread classique. Cette restriction ne vaut
pas sandbox général pour exécuter du JavaScript arbitraire ; aucun tel code admis.
Node doit être dépourvu de bits setuid/setgid et de file capabilities, qui peuvent
annuler le signal parent-death à exec ; ces attributs sont contrôlés avant fork.

Banc local Docker : image officielle Node24.19.0-bookworm digest
sha256:4196d66a565c6f195728d9952f161f4adfe2ad753052a08b7ec7f1c5a6bda42b,
Python3.11.2, init, UID65534, réseau coupé, filesystem readonly, capacités retirées,
no-new-privileges, mémoire384MiB sans swap, tâches32. Artefacts moteur/fixtures
montés readonly et cache marqueur tmpfs éphémère1MiB. Docker est outil de preuve,
pas dépendance imposée au backend ou au cœur.

Premier parsing réel PASS1,117s/pic scope77,67MB. Premier stress interrompu sur
assertion crash trop spécifique (timeout observé), pas de preuve OOM déduite.
Reprise exige compteurs cgroup mémoire en hausse : max166/oom1/oom_kill1,
pic402653184octets et crash744ms observés ; validation globale Linux encore en cours.
Une sonde précédente a révélé un fatal shutdown Python avec thread stdin daemon ;
sortie explicite os._exit après nettoyage/flush corrigée, parsing suivant PASS.
Revue indépendante : risque de signal après récolte PID corrigé par reaped ;
ABI x32 refusée explicitement avant règles fork/clone. Python3.11+ et memory.peak
vérifiés avant fork. RLIMIT_CORE=0 ; politique éventuelle de core dumps OS par
pipe externe non certifiée par ce réglage. Essai RLIMIT_DATA abandonné : empêchait
la réservation virtuelle V8, sans fournir une alternative admise au cgroup.

Passage final tools/check-linux.mjs : **12 contrôles PASS**, Node24.19.0,
scope384MiB/swap0/pids32. Watchdog prouvé pendant boucle synchrone du superviseur,
fork interdit et PID après parent mort absent. Quotas absents et swap autorisé :
refus unavailable sans worker. Allocations Buffer ont atteint le quota OS :
pic402653184octets, événements max ; un passage oom_kill1/crash767ms, un autre
pression sans OOM/timeout avec nettoyage **18,25s**. Cette dernière mesure dépasse
le délai10s demandé : aucune garantie de délai total de réponse sous pression
kernel n'est annoncée. L'interruption peut attendre la fin d'une opération kernel ;
le backend doit rester hors scope Node et prévoir son propre délai/cleanup.
Heap32MiB : message fatal V8 observé puis watchdog timeout5s dans ce kernel, PID
supprimé et requête suivante saine ; pas de code OOM déduit du simple exit.

Transport Python/FastAPI Linux3.11.2 : **7 tests PASS14,018s**, dépendances du
banc en cache uniquement, networknone et sources/packages readonly. Le prototype
ne configure pas le VPS réel et ne certifie pas Node20 ou son unité systemd actuelle.

Reprise Windows : **3 échecs/1 erreur sur7 tests**, contrôle d'application OS
bloque les exécutables natifs nouvellement compilés (confirmation PowerShell).
Le moteur renvoie unavailable ; aucune politique OS modifiée ni contournement.
Les mesures Windows ci-dessus et les preuves M8 décrivent le contexte précédent.
La qualification courante concerne Linux sous le scope documenté, pas Windows
sous cette politique. Tests Windows conservés, pas de skip ajouté pour passer.

## Vérifications et limites

7 tests Python Windows PASS9,809s avant dernier préflight et changement de contexte
OS ; 10 tests CLI PASS2,63s avant reprise. Revues indépendantes favorables après
correctifs framing/cleanup/provenance et Linux. Dernier passage PythonLinux après
correctif OverflowError métrique10^400 : 7 tests PASS18,362s. Aucun statut de
correction inventé depuis une exception de transport. Package/bin puis commit
restent à finaliser ; consommateur externe au M12. Pas de CI distante/production.

Validation package Linux : npm11.17.0 ci132packages depuis lockfile, puis
`npm run check` PASS build/types/lint/format, **1383 tests/24 fichiers passants**,
**32 tests Windows non exécutés** (30 hôteWindows et2CLI, conditions de plateforme
préexistantes), 445,99s. Copie isolée des sources actuelles dans le cache ; aucun
test retiré ou skip ajouté pour le contrôle d'application Windows. La garde native
setid/capabilities a été ajoutée ensuite et les12 contrôles Linux repassent sur
le lanceur actuel, dont mémoire max38/oom_kill1 et crash935ms. Types/lint/build
du dépôt principal repassent ; corpus et CDC conservés octet pour octet.

## Mesures Linux observées

[Échantillons bruts](../fixtures/runtime/transport-linux-2026-10-12.json), même
protocole de60appels au repos après la suite complète. Linux6.18.33 WSL2,
Python3.11.2, Node24.19.0/Cortex0.151.0, scope dédié384MiB sans swap/tâches64,
Node/Python/CLI partagent ce scope de banc. Mémoire ci-dessous : pic de charge
du scope complet ; aucune comparaison directe avec le commit worker Windows.

| Mode                              | p50 ms | p95 ms | requêtes/s | pic scope | pic RSS superviseur |
| --------------------------------- | ------ | ------ | ---------- | --------- | ------------------- |
| Froid, 1 slot                     | 1334   | 1469   | 0,74       | 91,75MB   | 53,58MB             |
| Superviseur persistant, 1 slot    | 1239   | 1281   | 0,80       | 93,71MB   | 55,58MB             |
| Superviseurs persistants, 2 slots | 1134   | 1212   | 1,75       | 170,33MB  | 54,52MB chacun      |

Le pool2 est retenu par défaut pour ce prototype mesuré, réglable au backend.
Le superviseur conserve uniquement ses canaux ; contextes Cortex neufs. Aucun
microservice HTTP Node supplémentaire, ni extrapolation à la charge de Novlearn.

## Consommation de l'exemple autonome

Le backend configure le chemin Node et le fichier CLI installé, charge un registre
de définitions canoniques privées, puis crée son bridge et l'app d'exemple :

```python
from bridge import EngineBridge
from app import create_app

bridge = EngineBridge(
    "/usr/local/bin/node",
    "/app/node_modules/novlearn-exercise-engine/dist/node-host/cli.js",
    size=2, max_queued=8, timeout=6.0,
)
app = create_app(bridge, official_definitions)
```

`official_definitions` est un dictionnaire backend chargé par l'application, pas
un paramètre HTTP. Le scope Linux existant doit satisfaire les quotas ci-dessus
avant le premier appel ; aucun calcul ne démarre dans le service Novlearn actuel
non borné. Provisionnement de ce scope et mise à niveau Node restent travaux
applicatifs séparés, sans configuration de production modifiée ici. Le lifespan
FastAPI attend le close du bridge. L'identité/store de démonstration doit être
remplacé lors de l'intégration ; les points, tentatives persistantes et permissions
restent applicatifs. HTTP n'expose pas directement les sept opérations internes.

Depuis ce dépôt, dans un Python3.11+ configuré sous le scope Linux admissible :

```sh
python -m pip install -r examples/python/requirements.txt
ENGINE_NODE=/usr/local/bin/node python tests/integration/python/test_transport.py -v
node tools/check-linux.mjs
```

Les contraintes Python épinglent les quinze versions réellement testées ; ce sont
des dépendances du banc séparé, aucune dans le package mathématique. L'interpréteur
embeddable Windows et pip.pyz n'ont servi qu'au cache de développement local,
pas à un mode d'installation production recommandé.

Sources primaires : [asyncio subprocess](https://docs.python.org/3.13/library/asyncio-subprocess.html),
[FastAPI lifespan](https://fastapi.tiangolo.com/advanced/events/),
[cgroup v2](https://docs.kernel.org/admin-guide/cgroup-v2.html),
[PR_SET_PDEATHSIG](https://www.man7.org/linux/man-pages/man2/PR_SET_PDEATHSIG.2const.html),
[seccomp](https://www.man7.org/linux/man-pages/man2/seccomp.2.html).
