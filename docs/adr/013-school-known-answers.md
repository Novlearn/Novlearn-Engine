# ADR 013 — Fonctions usuelles et réponses connues du lycée

> Statut documentaire : **Active** (revue du 12 octobre 2026). La décision reste applicable avec les extensions ultérieures. Les mentions de lots futurs, de nombres d’exports et de validation décrivent la date de chaque section ; [l’architecture](../architecture.md) et [les capacités](../features.md) décrivent l’état actuel.

Décision M6, CDC 4.2/4.3/7.3/7.5. CortexJS 0.151.0 reste l'unique bibliothèque
mathématique. Aucun solveur de limite ou de dérivée n'est ajouté.

`parseMathInput(source, context, 'school-latex-v1')` lit les fonctions
ln/log/exp/sin/cos/tan, la constante e et les limites. Le profil par défaut
`scalar-latex-v1` conserve son admission arithmétique. Une lecture réussie ne
prouve aucune valeur, aucun domaine ou résultat de limite.

Une limite est admise uniquement sous la structure CortexJS
`Limit(Function(body, variable), target[, direction])`. Le symbole lié doit être
une variable libre déclarée, jamais un paramètre généré. La cible doit être
fermée après substitution des paramètres ; direction absente, +1 ou −1. Les
fonctions anonymes arbitraires, intégrales et opérateurs de dérivation restent
hors profil. `to` et `rightarrow` sont des conventions de lecture CortexJS.

Un élément `expression` peut déclarer `mode:'display'` : substitution raw sans
évaluation, domaine `formulaDomain:'unverified'` dans la projection publique.
Sans ce mode, le parcours polynomial exact existant reste inchangé. Les
fragments riches et champs de formules avancés utilisent la même admission de
présentation. La source, l'AST original et substitué restent privés ; seuls le
LaTeX affichable et les champs publics sélectionnés sortent du moteur. Une cible
dirigée est parenthésée uniquement au rendu pour que les cibles négatives
conservent leur direction à la relecture ; aucune transformation algébrique.

Pour les réponses numériques fermées, les descendants bruts sont contrôlés
avant canonicalisation, y compris sous un produit nul. Ln/Log/Lb/Lg exigent un
argument strictement positif démontré ; une base explicite doit être positive
et différente de un. Exp est strictement positive après admission de son
argument réel fini. Sin/Cos acceptent un argument réel fini. Tan exige une
preuve exacte de cos(argument)≠0 : zéro démontré est invalide, preuve absente
indéterminée. Les juxtapositions avec une fonction nommée sont des produits,
mais les préfixes numériques ambigus comme `1\frac{1}{2}\sin(0)` restent refusés.

L'évaluation exacte CortexJS réutilise les certificats numériques M3 : rationnel
ou q√d exact, identité structurelle fermée après admission du domaine, ou bornes
certifiées existantes. Aucun `.N()`, échantillonnage ou flottant n'est utilisé
pour prouver une égalité. Les valeurs usuelles ln(1), ln(e), exp(0), exp(1),
logarithmes de puissances exactes et coordonnées usuelles du cercle sont testées
contre des attendus indépendants. `ln(2)` et `sin(1)` identiques et définis sont
comparables par structure ; contre une valeur distincte non démontrée, le verdict
reste indéterminé. `tan(1)` reste indéterminée faute de preuve de non-pôle dans
ce profil. Aucune précision approchée des transcendantes n'est annoncée.

La fixture native synthétique `school-known-answers.definition.json` démontre
f(x)=ln(x−a)/(x−a) pour x>a, la substitution et sérialisation de sa limite droite,
et la correction de l'attendu officiel −∞. Le moteur ne prouve pas cette limite.
Elle démontre aussi une dérivée polynomiale attendue connue, comparée par M4.
Les dérivées transcendantes non couvertes par M4 restent indéterminées. Ce test
ne constitue ni adaptation ni migration d'une ligne historique.

Les budgets M3 restent applicables (entrée, AST, littéraux, puissances,
coefficients/radicaux). Les limites affichées conservent le budget display M2.
L'interruption effective reste M8. Preuves locales et état de validation dans
[progress](../archive/progress.md), [tests](../../tests/school-math.test.ts).
