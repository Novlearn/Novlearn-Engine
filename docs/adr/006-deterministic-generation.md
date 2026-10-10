# ADR 006 — Génération de paramètres v1

## Décisions Lot 4 bis — variables-v2 (11 octobre 2026)

Contrat retenu avant implémentation : `GenerationDefinitionV2` porte `schemaVersion:2`, `definitions`, `constraints`, `maxAttempts` et `maxDraws`. L'appel existant exige explicitement `{generationVersion:'variables-v2', seed}` ; l'absence de version conserve `parameters-v1` et son tableau de paramètres inchangé.

Un seul `tuple`, identifié par `id`, avec composantes ordonnées décrites par les mêmes domaines scalaires. `mode:'choice'` ajoute des lignes numériques `values` d'arité identique ; une ligne entière est choisie. `mode:'generate'` tire chaque composante. Les lignes doivent respecter types, grille et bornes ; les exclusions retirent les lignes concernées avant tirage. Choice v2 accepte des exclusions optionnelles, sans modifier choice v1. Une seule vérité : `values` plat contient les valeurs typées ; `groups:[{id,components:[noms]}]` conserve l'ordre et la provenance sans recopier les valeurs. Les noms restent une lettre minuscule hors e/i ; les noms pédagogiques étendus sont différés. IDs de groupes uniques, distincts des noms générés.

Contraintes structurées `{kind:'comparison',left:{variable:'a'},operator:'<',right:{constant:3}}` : `<`, `<=`, `>`, `>=`, `==`, `!=`, références au contexte complet, aucun LaTeX ou code. Nombres exacts transportables sur six décimales au plus, coefficient entier borné à ±1 000 000 000 ; choix/constants v2 hors de ce profil refusés avant RNG. Comparaisons de rationnels fermés par CortexJS, tolérance zéro, jamais par identité symbolique universelle. Réponse inconnue ou erreur technique : arrêt explicite. Aucun calcul d'expression générale.

Bornes : 16 déclarations et 16 valeurs nommées au total, arité 2…8, 128 lignes/choix/exclusions, 32 comparaisons, `maxAttempts` entier 1…128, `maxDraws` entier 1…65 536, budgets JSON historiques et rejet de rang 128 mots conservés. Domaines locaux et lignes admissibles vides sont diagnostiqués ; comparaisons réflexives fausses, constantes fausses ou intervalles incompatibles peuvent prouver un domaine vide avant RNG. Aucun solveur ni recherche de cycles de relations.

Atomicité globale : tout candidat tire toutes les déclarations dans l'ordre, puis vérifie toutes les contraintes sur ce contexte. Candidat faux → retirage complet, sans réparation, reseed ni fallback. Flux Mulberry32 local continu, exclusions conservant l'ordre des choix/lignes, essais et mots comptabilisés, succès et échecs rejouables. Budget épuisé ≠ impossibilité prouvée. Pas de garantie d'uniformité des solutions ou de deadline préemptive.

Intégration minimale : `ExerciseDefinitionV3` conserve les éléments v2 mais remplace `parameters` par `generation:GenerationDefinitionV2`, snapshot/projection v3 et `composed-instance-v3`. V1/v2 conservent leurs schémas, snapshots et versions. Les futures variables calculées appartiendront au même système de résolution dans generation : validation des dépendances puis calcul CortexJS avant contraintes et instanciation. Aucun computed/graphe/correcteur/UI dans ce lot.

Statut historique : retenu, 10 octobre 2026, Lot 4. Complément documentaire du même jour : modèle cible décidé, schémas proposés à arbitrer avant implémentation. Aucun complément du Lot 4 ni Lot 5 engagé.

## Périmètre et contrats

Lecture historique : les paragraphes de livraison ci-dessous décrivent le Lot 4 et sa clarification préalable au Lot 5. État actuel : [ADR 007](007-native-instantiation.md) livre l'instance native entière, la substitution/attendu exact et la projection ; les DTO ne sont plus seulement préparatoires. Cet état historique du Lot 4 est complété par variables-v2 ci-dessus ; computed reste absent. La [référence globale](../functional-specification.md) et la [couverture](../feature-coverage.md) complètent ce document, sans changer parameters-v1.

Inspection préalable : le Lot 3 fournit `parseMathInput` et son profil scalaire raw, avec 99 tests existants passants avant l'ajout des tests de génération. Le Lot 2 définit uniquement `IntegerParameterV1` dans `ExerciseDefinitionV1`, sans expression calculée ni relation entre paramètres. La roadmap réserve explicitement computed et substitution au Lot 5. Il n'existe donc pas de blocage pour les tirages ; ajouter un graphe computed et un contrat de domaine maintenant déplacerait le périmètre du lot suivant.

Une seule fonction publique ajoutée : `generateVariables(definitions, { seed, generationVersion? })`. Les définitions sont validées depuis `unknown`, puis copiées par la frontière JSON inerte du Lot 2 ; les contrôles des entiers sont partagés avec `validateDefinition`. Le résultat est discriminé par `ok` : succès avec valeurs et métadonnées de rejeu, ou diagnostics avec codes et JSON Pointer, sans valeurs partielles. Options validées runtime également, sans coercition implicite. Aucun getter n'est exécuté ; classes, fonctions, cycles, tableaux creux, clés dangereuses et champs inconnus sont refusés. Pas de nouvelle dépendance.

`GenerationParameterV1` réutilise les entiers et ajoute `DecimalParameterV1` et `ChoiceParameterV1`. Ce contrat de génération est piloté par `parameters-v1` ; ce n'est pas un schéma d'exercice historique. `ExerciseDefinitionV1` reste la première famille à paramètres entiers, et les DTO d'instance restent préparatoires. Les données décimales/choice ne peuvent pas encore être injectées dans cette définition rationnelle. Le Lot 5 devra décider explicitement comment construire le snapshot d'instance à partir des valeurs typées.

Les noms restent ceux du contrat v1 : une lettre latine minuscule, hors e/i, unique, au plus 16 paramètres. Seule la liste de paramètres est tirée ; les variables libres comme x ne sont pas fournies au générateur. Il n'existe aucune expression à parser dans ce périmètre : aucune seconde implémentation de parsing/substitution n'est créée. Le test du trinôme compose validation, génération et parsing raw de l'attendu avec la vraie API du Lot 3, sans calculer cet attendu. CortexJS restera la voie du futur calcul mathématique.

## RNG et stabilité

Seed obligatoire : entier uint32 0…4294967295, ou son écriture décimale canonique (sans espace, signe, zéros initiaux ou exposant). -0 numérique est refusé. Pas de hash de chaînes arbitraires ni d'horloge. La seed de rejeu est stockée comme chaîne décimale ; seed numérique et chaîne canonique correspondante produisent exactement le même résultat.

Algorithme figé : Mulberry32, état initial égal à la seed, addition modulo 2³² de `0x6d2b79f5`, mélange avec `Math.imul` et décalages uint32 ; voir `src/generation/random.ts`. Zéro est un état initial admis. Les opérations ECMAScript sont communes à Node et au navigateur, sans builtin Node ; les tests exécutés ici sont Node uniquement. Le PRNG n'est pas cryptographique et la seed/métadonnée de rejeu reste privée. Les applications serveur devront choisir et retrouver leurs propres seeds, sans faire confiance à celles d'un client.

Un mot uint32 est transformé en rang dans 0…n−1 : rejeter les mots ≥ `2^32 - (2^32 % n)`, puis appliquer modulo n. Cela retire le biais du mapping modulo sur des mots uniformes, sans prétendre prouver la qualité statistique du PRNG. Aucun rejet pour les exclusions : sélectionner le rang dans le complément trié. Pas d'énumération de plages potentiellement grandes. Une liste de choix conserve l'ordre déclaré ; exclusions triées numériquement, ordre des clés d'objet sans effet. L'ordre du tableau des paramètres définit l'ordre des tirages. Une plage ou un choix réduit à une valeur ne consomme aucun mot. Chaque appel possède son propre état.

128 mots au maximum par rang, 16 paramètres, donc au plus 2048 mots par appel validé. Épuiser ce budget retourne `limit`, sans fallback ni preuve d'impossibilité mathématique. Aucun paramètre de recherche générale n'est proposé, puisque les contraintes couvertes sont des domaines finis directement calculables. Les quatre seeds 0, 1, 42 et 4294967295 ont des vecteurs figés de mots et de résultats complets. Un changement de seed, algorithme, ordre, représentation ou règle de tirage exige une nouvelle version de génération ; conserver l'ancienne implémentation si le rejeu historique est nécessaire. La version moteur courante `0.0.0` est aussi incluse et contrôlée contre package.json en test. Les métadonnées seules ne remplacent pas la conservation immuable des définitions, de leur ordre et de leur révision.

## Domaines et représentation

| Type    | Domaine et garanties                                                                                                                                              | Valeur sérialisée                                                                      |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| integer | Bornes entières inclusives dans ±1 000 000 ; exclusions entières uniques dans la plage ; domaine non vide                                                         | `{kind:'integer', value}`                                                              |
| decimal | Précision entière 0…6 ; bornes finies dans ±1 000 000 ; coefficients des bornes de grille dans ±1 000 000 000 ; exclusions uniques, sur grille et dans les bornes | `{kind:'decimal', coefficient, precision}`, valeur exacte `coefficient / 10^precision` |
| choice  | 1…128 nombres JS finis, uniques ; ordre conservé ; pas de poids implicites ni de conversion depuis des chaînes                                                    | `{kind:'choice', value}`, nombre source conservé                                       |

Exclusions : au plus 128 ; doublons et exclusions hors domaine sont des erreurs, jamais ignorés. 0 et -0 désignent le même choix/exclusion, donc leur double présence est refusée. Une valeur de sortie nulle est toujours 0, conformément au transport JSON qui ne distingue pas -0 ; les définitions du demandeur restent inchangées. Une liste vide de paramètres est valide et donne zéro tirage.

Grille décimale : encoder **l'écriture décimale la plus courte** du nombre reçu (`Number.toString`), y compris notation scientifique, avec des BigInts internes pour déplacer le point. Les bornes non alignées sont intersectées avec la grille par ceil(min×10^p) et floor(max×10^p), selon cette écriture, sans multiplication flottante. Aucun BigInt en sortie. C'est une conversion de transport numérique, pas un parseur mathématique ni un système de nombres concurrençant CortexJS. Les coefficients restent des entiers sûrs. `0.29` à précision 2 vaut exactement coefficient 29 ; une exclusion `0.1+0.2` est hors grille à précision 1 et est refusée, sans snap/tolérance. Une grille sans point ou entièrement exclue produit `empty-domain`. La borne sur les coefficients limite le cardinal à 2 000 000 001, compatible avec le mapping uint32.

Les choix copient des nombres finis sans calcul : aucune preuve d'exactitude rationnelle ou représentation de fraction ne leur est attribuée. Le résultat décimal est un encodage exact de grille, sans approximation numérique supplémentaire. Il n'existe pas de résultats calculés exacts/approximatifs dans ce lot ; une fraction ne sera donc jamais convertie prématurément en flottant ici.

## Limites de l'implémentation du Lot 4

Codes de génération : `invalid-definition`, `unsupported-type`, `invalid-bounds`, `empty-domain`, `invalid-options`, `unsupported-version`, `limit`. Les budgets JSON du Lot 2 sont conservés, dont 128 diagnostics au plus. Les erreurs de données non JSON restent `invalid-definition`, même lorsque leur chemin désigne une borne.

Contraintes entre paramètres, expressions computed, dépendances/cycles, fractions calculées, contraintes de domaine après substitution et approximations : différés. Tout type computed ou champ de contrainte est explicitement refusé ; aucune chaîne JavaScript exécutée. Les bornes de a dans la fixture 103 garantissent a>0 et donc 2a≠0, sans analyse générique de formules. Seed 42 produit a=1, b=5, c=0. L'abscisse attendue est mathématiquement −5/2 ; cette valeur n'est **pas calculée par le générateur**. La valeur du minimum serait c−b²/(4a), distincte de l'abscisse.

Inventaire : le corpus reçu contient des integer et computed, avec `choices:[]` et `decimals:2` même lorsqu'inactifs. Tuples/doublets/triplets/perfect_square sont des formats spécifiques observés dans les analyses du code historique, sans représentation canonique native ; aucune de ces familles n'est implémentée ou migrée. Les décimaux et choix ici sont des contrats natifs nouveaux, pas une migration de ces champs legacy.

Aucun énoncé, instance, projection publique, correction, score, service ou catalogue migré. Pas de réseau/base dans le générateur. Pas de garantie d'isolation de calcul synchrone ou de deadline : ces questions restent au Lot 8. Aucun blocage des tirages entiers pour le Lot 5 ; avant computed, il faut définir le contrat d'expression, l'admissibilité/domaines avant réduction, les dépendances, les limites de calcul et une sérialisation exacte via CortexJS. Aucun Lot 5 lancé automatiquement.

## Modèle cible décidé — quatre mécanismes composables

Cette section spécifie un objectif, sans élargir `parameters-v1`, les contrats TypeScript ou les validateurs actuels. La couverture réelle et les preuves sont dans la [matrice de génération](../compatibility.md#matrice-de-couverture-fonctionnelle--génération). Les statuts de roadmap distinguent le Lot 4 terminé de son complément proposé.

1. **Aléatoire numérique** : un domaine entier ou décimal sur grille, bornes inclusives, signes et exclusions explicites. Réutiliser les tirages du Lot 4 ; ne pas ajouter un type par propriété mathématique.
2. **Choix** : sélection dans une liste finie de valeurs admises. Aujourd'hui uniquement des nombres JS finis ; fractions ou autres valeurs mathématiques exigent d'abord un contrat sérialisable validé. Un choix ne prouve aucune propriété de ces valeurs. Pas de pondération implicite.
3. **Tuple générique** : une collection ordonnée d'au moins deux composantes, avec une arité bornée à décider. Deux modes du même mécanisme : sélectionner une ligne complète parmi des tuples prédéfinis, ou tirer les composantes puis valider les contraintes du groupe. Aucun type distinct doublet/triplet/quadruplet. Un tuple n'est pas un vecteur muni d'opérations.
4. **Calculé** : une expression mathématique déclarative dépendant de paramètres générés ou calculés, évaluée par CortexJS dans un contexte isolé. Chaînes de dépendances et références multiples requises. Aucun type indépendant `function` : une fonction d'énoncé consomme des paramètres, elle n'est pas un générateur supplémentaire.

Pas de `perfect_square`, de générateur de trinômes, de solveur général de contraintes, de CAS parallèle, d'exécution JavaScript ou de transformation algébrique par regex. Les recettes de composition peuvent servir d'exemples Admin sans devenir des types du cœur.

### Valeurs, calculs et expressions

| Notion                | Responsabilité cible                                                         | État actuel                                                                                       |
| --------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Paramètre scalaire    | Fournir une valeur numérique typée à une expression                          | integer/decimal/choice générés ; seule la famille integer est intégrée à la définition d'exercice |
| Tuple                 | Conserver ordre et cohérence d'un groupe ; exposer ses composantes déclarées | Absent                                                                                            |
| Paramètre calculé     | Produire une valeur à partir de dépendances ; garder source et diagnostic    | Absent ; parsing seul disponible                                                                  |
| Variable libre        | Rester symbolique dans l'expression, par exemple x                           | Déclarée/distinguée au parsing et préservée dans la substitution native Lot 5                     |
| Expression paramétrée | Consommer des valeurs pour l'énoncé, par exemple f(x)=a*x²+b*x+c             | Substitution et affichage polynomiaux natifs bornés au Lot 5 ; pas d'élément graphique            |
| Réponse attendue      | Donnée privée et politique pédagogique officielle de l'instance              | Source privée et rationnel exact calculé au Lot 5 natif ; correction toujours absente             |

Proposition canonique de tuple : un tableau ordonné `values` de valeurs scalaires typées, associé à une liste de noms de composantes de même longueur. Le tuple reçoit une identité de groupe distincte ; chaque composante a un nom unique dans l'espace des paramètres. Les références aux composantes utilisent ces noms scalaires : pas de syntaxe d'indexation ni de déstructuration mathématique nouvelle. Un groupe est publié atomiquement, sans écraser un scalaire ni partager un nom avec une variable libre. Choix et génération produisent la même représentation ; le stockage du groupe et de ses liaisons doit éviter deux copies divergentes. Cette représentation est **proposée**, non un contrat runtime retenu ; indexation, imbrication et opérations vectorielles sont hors périmètre initial.

Pour computed : collecter les symboles sur le raw de CortexJS, distinguer constantes, paramètres et variables libres ; une valeur scalaire calculée ne peut pas dépendre d'une variable libre. Rejeter références inconnues, collisions et cycles avant les tirages. Construire un ordre topologique stable, avec l'ordre de définition comme départage ; évaluer chaque dépendance seulement après ses entrées. Les noms `r1`, `r2`, `delta`, `xSommet` sont pédagogiques dans les exemples en prose, **refusés par les règles de noms v1 actuelles**. Leur éventuelle admission est un arbitrage de contrat, pas une extension implicite du parseur.

Conserver la formule originale et son raw ; vérifier admissibilité, type et domaine avant réduction. Division par zéro, non-fini, résultat complexe dans un domaine réel ou valeur restant symbolique doivent échouer explicitement ; un domaine non démontré reste indéterminé, jamais réputé valide. Sérialisation exacte des rationnels à décider via CortexJS ; ne pas convertir une fraction en flottant pour faire réussir le contrat. Pas de promesse d'exactitude pour toute expression, ni de comparaison universelle fondée sur `isIdenticallyEqual()` seul. Calcul, simplification, rendu LaTeX et correction restent des responsabilités séparées.

### Contraintes et stratégies bornées

Les contraintes complètent les quatre mécanismes. Bornes/exclusions sont des domaines locaux directement calculables ; comparaisons et conditions intervariables sont des prédicats déclaratifs sur des valeurs déjà produites. Exemples cibles : a≠0, b>a, a²+b²=c². Le profil de prédicats devra être borné et évalué par CortexJS sans code exécutable ni parseur supplémentaire.

| Situation              | Garantie actuelle                                                                                                                | Garantie cible                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Définition incorrecte  | Erreurs de structure/options, noms, champs ou types ; diagnostics avec chemins                                                   | Ajouter arités incohérentes, références inconnues, cycles et prédicats hors profil avant tirage                                        |
| Domaine prouvé vide    | `empty-domain` pour plage/grille/liste vide ou entièrement exclue ; bornes inversées également classées ainsi par l'API actuelle | Réserver la preuve d'impossibilité aux domaines directement calculables ou à une vérification exacte bornée ; pas d'inférence générale |
| Candidat invalide      | Pas de recherche de candidats sous relations ; exclusions traitées par complément                                                | Prédicat faux ou résultat calculé invalide : rejeter le candidat et tracer la cause ; aucune valeur partielle                          |
| Tentatives épuisées    | `limit` après 128 mots pour un rang RNG ; ce n'est pas une recherche sous contraintes                                            | Diagnostic distinct d'épuisement du budget de candidats ; jamais une preuve de domaine vide                                            |
| Condition indéterminée | Aucune évaluation de condition                                                                                                   | Échec explicite/diagnostic d'indétermination ; ne pas accepter, ni classer faux ou impossible                                          |

Les codes cibles restent à décider ; cette table ne promet aucun nouvel export. Une expression invalide structurellement échoue immédiatement ; une erreur de domaine propre à un candidat peut conduire à un nouvel essai borné. Un calcul hors budget ou une condition indéterminée termine la génération avec un diagnostic distinct.

Stratégie initiale proposée : sélectionner directement dans les domaines locaux ; pour un groupe contraint, retirer **tout le groupe**, dans l'ordre déclaré, au lieu de réparer une composante. Pour une contrainte globale impliquant computed, retirer tous les paramètres aléatoires de la tentative et recalculer le graphe ; les contraintes ne sont pas des arêtes de dépendance de calcul. Un cycle de computed est interdit, une relation mutuelle entre deux valeurs tirées est permise. Le flux RNG continue entre tentatives, avec budget, ordre, filtrage éventuel et comptage versionnés. Préférer une construction par formules ou une liste connue pour un événement rare ; le rejet borné peut échouer même lorsqu'une solution existe. Il ne garantit ni résolution ni uniformité générale sur les solutions. Tout changement de stratégie nécessite une nouvelle version ; conserver les vecteurs de `parameters-v1`.

Les bornes d'un computed sont, dans la cible, des **conditions de validation du résultat**, jamais un domaine de tirage ou une consigne de clamp. Les historiques comme 106 doivent être revus explicitement ; ce choix n'en change pas la signification silencieusement. Budget de candidats, tailles de tuples, profil des prédicats et limites de calcul restent à fixer avant le lot concerné. Un budget d'opérations n'est pas une deadline préemptive ; isolation réelle toujours au Lot 8.

### Recettes mathématiques cibles, non exécutées

| Besoin                     | Composition et conditions                                                               | Garantie mathématique / limite                                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Carré parfait              | Tirer un entier n, calculer a=n²                                                        | Entier carré ≥0 ; exclure n=0 pour un carré strictement positif                                                            |
| Discriminant carré parfait | Tirer a entier non nul et r1/r2 entiers ; b=−a(r1+r2), c=a*r1*r2                        | a*x²+b*x+c=a(x−r1)(x−r2) ; delta=a²(r1−r2)² ; delta>0 si r1≠r2, delta=0 si r1=r2                                           |
| Carré d'un binôme          | Tirer p/q entiers ; a=p², b=2pq, c=q²                                                   | a*x²+b*x+c=(p*x+q)² ; p≠0 si un vrai trinôme de degré 2 est requis                                                         |
| Triplet pythagoricien      | Choisir (3,4,5), (5,12,13), (8,15,17), ou tirer m>n≥1 entiers ; a=m²−n², b=2mn, c=m²+n² | a²+b²=c² et composantes positives ; aucune garantie de primitivité sans conditions supplémentaires, pas d'algorithme dédié |

Un discriminant entier n'est pas nécessairement carré (x²+x−1 donne 5). Un carré strictement positif donne deux racines rationnelles pour des coefficients entiers et a≠0 ; le zéro donne une racine double. Un discriminant nul ne garantit pas que le polynôme est le carré d'une expression réelle : −(x−1)² a aussi delta=0. La construction par racines entières couvre un sous-ensemble utile, pas tous les trinômes à racines rationnelles. Aucun test de génération de ces recettes n'existe encore ; 103 tire a/b/c et calcule désormais −b/(2a) dans l'instance native, sans variable computed ni génération de discriminant carré.

### Exemples JSON et contrats cibles

**Compatible aujourd'hui avec `generateVariables` uniquement** (pas une définition d'exercice) :

```json
[
  { "name": "a", "kind": "integer", "min": -5, "max": 5, "exclusions": [0] },
  {
    "name": "b",
    "kind": "decimal",
    "min": -1,
    "max": 1,
    "precision": 2,
    "exclusions": []
  },
  { "name": "c", "kind": "choice", "values": [-5, -2, 1, 3, 7] }
]
```

**Propositions documentaires refusées par l'API actuelle** : `generation-draft` est un marqueur de brouillon, pas une version disponible. Les champs `definitions`, `components`, `mode`, `constraints` et `expression` sont proposés ; leur validation et leur représentation exacte restent à arbitrer.

Tuple par choix :

```json
{
  "generationVersion": "generation-draft",
  "definitions": [
    {
      "name": "t",
      "kind": "tuple",
      "mode": "choice",
      "components": ["a", "b", "c"],
      "values": [
        [3, 4, 5],
        [5, 12, 13],
        [8, 15, 17]
      ]
    }
  ]
}
```

Tuple par génération sous contraintes ; les composantes reprennent les domaines scalaires existants :

```json
{
  "generationVersion": "generation-draft",
  "definitions": [
    {
      "name": "t",
      "kind": "tuple",
      "mode": "generate",
      "components": [
        {
          "name": "a",
          "kind": "integer",
          "min": 1,
          "max": 10,
          "exclusions": []
        },
        {
          "name": "b",
          "kind": "integer",
          "min": 1,
          "max": 10,
          "exclusions": []
        }
      ],
      "constraints": [{ "format": "latex", "source": "a<b" }]
    }
  ]
}
```

Calculs à dépendances multiples et en chaîne ; r/s sont les deux racines, d représente delta, f l'abscisse du sommet. Tous les noms utilisent une lettre autorisée aujourd'hui ; cela ne rend pas `computed` compatible :

```json
{
  "generationVersion": "generation-draft",
  "definitions": [
    { "name": "a", "kind": "integer", "min": -3, "max": 3, "exclusions": [0] },
    { "name": "r", "kind": "integer", "min": -5, "max": 5, "exclusions": [] },
    { "name": "s", "kind": "integer", "min": -5, "max": 5, "exclusions": [] },
    {
      "name": "b",
      "kind": "computed",
      "expression": { "format": "latex", "source": "-a(r+s)" }
    },
    {
      "name": "c",
      "kind": "computed",
      "expression": { "format": "latex", "source": "ars" }
    },
    {
      "name": "d",
      "kind": "computed",
      "expression": { "format": "latex", "source": "b^2-4ac" }
    },
    {
      "name": "f",
      "kind": "computed",
      "expression": { "format": "latex", "source": "\\frac{-b}{2a}" }
    }
  ],
  "constraints": [{ "format": "latex", "source": "r\\ne s" }]
}
```

La contrainte r≠s cible delta>0 ; sans elle, la construction autorise delta=0. L'énoncé f(x)=a*x²+b*x+c conserve x libre, et la réponse attendue peut consommer f sans devenir un nouveau générateur. Les sorties computed, le snapshot typé et l'évolution de `PrivateInstanceV1.generation.parameters` (actuellement `Record<string, number>`) restent à spécifier ; aucun de ces JSON ne résout ce choix de transport.

### Capacités nécessaires à NovLearn Admin

Sans concevoir l'interface, les API devront permettre : valider une définition avec chemins de diagnostics, exposer les mécanismes/domaines réellement supportés et leurs limites, décrire dépendances et cycles, prévisualiser valeurs et contraintes avec une seed/version, régénérer avec une autre seed, rejouer avec une révision immuable et tester une liste bornée de seeds. Les erreurs doivent permettre de retrouver composante, formule ou contrainte et de distinguer impossibilité prouvée, candidat rejeté, indétermination et budget épuisé. La validation autonome du modèle étendu reste à concevoir ; `validateDefinition` n'en dispose pas aujourd'hui.

Réutiliser `generateVariables` pour les tirages déjà supportés et la future construction d'instance pour les expressions/affichages. Les prévisualisations détaillées sont privées côté auteur autorisé ; elles ne deviennent pas la projection élève. Pas de moteur de génération distinct dans Admin, de service ajouté ni d'obligation de nouvelle API publique pour chaque geste d'édition. Les noms et signatures futurs sont ouverts ; la construction finale doit garder l'autorité serveur, les valeurs exactes et les objets boxed privés.

## API et preuves variables-v2

Même fonction publique generateVariables : tableau + version absente/parameters-v1 conserve le résultat v1 ; objet GenerationDefinitionV2 + variables-v2 produit values/groups/replay. Surcharges typées GenerateVariablesResultV1/V2 ; aucune nouvelle fonction runtime. Seed nombre/chaîne canonique identique. Contraintes repérées par JSON Pointer /constraints/index, références au contexte plat ; groupes par ID et noms ordonnés. Rejeu v2 : engineVersion, generationVersion, seed, draws, attempts ; aucune valeur/groupe dans les échecs. Options invalides sont rejetées avant génération et ne fournissent pas de replay.

Exemples effectivement exécutés : tuple ordonné a,b entiers 1…10, a<b, seed 42 → (5,6), 2 tentatives/4 mots. Lignes pythagoriciennes (3,4,5)/(5,12,13)/(8,15,17), composants entiers 1…17 : seed 42 → (3,4,5), seed 0 → (8,15,17), un mot. Exclure 3 et 8 de a laisse (5,12,13), aucun mot (singleton). Les deux modes utilisent le même values plat + groups ; groupes sans values dupliqué. Définition/contraintes/budgets font partie du rejeu, jamais seed seule.

Preuves : generation-v2 et generation-v2-limit, bilan dans [progress](../progress.md). Oracle pythagoricien indépendant sur 256 seeds ; six opérateurs sur 96 seeds chacun par arithmétique BigInt ; scalaires et groupes sur 128 seeds. Inconnue/exception et épuisement de rejet injectés ; limites JSON/candidats/mots, choix/exclusions, données hostiles et intégration v3 testés. Les formules générales, graphes, prédicats avancés et deadline ne sont pas supportés du fait de ces tests.
