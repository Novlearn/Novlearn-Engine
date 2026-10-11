# Stratégie de vérification

M1 : named-parameters.test.ts qualifie la convention descriptive CortexJS, lettres
juxtaposées conservées, noms/digits/unités/propriétés héritées/espaces/réservés,
références et cycles avant RNG, tuples/restrictions/contraintes et instance privée/
publique/rejeu. Oracles BigInt pour binôme, trinôme/discriminant, carré/chaîne et
Pythagore construit. Tests historiques de rejet des anciens noms remplacés par
des noms réellement invalides, sans retirer les comportements critiques.

Référence canonique schemaVersion 5. Exécuter npm.cmd ci, npm.cmd run check et
npm.cmd pack --dry-run sous PowerShell ; rapporter les commandes réellement
exécutées. Tests depuis l'entrée distribuée, injections de limites via modules
internes en suites isolées. [Bilan](progress.md), [support](feature-coverage.md).

| Domaine              | Vérification                                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Contrats             | JSON inerte, copie, unknown-fields/version, chemins, collisions, budgets, aucune exécution de getter/code               |
| Génération           | Entiers/grilles/choix/tuples, exclusions, dépendances/cycles, déterminisme/ordre, budget et absence de fallback         |
| Calculs/comparaisons | Fractions exactes, inconnue/erreur injectées, domaine avant réduction, faux suivi d'indéterminé terminal                |
| Mathématiques        | Oracles indépendants BigInt : produits croisés, discriminants, racines construites, Pythagore, deux réponses de trinôme |
| Instanciation        | Toutes questions et IDs, sections/ordre/permutations, sources, QCM/collisions, échec sans valeur partielle              |
| Projection           | Secrets injectés dans chaque branche et objet imbriqué, allowlist et copies détachées                                   |
| Rejeu                | Générations et snapshot complets figés dans reference-vectors.json, JSON/seed normalisée/artefacts, immutabilité        |
| Corpus               | Deux copies byte-identiques, hash connu, inventaire/8 rapports ; transcription ≠ migration                              |
| Distribution         | Build/types/import Node, six exports runtime, chemins internes refusés, packaging local                                 |

Les goldens protègent la stabilité, pas la vérité mathématique à eux seuls : garder
les assertions indépendantes. Les tests de limites ne certifient pas les capacités
refusées. Aucun test critique retiré pour faire passer une limitation.

Anciennes attentes de compatibilité remplacées par schéma canonique/refus explicite.
Suites tuples/computed nommées par comportement, aucun orchestrateur historique
exercé. Les sept cas d'anciens profils devenus inadéquats sont remplacés par refus
ou assertions positives du format canonique, avec tests de choix finis conservés.

Tests futurs : vrais positifs/négatifs/inconnus de correction/forme/domaines au Lot
6/7, terminaison réelle/nettoyage/mémoire/concurrence au Lot 8, conversions exécutées
au Lot 9, banc réel MathLive/HTTP falsifié/duel périmé au Lot 10, consommateur tarball
et bundler au Lot 11. CI Linux/Windows configurée, aucune exécution distante
annoncée ici. Timeout Vitest/promesse ne préempte jamais le calcul synchrone.
