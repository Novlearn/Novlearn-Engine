# NovLearn Exercise Engine
## Cahier des charges fonctionnel et technique — Objectifs V1

**Statut :** spécification cible à confronter au code et à la documentation existants  
**Date :** 11 octobre 2026  
**Projet :** `novlearn-exercise-engine`  
**Périmètre :** moteur mathématique partagé, sans développement des interfaces utilisateur définitives

---

# 1. Vision du projet

## 1.1 Objectif principal

Créer une bibliothèque TypeScript robuste, indépendante et réutilisable permettant de définir, générer, instancier, valider et corriger des exercices mathématiques de niveau lycée.

Le moteur sera utilisé par :

- **NovLearn** : application élève.
- **NovLearn Admin** : création, édition, prévisualisation et publication d'exercices.
- **NovLearn Duels** : exercices communs et correction officielle côté serveur.
- Potentiellement d'autres applications à l'avenir.

Il doit fonctionner avec le backend FastAPI existant, sans devenir lui-même une application web.

## 1.2 Objectif pédagogique

Le moteur doit permettre de construire des exercices mathématiques variés :

- Exercices flash.
- Exercices à une question.
- Exercices à plusieurs questions.
- Exercices comportant des contenus mathématiques complexes.
- Problèmes longs organisés en sections.
- Exercices aléatoires ou paramétrés.
- QCM.
- Exercices nécessitant des réponses exactes ou approchées.
- Exercices imposant éventuellement une forme mathématique particulière.

Le moteur doit assurer une correction fiable **sur les familles mathématiques officiellement prises en charge**.

Il n'a pas vocation à résoudre automatiquement tous les problèmes de mathématiques.

## 1.3 Principes non négociables — P0

- Une seule logique de calcul et de correction pour les applications.
- CortexJS privilégié pour la représentation et les opérations mathématiques.
- Aucun second CAS ou interpréteur mathématique propriétaire.
- Pas de duplication de logique entre Creator, NovLearn et les duels.
- Résultats exacts lorsque mathématiquement possible.
- Pas d'acceptation d'une réponse sans justification mathématique suffisante.
- Diagnostic explicite lorsqu'une opération dépasse le périmètre supporté.
- Conservation des informations mathématiques et de leur domaine.
- Générations reproductibles.
- Contrats versionnés.
- Compatibilité avec les exercices historiques.
- Séparation des données publiques et des réponses privées.
- Code modulaire, typé, testé et sans surarchitecture.

---

# 2. Structure des exercices

## 2.1 Modèle général — P1

Chaque exercice doit pouvoir contenir :

- Un identifiant stable.
- Une version de définition.
- Des métadonnées de catalogue.
- Des variables paramétrées.
- Des contraintes de génération.
- Une liste ordonnée d'éléments typés.
- Une ou plusieurs questions.
- Les réponses attendues.
- Les politiques de correction.
- Des explications ou indications facultatives.

Les métadonnées doivent pouvoir représenter notamment :

- Titre.
- Chapitre.
- Difficulté.
- Compétences.
- Type d'exercice, notamment flash ou classique.
- Besoin de calculatrice.
- Autres attributs réellement utilisés dans NovLearn.

Les métadonnées applicatives de recherche, publication et progression ne doivent pas devenir des responsabilités du moteur mathématique.

## 2.2 Questions multiples — P1

Un exercice peut avoir plusieurs questions partageant les mêmes variables.

Chaque question doit disposer :

- D'un identifiant stable.
- D'un énoncé.
- D'un format de réponse déclaré.
- D'une réponse attendue privée.
- D'une politique de correction indépendante.
- D'indications et explications facultatives.
- De données pédagogiques complémentaires lorsqu'elles sont nécessaires.

Le système ne doit jamais supposer qu'un exercice possède une seule question.

Une question doit pouvoir être corrigée indépendamment des autres.

Les réponses peuvent être soumises séparément ou dans une soumission contenant plusieurs questions.

## 2.3 Problèmes longs — P1/P2

**P1 :**

- Liste ordonnée d'éléments.
- Sections et parties explicites.
- Variables communes à l'exercice.
- Plusieurs questions par partie.
- Références stables entre éléments.
- Réponses attendues fondées sur des valeurs théoriques calculées.

**P2 :**

- Variables propres à certaines sous-parties.
- Parties imbriquées arbitrairement.
- Génération conditionnelle d'une question suivant une réponse précédente.
- Parcours pédagogique dynamique.

Ne pas construire une arborescence ou un moteur de workflow complexe pour la V1.

---

# 3. Génération des variables

## 3.1 Quatre mécanismes fondamentaux — P1

Le système doit reposer sur quatre mécanismes génériques :

### Aléatoire

- Entiers.
- Décimaux sur une grille de précision définie.
- Bornes inclusives ou règles explicitement documentées.
- Signes positifs et négatifs.
- Domaine non vide.
- Exclusions.

### Choix

- Liste explicite de valeurs.
- Choix reproductible.
- Exclusions applicables.
- Diagnostic si aucune valeur valide n'est disponible.

### Tuple

- Un mécanisme générique pour doublets, triplets et n-uplets.
- Choix parmi des tuples prédéfinis.
- Génération des composantes sous contraintes.
- Conservation des liens entre composantes.
- Aucune combinaison accidentelle de composantes issues de groupes différents.

La plage d'arité effectivement supportée doit être documentée et testée.

### Calculé

- Expression dépendant de variables déjà générées ou calculées.
- Dépendances multiples.
- Tri topologique.
- Détection des cycles.
- Références inconnues signalées.
- Calculs mathématiques exacts dans les profils supportés.
- Utilisation des composantes de tuples.

## 3.2 Contraintes et exclusions — P1

Pouvoir exprimer :

- Une valeur interdite.
- Plusieurs valeurs interdites.
- Des bornes.
- La positivité ou négativité.
- La non-nullité.
- Des comparaisons entre variables.
- Des comparaisons avec constantes.
- Des contraintes entre composantes de tuples.
- Des contraintes sur des variables calculées.
- Des prédicats arithmétiques déclaratifs dans un sous-ensemble borné.

Exemples :

- `a != 0`
- `a not in {-2, 0, 2}`
- `a < b`
- `a <= b`
- `a^2 + b^2 = c^2`
- `delta >= 0`

Aucune génération invalide ne doit être retournée.

La génération doit être atomique : toutes les variables sont valides, ou l'ensemble échoue.

## 3.3 Exactitude et reproductibilité — P0

- Seed explicite.
- Algorithme de tirage versionné.
- Ordre de tirage documenté.
- Budgets de tentatives explicites.
- Même définition, même seed et mêmes versions compatibles : même résultat.
- Pas de `Math.random()` indépendant.
- Aucun fallback violant les contraintes.
- Distinction entre domaine prouvé impossible et recherche épuisée.
- Préservation des entiers, décimaux exacts et rationnels.
- Snapshot JSON stable.

## 3.4 Exemples mathématiques obligatoires — P1

Le système doit construire par composition :

- Nombres carrés parfaits.
- Trinômes avec discriminant carré parfait.
- Trinômes à racines entières.
- Carrés de binômes.
- Triplets pythagoriciens.
- Variables dépendantes en chaîne.
- Contraintes sur des résultats calculés.

Ne pas introduire un type de générateur spécifique à chaque exemple.

## 3.5 Nommage — P1

Permettre un adressage non ambigu des paramètres.

Objectif :

- Noms courts : `a`, `b`, `c`.
- Noms descriptifs : `delta`, `r1`, `xSommet`.
- Références aux composantes de tuples.
- Distinction entre paramètres et inconnues mathématiques libres.

Si les noms longs sont incompatibles avec certaines notations LaTeX, définir une convention explicite de référence plutôt que casser le parsing de la multiplication implicite.

---

# 4. Valeurs et expressions mathématiques

## 4.1 Valeurs de base — P1

Le moteur doit représenter et manipuler, dans les contextes où elles sont valides :

- Entiers.
- Décimaux exacts.
- Rationnels.
- Nombres négatifs.
- Zéro.
- Racines carrées.
- Constantes usuelles comme `π` et `e`.
- Expressions symboliques prises en charge.
- `+∞` et `−∞` comme valeurs spéciales lorsque le type de réponse le permet.

Ne pas traiter l'infini comme un nombre réel ordinaire.

Distinguer :

- Valeur réelle finie.
- Infini positif.
- Infini négatif.
- Expression non définie.
- Résultat indéterminé.
- Erreur technique.

En particulier, `1/0` ne doit pas automatiquement devenir `+∞`.

## 4.2 Expressions mathématiques — P1

Prendre en charge le parsing et la manipulation bornée de :

- Opérations arithmétiques.
- Fractions.
- Puissances.
- Racines carrées.
- Polynômes.
- Équations.
- Inéquations.
- Fonctions exponentielles.
- Fonctions logarithmiques.
- Fonctions trigonométriques usuelles : sinus, cosinus et tangente.
- Constantes symboliques courantes.

Le support doit être défini par opération et par famille :

1. Lecture de l'expression.
2. Substitution.
3. Évaluation.
4. Simplification.
5. Comparaison ou correction.

Ces cinq capacités ne sont pas automatiquement équivalentes.

Une fonction logarithmique peut, par exemple, être prise en charge en substitution sans que le moteur sache démontrer l'équivalence de toutes les expressions logarithmiques possibles.

## 4.3 Domaines de définition — P0

Le moteur doit éviter toute transformation mathématiquement trompeuse.

Exemples critiques :

- `x/x` n'est pas défini en zéro.
- `sqrt(x^2)` correspond à `|x|` pour un réel, pas toujours à `x`.
- `ln(x)` exige `x > 0` dans le cadre réel.
- Les fractions rationnelles peuvent contenir des valeurs interdites.
- Certaines transformations trigonométriques ont des restrictions de domaine.

Exigences :

- Conserver l'expression originale.
- Examiner l'admissibilité avant simplification.
- Conserver les restrictions connues.
- Déclarer les hypothèses mathématiques utilisées.
- Ne pas affirmer une équivalence générale quand elle n'est pas démontrée.
- Signaler explicitement les domaines non traitables.

La V1 ne nécessite pas un solveur universel de domaines, mais elle ne doit jamais annoncer une garantie qu'elle ne possède pas.

## 4.4 Simplification — P1

Objectif : obtenir des expressions mathématiques lisibles sans perte de sens.

Exemple :

`4 × 1/2 × x + 2` → `2x + 2`

Priorités :

- Simplifications arithmétiques exactes.
- Réduction de polynômes.
- Parenthésage correct.
- Préservation des valeurs négatives.
- Fractions exactes.
- Domaines conservés.
- LaTeX exploitable par le renderer.

Les simplifications symboliques plus avancées ne sont acceptées que dans des profils mathématiques justifiés.

---

# 5. Formats de réponses — Obligatoires en V1

## 5.1 Numériques

- Entiers.
- Décimaux.
- Rationnels et fractions.
- Racines exactes.
- Constantes usuelles.
- Valeurs approchées.
- Infini positif.
- Infini négatif.

## 5.2 Algébriques

- Expressions polynomiales.
- Expressions factorisées ou développées.
- Équations algébriques prises en charge.
- Inéquations dans des familles définies.
- Expressions contenant racines, exponentielles, logarithmes ou fonctions trigonométriques selon le profil de comparaison disponible.

## 5.3 Ensembles et intervalles

- Ensemble fini de solutions.
- Ensemble vide.
- Intervalles ouverts.
- Intervalles fermés.
- Intervalles semi-ouverts.
- Bornes infinies.
- Unions d'intervalles dans le sous-ensemble officiellement supporté.

Les ordres d'écriture sans importance mathématique doivent être traités correctement.

Exemples :

`{-2, 3}` = `{3, -2}`

`]-∞, 2]` doit préserver le caractère fermé de la borne `2`.

## 5.4 Questions discrètes

- QCM à réponse unique.
- QCM à réponses multiples.
- Sélection par identifiants d'options, indépendamment de l'ordre d'affichage.
- Réponses textuelles courtes.
- Réponses acceptées multiples explicitement définies.

Pour les textes courts, utiliser une normalisation et des variantes autorisées configurables.

Ne pas introduire une évaluation sémantique libre des réponses textuelles.

## 5.5 Hors première V1, sauf besoin historique bloquant

- Matrices en réponse.
- Calcul vectoriel général.
- Correction symbolique des nombres complexes.
- Raisonnements rédigés libres.
- Démonstrations mathématiques ouvertes.
- Calcul formel général à plusieurs variables.

Ces éléments peuvent être affichables ou typés sans disposer encore d'un correcteur complet.

---

# 6. Contrats de saisie et MathLive

## 6.1 Principe

Le cœur du moteur n'utilise pas MathLive directement.

MathLive sera un composant de saisie dans l'interface React.

Le moteur doit recevoir des soumissions structurées, typées et validables.

Le contrat de saisie doit rester indépendant du composant visuel.

## 6.2 Réponse mathématique

Chaque soumission mathématique devra pouvoir transporter :

- L'identifiant de l'instance.
- L'identifiant de la question.
- Le type de réponse attendu.
- La saisie brute LaTeX.
- Les informations autorisées par le contrat de réponse.
- Éventuellement plusieurs champs pour les questions composées.

Les informations qui déterminent la bonne réponse ou la politique de correction proviennent exclusivement de l'instance officielle côté serveur.

Le client ne peut pas imposer une politique de correction.

## 6.3 Compatibilité MathLive — P1

Tester les entrées suivantes :

- Entiers.
- Décimaux français avec virgule.
- Décimaux avec point selon la politique admise.
- Fractions.
- Puissances.
- Racines.
- Parenthèses.
- Multiplications implicites.
- Polynômes.
- `π` et `e`.
- `+∞` et `−∞`.
- Ensembles.
- Intervalles.
- Expressions logarithmiques et trigonométriques.
- Réponses incomplètes.
- Placeholders de MathLive.
- Saisie par clavier physique.
- Copie/collage LaTeX.

Les tests doivent utiliser de véritables exemples de sortie MathLive, pas uniquement des chaînes LaTeX inventées.

## 6.4 Conventions françaises — P1

Définir précisément :

- La virgule décimale.
- Le point décimal éventuellement accepté.
- Le séparateur entre éléments d'un ensemble.
- Le séparateur entre bornes d'un intervalle.
- Les règles de parenthésage.
- Les notations d'infini.
- Les espaces et commandes LaTeX ignorables.
- La distinction entre réponse incomplète et syntaxe invalide.

Exemple d'ambiguïté :

`(1,2)` peut signifier un couple ou, selon le contexte, une écriture numérique ambiguë.

Le contrat de question doit lever cette ambiguïté.

## 6.5 Configuration future du clavier

Une question doit pouvoir déclarer des capacités utiles à l'interface :

- Clavier numérique.
- Clavier algébrique.
- Clavier avec fractions et racines.
- Clavier avec intervalles et ensembles.
- Clavier adapté aux QCM, lorsque pertinent.

Le type de clavier est une indication d'interface, pas une preuve mathématique.

L'interface définitive sera développée après le moteur.

---

# 7. Correction mathématique

## 7.1 API et résultats — P0/P1

Prévoir une API de correction par question, réutilisable dans toutes les applications.

Un résultat doit distinguer :

- **Correct** : preuve suffisante selon la politique.
- **Incorrect** : différence démontrée selon la politique.
- **Invalide** : saisie non conforme ou mal formée.
- **Indéterminé** : le moteur ne peut pas conclure.
- **Erreur technique** : échec du service ou du calcul.

Ne pas assimiler automatiquement une réponse indéterminée à une réponse fausse.

Séparer si nécessaire :
- La validité mathématique.
- La conformité à la forme demandée.
- Le résultat global applicable à la question.

## 7.2 Correction numérique — P1

- Égalité exacte des entiers.
- Égalité exacte des fractions.
- Comparaison décimale maîtrisée.
- Valeurs algébriques exactes prises en charge.
- Infinis par signe et nature.
- Comparaison approchée avec tolérance explicite.

Aucun epsilon implicite universel.

## 7.3 Correction algébrique — P1

Corriger au minimum les familles bornées suivantes :

- Polynômes univariés à coefficients rationnels.
- Expressions arithmétiques exactes.
- Fractions rationnelles prises en charge.
- Équations simples avec ensembles de solutions attendus.
- Expressions comportant des racines ou constantes usuelles lorsque leur comparaison est vérifiable.

Pour les exponentielles, logarithmes et fonctions trigonométriques :

- Parsing et substitution obligatoires.
- Comparaison des résultats numériques connus lorsque sûre.
- Reconnaissance d'identités uniquement lorsqu'elles sont démontrables dans un profil défini.
- Aucune prétention à une équivalence symbolique universelle.
- Indétermination explicite lorsque le moteur ne peut pas conclure.

## 7.4 Équations et inéquations — P1

Distinguer deux situations :

1. L'élève fournit une expression ou une équation à comparer.
2. L'élève fournit l'ensemble des solutions d'une équation ou inéquation donnée.

Le système doit connaître le type de réponse demandé.

La V1 doit notamment corriger les solutions d'équations du premier et second degrés lorsqu'elles sont représentées dans les formats pris en charge.

Il n'est pas nécessaire que le moteur résolve automatiquement toutes les équations de l'énoncé.

## 7.5 Limites et dérivées — P1

Décision validée :

**Le moteur doit corriger des réponses attendues connues, sans développer un solveur symbolique général de limites ou de dérivées.**

Il doit :

- Accepter des exercices contenant des expressions de limites.
- Instancier leurs paramètres.
- Représenter une réponse infinie.
- Corriger une réponse à valeur finie ou infinie connue.
- Corriger une expression de dérivée attendue, dans les familles algébriques effectivement prises en charge.
- Permettre de déclarer explicitement la réponse attendue lors de la création de l'exercice.
- Signaler le dépassement du profil de correction.

Exemple historique obligatoire :

`f(x)=ln(x-a)/(x-a)` pour `x>a`.

Question :

`lim(x→a+) f(x)`

Réponse attendue :

`-∞`

Le moteur doit savoir instancier cet exercice et vérifier la réponse attendue, sans obligation de démontrer lui-même la limite.

## 7.6 Formes pédagogiques — P1

Politique configurable par question :

- Équivalence mathématique acceptée.
- Valeur exacte exigée.
- Approximation autorisée.
- Tolérance numérique.
- Fraction irréductible.
- Forme développée.
- Forme réduite.
- Forme factorisée.
- Réponse appartenant à une liste de formes acceptées.

Les propriétés de forme doivent être vérifiées sur une représentation qui conserve les informations pertinentes de la saisie.

Ne pas simplifier d'abord une réponse au point de perdre la preuve de sa forme initiale.

Les contraintes qui ne peuvent pas être vérifiées doivent produire un diagnostic explicite.

## 7.7 Correction textuelle et QCM — P1

- QCM simple : comparaison exacte de l'ID sélectionné.
- QCM multiple : comparaison des ensembles d'IDs.
- Options inconnues refusées.
- Doublons refusés.
- Aucune confiance dans un indicateur `isCorrect` envoyé par le client.
- Texte court : comparaison après normalisation documentée.
- Variantes de réponses autorisées configurables.
- Pas de correction sémantique par IA dans ce moteur.

---

# 8. Types d'éléments d'exercice

## 8.1 Principe architectural

Le moteur est responsable de :

- Définir les contrats.
- Valider les éléments.
- Instancier leurs paramètres.
- Préparer les données affichables.
- Produire des diagnostics.
- Préserver leurs références et identifiants.

La bibliothèque React commune sera responsable du rendu visuel.

NovLearn Admin sera responsable de l'édition graphique.

## 8.2 Éléments prioritaires — P1

- Texte riche avec mathématiques.
- Expression mathématique.
- Équation et inéquation affichées.
- Question.
- QCM simple.
- QCM multiple.
- Section de problème.
- Indication.
- Explication ou correction détaillée.

## 8.3 Éléments avancés — P1 sur leurs données, pas sur leur rendu

Inventorier et prendre en charge, selon les contrats validés et les besoins historiques :

- Graphique de fonction.
- Représentation graphique d'une suite.
- Tableau de signes.
- Tableau de variations.
- Tableau de valeurs.
- Tableau de statistiques.
- Arbre de probabilités.
- Vecteurs et figures géométriques.
- Plan complexe.
- Systèmes d'équations ou d'inéquations.
- Autres éléments réellement présents dans Creator ou NovLearn.

Le niveau de support obligatoire est :

1. Contrat typé.
2. Validation structurelle.
3. Vérification des références.
4. Substitution des variables dans les champs mathématiques pertinents.
5. Préparation des données nécessaires au futur renderer.
6. Conservation des propriétés utiles.
7. Diagnostics lorsque des fonctionnalités ne sont pas prises en charge.

Le moteur n'est pas obligé de dessiner les graphiques ni de résoudre les mathématiques associées.

Aucun type avancé ne doit être déclaré fonctionnel sur la seule base d'une interface TypeScript.

---

# 9. Instanciation et sécurité des données

## 9.1 Instanciation — P1

À partir d'une définition, d'une seed et de versions explicites :

- Valider la définition.
- Générer les variables.
- Résoudre les dépendances.
- Appliquer les contraintes.
- Instancier tous les éléments supportés.
- Calculer les réponses attendues.
- Construire une instance complète privée.
- Construire une projection publique sûre.
- Conserver les identifiants stables.
- Garantir la reproductibilité.

## 9.2 Projection publique — P0

Les données destinées à l'élève ne doivent pas exposer :

- Les réponses attendues.
- Les bonnes options QCM.
- Les expressions de correction privées.
- Les indicateurs de solution.
- Les métadonnées privées permettant une récupération triviale des solutions.
- Les données de génération inutiles à l'affichage lorsqu'elles permettent de reconstituer les attendus.

Les informations de correction doivent être obtenues depuis l'instance officielle côté serveur.

## 9.3 Snapshots et versions — P1

Pouvoir identifier :

- La définition publiée.
- Sa version.
- La seed.
- La version du générateur.
- La version de l'instanciation.
- Les valeurs générées et calculées.
- La provenance des tuples.
- Les questions et attendus privés.
- Le format des réponses et politiques de correction.

Les anciennes instances doivent pouvoir être relues ou migrées explicitement lorsque les contrats changent.

---

# 10. Backend et intégration

## 10.1 Frontière TypeScript / FastAPI — P1

Nous souhaitons conserver FastAPI comme backend applicatif.

Étudier et valider une solution simple permettant au backend Python d'utiliser le moteur TypeScript côté serveur.

Exigences :

- Isolation des calculs.
- Protocole versionné.
- Sérialisation déterministe.
- Gestion des timeouts.
- Limitation des ressources.
- Gestion des crashes.
- Récupération saine après interruption.
- Benchmarks réels.
- Pas d'exécution arbitraire de commandes issues des exercices.

Un processus Node isolé ou un pool peut être adapté.

Ne pas créer de service HTTP Node indépendant sans justification technique.

## 10.2 NovLearn et duels — P1

- Le serveur crée ou retrouve l'instance officielle.
- La soumission est associée à une question identifiable.
- Le moteur vérifie la réponse.
- Le backend décide des points et de la progression.
- Les duels utilisent une correction officielle côté serveur.
- Aucune décision de réussite ne dépend uniquement du navigateur.
- Les tentatives peuvent être rejouées ou auditées.

L'intégration réelle aux repositories applicatifs est un chantier distinct du cœur, sauf autorisation explicite.

---

# 11. Base de données et compatibilité historique

## 11.1 Format historique

NovLearn dispose actuellement d'une table `exercises` avec des métadonnées et un champ `content` JSONB.

Le contenu historique comprend notamment :

- `elements`
- `variables`
- Types d'éléments.
- Textes paramétrés.
- Questions et réponses attendues.
- Bornes et exclusions.
- Formats de réponse historiques.

Le futur moteur ne doit pas dépendre directement de Supabase.

## 11.2 Objectifs de migration — P1

- Inventorier les formats réels.
- Identifier les conventions de noms.
- Identifier les types de variables.
- Identifier les types d'éléments.
- Identifier les formats de réponses.
- Repérer les ambiguïtés et incohérences.
- Préserver intégralement les JSON d'origine.
- Construire des adaptateurs de conversion.
- Classer chaque exercice comme compatible, adaptable ou bloqué.
- Documenter chaque incompatibilité.
- Permettre une migration progressive.
- Prévoir coexistence et rollback.
- Ne pas exécuter les anciennes expressions JavaScript non fiables.

Les huit exercices historiques de référence doivent faire l'objet de tests individuels.

Ils ne représentent pas nécessairement le catalogue complet.

## 11.3 Données persistantes — P1

Préparer les contrats nécessaires à :

- Définitions publiées versionnées.
- Instances privées.
- Snapshots.
- Tentatives.
- Résultats de correction.

Ne pas modifier le schéma SQL actuel sans audit spécifique.

Ne pas intervenir sur la base de production pendant la finalisation du cœur.

---

# 12. Qualité, tests et sécurité

## 12.1 Tests mathématiques — P0

Pour chaque famille officiellement supportée :

- Cas corrects.
- Cas incorrects.
- Cas limites.
- Erreurs de syntaxe.
- Expressions non définies.
- Domaines invalides.
- Contre-exemples d'équivalence.
- Grands nombres ou expressions hors limites.
- Résultats indéterminés.
- Erreurs techniques.

Les tests doivent privilégier les propriétés mathématiques et des oracles indépendants.

Les snapshots seuls ne suffisent pas.

## 12.2 Cas critiques obligatoires

- `x/x` contre `1` avec domaine réel non précisé.
- `sqrt(x²)` contre `x`.
- Division par zéro.
- Logarithme de valeur non positive en domaine réel.
- Fraction `2/4` contre `1/2` avec et sans exigence de forme irréductible.
- Expression factorisée contre développée.
- Erreur de signe.
- Decimal français.
- Racine exacte contre approximation.
- `+∞` contre `−∞`.
- Infini contre résultat non défini.
- Intervalle ouvert contre fermé.
- Ensembles de solutions dans des ordres différents.
- QCM avec permutation des options.
- Questions multiples avec attendus distincts.
- Contraintes de génération impossibles ou épuisées.
- Dépendances circulaires.
- Tentative de soumission falsifiée.
- Expression trop coûteuse pour le profil annoncé.

## 12.3 Isolation — P0 avant intégration officielle

- Limites de longueur d'entrée.
- Limites de complexité.
- Limites de profondeur des expressions.
- Limites de temps.
- Limites de mémoire.
- Isolation ou interruption effective des calculs.
- Nettoyage après crash ou interruption.
- Tests des entrées malveillantes.
- Aucune exécution de JavaScript arbitraire.

Une limite de temps vérifiée après le calcul ne constitue pas une vraie protection contre un calcul bloquant.

## 12.4 Qualité et distribution — P0/P1

- TypeScript strict.
- Build réussi.
- Typecheck réussi.
- Lint réussi.
- Format validé.
- Tests complets réussis.
- Golden vectors historiques inchangés.
- Package ESM consommable.
- Déclarations TypeScript valides.
- Sérialisation JSON correcte.
- Tests d'import dans un consommateur externe.
- Compatibilité avec les environnements ciblés.
- Documentation des APIs et limites.
- CI adaptée.
- Vérification de distribution après chaque changement pertinent.

---

# 13. Roadmap cible consolidée

Cette roadmap conserve les lots existants lorsque leurs responsabilités sont pertinentes.

Les lots précédemment livrés ne doivent pas être recommencés sans régression démontrée.

## Lots 1 à 5 — Fondations et génération

**État documenté : livré sur des profils bornés.**

Objectifs :
- Contrats de base.
- Frontière mathématique.
- PRNG déterministe.
- Variables numériques.
- Choix.
- Tuples.
- Variables calculées.
- Contraintes.
- Dépendances.
- Instanciation.
- Questions multiples.
- QCM.
- Projection publique/privée.

Compléments éventuels :
- Nommage étendu sûr.
- Ajustements de représentation pour les nouveaux formats mathématiques.
- Corrections de bugs.
- Couverture additionnelle motivée.

## Lot 5C — Éléments avancés

Objectif : préparer tous les types d'éléments nécessaires au catalogue cible.

Critères :
- Contrats typés.
- Validation runtime.
- Substitution.
- Instanciation des paramètres.
- Préparation des données affichables.
- Diagnostics.
- Tests par type.
- Absence de renderer React dans le cœur.

## Lot 6A — Correction numérique et discrète

Objectif :
- Entiers.
- Décimaux.
- Fractions.
- Rationnels.
- Racines et constantes supportées.
- Infinis.
- QCM simple/multiple.
- Texte court.
- États de correction explicites.

Critères :
- Vrais positifs et négatifs.
- Exactitude.
- Aucune acceptation injustifiée.
- Gestion des erreurs et indéterminations.
- Politiques explicitement déclarées.

## Lot 6B — Correction algébrique et ensembles

Objectif :
- Polynômes.
- Expressions algébriques prises en charge.
- Équations et ensembles de solutions dans des familles délimitées.
- Intervalles.
- Unions d'intervalles supportées.
- Expressions avec fonctions usuelles selon profils documentés.
- Réponses de limites et dérivées connues.

Critères :
- Méthodes de comparaison documentées.
- Domaines conservés.
- Contre-exemples testés.
- Absence de solveur général improvisé.

## Lot 7 — Politiques pédagogiques

Objectif :
- Équivalence mathématique.
- Forme imposée.
- Irréductibilité.
- Développement/réduction.
- Factorisation dans les profils supportés.
- Exact/approché.
- Tolérances.
- Réponses acceptées multiples.

Critères :
- Séparation entre valeur et forme.
- Source brute conservée.
- Politiques par question.
- Cas ambigus explicitement traités.

## Lot 8 — Isolation et transport

Objectif :
- Utilisation sûre depuis FastAPI.
- Protocole serveur versionné.
- Timeouts effectifs.
- Limites de ressources.
- Tests d'interruption.
- Mesures réelles.
- Stratégie de transport justifiée.

Aucune adoption officielle du correcteur sans validation de cette étape.

## Lot 9 — Compatibilité historique

Objectif :
- Adaptateurs.
- Conservation des données.
- Analyse du corpus réel.
- Conversion des exercices supportés.
- Identification des cas bloqués.
- Tests de régression.
- Plan de coexistence et retour arrière.

Aucune migration directe de production.

## Lot 10 — Validation d'intégration

Objectif :
- Parcours complet en environnement isolé.
- Exercice historique réel.
- Génération.
- Projection.
- Saisie MathLive minimale réelle.
- Soumission.
- Correction serveur.
- Reproductibilité.
- Gestion des erreurs.
- Contrôles de confidentialité.

L'interface définitive n'est pas développée ici.

Un simple banc d'intégration MathLive suffit.

## Lot 11 — Distribution et validation finale

Objectif :
- Package utilisable par les futurs consommateurs.
- Types et exports vérifiés.
- Tests Node et bundler selon cibles.
- Compatibilité des versions.
- Documentation finale.
- Matrice de couverture actualisée.
- Audit indépendant du cœur mathématique.
- Liste explicite des limitations.
- Plan d'adoption progressive.

Aucun déploiement de production automatique.

---

# 14. Critères de fin du moteur V1

Le moteur ne sera déclaré terminé que si :

### Fonctionnalités

- Tous les mécanismes de génération validés fonctionnent.
- Les exclusions et contraintes sont respectées.
- Les variables calculées et dépendances fonctionnent.
- Les exercices multiquestions sont supportés.
- Les éléments retenus disposent de contrats fonctionnels.
- Les réponses attendues sont calculées ou correctement déclarées.
- Tous les formats de réponses obligatoires disposent d'un profil de correction vérifié.
- Les infinies, racines, ensembles et intervalles ne sont pas oubliés.
- Les politiques de forme sont configurables par question.
- Les limites et dérivées avec réponses connues sont corrigeables sur leurs profils déclarés.
- La frontière de saisie est compatible avec MathLive sur les cas validés.

### Fiabilité

- Aucune correction arbitraire en cas d'incertitude.
- Aucune valeur générée ne viole les contraintes prises en charge.
- Aucun résultat mathématique non défini n'est accepté comme valeur ordinaire.
- Les domaines nécessaires sont préservés.
- Les calculs sont bornés.
- Les entrées dangereuses sont isolées.
- Les snapshots sont reproductibles.
- Les anciennes versions nécessaires restent interprétables.

### Intégration

- Projection publique sans fuite de solutions.
- Transport serveur fonctionnel et mesuré.
- Séparation claire des responsabilités.
- Contrats réutilisables par NovLearn, Admin et les duels.
- Compatibilité historique documentée et testée.
- Package externe réellement consommable.

### Qualité

- Suite de tests complète verte.
- Build, lint, typecheck et format verts.
- Packaging vérifié.
- Matrice de couverture actualisée.
- Documentation cohérente avec le code.
- Aucune fonctionnalité déclarée livrée sans preuve.
- Toute limitation connue explicitement répertoriée.

---

# 15. Périmètre explicitement exclu du cœur V1

Pour éviter de transformer le projet en CAS universel :

- Résolution symbolique générale de limites.
- Calcul symbolique général de dérivées.
- Résolution générale de toutes les équations et inéquations.
- Preuve générale d'équivalence de toutes les fonctions.
- Analyse universelle des domaines de définition.
- Correction de démonstrations libres.
- Correction sémantique par IA.
- Évaluation de rédactions ouvertes.
- Moteur graphique React.
- Éditeur visuel Admin.
- Système de progression des élèves.
- Système de points et récompenses.
- Gestion des comptes utilisateurs.
- Publication automatique en production.
- Migration destructive des exercices historiques.

Ces exclusions n'empêchent pas le moteur de corriger des réponses connues dans des familles mathématiques explicitement supportées.

---

# 16. Règle finale de pilotage

Ce document décrit **la cible fonctionnelle validée**, et non une affirmation selon laquelle toutes ces fonctionnalités sont déjà livrées.

Pour chaque objectif, le suivi de développement devra indiquer :

- État réel du code.
- Contrat concerné.
- Méthode mathématique utilisée.
- Profil supporté.
- Limites connues.
- Tests réalisés.
- Critère de réussite.
- Lot responsable.
- Version introduite.

Une fonctionnalité ne doit passer au statut **livrée** que lorsque son comportement réel est testé.

Une fonctionnalité hors profil doit être signalée clairement, jamais simulée.

Les fonctionnalités P0 et P1 sont nécessaires pour déclarer la V1 terminée sur son périmètre contractuel.

Les fonctionnalités P2 restent des pistes d'extension, sans bloquer la finalisation du cœur.

**Principe directeur : construire un moteur mathématique fiable pour NovLearn, pas un moteur mathématique universel.**