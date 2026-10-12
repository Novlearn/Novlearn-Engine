# ADR 005 — Frontière scalaire LaTeX v1

> Statut documentaire : **Active** (revue du 12 octobre 2026). La décision reste applicable avec les extensions ultérieures. Les mentions de lots futurs, de nombres d’exports et de validation décrivent la date de chaque section ; [l’architecture](../architecture.md) et [les capacités](../features.md) décrivent l’état actuel.

## Extension M7 — observations MathLive réelles

[Banc et preuves](../mathlive-compatibility.md) : MathLive 0.111.1 isolé,
45 observations réelles API/clavier/collage/virtuel, deux sorties par observation.
Admission des alias de délimiteurs via dictionnaire CortexJS local ; aucune
réécriture. Garde lexicale de scripts vides (groupes/blancs/espaces échappés)
avant raw, car Cortex peut les supprimer. Source de soumission intacte et budgets
inchangés. Placeholder anonyme refusé même sans prompt ID. Tests supplémentaires
de fermeture et décimal français ; parsing toujours distinct de valeur/domaine.

## Extension M1 — noms descriptifs (11 octobre 2026)

D36 étend la grammaire à `[a-z][A-Za-z0-9]{0,31}` avec noms réservés exclus,
paramètres et variables libres distincts. `\mathrm{nom}` passe par le dictionnaire
CortexJS de chaque appel, entrées `expression` littérales et déclarées ; aucun
second parseur ou remplacement algébrique. `ab` reste a×b, `\mathrm{ab}` le nom
déclaré. Le nom infinity est réservé indépendamment de sa casse, conformément aux
sondes de la version épinglée. Les espaces qu'accepte Cortex dans les wrappers
n'affectent pas l'exactitude de leurs chiffres ; source conservée intégralement.

La [documentation officielle sur les symboles personnalisés](https://cortexjs.io/compute-engine/guides/augmenting/)
documente les wrappers multilettres. L'API réellement utilisée est
`ce.latexSyntax.addEntries` des déclarations installées 0.151.0, vérifiée par
sondes locales ; `kind:'symbol'` ne suffit pas à supplanter les alias d'unités,
`kind:'expression'` fonctionne sur les profils testés. Pas de dictionnaire global,
assignation, évaluation ou canonicalisation au parsing. Les garanties/budgets de
scalar-latex-v1 et les vecteurs courts restent inchangés ; extension additive.

Les sections ci-dessous décrivent la livraison historique du Lot 3 avant M1.

Statut historique : retenu, 10 octobre 2026, pour le Lot 3 seulement.

`parseMathInput(source, context)` ajoute une seule entrée au package. Résultat discriminé par `ok`, source intégrale sur succès et échec, profil `scalar-latex-v1`, MathJSON détaché et symboles classés, ou diagnostics bornés. Les noms sont les lettres minuscules du contrat v1, hors e/i, au plus 16 paramètres et 16 variables disjoints. Le contexte est explicite et ne porte aucune valeur ; aucun nom inconnu n'est implicitement déclaré. Les opérateurs intégrés sont distingués des symboles ; Pi et ExponentialE sont les seules constantes admises. i/e nus sont inconnus, ImaginaryUnit et les infinis hors profil.

La version installée 0.151.0 expose `parse(source, { form: 'raw' })` dans ses déclarations. Les sondes ont comparé raw et canonical : raw conserve Divide(x,x), Add(1,2), Divide(2,4), Negate(Power(2,2)), tandis que canonical produit respectivement 1, 3, Rational(1,2), −4. L'option ancienne `canonical:false` de la documentation Web ne figure plus dans cette API typée : les premières sondes qui la passaient en JavaScript ont été remplacées par des sondes explicites `form`. La documentation officielle [forme canonique](https://cortexjs.io/compute-engine/guides/canonical-form/) est un contexte conceptuel, pas la référence de signature pour ce package épinglé.

Chaque appel crée un ComputeEngine distinct, configure le séparateur décimal natif `{,}`, puis parse en raw. Aucun appel à canonical, simplify, evaluate, N, assign ou substitution. La source reste la référence : raw est une syntaxe CortexJS, pas un arbre LaTeX fidèle aux espaces/commandes. Un succès n'établit aucune validité de domaine, forme pédagogique, valeur ou preuve. Ainsi 1/0 et √(−1) restent parsables ; leurs domaines seront vérifiés avant réduction dans les lots d'exécution. Aucun objet boxed ni instance moteur n'est exporté ; MathSyntax est un alias du type MathJSON fourni par CortexJS, sans AST propriétaire. Une mise à jour CortexJS exige le rejeu des tests de profil et une revue du contrat.

## Profil et observations locales

| Cas                                                                                    | Comportement retenu                                                                   |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Entiers, point décimal, notation scientifique CortexJS                                 | Syntaxe numérique sans calcul ; précision de sérialisation dépend de CortexJS         |
| `1{,}25`                                                                               | Décimal français natif ; aucune réécriture                                            |
| `1,25`, `(1,2)`                                                                        | `unsupported` : virgule nue ambiguë, pas de choix automatique                         |
| `1{,}`, `1.`                                                                           | `incomplete` : garde lexicale, car CortexJS peut supprimer un séparateur final        |
| Fractions frac/dfrac/tfrac, puissances, sqrt/root                                      | Support scalaire ; opérandes conservés en raw                                         |
| Parenthèses, left/right, produits explicites/implicites, signes                        | Support sous réserve de la syntaxe réellement produite                                |
| Espaces simples et commandes usuelles de spacing                                       | Acceptés si CortexJS les absorbe ; un nœud HorizontalSpacing résiduel est hors profil |
| Placeholder MathLive, square/Box                                                       | `incomplete` avant parsing : un placeholder peut disparaître même en raw              |
| Fraction/opérande absent, exposant absent, opérateur final                             | `incomplete` ; codes CortexJS exacts et garde de fin d'opérateur                      |
| Parenthèse incorrecte ou fermante superflue, `@a`                                      | `invalid-syntax` ; pas de conversion legacy implicite                                 |
| Commande inconnue, texte, fonction trigonométrique, liste, relation, commentaire LaTeX | `unsupported`, même si CortexJS sait parfois les parser                               |
| Symbole absent du contexte                                                             | `unknown-symbol`, nom et chemin MathJSON                                              |
| Pi / ExponentialE                                                                      | Constantes admises ; aucun calcul                                                     |
| i/e nus, NaN nu                                                                        | Symboles inconnus (NaN nu est un produit de lettres dans CortexJS)                    |
| ImaginaryUnit, infinis, objets numériques non finis                                    | Hors profil ; aucun fallback                                                          |
| 1/0, √(−1), x/x                                                                        | Syntaxe admise, domaine non analysé ; aucun verdict mathématique                      |

Les gardes lexicales vérifient commandes, placeholders, commentaires, décimaux incomplets, virgules et budget de groupement sans transformer la source ni reconstruire un parseur. Le parcours MathJSON accepte uniquement les opérateurs scalaires documentés et les nombres/symboles du profil. Les diagnostics sont stables : empty, incomplete, invalid-syntax, unknown-symbol, unsupported, limit, invalid-context. Les erreurs CortexJS ne sont pas exposées ; les erreurs imprévues de bibliothèque deviennent invalid-syntax sans détails internes. L'incomplétude n'est pas détectable parfaitement pour toute chaîne LaTeX : les parenthèses mal appariées restent invalid-syntax selon le diagnostic observé, et les commandes hors profil sont unsupported. Il ne s'agit pas d'une garantie générale sur le LaTeX MathLive.

## Budgets et suite

4096 unités UTF-16 de source ; 32 niveaux de groupement vérifiés avant parsing ; 512 nœuds et profondeur 64 de MathJSON après parsing ; 16 diagnostics au plus. Les objets numériques MathJSON peuvent encoder de grands nombres sans les évaluer : ces budgets ne constituent pas les futures bornes arithmétiques. Le parcours est borné mais le parsing CortexJS est synchrone : aucune garantie de deadline, mémoire ou préemption. Un timeout de promesse ne suffit pas ; isolation terminable différée au Lot 8.

Le Lot 4 doit conserver paramètres et variables libres distincts, garder la source et ce profil lors du futur rejeu, et ne pas tirer de valeurs hors contraintes. RNG/encodage seed et ordre des tirages restent à décider. La politique de domaine, les bornes de calcul et les extensions de famille devront être décidées avant correction/substitution ; aucune de ces capacités n'est livrée ici. Aucun exercice historique migré et aucun Lot 4 commencé.
