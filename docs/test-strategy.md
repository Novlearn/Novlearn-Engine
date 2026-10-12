# Stratégie de vérification

M10 : legacy-adapter.test.ts et log-affine.test.ts, conversion des huit vrais
documents reçus avec originaux/mappings558 chemins, quatre seeds par ligne et
oracles indépendants de génération/attendus. Creator plat/publication : tests
synthétiques fondés sur sources, aucune capture runtime revendiquée. Refus de JS,
getters, placeholders inconnus complets, décimaux/scripts incomplets, commentaires,
conflits, types inconnus et recettes mal formées. Domaine avant réduction et
comparaison indéterminée injectée/restaurée ; grands rationnels et attendu brut
recontrôlés. Forme e^k distincte de exp(q) de même valeur.
tools/check-legacy-host.mjs : huit parcours réels de conversion/instanciation/
projection/correction sous worker neuf et quota Linux, plus recette invalide.
Sept régressions Python/FastAPI après whitelist de l'adaptation, sans HTTP d'import.
Les inventaires/transcriptions manuelles antérieurs restent distincts de cette
conversion complète. Qualification et commandes exactes dans progress.md.

M9 : 10 tests CLI Vitest, 7 tests Python/FastAPI autonomes, tools/check-linux.mjs
avec 12 contrôles sous scope cgroupv2 borné. Quotas absents/swap autorisé refusés
avant PID worker ; Linux sans privilèges, réseau coupé, mounts readonly et cache
éphémère. Interruption synchrone sous parent bloqué, mémoire via compteurs OS,
fork bloqué, cleanup parent mort et récupération après heap/crash/protocole.
Les tests propres à Windows sont distincts ; politique OS du poste refuse
actuellement les binaires reconstruits. Aucun skip ajouté pour masquer ce refus.
Suite package Linux et checks Windows disponibles rapportés séparément.

M7 : [banc MathLive réel](mathlive-compatibility.md), 45 observations archivées,
90 corrections depuis deux formats et 35 tests de provenance/régression. Clavier,
collage et clavier virtuel effectivement utilisés, séparés des insertions API.
Rejeu Vitest distinct de la séance navigateur ; aucune CI navigateur exécutée.

M4 : algebra-grading/collection-grading depuis le package distribué, oracles
BigInt d'expansion et signes/membership, coefficients mutés, solutions prescrites,
trous raw/imposés, radicaux quadratiques, unions/contacts/fermetures. Indétermination,
échecs atomiques, projection sous canaris, JSON/paramètres/variables et récupération
de panne. Juxtaposition mixte refusée même avec variable ; exposants multidigits
testés avec accolades LaTeX. [Profil et budgets](adr/011-algebra-collections.md).

M3 : grading.test.ts teste correction officielle par IDs, nombres exacts, racines,
constantes, tolérances inclusives, infinis, QCM et texte ; cinq états et récupération
des pannes box/parse. Oracles BigInt de numeric-constant-bounds certifient les deux
bornes π/e indépendamment de Cortex. Contre-exemples raw, profil indéterminé,
politique client, getters, projection sous canaris, templates/rejeu/JSON et sept
exports. Gardes de types ajustées dans deux tests de fixtures mathématiques ;
exception du parseur attend désormais technical-error, sans retirer de test.

M2 : display-elements.test.ts qualifie toutes les données avancées, leurs références,
ordres/valeurs/probabilités exacts, domaines non vérifiés, relations imbriquées,
getters, échecs atomiques et projection sous injection de secrets. Fixtures
synthétiques et seul graphe observé 64 transcrit manuellement : aucun test de
rendu ni migration complète annoncé.

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
| Distribution         | Build/types/import Node, sept exports runtime, chemins internes refusés, packaging local                                |

Les goldens protègent la stabilité, pas la vérité mathématique à eux seuls : garder
les assertions indépendantes. Les tests de limites ne certifient pas les capacités
refusées. Aucun test critique retiré pour faire passer une limitation.

Anciennes attentes de compatibilité remplacées par schéma canonique/refus explicite.
Suites tuples/computed nommées par comportement, aucun orchestrateur historique
exercé. Les sept cas d'anciens profils devenus inadéquats sont remplacés par refus
ou assertions positives du format canonique, avec tests de choix finis conservés.

M5 : forms.test.ts conserve la syntaxe originale, valeur et forme distinctes,
régressions signe de soustraction/doubles signes dans quotients/coefficients,
unités/zéro/décimaux, alternatives officielles certifiées et projection.
Oracles PGCD entier et discriminant quadratique indépendants ; inconnus propagés.
Les huit cas de l'oracle quadratique sont individualisés pour respecter le timeout
Vitest sans prétendre interrompre Cortex. [Règles](adr/012-pedagogical-forms.md).

M6 : school-math.test.ts, fixture native synthétique sans migration historique.
Identités usuelles contre oracles scolaires indépendants, domaines log/tangente
avant réduction, inconnus, parsing explicite, substitutions négatives/décimales,
relecture des cibles dirigées, attendu −∞, dérivée polynomiale connue et projection.

M8 : [hôte Windows à quota OS](adr/014-isolated-node-host.md), tests de blocage
synchrone réel/PID disparu, boucle parent bloquée, mort du parent, Buffer external
hors heap, crash/OOM et requête suivante saine ; protocoles corrompus, quotas,
file, annulation, close, environnement, spawn synchrone et opérations publiques.
Fixtures de chaos privées, aucune opération de chaos distribuée. Sans lanceur OS
qualifié, refus explicite ; tests Windows conditionnels, aucune preuve Linux.

Tests futurs : transport Python/mesures M9, conversions exécutées
au Lot 9, HTTP falsifié/duel périmé au Lot 10, consommateur tarball
et bundler au Lot 11. CI Linux/Windows configurée, aucune exécution distante
annoncée ici. Timeout Vitest/promesse ne préempte jamais le calcul synchrone.
