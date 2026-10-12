# Compatibilité des exercices historiques

## Trois étapes distinctes

1. **Inventaire** : huit lignes reçues et 558 chemins recensés, sans conversion.
2. **Transcription native** : fixtures manuelles 103 (question de minimum) et 64
   (graphe observé), sans migration de leur document complet à cette étape.
3. **Adaptation M10** : huit conversions complètes réellement exécutées localement,
   avec recettes revues, définitions, rapports et instanciation/correction seed 42.
   Tests sur quatre seeds par ligne et parcours dans l’hôte Linux borné.

La production et le catalogue complet n’ont pas été migrés. La source, version
historique de générateur et seed des anciennes tentatives ne permettent pas
d’inventer leur rejeu. [ADR 016](adr/016-reviewed-legacy-adaptation.md) détaille
la méthode ; [migration-guide](migration-guide.md) décrit coexistence/rollback.

## Source et conservation

- [Corpus reçu](exercises_rows.json) : 14 583 octets, IDs 1, 6, 36, 64, 78, 96, 103, 106.
- [Copie originale](../tests/fixtures/legacy/exercises_rows.original.json) identique
  en octets ; SHA-256 commun
  `0f4d1173a78f9bd41e88678704c212c5147627e7e5a42ee28eb398f25f41c3ae`.
- [Inventaire](../tests/fixtures/legacy/inventory.json) : 558 entrées scope/chemin/type,
  avec champs de ligne et JSON `content/competences` décodés explicitement.
- Date/provenance d’export, catalogue complet et versions historiques non fournis.
  `created_at` ne prouve ni une révision pédagogique ni la date d’export.

Les enveloppes DB encodée, publication Creator et document Creator plat sont
des formats distincts. Les deux formes Creator sont reconstruites dans les tests
depuis les sources observées ; elles ne sont pas de nouveaux exports runtime.
`answerFormat:'number'` ne choisit pas une famille de correction : infini,
logarithme, racine, rationnel et exponentielle requièrent des politiques explicites.

## Les huit adaptations locales

Tous les cas sont adaptables **sous les recettes revues** ; ce statut ne signifie
pas que n’importe quel JSON ressemblant à ces documents est accepté.

| Ligne                       | Profil et arbitrage                                                                                                             | Définition / rapport exécuté                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Limite logarithmique    | Expression présentée ; attendu connu −∞, sans preuve de limite calculée                                                         | [définition](../tests/fixtures/legacy/adapted/1.definition.json), [rapport](../tests/fixtures/legacy/adapted/1.report.json)     |
| 6 — Équation exponentielle  | Attendu réel ln(k), k≥1 ; identité connue sous profil numérique                                                                 | [définition](../tests/fixtures/legacy/adapted/6.definition.json), [rapport](../tests/fixtures/legacy/adapted/6.report.json)     |
| 36 — QCM asymptote          | Computed rationnels/QCM ; contrainte utilisateur a≠0 pour options distinctes                                                    | [définition](../tests/fixtures/legacy/adapted/36.definition.json), [rapport](../tests/fixtures/legacy/adapted/36.report.json)   |
| 64 — Signe de dérivée       | Graphe et QCM, réponse connue ; « négative » interprétée nonpositive incluant f′(0)=0                                           | [définition](../tests/fixtures/legacy/adapted/64.definition.json), [rapport](../tests/fixtures/legacy/adapted/64.report.json)   |
| 78 — Suite / point fixe     | Racine connue et deux QCM ; u0≠1 et k≠2u0² pour éviter collisions ; k exclut toujours 4/9                                       | [définition](../tests/fixtures/legacy/adapted/78.definition.json), [rapport](../tests/fixtures/legacy/adapted/78.report.json)   |
| 96 — Récurrence             | u0≤2k pour rendre l’énoncé de croissance cohérent ; alias L→limitValue explicite                                                | [définition](../tests/fixtures/legacy/adapted/96.definition.json), [rapport](../tests/fixtures/legacy/adapted/96.report.json)   |
| 103 — Minimum du trinôme    | Exercice complet avec graphe ; priorité Is_Flash=true de la ligne confirmée malgré content.isFlash=false                        | [définition](../tests/fixtures/legacy/adapted/103.definition.json), [rapport](../tests/fixtures/legacy/adapted/103.report.json) |
| 106 — Dérivée logarithmique | Deux questions : A·ln(x)+B sur x>0 et forme e^q ; exclusion dépendante ; computed c négatif admis, bornes historiques inactives | [définition](../tests/fixtures/legacy/adapted/106.definition.json), [rapport](../tests/fixtures/legacy/adapted/106.report.json) |

Les contraintes 36/78/96 réduisent volontairement les domaines historiques après
arbitrage utilisateur. Les IDs d’options manquants reçoivent des IDs synthétiques
stables par chemin, signalés dans les rapports. Champs inactifs, collisions de
flags et données non transposées restent dans l’original/rapport privés.
Les indications/explications historiques non converties ne sont pas annoncées
comme éléments natifs actifs ; leur conservation privée est tracée.

Computed min/max sont conservés sans devenir restrictions natives, conformément
au comportement observé des anciens générateurs. Aucune expression JavaScript
historique n’est exécutée. La conversion mathématique passe par CortexJS raw,
avec références explicites et source préservée, sans remplacement algébrique regex.

## Entrée et preuves

`adaptLegacyExercise` est exportée uniquement depuis
`novlearn-exercise-engine/legacy`. Elle reçoit une source, un format explicite et
une recette privée : id/révision, variables libres, politiques par question,
aliases, contraintes et arbitrages. Le résultat distingue adapté et bloqué,
avec rapport et original conservés. Pour une entrée non fiable, utiliser
l’opération privée de l’hôte isolé, jamais une route d’import publique brute.

Preuves : [corpus](../tests/corpus.test.mjs),
[adaptateur](../tests/legacy-adapter.test.ts), [profil 106](../tests/log-affine.test.ts),
[recettes](../tests/fixtures/legacy/recipes.json),
[parcours isolé](../tools/check-legacy-host.mjs). L’inventaire détaillé des champs,
défauts observés et première transcription reste dans
[l’archive de compatibilité](archive/compatibility.md).

Les générations natives sont décrites dans [features](features.md), sans seconde
matrice concurrente dans ce document. Une source inconnue, un conflit non arbitré,
un format ou calcul hors profil donne un blocage explicite, sans suppression de bloc.
