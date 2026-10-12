# ADR 011 — Correction algébrique, domaines et collections M4

> Statut documentaire : **Active** (revue du 12 octobre 2026). La décision reste applicable avec les extensions ultérieures. Les mentions de lots futurs, de nombres d’exports et de validation décrivent la date de chaque section ; [l’architecture](../architecture.md) et [les capacités](../features.md) décrivent l’état actuel.

D39, 11 octobre 2026 ; CDC 4.2–4.4, 5.2–5.3, 6.2, 7.3–7.4.
Contrat canonique 5, correcteur commun, sept exports runtime inchangés.

## Contrats et domaine officiel

QuestionResponse.kind expression reste le polynôme ; branches additives
rational-expression, equation, inequality, set, intervals en LaTeX. Domaines
de politique : polynomial, rational-function, equation, inequality, set, intervals.
ExpectedAnswer expression/algebra/collection conserve une trace JSON math, jamais
d'objet boxed. La soumission M3 ne choisit ni famille ni politique.

response.variable choisit une inconnue réelle déclarée. Une seule inconnue réelle
peut être implicite ; plusieurs imposent un choix explicite. Les autres inconnues
et les paramètres officiels ne sont pas déclarés dans la réponse élève. Une
expression constante sans inconnue reste possible, sans inventer de symbole public.

policy.comparisonDomain = {variable, excludedLatex} impose ℝ moins des points
réels finis, sans variables libres (paramètres officiels admis). Sans ce champ,
comparer les domaines complets. Avec lui, prouver que les deux expressions sont
définies partout sur le domaine imposé ; sinon l'attendu fait échouer
l'instanciation atomique. Aucun intervalle de domaine ou hypothèse arbitraire.

CorrectionResult ajoute domain same/different/restricted/unknown/not-applicable
et value equal-on-common-domain : x/x contre 1 est incorrect, domaine différent
mais mêmes valeurs sur le domaine commun ; correct sur ℝ\{0} imposé. Une
différence de domaine ne devient pas une fausse différence de valeurs.
Forme value-only conservée jusqu'au M5.

## Preuves rationnelles univariées

Parsing Cortex local → source/MathJSON raw → encodage exact → substitution
officielle → inspection récursive avant Together/coefficients/réduction.
Chaque dénominateur raw et base de puissance non positive fournit ses zéros
interdits ; restrictions des sous-termes conservées même dans 0/x et facteurs
annulés. 0/0, 0^0 et sqrt(-1)^2 invalides avant réduction.

Coefficients rationnels exacts bornés, degré structurel ≤16, puissances entières
−16 à 16. Dénominateurs variables et puissances variables non positives dans
rational-function seulement. sqrt(4) peut fournir un coefficient prouvé ;
irrationnels comme coefficients, radicaux variables, multivarié, exp/log/trig
hors preuve M4. sqrt(x²) contre x reste indéterminé. Fonctions au M6.

Cortex Together rassemble les fractions et polynomialCoefficients extrait les
coefficients ; zéros initiaux conservés par Cortex retirés après preuve exacte.
Polynômes : tous coefficients du résidu nuls. Fractions : produits croisés puis
preuve polynomiale, domaines comparés séparément. Un coefficient non nul prouve
une différence sur un domaine réel cofini. Aucun échantillonnage, opération
polynomiale maison, réécriture LaTeX ou isIdenticallyEqual universel.

Zéros interdits : degré 0/1/2 rationnel, produit raw de tels facteurs, puissance
positive d'un tel facteur (parenthèses transparentes admises). Une fraction au
dénominateur conserve ses propres trous ; ses zéros proviennent de son numérateur
Cortex après Together. Identiquement nul : non défini. Un dénominateur développé
de degré supérieur à 2 reste indéterminé, sans extracteur universel de domaine.

## Relations et solutions

Equation : Equal binaire ; inequality : Less/LessEqual/Greater/GreaterEqual/
NotEqual binaire. Relations imbriquées refusées. Membres polynomiaux, différence
de degré effectif 0/1/2 : coefficients Cortex, discriminant et formule quadratique
par arithmétique/racine Cortex, cas constants/linéaires/quadratiques complets.
Signes des régions et racines doubles distingués ; solutions normalisées et
comparées, domaine imposé éventuellement retiré. Aucun solve() générique.
x²=0 et x=0 ont les mêmes solutions sans résidus proportionnels.

Réponse de solutions : set/intervals et attendu connu dans ce format. Réponse
d'équation : equation ; aucune conversion implicite d'ensemble en équation ou
résolution universelle de l'énoncé. Racines quadratiques dans ensembles/intervalles
sous preuve : un polynôme affine a+b√d via Cortex, coefficients rationnels exacts,
comparaison exacte q√d contre rationnel. Pas d'évaluation flottante de l'expression
entière avant cette preuve ; radicaux incompatibles inconnus.

## Ensembles et intervalles

Ensembles finis réels : \{a,b\} ou \{a;b\}, emptyset/varnothing. Ordre et répétitions
ignorés mathématiquement. Chaque membre admis avant comparaison ; couverture
réciproque par preuve d'égalité, jamais une différence par cardinalité inconnue.
Tuples/collections imbriquées ne sont pas des scalaires ; parenthèses transparentes.

Intervalles français [a;b], ]a;b[, [a;b[, ]a;b] et unions \cup via entrées matchfix
du dictionnaire Cortex local. Le handler reçoit le corps Sequence Cortex et
construit Interval/Open sans découper/réécrire la source. Groupements transparents,
virgule décimale {,} distincte des séparateurs. Set de points peut devenir une
union d'intervalles singletons fermés dans le profil intervals.

Bornes ordonnées exactement ; a>b invalide, a=a fermé singleton, sinon vide.
∞ ouvert exclusivement, −∞ à gauche et +∞ à droite. Tri/fusion de données :
contact fusionné si au moins un côté fermé, trou conservé si les deux ouverts.
Fermetures/composantes/bornes invariantes après normalisation exacte ; comparaison
inconnue indéterminée. Tous les scalaires admis avant élimination de composantes.

Reserialization interne : options Cortex multiply/invisibleMultiply \cdot et
digitGroupSeparator vide pour la relecture interne uniquement ; affichage par
défaut Cortex conservé. Aucun produit explicite ne devient une juxtaposition
ambiguë ni des chiffres groupés absents de l'entrée ; source/AST entier conservés.
Un préfixe de nombre mixte 1\frac{1}{2}x reste ambigu : ajouter une variable ne
choisit pas entre nombre mixte et produit.

## Budgets et qualification

Budgets cumulés : source ≤4096, AST ≤128/profondeur16, ratios initiaux ≤10^9,
preuve dérivée ≤256 bits, degré ≤16 (produits croisés ≤32), ≤64 membres/points/
composantes. AST/profondeur limitent parfois les unions avant64 ; aucun support
de64 intervalles arbitraires promis. CE local iterationLimit1024/recursionLimit64.
Pas de préemption : timeout Vitest/promesse ne coupe pas le calcul synchrone.

algebra-grading/collection-grading : oracles BigInt d'expansion et signes/membership,
coefficients mutés, solutions prescrites, trous raw/imposés, fermeture/contact,
indétermination, échecs atomiques, canaris publics, JSON et récupération de panne.
LaTeX multidigits avec accolades ; fixtures synthétiques, aucun exercice historique
migré. MathLive réel, isolation/transport serveur et autres lots restent requis.
