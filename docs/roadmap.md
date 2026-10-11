# Roadmap exécutable

## Mission V1 autorisée — ordre actuel et critères de passage

Référence officielle : `../CDC_référence.md`, confirmée par l'utilisateur.
La mission autonome remplace les anciennes restrictions d'enchaînement ci-dessous
(D35). Les numéros M0–M12 désignent les lots du texte de mission ; les numéros
5C/6A/6B/7–11 désignent ceux du chapitre 13 du CDC. Chaque lot se termine par
tests appropriés, check complet, pack, revue du diff et commit local. Aucun push.

| Lot mission / CDC    | Travail nécessaire et critère d'acceptation                                                                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0 / fondations      | Vérifier la consolidation existante, état Git, six exports, tests ; matrice exhaustive P0/P1, documents alignés. Ne pas recréer V1–V4.                                                                |
| M1 / compléments 1–5 | Noms descriptifs et références explicites CortexJS sans modifier la multiplication implicite ; recettes composées obligatoires, contraintes/dépendances/exactitude/rejeu/projection testés.           |
| M2 / 5C              | Contrats, validation, références, substitution, données et tests des éléments prioritaires et avancés ; aucune interface React, aucun calcul analytique de graphe artificiel.                         |
| M3 / 6A              | Correction par question numérique/discrète : rationnels, racines/constantes sous preuve, approximation explicite, infinis, QCM, texte et soumission sûre ; cinq états distincts.                      |
| M4 / 6B              | Polynômes rationnels univariés, fractions rationnelles avec domaines, équations/solutions, ensembles/intervalles/unions sous profils exacts ; contre-exemples obligatoires.                           |
| M5 / 7               | Politiques de forme indépendantes de la valeur : irréductible, développée/réduite/factorisée sous profils, formes acceptées, exact/approché et tolérances.                                            |
| M6 / 6B              | Cas du lycée avec réponses connues ; log/exp/trig en parsing/substitution ; limite ln(x−a)/(x−a) à droite → −∞ et dérivées admises, sans solveur général.                                             |
| M7 / 10 partiel      | Vraies sorties MathLive : clavier, collage, français, placeholders/incomplet, ensembles/intervalles ; banc isolé indépendant du cœur.                                                                 |
| M8–M9 / 8            | Hôte Node terminable : quotas durée/mémoire/entrée/sortie/concurrence, crash/récupération, protocole JSON et exemple Python/FastAPI ; mesures p50/p95/mémoire/débit. Pas de service HTTP automatique. |
| M10 / 9              | Adaptateurs explicites des huit lignes, provenance/brut/aliases/propriétés conservés, rapports/tests individuels ; incohérences bloquées explicitement, pas de JS historique exécuté.                 |
| M11 / 10             | Scénarios complets isolés : historique → adaptation → génération → projection → saisie → correction officielle ; partiel/rejeu/falsification/erreur/timeout/confidentialité.                          |
| M12 / 11             | Tarball installé et consommé en Node/TypeScript et bundler cible, contrats/exports/snapshots, audit sécurité/math/architecture et chaque exigence CDC. V1 seulement si toutes P0/P1 validées.         |

M0 validé au commit `e072a57`, M1 au commit `8ef7de5` (592 tests).
M2 données d'éléments validé (666 tests), puis M3 correction numérique/discrète.
Les exigences
de correction, données d'éléments et transport restent obligatoires malgré les
profils bornés des lots anciens. Les décisions de licence/registre/adoption en
production ne bloquent pas la livraison locale d'un package privé consommable.
La matrice CDC et progress.md fournissent l'état réel et la procédure de reprise.

## Référence historique des lots précédents

état au 11 octobre 2026 après consolidation : package privé 0.1.0, schéma unique 5.
Un contrat, un chemin de génération et d'instanciation, aucune API expérimentale
maintenue. [D34](decisions.md#d34--consolidation-canonique-retenue-11-octobre-2026),
[ADR 008](adr/008-canonical-consolidation.md), [preuves](progress.md).

## Lots livrés et consolidation

| Lot                     | état réel / profil                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 0                       | POC externe observé, aucune certification par ses suites non réexécutées                                                    |
| 1                       | Socle TypeScript/ESM/package/tests/CI configurée                                                                            |
| 2                       | Corpus reçu/inventorié, transcription manuelle de question 103, contrats                                                    |
| 3                       | Parsing scalaire raw/source/symboles, sans calcul/preuve de domaine                                                         |
| 4                       | Integer/decimal/choice, PRNG déterministe et domaines/exclusions                                                            |
| 4 bis                   | Tuples 2–8, comparaisons exactes structurées, candidats atomiques/budgets                                                   |
| 5 et compléments livrés | Substitution/snapshot/projection, liste/sections/multiquestions/QCM, computed rationnels/dépendances/contraintes fermées    |
| Consolidation actuelle  | Capacités réunies sous schemaVersion 5, anciennes implémentations supprimées, vecteurs canoniques et documentation actuelle |

Les bilans des étapes précédentes sont historiques dans progress/ADR. Aucun lot
livré recommencé, aucun enchaînement automatique. éléments avancés du Lot 5
restent à qualifier par contrats/validation/substitution/données/tests ; aucun
renderer React. Noms longs/scopes locaux/familles numériques/symboliques étendues
demandent une instruction distincte et un profil motivé.

## Lot 6 — Correction exacte bornée

- Objectif : gradeAnswer pour rationnels et polynômes univariés rationnels bornés.
- Fichiers : src/grading, src/math/comparison, tests/grading, docs/support-matrix.md.
- Dépendances : Lots 2, 3, 5 pour la famille concernée ; politique de mêmes domaines par défaut et domaine imposé explicite confirmée, méthodes/bornes de preuve à fixer. Le contrat canonique et les instances multiquestions/QCM sont disponibles ; le correcteur et le transport des sélections restent à construire. Isolation du Lot 8 nécessaire avant adoption officielle, pas avant conception pure du correcteur.
- Tâches : admissibilité raw, bornes coefficient/degré, API polynomialCoefficients, preuves exactes, états distincts ; méthodes non prouvées hors parcours officiel.
- Tests obligatoires : vrais positifs/négatifs, fractions, coefficient muté, grands nombres hors borne, variable au dénominateur, sin, x/x et domaines inconnus → indeterminate ; oracle indépendant.
- Acceptation : aucune heuristique/undefined convertie en faute ; correction prétendue exacte uniquement dans familles documentées.
- Risques : canonicalisation masque domaine, coefficient numérique approximé, oracle circulaire.
- Livrables : premier correcteur exact et tableau de garanties.
- Passage : revue mathématique de familles/bornes et contre-exemples ; pas d'élargissement automatique aux fonctions partielles.

Complément discret ciblé après instance QCM : comparaison exacte de l'ensemble d'IDs sélectionnés, cardinal/mode, options inconnues/doublons, permutations d'ordre affiché et correspondance instance/question ; aucun score partiel implicite. Réutiliser le résultat par question et ses états sans moteur mathématique QCM séparé. Formats intervalle/ensemble/texte/complexe et tolérances nécessitent des compléments motivés, leurs contrats/profils/exemples et tests, pas un élargissement implicite du Lot 6.

## Lot 7 — Formes pédagogiques minimales

- Objectif : distinguer valeur correcte et forme demandée sur les familles nécessaires.
- Fichiers : src/grading/forms, tests/grading/forms, docs/form-policies.md.
- Dépendances : Lots 3, 6 ; règles de forme approuvées.
- Tâches : une politique à la fois, fraction irréductible puis développée/réduite si corpus requis ; définir factorisation triviale et ambiguïtés avant extension.
- Tests obligatoires : 2/4 vs 1/2, 2(x+1), x+x+2, parenthèses/unité/signe, forme non reconnue → indeterminate.
- Acceptation : valeur et forme indépendantes, raw utilisé, aucune prétention de reconnaissance générale.
- Risques : attentes pédagogiques divergentes et témoins perdus.
- Livrables : politiques versionnées et verdict forme.
- Passage : exemples acceptés/refusés validés pédagogiquement.

## Lot 8 — Isolation et interface FastAPI

- Objectif : établir une voie serveur avec garanties de ressources vérifiées et transport mesuré.
- Fichiers : adapters/node ou package subpath dédié, tests/integration/python, scripts/bench, ADR transport.
- Dépendances : Lot 3 pour expérience de charge ; Lot 6 pour intégration du correcteur. Peut commencer avant Lot 7.
- Tâches : CLI stdin/stdout versionné, processus terminable, quotas entrée/sortie/concurrence/mémoire OS ; benchmark cold/warm ; prototype pool ; comparer service selon contraintes réelles.
- Tests obligatoires : calcul lent réellement tué, deadline, crash et travail suivant sain, scopes séparés, saturation/file bornée, protocole corrompu, aucune injection shell.
- Acceptation : nettoyage et récupération prouvés ; mesures p50/p95/mémoire/débit ; ADR justifie transport/SLO. Prototype Python dans ce dépôt seulement.
- Risques : OOM global, zombies, annulation incomplète, contraintes deployment inconnues.
- Livrables : transport retenu ou recommandation mesurée, preuves isolation et exemple FastAPI autonome.
- Passage : aucune correction officielle connectée avant garanties d'isolation et provenance serveur.

## Lot 9 — Adaptateurs et migration des huit documents

- Objectif : importer progressivement les vrais historiques sans pertes silencieuses.
- Fichiers : src/adapters/legacy, tests/fixtures/legacy, docs/compatibility.md et migration-guide.md.
- Dépendances : Lot 2, contrat de composition/IDs et Lots 5–7 pour comportements effectivement couverts, dont compléments d'éléments s'ils sont nécessaires au document choisi. Tests d'enveloppe peuvent être préparés plus tôt. La migration complète des huit lignes reste un objectif du Lot 9 avec rapports et blocages explicites ; le pilote peut sélectionner des exercices admis sans annoncer les huit migrés.
- Tâches : decode explicite Creator/DB/élève, aliases avec provenance, conserver extensions/brut ; convertir computed autorisés ; revue manuelle JS ; identifier tableaux/figures non convertibles ; version et rollback par définition.
- Tests obligatoires : chaque JSON, conservation champs, collisions, variations/signes divergents, computed malveillant non exécuté, différences intentionnelles contre legacy.
- Acceptation : huit rapports individuels, couverture et pertes explicites, aucun remplacement aveugle camelCase/snake_case.
- Risques : ancien moteur contient bugs ; ne pas en faire oracle ; historiques sans seed non rejouables.
- Livrables : adaptateurs bornés et plan de coexistence/rollback.
- Passage : revue humaine des incompatibilités et sauvegarde des versions originales.

## Lot 10 — Démonstration bout en bout

- Objectif : preuve verticale d'un vrai exercice, en environnement isolé.
- Fichiers : examples/e2e, tests/e2e, docs/demo.md ; aucun autre dépôt modifié dans cette mission.
- Dépendances : Lots 5, 6, 8, 9 ; Lot 7 si forme exigée.
- Tâches : JSON historique autorisé → adaptation → génération → projection → champ MathLive réel → soumission FastAPI → correction officielle et rejeu.
- Tests obligatoires : clavier/collage fr, placeholder, soumission HTTP falsifiée, policy/seed/verdict client ignorés, secrets absents, timeout visible, réponses correctes/fausses/indéterminées. Selon profil : plusieurs questions, tentative partielle/reprise, non répondu distinct d'incorrect, QCM par IDs et instance de duel périmée ; projection et correction serveur communes. Au moins un vrai exercice autorisé entièrement couvert, sans annoncer sa migration par un affichage natif manuel.
- Acceptation : parcours complet reproductible et résultats distincts ; aucune confiance accordée au navigateur.
- Risques : interopérabilité réelle et version MathLive, rendu non sécurisé côté app.
- Livrables : démonstration, captures/logs sans secrets et guide d'intégration.
- Passage : revue complète avant branchement d'une application de production.

## Lot 11 — Release pilote et adoption progressive

- Objectif : artefact consommable et activation contrôlée.
- Fichiers : scripts/package-smoke, CI release explicite, changelog, docs/release.md.
- Dépendances : Lot 10, choix licence/registre/consommateurs.
- Tâches : archive installée dans consommateur TypeScript et bundler navigateur, SHA actions vérifiés, compatibilité de versions, activation par définition, rollback et télémétrie indétermination sans réponse sensible.
- Tests obligatoires : tarball/types/import Node, bundle sans builtin Node, matrice runtime, rejeu version précédente et rollback.
- Acceptation : capacités/support publiés, aucune publication automatique sans instruction dédiée ; pilote accepté.
- Risques : divergence clients/serveur, dépendance interne révélée, dérive math après upgrade.
- Livrables : version pilote et guide upgrade.
- Passage : mesurer pilote puis proposer séparément extensions (fonctions partielles, figures, multivarié), sans promesse anticipée.

## Dépendances et passage

Consolidation → tranche suivante explicitement demandée : complément d'élément
ou correction bornée du Lot 6, puis politiques du 7 ; isolation/transport 8 avant
correction serveur officielle ; adaptation 9, démonstration 10, pilote 11.
La compatibilité JSON historique est hors du chemin canonique. Chaque exercice
converti exige capacités admises et rapport propre, aucune suppression de bloc.

Une seule tranche développée et validée à la fois, puis enchaînement autorisé par
D35. Domaines/source avant réduction, preuve
exacte avant verdict, définition/instance officielles avant correction, tests
de terminaison avant adoption, intégration avant production. Travail UI/Admin
séparé ; ni migration de production, service injustifié, Supabase ou publication.
Les adaptations locales et commits de lots validés sont autorisés par la mission.
