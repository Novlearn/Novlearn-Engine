# État et reprise

## Release commune 0.2.0 — 3 novembre 2026

Autorisation utilisateur : finaliser 0.2.0, adapter Admin et Novlearn, préparer
les commits et la configuration. Les correctifs du catalogue 0.1.8 sont fusionnés
avec le sampling 0.2.0. Le cœur reste indépendant des bases.
Le [guide de livraison](release-0.2.0.md) fixe le host Docker isolé sur le VPS
existant et le transport privé. Les résultats exécutés sont consignés au rapport
de vérification, sans déduire une qualification distante des tests locaux.

## Retrait du moteur historique Novlearn — 3 novembre 2026

L'archive finale 0.1.8 ajoute la projection optionnelle des courbes par Cortex,
avec 513 coordonnées approchées en précision machine par fonction. Le contexte
est propre à cette projection ; les calculs exacts et verdicts restent séparés.
La candidate 0.1.7 a rencontré des timeouts graphiques sous le délai inchangé de
cinq secondes ; ses octets et constats sont conservés hors distribution reçue.
Le nombre de points couvre le canvas actuel de 512 pixels sans ajouter de CAS
au navigateur. Ni génération, instantané privé ni projection par défaut ne change.

Novlearn reçoit les 111 exercices sous le host Linux borné : 131 générations et
projections, dont cinq seeds pour chacun des cinq exercices graphiques et 12 825
points réels. Les données de correction restent identiques à la référence 0.1.4.
Le contrôle privé vérifie aussi 4/2 = 2, le refus de 3 et une saisie incomplète.
Les 1 548 tests portables sont vérifiés sur la source 0.1.7, après reprise isolée
du fichier computed (timeout sous charge) ; les trois tests du seul module de
calcul modifié ensuite repassent sur la source finale 0.1.8. Build/types/lint/
format passent. Les tests natifs Windows restent bloqués par la stratégie OS
précédemment constatée ; aucune protection n'est contournée.

Les mêmes octets 82e49972 sont installés dans Novlearn et Admin. Les preuves
applicatives et la migration Staging d'empreinte restent dans Novlearn.

## Présentation commune des textes — 3 novembre 2026

Le correctif final 0.1.6 lie les paramètres mathématiques avant sérialisation Cortex,
y compris les puissances négatives et les indices. Il préserve les sauts de
ligne éditoriaux, les réponses textuelles littérales et les instantanés observés.
Les limites de taille continuent à retourner un diagnostic structuré.
Build, types, lint et format passent, ainsi que 100 tests ciblés. Novlearn a
comparé 555 générations (111 exercices, cinq seeds) aux données de correction
0.1.4 sans changement ; le tarball exact passe 127 générations et projections
sous Linux borné sur les 111 exercices. Les mêmes octets sont installés dans
Admin et Novlearn ; deux réponses sont validées dans l'écran élève existant.
La suite complète n'est pas annoncée comme passée : elle a rencontré des
timeouts algébriques sous charge et le blocage natif suivant. La stratégie de contrôle
d'application Windows bloque le lanceur natif inchangé ; aucune protection
n'est modifiée pour contourner ce blocage. Voir [le périmètre](text-display-0.1.5.md).

## Extension du catalogue Staging — 2 novembre 2026

L’extension finale 0.1.4 est décrite dans [le relevé dédié](catalogue-staging-0.1.2.md).
Build, types, lint et format passent ; 1 575 tests / 32 fichiers passent avec
deux workers. L'archive immuable 791c6472 est adoptée par Novlearn et Admin.
Dans Novlearn, les 111 exercices historiques sont qualifiés sous Linux borné
sur cinq seeds : 555 générations, 111 relectures déterministes, 770 réponses
justes, 770 fausses et 770 vides. La conversion Staging est exécutée : 111 actifs,
zéro ancien exercice disponible et zéro contenu privé dans les parents publics.
Il s'agit d'un import technique conservant les originaux privés, sans fabriquer
une approbation humaine ou un reçu Admin signé. Aucun déploiement Production.
Le commit 65f6473 conserve les sources de l'archive avant le formatage suivant ;
les archives antérieures restent immuables. Les preuves détaillées de l'import
et de la réception entraînement/DS/duel restent dans Novlearn.

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
