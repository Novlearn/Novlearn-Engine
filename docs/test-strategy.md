# Stratégie de vérification

## Socle exécuté et capacités futures

Les tests actuels vérifient distribution ESM, fermeture des chemins internes, conservation du corpus, contrats natifs, parsing scalaire, génération déterministe, instance/substitution/projection v1 et composition scalaire v2. Ils ne corrigent aucun exercice. La [couverture globale](feature-coverage.md) distingue ces preuves des tests futurs. Les résultats POC (162 Vitest, 23 Edge documentés, non réexécutés) sont des preuves externes à requalifier.

Lot 2 exécuté après réception des huit lignes : tests de contrat sur transcription de la question 103, versions inconnues, champs/types malformés, diagnostics localisés, aliases refusés, collisions de symboles, ranges/exclusions impossibles, extensions JSON privées et aller-retour sans perte. Corpus vérifié byte-identique par SHA-256, inventaire de tous les chemins et préservation des chaînes JSON source. Les tests Node de conservation sont en `.mjs` pour utiliser fs/crypto sans introduire de dépendance de types Node dans le cœur TypeScript. Les fixtures natives sont importées comme JSON pour les tests TypeScript.

Les tests critiques de soumission refusent seed/policy/verdict client et conservent exactement LaTeX vide, incomplet, placeholder ou virgule. Leur succès est uniquement celui du transport ; les tests du Lot 3 couvrent désormais les rejets mathématiques du profil scalaire. Un test accepte délibérément une définition avec LaTeX malformé pour documenter cette séparation, sans compter cette limitation comme parsing supporté. Les tests du Lot 5 vérifient la projection native et composée par sélection avec champs sensibles injectés, le détachement et le rejeu ; intégrations HTTP et futures branches avancées restent à prouver.

Chaque test futur porte une famille et une garantie : support exact, limitation connue, ou exploration. Une limitation verte ne compte pas comme capacité supportée. Les références mathématiques sont indépendantes de la méthode testée : ne pas appeler la même comparaison Cortex des deux côtés de l'assertion.

## Matrice obligatoire

| Axe             | Cas et assertions                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Parsing/profils | Source intacte, MathJSON raw, `3.14`, `3,14`, `3{,}14`, clavier/collage ; profil fixé serveur                                               |
| Complétude      | Vide, Nothing, placeholder, erreurs imbriquées, fonction inconnue, sinx et ln nu ; rejection/diagnostic explicite                           |
| Symboles        | Paramètres a,b distincts de x,n ; inconnu, nom réservé, collision, hypothèses d'un travail non réutilisées                                  |
| Exact           | Rationnels, coefficients négatifs/fractions, degré borné, vrais négatifs, débordement entier sûr, symbole extra et sin rejetés              |
| Domaine         | x/x vs 1, (x²−1)/(x−1) vs x+1, ln(x²) vs 2ln(x), sqrt(x²) vs x ; singularités non oubliées                                                  |
| Forme           | 2/4 vs 1/2, 2(x+1) vs 2x+2, x+x+2 ; valeur et forme indépendantes, forme inconnue indéterminée                                              |
| Génération      | Golden vectors RNG ; mêmes révision/seed/version, contraintes, exclusion impossible, grille décimale, tuples, cycles et références absentes |
| Migration       | Chaque document réel et chaque enveloppe, extensions, collisions, aliases, contenu non pris en charge ; brut conservé                       |
| Sécurité        | JS legacy jamais exécuté, payload/AST bornés, prototype/clé malveillante, politique/verdict/seed client ignorés                             |
| Projection      | Aucune solution, flag correct ou seed recomposable ; IDs QCM stables, instance falsifiée/accès invalides                                    |
| Ressources      | Calcul synchrone terminé à échéance, nettoyage, mémoire/concurrence/file bornées, crash/recyclage et travail suivant sain                   |
| Distribution    | npm pack, installation tarball consommateur, import Node et consommation types ; bundler navigateur sans builtin Node                       |
| E2E             | JSON autorisé → adaptation → instance → saisie réelle MathLive → correction serveur → rejeu, avant pilote                                   |

## Propriétés et régressions

Le complément multiquestion/QCM est testé par `tests/composition.test.ts` : tous les attendus préparés, ordre/IDs préservés, réordonnancement sans changement d'association, échec d'une question sans instance partielle, options aux IDs stables malgré permutation, sélection privée simple/multiple et collisions après substitution. La fixture synthétique du trinôme a=2,b=−4,c=5 prépare abscisse 1 et minimum 3 ; deux oracles BigInt indépendants sont vérifiés sur 24 seeds. Les objets imbriqués de chaque branche publique sont éprouvés par injection de champs secrets. Génération et frontière math existantes réutilisées ; v1 et ses assertions conservés, garde de schéma ajoutée aux helpers depuis unknown. Soumissions multiples corrigées, transport QCM, tentatives partielles/reprises, feedback autorisé, droits et tour de duel périmé demandent les futurs tests de grading/intégration applicative.

Générer des cas bornés avec seed enregistrée : rationnels attendus par arithmétique indépendante ; polynômes à coefficients connus puis constructions équivalentes, mutation d'un coefficient pour non-égalité, symétrie/réflexivité seulement dans famille autorisée. Vérifier substitution et invariants de génération sur plusieurs seeds. Ajouter un framework de property testing seulement au lot qui l'utilise.

Pour chaque bug : fixture minimale, résultat mathématique justifié, politique, source/profil et statut attendu. Snapshots de sérialisation utiles, mais ne remplacent pas une assertion mathématique. Conserver tests qui montrent les trous de domaine et limitations de parse.

## CI

`npm ci` puis `npm run check` et `npm pack --dry-run` sur Node24.19, Linux et Windows. Droits `contents: read`, aucune publication. Lockfile obligatoire ; épinglage SHA des actions à traiter avant release si les tags restent utilisés. Installation tarball/types externes et suite navigateur à ajouter dans leurs lots. CI GitHub configurée, son exécution distante n'est pas prouvée ici.

Un timeout Vitest sert au diagnostic ; il ne prouve ni préemption synchrone ni limite mémoire. Les essais ressources se déroulent dans processus contrôlés et produisent des preuves de terminaison/récupération. Les seuils performance viennent des SLO acceptés, pas d'une durée arbitraire du laptop.

## Passage de lot

Exécuter les vérifications appropriées, conserver commandes/résultats, mettre à jour progress et liste de support. Aucun lot de correction accepté sans vrais positifs, vrais négatifs et hors-famille indéterminée. Aucun adaptateur annoncé complet sans corpus réel. Aucun branchement officiel serveur avant démonstration isolation et absence de secrets.
