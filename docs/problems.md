# Registre des problèmes rencontrés

Ce document rassemble les problèmes signalés pendant l'utilisation de Novlearn.
On les consigne d'abord, puis on choisit une correction à la fois et le dépôt
concerné : Engine, Novlearn ou les deux. Une entrée ouverte n'est pas une
correction livrée ni une cause technique définitivement établie.

## Suivi

| Identifiant | Sujet                                                                             | Statut                                        | Emplacement de correction                                   |
| ----------- | --------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- |
| PB-001      | Possibilité de valider plus de deux fois, sans explication du décompte            | Consigné ; règle à clarifier dans l'interface | Novlearn pressenti                                          |
| PB-002      | Messages de saisie et de correction trop peu précis                               | Consigné ; précision à améliorer              | Novlearn pressenti ; diagnostic Engine à vérifier           |
| PB-003      | Bonnes racines rejetées et accolades contraignantes                               | Consigné ; saisie sans accolades souhaitée    | À déterminer : Engine, Novlearn ou définition de l'exercice |
| PB-004      | Réponse manifestement fausse sans verdict « incorrect »                           | Consigné ; cause à diagnostiquer              | À déterminer : Engine, Novlearn ou définition de l'exercice |
| PB-005      | Réponse attendue d'intervalle peu simplifiée et notation de bornes incohérente    | Consigné ; affichage à clarifier              | À déterminer : Engine, Novlearn ou données de l'exercice    |
| PB-006      | Facteurs égaux à 1 conservés dans les expressions affichées                       | Consigné ; simplification visuelle à examiner | À déterminer : Engine ou renderer NovLearn                  |
| PB-007      | Exercice 63 : rendu graphique indisponible (422), puis calcul déjà en cours (429) | Consigné ; graphe à diagnostiquer             | Intégration Engine / exercice ; verrou NovLearn             |

## Contexte commun — 13 novembre 2026

Source observée : deux captures fournies par l'utilisateur, sur
`https://staging.novlearn.fr/exercices`, exercice « Racines Polynome ».
L'identifiant de l'exercice, la définition officielle de l'instance, la source
LaTeX exacte transmise et le diagnostic serveur ne sont pas disponibles dans
ces captures. Les textes visibles ci-dessous sont des transcriptions visuelles.

Énoncé : donner les solutions réelles de `f(x) = 0`, avec
`f(x) = 2x^2 + 16x + 7`.

Les deux racines exactes sont `-4 + 5√2/2` et `-4 - 5√2/2`.

Captures conservées dans le dépôt :

- [Capture 1 : bonnes valeurs, saisie déclarée invalide](assets/problems/2026-11-13-racines-invalid.png).
- [Capture 2 : 12 ; 3, correction sans conclusion](assets/problems/2026-11-13-racines-indeterminate.png).

L'analyse initiale a consulté les sources locales de Novlearn en lecture seule.
Elle ne prouve pas que ces fichiers sont exactement ceux déployés en staging.
Aucune nouvelle réponse n'a été soumise au site pendant cette analyse.

## PB-001 — Plus de deux validations possibles

**Constat.** L'utilisateur peut continuer à soumettre des réponses malgré la
limite annoncée de deux essais.

**Explication trouvée dans le code local.** Dans Novlearn,
`frontend/app/lib/engine/learner.ts` incrémente le compteur seulement pour
`incorrect`. Les états `invalid`, `indeterminate` et `error` ne consomment pas
d'essai. Une réponse correcte termine la question ; deux réponses incorrectes
terminent une question ouverte. Les deux messages des captures n'impliquent
donc pas un essai comptabilisé.

**Suite envisagée.** Rendre ce décompte compréhensible pour l'élève. Aucune
demande de changement de la limite ou de pénalisation des erreurs techniques
n'est actée. Le compteur doit rester décidé côté serveur.

**À vérifier lors de la correction.** Une mauvaise réponse reconnue consomme un
essai ; une saisie inexploitable ou une panne n'est pas présentée comme une
faute mathématique. Le compteur affiché correspond au compteur serveur.

## PB-002 — Messages trop peu précis

**Constat.** Deux messages différents apparaissent sans expliquer comment
résoudre le problème :

- « La saisie est invalide ou incomplète. »
- « La correction ne peut pas conclure. Réessayez. »

**Explication trouvée dans le code local.** Dans Novlearn,
`frontend/app/renderers/QuestionRenderer.tsx` affiche le premier pour `invalid`
et le second pour les autres résultats sans verdict, dont `indeterminate` et
`error`. Une exception affiche encore un autre message d'indisponibilité.
La même phrase peut ainsi masquer plusieurs causes ; réessayer à l'identique
ne résout pas nécessairement le problème.

**Orientation demandée.** Conserver la distinction entre saisie inexploitable
et impossibilité de corriger, tout en améliorant la précision et l'aide à
l'élève. Les formulations finales restent à choisir après diagnostic.

**À vérifier lors de la correction.** Distinguer le format attendu, une saisie
incomplète, une comparaison indéterminée et une panne. Donner une indication
utile lorsqu'elle est connue, sans divulguer la réponse officielle ni
transformer une absence de preuve en verdict « incorrect ».

## PB-003 — Bonnes racines rejetées ; réponse sans accolades

**Constat.** La capture 1 montre les deux bonnes valeurs, séparées par un
point-virgule et sans accolades, puis le message de saisie invalide.

**Vérification locale limitée.** Un appel aux fonctions de préparation du
package Engine 0.2.1 installé dans Novlearn reconnaît ces valeurs avec accolades
comme un ensemble de deux éléments. Sans accolades, la préparation en mode
ensemble renvoie `invalid-syntax` (« A finite set is required. »).
Ce contrôle porte sur une saisie reconstruite, pas sur la requête exacte de la
capture. Il ne démontre pas à lui seul la cause du rejet staging ni une
correction complète de l'exercice.

**Préférence utilisateur à mettre en œuvre ultérieurement.** Ne pas imposer la
saisie des accolades pour une réponse constituée de plusieurs solutions.
L'élève doit pouvoir écrire `a ; b`, notamment
`-4 + 5√2/2 ; -4 - 5√2/2`. Cette simplification de saisie ne supprime pas la
notion mathématique d'ensemble. La compatibilité avec les réponses déjà
écrites avec accolades devra être préservée.

**Diagnostic restant.** Vérifier le type de réponse de l'instance officielle,
la source transmise par MathLive et la responsabilité de l'adaptation entre
interface et moteur. Ne pas attribuer définitivement le défaut à Engine avant
ce contrôle.

**À vérifier lors de la correction.** Accepter les deux bonnes racines sans
accolades, dans les deux ordres ; préserver la source saisie ; rejeter un
ensemble faux ou incomplet par un verdict mathématique lorsque la comparaison
est établie. Une valeur supplémentaire fausse ne doit pas être ignorée.

## PB-004 — « 12 ; 3 » sans verdict mathématique

**Constat.** La capture 2 montre `12 ; 3` puis « La correction ne peut pas
conclure. Réessayez. ». Aucune de ces valeurs n'est une racine : `f(12) = 487`
et `f(3) = 73`.

**Vérification locale limitée.** La saisie reconstruite `12;3` est rejetée par
la préparation numérique scalaire avec `unsupported`, et par la préparation
d'ensemble avec `invalid-syntax` faute d'accolades. Il s'agit de deux profils
distincts ; on ne sait pas lequel a réellement été utilisé en staging.
L'interface regroupe plusieurs états sous le message observé (PB-002).

**Comportement souhaité.** Une fois la liste sans accolades reconnue comme un
ensemble de solutions (PB-003), `12 ; 3` doit recevoir le verdict « incorrect »
et compter comme un essai faux. Ce résultat doit venir d'une comparaison
établie, jamais d'une conversion automatique de `indeterminate` en `incorrect`.

**Diagnostic restant.** Relever la définition officielle, le type de réponse,
la source réellement envoyée et l'état/code de correction côté serveur.
Vérifier ensuite le parcours complet, y compris le décompte d'essais.

## PB-005 — Affichage de l'intervalle attendu

**Constat.** La capture montre une réponse attendue dont la borne apparaît
comme `√(6/(40/1))`, suivie de `∞)` ; l'élève a saisi `[0 ; +∞[`. La fraction
imbriquée est difficile à lire et la notation affichée juxtapose une borne
gauche avec crochet et une borne droite avec parenthèse.

**Preuve conservée.** [Capture du résultat « Calcul d'une dérivée seconde »](assets/problems/2026-11-13-interval-display.png).
Elle montre la réponse affichée et la saisie, mais ne donne pas l'identifiant
de l'exercice, la formule mathématique interne de la borne, ni la convention de
notation configurée pour cet exercice.

**Vérification mathématique de l'expression visible.** En supposant que la
fraction sous la racine est bien `6/(40/1)`, elle se simplifie en `3/20` ; une
forme plus lisible est `√(3/20)` (ou `√15/10`). Cette lecture transcrit le
rendu de la capture et reste à confirmer avec la valeur officielle.

**Comportement souhaité.** Afficher les fractions et expressions de la réponse
attendue sous une forme simplifiée et lisible, dans les limites du profil de
présentation retenu. Employer une notation d'intervalle cohérente avec la
convention française de l'exercice — par exemple `[a ; +∞[` — ou rendre le choix
de notation attendu explicite. Ne pas déduire de la seule capture que la borne
`0` proposée est correcte : elle paraît différente de la borne affichée.

**Diagnostic restant.** Comparer la valeur officielle, son LaTeX et le rendu
MathLive/MathText ; déterminer si la présentation inattendue vient de la
sérialisation Engine, du renderer Novlearn ou d'une définition officielle trop
peu lisible.

**À vérifier lors de la correction.** La forme simplifiée reste exactement
équivalente à la valeur attendue, les crochets indiquent correctement
l'inclusion ou l'exclusion des bornes, et la saisie dans la convention affichée
est comprise par la correction.

## PB-006 — Facteurs égaux à 1 dans les expressions affichées

**Constat.** Dans la question « Suite géométrique », la capture montre parmi les
propositions `uₙ = 1 × 4ⁿ`, `uₙ = 1n⁴` et `uₙ = 4 × 1ⁿ`. La présence du facteur
`1` alourdit l'écriture et peut brouiller la lecture des propositions.

**Preuve conservée.** [Capture des propositions sur la suite géométrique](assets/problems/2026-11-13-unit-factor-display.png).

**Comportement souhaité.** À l'affichage, omettre un facteur multiplicatif
égal à `1` quand cette simplification conserve la même expression : `1 × 4ⁿ`
devient `4ⁿ`, `1n⁴` devient `n⁴`, et `4 × 1ⁿ` se réduit à `4` dans le domaine
usuel de l'exercice. Préserver les coefficients différents de 1 et ne pas
réécrire la source ou les données pédagogiques officielles.

**Diagnostic restant.** Déterminer si ces formes viennent des chaînes de
réponses enregistrées ou de la sérialisation/rendu mathématique. Le problème
semble lié à la présentation, mais la capture seule ne permet pas d'attribuer
la correction à Engine ou au renderer NovLearn.

**Vérification du code local — 13 novembre 2026.** Pour les QCM adaptés depuis
les données historiques, `src/adapters/legacy/adapter.ts` enregistre le texte
des options tel qu'il est fourni. `src/instantiation.ts` substitue les
paramètres des options textuelles, mais conserve leur texte ; l'instance
publique transmet ce contenu. Côté NovLearn, `frontend/app/lib/engine/exerciseView.ts`
enveloppe le texte comme contenu d'option, puis `frontend/app/components/ui/MathText.tsx`
envoie le LaTeX extrait à KaTeX sans simplification algébrique. L'origine la
plus probable des `1` visibles est donc le texte LaTeX source de la proposition
(ou le composant d'affichage), pas le calcul du verdict de correction Engine.
La source exacte de cet exercice n'a pas été identifiée dans le catalogue local.

**Orientation.** Le moteur valide un QCM à partir des identifiants d'options
attendus ; il ne recalcule pas le texte ni le contenu des distracteurs. Une
réécriture algébrique automatique dans le cœur Engine pourrait modifier la
présentation pédagogique et ne respecte pas la conservation de la source. Pour
ces choix statiques, corriger le LaTeX de la donnée source est la piste la plus
directe ; si l'on souhaite une règle globale, définir et qualifier séparément
une normalisation de présentation dans le renderer.

**À vérifier lors de la correction.** La simplification concerne uniquement
l'affichage, reste mathématiquement équivalente dans le domaine de l'exercice,
et ne change ni la valeur ni le caractère correct ou incorrect des choix.

## PB-007 — Exercice 63 indisponible, puis calcul signalé en cours

**Constat.** La capture de staging (`/exercices?id=63`) montre l'interface
« Un calcul est déjà en cours. Réessayez après sa fin. » La console contient
un `POST /api/exercises` en HTTP 422 avec « Rendu graphique indisponible. »,
puis un HTTP 429 avec le message « Un calcul est déjà en cours ». La page ne
parvient pas à afficher l'exercice.

**Preuve conservée.** [Capture de l'exercice 63 et de la console](assets/problems/2026-11-13-exercise-63-graph-busy.png).

**Diagnostic du code local.** Le chemin Engine de NovLearn ouvre l'exercice,
instancie le contenu, puis échantillonne chaque élément graphique. Dans
`frontend/app/lib/engine/learner.ts`, un résultat d'échantillonnage absent,
`unsupported`, ou incohérent avec l'instance produit le 422 « Rendu graphique
indisponible ». Les contrats de sampling du package Engine prévoient eux-mêmes
un état `unsupported` : ce refus peut donc être une limite du profil de graphe,
pas nécessairement une panne du calcul. Le verrou de concurrence qui renvoie
429 est défini côté serveur NovLearn dans
`frontend/app/lib/engine/guards.ts`. La capture ne prouve pas à elle seule que
la seconde requête est un retry du même appel, ni que le 422 a libéré le verrou
au moment du retry.

**Attribution provisoire.** Le 422 est produit par l'intégration de NovLearn
quand le sampling du graphique ne passe pas ses contrôles ; la capacité
mathématique est fournie par Engine. Le 429 vient du garde de concurrence
NovLearn. Le symptôme visible dépend donc au minimum de deux couches. Il faut
examiner la définition officielle de l'exercice 63 et le résultat de sampling
pour établir si le graphe est hors profil, si la définition est invalide ou si
une régression touche le chemin d'échantillonnage.

**Diagnostic restant.** Obtenir de staging la version de définition utilisée,
ses fonctions et sa fenêtre, le diagnostic structuré de `sampleDisplayGraph`,
et les journaux horodatés des requêtes 422/429. Comparer au profil documenté
dans Engine, sans soumettre de réponse d'élève ni modifier le staging.

**À vérifier lors de la correction.** Un graphe pris en charge s'affiche ; un
graphe réellement hors profil reçoit une explication claire et ne déclenche pas
une boucle de retry/concurrence trompeuse. Tout refus reste explicite et ne
devient pas un faux succès.

## Ajouter les prochains signalements

Conserver les entrées et leurs identifiants, même après résolution. Pour chaque
nouveau problème, noter la date, la page et l'exercice, la saisie visible ou
exacte selon la preuve disponible, le résultat observé, le résultat souhaité,
les captures éventuelles et les incertitudes. Choisir le dépôt de correction
après diagnostic. Lors de la résolution, ajouter les changements, les contrôles
réellement exécutés et l'état de déploiement, sans confondre correction locale
et correction disponible sur le site.
