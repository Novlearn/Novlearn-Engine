# Lot 2 — Corpus reçu et premier contrat

Le 10 octobre 2026, l'utilisateur a fourni `docs/exercises_rows.json` et autorisé sa lecture pour reprendre le Lot 2. Il contient huit lignes, pas huit fichiers séparés. La préparation initiale sans corpus est consignée dans progress.md ; les observations ci-dessous la remplacent pour l'état courant. Aucun adaptateur de migration, calcul, génération ou correcteur n'est implémenté dans ce lot.

## Provenance et conservation

- Source reçue : `docs/exercises_rows.json`, 14 583 octets.
- SHA-256 : `0f4d1173a78f9bd41e88678704c212c5147627e7e5a42ee28eb398f25f41c3ae`.
- Copie byte-identique : `tests/fixtures/legacy/exercises_rows.original.json`.
- Identifiants reçus : 1, 6, 36, 64, 78, 96, 103, 106.
- Application/table distante, date d'export, révision historique et versions des générateurs : non fournies. `created_at` est une valeur du document, pas une preuve de révision ni date d'export.

Les originaux sont exclus de Prettier. L'inventaire dérivé [inventory.json](../tests/fixtures/legacy/inventory.json) contient **558 entrées**, incluant conteneurs, champs de ligne et chemins du contenu/compétences décodés. Chaque entrée indique ligne, scope, JSON Pointer, type observé et statut `preserved-original`. Le scope `row` désigne le document reçu ; `content` et `competences` désignent les données issues d'un décodage JSON explicite. Aucune clé n'est renommée dans l'original. Les tests vérifient empreinte, couverture des chemins et aller-retour des données ; ils ne prouvent pas une migration de comportements.

## Enveloppe et champs communs

Chaque ligne possède exactement les dix champs suivants. Tous sont préservés dans l'original ; seuls les champs explicitement cités dans la transcription de 103 alimentent la fixture native.

| Champ                         | Type observé                     | Traitement dans ce lot                                                  |
| ----------------------------- | -------------------------------- | ----------------------------------------------------------------------- |
| `id`                          | nombre entier                    | Identifie la ligne historique ; référence de provenance privée pour 103 |
| `created_at`                  | chaîne                           | Conservé ; pas de révision immuable déduite                             |
| `title`                       | chaîne                           | Titre natif de 103, identique à la source                               |
| `chapter`, `difficulty`       | chaînes                          | Métadonnées conservées ; pas de taxonomie native supposée               |
| `competences`                 | chaîne contenant un tableau JSON | Décodage documentaire et inventaire ; chaîne originale conservée        |
| `content`                     | chaîne contenant un objet JSON   | Décodage documentaire et inventaire ; chaîne originale conservée        |
| `app_title`                   | chaîne                           | Conservé ; ne pas confondre avec `apptitle`                             |
| `Is_Flash`, `Need_Calculator` | booléens                         | Conservés ; collisions signalées, aucune priorité automatique           |

`content` contient `elements` et `variables`. Chaque élément a `id`, `type`, `content`. Seuls text, question, mcq et graph sont observés ici ; les familles supplémentaires présentes dans le code voisin ne font pas partie du corpus reçu.

| Structure décodée   | Champs observés                                                                                    | Traitement                                                                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| text.content        | `text`                                                                                             | Source originale conservée ; texte de 103 reformulé explicitement pour la fixture native                                                                 |
| question.content    | `hint`, `points`, `question`, `explanation`, `answerFormat`, `correctAnswer`                       | Tous conservés ; points/texte de question et ID de 103 repris, attendu transcrit séparément ; hint/explanation ne sont pas des champs publics implicites |
| mcq.content         | `question`, `options`, `multipleChoice` ; `hint`, `explanation`, `multipleAnswers` selon l'élément | Conservé, hors contrat initial ; les flags ne sont pas fusionnés                                                                                         |
| mcq.options[]       | `text`, `correct`, parfois `id`                                                                    | Conservé ; IDs manquants signalés ; aucun ID généré ni correction QCM promise                                                                            |
| graph.content       | `xMax`, `xMin`, `yMax`, `yMin`, `showGrid`, `functions`                                            | Conservé, non pris en charge par le contrat initial                                                                                                      |
| graph.functions[]   | `color`, `expression`                                                                              | Conservé ; aucun renderer ou interpréteur ajouté                                                                                                         |
| variables[]         | `id`, `max`, `min`, `name`, `type`, `choices`, `decimals`, `exclusions`, `expression`              | Tous conservés ; seuls les trois paramètres entiers de 103 sont transcrits dans la fixture native                                                        |
| content additionnel | `apptitle` (64), `isFlash` (78/103/106), `needCalculator` (78/103/106)                             | Conservé ; aliases éventuels et collision de 103 signalés                                                                                                |

Tous les paramètres ont `choices: []` et `decimals: 2`, y compris les integer/computed : aucun champ inactif n'est supprimé. Les exclusions sont des chaînes, notamment `"4;9"`, `"0"`, `"@a"`. Elles ne constituent pas une même politique native. `answerFormat: "number"` couvre infini, logarithme, racine, rationnel et exponentielle ; il ne suffit pas à déterminer une stratégie de correction.

## Huit rapports de compatibilité

| Ligne                                   | Éléments ; paramètres                                                            | Lecture et statut                                                                                                                                                                                                                                                 |
| --------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Limite usuelle logarithme 1         | text/question ; a entier 0…10                                                    | Limite à droite de ln(t)/t : −∞. Infini et logarithme hors famille initiale ; `ln` dans le texte à qualifier au parsing futur                                                                                                                                     |
| 6 — Equation 2                          | text/question ; k entier 1…1000                                                  | Solution ln(k), domaine réel cohérent k≥1. Logarithme hors correction rationnelle initiale                                                                                                                                                                        |
| 36 — QCM asymptote à une fonction 2     | text/mcq ; a entier, b=a²+1, c=2a, d=−a computed                                 | Dénominateur (x+a)²+1 positif, f(x)~x ; absence d'asymptotes proposées cohérente. Computed/QCM différés ; quatre options sur six sans ID                                                                                                                          |
| 64 — signe dérivée 3                    | text/graph/question/mcq ; aucun paramètre                                        | f=sin(2,5x²), sept zéros de dérivée sur [−2,2] : 0 et ±√(π/5), ±√(3π/5), ±√π. Graphe/QCM différés ; quatre options sur six sans ID ; `apptitle=""` différent de `app_title`                                                                                       |
| 78 — Suite récurrente point fixe 1      | text/question/mcq/mcq ; k entier 2…15 excluant 4/9, u0 entier 1…5                | Racine et QCM différés. **Collision réelle pour u0=1** : options u0 (true) et 1/u0 (false) valent toutes deux 1. Dernier QCM : une option sans ID. `multipleAnswers=false` et `multipleChoice=false` présents au premier QCM ; doubles flags d'exercice cohérents |
| 96 — Raisonnement par récurrence suite  | text/question ; k entier 1…8, L=2k computed, u0 entier 0…3                       | **Énoncé incohérent pour k=1,u0=3** : L=2, u0>L, u1=2,5<u0. La limite 2k reste vraie ; ne pas reprendre l'affirmation admise de croissance sans revoir les contraintes                                                                                            |
| 103 — Extremum d'un trinôme avec graphe | text/graph/question ; a entier 1…3, b entier −6…6 excluant 0, c entier −5…5      | Première question native retenue. **Collision `Is_Flash=true` / `content.isFlash=false`**, sans priorité choisie. Graphe conservé et signalé hors contrat initial                                                                                                 |
| 106 — Dérivée fonction avec logarithme  | text/question/question ; a entier 1…4, b entier 1…6 excluant @a, c=−a−b computed | Dérivée/racine exponentielle cohérentes sur x>0. **c toujours négatif malgré min=1/max=10** : rôle des bornes computed à clarifier. Exclusion dépendante, logarithme et forme e^k différés                                                                        |

Pour 64, « dérivée négative sur [−1/2,0] » est cohérent au sens ≤0 : elle est strictement négative avant 0 et nulle en 0. Ce n'est pas déclaré comme erreur sans politique de signe strict. Pour 78, les exclusions de carrés empêchent le point fixe entier, mais ne résolvent pas la collision de distracteurs.

La lecture mathématique ci-dessus est une analyse indépendante, pas un test du moteur. Les autres dépôts restent sources en lecture seule. Computed n'est jamais exécuté comme JavaScript. Les contraintes, formes et domaines non explicités restent ouverts pour ces familles.

## Première question native : minimum du trinôme (103)

La fixture [rational-minimum.definition.json](../tests/fixtures/contracts/rational-minimum.definition.json) est une **transcription manuelle revue**, pas le résultat d'un importeur automatique ni la migration de l'exercice complet.

| Source de 103                                         | Transcription native et justification                                                                                                                                        |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| title                                                 | Repris exactement                                                                                                                                                            |
| id=103, elements[2].id=1780008000003                  | Identité native distincte, question identifiée par sa valeur historique et provenance en extension privée                                                                    |
| created_at                                            | Pas de révision déduite : nouvelle révision native liée à l'empreinte du corpus et à la transcription v1                                                                     |
| variables a/b/c                                       | `kind: integer`, bornes reprises ; exclusions `""` → [], `"0"` → [0] uniquement pour ce cas revu                                                                             |
| elements[0].content.text                              | Reformulation en texte + source mathématique séparée `a x^2 + b x + c` ; variable contextuelle x réelle explicitement déclarée                                               |
| elements[2].content.question/points                   | Repris exactement                                                                                                                                                            |
| elements[2].content.correctAnswer                     | Source `\frac{-@b}{2*@a}` préservée ; transcription native `\frac{-b}{2a}` avec paramètres déclarés. Aucune transformation regex utilisée                                    |
| answerFormat=number et consigne « valeur de x0 »      | Nouvelle politique native : valeur rationnelle exacte, forme libre (`value-only`), pas d'exigence de fraction irréductible. La consigne ne demande aucune forme particulière |
| elements[1] graph ; hint/explanation ; metadata/flags | Conservés dans l'original, non convertis dans cette question minimale. Le graphe n'est pas requis pour le calcul analytique ; aucune migration intégrale annoncée            |

Avec a>0, la fonction est totale sur ℝ et possède un minimum unique, atteint en −b/(2a)∈ℚ. b=0 reste exclu conformément à la source, même si la formule mathématique resterait définie. c participe à l'énoncé sans intervenir dans l'abscisse attendue. Paramètres a/b/c et variable x sont distincts ; la réponse attendue est scalaire, sans variable libre. La source est décodée par JSON.parse deux fois (ligne puis content) ; la commande frac comporte alors **un seul backslash**, sans passe supplémentaire d'unescape.

## Contrat v1 et validation runtime

`validateDefinition(unknown)` accepte uniquement le contrat natif `schemaVersion: 1`, `kind: rational-value`. Définition privée : identité/révision, titre, paramètres integer, variables contextuelles, texte/source LaTeX de l'énoncé, question unique, attendu privé et politique fixe. `extensions` est un objet JSON privé et non interprété ; toute autre clé inconnue, y compris un alias historique, produit un diagnostic. Aucun alias n'est converti silencieusement.

Limites v1 : textes/sources ≤4096 caractères ; identifiants/révision et clés d'objet ≤128 ; collections JSON ≤128 entrées, profondeur ≤16, budget ≤10 000 nœuds ; ≤16 paramètres et ≤16 variables. Les clés trop longues sont signalées au chemin parent sans recopier leur contenu dans le diagnostic. Symboles : une lettre latine minuscule, e/i réservés ; noms uniques et disjoints. Entiers entre −1 000 000 et 1 000 000, min≤max, exclusions numériques uniques dans la plage, au moins une valeur admissible. Points entiers positifs. Ces choix bornés servent le premier cas, pas toutes les variables historiques comme u0.

Les validateurs renvoient `{ok:true,value}` (copie détachée) ou `{ok:false,diagnostics}` avec chemins JSON Pointer. Ils acceptent uniquement des données JSON finies et inertes : pas de cycles, classes, getters, fonctions, symboles, tableaux creux ni clés dangereuses `__proto__`/`constructor`/`prototype`. Ils conservent exactement les chaînes et extensions admises. Aucune normalisation, interprétation du LaTeX ou preuve de cohérence mathématique n'est effectuée : une source malformée peut passer la validation structurelle et devra échouer à la frontière mathématique du Lot 3.

`validateSubmission(unknown)` accepte uniquement version, instanceId, questionId et `{format:latex,source}`. Source brute conservée, y compris vide/incomplète, ≤4096 caractères. Les champs client seed/policy/verdict/parameters/expectedLatex/extensions sont refusés. Un succès ne prouve ni que l'instance existe ni que la réponse est mathématiquement admissible ; le serveur doit retrouver son état officiel.

`PrivateInstanceV1` décrit un snapshot privé de définition, versions moteur/génération, seed, valeurs, affichage et attendu. `PublicInstanceV1` décrit seulement version, instanceId, titre, énoncé et question (id/texte/points). Ce sont des types préparatoires ; il n'existe pas encore de constructeur/projection ni de validateur runtime d'instance. La protection réelle de projection sera testée au Lot 5, celle de correction serveur après isolation. Les extensions et explications legacy ne doivent jamais être transmises automatiquement.

## Bilan de passage

Les huit lignes sont classées et tous les chemins conservés/inventoriés ; collisions et limites sont explicites. Le contrat minimal natif et les deux validateurs sont testés sur la question choisie. ADR 004 consigne la décision. Aucune migration de comportement des huit exercices n'est validée ; elle relève du Lot 9. Prochain lot proposé : Lot 3 (frontière mathématique), sans lancement automatique.
