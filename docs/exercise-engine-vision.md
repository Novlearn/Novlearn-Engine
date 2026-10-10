# Vision et périmètre du moteur d'exercices

Référence fonctionnelle du 10 octobre 2026. Cette mission consolide la documentation, sans développement, migration ni intégration applicative. « Cible » désigne un comportement à construire ; seules les preuves de la [couverture](feature-coverage.md) établissent une capacité disponible.

## Objectif

`novlearn-exercise-engine` décrit, valide, génère, instancie et, à terme, corrige des exercices mathématiques composés de plusieurs éléments et questions. NovLearn élève, le futur Admin, Colyseus et d'éventuelles applications mobiles consomment les mêmes contrats et les mêmes règles mathématiques. Chaque consommateur utilise uniquement les capacités effectivement annoncées pour sa version.

Un exercice est un document pédagogique ordonné, pas nécessairement une question unique. Les variables communes sont générées une fois pour une instance et alimentent tous ses énoncés, figures et attendus. Chaque question est identifiée et corrigible indépendamment. Une correction officielle dépend d'une définition publiée et d'une instance retrouvées côté serveur, jamais d'un verdict, d'une politique ou d'une seed apportés par l'élève.

## Principes et décisions

| Principe                                             | Conséquence concrète                                                                                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cœur TypeScript strict et portable                   | Pas de React, Next.js, FastAPI, Supabase, MathLive ou builtin Node dans l'entrée portable ; ESM et déclarations                                  |
| CortexJS unique bibliothèque mathématique principale | Parsing, substitution et calculs ciblés via CortexJS ; aucun CAS, deuxième parseur LaTeX ou code d'exercice exécutable                           |
| Préserver le sens avant réduction                    | Source originale, syntaxe raw, admissibilité, domaine et témoins de forme ; affichage dérivé distinct de l'attendu officiel                      |
| Garanties bornées                                    | Une preuve exacte est rattachée à une famille, une méthode et des limites ; heuristique et indétermination ne deviennent pas des verdicts exacts |
| Génération composable                                | Aléatoire numérique, choix, tuple générique à deux modes et calculé ; pas de types doublet/triplet/perfect_square/function                       |
| Erreurs explicites                                   | Aucun fallback hors contraintes, résultat partiel présenté comme instance valide ou confusion entre essais épuisés et impossibilité prouvée      |
| Contrats sobres et versionnés                        | Unions discriminées, JSON inerte, identifiants stables, API racine réduite, aucun objet boxed public                                             |
| Autorité et visibilité séparées                      | Instance privée complète ; projection élève par sélection de champs ; feedback autorisé par le backend                                           |

Trois arbitrages ont été confirmés par l'utilisateur pendant cette mission : **liste plate avec sections explicites**, **texte/expression/question/QCM simple et multiple comme premier périmètre étendu**, **mêmes domaines par défaut, domaine imposé explicite possible par question**. Ce sont des décisions de cible ; les contrats v1 ne sont pas modifiés.

## Responsabilités

| Domaine                           | Responsable                           | Livrable / frontière                                                                                                       |
| --------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Contrats d'exercice               | Moteur, `contracts`                   | Définition privée, éléments, réponses, politiques, instances, soumissions et diagnostics validés runtime                   |
| Mathématiques                     | Moteur, `math`                        | Source/raw, profil admis, substitution, valeur exacte ou état non démontré ; boxed confinés au travail                     |
| Génération                        | Moteur, `generation`                  | RNG versionné, domaines, groupes, dépendances calculées et contraintes bornées                                             |
| Instanciation                     | Orchestration du moteur               | Toute la définition admise → instance complète ; aucun besoin d'un service ou d'une factory                                |
| Correction                        | Futur module `grading`                | Résultat par question, preuve de valeur et conformité de forme séparées                                                    |
| Rendu et saisie                   | Bibliothèque UI commune, applications | Texte, LaTeX, MathLive, tableaux, canvas/SVG, interactions accessibles ; aucune décision officielle de correction          |
| Édition                           | Frontend Admin                        | Formulaires, ordre, aide, diagnostic, prévisualisation privée autorisée ; aucun moteur mathématique divergent              |
| Paramètres pédagogiques locaux    | Définition et politique de question   | Forme demandée, tolérance, format, points descriptifs, aides et explication privées                                        |
| Politique pédagogique applicative | Backend NovLearn / duels              | Essais, indices autorisés, barème et crédits partiels, progression, récompenses, adaptation, classement                    |
| Publication et persistance        | Backend Admin / NovLearn              | Droits, taxonomie, brouillons, révisions immuables, état officiel d'instance, tentatives, conflits, sauvegarde et rollback |

## Fonctionnalités retenues et étapes

Le premier moteur étendu prépare une liste plate d'éléments, toutes ses questions et leurs attendus, avec variables communes et réponses associées par ID. Les quatre mécanismes de génération, exclusions locales et contraintes déclaratives restent des objectifs décidés. Les graphiques, suites, tableaux, arbres, vecteurs et plans complexes identifiés dans les sources nécessitent des contrats et compléments ciblés, puis un rendu applicatif. Leur existence historique ne les rend pas natifs.

Les problèmes longs utilisent d'abord des sections dans la liste. Variables locales aux parties, dépendances pédagogiques et correction à partir d'une réponse précédente demandent un besoin et une politique spécifiques avant extension. Ils ne changent pas implicitement les attendus officiels.

## Hors périmètre du cœur

Comptes et authentification, accès DB/réseau, stockage de tentatives, catalogue et taxonomie persistés, publication, score/progression/récompenses, matchmaking et timers, dessin/DOM/composants React, formulaires Admin, solveur général de contraintes, calcul symbolique universel et exécution JavaScript historique. Les besoins des applications sont décrits dans la référence pour préparer les frontières, sans ajouter ces responsabilités au package.

## Critères de réussite

Une version est consommable lorsque chaque fonctionnalité annoncée possède contrat, validation, limites et tests de succès/erreur/indétermination pertinents ; une même définition et les mêmes versions rejouent une instance ; toutes les associations de questions survivent au réordonnancement ; la projection ne transporte aucune solution privée ; les états non démontrés restent explicites. L'adoption officielle nécessite aussi une preuve d'isolation terminable côté hôte et une intégration qui ignore les verdicts clients.

Aujourd'hui : contrats rationnels natifs, parsing scalaire, génération integer/decimal/choice et instance native entière v1 sont livrés ; le Lot 5 bis ajoute la composition scalaire v2, sections, questions multiples et QCM avec attendus privés/projection. Groupes/computed/contraintes et figures avancées demeurent des cibles. Aucune correction élève, UI, migration des huit lignes ou adoption par les applications n'est livrée. Verdict de l'[audit](architecture-review.md) : **cohérente avec réserves**, sans validation universelle de l'architecture.

## Index de la référence

- [Spécification fonctionnelle et inventaire des éléments](functional-specification.md)
- [Parcours Admin, élève, correction et duels](exercise-lifecycle.md)
- [Architecture, contrats et intégrations](architecture.md)
- [Couverture exhaustive au regard des sources accessibles](feature-coverage.md)
- [Audit critique et arbitrages restants](architecture-review.md)
- [Roadmap et conditions de passage](roadmap.md)
- [Corpus et matrice détaillée de génération](compatibility.md)
