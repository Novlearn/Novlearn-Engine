# État et transmission

## Mission autonome V1 — M4 algèbre/domaines/collections vérifié (11 octobre 2026)

Dernier lot committé avant M4 : M3 **5d45d77**, M2 d8a39a2, M1 8ef7de5, M0 e072a57.
Branche main ; CDC accentué confirmé et corpus original inchangés. README,
progress/decisions/roadmap et CDC 4.2–4.4, 5.2–5.3, 6.2, 7.3–7.4 relus.
Root seul auteur ; analyses/revues indépendantes en lecture seule favorables.

Livré : QuestionResponse et politiques algébriques/collections, variable
officielle univariée, traces JSON algebra/collection et comparisonDomain cofini.
Polynômes/fractions par coefficients/produits croisés Cortex exacts, restrictions
raw conservées, domaines complets ou imposés prouvés ; equation/inequality
degré0–2 par solutions, ensembles/vide/intervalles FR/unions/bornes quadratiques.
CorrectionResult domaine séparé et equal-on-common-domain ; projections sélectionnées.
D39/ADR 011 ; nouveaux math/algebra, math/collections, deux suites M4. Contrats/
validation, instanciation, grading, input/numeric/substitution et docs adaptés.
Fixture M3 expression maintenant prouvée, aucun test critique supprimé.

Première passe ciblée : 16 échecs/273, puis collections 3/88 ; leading zeros,
groupements, relecture scalaire et fixtures multi-exposants LaTeX corrigés.
Ciblé suivant : **391 tests/4 fichiers PASS, 221,41 s**, grading/substitution inclus.
Premier check complet : **1029/1030 PASS, 371,66 s** ; un affichage 2x devenu
2\cdot x. Options Cortex d'écriture explicite limitées au toLatex de relecture
interne ; affichage par défaut préservé. Composition ciblée : **77/77 PASS, 39,19 s**.
Une relance check arrêtée au format de deux chaînes d'appels ; seconde passe
Prettier et format:check PASS. **Dernier npm.cmd run check PASS : 1031 tests /
20 fichiers, 443,40 s**, build/typecheck/lint/format inclus. +214 tests M4.

**npm.cmd pack --dry-run PASS**, code npm0 explicite : 102 fichiers, 105,3 kB
compressés / 517,7 kB décompressés, SHA1 e37975ebc11f4792432f8a60c54541e52399ac02.
Import ESM sept exports, racine d.ts sans boxed/CE/NumericValue et diff-check PASS.
CDC SHA256 FFB97D8F1B3401E462DA6411D4DDE671A06D9522A6D745E28D06FB2F2E9459AE ;
corpus/copie 0F4D1173A78F9BD41E88678704C212C5147627E7E5A42EE28EB398F25F41C3AE inchangés.
ci exécuté M0, aucune dépendance/lock modifiée. Aucun navigateur MathLive,
CI distante, consommation tarball, adaptation/migration historique annoncé.

Limites ADR 011 : coefficients rationnels, degréstructurel16/proof32, relations
effectives0–2, extraction de trous degree0–2 ou produits/puissances raw, AST128/
profondeur16 et plafonds64 cumulés ; radicaux incompatibles indéterminés. Aucune
préemption ni CAS/parseur supplémentaire. V1 non terminée : M5–M12 requis.
Clôture immédiate par commit local `feat(grading): prove algebra and collections with preserved domains` ;
aucun push. Puis M5 formes pédagogiques, après lecture des documents/critères.

## Mission autonome V1 — M3 correction numérique/discrète validé (11 octobre 2026)

Dernier lot livré : **M2 `d8a39a2`**, précédé de M1 `8ef7de5` et M0 `e072a57`.
Branche main ; CDC utilisateur seul non suivi après commit M2. Référence officielle
accentuée confirmée, aucune nouvelle permission requise pour M3. V1 active.

README, progress/decisions/roadmap relus pour M3, CDC 4.1/4.2/5/7.1/7.2/7.7,
contrats de soumission/attendus/validation et frontière de substitution examinés.
Analyse indépendante initiale en lecture seule terminée ; auteur principal unique.
Sept exports runtime avec gradeAnswer ; D38/ADR 010. Questions réelles/infinies/
texte et soumissions latex/text/selection, politiques officielles et cinq états.

Profil de preuve implémenté et testé : ratios exacts et q√d réels via les
NumericValue Cortex isExact et !isComplex ; comparaisons exactes seulement entre
deux valeurs ainsi établies. SDK local exact-numeric-value.d.ts confirme sa forme
canonique/comparaisons exactes ; sondes de revue √(1/2) et 3√8/4 positives.
Sommes de radicaux incompatibles restent symboliques, jamais fausses par défaut.
π/e : identité structurelle après admission/domaine, ou différence encadrée sous
profil documenté ; aucune confiance universelle en isEqual/isIdenticallyEqual ou
API dont le nom contient exact mais applique une tolérance/échantillonnage.
Source décimale encodée avant réduction, sqrt(-1)^2 refusé au sous-terme réel,
infinis reconnus dans AST explicitement saisi, jamais après 1/0 évalué.

Tolérance officielle A+R|attendu| inclusive, identités fermées, radicaux de même
base et encadrements affines monoconstante π/e avec oracle indépendant BigInt.
QCM par ensemble d'IDs ; variantes texte strictes/normalisation optionnelle.
Valeur within-tolerance distincte d'une égalité exacte, infini comparé spécialement.
Domaines raw avant réduction, preuve inconnue indéterminée ; panne parsing
technical-error distincte des MathJSON Error. Canaris/projection/types/rejeu/JSON.

Build/typecheck/lint intermédiaires PASS. Premier ciblé 137/142, cinq échecs :
produit implicite devant radical refusé (corrigé sans admettre nombre mixte),
oracle/roundtrip liés, assertion de frontière π ajustée au cas réellement croisé.
Une erreur de narrowing TS et une parenthèse de test corrigées. Ciblés suivants :
176/176 puis 181/181 sur grading/constant-bounds/substitution. Revue lecture seule
sans faux verdict/fuite, trois lacunes complétées : identité sous tolérance,
attendu nul sous bornes et exception parsing élève. Dernier ciblé après correctifs :
**241 tests / 4 fichiers PASS, 29,13 s**, avec math-input. Aucun test supprimé.
Revue finale indépendante favorable : aucun faux verdict/fuite observé, appels
exacts filtrés et limites documentées, aucune écriture/suite globale déléguée.
`npm.cmd run check` final PASS : **817 tests / 18 fichiers, 173,84 s**,
build/typecheck/lint/format. `npm.cmd pack --dry-run` PASS (code npm 0 explicite) :
**94 fichiers, 86,5 kB / 413,2 kB**, SHA1
573debebb11857877fbd0295304c5c11dd79db52. Première enveloppe PowerShell avait signalé
code 1 malgré tarball-dry-run affiché ; réexécution avec code npm explicite 0,
aucune publication. Import ESM sept exports, types publics sans boxed, diff check
PASS, empreintes CDC/corpus/copie originales inchangées. npm ci avait été exécuté
au M0, dépendances/lock inchangés depuis. Aucune CI distante, navigateur ou
consommation tarball courante annoncée. Commit local du lot :
`feat(grading): prove numeric and discrete answers from official instances`.
La V1 reste active ; prochain lot M4, puis M5–M12 obligatoires.
Isolation préemptive et adoption officielle restent M8 ; aucun service/transport/UI
ou modification des voisins autorisé par ce travail. Aucun arbitrage bloquant M3.

## Mission autonome V1 — M2 données d'éléments validé (11 octobre 2026)

Lot précédent : M1 `8ef7de5`, 592 tests validés. M2 validé, auteur
principal unique ; analyses/revues indépendantes en lecture seule. D37/ADR 009.
Catalogue privé typé, indication clavier sans autorité ; rich-text, équations/
systèmes, hints/explanations privés, graphes/suites, signes/variations/valeurs/
statistiques, arbres, vecteurs/geometry/plan complexe. Contrats/validation/refs/
substitution/projection et diagnostics, aucune UI ou migration automatique.

Fichiers : nouveaux contracts/elements et display-validation, display-elements,
math/display et display-data-checks, tests/display-elements, ADR 009 ; adaptations
composition/types/index/instantiation/input/substitution, README et docs actuels.
Formules raw sans évaluation/réduction, domaine public unverified ; nombres de
rendu rationnels exacts, admission shared et contextes/scopes isolés. Aides retirées
du public, objets imbriqués reconstruits par sélection. Ancien profil d'attendus
et vecteurs conservés. Corpus huit lignes inchangé ; seul graphe 64 testé par
transcription native manuelle, autres fixtures synthétiques identifiées.

Revue corrigée : booléens imbriqués/chaînes dans scalaires/relations, wrappers
transparents ; variation contradictoire/valeur définie infinie/limites impossibles,
droite dégénérée après substitution, probabilités partielles dépassant 1.
Commandes intermédiaires build/typecheck/lint PASS. Première tranche 79/79 PASS,
puis 98/98 PASS sur deux fichiers (67 display + 31 substitution), Vitest 32,55 s.
Une erreur de narrowing TS intermédiaire corrigée ; build/typecheck/lint suivants
PASS. Six régressions de variations infinies ajoutées ensuite. Premier check
complet PASS : **665 tests / 16 fichiers**, Vitest 147,78 s. Revue finale favorable.
Audit principal complémentaire : les choices insérés dans les formules doivent
passer par l'encodeur exact comme les autres champs ; garde ajoutée avec
régression fraction 0.5 et précision hors budget. Première assertion du nouveau
test attendait 1/2 réduit ; ajustée à 5/10 raw, conformément à la présentation
sans réduction. Check alors interrompu, non compté. Test ciblé de la garde PASS
(1,61 s), puis `npm.cmd run check` final PASS : **666 tests / 16 fichiers**,
Vitest 116,83 s, build/typecheck/lint/format. Aucun test supprimé.
`npm.cmd pack --dry-run` PASS : **82 fichiers, 71,9 kB / 337,4 kB**, aucune
publication. Import ESM six exports, `git diff --check` PASS, empreintes des huit
lignes/copied fixture et CDC identiques au M0. Aucune CI distante, suite navigateur
ou consommation tarball courante annoncée. Commit local :
`feat(elements): instantiate typed presentation data safely`.

Prochain lot : M3 contrats de soumission/correction numérique/discrète. V1 non terminée ;
M3–M12 et toutes leurs exigences restent obligatoires.

## Mission autonome V1 — M1 génération/instanciation validé (11 octobre 2026)

M0 livré au commit `e072a57` sur main ; seul CDC utilisateur non suivi avant M1.
M1 couvre CDC-10/11 : D36, grammaire partagée 1–32 caractères et références
`\mathrm{nom}` déclarées au dictionnaire CortexJS local, sans modifier juxtaposition,
RNG/schéma/API. Scalaires/composantes/computed/contraintes/inconnues/textes/
QCM/réponses utilisent le même contexte. Source et données privées conservées.

Fichiers : contracts/names (nouveau), validation ; math/input/substitution ;
generation/candidates (bornes propres) ; named-parameters.test.ts (nouveau),
adaptations de six suites existantes pour les noms désormais supportés et codes
de diagnostic correspondants. Aucun test supprimé ni vecteur modifié. README,
decisions/architecture/vision/spécification/couverture/roadmap/stratégie et ADR 005.
Auteur unique des fichiers : agent principal ; revue indépendante en lecture seule.

Recettes avec oracles BigInt : carrés, chaînes, trinômes à racines entières et
discriminants carrés, carrés de binômes, Pythagore construit m>n ; pas de CAS ou
générateur spécialisé. Tests de source/rejeu/JSON/projection et atomiques conservés.
La revue a trouvé trois cas corrigés : infinity réservé sans distinction de casse,
héritage Object.prototype dans bornes/substitution, espaces admis dans les noms
que les gardes numériques doivent distinguer de nombres. Régressions dédiées.

Vérifications intermédiaires : build/typecheck/lint PASS. Première tranche ciblée :
135/137 tests, assertions de tableaux de diagnostics et budget de test corrigés ;
tranche noms 31/31 PASS. Check intermédiaire 572/574 : deux anciennes assertions
de noms/diagnostics devenues obsolètes, ajustées sans retirer leurs contrôles.
Après revue et corrections, 52 nouveaux tests noms + 31 substitution = **83/83 PASS**
sur deux fichiers, Vitest 13,40 s. `npm.cmd run check` final PASS : compilation,
types, lint, format et **592 tests / 15 fichiers**, Vitest 83,35 s.
`npm.cmd pack --dry-run` PASS : 62 fichiers, 50,4 kB / 219,9 kB.
Exports ESM inchangés (six), originaux historiques et CDC inchangés ;
`git diff --check` PASS. Aucune CI distante, suite navigateur ou consommation
tarball annoncée. Commit local : `feat(generation): support explicit descriptive parameter names`.

Limites : première lettre minuscule, ASCII sans soulignés, réservés D36 ; pas de
réinterprétation de noms nus, profil rationnel/polynomial et budgets inchangés.
Aucune correction élève, MathLive réel, isolation ou adaptation livrée par M1.
Prochain lot : M2 éléments (CDC-02/30/34–38), contrats
de données/substitution/validation/projection/tests, aucune UI. Objectif V1 actif.

## Mission autonome V1 — M0 audit (11 octobre 2026)

**Moteur non terminé.** Référence officielle `CDC_référence.md` confirmée par
l'utilisateur ; fichier non suivi préexistant conservé, exclu des commits.
Autorisation d'enchaîner les lots et commits locaux validés (D35), sans push,
publication, production, base ou modification de dépôt voisin.

État initial : branche main, HEAD `6c7a9d1`, seul CDC non suivi. Audit du texte de
mission/CDC, instructions et documents, contrats/types/index, frontières math,
validation/composition/instanciation et suites. Consolidation déjà réelle : six
exports, schéma 5, un résolveur, une boucle atomique et une instanciation. Ne pas
recommencer le refactor ; conserver tous les tests et vecteurs. Analyse indépendante
initiale en lecture seule confirmant les principaux manques, aucun fichier délégué.

Livrables M0 : matrice CDC-01–48 dans feature-coverage.md (statut réel, profil,
contrat/tests/preuves/limites/lot/commit), ordre M0–M12 dans roadmap.md,
D35 et README alignés avec la mission. Les anciens bilans restent historiques.
Les noms longs, données avancées, correction/formes, vraie saisie MathLive,
isolation/transport, adaptations et consommation externe restent à livrer.

Vérifications réellement exécutées : `npm.cmd ci` PASS, 130 packages.
Premier handle de check devenu introuvable sans sortie finale récupérable : non
compté comme preuve. Nouvelle exécution avec journal local `.engine-check.log` :
`npm.cmd run check` PASS, build/typecheck/lint/format et **540 tests / 14 fichiers**,
Vitest 81,96 s. Aucun test navigateur/CI distante/consommateur tarball courant.
`npm.cmd pack --dry-run` PASS : 58 fichiers, 49,3 kB / 216,6 kB, aucune publication.
Import ESM : six exports attendus. Prettier ciblé et `git diff --check` PASS.
SHA-256 du CDC `FFB97D8F1B3401E462DA6411D4DDE671A06D9522A6D745E28D06FB2F2E9459AE`
et des deux corpus `0F4D1173A78F9BD41E88678704C212C5147627E7E5A42EE28EB398F25F41C3AE`
inchangés. Lot documentaire seulement ; aucun module/test/dépendance modifié.
Commit M0 : `docs(engine): align V1 mission with official specification` ;
l'identifiant sera noté à l'ouverture de M1 après vérification Git.

Prochaine unité : M1 (CDC-10/11), convention explicite de noms descriptifs via
CortexJS, aucune réinterprétation des lettres juxtaposées, références de tuples,
computed/contraintes/textes et conservation des vecteurs courts. Auteur unique
des fichiers : agent principal. Critères : nouveaux tests parsing/références,
cycles/collisions/erreurs, oracles recettes et instance/rejeu/projection, check/pack.
L'objectif global reste actif jusqu'aux preuves de toutes les P0/P1.

## Consolidation architecturale canonique (11 octobre 2026)

**Verdict : consolidation validée localement ; contrat unique schemaVersion 5,
package privé 0.1.0.** Les bilans
ci-dessous sont historiques : leurs anciennes APIs ne sont plus disponibles.
Cette mission ne commence aucun lot suivant, migration, UI, serveur ou correcteur.
Aucun changement dans les dépôts voisins ni push. Commit de cette consolidation
explicitement demandé par l'utilisateur après validation ; aucun lot suivant engagé.

1. **Inventaire initial.** [Audit par fichier et capacité](consolidation.md) effectué
   avant modification : définitions/instances V1–V4, génération V1–V3, validations,
   orchestrateurs, mathématiques et preuves. Le seul fichier utilisateur non suivi
   initialement était CDC_référence.md, préservé en octets.
2. **Décisions.** D34 et [ADR 008](adr/008-canonical-consolidation.md) remplacent la
   compatibilité expérimentale interne. Un schéma pour définition, génération,
   instances et soumission ; identités moteur et mulberry32-rejection-v1 distinctes.
   Suppression de instantiationVersion, aucun adaptateur implicite ni ancien rejeu.
3. **Architecture.** contracts/generation.ts inspecte toutes les déclarations ;
   generation/variables.ts prépare/résout les dépendances et appelle la seule boucle
   candidates.ts ; instantiation.ts consomme ce contexte une fois, prépare la liste
   puis construit le snapshot et sa projection. Mathématiques/RNG/grille réutilisés.
4. **Contrats publics.** ExerciseDefinition, GenerationDefinition, VariableDefinition
   scalaire/tuple/computed, ExerciseElement, QuestionDefinition, AnswerDefinition,
   ExerciseInstance, PublicInstance, AnswerSubmission ; six fonctions runtime.
   CorrectionResult reste futur, sans export artificiel. [Référence](architecture.md).
5. **Manifeste.** Supprimés : contracts/parameters.ts, contracts/generation-v2.ts,
   contracts/generation-v3.ts, generation/variables-v2.ts, generation/variables-v3.ts
   et leurs artefacts dist obsolètes. Fusion dans les deux modules canoniques
   generation.ts et variables.ts ; candidates.ts porte la boucle unique.
   Types, validation, composition, instantiation, index et imports mathématiques
   adaptés. Suites renommées tuples/tuple-failures et computed/computed-failures.
   Ajouts : canonical.test.ts, elements.ts, fixtures/canonical/reference-vectors.json,
   audit et ADR 008. Deux fixtures natives et documentation actuelle mises à jour.
   Package/lock passent à 0.1.0, aucune dépendance ajoutée/modifiée.
6. **Capacités.** Integer/decimal/choice/exclusions, tuples choice/generate,
   six comparaisons, computed/restrictions/graphe, rationnels exacts, sources/raw,
   sections/textes/formules/multiquestions/QCM, attendus par ID et projection gardés.
   Tout choix fini ancien reste tirable ; usage mathématique hors profil exact
   diagnostiqué. Aucun domaine impossible/inconnu réparé par fallback.
7. **Rupture assumée.** Schémas 1–4, anciens tableaux/options/types/version IDs
   refusés. Sources historiques conservées pour futurs adaptateurs explicites au
   Lot 9. Question 103 transcrite au canonique ; aucun exercice complet migré.
8. **Vérifications intermédiaires réelles.** npm.cmd ci : PASS (130 packages).
   Build/typecheck/lint : PASS. Check initial arrêté au formatage du CDC utilisateur,
   désormais ignoré par Prettier. Premier portage : 521/527 tests passants, six
   assertions de contrat/chemin adaptées puis 230/230 tests ciblés passants.
   Treize tests canoniques ajoutés : quatre vecteurs complets, snapshot/projection,
   JSON/rejeu/immutabilité, refus anciens schémas/versions et choix fini hors profil.
   Oracles BigInt indépendants conservés. Vérification finale :

   | Commande / contrôle                   | Résultat réellement observé                                                                                                         |
   | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
   | npm.cmd ci                            | PASS, 130 packages                                                                                                                  |
   | npm.cmd run format                    | PASS ; sources historiques et CDC ignorés                                                                                           |
   | npm.cmd run check                     | PASS : build, typecheck, lint, format:check et 540 tests dans 14 fichiers, 72,99 s pour Vitest                                      |
   | npm.cmd pack --dry-run                | PASS : 0.1.0, 58 fichiers, 49,2 kB compressés / 216,5 kB décompressés ; aucune publication ni installation consommateur             |
   | Import ESM / déclarations / artefacts | Six exports runtime, aucun type/options expérimental dans les déclarations, 14 modules / 56 artefacts dist, anciens modules absents |
   | Liens Markdown / git diff --check     | PASS, aucune cible/ancre locale manquante ni erreur d'espacement                                                                    |
   | SHA-256 des originaux                 | Deux copies historiques et CDC conformes aux empreintes initiales                                                                   |

9. **Conservation.** Deux sources historiques de 14583 octets, SHA-256 attendu
   0f4d1173a78f9bd41e88678704c212c5147627e7e5a42ee28eb398f25f41c3ae.
   Inventaire inchangé ; CDC utilisateur inchangé et exclu du formatage,
   SHA-256 FFB97D8F1B3401E462DA6411D4DDE671A06D9522A6D745E28D06FB2F2E9459AE.
10. **Limites/clarifications.** Profil exact borné, noms d'une lettre hors e/i,
    value-only, pas de solveur/éléments avancés/correction/transport QCM ; contextes
    locaux mais aucune préemption prouvée. Méthodes et politiques du futur correcteur,
    convention de noms longs et profils supplémentaires demandent leur propre lot.
    Aucun point bloquant pour cette consolidation ; aucune CI distante, suite
    navigateur ou installation du tarball dans un consommateur externe annoncée.

## Complément Lot 5 — Variables calculées (11 octobre 2026)

**Verdict : validé pour le profil rationnel exact borné demandé.** Aucun lot suivant, UI, migration, production, commit ou push engagé. Les bilans antérieurs ci-dessous conservent leur état historique ; les éléments avancés et le moteur complet ne sont pas annoncés terminés.

1. **État initial.** HEAD `07570f2`, arbre propre ; Lot 4 bis disponible, 466 tests/11 fichiers passants. Audit AGENTS, README/progress/decisions/roadmap, architecture/spécification/couverture/ADR, contrats v1/v2/v3, génération/contraintes, frontière mathématique, instanciation et tests. Aucun changement non validé d'un autre lot intégré.

2. **Représentation.** D33 et ADR 006 consignés avant code : computed `{name,kind:'computed',latex,restrictions?}`, résultat `{kind:'rational',numerator,denominator}`, y compris entier/décimal fini, sans quotient flottant. Définition privée conserve source/restrictions ; valeurs plates uniques et liaisons computed `{name,dependencies}` ordonnées. Groupes de tuples inchangés, sans valeur dupliquée. Raw traité par CortexJS, domaine contrôlé avant réduction, aucun boxed exporté/persisté.

3. **Fichiers.** Ajouts : `src/contracts/generation-v3.ts`, `src/generation/variables-v3.ts`, `tests/generation-v3.test.ts`, `tests/generation-v3-limit.test.ts`. Extensions : contracts types/validation/composition, generation variables/variables-v2 (boucle commune), math substitution/comparison, instantiation et index. Documents : README, decisions, ADR 006/007, architecture, functional-specification, feature-coverage, compatibility, roadmap et ce bilan. Package/lock, RNG, sampler, grille, domaines scalaires, validateur generation-v2, parseur input et tests historiques inchangés.

4. **API/contrats.** Six fonctions runtime conservées. `generateVariables` ajoute GenerationDefinitionV3 (`schemaVersion:3`), version explicite `variables-v3` et résultat/valeurs/rejeu v3. Définition/instances v4 dans validateDefinition/instantiateExercise/projectPublicInstance : `composed-instance-v4`, mêmes éléments/questions/QCM v2. Surcharges typées, garde de schéma depuis unknown. Soumission et contrats historiques inchangés.

5. **Dépendances et noms.** Références extraites par le parseur et préparation du profil rationnel ; inconnue/hors profil/collision/cycles avant RNG. Tri topologique simple, premier calcul prêt dans l'ordre déclaré. Tirages dans l'ordre des seules déclarations aléatoires ; calculs sans RNG. Noms d'une lettre hors e/i conservés : sondes `r1` → r×1, `delta` → lettres dont e inconnu, `xSommet` → plusieurs symboles. Une convention explicite de noms longs demande une évolution du contexte/allowlist/dictionnaire LaTeX et du contrat, différée sous D33. Les racines sont r/s dans les exemples natifs.

6. **Contraintes.** Boucle atomique/budgets/domaines/exclusions/tuples du 4 bis partagés. Candidat complet → calculs ordonnés → restrictions et toutes les comparaisons. Six relations, opérandes variable/constant/latex. Restrictions de résultat : integer/rational, bornes et exclusions exactes. Faux → retirage complet sur flux continu ; aucun clamp/réparation/fallback. Formule invalide/hors profil, cycle, singularité, indétermination, erreur et budget diagnostiqués distinctement ; formule non définie terminale (exclure les tirages singuliers). Indétermination après faux reste terminale. Épuisement ≠ preuve d'impossibilité.

7. **Exemples exécutés depuis l'entrée ESM publique.** Seed 42, a entier 1…10, b=2a+3 et 7<b<15 → a=5,b=13, 3 tentatives/3 mots (7 puis 1 rejetés). a=3,b=2,c=a/b → 3/2 exact, zéro mot. Tuple choice (1,2)/(3,4)/(5,6), c=ab et c=12 → (3,4), c=12, 2 tentatives/2 mots et provenance conservée. Instance v4 a=2,b=−4,c=5,d=b²−4ac → deux réponses privées −24 et sommet 1, IDs distincts, zéro mot ; projection sans attendus/seed et rejeu JSON identique. Fixtures synthétiques, aucune migration.

8. **Vérifications réellement exécutées.**

| Commande / contrôle                                                                        | Résultat                                                                                       |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `npm.cmd ci`                                                                               | PASS : 130 packages, package/lock inchangés                                                    |
| `npm.cmd run check` initial                                                                | PASS : build/types/lint/format, 466 tests / 11 fichiers                                        |
| Build/typecheck/lint intermédiaires                                                        | PASS après reconstruction des déclarations publiques                                           |
| `npm.cmd exec -- vitest run tests/generation-v3.test.ts tests/generation-v3-limit.test.ts` | PASS : 65 tests avant les trois derniers cas                                                   |
| Prettier ciblé                                                                             | PASS : sources/tests/docs concernés                                                            |
| `npm.cmd run check` final                                                                  | **PASS : build/types/lint/format, 534 tests / 13 fichiers, 85,58 s**                           |
| `npm.cmd pack --dry-run`                                                                   | PASS : prepack/build, 70 fichiers, 62,9 kB ; README/package/dist uniquement                    |
| Sondes Node stdin/import ESM                                                               | PASS : fraction, tuple/retry, deux questions, projection/rejeu, noms ambigus                   |
| Liens Markdown locaux                                                                      | PASS : 20 fichiers, 141 liens/cibles/ancres avant ce bilan                                     |
| Diff/fichiers historiques/octet/SHA-256                                                    | PASS : RNG/grille/parse/domaines/sampler/golden/package/lock inchangés, deux corpus identiques |

Les 68 nouveaux tests couvrent calculs simples/multiples/chaînes/ordre inversé, inconnue/auto-référence/cycles 2/3/collisions, tuples, fractions/grilles/choix, singularité après restriction fausse, limites/exposants, six relations, restrictions/retries/budgets/épuisement. Oracles BigInt indépendants : discriminants 32 seeds, racines entières 24 seeds (d=a²(r−s)², zéro et positif), Pythagore après tuple 24 seeds. Inconnue après faux, restriction indéterminée, résultat exact absent, exceptions et propagation à l'instance injectés. Multiquestions : attendus par ID/permutation, fraction texte/QCM, variables libres, secrets injectés exclus, JSON/rejeu/atomicité/versions. Getter hostile non invoqué.

Essais intermédiaires corrigés sans retirer de tests : typecheck avant rebuild `.d.ts` ; test `a^17` signifie a¹×7 en LaTeX (corrigé en `a^{17}`), AST de 70 termes sous limite 128 (remplacé par 129), séquence RNG supposée (remplacée par séquence historique sondée et deux rejets). Deux nouveaux tests multi-seeds dépassaient 5 s : délais de ces seuls tests portés à 30 s, sans prétendre interrompre le calcul synchrone. Premier check complet : 533 succès/1 échec, chemin de diagnostic trop précis ; assertion corrigée à la racine de la formule et check complet vert à 534. Gardes numériques/opérateurs mutualisés ; aucun comportement ancien affaibli.

9. **Limites.** Rationnels fermés : arithmétique/fractions/puissances entières 0…16 ; ratios/intermédiaires ≤10^9, AST ≤128 nœuds/profondeur 16. Pas de racine/irrationnel/complexe/fonction/solveur ou calcul symbolique illimité. Seize valeurs, arité 2…8, 32 contraintes, 128 lignes/choix/exclusions/tentatives, 65536 mots et JSON historique. Calcul synchrone, aucune deadline/mémoire préemptive ni uniformité globale. Pas de propagation d'intervalles computed ou solveur de contradictions générales.

10. **Déterminisme/compatibilité.** Mêmes définition/révision/ordre/budgets, seed normalisée, ID et artefacts/versions → même JSON, valeurs/provenance/tentatives/mots. Mulberry32 local continu historique ; aucun état global mutable, horloge ou Math.random. Les 466 tests historiques, golden et instances passent. 0.0.0 seule ne garantit pas le rejeu entre builds.

11. **Corpus et documentation.** Corpus/copie : SHA-256 `0f4d1173a78f9bd41e88678704c212c5147627e7e5a42ee28eb398f25f41c3ae`, identiques octet pour octet ; inventaire/transcription seulement. D33 tranche représentation/contraintes/versionnement/noms ; ADR 006/007, README, architecture/spécification/matrices/roadmap actualisés en distinguant support et historique.

12. **Suite non engagée.** Éléments avancés du Lot 5, noms étendus et autres profils sur instruction distincte, correction/formes 6/7, isolation/transport 8, adaptation réelle 9, adoption/distribution 10/11. Aucun autre dépôt modifié ; aucune CI distante, navigateur/POC, installation externe du tarball ou opération applicative annoncée.

13. **Conclusion du lot.** Complément demandé terminé dans le profil exact borné documenté ; les limitations testées restent des limitations. Publication et correction officielle ne sont pas livrées.

### Versionnement du complément Lot 5 demandé par l'utilisateur

Après ce bilan, l'utilisateur demande explicitement un commit. Le commit `feat(generation)` regroupe computed rationnels exacts, dépendances/contraintes atomiques, contrats variables-v3 et instances v4, 68 nouveaux tests et documentation. Les mentions « aucun commit » ci-dessus décrivent la livraison avant cette instruction. Les 534 tests et le packaging restent les vérifications du code livré ; seule cette note est ajoutée pour le versionnement, avec formatage et diff contrôlés. Aucun push ni lot suivant engagé.

Dernière mission : Lot 5 bis, audit et composition scalaire v2, 10 octobre 2026. Les arbitrages D25/D26 sont réalisés pour liste/sections/multiquestions/QCM avec paramètres integer/decimal/choice communs. [Audit initial/API/limites](adr/007-native-instantiation.md#lot-5-bis--composition-v2), [couverture globale](feature-coverage.md) et bilan en fin de document. V1/RNG conservés ; pas de 4 bis ou Lot 6 engagé.

Date : 10 octobre 2026. Lots 1 à 4 terminés, tranche native v1 et composition scalaire v2 du Lot 5 livrées (bilans ci-dessous). La cible complète avec groupes/computed/contraintes demeure ouverte. Initialement seul `.codex/config.toml` existait. Git initialisé sur main ; socle versionné par un commit initial à la demande utilisateur. Aucun remote, publication ou modification des dépôts voisins. Les sections historiques conservent les preuves des étapes précédentes.

## Historique — fondations réalisées

Trois analyses indépendantes natives en lecture seule, confrontation documentée dans analysis.md. Architecture, décisions, stratégie QA, roadmap avec critères de passage et trois ADR. Package privé ESM strict, point d'entrée vide, CortexJS épinglé, Vitest, ESLint, Prettier, CI Linux/Windows, règles AGENTS et README. Aucun correcteur, générateur ou interface utilisateur ajouté.

## Historique — sources au démarrage

Au démarrage, rapports POC et audits/code voisins accessibles mais huit JSON historiques absents des emplacements inspectés ; fixtures synthétiques non substituées au corpus. Corpus ensuite fourni par l'utilisateur dans `docs/exercises_rows.json`. Ancienne conclusion 91 tests contredit rapport/preuves récents 162 Vitest / 23 Edge. Ces suites externes n'ont pas été réexécutées ici. Transport FastAPI, SLO et politiques des autres familles restent ouverts ; premier contrat natif maintenant défini par ADR 004.

## Historique — vérifications des fondations

Vérifications locales Windows terminées :

| Commande réellement exécutée                                                                                                                        | Résultat                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `node --version`, `npm.cmd --version`, `git --version`                                                                                              | v24.19.0 / 11.17.0 / 2.55.0.windows.5                                              |
| `git init -b main`                                                                                                                                  | Dépôt initialisé                                                                   |
| `npm.cmd view` des versions et peers                                                                                                                | Versions retenues confirmées ; lint exige TypeScript <6.1.0                        |
| `npm.cmd install --ignore-scripts --fetch-retries=0`                                                                                                | 130 packages installés, lockfile créé ; audit 0 vulnérabilité au moment du run     |
| `npm.cmd run format`                                                                                                                                | Formatage appliqué                                                                 |
| `npm.cmd run check`                                                                                                                                 | Build, typecheck, lint, format PASS ; Vitest 1 fichier / 2 tests PASS              |
| `npm.cmd pack --dry-run`                                                                                                                            | Archive de 6 fichiers : README, package.json et dist JS/types/maps                 |
| `node --input-type=module -e ...`                                                                                                                   | Import public ESM Node natif PASS                                                  |
| `npm.cmd ci --offline --ignore-scripts --no-audit --no-fund`                                                                                        | 130 packages réinstallés à partir du lockfile, PASS                                |
| `npm.cmd pack --ignore-scripts`                                                                                                                     | Tarball produit après build                                                        |
| `npm.cmd install --prefix <temp-consumer> <tarball> --cache <workspace-cache> --offline --ignore-scripts --no-audit --no-fund --package-lock=false` | Installation réelle de l'archive en consommateur temporaire, PASS                  |
| `node <temp-consumer>/consumer.mjs`                                                                                                                 | Import de l'archive installée PASS                                                 |
| `node node_modules/typescript/bin/tsc <temp-consumer>/consumer.mts --ignoreConfig --module NodeNext --target ES2023 --strict --noEmit`              | Déclarations et résolution externe PASS                                            |
| `npm.cmd ls --depth=0`                                                                                                                              | Six dépendances directes aux versions épinglées                                    |
| `git status --short`                                                                                                                                | Seuls les nouveaux fichiers de ce dépôt visibles ; dist/cache/node_modules ignorés |

Essais corrigés : npm.ps1 bloqué par ExecutionPolicy (npm.cmd utilisé), premières requêtes registry/cache en sandbox refusées (cache local et accès réseau approuvé utilisés), consommation TypeScript par fichier initialement refusée avec TS5112 (option --ignoreConfig requise, relance réussie). Aucune modification de politique Windows.

La CI GitHub est configurée mais n'a pas été exécutée à distance. Aucune suite mathématique de production ou navigateur ajoutée/exécutée ; les tests actuels vérifient seulement le package. Le tarball et cache sont des artefacts locaux ignorés. Les déclarations vérifiées sont celles de l'entrée volontairement vide ; aucune API métier certifiée.

## Risques prioritaires

Perte de domaine et placeholder au parsing ; virgule française pouvant devenir 314 ; comparaison heuristique surévaluée ; secrets recomposables ; contraintes legacy violées silencieusement ; computed JS dangereux ; timeout non préemptif et mémoire non isolée ; schéma de migration inconnu sans corpus.

## État courant pour le prochain agent Codex

Lire AGENTS, architecture, décisions, compatibility, ADR 004/005/006/007 et roadmap. Ne pas recopier POC ou ouvrir un correcteur général. Corpus reçu, huit lignes conservées/inventoriées ; question native 103 et fixture synthétique multiquestion distinctes, aucune migration. Six fonctions publiques conservées : validateDefinition accepte v1/v2, validateSubmission reste LaTeX v1, parseMathInput scalaire, generateVariables integer/decimal/choice, instantiateExercise et projectPublicInstance natifs/composés. Depuis unknown, discriminer schemaVersion ; v2 conserve valeurs typées, IDs/ordre/références et attendus privés par question. Profil rationnel/polynomial borné et options QCM texte/rationnel fermé ; aucun grading, domaine universel ou forme pédagogique. Prochaine étape cible complète : 4 bis tuples/comparaisons, puis complément 5 computed/graphe/contraintes/snapshot de groupes, sur instruction distincte. Un Lot 6 rationnel borné peut être conçu sur le profil scalaire livré si demandé ; adoption officielle conditionnée à isolation/lookup serveur. TS6 choisi pour compatibilité lint ; ne pas imposer service avant mesures. Autres dépôts lecture seule.

## Versionnement du socle

Le .gitignore couvre dépendances, build, couverture, caches, logs, rapports de tests, configuration locale, fichiers système et fichiers .env. Les modèles .env.example et .env.template restent versionnables. Le package-lock.json et les configurations du package/CI sont conservés dans le commit.

## Reprise — préparation du Lot 2 (10 octobre 2026)

État initial vérifié : Git propre au commit `8fab5d9`, socle complet, `src/index.ts` vide et deux tests de distribution. README, configurations, src/tests, architecture, décisions, roadmap, stratégie QA, progression, trois ADR et six rapports POC inspectés. Les suites externes POC et navigateur n'ont pas été réexécutées.

Trois sous-agents natifs indépendants ont travaillé en lecture seule ; le principal est le seul auteur des fichiers modifiés :

- Mathématiques (`/root/math_audit`) : contrôle raw avant réduction, placeholder perdu même en raw, trois profils décimaux distincts ; API polynomialCoefficients disponible pour étude bornée future. Les rapports anciens 41/91 tests ne remplacent pas les preuves récentes 162/23 Edge.
- Architecture/compatibilité (`/root/contracts_audit`) : corpus introuvable dans les trois voisins ; fixture de correction explicitement synthétique. Enveloppes différentes, doublets/triplets sans `name` dans Creator contre type élève l'exigeant, computed JS et fallbacks hors contraintes observés. Aucune interface legacy reprise comme contrat certifié.
- Qualité/sécurité (`/root/qa_audit`) : aucun défaut de fondation démontré ; CI distante, bundle navigateur et isolation restent non vérifiés. Aucune sécurité mathématique déduite des deux tests de package.

Arbitrage : architecture et QA envisagent une caractérisation préliminaire du Lot 3 autorisée par la roadmap ; math recommande de rester sur la préparation du Lot 2. Le principal conserve le Lot 2, premier lot non terminé, et ne fige pas d'API de symboles sans corpus. La tranche verticale mathématique suggérée dans la demande n'est donc pas implémentée dans cette reprise.

[compatibility.md](compatibility.md) décrit sources observées, informations de provenance nécessaires, inventaire à remplir, critères de sélection et tests futurs. Roadmap, décisions et stratégie QA précisent ce statut. Aucun contrat runtime, fixture historique, adaptateur, API publique ou test mathématique ajouté. Le Lot 2 reste non terminé ; les Lots 3 et suivants ne sont pas engagés.

Revue indépendante finale par `/root/qa_audit` sur le diff et le nouveau document : aucune garantie fausse démontrée ; critère explicite d'aller-retour sans perte ajouté à sa demande. La revue confirme le statut de préparation, sans validation de migration.

Vérifications de cette reprise : `npm.cmd ci` PASS (130 packages), `npm.cmd run check` PASS avant et après rédaction (build, typecheck, lint, format ; 1 fichier / 2 tests), `npm.cmd pack --dry-run` PASS (6 fichiers), `git diff --check` PASS. Formatage ciblé par `npm.cmd exec -- prettier --write` sur les cinq documents, sans changement supplémentaire. Ces commandes vérifient uniquement le socle actuel, pas un contrat historique. Prochain travail nécessaire : obtenir les huit exports autorisés, leur provenance et les politiques pédagogiques pour reprendre le Lot 2. Aucun push, merge, commit ou dépôt voisin modifié.

## Lot 2 terminé après réception du corpus

L'utilisateur a ensuite ajouté `docs/exercises_rows.json` : huit lignes IDs 1/6/36/64/78/96/103/106, `content` et `competences` encodés en chaînes JSON. Ce fichier préexistant à l'implémentation est conservé sans modification, ainsi que les changements de préparation précédents. Provenance distante/révision d'export non fournies, sans les déduire de created_at. Empreinte SHA-256 et copie originale dans tests/fixtures/legacy ; 558 chemins inventoriés (88 ligne, 448 contenu, 22 compétences). Les huit rapports et la matrice de transcription sont dans compatibility.md.

Les trois agents ont repris leurs analyses en lecture seule sur le corpus réel. Convergence : première question de minimum du trinôme, ligne 103, élément 1780008000003. a=1…3, b=−6…6 sauf 0, c=−5…5 garantissent une abscisse rationnelle −b/(2a) et un minimum unique sur ℝ. La consigne ne demande aucune forme particulière. Le graphe et les champs non convertis restent conservés dans l'original ; transcription native manuelle explicitement distincte d'une migration intégrale.

Incompatibilités démontrées : flags Flash contradictoires en 103 ; distracteur QCM de 78 devenant juste pour u0=1 ; croissance/majoration admises incohérentes en 96 pour k=1/u0=3 ; bornes computed positives de 106 contre c=−a−b négatif. IDs QCM incomplets, exclusions dépendantes et aliases non fusionnés. Les sources mathématiques ont un backslash normal après deux décodages JSON : aucune réécriture/unescape supplémentaire.

Implémentation par le principal seul : types natifs v1 de définition privée, instance privée, affichage public et soumission ; validateDefinition/validateSubmission structurels depuis unknown avec diagnostics JSON Pointer et copie détachée. Paramètres/variables disjoints, contraintes entières bornées et impossibles refusées, extensions JSON privées conservées, champs inconnus et autorité client refusés. DTO d'instance seulement préparatoires ; aucune fonction de projection, génération, substitution, parsing, preuve ou correction ajoutée. ADR 004 retient ce premier contrat. Aucune dépendance ajoutée ; tests documentaires fs/crypto en MJS, fixtures JSON importées dans les tests TypeScript.

Revue indépendante finale par les trois agents : deux défauts démontrés corrigés (accents de la fixture native et clés JSON trop longues), avec régressions ; titre/question/points/paramètres natifs désormais reliés à la source 103 par test. QA a vérifié les corrections et n'a signalé aucun résidu démontré. Les agents n'ont pas écrit de fichiers ni lancé la suite complète ; le principal a exécuté les vérifications suivantes.

| Commande réellement exécutée pour le Lot 2                   | Résultat                                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `npm.cmd ci`                                                 | PASS, 130 packages depuis lockfile                                                    |
| `npm.cmd run build`, `npm.cmd run typecheck`                 | PASS après adaptation des tests                                                       |
| `npm.cmd test`                                               | PASS intermédiaire, 3 fichiers / 38 tests                                             |
| `npm.cmd run check` après corrections                        | PASS build, typecheck, lint, format ; 3 fichiers / **40 tests**                       |
| `npm.cmd pack --dry-run`                                     | PASS, 14 fichiers ; corpus/fixtures absents de l'archive                              |
| Script stdin `node --input-type=module`                      | Import ESM natif et appels définition/soumission PASS ; LaTeX brut conservé           |
| `Get-FileHash` des deux originaux                            | SHA-256 identiques : 0f4d1173a78f9bd41e88678704c212c5147627e7e5a42ee28eb398f25f41c3ae |
| `npm.cmd exec -- prettier --write` ciblé, `git diff --check` | PASS ; originaux ignorés par Prettier                                                 |

Essais corrigés : première sonde `node -e` refusée par un problème de quoting PowerShell, remplacée par stdin ; typecheck initial sur tests Node sans déclarations et dist encore vide, corrigé par tests documentaires MJS/import JSON puis rebuild ; premier check arrêté sur variable inutilisée, corrigée. Une requête `npm.cmd view @types/node version` a été interrompue sans résultat ; aucun package ajouté. La création documentaire a été relancée après un patch combinant suppression/ajout d'un même chemin refusé. Ces essais ne sont pas des validations réussies.

Le Lot 2 est terminé pour les contrats et l'inventaire ; les huit exercices ne sont pas migrés. La validation structurelle n'établit pas la syntaxe, le domaine ou la valeur mathématique de sources LaTeX. Aucune CI distante, suite POC/navigateur, installation de la nouvelle archive dans un consommateur externe ou garantie d'isolation exécutée dans ce lot. Aucun commit/push/merge. Prochain lot recommandé : 3, à engager uniquement sur nouvelle instruction.

## Lot 3 — frontière mathématique terminée (10 octobre 2026)

Implémentation par le principal seul, sans délégation : `src/math/input.ts`, exports racine et test de distribution adaptés, `tests/math-input.test.ts`, README, décisions, roadmap et ADR 005. Aucun nouveau package. Contrats du Lot 2 inchangés : validation structurelle séparée du parsing ; la fixture native fournit le contexte de noms pour un test d'intégration.

API `parseMathInput(source, { parameters, variables })` : source inchangée, profil scalaire v1, succès avec syntaxe MathJSON raw et symboles classés, échec avec diagnostics typés bornés. ComputeEngine neuf à chaque appel ; séparateur natif `{,}`, point accepté, virgule nue refusée. Source contrôlée avant parsing pour placeholders, commandes hors profil, commentaires, décimaux incomplets et budgets. Aucune réduction, évaluation, substitution, génération ou correction. `x/x`, `1+2`, `2/4`, `1/0` et √(−1) restent syntaxiques ; domaine non démontré. Matrice des capacités et limites dans ADR 005.

Sondes locales stdin Node sur CortexJS 0.151.0 et lecture des déclarations installées : option réellement typée `form:raw`, comparée à `form:canonical`. Premières sondes JavaScript utilisant l'ancienne option `canonical:false` remplacées après l'échec du build TS2769. Premier check : 92/93 tests passent ; comparaison de code trop large confondait expected/unexpected-closing-delimiter, corrigée avec égalité exacte et régression. Check intermédiaire après correction : 4 fichiers / 97 tests PASS. Deux régressions ajoutées ensuite pour `0y` et `y-y` : un symbole inconnu ne peut pas disparaître par réduction. Ces essais initiaux ne sont pas annoncés comme validations finales.

Vérifications locales finales : `npm.cmd ci` PASS (130 packages depuis lockfile) ; `npm.cmd run check` PASS (build, typecheck, lint, format, 4 fichiers / 99 tests) ; `npm.cmd pack --dry-run` PASS ; formatage ciblé et `git diff --check` PASS. Sondes stdin Node du package construit : API ESM, source intacte, MathJSON raw et rejet de placeholder PASS. Empreintes SHA-256 des deux originaux identiques et inchangées : `0f4d1173a78f9bd41e88678704c212c5147627e7e5a42ee28eb398f25f41c3ae`.

Limites : sous-ensemble scalaire uniquement, noms du contrat v1, diagnostic d'incomplétude conservateur et non universel, syntaxe CortexJS sans fidélité aux commandes/espaces, aucune garantie de domaine ou de ressources synchrones. Pas de CI distante, tests navigateur/MathLive réel, suite POC, installation externe du tarball ou preuve d'isolation exécutés. Aucun corpus migré, dépôt voisin modifié, commit, push ou production. Lot 4 non commencé ; RNG, seed/encodage et ordre des tirages restent à décider sur nouvelle instruction. Les domaines et bornes arithmétiques doivent être spécifiés avant les futurs calculs/corrections.

## Lot 4 — génération déterministe de paramètres (10 octobre 2026)

Inspection du dépôt propre et de la demande jointe, README/progress/décisions/roadmap, architecture, compatibility, ADR 004/005, contrats, frontière mathématique et tests. Le Lot 3 est présent ; la suite existante a été réexécutée avec succès (99 tests) avant l'ajout des nouveaux tests. Travail séquentiel par le principal, sans sous-agent. Aucun autre dépôt inspecté ou modifié pendant ce lot.

Fichiers créés : `src/contracts/decimal-grid.ts`, `src/contracts/parameters.ts`, `src/generation/random.ts`, `src/generation/variables.ts`, `tests/generation.test.ts`, `tests/generation-limit.test.ts`, `docs/adr/006-deterministic-generation.md`. Fichiers modifiés : `src/contracts/types.ts`, `src/contracts/validation.ts`, `src/math/input.ts`, `src/index.ts`, `tests/package.test.ts`, `README.md`, `docs/architecture.md`, `docs/decisions.md`, `docs/roadmap.md`, `docs/progress.md`. Package et lockfile inchangés ; aucune dépendance ajoutée.

API unique ajoutée : `generateVariables(definitions, {seed, generationVersion?})`, résultat discriminé succès/diagnostics. Contrat `GenerationParameterV1` réutilisant integer et ajoutant decimal/choice, valeurs typées sérialisables et métadonnées privées de rejeu. Validation JSON inerte et contrôles entiers du Lot 2 partagés en interne, sans élargir les exports runtime. Famille d'exercice rationnelle inchangée. Parsing raw du Lot 3 conservé ; aucune expression calculée ni seconde voie de parsing créée.

Garanties : bornes inclusives, exclusions uniques dans le domaine, domaines non vides, grille décimale exacte à précision 0…6, choix finis uniques. Mulberry32 avec seeds uint32 numériques ou chaînes canoniques, mapping de rang par rejet du bucket incomplet, ordre du tableau figé, exclusions triées, singleton sans tirage. Chaque appel a son état local. Au plus 16 paramètres et 128 mots par rang ; épuisement → `limit`, sans preuve d'impossibilité ni valeur partielle. Détails des bornes et versionnement dans ADR 006. La conversion de grille est une conversion d'encodage numérique, pas un CAS ; fractions et approximations calculées restent absentes.

Cas réel : fixture native 103 → seed 42 → a=1, b=5, c=0, 3 mots. a>0 et b≠0 vérifiés sur 512 seeds. La source attendue `\frac{-b}{2a}` est parsée par l'API du Lot 3 dans le test d'intégration, avec paramètres et x libre distincts, sans être évaluée. L'abscisse mathématique serait −5/2 ; aucune valeur computed n'est annoncée comme produite par le générateur.

Tests nouveaux : quatre vecteurs golden complets et mots PRNG, rejeu après JSON et changement d'ordre des clés, indépendance de l'état/horloge/Math.random, domaines entiers et tous leurs sous-ensembles d'exclusions sur petites plages, grilles 0…6 sur seeds fixes, limites/bornes négatives/non alignées, artefacts flottants, choix avec doublons et nombres finis extrêmes, entrées non JSON, types différés, versions inconnues et épuisement forcé du budget PRNG sans fallback. Le smoke de fréquence sur 10 000 seeds ne constitue pas une preuve statistique universelle. Pas de bibliothèque de tests de propriétés supplémentaire : propriétés vérifiées par énumérations déterministes.

Deux ajustements pendant les vérifications : imports JSON des nouveaux tests dotés des attributs requis par NodeNext et paramètres de `it.each` corrigés ; diagnostic non JSON classé uniformément `invalid-definition` plutôt qu'en fonction du chemin d'une borne. La revue a également identifié l'acceptation d'un retour à la ligne final par l'ancre regex `$` : contrôle explicite de la longueur des symboles dans validation/parsing et de l'écriture canonique des seeds, avec régressions. Aucun parseur mathématique modifié au-delà du contrôle de contexte.

Vérifications locales réalisées : `npm.cmd ci` PASS (130 packages) ; `npm.cmd run build` et `npm.cmd run typecheck` PASS avant les nouveaux tests ; `npm.cmd test` PASS (4 fichiers / 99 tests existants) ; sondes stdin `node --input-type=module` pour figer quatre vecteurs ; `npm.cmd run format` puis formatage ciblé par `npm.cmd exec -- prettier --write` ; `npm.cmd run check` final PASS (build, typecheck, lint, format et **6 fichiers / 166 tests**). Les deux premiers checks avec nouveaux tests ont échoué sur les problèmes de tests/diagnostic décrits ci-dessus, puis ont été corrigés. `npm.cmd pack --dry-run` PASS (34 fichiers, README/package et dist uniquement, sans corpus/fixtures). Smoke stdin `node --input-type=module` de l'import racine ESM, validation/génération du trinôme, rejeu JSON et parsing de source intacte PASS. `git diff --check` PASS. `Get-FileHash` confirme les deux originaux inchangés : `0f4d1173a78f9bd41e88678704c212c5147627e7e5a42ee28eb398f25f41c3ae`.

Computed et contraintes entre plusieurs paramètres différés conformément à la roadmap : les contrats du Lot 2 ne les représentent pas. Tuples/doublets/triplets/perfect_square sont inventoriés comme formats historiques spécifiques sans contrat canonique, pas implémentés. Aucun exercice migré ; corpus original conservé. Pour le Lot 5, aucune difficulté bloquante démontrée sur les tirages entiers, mais contrat computed/domaine et sérialisation exacte via CortexJS doivent être décidés avant substitution/calcul. Pas d'instance, projection, correction, service, production, CI distante, navigateur, suite POC ou preuve d'isolation ; aucun commit/push/merge. Lot 5 non commencé.

### Versionnement du Lot 4

À la demande explicite de l'utilisateur après le bilan, les changements du Lot 4 sont regroupés dans un commit dédié `feat(generation)` avec description des contrats, garanties de rejeu, tests et fonctionnalités différées. La mention « aucun commit » ci-dessus décrit l'état à la livraison avant cette demande. Revue du diff et retrait d'un BOM UTF-8 involontaire dans decisions.md ; aucune modification de logique après le check à 166 tests. Aucun push ni Lot 5 engagé.

## Clarification documentaire du modèle de génération — 10 octobre 2026

Mission limitée à la documentation, réalisée séquentiellement sans sous-agent. Demande jointe, README/progress/décisions/roadmap, AGENTS, architecture, ADR 006, matrices de compatibilité, contrats et implémentation de génération, exports et tests existants inspectés. Aucun fichier métier, contrat TypeScript, test/fixture, configuration, dépendance ou original historique modifié. Aucun complément 4 bis ni Lot 5 implémenté ; aucune migration, base de données, déploiement ou commit.

Documents modifiés : README, architecture, ADR 006 (spécification cible et JSON documentaires), compatibility (matrice fonctionnelle), roadmap, décisions et présent état. Aucun document redondant créé. Modèle cible adopté : aléatoire numérique, choix, tuple générique à deux modes et calculé ; contraintes communes bornées et recettes mathématiques par composition. Pas de types function/perfect_square/doublet/triplet ni de solveur général. Les valeurs exactes, domaine, source/raw, variables libres et attendu privé restent distincts.

État inchangé : integer/decimal/choice générés et testés ; décimaux/choix uniquement autonomes, définition d'exercice toujours à entiers. Tuples, computed, dépendances/cycles, comparaisons intervariables, conditions mathématiques, recettes calculées, snapshot et projection runtime absents. Les tests de rejet et les cycles d'objets JSON ne prouvent pas leur support. Les JSON étendus portent un marqueur de brouillon non supporté ; seul l'exemple de tirages scalaires correspond aux contrats actuels.

Roadmap ajustée sans recommencer les lots livrés : 4 bis proposé pour tuples et comparaisons simples avant Lot 5 étendu ; graphe computed, exactitude/domaine, contraintes mathématiques, recettes et intégration d'instance au Lot 5. Aucun blocage du scénario scalaire 103 démontré ; le complément évite de figer un snapshot ignorant les groupes requis. Arbitrages ouverts : contrat/version et représentation canonique, tailles/budgets/profil des prédicats, encodage exact computed et noms étendus. Les besoins Admin sont décrits comme capacités moteur futures, sans interface conçue.

Vérifications locales de cette mission : `npm.cmd ci` PASS (130 packages) ; `npm.cmd run check` PASS (build, typecheck, lint, format et 6 fichiers / **166 tests existants**, sans test ajouté) ; `npm.cmd pack --dry-run` PASS (34 fichiers, README/package et dist seulement). Sonde stdin `node --input-type=module` : quatre exemples JSON documentaires décodés, exemple scalaire accepté, trois propositions et version de brouillon refusées par l'API actuelle ; 29 cibles de liens locaux existantes. Formatage ciblé par `npm.cmd exec -- prettier --write`, puis contrôle ciblé et `git diff --check` PASS. Les deux originaux ont toujours le SHA-256 `0f4d1173a78f9bd41e88678704c212c5147627e7e5a42ee28eb398f25f41c3ae`. Revue finale du diff : sept documents Markdown uniquement. Aucun calcul des recettes proposé comme validé ; aucune CI distante, suite navigateur/POC ou migration exécutée. Une tentative de retouche documentaire par Python a échoué car l'exécutable est absent ; la retouche a été réalisée avec Node, sans ajout de dépendance.

### Versionnement de la clarification documentaire

À la demande explicite de l'utilisateur après le bilan, les sept documents sont regroupés dans un commit dédié `docs(generation)`. La mention « aucun commit » ci-dessus décrit la livraison avant cette demande. Seule cette note de versionnement est ajoutée après les vérifications ; aucun code ni test modifié, aucun push ou lot de développement engagé.

## Lot 5 — tranche native d'instanciation (10 octobre 2026)

Demande jointe, AGENTS, README/progress/décisions/roadmap, architecture, stratégie de tests, ADR 004/005/006, compatibilité, huit lignes historiques, fixture native et code/tests des Lots 2 à 4 inspectés avant modification. Travail séquentiel par le principal seul. Le générateur tire integer/decimal/choice ; la définition native ne porte que des entiers. Tuple/computed/contraintes intervariables absents mais non indispensables à 103 : aucune reconstruction du Lot 4 ni blocage du premier exercice. La tranche native demandée est livrée ; la cible étendue du Lot 5 reste différée.

Fichiers créés : `src/instantiation.ts`, `src/math/substitution.ts`, `tests/instantiation.test.ts`, `tests/substitution.test.ts`, `docs/adr/007-native-instantiation.md`. Fichiers modifiés : `src/contracts/types.ts`, `src/index.ts`, `tests/package.test.ts`, `tests/generation-limit.test.ts`, README, architecture, compatibility, décisions, roadmap et présent état. Implémentations du générateur/parsing/validateurs, fixture native, corpus, package et lockfile inchangés ; aucune dépendance ajoutée.

API publiques : `instantiateExercise(definition, {instanceId, seed, generationVersion?, instantiationVersion?})` et `projectPublicInstance(instance)`. Définition/options validées depuis JSON inerte, `generateVariables` réutilisé, gabarits bornés dans les trois champs texte, parsing raw du Lot 3, encodage numérique exact et substitution CortexJS isolée, contrôle des domaines/budgets avant réduction, attendu rationnel exact et copie JSON finale. Aucun résultat partiel. Diagnostics avec étape/chemin et erreurs internes assainies. Le DTO privé préparatoire est concrétisé par `rational-instance-v1`, `generation.draws`, `statementMath` et `expectedMath.value` ; définition/soumission v1 inchangées. Projection par sélection et copies détachées : aucun champ de correction, extension ou métadonnée de seed transmis. L'appelant fournit l'ID opaque et conserve son état serveur officiel.

Exemple exécuté avec la fixture native de 103 et seed 42 : a=1,b=5,c=0, 3 tirages, énoncé `x^2+5x`, attendu `{kind:rational,numerator:-5,denominator:2}`, LaTeX `-\frac{5}{2}`. Rejeu sérialisé byte-identique avec snapshot/ID/versions identiques. Le cas fixe a=2,b=−4,c=3 produit `2x^2-4x+3`, abscisse 1 ; a=3,b=−2,c=5 distingue abscisse 1/3 et valeur du minimum 14/3. La question native transcrite fonctionne, aucun graphe historique ou exercice complet migré.

Tests ajoutés : déterminisme/transport JSON, absence de mutation, snapshot/extension/source préservés, projection détachée avec champs sensibles injectés puis exclus, gabarits `@a`/`@@` et noms complets, fractions/entiers/décimaux internes et multiplications implicites, priorités et valeurs négatives, oracle arithmétique indépendant de −b/(2a) sur 64 seeds, domaines sensibles refusés avant réduction, symboles inconnus même sous zéro/annulation, attendu symbolique non calculable, divisions par zéro, racines/constantes hors profil, bornes de nœuds/degré/précision/ratios, exceptions de bibliothèque, résultats non finis et épuisement détecté, échec du RNG propagé sans instance. Les tests de limitation ne sont pas des capacités de support.

Corrections pendant vérification : builds ajustés aux signatures typées du CortexJS installé. Premier run des nouveaux tests : boucle de 64 seeds dépassant le timeout Vitest et assertion supposant un seul diagnostic pour d−d ; cas séparés par seed et assertion d'appartenance, sans augmenter le timeout. Un oracle a également révélé une erreur réelle de sens : CortexJS traite un entier juxtaposé à une fraction comme un nombre mixte après substitution. Les produits implicites symboliques sont maintenant fixés en `Multiply` via `map`/`function` raw avant `subs`, avec régressions sur bc/a−bc ; juxtapositions purement numériques refusées. Décimaux longs ou chiffres groupés refusés pour empêcher un arrondi du parseur de devenir une prétention d'exactitude. Les runs initiaux échoués ne sont pas annoncés comme validations finales.

Vérifications locales exécutées :

| Commande / contrôle                                                    | Résultat                                                                                       |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm.cmd ci`                                                           | PASS, 130 packages depuis lockfile                                                             |
| Sondes stdin Node CortexJS 0.151.0 et lecture des déclarations         | Signatures/substitution/raw/exactitude/ambiguïté des nombres mixtes vérifiées                  |
| `npm.cmd run build`, `npm.cmd run typecheck` après corrections         | PASS                                                                                           |
| `npm.cmd test` intermédiaire                                           | PASS, 8 fichiers / 297 tests avant quatre régressions supplémentaires de chiffres groupés      |
| Formatage ciblé `npm.cmd exec -- prettier --write`                     | PASS                                                                                           |
| `npm.cmd run check` final du code                                      | Build, typecheck, lint, format PASS ; **8 fichiers / 301 tests PASS**, dont les 166 antérieurs |
| `npm.cmd pack --dry-run`                                               | PASS, 42 fichiers, 33,6 kB compressés, README/package/dist seulement ; aucun corpus/fixture    |
| Sonde stdin Node de l'import public, instance 103, rejeu et projection | PASS                                                                                           |
| Liens documentaires locaux                                             | 34 cibles vérifiées existantes                                                                 |
| `git diff --check` et SHA-256 des deux originaux                       | PASS ; empreinte inchangée `0f4d1173a78f9bd41e88678704c212c5147627e7e5a42ee28eb398f25f41c3ae`  |

La rédaction finale du présent bilan intervient après le check à 301 tests et le packaging ; aucun code ni test changé ensuite. Contrôle de format documentaire et diff réexécuté après rédaction.

Limites : définition entière et question rationnelle unique, aucun tuple/computed/contrainte additionnelle ni intégration native de decimal/choice. Expressions à domaines partiels, dénominateurs libres, fonctions/racines, QCM/équations/figures et familles avancées refusés ou conservés privés dans extensions sans instanciation. Profil rationnel/polynomial borné, pas de domaine universel ni de forme pédagogique ; détails dans ADR 007. Aucun arrondi de l'attendu, `N`, solveur ou CAS parallèle ; aucune deadline synchrone/mémoire garantie. Avant Lot 6 : fixer familles/bornes et états exact/indéterminé/erreur, recontrôler saisie/domaine, utiliser l'état officiel serveur ; isolation effective au Lot 8 avant branchement officiel. Aucun Lot 6, service, UI, production, CI distante, suite navigateur/POC ou consommateur externe du tarball exécuté. Aucun autre dépôt modifié, commit, push ou merge.

## Cadrage fonctionnel global et audit — 10 octobre 2026

Mission documentaire demandée : vision globale, structures/questions multiples, inventaire des éléments, génération/contraintes, parcours complets, contrats/APIs, couverture et audit de cohérence. Lecture préalable de demande jointe, AGENTS, README, progress/decisions/roadmap, architecture/compatibility/test-strategy et ADR, code/contrats/exports/tests, corpus et sources locales NovLearn/Creator/Colyseus/POC. Travail séquentiel sans sous-agent ; phase critique distincte après rédaction, sans revendiquer une revue externe indépendante. Modifications préexistantes de Lot 5 conservées ; empreintes de code/fixtures capturées avant rédaction.

Trois questions structurantes posées puis réponses reçues : liste plate avec sections explicites et variables communes ; premier périmètre texte/expression/question/QCM simple et multiple ; mêmes domaines par défaut avec domaine imposé explicite par question. D25–D27 enregistrent ces choix de **cible** ; aucune modification de contrat réel. D23 (groupes/valeurs/versions/budgets), règles de formes/tolérances, transport/SLO et release restent ouverts avant leurs étapes respectives, avec recommandations distinguées des décisions confirmées.

Documents créés :

- `docs/exercise-engine-vision.md` : philosophie, frontières, critères et index de référence.
- `docs/functional-specification.md` : document multiquestion, IDs, génération/contraintes/dépendances, onze dimensions de chaque type d'élément, correction/domaines et limites.
- `docs/exercise-lifecycle.md` : 14 étapes Admin, pipeline d'instance, 10 étapes élève, partiel/reprise/feedback, correction et duels ; deux diagrammes Mermaid textuels.
- `docs/feature-coverage.md` : **78 fonctionnalités**, source/statut/cible/responsable/lot/tests présents/manquants/priorité/risque ; cœur et applications distingués.
- `docs/architecture-review.md` : sources/état local, écarts/risques, surarchitecture, arbitrages et preuves d'adoption encore nécessaires.

Documents actualisés : README, architecture (contrats et API regroupés dans l'emplacement existant), compatibility, décisions, roadmap, test-strategy, ADR 002/004/006 et présent état. Pas de doublon architecture-and-contracts ni nouvelle roadmap. Passages historiques signalés explicitement pour éviter confusion avec instance native livrée. Les JSON/TypeScript cibles sont des exemples de discussion refusés par v1 ; aucun nouveau numéro de schéma/runtime annoncé supporté.

Roadmap : complément de contrat de composition/questions rattaché aux Lots 2/5 avant instance étendue, coordonné aux valeurs/groupes du 4 bis proposé ; multiquestions/QCM/projection au 5 étendu, comparaison discrète QCM par IDs en complément du 6, figures/tableaux/suites par compléments ciblés de 5 puis adaptation 9. UI/Admin/adoption séparés des lots cœur. Lot 5 natif et Lots 1–4 restent livrés dans leur périmètre ; aucun redémarrage automatique ni service imposé. Premier correcteur rationnel possible sur scénario natif sur instruction distincte, sans annoncer la cible étendue livrée.

Constats critiques recoupés : serveur de duels utilise actuellement le verdict client, API historique diffuse content avec solutions, contrats de tableaux divergents, mathématiques présentes dans renderers historiques, fallbacks hors exclusions et new Function Creator ; état local, aucune assertion de production déployée. Huit lignes inventoriées, seule question 103 transcrite/instanciée ; aucune migration complète ni catalogue exhaustif. Verdict : **cohérente avec réserves**, sous réserve de preuves par code/tests pour contrats étendus, grading/formes, projections de toutes branches, isolation effective et intégrations officielles.

Vérifications locales réellement exécutées :

| Commande / contrôle                                            | Résultat                                                                                                                                                                                                          |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm.cmd ci`                                                   | PASS, 130 packages à partir du lockfile                                                                                                                                                                           |
| Formatage ciblé `npm.cmd exec -- prettier --write <documents>` | PASS, uniquement Markdown                                                                                                                                                                                         |
| `npm.cmd run check`                                            | PASS : build/typecheck/lint/format ; **8 fichiers / 301 tests existants**, aucun test ajouté                                                                                                                      |
| `npm.cmd pack --dry-run`                                       | PASS, 42 fichiers, environ 34,0 kB ; README/package/dist uniquement, aucun corpus/fixture/document privé embarqué                                                                                                 |
| Sonde stdin Node de documents/liens/JSON et API v1             | PASS : 15 documents inspectés, 115 liens locaux avec cibles/ancres existantes, 6 blocs JSON décodés ; 2 exemples draft d'architecture refusés par validateDefinition/validateSubmission ; 78 lignes de couverture |
| SHA-256 avant/après de src/tests/package/lock/corpus           | **24 fichiers inchangés**, dont contrats et fixtures ; originaux toujours `0f4d1173a78f9bd41e88678704c212c5147627e7e5a42ee28eb398f25f41c3ae`                                                                      |
| `git diff --check`                                             | PASS ; changements de cette mission limités au Markdown                                                                                                                                                           |

Le bilan est ajouté après le check/pack ; seuls ajustements documentaires effectués ensuite, avec formatage/liens/diff recontrôlés. Les Mermaid ont fait l'objet d'une revue textuelle, pas d'un rendu navigateur. Une tentative de patch global n'a pas été appliquée (BOM préexistant de compatibility empêchant l'ancrage de titre) ; reprise avec un ancrage de section, sans toucher au corpus. `git rev-parse` initialement bloqué par propriété des deux voisins a été relancé avec safe.directory limité à la commande de lecture, sans modifier la configuration Git globale ; POC sans référence Git disponible. Aucun échec de ces lectures annoncé comme preuve de capacité.

Ne pas annoncer : correction élève native, computed/tuples, contrats multiquestions, renderer partagé, futur Admin, intégration officielle FastAPI/Colyseus, deadline/mémoire, migration, catalogue complet, CI distante, tests navigateur/POC ou consommateur externe du tarball courant. Aucun code métier/contrat/test/fixture, dépendance/configuration, dépôt voisin, DB/production modifié ; aucun commit/push/merge réalisé par cette mission. Prochaine étape recommandée seulement : revue du contrat composition/valeurs/groupes, puis instruction distincte pour 4 bis et les lots suivants.

### Versionnement du Lot 5 natif

À la demande explicite de l'utilisateur après le bilan, les quinze fichiers du Lot 5 natif sont regroupés dans un commit dédié `feat(instantiation)`. La mention « aucun commit » ci-dessus décrit la livraison avant cette demande. Seule cette note est ajoutée après les vérifications à 301 tests ; aucun code ni test modifié, aucun push ou Lot 6 engagé.

### Versionnement du cadrage fonctionnel global

À la demande explicite de l'utilisateur après le bilan documentaire, les quinze fichiers Markdown du cadrage global sont regroupés dans un commit dédié `docs(engine)`. La mention « aucun commit » du bilan décrit la livraison avant cette demande. Revue du périmètre et du diff, contrôle de format documentaire et `git diff --check` effectués pour ce versionnement ; les résultats précédents à 301 tests restent ceux de la mission documentaire, sans réexécution de la suite pour cette seule note. Aucun code, contrat, test ou fixture modifié ; aucun push ni lot suivant engagé.

## Lot 5 bis — audit et composition scalaire finalisés (10 octobre 2026)

Demande jointe, AGENTS/README/progress/décisions/roadmap, spécification/parcours/architecture/audit/couverture, contrats et modules/tests existants inspectés avant modification. Arbre propre au départ ; audit initial en lecture seule puis implémentation séquentielle par le principal, sans délégation ni réécriture du module natif fonctionnel. [Tableau d'audit et arbitrage](adr/007-native-instantiation.md#lot-5-bis--composition-v2) dans l'ADR existant, sans nouveau rapport redondant.

Livré : schéma `ExerciseDefinitionV2`/instances v2, liste plate avec texte/section/expression/question/QCM simple et multiple, IDs uniques et références de section, réponse attendue indépendante attachée à chaque ID de question. Paramètres integer/decimal/choice communs tirés une seule fois par le Lot 4 ; snapshot typé sans perte de coefficient/précision décimale. Attendus rationnels exacts ou expressions polynomiales préparées, options QCM texte ou rationnel fermé, collisions après substitution refusées. Validation v2 via `contracts/composition.ts`, parcours dans `instantiation.ts`, projection par sélection des branches et objets imbriqués, diagnostics localisés et aucun résultat partiel. Même six exports runtime ; les consommateurs depuis unknown doivent discriminer schemaVersion. V1, sources/raw, `parameters-v1` et golden vectors conservés ; aucun fichier de `src/math` ou `src/generation`, validateur de paramètres/grille, dépendance ou lockfile modifié.

Preuves : [fixture synthétique](../tests/fixtures/contracts/quadratic-multiquestion.definition.json) à cinq éléments a=2,b=−4,c=5 → `2x^2-4x+5`, abscisse 1, minimum 3 ; ordre/IDs, partage de valeurs, définition gelée intacte, sérialisation/rejeu et réordonnancement testés. `composition.test.ts` ajoute 78 tests, dont deux oracles BigInt sur 24 seeds, QCM simple/multiple/IDs/cardinal/permutation/collisions, secrets injectés/exclus sur chaque branche et objets imbriqués, limites 128 éléments/64 options/expansion textuelle, division par zéro et perte de domaine refusées, inconnus/getters/code hostile et options/version/seed invalides. Un test supplémentaire dans `generation-limit.test.ts` propage l'épuisement simulé du RNG du Lot 4 pour v2 sans instance. Les anciens tests sont conservés ; quatre fichiers de tests ajoutent seulement les gardes de schéma requises par le résultat union depuis unknown.

Vérifications locales réellement exécutées :

| Commande / contrôle                                                                  | Résultat                                                                                                                                                           |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm.cmd ci`                                                                         | PASS, 130 packages depuis lockfile                                                                                                                                 |
| `npm.cmd run check` avant intervention                                               | PASS : build/types/lint/format, 301 tests / 8 fichiers                                                                                                             |
| `npm.cmd run build`, `npm.cmd run typecheck`, `npm.cmd run lint` intermédiaires      | PASS après ajustement des helpers/du test tabulaire                                                                                                                |
| `npm.cmd exec -- vitest run tests/composition.test.ts` intermédiaire                 | PASS, 76 tests avant ajout des tests de budgets et de l'épuisement v2                                                                                              |
| Formatage ciblé `npm.cmd exec -- prettier --write ...`                               | PASS, sources/tests et documents concernés                                                                                                                         |
| `npm.cmd run check` final du code                                                    | PASS : build/types/lint/format ; **380 tests / 9 fichiers**, dont les 301 antérieurs                                                                               |
| `npm.cmd pack --dry-run`                                                             | PASS : 46 fichiers, environ 43,0 kB ; README/package/dist uniquement, aucun corpus/fixture                                                                         |
| `git diff --check`, SHA-256 des deux originaux, diff des modules 3/4 et package/lock | PASS ; originaux `0f4d1173a78f9bd41e88678704c212c5147627e7e5a42ee28eb398f25f41c3ae` inchangés ; modules math/génération, paramètres/grille, package/lock inchangés |
| Sonde stdin Node : liens locaux, import ESM, composition et rejeu                    | PASS : 20 fichiers Markdown, 134 liens/cibles/ancres ; fixture v2 instanciée et rejeu identique depuis le package construit                                        |
| `npm.cmd run format:check` et `git diff --check` après bilan                         | PASS ; ajustements documentaires seulement après le check à 380 tests                                                                                              |

Échecs intermédiaires corrigés, sans masquer de tests : le type union depuis unknown exigeait une garde v1 dans les helpers existants ; un nouveau `it.each` à deux colonnes avait un callback à un seul argument, provoquant 3 échecs et une erreur de types (callback corrigé, tous cas conservés). Première actualisation scriptée de couverture annulée avant écriture parce que PowerShell encodait les accents en `?` vers stdin Node ; relance avec encodage UTF-8 explicite réussie (19 lignes). Un patch documentaire avec libellé de lien inexact n'a pas été appliqué ; repris avec texte exact. Ces essais ne sont pas des validations finales.

Documentation : ADR 007 centralise état initial/API/garanties/limites, D30 explicite le profil v2 ; README, matrices, roadmap et états de référence actualisés sans modifier les objectifs architecturaux ni effacer les bilans historiques. Le présent bilan vient après check/pack ; seuls documents ajustés ensuite, avec format/liens/diff recontrôlés.

Verdict : **Lot 5 validé avec réserves** pour le premier périmètre composé scalaire. Aucun blocage constaté sur ce profil testé. Cible complète non clôturée : 4 bis doit fournir tuples/comparaisons, puis un complément du Lot 5 doit fournir computed/graphe/contraintes mathématiques et snapshot avec groupes sous contrats/budgets revus. Les propositions d'ADR 006 ne sont toujours pas des données acceptées. Graphes/tableaux, relations/systèmes, options QCM symboliques et autres formats sont volontairement différés ; aucun rendu React, score/progression, transport de soumission QCM ou grading commencé.

Suite : Lot 6 rationnel borné possible sur instruction distincte avec attendu par ID, snapshot officiel retrouvé côté serveur, méthodes/bornes et états exact/indéterminé/erreur explicites ; profil polynomial d'affichage ne certifie pas un correcteur. Isolation effective du Lot 8 avant adoption officielle, transports/UI/migration aux lots prévus. Aucun autre dépôt, DB, déploiement, commit/push, CI distante, navigateur/POC ni installation externe du tarball courant exécuté. Le corpus est seulement conservé/inventorié, question 103 transcrite et nouvelle fixture synthétique ; aucune migration annoncée.

### Versionnement du Lot 5 bis et suite confirmée

À la demande explicite de l'utilisateur après le bilan, les changements du Lot 5 bis sont regroupés dans un commit `feat(instantiation)` décrivant le contrat composé v2, ses garanties, les 79 nouveaux tests et les réserves. La mention « aucun commit » du bilan décrit la livraison avant cette demande. Revue du diff/périmètre et contrôles de format/diff effectués pour ce versionnement ; les résultats à 380 tests et le pack restent ceux de la livraison précédente, sans réexécution de suite pour les seules notes documentaires. Aucun push, UI ou lot suivant engagé.

L'utilisateur confirme de terminer **tout le moteur avant l'UI** (D31). Prochaine tranche recommandée : 4 bis tuples/comparaisons et contrat de groupes, puis complément 5 computed/graphe/contraintes/snapshot et données des éléments avancés, correction/formes 6/7, isolation/transport 8, compatibilité/adaptation 9 et distribution. Les interfaces React/Admin/élève et démonstrations avec UI sont différées. Le Lot 6 scalaire reste techniquement possible, mais n'est plus la prochaine étape recommandée dans cet ordre de travail.

## Lot 4 bis — Tuples et comparaisons bornées (11 octobre 2026)

**Verdict : validé pour le profil borné demandé.** Aucun complément suivant commencé, commit/push, migration ou déploiement. La priorité moteur complet avant UI est conservée. Les bilans précédents décrivent leurs dates de livraison.

1. **État initial.** HEAD `7744c15` (Lot 5 bis), arbre propre, 380 tests/9 fichiers. Génération integer/decimal/choice, exclusions integer/decimal, Mulberry32 parameters-v1, composition v2 scalaire. Aucun tuple, exclusion de choice, comparaison intervariable ou budget de candidats. Audit préalable des instructions, vision/spécification, décisions/roadmap/couverture, ADR 006/007, contrats/validateurs, génération, instanciation et tests/vecteurs ; inspection des types et sondes du CortexJS installé pour comparaisons numériques.

2. **Contrats.** D32/ADR 006 consignés avant implémentation : GenerationDefinitionV2 (schemaVersion 2), definitions/constraints et budgets obligatoires maxAttempts/maxDraws ; génération variables-v2 explicite. Tuple unique, modes choice/generate, composantes ordonnées avec domaines scalaires existants. Values plat, seule vérité numérique ; groups conserve ID et noms ordonnés, sans recopier les valeurs. Choix de ligne entier ; lignes typées avant filtrage d'exclusions. Noms historiques d'une lettre hors e/i conservés. Schéma ExerciseDefinitionV3 distinct, aucun changement silencieux de v1/v2.

3. **Fichiers concernés.** Sources : `src/contracts/{types,validation,composition,generation-v2}.ts`, `src/generation/{variables,scalar,variables-v2}.ts`, `src/math/comparison.ts`, `src/index.ts`, `src/instantiation.ts`. Tests ajoutés : `tests/generation-v2.test.ts`, `tests/generation-v2-limit.test.ts`. Documents : README, ADR 006/007, architecture/review, vision, spécification, matrices compatibility/feature-coverage, decisions, roadmap, test-strategy et ce bilan. Aucun package/lock, RNG, grille décimale, validateur scalaire, parsing/substitution mathématique ou test historique modifié. Seul le mapping scalaire de variables.ts est extrait à l'identique pour partage avec v2.

4. **API.** Six exports runtime conservés. generateVariables étendu par version explicite, surcharges GenerateVariablesResultV1/V2 ; nouveaux types de domaines/groupes/comparaisons/génération et ExerciseDefinitionV3/PrivateInstanceV3/PublicInstanceV3. validateDefinition/instantiateExercise/projectPublicInstance acceptent v3, mêmes éléments v2. Instanciation choisit variables-v2/composed-instance-v3, consomme le contexte plat une fois et conserve groupes/attempts privés ; projection par sélection des mêmes branches, aucun secret/seed/contrainte/groupe transmis. Diagnostics génération v3 préfixés /generation. Pas de nouvelle API de tuple concurrente.

5. **Exemples exécutés depuis le package construit.** Pour les lignes (3,4,5)/(5,12,13)/(8,15,17), composants entiers 1…17 : seed 42 → (3,4,5), seed 0 → (8,15,17), 1 tentative/1 mot. Exclure 3 et 8 de a → (5,12,13), 1 tentative/0 mot (singleton). Tuple généré a,b entiers 1…10, a<b, seed 42 → (5,6), 2 tentatives/4 mots. Un cas d'instance v3 avec a décimal −0.2 et b choix 0.125 produit le rationnel exact −3/40 et préserve x libre dans ax+b.

6. **Contraintes/exclusions.** Les six opérateurs `< <= > >= == !=` portent sur scalaires, composantes, autres groupes ou constantes numériques, sous forme d'objets declaratifs. Entiers/grilles exactes et choice v2 avec exclusions optionnelles. Exclusions de composantes retirant une ligne entière ; aucun mélange/retour partiel. Types, arités, noms/IDs/références, opérateurs, constantes et listes validés sur JSON inerte. Domaines locaux/lignes vides, réflexivité fausse, constantes fausses et intervalles incompatibles détectés avant RNG. a>b et b>a sur 1…3, seed 42, maxAttempts=4 → attempts-exhausted, 4 essais/8 mots : échec de recherche, aucune preuve universelle d'impossibilité. Indétermination et exception math restent distinctes.

7. **Vérifications réellement exécutées.** Les commandes intermédiaires et finales ont eu les résultats suivants :

| Commande / contrôle                                                                                                                        | Résultat                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm.cmd ci`                                                                                                                               | PASS : 130 packages installés, aucun changement de dépendance/lock                                                                                            |
| `npm.cmd run check` initial                                                                                                                | PASS : build/types/lint/format, 380 tests / 9 fichiers                                                                                                        |
| `npm.cmd run build`, `npm.cmd run typecheck`, `npm.cmd run lint`                                                                           | PASS après corrections de compilation intermédiaires                                                                                                          |
| `npx.cmd vitest run tests/generation-v2.test.ts tests/generation-v2-limit.test.ts tests/generation.test.ts tests/generation-limit.test.ts` | PASS : 151 tests / 4 fichiers avant les quatre derniers cas ajoutés                                                                                           |
| `npx.cmd vitest run tests/generation-v2.test.ts tests/generation-v2-limit.test.ts`                                                         | PASS : 86 nouveaux tests / 2 fichiers                                                                                                                         |
| Formatage ciblé `npx.cmd prettier --write ...`                                                                                             | PASS : sources/tests et documents concernés                                                                                                                   |
| `npm.cmd run check` final du code                                                                                                          | PASS : build/types/lint/format ; **466 tests / 11 fichiers**, dont les 380 historiques, deux passages verts : 55,05 s puis 54,78 s après renforcement du test |
| `npm.cmd pack --dry-run`                                                                                                                   | PASS : prepack/build ; 62 fichiers, environ 54,7 kB ; README/package/dist uniquement                                                                          |
| Sondes stdin Node du package                                                                                                               | PASS : tuples des seeds 0/42, filtrage, échec contradictoire, rejeu et imports locaux                                                                         |
| Liens Markdown locaux                                                                                                                      | PASS : 20 fichiers, 137 liens/cibles/ancres avant ajout de ce bilan                                                                                           |
| `git diff --check`, contrôle des fichiers historiques et SHA-256                                                                           | PASS : corpus/copie originale identiques, golden tests/RNG/grille/parse/substitution/paramètres/package/lock inchangés                                        |

Les 86 nouveaux tests couvrent arités 2/3/4/8, 16 liaisons, lignes typées/exclusions, cas malformés/hostiles, copie gelée/détachement, limites JSON et saturation de diagnostics, maxAttempts/maxDraws/rejet 128 mots, succès/échecs/rejeu/ordre des clés et intégration v3. Oracles indépendants : Pythagore sur 256 seeds ; six comparaisons sur 96 seeds chacune, produits croisés BigInt ; scalaires/groupes sur 128 seeds. Comparaison inconnue/exception injectées aux étapes statique et candidat, notamment après une première contrainte fausse ; propagation d'indétermination à v3. Aucun ancien test supprimé ni golden réécrit. Pas de CI distante, suite navigateur/POC, installation externe de tarball ou test applicatif annoncé.

Les essais intermédiaires non passants n'ont pas été présentés comme validations : compilation pendant l'intégration de v3 puis type de fixture tuple trop large corrigés ; outil python indisponible remplacé par Node. Deux tentatives de mise à jour documentaire scriptée arrêtées avant écriture (syntaxe de gabarit, puis apostrophe de recherche différente), reprises en opérations ciblées. Revue finale du test d'indétermination après condition fausse : seed 42 sur 1…3 donne a=1,b=2 ; sa première condition a<b était vraie, contrairement au commentaire. Condition remplacée par a>b (fausse), commentaire corrigé et suite complète relancée : 466 tests/11 fichiers passent encore. Tous les contrôles finaux du code sont verts.

8. **Déterminisme.** Même définition/ordre/budgets, seed normalisée et artefacts/versions → même génération, compte des mots/tentatives et succès ou échec. Mulberry32 historique inchangé, un flux local continu à travers les candidats, tableau de déclaration/lignes/choix contractuel, ordre des clés objet neutre. Chaque candidat est complet avant contrôle de toutes les relations ; retirer tout le contexte, jamais réparer/reseed/fallback. V1 sans groups/attempts garde ses résultats et golden ; contexte partagé en v3 pour tous les éléments. Pas d'horloge, Math.random ou état global mutable.

9. **Limites.** Arity 2…8, 16 déclarations/valeurs nommées, 128 lignes/choix/exclusions, 32 comparaisons, 1…128 tentatives, 1…65 536 mots ; rejet de rang 128 mots et budgets JSON historiques. Choix/constantes v2 : nombres décimaux exacts à six places au plus, coefficient ±1 000 000 000, sans arrondi/snap/tolérance. Les noms x1/delta, choix mathématiques non numériques, tuples imbriqués, opérations vectorielles et exclusion indépendante d'une ligne ne sont pas supportés. Pas de langage de contraintes, solveur, uniformité générale ou analyse de contradictions arbitraires. Calculs synchrones structurellement bornés, aucune deadline/mémoire préemptive ; package 0.0.0 ne garantit pas un rejeu entre builds différents.

10. **Couverture et corpus.** Les matrices passent tuple choice/generate, six comparaisons, exclusions de choix/composantes, budgets et rejeu au statut implémenté/testé pour le profil décrit ; instanciation v3 exploitant les composantes ajoutée. Pythagore : oracle des lignes connues seulement, aucune capacité de prédicat général. Computed, dépendances/cycles et contraintes par expressions restent différés. Les huit lignes historiques et leur copie conservent SHA-256 `0f4d1173a78f9bd41e88678704c212c5147627e7e5a42ee28eb398f25f41c3ae` ; inventaire/transcription seulement, aucune migration ni autre dépôt modifié.

11. **Prérequis du prochain complément.** Définir computed dans le système commun de résolution des variables (generation), ses références aux scalaires/composantes, profil raw/domaines et valeur exacte sérialisable ; validation des références/cycles avant RNG, ordre topologique stable et limites de calcul. Calcul via CortexJS après tirage, avant contraintes sur le contexte complet puis consommation par instantiation. Aucun graphe ni calculateur séparé dans Lot 5. Les contraintes par expressions exigent leur profil/états d'indétermination et budgets propres. Ce complément est recommandé, pas commencé ; toujours aucune UI.

12. **Verdict.** Lot 4 bis **validé** pour tuples et six comparaisons numériques bornées, avec intégration minimale versionnée et conservation v1/v2. Limites explicites ci-dessus ; aucune certification de CAS, correcteur, isolation de production ou catalogue migré. Travail laissé non commité conformément à la demande.

Contrôles documentaires après bilan : format:check et diff --check passants ; liens locaux revérifiés (20 fichiers/137 liens, aucune cible manquante). Le dernier pack reste valable : seule une assertion/commentaire de test et le bilan ont changé depuis, aucun contenu distribué. Aucun commit automatique.

### Versionnement du Lot 4 bis demandé par l'utilisateur

Après le bilan, l'utilisateur demande explicitement un commit propre et un push sur origin/main. Les mentions « non commité » ci-dessus décrivent la livraison avant cette instruction. Le commit feat(generation) regroupe le contrat variables-v2, tuples/comparaisons atomiques, intégration v3, 86 nouveaux tests et documentation ; aucun complément suivant ni UI engagé. Les 466 tests et le pack restent les validations du code livré, inchangé depuis. Contrôles de format et diff renouvelés pour la note de versionnement. Le distant vérifié pointe sur 2b9dd369 ; le push normal inclura les six commits locaux antérieurs des Lots 3 à 5 bis et ce nouveau commit, sans réécriture d'historique. Le résultat effectif du push est rapporté à l'utilisateur après exécution ; aucune CI distante annoncée.
