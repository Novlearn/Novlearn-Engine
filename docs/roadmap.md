# Roadmap exécutable

État au 11 octobre 2026 après complément Lot 5 : computed rationnels exacts, dépendances/cycles et comparaisons avec expressions livrés dans la résolution commune variables-v3 et les instances v4 (D33). Les objectifs historiques ci-dessous sont conservés ; 4 bis et ce complément sont terminés dans leurs profils bornés. Les compléments d'éléments avancés et Lots 6–11 restent non engagés. Noms multi-caractères, autres nombres/profils et isolation préemptive restent différés. Aucune migration, UI ou production commencée.

Un lot = une modification revue et un bilan de preuves. Aucun enchaînement automatique. Les noms de modules sont proposés ; ils ne figent pas les schémas.

Révision documentaire du 10 octobre 2026 : quatre mécanismes cibles (aléatoire, choix, tuple, calculé), détaillés dans [ADR 006](adr/006-deterministic-generation.md). La [matrice de couverture](compatibility.md#matrice-de-couverture-fonctionnelle--génération) sépare livré, testé et manquant. Lots 1 à 4 conservés comme terminés dans leur périmètre livré ; complément 4 bis proposé, non implémenté, avant le Lot 5 étendu.

Cadrage global du même jour : [vision](exercise-engine-vision.md), [spécification](functional-specification.md), [parcours](exercise-lifecycle.md), [contrats](architecture.md), [couverture globale](feature-coverage.md) et [audit](architecture-review.md). Choix confirmés par l'utilisateur : liste plate avec sections, texte/expression/question/QCM simple et multiple d'abord, mêmes domaines par défaut avec domaine imposé explicite par question. Cette révision ne lance aucun lot et ne modifie pas les contrats v1.

## Lot 0 — Évidence POC existante (externe)

Objectif : caractériser CortexJS/MathLive. Livrables disponibles dans le dépôt POC : 162 tests et 23 scénarios Edge documentés. Réserves domaine/placeholder/ressources intactes. Dépendances : versions POC. Risque : rapports contradictoires et confusion test/preuve. Passage : requalifier les sondes nécessaires dans chaque lot production. Aucune copie aveugle du POC, aucune modification de ce dépôt voisin.

## Lot 1 — Fondations (cette mission)

- Objectif : dépôt professionnel et architecture reviewable, sans logique métier.
- Fichiers : package/configurations, src/index.ts, tests/package.test.ts, CI, AGENTS, README, docs et ADR.
- Dépendances : cadrage, trois analyses lecture seule, outils compatibles.
- Tâches : init Git, ESM/déclarations, strict, Vitest, lint/format, lockfile, confrontation et roadmap.
- Tests obligatoires : typecheck, lint, format, build, import public, chemins privés, pack et import Node.
- Acceptation : vérifications locales vertes, état exact documenté, aucun contrat fictif exporté.
- Risques : corpus absent, TS7/lint incompatible, CI distante non exécutée.
- Livrables : socle et documentation ; résultat réel dans progress.md.
- Passage : revue du socle ; ne pas implémenter Lot 2 automatiquement.

## Lot 2 — Corpus et contrats de première famille

**Terminé le 10 octobre 2026 après réception du corpus** : huit lignes conservées et classées, inventaire des 558 chemins, transcription native manuelle de la question 103, contrats v1 et validateurs structurels de définition/soumission. Revue indépendante et preuves locales (40 tests) dans [progress.md](progress.md). Aucune migration de comportement ni caractérisation du Lot 3 engagée dans ce lot.

- Objectif : ancrer les contrats dans huit JSON réels et choisir une question minimale.
- Fichiers : tests/fixtures/legacy, docs/compatibility.md, src/contracts, ADR de contrat.
- Dépendances : Lot 1 ; fourniture autorisée des huit JSON avec provenance et politiques pédagogiques.
- Tâches : préserver octets/révision, inventaire champ par champ, distinguer enveloppes, sélectionner famille, définir définition/instance privée/projection/soumission et versions ; validation runtime.
- Tests obligatoires : malformé, version inconnue, collisions, aliases, extensions, diagnostics avec chemins et aller-retour sans perte.
- Acceptation : chaque JSON classé ; chaque champ conservé, converti ou signalé ; aucun catalogue supposé.
- Risques : contenu absent, computed JS non migrable, figures non interprétables.
- Livrables : matrice huit documents, fixtures autorisées, contrat minimal et validateDefinition.
- Passage : contrat revu sur vrai corpus. Sans corpus, seule préparation/inventaire des besoins possible, pas validation de migration.

## Complément de contrats — Composition et questions (proposé, rattaché aux Lots 2/5)

Ne rouvre pas la première famille v1 livrée ; prépare un schéma étendu distinct. C'est une dépendance explicite avant l'instance multiquestion, coordonnée au schéma de valeurs/groupes du 4 bis. La revue peut être distincte de l'implémentation du contrat ; aucun validateur étendu n'est livré par ce document.

- Objectif : liste ordonnée plate/sections, union discriminée texte/expression/question/QCM, identité de question égale à l'ID de son élément, format/attendu/politique privés et DTO public par sélection ; metadata utile issue des besoins historiques, sans modèle applicatif de brouillon dans le cœur.
- Dépendances : inventaire Lot 2, profils Lot 3, tirages Lot 4 et décision D23 pour groupes/valeurs ; maintenir définition/soumission natives et golden vectors.
- Tests de passage futurs : IDs uniques/stables, réordonnancement sans perte d'association, options avec IDs et cardinal/mode, référence attendue inconnue, formats/politiques incompatibles, version/branche non supportée, source/données conservées et projection sans secrets. Aucun simple type TypeScript annoncé comme support.
- Limites : variables communes seulement ; portées locales, récursion de parties, workflow pédagogique et suivi de réponse précédente différés. Exemples `exercise-draft` documentaires uniquement.
- Livrables : schéma revu, validateurs et conventions de migration d'IDs/version avant pipeline étendu, sur instruction de développement distincte. Un seul modèle de question, aucun service/factory supplémentaire.

## Lot 3 — Frontière mathématique et saisie

**Terminé le 10 octobre 2026** : `parseMathInput`, profil scalaire LaTeX v1, source intégrale, MathJSON raw, contexte explicite de symboles, diagnostics et budgets. Matrice de support/limites dans ADR 005 ; preuves locales dans progress.md. Aucun domaine, calcul, correcteur ou migration implémenté.

- Objectif : parser et conserver l'information nécessaire avant réduction.
- Fichiers : src/math, tests/math/input, ADR profils et familles.
- Dépendances : Lot 1 ; déclarations de symboles/politiques du Lot 2 pour API finale.
- Tâches : Cortex encapsulé, source/raw/diagnostics, profil décimal natif, allowlist, bornes, rejeu de contexte, politique serveur placeholders. Dérivées à la demande.
- Tests obligatoires : vide/Error/placeholder, virgules trois formes, symboles libres/paramètres, x/x raw, NaN/infini/complexe, scopes isolés.
- Acceptation : aucune réduction avant admissibilité ; limitations explicitement reconnues ; aucune normalisation regex mathématique.
- Risques : perte de commandes même raw, ambiguïté locale, source incomplète.
- Livrables : frontière parsing/subset et matrice de support, sans correcteur général.
- Passage : profil/rejet et conservation démontrés sur fixtures.

## Lot 4 — Paramètres et RNG déterministe

**Terminé le 10 octobre 2026** : API `generateVariables`, entiers du contrat natif, décimaux sur grille et choix numériques finis, Mulberry32/version `parameters-v1`, seed uint32 canonique, vecteurs figés et échecs bornés. Aucun tuple ou computed livré ; justifications et contrats additifs dans ADR 006, preuves locales dans progress.md.

- Objectif : générer des valeurs avec contraintes et rejeu exact.
- Fichiers : src/generation, tests/generation, ADR RNG et seed.
- Dépendances : Lot 2 ; parallèle possible avec Lot 3 pour paramètres sans expression.
- Tâches livrées : RNG/encodage seed, golden vectors, ordre de tirage ; integer/choice/decimal ; bornes/exclusions et rejet RNG limité, grille entière décimale. Tuples non livrés, désormais attribués au complément 4 bis.
- Tests de passage du périmètre livré : seeds golden, résultat de paramètres sérialisé identique, exclusions impossibles, plages vides et smoke de distribution ; aucun Math.random. Le rejeu d'instance relève du Lot 5 ; tests de tuples absents, prévus au 4 bis.
- Acceptation : résultat reproductible sous révision/version identiques ; aucun fallback hors contraintes.
- Risques : floats, biais de mapping, ordre modifié sans version, fuite seed.
- Livrables : génération paramètres couverts et erreurs structurées.
- Passage : vecteurs stables, contraintes vérifiées ; computed différé au lot suivant.

## Complément Lot 4 bis — Tuples et comparaisons bornées

**Terminé le 11 octobre 2026**, pour le profil borné demandé : tuple générique à deux modes, exclusions scalaires/composantes/choix, six comparaisons structurées, génération globale atomique et diagnostics distincts. [D32](decisions.md#d32--lot-4-bis--tuples-comparaisons-et-génération-v2-retenue), [ADR 006](adr/006-deterministic-generation.md), [preuves](progress.md).

- Contrats : GenerationDefinitionV2, variables-v2 explicite, noms d'une lettre hors e/i, groupes comme liaisons vers valeurs plates ; ExerciseDefinitionV3/instances v3 pour l'intégration minimale. V1/v2 et golden vectors préservés.
- Réutilisation : même Mulberry32 et tirage scalaire, grille exacte ; CortexJS pour comparaisons numériques fermées, aucun nouveau parseur/solveur.
- Limites : arité 2…8, 16 valeurs nommées, 128 lignes/choix/exclusions, 32 contraintes, 1…128 tentatives et 1…65 536 mots RNG ; budgets obligatoires et JSON historique. Toute tentative retire le contexte complet ; jamais réparation ou fallback.
- Preuves : arités 2/3/4/8, oracle pythagoricien 256 seeds, six opérateurs 96 seeds chacun, scalaires/groupes 128 seeds, exclusions/budgets/rejeu et versions, inconnue/erreur injectées, instances v1/v2 conservées et v3 exploitant les composantes.
- Réserves : pas d'uniformité générale, de deadline préemptive, de tuples imbriqués ou noms étendus ; contraintes par expressions et computed différés. Les recettes par calcul ne sont pas livrées.
- Suite recommandée : complément Lot 5 pour calculated/dépendances dans le système commun de résolution des variables, avant contraintes et instanciation ; profils exacts/domaines et cycles à décider. Puis autres capacités moteur selon D31, aucune UI. Aucun complément suivant commencé.

## Lot 5 — Substitution et instance affichable

**Complément computed terminé le 11 octobre 2026** : GenerationDefinitionV3/variables-v3, calculs rationnels exacts du profil existant, tri topologique stable avant RNG, références/cycles/collisions diagnostiqués, contraintes avec opérandes LaTeX et restrictions de résultat, essais globaux atomiques/bornés et intégration ExerciseDefinitionV4/composed-instance-v4. Tests discriminant, trinôme à racines entières, tuple pythagoricien, multiquestions/projection/rejeu et erreurs/indéterminations dans generation-v3 et generation-v3-limit. D33/ADR 006/007 décrivent représentation/profil/limites. Les bilans datés du 10 octobre ci-dessous restent historiques. Le Lot 5 complet n'inclut pas encore les éléments avancés, noms étendus ou profils symboliques ; aucun lot suivant engagé.

**Lot 5 bis livré le 10 octobre 2026** : composition scalaire v2, liste plate/sections, questions multiples avec attendus par ID, QCM simple/multiple, decimal/choice intégrés, projection par branche et tests ; v1/RNG conservés. [D30](decisions.md#d30--lot-5-bis--composition-scalaire-v2-retenue) et [ADR 007](adr/007-native-instantiation.md#lot-5-bis--composition-v2). Les tâches multiéléments/questions/QCM ci-dessous sont réalisées dans ce profil borné ; tuples/computed/graphe/conditions mathématiques restent absents et le snapshot avec groupes reste ouvert. Verdict **validé avec réserves**, cible complète non clôturée ; aucun 4 bis ni Lot 6 engagé.

**Tranche native livrée le 10 octobre 2026 sur demande explicite** : `instantiateExercise`, substitution CortexJS contrôlée, attendu rationnel exact du trinôme 103, snapshot entier privé et `projectPublicInstance`, tests de rejeu et projection. [ADR 007](adr/007-native-instantiation.md) et [progress.md](progress.md) précisent les preuves et limites. La demande interdit de reconstruire tuples/computed/contraintes absents : ces objectifs étendus ci-dessous restent différés, aucun 4 bis lancé. Le contrat entier natif reste admis sans figer le snapshot étendu. Ce statut ne clôture pas la cible complète du Lot 5 décrite ci-dessous.

- Objectif : calculer dépendances paramétriques et produire une projection publique.
- Fichiers : src/generation/dependencies, src/math/substitution, src/contracts/projection, tests/instances.
- Dépendances : Lots 2, 3, 4, complément de contrat de composition/questions et complément 4 bis pour la cible avec tuples/contraintes. Aucun blocage démontré de l'ancien scénario scalaire 103 ; la recommandation est de stabiliser le contrat étendu avant son snapshot.
- Tâches : contrat computed et valeurs exactes sérialisables, dépendances simples/multiples/en chaîne, cycles/références inconnues, noms réservés et références aux composantes. Admissibilité/domaine avant réduction, substitution/évaluation CortexJS dans un contexte isolé ; conditions mathématiques déclaratives sur valeurs générées/calculées avec essais globaux bornés. Gabarits de contenu distincts du LaTeX, instance privée/version et projection par sélection ; IDs QCM stables.
- Contrats : décider explicitement l'intégration decimal/choice/tuple/computed dans la définition et l'évolution du snapshot natif numérique entier, sans prétendre que `ExerciseDefinitionV1` ou `PrivateInstanceV1` actuels les portent déjà. Garder distinction valeur exacte, approximation éventuelle, indétermination et erreur. Pas de type `function`.
- Tests obligatoires : a=-2 dans a², fractions exactes, variables libres inchangées, ordre topologique stable, chaînes/entrées multiples et composantes de tuple, cycles/références absentes avant tirage, division par zéro/complexe/non-fini/symbolique, contraintes impossibles ou indéterminées, épuisement d'essais, secrets/seed/flags absents de projection. Plusieurs questions avec tous les attendus ; IDs et ordre conservés, réordonnancement sans perte d'association, source intacte ; échec d'une question sans instance partielle. QCM simple/multiple : IDs d'options, collisions après substitution, attendu privé et sélection publique du mode/options sans flags corrects.
- Recettes de validation après les fondations : n² ; trinôme construit par a≠0/r/s avec discriminant carré positif ou nul ; carré de binôme avec condition de degré ; triplet pythagoricien par formules. Tests de propriétés mathématiques bornées, pas de générateur spécialisé. Le choix d'un triplet connu peut être vérifié dès 4 bis.
- Besoins Admin : validation étendue avec chemins, dépendances consultables, prévisualisation privée, nouvelle seed/rejeu sous révision immuable et séries bornées de seeds avec diagnostics. Signatures à fixer selon besoin, sans concevoir l'interface ou ajouter un service.
- Acceptation : même définition/seed/version → même affichage ; toute erreur déclarée ; aucun JS legacy exécuté.
- Risques : gabarits ambigus, réponses recomposables, contenu figure non couvert.
- Livrables : extension explicite de `instantiateExercise` et `projectPublicInstance` pour le schéma/familles admis ; pas d'API generateInstance/prepareDisplay en doublon.
- Passage : démonstration locale définition → instance privée → projection/rejeu, sans correction officielle.

Peuvent attendre un complément ultérieur explicitement demandé : choix de valeurs mathématiques autres que les scalaires numériques couverts, extension des noms multi-caractères, tuples imbriqués/indexation et profils de prédicats plus riches. Le format exact nécessaire aux computed rationnels et les liaisons de tuple ne peuvent pas être différés après le snapshot. Opérations vectorielles, solveur général, générateurs spécialisés et JavaScript arbitraire sont hors périmètre. Les schémas d'exemples et budgets restent ouverts jusqu'à leur revue ; cette mission ne les implémente pas.

### Compléments d'éléments après le premier périmètre (non engagés)

Texte/expression/question/QCM constitue le premier périmètre étendu retenu. Fonctions graphiques, suite/graphe discret, tableaux signes/variations/statistiques, arbre de probabilités, vecteurs et plan complexe sont attribués à des compléments ciblés du Lot 5 pour contrats/validation/substitution/préparation de données ; leurs formes et calculs exacts doivent avoir un profil borné avant annonce de support. Relations/systèmes affichés demandent également un contrat, sans solveur général. Les [fiches](functional-specification.md#2-éléments--contrat-commun-et-inventaire) et la [couverture](feature-coverage.md) indiquent responsables/risques/tests.

Le Lot 9 n'invente pas ces capacités : il adapte uniquement les branches déjà livrées, avec diagnostic explicite pour le reste. Renderers partagés et éditeurs Admin sont un chantier applicatif séparé, sans nouveau lot moteur par composant. Un pilote borné au premier périmètre est possible ; refuser tout exercice dépendant d'un bloc/famille non livré, sans supprimer silencieusement son graphe. Ordre des compléments selon corpus et besoin consommateur, sur instruction distincte.

## Lot 6 — Correction exacte bornée

- Objectif : gradeAnswer pour rationnels et polynômes univariés rationnels bornés.
- Fichiers : src/grading, src/math/comparison, tests/grading, docs/support-matrix.md.
- Dépendances : Lots 2, 3, 5 pour la famille concernée ; politique de mêmes domaines par défaut et domaine imposé explicite confirmée, méthodes/bornes de preuve à fixer. La tranche native suffit à un premier scénario rationnel ; toute annonce de support multiquestion/QCM requiert le contrat et l'instance étendus. Isolation du Lot 8 nécessaire avant adoption officielle, pas avant conception pure du correcteur.
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

## Dépendances et parallélisation

Chemin principal cible : 1 → 2 → (3 et 4) → revue du contrat étendu de composition/valeurs/groupes → 4 bis (proposé) → 5 étendu → 6 → (7 et 8) → 9 → 10 → 11. Le contrat de liste/questions est indispensable à l'instance étendue, mais ne conditionne pas les anciens tirages ou la tranche native 103. La caractérisation mathématique du Lot 3 peut avancer parallèlement à la collecte du corpus, mais ne fige pas l'API du Lot 2. Le travail sur enveloppes du Lot 9 peut démarrer après 2 ; ses conversions dépendent des capacités réellement livrées, y compris tuples/contraintes/computed des 4 bis/5 et compléments d'éléments si requis. La preuve d'isolation du Lot 8 peut être préparée dès 3, puis branchée après 6. Chantier UI/Admin et adoption NovLearn/Colyseus séparés des lots cœur ; démonstration isolée avant toute production.

Séquentiel : décisions de contrats avant génération ; admissibilité raw avant correction ; correction avant formes ; isolation avant correction serveur officielle ; démonstration avant pilote. En travail multi-agents, donner des fichiers distincts à chaque auteur et faire intégrer/revoir par le principal.

Démos : Lot 5 affichage/rejeu sans verdict ; Lot 8 Python ↔ Node avec interruption réelle ; Lot 10 parcours étudiant complet.

**Suite à décider sur instruction distincte** : compléments de données d'éléments du Lot 5 selon le corpus, ou Lot 6 rationnel/discret borné avec méthodes et familles explicites. Tuples/comparaisons et computed/dépendances/contraintes rationnelles sont livrés ; les anciennes versions restent disponibles. Isolation officielle, migration et adoption aux lots prévus ; interfaces React différées selon D31. Aucun enchaînement automatique.
