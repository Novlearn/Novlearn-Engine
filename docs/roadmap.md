# Roadmap exécutable

Un lot = une modification revue et un bilan de preuves. Aucun enchaînement automatique. Les noms de modules sont proposés ; ils ne figent pas les schémas.

Révision documentaire du 10 octobre 2026 : quatre mécanismes cibles (aléatoire, choix, tuple, calculé), détaillés dans [ADR 006](adr/006-deterministic-generation.md). La [matrice de couverture](compatibility.md#matrice-de-couverture-fonctionnelle--génération) sépare livré, testé et manquant. Lots 1 à 4 conservés comme terminés dans leur périmètre livré ; complément 4 bis proposé, non implémenté, avant le Lot 5 étendu.

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

## Complément Lot 4 bis — Tuples et comparaisons bornées (proposé)

Complément ciblé nécessaire pour la cible complète avant de figer le snapshot du Lot 5 ; les tirages scalaires existants ne nécessitent pas de réimplémentation. Il ne rouvre pas le Lot 4 livré et ne commence pas le Lot 5. Son besoin découle des deux modes de tuple et des contraintes intervariables, absents des contrats actuels. Aucune capacité nouvelle n'est disponible du seul fait de cette roadmap.

- Objectif : un seul tuple ordonné, par choix complet ou tirages de composantes validés ensemble ; comparaisons simples entre valeurs scalaires, sans solveur.
- Fichiers envisagés : contrats/génération et tests associés ; pas de module par famille mathématique.
- Dépendances : Lots 2, 3, 4 ; arbitrage documentaire du schéma de groupe, arité, liaisons de composantes, budget d'essais et version de génération avant code.
- Tâches : réutiliser RNG/domaines, valider arités et collisions, tirer atomiquement le groupe, partager contraintes/diagnostics avec les scalaires. Profil initial de comparaisons exactes a≠b/a<b sur entiers et décimaux sur grille admis, via la frontière CortexJS ; identifier les références sans les confondre avec un graphe computed. Définir un ordre et un budget de tentatives reproductibles. Les conditions contenant des formules ou computed restent au Lot 5.
- Versionnement : nouveau contrat/version pour groupes et tentatives ; préserver `parameters-v1` et ses golden vectors. Le schéma JSON de l'ADR est une proposition, pas une version déjà supportée.
- Tests futurs obligatoires : tuple choisi intégralement, arités 2/3 et arité maximale fixée, composantes typées/nommées, a<b, plages/exclusions, collisions, définition incorrecte, domaine local prouvé vide, candidat rejeté, indétermination de comparaison et budget épuisé sans fallback/valeurs partielles ; rejeu JSON et ordre des tirages.
- Acceptation : les deux modes produisent le même tuple canonique, comparaisons couvertes réellement vérifiées, diagnostics distincts, RNG v1 inchangé. Revue du contrat de groupe utilisable par computed et le futur snapshot, sans implémenter ces derniers.
- Risques : duplication de valeurs de groupe/composantes, confusion tuple/vecteur, événement rare, biais supposé uniforme, limites synchrones non préemptives.
- Livrables : tuple générique, comparaisons simples et tests ; mise à jour de la couverture sur preuves réelles.
- Passage : contrat/génération de groupe revus avant Lot 5 ; pas de calcul dépendant, instance ou UI dans ce complément.

## Lot 5 — Substitution et instance affichable

- Objectif : calculer dépendances paramétriques et produire une projection publique.
- Fichiers : src/generation/dependencies, src/math/substitution, src/contracts/projection, tests/instances.
- Dépendances : Lots 2, 3, 4 et complément 4 bis pour la cible avec tuples/contraintes. Aucun blocage démontré de l'ancien scénario scalaire 103 ; la recommandation est de stabiliser le contrat étendu avant son snapshot.
- Tâches : contrat computed et valeurs exactes sérialisables, dépendances simples/multiples/en chaîne, cycles/références inconnues, noms réservés et références aux composantes. Admissibilité/domaine avant réduction, substitution/évaluation CortexJS dans un contexte isolé ; conditions mathématiques déclaratives sur valeurs générées/calculées avec essais globaux bornés. Gabarits de contenu distincts du LaTeX, instance privée/version et projection par sélection ; IDs QCM stables.
- Contrats : décider explicitement l'intégration decimal/choice/tuple/computed dans la définition et l'évolution du snapshot numérique préparatoire, sans prétendre que `ExerciseDefinitionV1` ou `PrivateInstanceV1` actuels les portent déjà. Garder distinction valeur exacte, approximation éventuelle, indétermination et erreur. Pas de type `function`.
- Tests obligatoires : a=-2 dans a², fractions exactes, variables libres inchangées, ordre topologique stable, chaînes/entrées multiples et composantes de tuple, cycles/références absentes avant tirage, division par zéro/complexe/non-fini/symbolique, contraintes impossibles ou indéterminées, épuisement d'essais, secrets/seed/flags absents de projection.
- Recettes de validation après les fondations : n² ; trinôme construit par a≠0/r/s avec discriminant carré positif ou nul ; carré de binôme avec condition de degré ; triplet pythagoricien par formules. Tests de propriétés mathématiques bornées, pas de générateur spécialisé. Le choix d'un triplet connu peut être vérifié dès 4 bis.
- Besoins Admin : validation étendue avec chemins, dépendances consultables, prévisualisation privée, nouvelle seed/rejeu sous révision immuable et séries bornées de seeds avec diagnostics. Signatures à fixer selon besoin, sans concevoir l'interface ou ajouter un service.
- Acceptation : même définition/seed/version → même affichage ; toute erreur déclarée ; aucun JS legacy exécuté.
- Risques : gabarits ambigus, réponses recomposables, contenu figure non couvert.
- Livrables : generateInstance et prepareDisplay pour famille choisie.
- Passage : démonstration locale définition → instance privée → projection/rejeu, sans correction officielle.

Peuvent attendre un complément ultérieur explicitement demandé : choix de valeurs mathématiques autres que les scalaires numériques couverts, extension des noms multi-caractères, tuples imbriqués/indexation et profils de prédicats plus riches. Le format exact nécessaire aux computed rationnels et les liaisons de tuple ne peuvent pas être différés après le snapshot. Opérations vectorielles, solveur général, générateurs spécialisés et JavaScript arbitraire sont hors périmètre. Les schémas d'exemples et budgets restent ouverts jusqu'à leur revue ; cette mission ne les implémente pas.

## Lot 6 — Correction exacte bornée

- Objectif : gradeAnswer pour rationnels et polynômes univariés rationnels bornés.
- Fichiers : src/grading, src/math/comparison, tests/grading, docs/support-matrix.md.
- Dépendances : Lots 2, 3, 5 ; politique domaine acceptée.
- Tâches : admissibilité raw, bornes coefficient/degré, API polynomialCoefficients, preuves exactes, états distincts ; méthodes non prouvées hors parcours officiel.
- Tests obligatoires : vrais positifs/négatifs, fractions, coefficient muté, grands nombres hors borne, variable au dénominateur, sin, x/x et domaines inconnus → indeterminate ; oracle indépendant.
- Acceptation : aucune heuristique/undefined convertie en faute ; correction prétendue exacte uniquement dans familles documentées.
- Risques : canonicalisation masque domaine, coefficient numérique approximé, oracle circulaire.
- Livrables : premier correcteur exact et tableau de garanties.
- Passage : revue mathématique de familles/bornes et contre-exemples ; pas d'élargissement automatique aux fonctions partielles.

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
- Dépendances : Lot 2 ; Lots 5–7 pour comportements couverts. Tests d'enveloppe peuvent être préparés plus tôt.
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
- Tests obligatoires : clavier/collage fr, placeholder, soumission HTTP falsifiée, policy/seed/verdict client ignorés, secrets absents, timeout visible, réponses correctes/fausses/indéterminées.
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

Chemin principal cible : 1 → 2 → (3 et 4) → 4 bis (proposé) → 5 → 6 → (7 et 8) → 9 → 10 → 11. La caractérisation mathématique du Lot 3 peut avancer parallèlement à la collecte du corpus, mais ne fige pas l'API du Lot 2. Le travail sur enveloppes du Lot 9 peut démarrer après 2 ; ses conversions dépendent des capacités réellement livrées, y compris tuples/contraintes/computed des 4 bis/5 si requis. La preuve d'isolation du Lot 8 peut être préparée dès 3, puis branchée après 6.

Séquentiel : décisions de contrats avant génération ; admissibilité raw avant correction ; correction avant formes ; isolation avant correction serveur officielle ; démonstration avant pilote. En travail multi-agents, donner des fichiers distincts à chaque auteur et faire intégrer/revoir par le principal.

Démos : Lot 5 affichage/rejeu sans verdict ; Lot 8 Python ↔ Node avec interruption réelle ; Lot 10 parcours étudiant complet.

**Prochaine étape recommandée : arbitrer puis développer séparément le complément 4 bis, sur nouvelle instruction.** Les tirages natifs du Lot 4 restent disponibles. Stabiliser tuple, comparaisons et versionnement avant le Lot 5 étendu ; y livrer ensuite computed/domaines, calculs exacts, contraintes mathématiques, snapshot et projection. La recommandation antérieure de passer directement au Lot 5 convenait au seul scénario scalaire ; elle évolue pour couvrir les objectifs désormais décidés sans reconstruire le snapshot. Migration de comportements aux lots suivants. Aucun enchaînement automatique.
