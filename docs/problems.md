# Registre des problèmes rencontrés

Ce document rassemble les problèmes signalés pendant l'utilisation de Novlearn.
On les consigne d'abord, puis on choisit une correction à la fois et le dépôt
concerné : Engine, Novlearn ou les deux. Une entrée ouverte n'est pas une
correction livrée ni une cause technique définitivement établie.

## Suivi

| Identifiant | Sujet                                                                             | Statut                                                                  | Emplacement de correction              |
| ----------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------- |
| PB-001      | Possibilité de valider plus de deux fois, sans explication du décompte            | Règle serveur conforme ; explication UI à transmettre                   | Novlearn                               |
| PB-002      | Messages de saisie et de correction trop peu précis                               | États distincts disponibles ; correspondance UI à transmettre           | Novlearn                               |
| PB-003      | Bonnes racines rejetées et accolades contraignantes                               | Corrigé dans Engine local ; staging non qualifié                        | Engine, puis adoption Novlearn         |
| PB-004      | Réponse manifestement fausse sans verdict « incorrect »                           | Corrigé dans Engine local ; staging non qualifié                        | Engine, puis adoption Novlearn         |
| PB-005      | Réponse attendue d'intervalle peu simplifiée et notation de bornes incohérente    | Valeur officielle manquante ; attribution impossible                    | Donnée officielle ou renderer Novlearn |
| PB-006      | Facteurs égaux à 1 conservés dans les expressions affichées                       | Source exacte manquante ; règle globale à qualifier                     | Donnée du QCM ou renderer Novlearn     |
| PB-007      | Exercice 63 : rendu graphique indisponible (422), puis calcul déjà en cours (429) | Cause du 422 identifiée ; correctif Engine local, staging à requalifier | Engine et intégration Novlearn         |

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

## Audit et correction Engine — 14 novembre 2026

### PB-001 — Limite d'essais

Lecture du code local Novlearn (source de travail, déploiement non vérifié) :
`frontend/app/lib/engine/learner.ts` ajoute un essai seulement si le résultat
serveur est `incorrect`. `correct` termine la question ; deux `incorrect`
terminent une question libre ; `invalid`, `indeterminate` et `error` gardent
le compteur. La règle serveur observée respecte donc la demande. L'affichage
ne montre qu'un bouton « Réessayer » et un compteur restant implicite ; le
parcours staging n'a pas été retesté. Correction applicative à transmettre.

### PB-002 — Messages et diagnostics

Le moteur expose déjà `state` et un code de diagnostic à l'intérieur du résultat de
correction (`correct`, `incorrect`, `invalid`, `indeterminate`, `error`). La
préparation de saisie expose en plus les catégories `empty`, `incomplete`,
`invalid-syntax`, `unknown-symbol`, `unsupported`, `limit` et
`technical-error`. La projection publique ne contient ni corrigé ni politique.
Le renderer local Novlearn regroupe actuellement `indeterminate` et `error`
dans le message « La correction ne peut pas conclure. Réessayez. » ; les
exceptions réseau ont une autre branche. Aucun nouveau contrat Engine n'est
nécessaire. La correspondance d'affichage et une liste blanche de codes sans
divulgation sont à réaliser côté Novlearn.

### PB-003 / PB-004 — Liste de solutions

Correction Engine : le profil officiel `set` accepte désormais une expression
scalaire comme singleton ou l'AST CortexJS d'une séquence délimitée par `;`.
Les accolades restent admises, l'entrée source n'est pas réécrite, et le profil
`intervals` n'utilise pas cette interprétation. La vérification exacte donne
`incorrect` à `12;3`, à un singleton ne contenant qu'une racine et à une liste
avec une valeur supplémentaire ; une comparaison non prouvée reste
`indeterminate`. Une séquence incomplète est `invalid`. Le cas des deux racines
de la capture est reconstruit depuis l'image : le LaTeX exact envoyé par
MathLive et la définition staging restent inconnus. Le code local n'établit
donc pas encore que la capture a été corrigée sur staging.

### PB-005 — Réponse attendue et intervalles

La capture confirme le rendu visuel `√(6/(40/1))` puis `[a, ∞)` ; elle ne
fournit ni définition/version, ni LaTeX officiel. Engine sérialise la
présentation mathématique par CortexJS, mais les preuves disponibles ne
permettent pas d'affirmer que l'attendu officiel vaut `√(6/(40/1))`, ni de
distinguer une source officielle maladroite d'une transformation du renderer.
Pas de changement de présentation Engine sans la définition et le parcours
exact. Le cas `[a ; +∞[` relève aussi de l'intégration du parseur d'intervalle
et de la convention de rendu effectivement configurée.

### PB-006 — Facteurs égaux à 1

Le code Novlearn local transmet les choix au renderer MathText/KaTeX et
l'instanciation Engine conserve les chaînes des options après substitution.
L'image ne prouve pas la source de l'exercice, son type de contenu ni que ces
fichiers sont ceux de staging. Une simplification algébrique automatique des
propositions dans Engine pourrait modifier une forme pédagogique et créer des
choix visuellement identiques. Aucune transformation n'est ajoutée. Il faut
retrouver la définition officielle ou qualifier explicitement une passe de
présentation côté renderer, avec détection de collision sans changement d'ID
ni de correction.

### PB-007 — Graphique 63 et concurrence

La capture montre les HTTP 422 puis 429, mais pas la définition utilisée ni la
réponse structurée de sampling. Le code local Novlearn rejette un résultat de
sampling qu'il ne peut pas attacher à la projection ; cela n'établit pas une
régression Engine. `withEngineJob` produit le même 429 si le même propriétaire
a déjà un travail ou si les deux places globales sont occupées ; les preuves
actuelles ne distinguent pas ces cas. Ne pas modifier le profil de sampling ni
les limites. Il faut obtenir la définition/version, fonctions, fenêtre,
résultat et diagnostics du sampler, puis les heures et propriétaires (sans
données privées superflues) des requêtes. Novlearn doit également afficher un
message distinct selon la cause de concurrence.

**Mise à jour du diagnostic — 17 novembre 2026.** La définition active lue en
staging est l'exercice 63, version `ab854a70-88f5-4455-8960-fec693ad7359`,
révision 1, empreinte `72b6b7781d692a3d0c9d1b3198bdaa3d364ba761a0f433c43ef71a4f16434d5b`.
Son élément graphique couvre `[-3,3]` et contient
`(x/3)\\sqrt[3]{x^2}-2\\sqrt[3]{x}`. CortexJS analyse ces racines comme des
opérations `Root` d'indice 3, mais le profil Engine précédent rejetait tout
indice autre que 2. Le 422 est donc expliqué par une limite du profil, pas par
une saturation de sampling.

Le correctif local autorise l'indice entier 3, dont le domaine réel inclut les
radicandes négatifs ; l'indice 2 conserve son garde `radicand >= 0`, et les
autres indices restent refusés. Un test de régression reprend la fonction et la
fenêtre staging, compare les 65 valeurs à `Math.cbrt` et vérifie 64 segments.
La correction est seulement locale : aucune release ni adoption staging de
cette extension n'est faite. Le 429 visible reste à qualifier côté Novlearn,
car ses journaux et la corrélation des deux requêtes ne sont pas disponibles.

### Transmission à Novlearn

Les fichiers locaux observés sont des indices de travail, pas une preuve de
leur identité avec staging. Pour qualifier et corriger le parcours consommateur :

1. **PB-001** — Garder l'autorité du compteur au serveur. Confirmer que seuls
   `incorrect` incrémente ; afficher `attempts` et la limite de deux de façon
   compréhensible. Garder `invalid`, `indeterminate`, `error` et les erreurs
   réseau sans pénalité. Tester les cinq états avec des réponses serveur et le
   rejeu de session.
2. **PB-002** — Mapper `correct`/`incorrect` à leur retour ; `invalid` à une
   aide au format ou à la complétion selon une liste blanche de codes ;
   `indeterminate` à une comparaison non concluante sans le présenter comme
   faux ; `error` et HTTP 5xx à une indisponibilité technique. Ne pas conseiller
   de répéter la même saisie en cas d'indétermination, ne pas exposer l'attendu,
   la politique ou les diagnostics privés. Tester aussi une exception réseau.
3. **PB-003/004** — Construire un tarball Engine local depuis le commit de
   correction, relever son SHA-256, mettre à jour la dépendance et le manifeste
   du consommateur, puis vérifier la définition officielle de l'exercice,
   l'entrée MathLive exacte, les deux ordres, `12;3`, une racine seule, une
   valeur en trop, les accolades, une syntaxe incomplète, une comparaison
   indéterminée et le compteur. Refaire ensuite le parcours HTTP sur staging ;
   ne déclarer résolu sur le site qu'après ce test.
4. **PB-005** — Joindre l'ID/révision et l'attendu serveur exact, puis comparer
   `source`, `displayLatex`, `revealedAnswer`, la transformation `formatForDisplay`
   et le rendu MathText. Si la source vaut bien `√(6/(40/1))`, vérifier une
   présentation équivalente à `√(3/20)` et une convention d'intervalle française
   cohérente, sans changer l'ouverture de borne.
5. **PB-006** — Retrouver les données et IDs officiels du QCM. Corriger la source
   pédagogique si elle comporte les facteurs parasites, ou qualifier une passe
   purement visuelle dans le renderer. Comparer les expressions avant/après au
   moyen de CortexJS dans le domaine défini ; bloquer la publication si deux
   choix deviennent identiques, sans changer identifiants ou clé de correction.
6. **PB-007** — Capturer la définition/version servie (fonctions, domaine,
   fenêtre), le résultat et les diagnostics de `sampleDisplayGraph`, ainsi que
   les heures et propriétaires des deux requêtes. Reproduire localement avec le
   même snapshot et comparer au profil. Distinguer refus de sampling, saturation
   globale et travail déjà actif du même utilisateur. Garder quotas et
   concurrence inchangés ; tester le refus explicite, l'absence de retry en
   boucle et un graphe pris en charge.

Après correction, joindre les preuves d'adoption du tarball exact et du
parcours staging. Aucune capture seule ne suffit à marquer un problème résolu
sur staging.

## Ajouter les prochains signalements

Conserver les entrées et leurs identifiants, même après résolution. Pour chaque
nouveau problème, noter la date, la page et l'exercice, la saisie visible ou
exacte selon la preuve disponible, le résultat observé, le résultat souhaité,
les captures éventuelles et les incertitudes. Choisir le dépôt de correction
après diagnostic. Lors de la résolution, ajouter les changements, les contrôles
réellement exécutés et l'état de déploiement, sans confondre correction locale
et correction disponible sur le site.
