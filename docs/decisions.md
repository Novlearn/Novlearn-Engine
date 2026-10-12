# Décisions

## D46 — M11 : preuve verticale et état applicatif minimal

[Banc local](demo.md) : FastAPI sert MathLive local et reçoit uniquement les
réponses brutes/IDs. Le serveur adapte le corpus revu dans les workers, choisit
seed/ID/snapshot et applique les mêmes projections/corrections pratique/duel.
Reprise GET, tentatives bornées et séquence d'admission restent dans l'exemple
applicatif ; aucun état de progression/points/auth ajouté au cœur. Propriété,
TTL et manche revérifiés après await ; réponse ancienne ne remplace pas la plus
récente soumise. Unicode/nonfinite/profondeur/corps bornés avant transport.
17 observations navigateur réelles, snapshot/rejeu privé exclu d'HTTP/package.
504 transport froid100ms et503 fixture crash distingués des preuves natives M8/M9.
Uvicorn0.32.0/Click8.5.0 limités au banc. Aucun dépôt voisin/DB/production modifié.

## D45 — M10 : import explicite et arbitrages historiques confirmés

[ADR016](adr/016-reviewed-legacy-adaptation.md). Adaptateur sous-chemin ./legacy,
recettes privées versionnées, originale complète et mappings558 chemins. Formats
DB encodé /publication Creator /document plat distincts ; tests Creator reconstruits.
Computed min/max conservés inactifs selon sources observées, aucun JS exécuté.
Utilisateur autorise contraintes36 a≠0,78 u0≠1 et k≠2u0²,96 u0≤2k et priorité
Is_Flash de ligne true pour103. Tirages réduits explicitement, original intact.
106 requiert log-affine-positive exact surx>0 et forme power-of-e, sans solveur
général. Sept exports du cœur conservés, une fonction d'adaptation séparée.
Qualification M10 : check1482PASS/32WindowsSKIP et pack153 ; conversion locale ≠
migration de production. Linux borné validé, AppControl Windows toujours unavailable.

**Priorité actuelle : D35, cahier des charges V1 et D34/ADR 008.** Les décisions de conservation des APIs expérimentales ci-dessous sont remplacées ; leurs profils mathématiques restent documentés historiquement.

## D35 — Mission autonome V1 et référence officielle (11 octobre 2026)

L'utilisateur confirme que `CDC_référence.md` est le document officiel malgré le
nom sans accents utilisé dans sa mission. Son contenu et ses octets restent
intouchés. Le texte de mission autorise explicitement l'enchaînement des lots et
les commits locaux après validation ; il remplace les restrictions antérieures
sur un lot unique et les mentions documentaires « sur instruction distincte ».
Aucun push, PR, déploiement, publication, SQL ou dépôt voisin modifié.

La consolidation canonique existe déjà au commit `6c7a9d1` : la vérifier sans
recréer les architectures historiques. La matrice CDC de feature-coverage.md
pilote toutes les obligations P0/P1 ; aucun report ou rejet hors profil ne vaut
livraison d'une obligation. P2 et responsabilités applicatives restent exclus.
Les choix techniques locaux réversibles sont autorisés ; les contradictions
pédagogiques historiques demandent une revue humaine avant conversion fidèle.
Une analyse indépendante initiale en lecture seule a confirmé l'architecture
unique et les manques de correction/éléments/isolation ; aucun fichier délégué.

## D44 — M9 vérifié : transport privé et profil Linux observé

[ADR015](adr/015-private-python-transport.md). CLI versionnée sans HTTP Node,
bridge Python borné et exemple FastAPI autonome. Définition/seed/instance officielles
choisies côté backend ; client soumet uniquement sa question/réponse. Pool conserve
le superviseur, jamais le contexte mathématique ; mesures locales cold/warm explicites.
Lecture seule backend Linux/systemd justifie lanceur Linux stdlib sous cgroupv2
déjà borné, sans modification de production ou dépendance mathématique.
7 tests PythonLinux/12 checks OS/check1383PASS avec32Windows non exécutés et
bench60 valident ce profil. Cleanup sous pression sans SLO strict, Windows actuel
refusé par AppControl ; aucune qualification de l'unité/Node20 de production.

## D43 — M8 : processus neuf et quota OS hors cœur portable

[ADR014](adr/014-isolated-node-host.md). Sous-chemin node-host distinct, JSON
encodé borné, concurrence/file et deadline globale, sept opérations en whitelist
sur canal backend privé. Windows10+/x64 : lanceur C# fixe compilé au build,
Job Object assigné atomiquement, quotas mémoire engagée natives/heap séparés,
watchdog indépendant et cleanup parent/worker prouvables. Pas de politique
PowerShell modifiée ou commande d'exercice exécutée. Sans lanceur OS validé :
unavailable, jamais fallback non borné. Types Node en développement seulement.
Cette isolation ne valide ni transport FastAPI/production ni benchmarks M9.

## D42 — M7 : MathLive isolé et preuve par sortie réelle

[Rapport du banc](mathlive-compatibility.md). Version 0.111.1 épinglée dans un
package privé d'outillage, exclu de la distribution moteur. Captures distinctes
API/clavier/collage/virtuel, sources brutes et événements conservés. Tests de
correction depuis le package public avec attendus officiels indépendants.
Alias de collections confiés à CortexJS ; scripts vides protégés lexicalement
avant réduction. Aucun contrat concurrent, export supplémentaire, politique
cliente, composant applicatif ou migration historique. Rejeu des fixtures ne
vaut pas nouvelle suite navigateur ; profils et versions précis dans le rapport.

## D41 — M6 : fonctions fermées et attendus connus du lycée

[ADR 013](adr/013-school-known-answers.md) : profil explicite school-latex-v1
pour lecture de fonctions/limites ; mode display d'expression séparé du parcours
polynomial existant. Substitution raw et domaine non vérifié de présentation.
Numérique fermé : domaines avant réduction, valeurs exactes/identités fermées,
pôles tangente prouvés ; indétermination en l'absence de preuve. Exemple obligatoire
ln(x−a)/(x−a), x>a et limite droite attendue −∞ démontré par fixture native
synthétique, sans résolution ni migration historique. Dérivées attendues admises
par M4 ; aucun opérateur/solveur de dérivation ajouté. Sept exports runtime.

## D36 — Références descriptives explicites, M1 (11 octobre 2026)

CDC 3.5 : identifiants de 1–32 caractères, première lettre latine minuscule puis
lettres ASCII/chiffres. Paramètres scalaires, composantes, computed et inconnues
libres utilisent la même grammaire ; collisions et budgets existants conservés.
Réservés : e/i, sin/cos/tan/ln/exp/sqrt, constructor/prototype et infinity sans
distinction de casse (priorité constante observée dans CortexJS).

Formules : `\mathrm{nom}`. Chaque appel de parsing ajoute des entrées `expression`
au dictionnaire CortexJS local pour les seuls noms déclarés. Cela évite les alias
d'unité (kg) ou de fonction (length), sans remplacer du LaTeX ni réinterpréter
`ab`, `delta` ou `r1` nus. Textes et opérandes structurés référencent les noms
directement (`@nom`, `{variable:'nom'}`). Les composantes de tuples restent plates.
Les chiffres d'un nom ne sont pas des littéraux numériques ; espaces admis par
Cortex dans ce wrapper exemptés des gardes numériques, source inchangée.

Aucun nouveau contrat concurrent, export, bibliothèque, algorithme RNG ou schéma.
Extension additive du schéma 5 ; vecteurs courts conservés sans réécriture.
Les dictionnaires de substitution sont sans prototype et les bornes statiques
vérifient les propriétés propres : un nom valide comme toString ne doit pas être
confondu avec une propriété héritée. Limites de domaine/calcul inchangées.
Recettes obligatoires testées par composition/oracles BigInt, pas par générateurs
spécifiques. Les majuscules initiales/soulignés/scopes locaux restent hors profil ;
leurs historiques exigent une conversion explicite avec provenance au lot M10.

## D37 — Données de présentation, M2 (11 octobre 2026)

CDC 2.1/6.5/8/9 : [ADR 009](adr/009-display-elements.md). Unions de données pour
les familles prioritaires/avancées ; catalogue privé typé et keyboard non autoritaire.
Formules raw Cortex sans réduction/évaluation, admission interne display-latex-v1,
domaine explicitement non vérifié. Nombres de rendu rationnels exacts par le
parcours existant. Relations binaires avec membres scalaires uniquement.
Données prescrites, ordre/cardinal/références/cohérence contrôlés ; aucun sampling
ou calcul analytique. Issues probabilistes disjointes, somme ≤1 (=1 si exhaustive).
Variations non strictes, valeurs définies finies, limites unilatérales et faits
contradictoires refusés. Aides/corrections instanciées privées, retirées du public.
Sélection partagée de champs imbriqués, traces privées et échecs atomiques.

Le CDC prioritaire autorise geometry minimal malgré l'ancien catalogue incomplet.
Fixtures synthétiques distinctes des sources ; graphe 64 transcrit manuellement,
aucune adaptation/migration complète. Propriétés historiques hors contrat dans le
brut pour M10, jamais supprimées silencieusement. Aucun arbitrage bloquant en M2.

## D38 — Correction numérique/discrète officielle, M3 (11 octobre 2026)

[ADR 010](adr/010-numeric-grading.md). Sept fonctions publiques, gradeAnswer depuis
snapshot serveur de confiance et soumission inerte, par IDs stables. Cinq états,
valeur/comparaison/forme/méthode distinctes ; différence prouvée seule devient
incorrect. Soumissions latex/text/selection sans autorité client. Ratios et q√d
exacts Cortex, identités fermées à feuilles exactes, bornes certifiées π/e affines
monoconstante ; aucune preuve universelle par isEqual/isIdenticallyEqual/float.
Domaines raw avant réduction ; ±∞ explicitement saisis en extended-real seulement.
Tolérance officielle A+R|attendu| inclusive, décimaux exacts, frontière non prouvée
indéterminée ; texte strict/variantes/normalisation explicite, QCM par ensembles
d'IDs. Aucun nouveau parseur/CAS, dépendance ou autorisation de correction officielle
sans l'isolation du M8. Formes, familles algébriques et autres lots V1 restent requis.

## D39 — Preuves univariées, domaines et collections, M4 (11 octobre 2026)

[ADR 011](adr/011-algebra-collections.md). Coefficients/produits croisés Cortex
exacts, restrictions raw avant réduction, mêmes domaines par défaut et domaine
cofini imposé. Relations degré 0–2 comparées par solutions, ensembles/intervalles
français/unions et bornes quadratiques sous preuve. CorrectionResult sépare
domaine et valeurs sur domaine commun ; inconnus indéterminés. Sept exports et
schéma 5 ; aucun boxed public, parseur/CAS ajouté, solveur général ou préemption.
Formes M5, fonctions M6 et autres lots V1 restent requis.

## D40 — Formes originales et factorisation complète sur ℚ, M5 (11 octobre 2026)

L'utilisateur tranche D14 pour une factorisation complète sur ℚ sous profil
borné. [ADR 012](adr/012-pedagogical-forms.md) définit fractions, formes
développées/réduites, facteurs triviaux, signes et inconnus. Témoins sur syntaxe
originale ; PGCD et discriminant exacts Cortex ; aucune reconnaissance universelle.
Facteurs degré ≥3 indéterminés, scalaire non nul unité sur ℚ sans extraction du
contenu entier. Alternatives de familles OU ou références LaTeX privées certifiées
en valeur/domaine. CorrectionResult forme séparée, valeur égale conservée quand
seule la forme échoue. Tolérances M3 inchangées ; schéma5/sept exports préservés.
Validation complète M5 : 1169 tests/21 fichiers et pack PASS ; aucune migration
historique ni nouveau CAS.

## D33 — Complément Lot 5 : résolution calculée versionnée (retenue)

Demande du 11 octobre 2026. `GenerationDefinitionV3` / `variables-v3` ajoute computed (`name`, `latex`, restrictions facultatives) et des opérandes `{latex}` aux six comparaisons. `ExerciseDefinitionV4` / `composed-instance-v4` consomme ce contexte commun. Les contrats historiques restent inchangés. Calculs rationnels fermés du profil existant, source conservée, résultat `{kind:'rational',numerator,denominator}` même pour une fraction décimale ; aucun quotient flottant. Provenance : définition officielle, liaisons de tuples et liste ordonnée `{name,dependencies}` des calculs, sans deuxième copie des valeurs.

Références extraites par CortexJS, validation mathématique et tri topologique stable avant RNG ; tirages dans l'ordre des seules déclarations aléatoires, calculs sans mots RNG puis contraintes sur le candidat complet. Mêmes budgets v2 et limites mathématiques. Restriction de résultat fausse ou comparaison fausse : retrait du candidat complet. Expression invalide, hors profil, non définie, indéterminée ou erreur technique : arrêt explicite, sans fallback. Aucun solveur ou réparation. Noms d'une lettre conservés : parser/contexte v1 les imposent ; `delta` est un produit implicite et `r1` peut être un indice/produit, pas un identifiant contractuel. Une convention explicite multi-caractère reste à arbitrer séparément, avant modification du parseur/contrat. Aucun besoin bloquant pour le profil demandé (r/s pour les racines).

Statut « retenue » = cohérente avec le cadrage et adoptée pour ce socle ; pas une validation métier externe implicite.

| ID  | Statut                 | Décision et motif                                                                                                                                                                                                            |
| --- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D01 | Retenue                | Package strict ESM indépendant ; `.d.ts`, export racine, pas de CJS sans besoin. ADR 001.                                                                                                                                    |
| D02 | Retenue                | CortexJS 0.151.0 seul moteur mathématique principal ; MathLive hors cœur.                                                                                                                                                    |
| D03 | Retenue                | Source originale/raw et restrictions avant réduction ; forme séparée de valeur. ADR 002.                                                                                                                                     |
| D04 | Retenue                | Exact/heuristique/indéterminé/erreur explicites ; aucun faux incorrect par défaut.                                                                                                                                           |
| D05 | Retenue                | Correction serveur et projection publique par allowlist ; pas de seed sensible publique. ADR 003.                                                                                                                            |
| D06 | Retenue                | Génération de paramètres seedée et versionnée livrée au Lot 4 ; domaines vides et limites explicites, aucun fallback. ADR 006.                                                                                               |
| D07 | Retenue                | Aucun `eval`, `new Function`, parseur LaTeX supplémentaire ou CAS parallèle.                                                                                                                                                 |
| D08 | Retenue                | Périmètre limité au lot autorisé ; pas de correction/UI à ce stade, publication désactivée.                                                                                                                                  |
| D09 | Provisoire             | TS6.0.3 au lieu du TS7.0.2 POC : peer déclaré de typescript-eslint8.71.1 <6.1.0.                                                                                                                                             |
| D10 | Provisoire             | Rationnels/polynômes univariés bornés pour premier correcteur ; spécifier bornes et coefficients.                                                                                                                            |
| D11 | Provisoire             | CLI puis pool local comme expériences FastAPI ; aucun service imposé.                                                                                                                                                        |
| D12 | Retenue                | Contrat natif v1 de valeur rationnelle sur question 103 ; aliases et autres familles différés. ADR 004.                                                                                                                      |
| D13 | Partiellement tranchée | Même domaine par défaut avec domaine imposé explicite par question confirmé sous D27 ; types numériques, tolérances et nouvelles familles pédagogiques restent ouverts.                                                      |
| D14 | Retenue sous profil M5 | Factorisation complète sur Q confirmée utilisateur ; formes, cas triviaux et inconnus explicités sous D40/ADR 012.                                                                                                           |
| D15 | Retenue                | Profil scalaire v1 : point ou `{,}` natif, virgule nue refusée, placeholders rejetés avant parsing. ADR 005.                                                                                                                 |
| D16 | Retenue                | Mulberry32 parameters-v1, seed uint32 canonique, ordre du tableau et singleton sans tirage figés. Snapshot au Lot 5. ADR 006.                                                                                                |
| D17 | Ouverte                | Transport production, budgets de ressources, SLO et contraintes déploiement.                                                                                                                                                 |
| D18 | Ouverte                | Registre privé, licence, nom final, processus de release et compatibilité consommateurs.                                                                                                                                     |
| D19 | Retenue                | Parsing CortexJS 0.151.0 `form:raw`, MathJSON public détaché, source conservée, contexte isolé par appel ; aucune évaluation ni garantie de domaine. ADR 005.                                                                |
| D20 | Retenue (cible)        | Quatre mécanismes : aléatoire numérique, choix, tuple générique à deux modes et calculé par CortexJS. Composition pour les familles mathématiques ; aucun type indépendant function/perfect_square/doublet/triplet. ADR 006. |
| D21 | Retenue (cible)        | Contraintes déclaratives bornées sans solveur ; séparer structure invalide, domaine prouvé vide, candidat rejeté, indétermination et essais épuisés. Aucun fallback ni acceptation d'une condition inconnue. ADR 006.        |
| D22 | Proposée               | Complément 4 bis pour tuples/comparaisons simples avant Lot 5 étendu ; computed et contraintes avec formules restent au Lot 5. Lot 4 livré conservé, aucun nouveau lot engagé.                                               |
| D23 | Ouverte                | Schéma/version étendus, arité et liaisons de tuple, budgets et profil de contraintes, noms multi-caractères, sérialisation exacte de computed et évolution du snapshot. ADR 006 et roadmap.                                  |

Les arbitrages entre agents et documents contradictoires figurent dans [analysis.md](analysis.md). Ne pas utiliser les 162 tests externes comme certification du moteur neuf. Les onze sondes polynomialCoefficients justifient un candidat borné, pas un correcteur général. La migration des tableaux/figures reste conditionnelle, sans transformation générique de noms.

Lot 4 : génération native integer/decimal/choice et valeurs typées sérialisables, précision de grille explicite sans tolérance. Doublons et exclusions hors domaine refusés. Contrat d'exercice rationnel inchangé ; computed et contraintes intervariables absents. Leur allocation cible est précisée ci-dessous. Décisions détaillées et versionnement dans [ADR 006](adr/006-deterministic-generation.md).

## Clarification documentaire de la génération — 10 octobre 2026

« Retenue (cible) » adopte l'objectif fonctionnel sans annoncer une implémentation. À cette clarification préalable au Lot 5, l'état était integer/decimal/choice, parsing sans calcul et DTO d'instance préparatoires ; D24 ci-dessous actualise l'instance native. La [matrice](compatibility.md#matrice-de-couverture-fonctionnelle--génération) relie chaque capacité à ses preuves et manques. Tuple/vecteur, paramètre/variable libre, expression d'énoncé et attendu privé restent distincts ; calcul, rendu et correction ne deviennent pas des générateurs.

Ajustement explicite de l'allocation antérieure : D06/D16 et le périmètre livré du Lot 4 restent retenus. Les tuples envisagés mais non livrés sont regroupés au 4 bis proposé avec les comparaisons simples auparavant différées globalement au Lot 5. Formules, graphe computed, contraintes sur ses résultats et instances restent au Lot 5. La fin de roadmap recommande donc 4 bis avant le Lot 5 étendu, sans relancer les lots terminés. Les notes historiques conservent leur recommandation à la date de livraison.

Arbitrages encore nécessaires avant code : adopter ou ajuster le tuple ordonné avec liaisons scalaires proposé, fixer tailles/budgets et profil CortexJS des prédicats, choisir une nouvelle version tout en préservant `parameters-v1`, définir valeurs calculées exactes et snapshot. Les exemples JSON étendus sont des propositions refusées aujourd'hui, pas une modification des contrats v1. Les bornes computed cibles valident le résultat, sans clamp ; la contradiction de 106 exige une revue au Lot 9, pas une migration silencieuse. Aucun motif pour créer un service, une dépendance, un moteur Admin séparé ou un algorithme par famille.

## Reprise du développement — 10 octobre 2026

Lors de la première inspection, les huit JSON étaient absents : seule préparation du Lot 2, sans API publique. L'utilisateur a ensuite fourni `docs/exercises_rows.json` (huit lignes), levant ce blocage. D12 devient retenue pour un sous-ensemble natif v1, décrit dans [compatibility.md](compatibility.md) et ADR 004. Le choix de valeur rationnelle sans forme imposée concerne uniquement la question 103 ; D13/D14 restent ouvertes pour les autres familles. La possibilité de caractériser le Lot 3 en parallèle n'est pas utilisée : cette mission termine seulement le Lot 2.

## D24 — Instanciation native du Lot 5 (retenue)

La nouvelle demande autorise la première question complète et interdit de réimplémenter tuple/computed/contraintes manquants. Le trinôme 103 ne dépend pas du 4 bis : implémenter `instantiateExercise` et `projectPublicInstance` sur le contrat entier existant, sans élargir le générateur. Concrétiser le DTO privé préparatoire avec sources/raw/substitution, ratio exact, compteur de tirages et `rational-instance-v1` ; snapshot étendu toujours ouvert sous D23. Définition/soumission v1 et golden vectors `parameters-v1` inchangés.

Profil rationnel/polynomial borné, dénominateurs fermés non nuls et admissibilité avant réduction ; produits implicites symboliques fixés avec CortexJS avant substitution pour éviter les nombres mixtes. Texte `@a` et échappement `@@` uniquement dans les trois champs prévus. Rejeu avec même définition/seed/ID/versions ; projection par sélection détachée depuis état officiel privé. Choix, décimaux de génération, tuples, computed, graphe et contraintes ne sont pas intégrés aux définitions natives. Aucune comparaison pédagogique, migration ou Lot 6 ; le Lot 5 étendu de la roadmap n'est pas déclaré terminé. API, bornes, conséquences du DTO concrétisé et limitations : [ADR 007](adr/007-native-instantiation.md).

## Cadrage global — décisions confirmées le 10 octobre 2026

Les trois questions structurantes ont été posées pendant la mission documentaire et leurs réponses reçues avant finalisation. Référence : [vision](exercise-engine-vision.md), [spécification](functional-specification.md), [contrats](architecture.md), [parcours](exercise-lifecycle.md), [couverture](feature-coverage.md) et [audit critique](architecture-review.md).

| ID  | Statut                                 | Décision / conséquence                                                                                                                                                                                                                                                               |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D25 | Retenue (cible, confirmée utilisateur) | Liste plate d'éléments ordonnés avec sections explicites, IDs stables et variables communes ; pas d'arborescence récursive initiale. Question identifiée par son ID d'élément, attendus/politiques par question. Variables locales et dépendances pédagogiques différées.            |
| D26 | Retenue (cible, confirmée utilisateur) | Premier périmètre étendu : texte, expression, question et QCM simple/multiple. Graphes/tableaux/suites/arbre/vecteurs/plan complexe en compléments ciblés, avec responsable/tests avant support ; aucune suppression silencieuse d'un bloc non admis.                                |
| D27 | Retenue (cible, confirmée utilisateur) | Futures équivalences symboliques : mêmes domaines par défaut ; domaine de comparaison imposé explicitement par question possible, avec preuve de définition et d'égalité sur ce domaine. Domaine inconnu → indéterminé. Aucun extracteur universel ni correcteur actuellement livré. |
| D28 | Proposée                               | Complément de contrats de composition rattaché à 2/5, schéma étendu distinct, coordonné à D23 avant instance multiquestion et snapshot étendu ; conserver v1/RNG. QCM par IDs et correction discrète ciblée au 6, éléments avancés par compléments de 5 puis adaptation 9.           |
| D29 | Proposée, conditionnelle               | UI commune en package séparé, sous-package frère dans ce dépôt si les builds consommateurs le justifient ; éditeurs Admin séparés, calculs métier communs et géométrie dans renderer. Aucun repository, outillage ou dépendance ajouté.                                              |

Questions essentielles au cadrage répondues ; D23, D14, D17/D18 et aspects restants de D13 sont ouverts avant leurs implémentations/adoptions, avec options/recommandations et impacts dans l'audit. Aucun nouveau lot engagé. D10 demeure provisoire sur méthode/bornes du premier correcteur ; D27 tranche la politique de domaine, pas sa faisabilité générale. Les priorités/compléments proposés ne sont pas une autorisation de développement.

## D30 — Lot 5 bis : composition scalaire v2 (retenue)

La demande explicite autorise audit/corrections et exige les questions multiples, sans reconstruire les capacités absentes du Lot 4. Appliquer D25/D26 au sous-ensemble scalaire : `ExerciseDefinitionV2`/instances v2, liste plate avec sections/références, texte/expression/question/QCM simple et multiple, integer/decimal/choice existants intégrés et attendus privés par ID. Versions v1/RNG préservées, mêmes six exports runtime ; les résultats depuis `unknown` demandent désormais une garde de schéma. Validation JSON inerte et projection par sélection dans tous les objets imbriqués.

Rationnels exacts et expressions polynomiales préparées par la frontière existante, politique value-only seulement ; options mathématiques QCM rationnelles fermées pour permettre des collisions exactes démontrées. Aucun grading ni transport de soumission QCM. `composed-instance-v2` décrit un snapshot **sans groupes ni computed**, pas le snapshot étendu sous D23. D28 concrétisée pour la composition scalaire seulement ; schémas/arités/liaisons/prédicats de groupes restent ouverts. 4 bis, computed/graphe/contraintes et figures demeurent des compléments explicitement non supportés, sans changement silencieux des Lots 3/4. Audit initial, arbitrage cible/livré, API, limites et preuves dans [ADR 007](adr/007-native-instantiation.md#lot-5-bis--composition-v2).

## D31 — Priorité au moteur complet avant UI (confirmée utilisateur)

Après le bilan du Lot 5 bis, l'utilisateur demande son commit explicatif et confirme de terminer d'abord le moteur d'exercices, sans UI pour l'instant. Ordre recommandé : 4 bis tuples/comparaisons et contrats de groupes ; complément 5 computed/dépendances/contraintes/snapshot ; compléments de données d'éléments selon familles documentées ; correction 6 et formes 7 ; isolation/transport 8, compatibilité/adaptation 9 et vérifications de distribution. Chaque tranche conserve ses limites et critères de validation. Les renderers React, écrans Admin/élève et démonstration avec UI attendent le moteur ; préparer des données de graphe/tableau n'autorise pas un renderer. Aucun lot supplémentaire n'est commencé par la demande de commit ; la prochaine intervention recommandée est le 4 bis, pas un passage direct au correcteur.

## D32 — Lot 4 bis : tuples, comparaisons et génération v2 (retenue)

Demande explicite du 11 octobre 2026. GenerationDefinitionV2 + variables-v2 ; tuple unique à deux modes, domaines scalaires réutilisés, liaisons ordonnées vers valeurs plates. Choice v2 avec exclusions optionnelles ; six opérateurs structurés nom/constante, nombres exacts fermés via CortexJS tolérance zéro. Budgets obligatoires, tirage global atomique sur flux continu, impossibilité simple / recherche épuisée / indétermination / erreur distinctes. ExerciseDefinitionV3 et snapshots v3 consomment le contexte sans changer v1/v2. D23 tranché pour groupes/liaisons/arité/essais ; computed, noms étendus et profils exacts restent ouverts. [Détails](adr/006-deterministic-generation.md#décisions-lot-4-bis--variables-v2-11-octobre-2026). Aucun complément 5, correction/UI, migration, commit ou déploiement automatiquement engagé.

## D34 — Consolidation canonique (retenue, 11 octobre 2026)

Demande explicite : moteur non adopté, anciennes APIs internes non conservées.
[Audit avant suppression](consolidation.md) et [ADR 008](adr/008-canonical-consolidation.md).
Schéma unique 5, package privé 0.1.0, types sans suffixes ; une validation de
génération, un résolveur et une boucle atomique, une instanciation composée.
Choix numériques finis de l'ancien tirage conservés ; exactitude contrôlée lors
de leur usage mathématique. Suppression de instantiationVersion ; seed, révision,
artefact et mulberry32-rejection-v1 conservés, nouveaux vecteurs complets figés.

Tableaux de paramètres, schémas/options anciens et snapshots expérimentaux
refusés sans adaptateur. Sources historiques inchangées, conversion future au Lot 9
hors cœur. AnswerSubmission LaTeX renommé/schéma 5 ; CorrectionResult et transport
QCM différés avec les Lots 6/7. Aucun correcteur, élément avancé, UI, serveur,
migration, dépendance supplémentaire ou commit. [Preuves locales](progress.md).
