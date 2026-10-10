# Spécification fonctionnelle

Référence cible du 10 octobre 2026, sans modification des contrats réels. [Vision](exercise-engine-vision.md), [contrats](architecture.md), [couverture réelle](feature-coverage.md) et [parcours](exercise-lifecycle.md) font partie de la même référence. Les exemples marqués `draft` sont documentaires et refusés par les validateurs actuels.

## 1. Document et questions

Le contrat actuel `ExerciseDefinitionV1` représente une famille `rational-value` : identité/révision, titre, paramètres entiers, variables libres, énoncé texte/LaTeX, **une** question avec ID, texte, points positifs, attendu et politique fixe `{domain:rational, form:value-only}`. `extensions` conserve des données privées sans les interpréter. Ce contrat n'est pas le modèle de tout le catalogue.

La cible confirmée est une **liste plate ordonnée** d'éléments à IDs stables, avec sections explicites et variables communes. La définition porte ID, révision immuable, version de schéma, métadonnées utiles, déclarations de génération et variables libres, éléments et attendus/politiques de chaque question. Un titre d'introduction, une conclusion et une explication sont des usages de contenu, pas des types supplémentaires sans comportement distinct.

| Approche                        | Avantages                                                                                     | Coûts / limite                                                                 | Conclusion                                             |
| ------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Liste plate avec sections       | Réutilise l'ordre historique, projection et réordonnancement simples, questions indépendantes | Pas de portée locale automatique ni sous-arbre déplaçable                      | Retenue ; les titres de section organisent le document |
| Parties/sous-parties récursives | Portées locales et opérations par sous-arbre                                                  | Validation récursive, IDs/ordre/projection plus complexes, besoin non démontré | Différée ; ne pas construire dès maintenant            |

Chaque question porte son format, attendu, politique de correction et éventuellement aide/explication/points. Son `id` est aussi l'identité de l'élément question : pas de deuxième ID équivalent. Réponses et résultats référencent `(instanceId, questionId)` ; une instance privée référence la révision exacte. L'ordre des tableaux n'est jamais l'identité d'une question.

Réordonner ou modifier la prose conserve l'ID. Dupliquer une question crée un ID neuf ; supprimer une question n'autorise pas la réutilisation de son ID dans la même lignée. Changer le sens d'une question crée une nouvelle révision et, si c'est une autre question, un nouvel ID. Une ancienne tentative continue de référencer son ancienne instance/révision. Admin applique ces commandes ; moteur et backend vérifient unicité et correspondances. Aucun format UUID ni génération d'ID dans le cœur n'est imposé.

L'instanciation prépare **toutes** les questions admises, dans l'ordre de la définition, avec un attendu privé pour chacune. Un échec de question empêche de publier une instance complète ; les diagnostics identifient l'élément concerné. Les réponses multiples à plusieurs questions sont plusieurs soumissions identifiées ; une réponse multiple à un QCM est une sélection unique d'IDs d'options.

Pour le trinôme : q-discriminant attend `b²−4ac`, q-racines un ensemble de racines sous domaine/famille admis, q-sommet `−b/(2a)`, q-minimum `c−b²/(4a)` avec `a>0`. Toutes partagent a/b/c. Cet exemple est un test de conception, **pas** une capacité multiquestion ou un solveur de racines livré. La transcription actuelle de 103 ne calcule que l'abscisse.

### Trois dépendances distinctes

1. Mathématique : b calculé à partir de a ; graphe de valeurs indépendant de la progression élève.
2. Pédagogique : recommander q2 après q1 ou déverrouiller une partie ; application, sans changer les valeurs officielles.
3. Réponse précédente : corriger q2 en tenant compte de la valeur saisie à q1 ; fonctionnalité ultérieure nécessitant une politique de suivi d'erreur et un état serveur. Aucun comportement implicite.

Variables communes, ID/révision, ordre, discriminants et association question-attendu sont à prévoir dans le prochain contrat. Sections peuvent être un contenu de titre simple. Portées locales, dépendances pédagogiques déclarées, questions adaptatives et suivi d'erreur peuvent attendre ; aucun champ récursif ou graphe de questions ajouté par anticipation.

## 2. Éléments : contrat commun et inventaire

Chaque type natif futur est une branche d'union discriminée avec `id`, `type` et données précises ; pas un `content: any` ou sac de propriétés générique. Validation structurelle, profil mathématique des champs, variables consommées, instance/projection et diagnostics avec chemins sont définis pour chaque branche avant annonce de support. Les comportements communs de contenu, substitution et questions sont réutilisés.

Un élément informatif ou mathématique ne produit pas automatiquement une correction. Une interaction de zoom n'est pas une question. Pour corriger une équation affichée ou une figure, utiliser une question explicitement associée ; ne pas déduire une réponse d'un élément graphique. Le premier périmètre étendu confirmé est texte/expression/question/QCM simple et multiple. Sections n'ajoutent aucun calcul.

Sources locales en lecture seule : Creator `src/utils/defaultContent.js`, `src/editors/ElementEditor.jsx`, `src/renderers/ElementRenderer.jsx` et composants spécialisés ; NovLearn `frontend/app/types/exercise.ts` et `frontend/app/components/Exercise/ExerciseRenderer.tsx`. Les [audits voisins](architecture-review.md#sources-et-méthode) détaillent les structures. Le corpus reçu ne contient que text/question/mcq/graph.

Dans les fiches suivantes, **données/configuration**, **variables/calculs**, **validation/instance**, **réponse/rendu/Admin**, **état/lot** couvrent les onze dimensions demandées. Les contrats cibles sont des besoins, pas la reprise automatique des contrats historiques.

### Texte et sections — informatif

- Données/configuration : texte, titre de section éventuel, fragments mathématiques explicitement distingués du texte ; ordre et ID. Historique `text.content.text`, parfois chaîne chez Creator.
- Variables/calculs : interpolation de valeurs déclarées ; pas d'évaluation de prose ni de remplacement de sous-chaînes mathématiques. Une formule paramétrée utilise un fragment/champ mathématique explicite. Grammaire de fragments à spécifier avant code, sans nouveau parseur LaTeX.
- Validation/instance : longueur, gabarit, références connues, taille finale ; conserver source et produire texte/fragments affichables. Le natif v1 remplace `@a` et `@@` dans trois champs seulement ; `$...$` y reste opaque.
- Réponse/rendu/Admin : aucune réponse ; renderer texte/LaTeX et accessibilité, Admin édite le contenu et les sections. La sanitation HTML relève de l'UI ; aucun HTML exécutable transporté implicitement.
- État/lot : texte natif limité livré/testé au Lot 5 ; liste/sections/fragments au complément de contrat et Lot 5 étendu. Ni prose riche ni section native actuelles.

### Expression, équation et système — mathématique, éventuellement associé à une question

- Données/configuration : expression LaTeX et symboles/domaine ; pour une relation, membres et nature ; pour un système, relations ordonnées. Historique `equation.latex`, système Creator `system` ; ils ne sont pas tous parsables par scalar-latex-v1.
- Variables/calculs : substitution CortexJS des paramètres, variables libres préservées ; sérialisation. Afficher une relation, comparer une solution, comparer des relations et résoudre sont des besoins différents ; aucune résolution générale promise.
- Validation/instance : profil de commandes/opérateurs, arités, domaines avant réduction ; erreur si relation/système hors profil. Instance garde source/raw et affichage dérivé.
- Réponse/rendu/Admin : formule seule sans réponse ; question distincte pour les solutions. Renderer LaTeX, Admin formule/contexte, avec diagnostic au champ fautif.
- État/lot : expression polynomiale d'énoncé bornée livrée Lot 5 ; expression comme élément au Lot 5 étendu ; relations/systèmes après contrat ciblé, hors premier profil de calcul. `requireAnswer` élève historique n'est pas un comportement natif.

### Question ouverte — interactif et corrigible

- Données/configuration : ID, énoncé, format, attendu privé, politique ; points, aide/explication seulement si utilisés. Historique `question`, `answerFormat`, `correctAnswer`, `hint`, `explanation`, `points`.
- Variables/calculs : tous les champs paramétrés admis consomment les mêmes valeurs ; attendu calculé par famille. Pas d'attendu déduit du LaTeX affiché.
- Validation/instance : références, format/politique compatibles, domaine et attendu démontré ; préparer une question publique et son attendu privé. Plusieurs questions en cible, aucune omission silencieuse.
- Réponse/rendu/Admin : saisie brute LaTeX ou texte suivant format ; renderer MathLive/feedback autorisé, Admin règle et teste attendu/politique. Les essais et points attribués restent applicatifs.
- État/lot : une question rationnelle native livrée/testée Lot 5 ; multiquestion Lot 5 étendu ; correction 6, formes 7, autres formats par compléments qualifiés.

### QCM simple et multiple — interactif et corrigible

- Données/configuration : question, mode simple/multiple, options avec IDs stables et contenu, ensemble d'IDs corrects privé ; points/aide/explication si nécessaires. Historique `multipleChoice`, parfois `multipleAnswers`, `correct`/`isCorrect` et IDs absents : ne pas fusionner sans revue.
- Variables/calculs : instancier toutes les options ; détecter collisions après substitution (cas 78, u0=1). Le mode simple exige une bonne option ; le multiple exige une sélection attendue valide. Aucun mélange via `Math.random`.
- Validation/instance : IDs uniques, références attendues existantes, nombre/options/mode compatibles, contenus admis ; ambiguïté de distracteurs diagnostic d'auteur, pas verdict arbitraire. Comparaison sémantique non prouvée des options reste indéterminée ; aucun détecteur universel de doublons promis.
- Réponse/rendu/Admin : IDs sélectionnés, sans indices dans l'ordre affiché ni flags corrects publics ; ordre conservé ou mélange versionné conservé côté serveur. Comparaison exacte des ensembles d'IDs ; sélection simple de cardinal 1, multiple sans doublon. Renderer choix accessibles ; Admin mode/options/bonnes réponses/essais privés.
- État/lot : absent natif ; contrat/instance/projection Lot 5 étendu, correction discrète bornée complément ciblé du Lot 6, adaptation 9, UI application. Scores partiels non décidés par le moteur.

### Graphe de fonction — mathématique et interaction de vue

- Données/configuration : fonctions/expressions, couleurs et légendes, bornes x/y numériques ou expressions, grille ; mode auto explicitement distingué d'une formule. Historique `graph.functions`, xMin/xMax/yMin/yMax, showGrid/showExpression.
- Variables/calculs : substitution et, si requis, préparation bornée d'échantillons avec domaine/erreurs ; aucune inférence d'asymptote/continuité à partir d'un dessin. Samples numériques sont de l'affichage, pas une preuve d'égalité.
- Validation/instance : bornes finies et ordonnées après résolution, expressions admises, budgets de points ; trous/singularités explicités, pas de ligne traversant automatiquement un domaine inconnu.
- Réponse/rendu/Admin : aucune réponse par défaut ; question liée si lecture de courbe. Renderer canvas/SVG, zoom/grille/labels et calcul géométrique de pixels ; Admin fenêtre/fonctions. Calcul mathématique de f(x) via frontière commune, pas réécriture regex dans le renderer.
- État/lot : présent Creator et élève, deux calculs distincts ; absent natif, graphe 103 non transcrit. Complément d'éléments du Lot 5 puis adaptation 9 et UI, après premier périmètre.

### Suite et graphe discret — mathématique

- Données/configuration : mode explicite/récurrent/manuel, indice initial, formule ou récurrence et valeur initiale, nombre de termes ; fenêtre, grille, liaison de points, valeurs et limite donnée. Creator `discreteGraph`, types élève `sequence` et `discrete_graph.points` sans branche de rendu.
- Variables/calculs : termes via CortexJS et contexte local n/terme précédent, avec budget ; une limite affichée est fournie, pas calculée automatiquement ; récurrence de suite distincte d'un cycle interdit de variables calculées scalaires.
- Validation/instance : mode/champs, indices, nombre de termes, état initial et domaine à chaque pas ; échec ou lacune d'affichage documentée, pas NaN transporté. Produire données de suite communes au tableau et au graphe, sans moteurs séparés.
- Réponse/rendu/Admin : pas de réponse automatique ; question associée. Renderer points/liaison/axes, Admin modes/formules/initialisation. Aucune preuve de convergence à partir des points.
- État/lot : Creator rendu/calcul, élève types seuls pour ces blocs ; absent natif. Complément Lot 5 pour suite/données, adaptation 9 et UI spécifique ; aucun solveur de récurrence prévu.

### Tableau de signes — mathématique prescrit

- Données/configuration : variable/fonction, points/bornes/zéros/interdits et signes des intervalles. Creator `signTable.points/signs`, élève `sign_table.points[].sign` : modèles différents.
- Variables/calculs : substituer abscisses/labels ; données prescrites par l'auteur d'abord, aucun calcul automatique des racines ou des signes promis.
- Validation/instance : cardinal points/intervalles, nature des points, ordre démontré des valeurs, domaine et signes admis ; ordre inconnu diagnostic, pas tri lexical. Préparer cellules et intervalles sans dessiner.
- Réponse/rendu/Admin : aucune par défaut ; remplissage futur nécessiterait une question/contrat. Renderer barres/signes et lecture accessible ; Admin points et signes, diagnostics de cohérence.
- État/lot : rendus historiques incompatibles, absent natif. Complément d'éléments Lot 5, adaptation 9 par mapping revu, UI ; calcul analytique autonome différé.

### Tableau de variations — mathématique prescrit

- Données/configuration : points x, valeurs/limites, ruptures et sens de variation. Creator `y/pos` graphique, élève `value/variation` sémantique : ne pas déduire une variation prouvée d'une position top/bottom.
- Variables/calculs : substitution de valeurs ; variations fournies et validées structurellement, pas dérivation automatique.
- Validation/instance : ordre/domaine, cardinal, interdits, directions et valeurs cohérentes dans le profil contrôlable ; limite inconnue explicite. Instance produit données et diagnostics.
- Réponse/rendu/Admin : pas de réponse ; renderer flèches/barres/accessibilité, Admin valeurs/ruptures/directions. Positions de pixels calculées par UI.
- État/lot : présent historiques avec écarts, absent natif ; complément Lot 5, adaptation 9 et UI ; calcul des variations différé.

### Tableau de statistiques — informatif ou mathématique

- Données/configuration : en-têtes, lignes/cellules, et distinction de texte/valeur mathématique si un calcul est demandé ; Creator `statsTable.headers/rows`.
- Variables/calculs : substitution des cellules ; moyennes/fréquences/totaux seulement par formules/attendus explicites dans un profil admis, pas automatiquement.
- Validation/instance : grille rectangulaire et bornée, cellules typées, effectifs non négatifs/total non nul si nécessaire à une formule ; préparer cellules affichables.
- Réponse/rendu/Admin : tableau sans correction implicite ; question associée aux résultats. Renderer tableau accessible, Admin grille/labels/formules.
- État/lot : Creator seul, aucun type/rendu élève identifié ; absent natif. Complément Lot 5 et adaptation 9, UI distincte ; aucun module statistique autonome requis.

### Arbre de probabilités — mathématique

- Données/configuration : nœuds/IDs, parent, événement, probabilité d'arête, affichage éventuel des chemins ; Creator `probaTree.nodes`.
- Variables/calculs : substitution ; produits des probabilités de chemin par math commun si demandé. Arbre de données nécessaire pour ce type, sans imposer une hiérarchie d'exercice.
- Validation/instance : racine/parents/IDs, absence de cycle/orphelin, probabilités dans [0,1], sommes sortantes égales à 1 lorsqu'arbre exhaustif ; preuve exacte ou diagnostic indéterminé. Décider les probabilités manquantes avant annonce du profil.
- Réponse/rendu/Admin : pas de réponse automatique ; question liée. Renderer SVG et disposition géométrique, Admin branches/probabilités ; pas de multiplication métier divergente dans l'UI.
- État/lot : Creator calcule des chemins sans validation exhaustive, absent élève/natif. Complément Lot 5, adaptation 9 et UI ; pas de moteur de probabilités séparé.

### Vecteurs — mathématique et géométrique

- Données/configuration : dimension 2/3, noms, coordonnées, affichage normes/coordonnées ; Creator `vector.vectors`.
- Variables/calculs : substitution coordonnées, norme seulement si profil de racine admis ; projection 3D et pixels relèvent du renderer. Un tuple de génération ne devient pas automatiquement un vecteur.
- Validation/instance : dimension/coordonnées, type réel/finitude, budgets ; exactitude d'une norme séparée de son approximation d'affichage.
- Réponse/rendu/Admin : figure sans réponse ; format de réponse vectorielle demanderait un complément de correction explicite. Renderer axes/flèches/projection/labels, Admin coordonnées/options.
- État/lot : Creator, absent élève/natif ; complément Lot 5/adaptation 9/UI. Produit scalaire/vectoriel non observé comme fonction automatique, non ajouté au cœur.

### Plan complexe — mathématique et géométrique

- Données/configuration : points nommés, parties réelle/imaginaire, grille/labels/module/argument ; Creator `complexPlane.points`.
- Variables/calculs : substitution des composantes, module/argument si demandés ; convention/unité d'argument explicitée, zéro sans argument défini. Pas d'algèbre complexe générale déduite de ce dessin.
- Validation/instance : composantes réelles finies, conventions, noms/budgets ; valeur exacte et angle approximatif distincts.
- Réponse/rendu/Admin : points sans correction implicite ; réponse complexe par contrat de question spécifique. Renderer axes/labels, Admin coordonnées/options ; aucun atan2 métier divergent pour une réponse officielle.
- État/lot : Creator, absent élève/natif ; complément Lot 5/adaptation 9/UI, format complexe par complément Lot 6.

Figures géométriques génériques, images ou autres blocs non identifiés restent **inconnus** au regard du catalogue réel, sans nouveau discriminant inventé. Relations/systèmes et suite constituent les formes supplémentaires réellement observées ; introduction/conclusion ne justifient pas un moteur propre.

## 3. Génération et contraintes

La spécification détaillée, les JSON documentaires et les golden vectors restent dans [ADR 006](adr/006-deterministic-generation.md). Les capacités réelles sont : integer, decimal sur grille et choice numérique autonome, Mulberry32 `parameters-v1` ; définition native entière uniquement. Tuple et computed sont absents.

| Mécanisme cible        | Entrée / résultat                                                   | Invariants                                                                             |
| ---------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Aléatoire              | Bornes inclusives entières ou grille décimale ; valeur typée        | Exclusions locales respectées, domaine non vide, zéro/signe par bornes/exclusions      |
| Choix                  | Liste finie de valeurs admises ; une valeur                         | Aucune pondération implicite ou conversion ambiguë de chaîne mathématique              |
| Tuple, mode choix      | Liste de lignes de même arité ; une ligne entière                   | Ordre conservé, arité ≥2 bornée, composantes nommées uniques, tirage atomique          |
| Tuple, mode génération | Domaines de composantes et contraintes de groupe ; tuple            | Même représentation que le mode choix, aucune réparation hors contraintes              |
| Calculé                | Expression CortexJS et références ; valeur exacte dans profil admis | Source/raw, dépendances résolues, domaine contrôlé avant réduction, pas de JS ni clamp |

Proposition technique à revoir avant 4 bis : tuple canonique ordonné avec identité de groupe et noms de composantes scalaires ; le groupe possède les valeurs, les références aux composantes donnent une vue sans copie concurrente persistée. Pas d'indexation, tuple imbriqué ou type par arité. Ce schéma n'est pas encore adopté dans les contrats ; D23 demeure ouvert. Une exclusion de composante s'applique à son domaine, une exclusion de tuple interdit une ligne entière, une contrainte de groupe vérifie la relation entre composantes. Une contrainte globale compare des scalaires ou composantes déclarés, pas un ordre implicite entre tuples.

`a!=0` et `a not in {-2,0,2}` sont des exclusions locales numériques ; `b>a` et `a<b<c` sont des prédicats intervariables (chaîne explicitée en deux relations dans le profil futur) ; `a²+b²=c²` demande des calculs exacts et un prédicat après substitution. Exclusion de tirage ≠ restriction de domaine de l'expression comme x≠0. Aucun solveur général de contraintes.

### Dépendances et valeurs

Collecter les références sur le raw CortexJS et le contexte déclaré, sans recherche regex de symboles. Distinguer paramètres, composantes, computed, variables libres et constantes. Référence inconnue, collision, cycle et dépendance d'un computed scalaire à une variable libre sont diagnostiqués avant tirage. Un tri topologique stable garantit qu'une dépendance est calculée avant son consommateur ; l'ordre déclaré départage les nœuds indépendants et appartient au rejeu. Réordonner le JSON peut changer les tirages, jamais rendre une dépendance valide ou invalide par accident.

Un prédicat entre deux paramètres tirés n'est pas une arête computed : relations mutuelles permises, cycle de calcul interdit. Après substitution : division par zéro, non-fini, complexe dans un domaine réel ou résultat restant symbolique échouent explicitement ; domaine/propriété non démontrés restent indéterminés. Les valeurs transportées sont JSON typé, pas boxed/BigInt/NaN/Infinity. Ratio exact v1 borné disponible pour l'attendu natif ; représentation étendue commune integer/decimal/choice/computed à arrêter avant snapshot étendu. Les noms pédagogiques `delta`, `r1`, `xSommet` ne sont pas des symboles v1 actuellement admis.

### Recherche, déterminisme et échecs

Domaines locaux calculables : sélectionner directement parmi les valeurs admissibles. Proposition pour les groupes : retirer tout le groupe si un prédicat exact est faux ; proposition pour contraintes globales/computed : retirer tous les paramètres aléatoires du candidat puis recalculer le graphe. Flux RNG continu, ordre et nombre maximal de candidats versionnés ; aucune uniformité générale sur les solutions promise. Un événement rare devrait être construit par formules ou tuples connus.

| État                   | Sens / comportement                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| Structure invalide     | Champs/types/références/profil invalides ; arrêt avant recherche                                |
| Domaine prouvé vide    | Preuve sur domaine fini/grille ou cas exact couvert ; échec explicite                           |
| Candidat rejeté        | Condition démontrée fausse ou domaine invalide propre au candidat ; nouvel essai borné possible |
| Condition indéterminée | Ni vrai ni faux démontré ; échec distinct, jamais candidat accepté                              |
| Budget épuisé          | Recherche bornée sans résultat ; aucune preuve d'impossibilité, aucune valeur partielle         |
| Erreur technique       | Bibliothèque/ressources/transport ; ne devient pas impossibilité mathématique                   |

Limites actuelles : seed uint32 ou chaîne canonique, ≤16 paramètres, ≤128 exclusions/choix, entiers ±1 000 000, précision 0…6, coefficients décimaux ±1 000 000 000. Rejet du rang RNG limité à 128 mots : ce n'est pas le budget futur de candidats sous contraintes. Singletons sans tirage, ordre du tableau et golden vectors figés. Aucun `Math.random`, horloge ni PRNG global.

Rejeu : définition/révision/ordre + seed + moteur/CortexJS/génération/instanciation et options compatibles. Une nouvelle version d'algorithme n'offre pas automatiquement le même tirage ; préserver le support ancien ou son snapshot. La version 0.0.0 actuelle est préparatoire et ne garantit pas une compatibilité inter-build à elle seule. Backend conserve l'artefact compatible ou l'état privé nécessaire.

### Recettes de conception, non livrées

| Recette             | Construction                                               | Tests futurs                                                                   |
| ------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Carré parfait       | n entier ; a=n²                                            | Exactitude, non-négativité, cas zéro et exclusions                             |
| Discriminant carré  | a entier non nul, r/s entiers ; b=−a(r+s), c=ars, d=b²−4ac | d=a²(r−s)² ; positif si r≠s, nul sinon ; aucun générateur spécialisé           |
| Carré de binôme     | p/q entiers ; a=p², b=2pq, c=q²                            | Polynôme=(px+q)² ; p≠0 si degré 2 exigé                                        |
| Tuple pythagoricien | Choix (3,4,5)… ou m>n≥1 ; a=m²−n², b=2mn, c=m²+n²          | a²+b²=c², positivité ; primitivité non promise sans conditions supplémentaires |

Un discriminant entier n'est pas forcément carré ; un discriminant nul ne prouve pas que le polynôme négatif est un carré réel. Ces recettes attendent 4 bis/5 étendu et leurs tests de propriétés indépendants.

## 4. Instanciation, validation et correction

Pipeline cible : définition privée → validation structurelle → profils/références/domaines statiques → génération et computed/contraintes → éléments ordonnés → attendus par question → instance privée → projection publique. Préserver définition/source/IDs/ordre ; une seule génération commune. Le détail des étapes et erreurs est dans [lifecycle](exercise-lifecycle.md).

Validation structurelle ne prouve pas valeur/domaine/forme. Validation d'auteur ajoute calcul d'attendus, vérification des configurations et séries bornées de seeds ; cette campagne n'est pas une preuve pour toutes les seeds. Un type connu mais hors profil/capacité du consommateur est refusé explicitement avant publication/adoption, pas ignoré par le renderer. `extensions` conservé ne signifie pas support.

Correction cible : soumission structurée → association officielle → parsing → admissibilité et domaine → preuve de valeur → politique de réponse/forme → résultat. Recueillir les témoins de forme sur source/raw **avant réduction** ; statuer séparément sur la forme après preuve de valeur. Le serveur fournit format, attendu, tolérance et politique.

| Famille / politique            | Règle cible et tests requis                                                                                                                       | État / lot                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Rationnel exact, forme libre   | Rapports exacts bornés ; 2/4 et 1/2 même valeur ; différences démontrées                                                                          | Attendu calculé, correction absente ; 6      |
| Fraction irréductible          | Valeur distincte de forme ; 2/4 valeur correcte mais forme non conforme ; signes/dénominateur/notation définis                                    | Absent ; 7                                   |
| Polynôme rationnel univarié    | Admissibilité raw, degré/coefficient bornés et preuve exacte ; variable au dénominateur refusée/indéterminée                                      | Candidat documenté, pas correcteur ; 6       |
| Développée/réduite/factorisée  | Définir exemples acceptés/refusés, facteurs triviaux et signes ; source/raw, pas simple égalité canonique                                         | Absent ; 7 après arbitrages pédagogiques     |
| Approximation                  | Permission explicite, précision/arrondi, tolérances absolue/relative et unité ; aucune conversion d'une égalité numérique en identité universelle | Absent ; complément 6 motivé par corpus      |
| Intervalle                     | Ordre des bornes, ouvert/fermé, infinis autorisés aux extrémités sans fermeture ; vide/unions à spécifier                                         | Absent ; complément 6/9 selon famille        |
| Ensemble                       | Valeurs admises, ordre ignoré et doublons selon politique explicite ; vide/singleton ; preuve élément par élément                                 | Absent ; complément 6/9                      |
| QCM simple/multiple            | Ensemble exact d'IDs, cardinal/mode ; options affichées indépendantes de leur position ; pas de crédit partiel implicite                          | Absent ; complément discret 6 après 5 étendu |
| Texte                          | Politique explicite de comparaison ; pas d'assimilation silencieuse texte/expression                                                              | Absent ; complément ciblé                    |
| Complexe / solution d'équation | Format/convention/domaine et méthode exacte par famille ; résoudre distinct de comparer                                                           | Absent ; complément ciblé après besoin       |

Décision utilisateur : pour les futures expressions symboliques, **mêmes domaines par défaut** ; une question peut imposer explicitement le domaine de comparaison. `x/x` et `1` ne sont donc pas identiques par défaut. Sous domaine imposé x≠0, une future méthode pourrait démontrer l'équivalence ; elle doit aussi prouver que les deux expressions y sont définies. Cette décision ne crée aucun extracteur universel de domaine. Le premier correcteur rationnel/polynomial doit rester dans ses familles bornées, domaines inconnus → indétermination.

Résultats requis : correct (valeur et forme requise démontrées), incorrect (différence ou violation de forme démontrée, motif distinct), saisie invalide (structure/syntaxe/format), indéterminé (preuve, domaine ou forme inconnus), erreur technique (bibliothèque, deadline, protocole). Attendu officiel invalide est un défaut d'exercice, jamais une faute élève. Non répondu est un état de tentative, pas une correction incorrecte. Méthode/preuve, valeur et forme sont des dimensions séparées ; `isIdenticallyEqual()` seul ou quelques évaluations numériques ne constituent pas une preuve universelle.

Une expression mathématiquement valable mais hors famille supportée n'est pas une faute : la correction reste indéterminée avec motif de non-support. Un rejet du profil de parsing doit préciser syntaxe réellement invalide ou capacité non disponible ; il ne suffit pas à prouver que la valeur élève est fausse. Une forme exigée mais non reconnaissable reste inconnue, pas automatiquement violée.

## 5. Évolutions et limites

Les contrats étendus sont proposés dans [architecture.md](architecture.md#contrats-cibles-documentaires). Liste/sections et premier périmètre sont décidés ; schéma tuple, formats exacts étendus, budgets de candidats et profils de forme restent à revoir avant leur code. Aucun service, dépendance, nouveau repository ou module mathématique par élément ajouté.

Les calculs actuels sont synchrones et bornés structurellement, sans deadline/mémoire préemptive. Isolation terminable à prouver au Lot 8 avant correction officielle. Les huit lignes sont inventoriées et conservées ; seulement une question de 103 est transcrite et instanciée. Les comportements historiques et bugs ne sont pas un oracle ; migration et revue individuelle au Lot 9.
