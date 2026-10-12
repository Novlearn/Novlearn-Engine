# ADR 010 — Correction numérique et discrète, M3

> Statut documentaire : **Active** (revue du 12 octobre 2026). La décision reste applicable avec les extensions ultérieures. Les mentions de lots futurs, de nombres d’exports et de validation décrivent la date de chaque section ; [l’architecture](../architecture.md) et [les capacités](../features.md) décrivent l’état actuel.

Statut : retenue localement, schéma canonique 5, package privé 0.1.0. D38.
Les exigences P0/P1 des lots M4–M12 restent obligatoires ; ce profil ne constitue
pas la V1 complète ni une autorisation d'adoption sans isolation.

## Contrat et autorité

Sept fonctions runtime, dont `gradeAnswer(instanceOfficielle, soumissionUnknown)`.
Résultat JSON schemaVersion 5 par instanceId/questionId : correct, incorrect,
invalid, indeterminate ou error ; valeur, comparaison, forme, méthode et code
distincts. Aucun attendu, source privée, politique, seed ou trace dans le résultat.
Une réponse dans la tolérance est `within-tolerance`, pas une identité exacte.
La forme reste `not-required` sous value-only ; politiques de forme au M5.
Une saisie vide est invalid/empty-answer ; non répondu appartient aux tentatives.

Soumission : latex/text avec source inchangée, ou selection avec optionIds.
Clés inconnues, doublons, autorité client et accessors refusés par la copie inerte.
Les IDs désignent l'état officiel, indépendamment de la position de la question
et de l'ordre des options. gradeAnswer suppose le snapshot de serveur de confiance ;
il ne valide pas son origine, ses droits ou une signature client. M8/M11 fournissent
l'hôte et les scénarios officiels. Le cœur demeure synchrone sans interruption
préemptive : aucun timeout de promesse n'est présenté comme une isolation.

Question : response rational/real/extended-real/expression (latex), ou text ;
expectedLatex ou expectedTexts, jamais les deux. Domaine/format/politique cohérents
vérifiés runtime. Instanciation atomique ; profils real fermés avec source/syntaxe/
substitution/affichage privés, variantes textuelles par templates ordinaires.
QCM mathématiques gardent leur profil d'options rationnelles exactes existant.
Projection par sélection, y compris le nouveau response text et les objets imbriqués.

## Admission réelle et preuve

Parsing CortexJS raw local `numeric-latex-v1`, mêmes gardes lexicales/encodeur exact
et substitution Cortex que les autres profils. Bare `e` est une constante explicite
dans ce profil ; le parseur public scalaire et les noms réservés restent distincts.
Décimaux 0–6 places, AST ≤128 nœuds/profondeur 16, sources/rendu ≤4096.
Produit implicite devant un radical explicite admis ; juxtaposition d'un entier
et d'une fraction numérique reste ambiguë et demande une multiplication explicite.

Arithmétique réelle fermée, racines carrées et puissances entières −16…16.
Descendants admis et domaines vérifiés avant toute réduction du parent :
dénominateur prouvé non nul, radicande prouvé non négatif, base non nulle pour
puissance non positive. sqrt(-1)^2, 0*(1/0), 0^0 restent invalides. Non-nullité
ou signe non prouvés → indétermination de la saisie, échec d'instanciation officielle.
Ratios/radicandes normalisés ≤10^9 ; preuves dérivées de tolérance ≤256 bits pour
composantes BigInt. Calculs/objets Cortex locaux ; aucun boxed dans les exports racine.

Lane exacte Cortex NumericValue : entier sûr ou isExact, !isComplex, fini,
asExact rationnel×sqrt(entier). eq/lt/gt entre ces témoins exclusivement ; jamais
comparaison d'un float, jamais isEqual/isIdenticallyEqual comme preuve générale.
Comparaisons de radicaux distincts couvertes par l'ordre exact de cette lane SDK.
Une somme de radicaux incompatibles demeure symbolique. Une identité structurelle
fermée après admission est recevable seulement si chaque feuille numérique du
résultat est exacte ; résultats approximatifs exclus. Une différence de structure
ne prouve pas une différence de valeur.

π/e : identités fermées exactes, ou encadrements certifiés pour les expressions
affines rationnelles d'UNE constante. Cortex polynomialCoefficients établit la
forme affine ; substitution Cortex aux deux bornes et signe exact du coefficient
donnent l'encadrement. π dans (3141592/10^6,3141593/10^6), e dans
(2718281/10^6,2718282/10^6), utilisés conservativement comme bornes fermées.
Tests BigInt indépendants : formule de Machin, série alternée arctan avec reste ;
série factorielle de e et majoration géométrique de la queue. Sources primaires :
[constantes NIST DLMF](https://dlmf.nist.gov/3.12),
[calcul arctan](https://dlmf.nist.gov/4.45),
[définition exponentielle](https://dlmf.nist.gov/4.2).
π+e, π² ou un résultat proche des bornes sans identité/preuve suffisante restent
indéterminés. Ces limites ne sont pas annoncées comme des comparaisons supportées.

## Tolérance, infinis et correction discrète

Mode exact par défaut. Mode approximate officiel : A + R*|attendu|, inclusif.
A et R sont des chaînes décimales exactes non négatives (six places) ; A≤10^6,
R≤1. Aucun epsilon global, arrondi implicite ou fallback flottant. Les inégalités
sont calculées avec Cortex et témoins exacts ; identité préalable, différence de
radicaux de même base et comparaison rationnel/radical sont couvertes. Encadrements
affines : bande contenant toutes les valeurs possibles → correct ; disjonction
prouvée → incorrect ; frontière traversée → indeterminate. Un attendu nul utilise
sa bande absolue, sans division par zéro ni tolérance relative fictive.

Infinis : uniquement l'AST explicite de ±infty, signes/groupements transparents
admis, uniquement extended-real. Comparaison spéciale exacte indépendante d'une
tolérance finie. 1/0 n'est jamais un infini recevable ; arithmétique avec infini
reste hors profil et ne produit aucun verdict de différence par défaut.

QCM : ensemble exact d'IDs, ordre ignoré, IDs inconnus/doublons/cardinal invalides,
aucun score partiel implicite. Texte : variantes privées autorisées, comparaison
stricte par défaut ; trim, collapseWhitespace, ignoreCase et unicodeNFC optionnels
explicitement configurés. Accents préservés ; aucune proximité sémantique libre.

Syntaxe/format/domaine réellement invalide → invalid. Profil/domaine/preuve
inconnu → indeterminate. Différence prouvée seule → incorrect. Exception Cortex,
attendu officiel non préparé ou état officiel incohérent → error ; récupération
à l'appel suivant testée. Les erreurs techniques du parseur ont un diagnostic
technical-error distinct des MathJSON Error d'une source mal formée.

## Validation

Fixtures synthétiques M3, aucun historique migré. Tests positifs/négatifs,
contre-exemples domaine, limites, erreurs injectées, exact vs approché, bornes
inclusives et cas indéterminés ; oracles BigInt indépendants. Tests de transport,
autorité client, permutation des IDs, injection de secrets/projection détachée,
templates/rejeu/JSON et exports du package. Preuves de commandes et commit dans
progress.md ; aucune CI distante ni suite navigateur implicite.
