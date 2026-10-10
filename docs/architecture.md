# Architecture et contrats

Référence consolidée le 10 octobre 2026. [Vision](exercise-engine-vision.md), [spécification](functional-specification.md), [parcours](exercise-lifecycle.md), [couverture](feature-coverage.md) et [audit critique](architecture-review.md) complètent ce document sans dupliquer les ADR de profils. Les schémas cibles restent documentaires ; les contrats v1 et le code ne sont pas modifiés.

## Frontières

Un package TypeScript portable, indépendant des frameworks, utilisant CortexJS comme unique bibliothèque mathématique. Livraison ESM et `.d.ts`, point d'entrée racine explicite. Les Lots 2 à 4 exportent `validateDefinition`, `validateSubmission`, `parseMathInput` et `generateVariables`. La tranche native du Lot 5 ajoute `instantiateExercise` et `projectPublicInstance`, avec calcul rationnel exact borné, substitution et affichage du trinôme 103. MathLive reste dans les applications ; la soumission actuelle conserve une saisie LaTeX brute. Une entrée MathJSON n'est pas acceptée par ce contrat initial.

Quatre modules logiques suffisent pour démarrer ; ce sont des responsabilités prévues, pas des dossiers vides créés :

| Module prévu | Responsabilité                                                                          | Exclusions                                |
| ------------ | --------------------------------------------------------------------------------------- | ----------------------------------------- |
| `contracts`  | Validation runtime, versions, diagnostics et projection publique                        | Pas de calcul ni données applicatives     |
| `math`       | Parsing CortexJS, raw, admissibilité, substitution, calcul ciblé et sérialisation LaTeX | Pas de CAS ni parseur alternatif          |
| `generation` | RNG seedé versionné, paramètres, dépendances et contraintes bornées                     | Pas de random global ni fallback invalide |
| `grading`    | Comparaison par famille et politique de forme, preuves et verdict                       | Pas de vérité fournie par client          |

`adapters/legacy` traite les enveloppes historiques ; `adapters/node` pourra traiter le transport et la supervision. Aucun builtin Node dans l'entrée portable. Ne pas exporter les objets ComputeEngine/boxed ; ils restent dans le contexte d'un travail. Source/raw conservés, formes dérivées calculées au besoin ; ne pas persister six représentations équivalentes.

## Parcours mathématique

1. Conserver les octets/source et profil d'entrée connu du serveur. Borner taille et structure avant le parsing.
2. Parser avec CortexJS en mode raw et collecter diagnostics ; rejeter erreurs, entrées incomplètes, symboles/opérateurs interdits selon une politique validée.
3. Vérifier la famille sur raw ; conserver contraintes de domaine et témoins de forme avant réduction. Le raw peut avoir perdu certaines commandes comme placeholder : les gardes lexicales du Lot 3 rejettent les commandes connues avant parsing, sans second parseur LaTeX ni garantie sur toute syntaxe future.
4. Substituer les seuls paramètres déclarés ; préserver les variables libres. Construire canonical et dérivées nécessaires dans un contexte isolé.
5. Comparer par une méthode exacte explicitement couverte ; sinon indétermination. Vérifier la forme séparément, seulement lorsque la valeur est établie.
6. Sérialiser le contenu affichable sans fuite des réponses ou diagnostics internes sensibles.

Candidats MVP : rationnels exacts et polynômes univariés de degré/taille bornés à coefficients rationnels, sans variable au dénominateur dans raw. CortexJS fournit les coefficients ; la couche vérifie leurs types/bornes. Une identité de fonctions partielles demande un contrat de domaine distinct. Types réel/entier, hypothèses et restrictions comme x≠0 ne sont pas interchangeables.

Décision de cible confirmée par l'utilisateur dans cette mission : mêmes domaines par défaut, domaine imposé explicite possible par question. `x/x` et `1` ont des domaines différents ; sous domaine imposé x≠0, une future méthode devra prouver que les deux expressions sont définies et égales sur ce domaine. Pour logarithmes, racines et rationalisations non couvertes, ne pas promettre un extracteur universel : indeterminate. Aucun tel correcteur n'est implémenté.

## Modèle de données proposé, non gelé

Le premier sous-ensemble v1 est maintenant défini dans `src/contracts/types.ts` et [ADR 004](adr/004-first-contract.md), à partir de la question 103 du corpus réel. La définition privée et la soumission disposent de validateurs structurels ; les DTO d'instance privée et publique sont concrétisés par la tranche native du Lot 5 ([ADR 007](adr/007-native-instantiation.md)). Les orientations générales suivantes ne promettent pas le support des contrats étendus.

- Définition privée : identité/révision, déclarations de paramètres et variables libres, contenus, attendus et politique de correction.
- Instance privée : référence à la révision, version moteur et RNG, seed, tirages et données nécessaires au rejeu. Snapshot ou conservation immuable de la définition requis.
- Projection publique : instance opaque, énoncés et options autorisés. Attendus, flags corrects et seed sensible exclus par construction.
- Soumission : instance/élément, réponse brute ou IDs QCM stables. Le serveur retrouve définition, politique et instance officielles.

Contrats JSON versionnés et validés runtime aux frontières ; unknown jusqu'à validation. Ne pas transmettre les objets internes de CortexJS. Version de schéma ≠ version moteur ≠ révision définition ; évolution/rejeu à documenter. Extensions legacy conservées avec provenance, pas réinterprétées silencieusement.

## API minimale envisagée

`validateDefinition` et `validateSubmission` effectuent la validation structurelle, `parseMathInput` conserve la syntaxe brute et `generateVariables` tire des paramètres typés. Cette dernière API est décrite dans ADR 006, sans construction d'instance. `instantiateExercise` orchestre ces API pour le contrat rationnel natif et `projectPublicInstance` sélectionne l'affichage. La substitution reste interne. Les noms ci-dessous sont les candidats historiques de l'architecture ; seuls les deux noms concrets précédents implémentent aujourd'hui instance/projection :

| Besoin                 | Opération candidate   | Résultat conceptuel                                          |
| ---------------------- | --------------------- | ------------------------------------------------------------ |
| Valider une définition | validateDefinition    | Définition validée ou diagnostics avec chemins               |
| Générer une instance   | instantiateExercise   | Instance privée reproductible ou erreur de contraintes       |
| Substituer             | substituteParameters  | Expression interne contrôlée, variables libres conservées    |
| Produire l'affichage   | projectPublicInstance | Projection publique et fragments LaTeX                       |
| Corriger               | gradeAnswer           | Verdict, justification et conformité selon politique serveur |

Substitution peut rester interne si aucun consommateur réel n'en a besoin. Les objets mathématiques privés ne doivent pas devenir un deuxième contrat public. Pas de fonctions fictives lançant « not implemented ».

La correction doit distinguer correct, valeur correcte/forme refusée, incorrect démontré, indeterminate, erreur de saisie/traitement. Exact/heuristique et conformité de forme sont des dimensions distinctes ; une forme inconnue reste indéterminée. Timeout = erreur technique typée, jamais faute mathématique. Une heuristique peut alimenter un diagnostic, pas une acceptation officielle exacte.

## Génération et contenus

Le modèle cible décidé comporte quatre mécanismes : aléatoire numérique (integer/decimal), choix, tuple générique (choix d'une ligne ou composantes sous contraintes) et calculé par expression CortexJS. Les seuls tirages actuellement livrés sont integer/decimal/choice ; tuples, calculs et contraintes intervariables ne sont pas implémentés. Spécification, contrats JSON proposés et garanties dans [ADR 006](adr/006-deterministic-generation.md), couverture réelle/testée dans [compatibility.md](compatibility.md#matrice-de-couverture-fonctionnelle--génération).

Un paramètre fournit une valeur scalaire ; un tuple ordonne des valeurs liées ; un computed dérive une valeur. Une expression paramétrée comme f(x)=a*x²+b*x+c consomme ces valeurs et conserve x libre. L'attendu est une donnée privée de correction, distincte de l'expression d'énoncé. Aucun type de génération `function`, doublet/triplet ou perfect_square : les carrés parfaits, discriminants carrés, binômes au carré et triplets pythagoriciens se décrivent par composition. Les recettes ne sont pas des capacités livrées.

Reproductibilité : même définition/révision + seed + moteur/RNG/politique de génération → même instance sérialisée. Ordre des tirages et algorithme RNG versionnés. Contraintes validées, essais bornés et échec explicite. Décimaux sur grille entière lorsque l'exactitude est exigée. Graphe computed : références absentes, cycles et collisions paramètres/variables libres interdits.

Ces garanties de rejeu sont livrées pour l'instance native entière du Lot 5, avec ID fourni et versions identiques. Le snapshot étendu reste ouvert. Les contraintes cibles complètent les mécanismes sans solveur général : domaines locaux directement calculables puis prédicats bornés sur groupes/valeurs calculées. Distinguer structure invalide, domaine prouvé vide, candidat rejeté, indétermination et budget épuisé. Aucun échec de recherche n'est une preuve d'impossibilité, aucune condition inconnue n'est acceptée. Le complément 4 bis proposé fixe les groupes et comparaisons simples avant le snapshot étendu du Lot 5 ; les formules et contraintes sur computed restent au Lot 5 étendu.

Les capacités moteur requises pour le futur Admin sont validation avec chemins, description des dépendances, prévisualisation privée, régénération/rejeu et tests bornés sur plusieurs seeds. Réutiliser les mêmes mécanismes ; pas de conception UI ni de service supplémentaire. Les schémas étendus, formats exacts de computed et adaptation des DTO d'instance restent à décider explicitement.

Les marqueurs historiques de contenu devront avoir une grammaire de gabarit bornée distincte de la syntaxe mathématique ; substitution par CortexJS pour les expressions. Aucune chaîne JavaScript historique exécutée. Figures non couvertes conservées avec diagnostic, sans promesse de renderer.

## Interface TypeScript ↔ FastAPI

FastAPI ne peut pas importer le package TS comme module Python. La correction exige un runtime JS compatible et une frontière sérialisée, mais aucun transport n'est retenu définitivement.

| Option                        | Atout                                            | Limite / preuve requise                                          |
| ----------------------------- | ------------------------------------------------ | ---------------------------------------------------------------- |
| Processus Node par requête    | Simple, calcul terminable, pas de service réseau | Coût initialisation ; vérifier débit et nettoyage                |
| Pool de processus local       | Amortit Cortex, file et concurrence bornées      | Supervision, IDs, protocole, recyclage et scopes                 |
| Service Node interne          | Mutualisation et déploiement indépendant         | Auth, réseau, disponibilité, versionnement et exploitation       |
| JS embarqué dans Python       | Frontière locale                                 | Compatibilité Cortex/ESM, dépendance et isolation non démontrées |
| Runtime serveur Node existant | Réutilise Colyseus/Next                          | Couplage fonctionnel, disponibilité et accès depuis FastAPI      |

Recommandation expérimentale : benchmark CLI par requête puis pool local, service réseau seulement si besoin démontré. Mesurer latences froid/chaud p50/p95, mémoire, concurrence, crash, timeout, récupération ; obtenir contraintes de déploiement et SLO avant ADR.

Transport candidat : messages JSON versionnés, identifiant de travail, erreur structurée, taille bornée ; stdin/stdout pour CLI, stderr pour logs. Arguments séparés, aucune invocation shell dérivée de la réponse. Python asyncio subprocess évite de bloquer l'event loop ; expiration exige terminaison et collecte du processus, pas seulement abandon de l'attente. [FastAPI](https://fastapi.tiangolo.com/async/), [Python](https://docs.python.org/3/library/asyncio-subprocess.html).

## Sécurité et ressources

Ne pas exécuter un calcul étudiant coûteux dans l'event loop de FastAPI/Colyseus. Promise.race, délai Vitest, iterationLimit et recursionLimit ne prouvent pas un délai mural. Un worker/processus terminable doit être évalué ; pour garantie mémoire forte, processus avec limites OS/conteneur, concurrence/file plafonnées et recyclage. [Node workers](https://nodejs.org/api/worker_threads.html).

Isoler hypothèses et déclarations par travail ; pas de singleton mutable partagé non testé. Vérifier entrées, profondeur/nœuds et nombres ; protéger les logs, l'ordre QCM, les secrets et l'accès aux instances côté application. Le moteur ne gère ni authentification, ni base de données, ni scoring applicatif.

## Inventaire réel des modules

| Fichiers                                         | Responsabilité actuelle                                                     | Preuves / limites                                                                 |
| ------------------------------------------------ | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/index.ts`                                   | Six fonctions publiques et types de données                                 | Test import ESM/export privé ; pas d'API grading                                  |
| `src/contracts/types.ts`                         | Contrats définition/soumission/instances v1 et paramètres/valeurs           | Types seuls ne prouvent pas un constructeur ni un validateur de tous les concepts |
| `src/contracts/validation.ts`                    | JSON inerte, budgets, définition native et soumission, copies détachées     | Tests getters/cycles/aliases/versions/chemins ; validation structurelle           |
| `src/contracts/parameters.ts`, `decimal-grid.ts` | Validation interne des tirages et encodage de grille                        | Aucun nouvel export public de validation des paramètres                           |
| `src/math/input.ts`                              | Profil scalar-latex-v1, source/raw et contexte de symboles                  | Parsing synchrone sans calcul ni garantie de domaine                              |
| `src/generation/random.ts`, `variables.ts`       | Mulberry32 et tirages typés integer/decimal/choice                          | parameters-v1, états locaux, golden vectors ; pas de graphe computed              |
| `src/math/substitution.ts`                       | Substitution CortexJS et admission/calcul rationnel-polynomial ciblé        | Interne ; aucun service de calcul universel public                                |
| `src/instantiation.ts`                           | Orchestration et projection par sélection                                   | Définition native entière, une question ; snapshot officiel requis                |
| `tests/`                                         | Corpus, contrats, saisie, génération, instance/substitution et distribution | 8 fichiers Vitest ; pas de tests grading, UI, serveur ou migration                |

`contracts` valide les données, `math` interprète les mathématiques, `generation` gère valeurs/contraintes, `instantiation.ts` orchestre, futur `grading` statue par question. Ce découpage suffit ; pas de dossier/module vide par type d'élément, de registry de plugins ou de factories de services. Les futurs adaptateurs legacy et supervision Node restent séparés de l'entrée portable.

## Concepts et invariants

Les noms ci-dessous rapprochent les concepts demandés des modèles existants. Une ligne de cible n'impose pas un nouveau type public ni une table de stockage.

| Concept / modèle actuel                                                          | Responsabilité et données                                                             | Cycle de vie / références                                           | Invariant / version                                                          | Visibilité                                                              |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| ExerciseDefinition / `ExerciseDefinitionV1`                                      | Document, métadonnées utiles, paramètres, variables, contenus, attendus et politiques | Brouillon applicatif → révision publiée immuable ; ID+revision      | Version de schéma, IDs uniques, capacités déclarées ; v1 question unique     | Privée auteur/serveur ; sélection de contenu vers public                |
| ExerciseElement / absent comme union native                                      | Élément discriminé informatif/mathématique/question                                   | Ordre dans la définition, ID stable                                 | Type/champs admis ; extension de schéma avant nouveau type                   | Données publiques sélectionnées ; solutions exclues                     |
| QuestionDefinition / `question` v1                                               | Énoncé, réponse attendue, format et politique, points                                 | ID d'élément question ; même révision que document                  | Un attendu/politique par question, pas d'association par indice              | Énoncé public, attendu/politique privés                                 |
| VariableDefinition / `IntegerParameterV1`, `GenerationParameterV1`, `VariableV1` | Domaine de tirage ou variable libre ; computed/tuple futurs                           | Nom unique dans contexte ; graphe computed en cible                 | Paramètres/variables libres disjoints ; évolution de schéma distincte du RNG | Définitions privées, valeurs visibles seulement si nécessaires à énoncé |
| GeneratedVariables / `GenerateVariablesResult`                                   | Values typées et métadonnées de rejeu                                                 | Résultat local d'une génération, consommé par instance              | Version RNG/ordre ; aucune valeur partielle en échec                         | Privé ; pas d'export direct vers élève                                  |
| AnswerDefinition / `expectedLatex` et `policy` v1                                | Source attendue ou IDs corrects, format de réponse                                    | Membre privé de question, préparé dans instance                     | Pas d'attendu calculé à partir du rendu ; famille et domaine vérifiés        | Privé                                                                   |
| CorrectionPolicy / fixe dans v1                                                  | Valeur/forme/domaine/tolérance selon famille                                          | Attachée à question de révision officielle                          | Version du schéma et règles mathématiques ; non modifiable par élève         | Privé ; seules consignes utiles sont publiques                          |
| ExerciseInstance / `PrivateInstanceV1`                                           | Snapshot, versions, génération, éléments/attendus instanciés                          | ID opaque fourni par serveur, référence révision immuable           | Version schéma/génération/instanciation ; données JSON, copies détachées     | Serveur, preview auteur autorisée                                       |
| QuestionInstance / `display.question` + `expectedMath` v1                        | Affichage et attendu séparés ; collection en cible                                    | instanceId+questionId                                               | Correspondance bijective avec questions admises                              | Partie affichable publique, correction privée                           |
| PublicInstance / `PublicInstanceV1`                                              | Version, ID opaque, titre/contenus/questions/options autorisés                        | DTO dérivé pour renderer                                            | Allowlist par type, aucune propagation de champ inconnu                      | Client                                                                  |
| AnswerSubmission / `SubmissionV1`                                                | Instance/question et source LaTeX brute, IDs QCM futurs                               | Commande sans identité de verdict ; idempotence applicative externe | Validation runtime/version ; association officielle après validation         | Client → serveur ; réponse personnelle protégée                         |
| CorrectionResult / absent                                                        | Statut, valeur, forme, preuve/méthode, diagnostics                                    | Résultat sans état par question, persistance backend                | Exact/heuristique/indéterminé/erreur séparés ; contrat versionné futur       | Interne ; feedback public sélectionné par backend                       |
| ValidationResult / `ValidationResult<T>`                                         | Copie validée ou diagnostics code/path/message                                        | À chaque frontière JSON                                             | Structure ne prouve pas mathématiques ; type union fermé                     | Diagnostics privés selon contexte, sélection pour UI                    |

Points descriptifs ne sont pas les points attribués. Métadonnées historiques chapter/difficulty/competences et flags sont des besoins de contrat à normaliser sous contrôle du backend ; aucune colonne Supabase ni priorité d'alias n'est imposée ici. État brouillon/publié, droits et historique sont des données de persistance applicative, pas des champs mathématiques nécessaires.

## Contrats cibles documentaires

Premier périmètre confirmé : liste plate avec sections ; texte, expression, question et QCM simple/multiple. Proposition sobre : une question porte son attendu et sa politique privés, plutôt qu'une deuxième table parallèle qui peut diverger. À la projection, garder ID/énoncé/format/options et supprimer **par sélection** les champs privés. Le QCM est un élément corrigible partageant le modèle d'association de question, avec son discriminant de réponse.

Exemple TypeScript **de discussion**, non exporté, non exhaustif, non accepté par `validateDefinition`. Il illustre le premier sous-ensemble de données, sans prétendre figer les contrats tuple/computed ou les profils futurs :

```ts
type MathSourceDraft = { format: 'latex'; source: string };
type PolicyDraft =
  | { kind: 'rational'; form: 'value-only' }
  | { kind: 'option-ids'; mode: 'single' | 'multiple' };
type ElementDraft =
  | { id: string; type: 'section'; title: string }
  | { id: string; type: 'text'; text: string }
  | { id: string; type: 'expression'; expression: MathSourceDraft }
  | {
      id: string;
      type: 'question';
      text: string;
      answer: {
        format: 'latex';
        expected: MathSourceDraft;
        policy: Extract<PolicyDraft, { kind: 'rational' }>;
      };
      points?: number;
      hint?: string;
      explanation?: string;
    }
  | {
      id: string;
      type: 'mcq';
      text: string;
      options: { id: string; text: string }[];
      answer: {
        format: 'option-ids';
        expected: string[];
        policy: Extract<PolicyDraft, { kind: 'option-ids' }>;
      };
    };
type SubmissionDraft = {
  schemaVersion: 'exercise-draft';
  instanceId: string;
  questionId: string;
  answer:
    | { format: 'latex'; source: string }
    | { format: 'option-ids'; selected: string[] };
};
```

Exemple JSON de définition multiquestion **refusée aujourd'hui**. `exercise-draft` est un marqueur documentaire, pas un numéro de version réservé. Les deux questions portent des attendus rationnels distincts ; aucune capacité multiquestion n'est démontrée par cet exemple :

```json
{
  "schemaVersion": "exercise-draft",
  "id": "trinome-etude",
  "revision": "draft-1",
  "title": "Étude d'un trinôme",
  "parameters": [
    { "name": "a", "kind": "integer", "min": 1, "max": 3, "exclusions": [] },
    { "name": "b", "kind": "integer", "min": -6, "max": 6, "exclusions": [0] },
    { "name": "c", "kind": "integer", "min": -5, "max": 5, "exclusions": [] }
  ],
  "variables": [{ "name": "x", "domain": "real" }],
  "elements": [
    { "id": "partie-a", "type": "section", "title": "Sommet et minimum" },
    { "id": "intro", "type": "text", "text": "Étudier la fonction suivante." },
    {
      "id": "fonction",
      "type": "expression",
      "expression": { "format": "latex", "source": "a x^2+b x+c" }
    },
    {
      "id": "q-sommet",
      "type": "question",
      "text": "Donner l'abscisse du sommet.",
      "answer": {
        "format": "latex",
        "expected": { "format": "latex", "source": "\\frac{-b}{2a}" },
        "policy": { "kind": "rational", "form": "value-only" }
      },
      "points": 1
    },
    {
      "id": "q-minimum",
      "type": "question",
      "text": "Donner la valeur du minimum.",
      "answer": {
        "format": "latex",
        "expected": { "format": "latex", "source": "c-\\frac{b^2}{4a}" },
        "policy": { "kind": "rational", "form": "value-only" }
      },
      "points": 1
    }
  ]
}
```

Exemple documentaire de soumission QCM, également refusé aujourd'hui :

```json
{
  "schemaVersion": "exercise-draft",
  "instanceId": "opaque-instance-id",
  "questionId": "q-options",
  "answer": { "format": "option-ids", "selected": ["option-a", "option-c"] }
}
```

Instance privée cible : snapshot de définition/révision + versions et rejeu + valeurs communes typées + éléments affichables ordonnés + attendus/politiques indexables par questionId. Éviter deux collections persistées concurrentes : les index sont des vues dérivées des éléments/questions. Projection cible : schemaVersion/instanceId/titre/éléments publics ; pour une question, ID/texte/format/points autorisés ; pour QCM, options et mode sans attendu. Format/type est nécessaire à la saisie publique ; règles privées de correction ne sont pas exportées.

Résultat de correction cible, illustration non implémentée :

```ts
type CorrectionResultDraft = {
  schemaVersion: 'correction-draft';
  instanceId: string;
  questionId: string;
  status:
    | 'correct'
    | 'incorrect'
    | 'invalid-input'
    | 'indeterminate'
    | 'technical-error';
  value: 'equal' | 'different' | 'unknown' | 'not-checked';
  form: 'satisfied' | 'violated' | 'unknown' | 'not-required' | 'not-checked';
  evidence?: { kind: 'exact' | 'heuristic'; method: string };
  diagnostics: { code: string; path: string; message: string }[];
};
```

Invariants futurs à valider runtime : `correct` exige valeur prouvée et forme exigée satisfaite ; `incorrect` exige différence prouvée ou violation de forme prouvée avec motif ; preuve heuristique seule ne permet aucun verdict officiel exact ; domaine/forme inconnus donnent `indeterminate` ; attendu invalide ou panne donne diagnostic de défaut officiel/erreur technique. Les combinaisons impossibles devront être interdites dans l'union finale, pas simplement représentées par ces champs d'illustration.

## API publique : existant et cible minimale

| Fonction                       | Entrée → sortie actuelle                                                                  | Garanties / responsabilité                                        | Suite nécessaire                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| `validateDefinition`           | unknown → ValidationResult<ExerciseDefinitionV1>                                          | JSON inerte, version/structure, copie ; pas de parsing            | Étendre par schéma revu pour liste/éléments/génération             |
| `validateSubmission`           | unknown → ValidationResult<SubmissionV1>                                                  | Source LaTeX conservée, champs clients interdits refusés          | Union de formats ; association officielle reste backend            |
| `parseMathInput`               | source string + contexte → source/profile + syntax/symbols ou diagnostics                 | Raw détaché, profil borné, pas d'évaluation/domaine               | Nouveaux profils motivés ; contexte multi-caractères non implicite |
| `generateVariables`            | définitions unknown + seed/version → values/replay ou diagnostics                         | Trois tirages, versions/options validées, sans fallback           | Groupe/contraintes/computed sous versions compatibles              |
| `instantiateExercise`          | définition unknown + instanceId/seed/versions → instance privée ou diagnostics stage/path | Orchestration rationnelle native entière, domaines bornés/rejeu   | Liste entière, formats/éléments étendus, snapshot typé             |
| `projectPublicInstance`        | snapshot privé officiel → DTO public                                                      | Allowlist et copies ; pas de validation de provenance client      | Sélection par type, tests anti-fuite multiquestion/QCM             |
| `gradeAnswer` (candidat futur) | instance officielle + soumission → résultat par question                                  | Aucune politique fournie séparément par client ; méthodes bornées | Lot 6 puis formes 7, isolation hôte 8                              |

Diagnostics et tests d'exercices : exploiter validation/instanciation/correction et agréger une liste bornée de seeds côté outil Admin. Une API d'inspection de dépendances/capacités sera ajoutée seulement si un besoin consommateur le justifie ; pas de service/factory, `generateInstance` ou `prepareDisplay` en doublon des noms concrets. Substitution/math de figure restent internes jusqu'à besoin d'export démontré.

## Bibliothèque de rendu et intégrations

`exercise-ui` est une responsabilité future partagée : renderer de la projection publique, saisie/événements par IDs et MathLive dans l'UI. API conceptuelle : projection + callbacks de réponses brutes + état de feedback déjà autorisé + options de présentation. Pas de prop `isCorrect` décidant la vérité ; mode auteur ne doit pas charger un DTO privé dans le renderer élève. Admin peut ajouter une coque privée de solutions et diagnostics au même rendu public.

Géométrie, pixels, axes et disposition relèvent de l'UI ; evaluation de fonction, termes, probabilités/normes ou modules mathématiques réutilisent des données préparées ou une frontière commune admise. Les approximations de dessin ne servent jamais d'oracle. Les éditeurs Admin (formulaires, palettes, déplacement) restent distincts du renderer. Version du DTO/capacités de chaque renderer vérifiée ; aucune branche inconnue silencieusement supprimée.

| Emplacement envisagé                               | Évaluation                                                                                                                                                                       |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package frère `packages/exercise-ui` dans ce dépôt | Recommandation à vérifier lors de l'adoption : changements de contrats/rendu coordonnés ; sous-package React séparé et dépendances hors cœur ; monorepo seulement au besoin réel |
| Package partagé dans NovLearn                      | Possible si outillage existant permet consommation par Admin ; risque de couplage à Next et extraction ultérieure                                                                |
| Nouveau dépôt indépendant                          | Publication/gouvernance supplémentaires sans nécessité démontrée ; non imposé                                                                                                    |

Aucun package UI ni changement d'outillage créé. Décider l'emplacement après inspection des builds consommateurs ; séparation des packages est requise, choix de repository reste une recommandation ouverte.

| Composant         | Échange avec moteur / autres composants                                        | Responsabilités extérieures                                                           |
| ----------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Frontend NovLearn | Projection publique, réponses brutes et feedback API                           | UI/saisie/accessibilité ; aucune vérité officielle client                             |
| Backend FastAPI   | Transport JSON versionné vers runtime JS isolé ; état officiel, corrections    | Auth, quotas, persistance, progression ; transport à mesurer au Lot 8                 |
| Colyseus          | Import du même package côté serveur, projection et correction sous supervision | Session/horloge/points/anti-rejeu ; pas de calcul coûteux event loop                  |
| Frontend Admin    | Définition de travail, diagnostics et preview privée autorisée                 | Édition/catalogue, état transitoire, commandes de publication                         |
| Backend Admin     | Validation/capacités/preview via runtime compatible puis stockage              | Droits/taxonomie/révisions/conflits/publication ; peut réutiliser le backend existant |
| Renderers React   | DTO public versionné, événements de saisie et feedback                         | Dessin ; composants d'édition séparés                                                 |
| Supabase          | Accès uniquement par couches applicatives autorisées                           | Stockage/auth selon architecture application ; aucun import dans le cœur              |

Le moteur de correction authoritative est unique dans ses règles et versions, pas nécessairement un service réseau unique. FastAPI peut utiliser un processus/pool local ; Colyseus peut appeler le package dans un processus/worker supervisé. Versions divergentes d'artefacts/politiques doivent être détectées, pas compensées par un booléen. Runtime serveur Next existant est une option conditionnelle, pas une obligation ni un microservice supplémentaire.

## Versionnement et garanties à prouver

Séparer version JSON, révision d'exercice, version package/moteur, CortexJS épinglé, version RNG et version instanciation ; ajouter la compatibilité des règles de correction dans le contrat futur, sans champ fictif de version actuelle. Les consommateurs conservent un manifeste de versions/artefacts nécessaires au rejeu. Les snapshots anciens ne deviennent pas compatibles automatiquement avec un schéma étendu ; nouvelle version et adaptateur explicite plutôt que changement silencieux de v1.

Proposition : un schéma étendu distinct pour éléments/questions/valeurs, en conservant v1 et `parameters-v1`. Le numéro définitif, tuple/bindings, arité/budgets, profils exacts et noms étendus restent D23. JSON doit conserver les sources, être sans cycles/BigInt/non-finis/objets boxed et avoir une projection par sélection testée sur champs sensibles injectés. Types compile-time ne remplacent jamais validation runtime ni preuve de domaine.

Tests encore nécessaires : réordonnancement et réponses associées, plusieurs attendus, atomicité en erreur d'une question, tuple/computed/indétermination, options mélangées et IDs, projection de tous les types, domaines/formes, limites réelles terminables, import navigateur et API officielle FastAPI/Colyseus. La cohérence documentaire ne prouve aucune de ces capacités.
