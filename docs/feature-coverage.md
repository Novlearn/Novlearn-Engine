# Matrice de couverture fonctionnelle

État canonique au 11 octobre 2026 : schemaVersion 5, package privé 0.1.0.
IT = implémenté/testé dans le profil indiqué ; D = différé ; HP = application hors
cœur ; ? = preuve absente. Tests de rejet ≠ support. Aucun catalogue exhaustif,
CI distante ou navigateur réexécuté. [Bilan local](progress.md).

| Capacité                                    | État / profil                                                | Preuves locales                                          | Limites / responsable futur                         |
| ------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------- | --------------------------------------------------- |
| Contrat/JSON/noms/IDs/policies              | IT, modèle unique runtime                                    | contracts, composition, canonical                        | Noms longs/scopes locaux D ; contracts/math         |
| Integer/exclusions                          | IT ≤10^6                                                     | generation, génération exhaustive des petits domaines    | Domaine vide explicite                              |
| Decimal/grille/exclusions                   | IT précision 0–6, coefficient ≤10^9                          | generation, substitution                                 | Pas de snap ni tolérance                            |
| Choix/exclusions                            | IT nombres finis uniques                                     | generation, canonical, tuples                            | Usage mathématique exige profil exact               |
| Tuple choice/generate                       | IT arité 2–8, liaisons plates                                | tuples, tuple-failures, Pythagore 256 seeds              | Imbrication/indexation/vectoriel D                  |
| Computed rationnel                          | IT ratios/intermédiaires ≤10^9                               | computed, computed-failures, fractions/grilles/chaînes   | Irrationnels/complexes/fonctions D                  |
| Dépendances/cycles                          | IT tri stable avant RNG                                      | computed, erreurs injectées                              | Pas de workflow pédagogique                         |
| Comparaisons/restrictions                   | IT six relations, variable/constant/latex, bornes/exclusions | tuples six opérateurs 96 seeds, computed                 | Solveur/prédicats symboliques généraux D            |
| Atomicité/budgets/diagnostics               | IT faux/retry distinct de vide/inconnu/erreur/épuisement     | trois suites de failures et generation-limit             | Deadline/mémoire préemptive D, Lot 8                |
| Carrés/discriminants/racines entières       | IT construction par composition                              | computed, oracles BigInt 32/24 seeds                     | Aucun solveur/spécialisation                        |
| Parsing scalaire raw                        | IT syntaxe/source/symboles                                   | math-input                                               | Parsing ≠ évaluation/domaine ; ADR 005              |
| Substitution/rationnels/polynômes           | IT profil borné, domaine avant réduction                     | substitution, instantiation                              | Racines, fonctions partielles, égalité symbolique D |
| Textes/labels/sections                      | IT @a/@@, ordre/sectionId, inline opaque                     | composition, instantiation                               | Fragments riches/sanitation UI D/HP                 |
| Multiquestions/attendus privés              | IT par ID, un contexte, échec atomique                       | composition 24 seeds, instantiation 64 seeds, computed   | Grading/formats supplémentaires D                   |
| QCM simple/multiple                         | IT options texte/rationnelles, IDs, collisions exactes       | composition, computed, canonical                         | Transport/grading QCM D, Lot 6                      |
| Projection sans fuite                       | IT sélection à chaque niveau, copies détachées               | injection de secrets dans composition/instance           | Provenance/droits applicatifs HP                    |
| Rejeu/sérialisation/immutabilité            | IT artefact/ordre/seed/ID identiques                         | canonical : quatre générations et snapshot complet figés | Anciens snapshots expérimentaux non rejouables      |
| Soumission LaTeX brute                      | IT schéma 5, aucune autorité client                          | contracts, math-input, canonical                         | QCM/ensembles/intervalles/texte D                   |
| CorrectionResult / gradeAnswer              | D                                                            | Aucun correcteur annoncé                                 | Lots 6/7 : exact, forme, inconnu, erreur distincts  |
| Formes/approximation/ensembles/intervalles  | D                                                            | Cas de conception, aucune preuve native                  | Lots 6/7 par famille                                |
| Équations/systèmes, graphes/suites/tableaux | D                                                            | Rejets explicites d'éléments hors profil                 | Compléments Lot 5 ; fiches spécification            |
| Arbres/vecteurs/plan complexe               | D                                                            | Sources externes observées seulement                     | Compléments Lot 5 ; aucun renderer cœur             |
| Corpus/huit rapports                        | IT conservation/inventaire 558 chemins                       | corpus hash/octets/roundtrip                             | Adaptation réelle D, Lot 9                          |
| Transcription 103                           | IT question manuelle canonique, graphe exclu                 | corpus, contracts, instantiation                         | Aucun exercice complet migré                        |
| JSON historique/compatibilité               | D conversions ; octets IT                                    | Corpus seulement                                         | Futur adaptateur hors cœur, sans JS exécuté         |
| Node ESM/types/package fermé                | IT vérifications locales                                     | package, check, pack dry-run                             | Consommateur tarball externe/bundler D, Lot 11      |
| Isolation de contexte                       | IT contexte local par appel                                  | math/rejeu/appels intercalés                             | Processus terminables D, Lot 8                      |
| FastAPI/Colyseus/production                 | D intégration moteur                                         | Aucune E2E officielle                                    | Lots 8/10/11                                        |
| React/MathLive/Admin                        | HP/D                                                         | Aucune suite navigateur exécutée                         | Applications séparées, vrai banc MathLive futur     |
| Auth/DB/publication/points/tentatives       | HP                                                           | Sources observées, pas adoption moteur                   | Backends applicatifs                                |
| CI distante/release/catalogue complet       | ?/D                                                          | CI configurée seulement                                  | Vérification séparée avant adoption                 |

La consolidation est livrable séparé : toutes les capacités antérieures utiles
conservées, aucune cible future déclarée supportée. [Audit/correspondances](consolidation.md),
[spécification](functional-specification.md), [roadmap](roadmap.md).
