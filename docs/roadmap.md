# Roadmap et critères de passage

## Pré-vérification et bootstrap manuel VPS — livré localement, à exécuter

Le workflow manuel `Initialize Engine VPS` dispose de deux modes : préflight
sans changement de configuration, puis initialisation confirmée qui copie et
exécute le bootstrap déjà livré. Il consomme seulement les trois secrets VPS du
dépôt et requiert `sudo -n` déjà accordé au compte SSH. Le workflow n'a pas été
publié ni exécuté; restent la revue, l'intégration dans `main`, le préflight réel
et, après validation par l'administrateur VPS, l'initialisation.

## CI/CD et host HTTP sur VPS — livré localement, déploiement à effectuer

Le host possède maintenant un adaptateur HTTP privé, image Docker, deux Compose
isolés, bootstrap VPS, SSH restreint, release GHCR par digest, staging
automatique et promotion/rollback production avec approbation GitHub. La
procédure pour Alexandre est dans [DEPLOYMENT.md](DEPLOYMENT.md). Aucun
déploiement ni release réel effectué. Restent : configurer les Environments et
secrets GitHub, valider cgroup/ports du VPS, installer les clés, adapter les
vhosts Apache et effectuer une première release après que la CI soit verte. La
CI inclut désormais la construction de l'image et un smoke test du host sous
limites Docker ; ce job reste à observer sur un runner GitHub.

## Extension locale des courbes — 21 octobre 2026

[Sampling D54 / Admin D10](graph-sampling.md) autorisé, en cours : 109 tests ciblés passent, dont 28 nouveaux cas de sampling ; build/types stricts passent. Le premier contrôle complet a terminé avec dix échecs conservés ; les correctifs ciblés passent et le second contrôle complet reste à exécuter. Host Linux et tarball restent à qualifier avant adoption Admin. Aucun critère, protection ou environnement distant modifié.

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

| Chantier                          | Objectif / tâches                                                                                                                                                   | Dépendances                                                             | Critères de validation                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adoption serveur applicative      | Mettre à niveau le runtime ciblé, provisionner les quotas, registre officiel, identité/droits/store/tentatives ; intégrer la projection/correction pratique et duel | Artefact M12, environnement réel et autorisation sur dépôts applicatifs | Tests falsification/propriété/TTL/manche, interruption/récupération sous charge réelle, anciennes tentatives/rejeu/rollback ; aucun verdict client |
| Distribution et publication       | Décider licence/registre/consommateurs ; release immuable et activation par définition                                                                              | Choix produit et contrats consommateurs                                 | Tarball exact installé, CI réellement exécutée, compatibilité et rollback qualifiés ; publication uniquement autorisée explicitement               |
| Catalogue au-delà des huit lignes | Collecter des sources autorisées, inventorier/enregistrer provenance, adapter individuellement les cas admis                                                        | Exports réels et arbitrages pédagogiques                                | Originaux préservés, rapports sans pertes silencieuses, profils/tests par exercice ; blocages explicites, aucune exécution JS                      |
| UI élève et Admin                 | Renderer partagé, édition, saisie et accessibilité ; afficher seulement les capacités admises                                                                       | Applications et données M2, workflows de publication définis            | Rendu/interaction réels par type, conservation IDs, champs privés absents, validation serveur commune ; MathLive sans autorité                     |
| P2 du CDC                         | Scopes locaux, parties imbriquées, génération conditionnelle / réponses précédentes                                                                                 | Besoin produit documenté, contrat et politiques approuvés               | Modèle/version/provenance/rejeu et tests de chemins conditionnels ; aucune dépendance pédagogique implicite                                        |
| Extensions mathématiques motivées | Profils additionnels précis, sans CAS universel                                                                                                                     | Cas utilisateur/catalogue démontré, méthode de preuve CortexJS          | Domaines avant réduction, vrais positifs/négatifs, contre-exemples et états inconnus ; limites publiées et mise à jour CDC                         |

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
