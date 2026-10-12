# ADR 012 — Formes pédagogiques sur syntaxe originale

> Statut documentaire : **Active** (revue du 12 octobre 2026). La décision reste applicable avec les extensions ultérieures. Les mentions de lots futurs, de nombres d’exports et de validation décrivent la date de chaque section ; [l’architecture](../architecture.md) et [les capacités](../features.md) décrivent l’état actuel.

Décision M5 du 11 octobre 2026, CDC 7.6. L'utilisateur confirme une
**factorisation complète sur ℚ, sous profil borné**. Les choix locaux ci-dessous
sont explicites et réversibles ; aucun correcteur universel de formes n'est annoncé.

`GradingPolicy.form` conserve `value-only` et admet `irreducible-fraction`,
`expanded`, `reduced`, `factorized`, un choix `{kind:'accepted-forms',anyOf:[...]}`
ou des références privées `{kind:'accepted-latex',latex:[...]}` (1–16 sources).
Les trois formes polynomiales portent exclusivement sur `expression` ; fraction
sur rational/real. Références explicites sur rational/real/expression. Contrat de
soumission, schéma 5 et sept fonctions runtime conservés. Exact/approché et
tolérances réutilisent M3, indépendamment de la forme.

## Représentation et résultats

La source et `math.syntax` brutes sont conservées lors de l'admission. Chaque
témoin structurel utilise cette syntaxe originale, jamais un résultat réduit.
Les opérations Cortex sur coefficients et PGCD viennent après la reconnaissance
de la structure concernée ; l'encodage rationnel exact des décimaux est partagé.
Les parenthèses de groupement sont transparentes, slash/frac et multiplication
explicite/implicite relèvent du même opérateur. Aucun parseur supplémentaire,
transformation algébrique regex, ordre de termes imposé ou calcul flottant de preuve.

`CorrectionResult.form` : not-required/conforming/nonconforming/unknown. La preuve
de valeur reste dans `proof` ; un code form-nonconforming/form-proof indique le
motif lorsque la forme change le verdict. Valeur égale + forme violée donne
incorrect avec **value equal** ; forme inconnue donne indeterminate avec value
equal. Dans un profil approché, conserver within-tolerance. Une valeur différente
prouvée reste incorrect même si sa forme est inconnue. Erreur de bibliothèque
reste error, saisie inadmissible traitée avant les formes. Pas de points applicatifs.

## Fractions

Entier signé borné, ou division de deux entiers signés littéraux, dénominateur non
nul. PGCD Cortex exact égal à 1. Entier seul admis comme dénominateur 1 ; zéro
admis en entier ou 0/1. Signe du dénominateur libre : irréductibilité n'impose pas
de normalisation du signe. Négations extérieures et groupements tolérés.
2/4 est non conforme ; 0.5 est une autre notation non conforme ; 1.0/2.0 et
(1+1)/4 sont hors reconnaissance de la fraction littérale, donc inconnus.
Le profil d'admission M3 conserve les limites numériques et vérifie le domaine.

## Développée et réduite

Développée : somme/soustraction de monômes dans la variable officielle. Produits
de monômes et puissances positives littérales de monômes admis ; aucune somme
contenant cette variable dans un produit/une puissance/un quotient, ni négation
de somme à distribuer. Calculs de coefficients fermés tolérés : (2+1)x est développé.
x+x et x*x sont développés. x-(x²+1), -(x+1), (x+1)/2 et (x+1)² ne le sont pas.

Réduite : développée, degrés distincts, monôme écrit variable ou puissance
littérale 2–16, éventuellement coefficient rationnel irréductible/decimal exact
non nul, non unitaire explicite. Division d'un monôme par entier non unitaire
admise si coefficient/dénominateur premiers entre eux. Ordre des termes libre.
x/2 et (1/2)x admis ; x*x, x+x, 1x, 0x, x^1, x+0, coefficient calculé non
réduit, divisions par unité et plusieurs signes moins dans un monôme refusés.
Zéro littéral seul (entier ou décimal) admis. L'inconnu d'un coefficient
se propage dans son produit. Aucun degré déduit par comparaison numérique.

## Factorisée complète sur ℚ

Produits, puissances positives et signes décomposés seulement sur l'arbre visible.
Chaque facteur non constant doit être irréductible : degrés 1 admis, degré 2 par
discriminant rationnel exact (négatif ou racine carrée exacte non rationnelle).
Discriminant nul/carré rationnel : facteur réductible donc forme violée.
Facteur de degré ≥3 : inconnu ; absence de racine rationnelle ou résultat Factor
inchangé ne prouve rien. x⁴+4 en particulier reste inconnu, malgré sa factorisabilité.

Les scalaires non nuls sont des unités sur ℚ, extraction du contenu entier non
exigée : 2x+4 est un facteur linéaire complet. Constantes seules et zéro seul sont
triviaux admis ; facteur zéro dans un produit refusé. x² admis comme x à puissance2,
x²+1 irréductible admis, x²−1 refusé, (x−1)(x+1) et (x+1)² admis. Ce choix ne
demande pas une factorisation sur ℝ ni une extraction systématique des signes.

## Alternatives officielles

`accepted-forms` exprime OU entre 1–4 familles distinctes : une preuve vraie suffit ;
à défaut, un inconnu conserve unknown ; toutes fausses donnent nonconforming.
`accepted-latex` est une liste de structures explicites : chacune doit prouver
l'égalité **exacte** et le même domaine que l'attendu lors de l'instanciation et
à nouveau depuis le snapshot officiel à la correction. Référence fausse,
indéterminée ou mal formée : défaut officiel, jamais correction élève fausse.

Paramètres substitués par Cortex raw sans réduction ; autres littéraux et leur
notation conservés. Signature brute : groupement transparent, opérateur de produit
unifié, rationnel inséré représenté par fraction (dénominateur1 → entier).
Ordre des opérandes, additions, coefficients et négations restent significatifs.
Une référence 2(x+1) ne permet ni 2x+2 ni x+x+2 sans référence supplémentaire.
La source n'est pas comparée comme chaîne LaTeX ; aucune distribution, fusion de
termes ou simplification de fraction implicite. Sources/politiques jamais projetées.

## Preuves et limites

`tests/forms.test.ts` : formes/valeurs distinctes, signes/groupements/zéro/unités,
décimaux originaux, trous/domaine et refus de références, paramètres officiels,
choix alternatifs, erreurs/indétermination et projection. Oracles indépendants
PGCD entier et discriminant quadratique. Suites de régression M3/M4 conservées.
Budgets AST128/profondeur16 et degré16 existants, contextes Cortex locaux bornés.
Préemption réelle reste M8 ; aucune nouvelle dépendance. Bilan exécuté et commit
dans progress.md après validation complète, pas de migration historique.
