# Roadmap et critères de passage

## Installation et première release — réalisées

Le VPS Engine a été initialisé et la release `v0.2.1` est publiée. Le workflow
de release a construit le tarball exact et son empreinte, publié l’image GHCR par
digest et déployé cette version en staging. Le host HTTP reste séparé des
applications consommatrices ; leur configuration de client doit épingler
l’empreinte de l’archive.

## Workflows et exploitation actuels

Les workflows actifs sont la CI, la release avec déploiement staging, le
redéploiement manuel d’une release en staging, la promotion/rollback manuel de
production, les tests Apache sur runner jetable et la réparation manuelle du
seul vhost staging. L’initialisation du VPS et la récupération chiffrée du token
ne sont plus des workflows du dépôt. Les procédures d’API, de configuration et
de déploiement sont dans [DEPLOYMENT.md](DEPLOYMENT.md) ; le routage staging est
dans [apache-staging.md](apache-staging.md).

## Qualification initiale de l’extension de courbes — 21 octobre 2026

L’API [sampling D54 / Admin D10](graph-sampling.md) est incluse dans le package
Engine 0.2.1. Les nombres ci-dessous décrivent le travail de qualification
initiale d’octobre, pas un contrôle du tag actuel ni l’état d’une intégration
consommatrice. Le premier contrôle complet avait terminé avec dix échecs ; les
correctifs ciblés et les 109 tests ciblés passaient alors. Les contrats,
protections et délais n’ont pas été assouplis.

## Correction ciblée de disponibilité — 17 octobre 2026

Une charge Admin combinant figures et vecteurs révèle un timeout natif
intermittent à cinq secondes. Le [correctif et sa qualification](certification/numeric-render-cache.md)
réduisent les évaluations numériques strictement identiques dans leur seul
contexte d’instanciation. Aucun nouveau lot mathématique, contrat, délai ou
critère de validation n’est ouvert ou assoupli. Le correctif et l’archive exacte sont qualifiés localement : 1 540 tests,
contrôle complet, six générations avancées en moins de 2,64 s, comparaison
exacte et contrôles Linux passent. L’adoption Admin attend encore la migration
locale de l’empreinte SQL et le changement coordonné du package.

## Requalification locale ciblée — 14 octobre 2026

Le [profil Linux borné choisi](certification/linux-requalification.md) et
l’archive installée sont qualifiés localement, avec critères inchangés.
La reprise corrige les diagnostics et renforce les bancs, sans nouveau lot
mathématique. Les refus Windows et les limites d’adoption restent documentés.

Le [CDC officiel](CDC_référence.md), notamment son chapitre 13, fixe objectifs et
priorités P0/P1/P2. Les numéros **M0–M12** désignent les lots de la mission de
finalisation ; les numéros **1–11, 5C, 6A, 6B** désignent ceux du CDC.
Ils ne constituent pas deux roadmaps concurrentes.

M0–M12 sont livrés localement sur les profils de [features](features.md).
La [matrice CDC](feature-coverage.md) conserve les exigences et preuves ;
[progress](progress.md) distingue validations historiques et contrôles actuels.
L’[ancienne roadmap](archive/roadmap.md) reste une trace, sans consignes actives.
Les lots pré-consolidation 1–5/4 bis/5 bis ne sont pas à reconstruire.

## Lots achevés

Pour chaque ligne, le statut signifie « livré et testé dans le profil indiqué ».
Les limites de famille et travaux applicatifs restent explicites, sans modifier
les objectifs du CDC.

| Mission / CDC    | Objectif et livré                                                          | Dépendances                  | Critère de validation / preuve                                                                                           | Statut et reste                                                           |
| ---------------- | -------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| M0 / fondations  | Audit du socle, modèle canonique et matrice P0/P1                          | Consolidation `6c7a9d1`      | Contrats/exports/goldens, [archive](archive/progress.md#mission-autonome-v1--m0-audit-11-octobre-2026), `e072a57`        | Terminé ; aucune refonte répétée                                          |
| M1 / 1–5         | Noms descriptifs, génération composée, dépendances/contraintes et recettes | M0                           | Oracles BigInt/rejeu/cycles/contraintes, [tests](../tests/named-parameters.test.ts), `8ef7de5`                           | Terminé ; scopes locaux P2                                                |
| M2 / 5C          | Contrats/données d’éléments prioritaires et avancés                        | M1                           | Validation/substitution/références/projection de chaque type, [ADR 009](adr/009-display-elements.md), `d8a39a2`          | Terminé sur données prescrites ; rendu applicatif                         |
| M3 / 6A          | Correction numérique/discrète, infinis, texte/QCM, cinq états              | M1/M2                        | Exactitude/tolérances/erreurs/indétermination, [ADR 010](adr/010-numeric-grading.md), `5d45d77`                          | Terminé ; familles hors preuve restent inconnues                          |
| M4 / 6B          | Algèbre univariée, domaines, relations degré 0–2 et collections            | M3                           | Contre-exemples de domaines/oracles/solutions/fermetures, [ADR 011](adr/011-algebra-collections.md), `1836dbb`           | Terminé sur profils ; aucun solveur général                               |
| M5 / 7           | Formes originales, factorisation complète sur ℚ bornée et alternatives     | M3/M4                        | Valeur/forme séparées et inconnus conservés, [ADR 012](adr/012-pedagogical-forms.md), `b64ae3d`                          | Terminé ; facteurs degré ≥3 inconnus                                      |
| M6 / 6B          | Fonctions usuelles, limites/dérivées à attendus connus                     | M3–M5                        | Domaine avant réduction, exemple obligatoire −∞ et dérivée connue, [ADR 013](adr/013-school-known-answers.md), `066bca8` | Terminé ; aucun calcul général de limite/dérivée                          |
| M7 / 10 partiel  | Saisie MathLive réelle                                                     | M3–M6                        | 45 observations clavier/collage/API/virtuel et rejeu, [rapport](mathlive-compatibility.md), `2c970d0`                    | Terminé pour 0.111.1/profils ; autres cibles à qualifier                  |
| M8 / 8 isolation | Processus neuf, watchdog, quotas OS Windows et protocole                   | Cœur et M3                   | Terminaison réelle/PID/Buffer/crash/récupération, [ADR 014](adr/014-isolated-node-host.md), `6f62be7`                    | Terminé ; tests natifs Windows de cet audit PASS, refus M9/M12 historique |
| M9 / 8 transport | CLI/bridge Python/FastAPI, Linux cgroup borné, mesures                     | M8                           | 12 contrôles OS, tests Python et benchmarks, [ADR 015](adr/015-private-python-transport.md), `00e9a1a`                   | Terminé sur Linux admissible ; SLO/provisioning de production à qualifier |
| M10 / 9          | Huit adaptations complètes, rapports/provenance et profil 106              | M1–M6/M9, recettes arbitrées | Huit parcours, 558 mappings, seeds/oracles/refus, [ADR 016](adr/016-reviewed-legacy-adaptation.md), `63e43f7`            | Terminé localement ; catalogue inconnu et DB non migrés                   |
| M11 / 10         | Parcours historique/FastAPI/MathLive, reprise, duel et falsification       | M7/M9/M10                    | 17 observations, tests HTTP/concurrence/TTL/manche, [demo](demo.md), `41a8ef2`                                           | Terminé en banc ; auth/store/rendu de production externes                 |
| M12 / 11         | Distribution, versions/persistance/rejeu/rollback et audit CDC             | M11                          | Tarballs Node/TS/browser, 11 corruptions, 46 P0/P1 qualifiées, [release](release.md), `008d0ce`                          | Terminé localement ; publication/adoption non exécutées                   |

Les critères de passage ont été consignés dans les bilans de lots. Une nouvelle
régression démontrée peut justifier une correction ciblée, sans rouvrir tous les
lots achevés. Une preuve OS Windows ancienne et des skips Linux ne qualifient pas
la politique Windows actuelle. Aucun « refus hors profil » ne remplace une
exigence obligatoire non réalisée.

## Complément d’outillage Prettier

Complément d’outillage sélectionné le 12 octobre 2026 après le commit documentaire
`19bf028` : exclure les caches dès le parcours des scripts Prettier, sans changer
leurs droits ni réduire le contrôle des sources. Critères : format/check sans
`EPERM`, défaut de format toujours détecté hors cache, références protégées
inchangées et `npm.cmd run check` complet. **Terminé, bilan du 13 octobre :
1533 tests / 29 fichiers PASS et pack PASS**. État et résultats dans progress ;
[décision D49](decisions.md#d49--exclure-les-caches-dès-le-parcours-prettier-12-octobre-2026).

## Travaux restants — non engagés

Les chantiers suivants nécessitent une instruction distincte. Ils ne changent
ni les priorités du CDC ni le verdict de V1 locale, et aucun n’est commencé ici.

| Chantier                                | Objectif / tâches                                                                                                                                                   | Dépendances                                                             | Critères de validation                                                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adoption serveur applicative            | Mettre à niveau le runtime ciblé, provisionner les quotas, registre officiel, identité/droits/store/tentatives ; intégrer la projection/correction pratique et duel | Artefact M12, environnement réel et autorisation sur dépôts applicatifs | Tests falsification/propriété/TTL/manche, interruption/récupération sous charge réelle, anciennes tentatives/rejeu/rollback ; aucun verdict client |
| Prochaines versions et adoption élargie | Maintenir les contrats versionnés et les épingles de release dans chaque consommateur ; qualifier chaque upgrade et scénario de rejeu                               | Besoin produit et contrats consommateurs                                | CI verte, tarball et digest exacts, staging sain, promotion ou rollback explicitement vérifié                                                      |
| Catalogue au-delà des huit lignes       | Collecter des sources autorisées, inventorier/enregistrer provenance, adapter individuellement les cas admis                                                        | Exports réels et arbitrages pédagogiques                                | Originaux préservés, rapports sans pertes silencieuses, profils/tests par exercice ; blocages explicites, aucune exécution JS                      |
| UI élève et Admin                       | Renderer partagé, édition, saisie et accessibilité ; afficher seulement les capacités admises                                                                       | Applications et données M2, workflows de publication définis            | Rendu/interaction réels par type, conservation IDs, champs privés absents, validation serveur commune ; MathLive sans autorité                     |
| P2 du CDC                               | Scopes locaux, parties imbriquées, génération conditionnelle / réponses précédentes                                                                                 | Besoin produit documenté, contrat et politiques approuvés               | Modèle/version/provenance/rejeu et tests de chemins conditionnels ; aucune dépendance pédagogique implicite                                        |
| Extensions mathématiques motivées       | Profils additionnels précis, sans CAS universel                                                                                                                     | Cas utilisateur/catalogue démontré, méthode de preuve CortexJS          | Domaines avant réduction, vrais positifs/négatifs, contre-exemples et états inconnus ; limites publiées et mise à jour CDC                         |

Le périmètre exclu au chapitre 15 du CDC n’est pas transformé en backlog
obligatoire. La phase suivante reste un choix explicite, **un seul lot à la fois**.

## Règles pour une prochaine mission

Lire les consignes et l’état actuel, délimiter objectif/autorisation, réaliser
contrats/code/tests du lot, exécuter check/pack et contrôles spécifiques, revoir
le diff, actualiser progression/décisions/couverture. Commit seulement si autorisé
dans cette mission. Aucun push, SQL, publication ou déploiement implicite.

## Audit initial du CI/CD - état remplacé par la livraison ci-dessus

L'audit a d'abord relevé le transport CLI stdin/stdout et l'absence de service
HTTP. Après autorisation de l'adaptateur HTTP privé, les travaux décrits dans
la section ci-dessus l'ont ajouté. La vérification du cgroup et la mise en
service sur le VPS restent à effectuer. Détails dans [DEPLOYMENT.md](DEPLOYMENT.md)
et [D56-D57](decisions.md).
