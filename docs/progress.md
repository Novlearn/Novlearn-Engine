# État et reprise

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
