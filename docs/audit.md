# Audit et réorganisation documentaire — 12 octobre 2026

## Périmètre et méthode

**37 fichiers Markdown initiaux examinés** : README, AGENTS, CHANGELOG,
18 documents dans `docs` et 16 ADR. Les états historiques ont été inventoriés,
leurs affirmations et références recherchées, et leurs informations uniques
conservées. L’audit a confronté la documentation aux exports, contrats,
validateurs, génération, instanciation, correction, modules mathématiques,
adaptateur/hôte, tests, fixtures de preuve, exemples, scripts npm et CI locale.
Cette revue documentaire ne constitue pas une nouvelle certification exhaustive
de toutes les mathématiques ou une exécution des bancs historiques.

Base Git : `0db2304`, arbre propre. Aucun Goal actif dans cette session à
l’ouverture ; la mission autonome précédente est livrée. Les processus Node
présents sur le poste ne permettent pas à eux seuls de conclure à un travail
concurrent ; leur contexte détaillé n’est pas accessible sous les permissions
actuelles. Aucun changement préexistant ou conflit observé dans ce dépôt.

Le fichier demandé sous le nom `CDC_reference.md` n’existe pas ici. La référence
réelle est [docs/CDC_référence.md](CDC_référence.md), déjà confirmée dans D35 et
suivie au commit initial. Elle reste **intacte, à son emplacement**, comme AGENTS,
le code, les tests/fixtures, dépendances/configurations et autres repositories.

## Diagnostic initial

- Le README dépassait 10 Ko, le journal 136 Ko et les décisions 32 Ko. La porte
  d’entrée exposait presque tous les détails de lots ; aucune indexation actuelle
  ne guidait la reprise.
- Vision, spécification, lifecycle, architecture, matrices et bilans répétaient
  les mêmes contrats/génération/projection. Les versions d’explication divergeaient.
- La vision annonçait la correction et les données avancées comme absentes ;
  la spécification et les tableaux secondaires reportaient encore M11/M12,
  les adaptations ou le consommateur tarball, malgré leurs preuves livrées.
- La roadmap empilait M0–M12 validés et anciens Lots 6–11 « à construire », avec
  chemins devenus faux (`src/grading`, `docs/support-matrix.md`) et contraintes
  d’enchaînement attachées à des missions antérieures.
- Les anciennes enveloppes v1–v4 et exemples de contrats étaient conservés dans
  plusieurs documents consultés comme actuels. Les ADR 004/006/007 avaient déjà
  un avertissement, mais pas un registre uniforme d’applicabilité.
- Le CDC était cité comme s’il était à la racine, et certaines références étaient
  en texte brut avec un chemin inexistant. Sa cible était parfois confondue avec
  une capacité de profil ou une décision d’adoption en production.
- Les guides actuels de reprise, de maintenance et un exemple complet vérifié
  des sept API manquaient. Seed obligatoire, états de correction et niveaux
  parsing/substitution/calcul/preuve n’étaient pas expliqués au même endroit.

## Inventaire et décisions exécutées

« Archivé » conserve le texte historique avec un repère de statut et des liens
relatifs ajustés. « Réécrit + archive » conserve un bilan ancien à titre de preuve,
avec une référence active de responsabilité différente, sans deux guides actuels.

| Fichier initial                            | Rôle / utilité unique              | Redondance et actualité initiale                             | Décision exécutée                                               |
| ------------------------------------------ | ---------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| README.md                                  | Entrée et exemple                  | Trop long, détails répétés, exemple sans parcours de lecture | Réécrit court ; renvoi vers usage                               |
| AGENTS.md                                  | Consignes de travail               | Opérationnel, non redondant                                  | Conservé intact                                                 |
| CHANGELOG.md                               | Version pilote                     | Synthèse utile, actuelle                                     | Conservé intact                                                 |
| docs/CDC_référence.md                      | Objectifs officiels                | Cible indépendante de l’état réel                            | Conservé intact                                                 |
| docs/architecture.md                       | Modules/contrats                   | Additions de lots dispersées                                 | Réécrit par pipeline/responsabilité                             |
| docs/feature-coverage.md                   | Exigences CDC et preuves           | Deux matrices, seconde périmée                               | 48 IDs/priorités/états conservés ; ancien contenu archivé       |
| docs/progress.md                           | Transmission et preuves            | États successifs contradictoires, journal massif             | Réécrit court + journal archivé                                 |
| docs/roadmap.md                            | Objectifs/critères                 | Lots livrés et futures consignes mélangés                    | Réécrit avec correspondance CDC + archive                       |
| docs/decisions.md                          | D01–D47 / autorisations            | Table ancienne et précisions successives                     | Registre actif + originaux archivés, D48 ajoutée                |
| docs/compatibility.md                      | Corpus/champs/défauts              | Audit pré-M10 mélangé à conversion réelle                    | Réécrit huit adaptations + inventaire archivé                   |
| docs/analysis.md                           | Sources et arbitrages initiaux     | Historique du POC et de la réception du corpus               | Archivé                                                         |
| docs/architecture-review.md                | Revues/risques                     | Audit initial + revue M12, états datés                       | Archivé ; conclusions actuelles dans features/progress          |
| docs/consolidation.md                      | Correspondance des anciens modules | Audit ponctuel devenu historique                             | Archivé ; ADR 008 maintenue                                     |
| docs/exercise-engine-vision.md             | Besoins/limites initiaux           | Plusieurs capacités annoncées absentes                       | Contenu actuel fusionné README/architecture ; original archivé  |
| docs/exercise-lifecycle.md                 | Parcours applicatifs proposés      | Répète le pipeline ; quelques « futur correcteur » périmés   | Fusionné architecture/usage, propositions conservées en archive |
| docs/functional-specification.md           | Inventaire/principes/budgets       | États pré-M2/M11/M12 et contrats restreints anciens          | Fusionné architecture/features ; observations archivées         |
| docs/test-strategy.md                      | Tests par lot                      | Futurs tests déjà livrés, bilans répétés                     | Fusionné development ; bilans archivés                          |
| docs/mathlive-compatibility.md             | Capture/version/commandes          | Preuve propre, utile et actuelle pour son profil             | Conservé                                                        |
| docs/demo.md                               | Banc M11 et reproduction           | Runbook spécialisé, pas le produit de production             | Conservé                                                        |
| docs/migration-guide.md                    | Coexistence/rollback               | Procédure distincte et actuelle                              | Conservé                                                        |
| docs/release.md                            | Artefacts/mesures/upgrade          | Hashes et preuves uniques de tarballs                        | Mesures/hashes conservés, qualification Windows actualisée      |
| docs/adr/001-core-boundary.md              | Portabilité ESM                    | Décision toujours applicable                                 | Active, corps historique préservé                               |
| docs/adr/002-mathematical-evidence.md      | Source/domaine/preuve              | Extensions datées                                            | Active                                                          |
| docs/adr/003-server-authority.md           | Autorité serveur                   | Comparaison de transports historiquement ouverte             | Active, précision de temporalité                                |
| docs/adr/004-first-contract.md             | Contrat v1 / transcription 103     | Enveloppe remplacée                                          | Superseded par 008                                              |
| docs/adr/005-math-input.md                 | Parsing raw/conventions            | Sections actuelles et pré-M1                                 | Active, temporalité explicite                                   |
| docs/adr/006-deterministic-generation.md   | RNG/tuples/computed initiaux       | Surcharges expérimentales remplacées                         | Superseded par 008 pour contrats                                |
| docs/adr/007-native-instantiation.md       | Substitution/snapshots initiaux    | Instances v1–v4 remplacées                                   | Superseded par 008 pour contrats                                |
| docs/adr/008-canonical-consolidation.md    | Schéma unique 5                    | Décision actuelle, maturité décrite à sa date                | Active, liens vers archives                                     |
| docs/adr/009-display-elements.md           | Données prescrites                 | Profil actuel, « six exports » de M2 daté                    | Active                                                          |
| docs/adr/010-numeric-grading.md            | Preuves numériques/discrètes       | Étape M3, extensions ultérieures                             | Active                                                          |
| docs/adr/011-algebra-collections.md        | Domaines/solutions/collections     | Profil actuel                                                | Active                                                          |
| docs/adr/012-pedagogical-forms.md          | Formes complètes sur ℚ             | Étendue par power-of-e M10                                   | Active                                                          |
| docs/adr/013-school-known-answers.md       | Parsing/fonctions/attendus connus  | Profil actuel, préemption alors future                       | Active                                                          |
| docs/adr/014-isolated-node-host.md         | Job Windows/watchdog               | Choix actuel, qualification Windows ancienne                 | Active ; preuves Windows historiques et actuelles distinguées   |
| docs/adr/015-private-python-transport.md   | CLI/Linux/mesures                  | Profil actuel, déroulé daté                                  | Active                                                          |
| docs/adr/016-reviewed-legacy-adaptation.md | Recettes/profil 106                | Profil actuel                                                | Active                                                          |

**Douze archives, sept anciens guides déplacés hors navigation active**, aucun
contenu historique supprimé définitivement. Six documents créés : index, features,
usage, development, audit et index des archives. Le README, architecture,
progress/roadmap/decisions/compatibility et la matrice sont réécrits. Les seize ADR
reçoivent un statut et des chemins de liens ajustés ; leurs décisions ne sont
pas réécrites rétrospectivement.

## Organisation finale

```text
README.md                   porte d’entrée
AGENTS.md                   consignes inchangées
CHANGELOG.md                version du package
docs/
  README.md                 guide de lecture
  CDC_référence.md          cahier des charges inchangé
  architecture.md           contrats, modules et pipeline
  features.md               capacités, profils et limites
  usage.md                  API et exemples vérifiés
  development.md            maintenance, scripts et CI
  roadmap.md                lots et prochaines missions
  progress.md               état et reprise
  decisions.md              registre des décisions et ADR
  feature-coverage.md       traçabilité des 48 exigences
  compatibility.md          huit adaptations historiques
  migration-guide.md        coexistence et rollback
  mathlive-compatibility.md  preuve de saisie
  demo.md                   banc local FastAPI/MathLive
  release.md                artefacts et adoption
  audit.md                  présente mission
  adr/                      16 décisions datées et statuts
  archive/                  index + 12 textes historiques
  exercises_rows.json       corpus original inchangé
  fixtures/                 preuves originales inchangées
```

## Vérifications de cette mission

| Contrôle réellement exécuté                          | Résultat                                                                                                                                                                                              |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm.cmd ci --cache .npm-cache --no-audit --no-fund` | PASS, 132 packages ; Node 24.19.0/npm 11.17.0                                                                                                                                                         |
| `npm.cmd run check`                                  | Build/typecheck/lint PASS ; échec au format Prettier, accès `EPERM` au cache Python lors du parcours de `.` ; Vitest non atteint par cette commande                                                   |
| `npx.cmd vitest run` séparément                      | **1533 tests / 29 fichiers PASS**, sans skip, **502,23 s**, incluant Windows natif                                                                                                                    |
| Prettier ciblé                                       | 45 Markdown concernés formatés/vérifiés, sans modifier CDC/AGENTS/CHANGELOG                                                                                                                           |
| Exemples                                             | README et usage compilés TypeScript strict/imports publics puis exécutés : génération seed 42, deux questions, projection, correction, rejeu et quatre cas d’erreur ; exemple hôte compilé uniquement |
| Liens locaux                                         | Cibles et ancres vérifiées sur les 48 Markdown ; aucun lien local cassé                                                                                                                               |
| Conservation                                         | 12 archives comparées aux originaux Git modulo repère/liens/format ; 48 lignes CDC conservant IDs/exigences/priorités/lots/états ; empreintes CDC/corpus inchangées                                   |
| `npm.cmd pack --dry-run`                             | PASS, 157 fichiers ; inspection de distribution sans publication                                                                                                                                      |
| Git                                                  | `git diff --check` PASS ; modifications Markdown exclusivement, sans code/contrats/tests/fixtures/dépendances/configurations                                                                          |

Les scripts de contrôle ad hoc et résultats se trouvent dans `.cache/docs-audit`
et `.cache/docs-audit-*.log`, hors Git/package. Les liens externes n’ont pas fait
l’objet d’une nouvelle vérification réseau. Le diagramme Mermaid représente les
appels et responsabilités inspectés ; aucun nouveau rendu navigateur revendiqué.
Le `check` global reste **non passant pour cause de parcours du cache** : le
format ciblé et Vitest séparé ne sont pas présentés comme sa réussite.
Aucune permission ou configuration modifiée pour masquer cette limitation.

Les preuves navigateur/Python/Linux et les installations externes M12 sont
examinées mais ne sont pas annoncées comme nouvelles exécutions. Les anciennes
empreintes de release demeurent historiques après changement du README.

## Problèmes de code et limites identifiés

Aucun nouveau défaut métier démontré pendant cette revue documentaire. La seed
est obligatoire dans les options réelles, contrairement à une ancienne phrase
de l’architecture ; la correction utilise cinq états et sept exports racine,
confirmés dans le code. Ces écarts sont corrigés dans la documentation seulement.

Une qualification a changé par rapport aux documents M9/M12 : **les tests natifs
Windows passent aujourd’hui**, après le refus OS historique. La raison de cette
évolution n’est pas établie ; aucune politique OS modifiée ici. Les références
actuelles et le guide release ont été actualisés, les preuves antérieures conservées.

Les limites opérationnelles déjà connues sont maintenues : quota Linux partagé,
fermeture sans SLO strict sous pression, garde de
versions sans authentification/validation complète de snapshot et démos sans
stockage/auth de production. Les défauts historiques 36/78/96/103/106 restent
tracés avec leurs arbitrages dans les rapports ; ils ne sont pas présentés comme
bugs nouveaux ni réparés silencieusement.

Pour la lecture quotidienne : README → architecture → features → usage.
Pour reprendre le travail : progress → roadmap → décisions/ADR → matrice CDC.
Les procédures d’intégration sont accessibles depuis [l’index](README.md).

## Versionnement explicitement demandé

Après livraison de l’audit sans commit, l’utilisateur demande un commit propre
et les commandes de test/chantiers restants. Le guide development est complété
avec les niveaux de vérification (Vitest, consommateur, FastAPI/navigateur et OS
Linux). Progress/décisions sont alignés sur cette nouvelle autorisation locale.
Le staging est limité aux Markdown documentaires ; aucun nouveau lot fonctionnel,
push, publication ou déploiement n’est inclus.
