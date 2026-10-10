# Architecture proposée

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
3. Vérifier la famille sur raw ; conserver contraintes de domaine et témoins de forme avant réduction. Le raw peut avoir perdu certaines commandes comme placeholder : garde spécifique à concevoir et tester sans second parseur LaTeX.
4. Substituer les seuls paramètres déclarés ; préserver les variables libres. Construire canonical et dérivées nécessaires dans un contexte isolé.
5. Comparer par une méthode exacte explicitement couverte ; sinon indétermination. Vérifier la forme séparément, seulement lorsque la valeur est établie.
6. Sérialiser le contenu affichable sans fuite des réponses ou diagnostics internes sensibles.

Candidats MVP : rationnels exacts et polynômes univariés de degré/taille bornés à coefficients rationnels, sans variable au dénominateur dans raw. CortexJS fournit les coefficients ; la couche vérifie leurs types/bornes. Une identité de fonctions partielles demande un contrat de domaine distinct. Types réel/entier, hypothèses et restrictions comme x≠0 ne sont pas interchangeables.

`x/x` et `1` illustrent une décision pédagogique ouverte : égalité sur le domaine imposé x≠0 ou égalité des fonctions partielles avec mêmes domaines. Pour logarithmes, racines et rationalisations non couvertes, ne pas promettre un extracteur universel : indeterminate.

## Modèle de données proposé, non gelé

Le premier sous-ensemble v1 est maintenant défini dans `src/contracts/types.ts` et [ADR 004](adr/004-first-contract.md), à partir de la question 103 du corpus réel. La définition privée et la soumission disposent de validateurs structurels ; les DTO d'instance privée et publique sont concrétisés par la tranche native du Lot 5 ([ADR 007](adr/007-native-instantiation.md)). Les orientations générales suivantes ne promettent pas le support des contrats étendus.

- Définition privée : identité/révision, déclarations de paramètres et variables libres, contenus, attendus et politique de correction.
- Instance privée : référence à la révision, version moteur et RNG, seed, tirages et données nécessaires au rejeu. Snapshot ou conservation immuable de la définition requis.
- Projection publique : instance opaque, énoncés et options autorisés. Attendus, flags corrects et seed sensible exclus par construction.
- Soumission : instance/élément, réponse brute ou IDs QCM stables. Le serveur retrouve définition, politique et instance officielles.

Contrats JSON versionnés et validés runtime aux frontières ; unknown jusqu'à validation. Ne pas transmettre les objets internes de CortexJS. Version de schéma ≠ version moteur ≠ révision définition ; évolution/rejeu à documenter. Extensions legacy conservées avec provenance, pas réinterprétées silencieusement.

## API minimale envisagée

`validateDefinition` et `validateSubmission` effectuent la validation structurelle, `parseMathInput` conserve la syntaxe brute et `generateVariables` tire des paramètres typés. Cette dernière API est décrite dans ADR 006, sans construction d'instance. `instantiateExercise` orchestre ces API pour le contrat rationnel natif et `projectPublicInstance` sélectionne l'affichage. La substitution reste interne. Les noms ci-dessous sont les candidats historiques de l'architecture ; seuls les deux noms concrets précédents implémentent aujourd'hui instance/projection :

| Besoin                 | Opération candidate  | Résultat conceptuel                                          |
| ---------------------- | -------------------- | ------------------------------------------------------------ |
| Valider une définition | validateDefinition   | Définition validée ou diagnostics avec chemins               |
| Générer une instance   | generateInstance     | Instance privée reproductible ou erreur de contraintes       |
| Substituer             | substituteParameters | Expression interne contrôlée, variables libres conservées    |
| Produire l'affichage   | prepareDisplay       | Projection publique et fragments LaTeX                       |
| Corriger               | gradeAnswer          | Verdict, justification et conformité selon politique serveur |

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
