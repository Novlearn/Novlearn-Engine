# Décisions et ADR

Les ADR décrivent les raisons et conséquences techniques. Les bilans ne sont
pas des décisions actives supplémentaires. **Active** signifie toujours applicable
avec ses extensions ; **Superseded** signifie remplacée ; **Historical** désigne
une observation ou une autorisation attachée à une mission passée.

Le [journal D01–D47](archive/decisions.md) conserve les formulations et arbitrages
originaux. Il n’autorise pas automatiquement de nouvelles opérations. Les
[capacités](features.md) et [architecture](architecture.md) font référence pour
l’API actuelle, quand un ancien ADR décrit une étape de développement.

## Registre des ADR

| ADR                                                              | Statut actuel                                              | Décision, justification et alternatives                                                                                      |
| ---------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [001 — Cœur portable](adr/001-core-boundary.md)                  | Active                                                     | ESM/TS strict et boxed internes pour partager le moteur ; CJS et microservice sans besoin écartés                            |
| [002 — Preuves](adr/002-mathematical-evidence.md)                | Active                                                     | Source/domaine/forme distincts pour éviter les réductions trompeuses ; heuristique seule insuffisante                        |
| [003 — Autorité](adr/003-server-authority.md)                    | Active                                                     | Snapshot serveur et projection sélectionnée ; client détenteur du verdict/seed/policy écarté                                 |
| [004 — Contrat initial](adr/004-first-contract.md)               | Superseded par 008                                         | Question 103 transcrite manuellement et enveloppe v1 ; conservation/provenance historique utile                              |
| [005 — Parsing](adr/005-math-input.md)                           | Active, étendue par M1/M6/M7                               | Cortex raw et gardes sans réécriture ; noms longs explicites pour préserver la multiplication implicite                      |
| [006 — Génération initiale](adr/006-deterministic-generation.md) | Superseded par 008 pour les contrats                       | Motifs du flux/tuples/calculés conservés ; plus d’enveloppes variables-v1/v2/v3 concurrentes                                 |
| [007 — Instance initiale](adr/007-native-instantiation.md)       | Superseded par 008 pour les contrats                       | Motifs de substitution/atomicité/IDs conservés ; snapshots v1–v4 non admis                                                   |
| [008 — Consolidation](adr/008-canonical-consolidation.md)        | Active                                                     | Schéma 5 et un seul pipeline faute de consommateurs des prototypes ; compatibilité interne expérimentale abandonnée          |
| [009 — Éléments](adr/009-display-elements.md)                    | Active                                                     | Données prescrites validées/substituées ; rendu et calcul analytique non exigé restent externes                              |
| [010 — Numérique/discret](adr/010-numeric-grading.md)            | Active                                                     | Certificats exacts/tolérance officielle/infinis/QCM/texte ; float et égalité heuristique universelle écartés                 |
| [011 — Algèbre/collections](adr/011-algebra-collections.md)      | Active                                                     | Coefficients/produits croisés/solutions bornés et domaines raw ; aucun solveur général                                       |
| [012 — Formes](adr/012-pedagogical-forms.md)                     | Active, étendue par 016                                    | Source originale et factorisation complète sur ℚ bornée ; factorisation sur ℝ/extraction systématique du contenu non exigées |
| [013 — Lycée](adr/013-school-known-answers.md)                   | Active                                                     | Parsing/substitution et attendus connus ; solveurs généraux de limite/dérivée exclus                                         |
| [014 — Hôte Windows](adr/014-isolated-node-host.md)              | Active ; preuves historiques et tests Windows de cet audit | Processus neuf/Job OS/watchdog ; worker partagé ou heap seul insuffisants ; tests natifs Windows de cet audit PASS           |
| [015 — Transport/Linux](adr/015-private-python-transport.md)     | Active                                                     | CLI et superviseurs persistants, contextes neufs, cgroup borné ; service HTTP Node non retenu                                |
| [016 — Adaptation](adr/016-reviewed-legacy-adaptation.md)        | Active                                                     | Recette explicite et rapport complet ; renommage aveugle et JavaScript historique écartés ; profil 106 borné                 |

Les textes historiques restent datés. Leurs mentions « futur », « six exports »
ou « aucune migration » décrivent le lot concerné ; elles n’annulent pas les
livraisons ultérieures. Les preuves M7/M11/M12 sont accessibles depuis progress.

## Décisions de pilotage et arbitrages maintenus

| IDs historiques                 | Applicabilité actuelle                                                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| D01–D07, D19–D21                | Frontières portables, CortexJS, preuve/source/domaine, autorité et composition toujours applicables                                          |
| D09                             | Choix d’outillage TS 6.0.3 présent ; sa justification est historique, un upgrade exige vérification                                          |
| D10/D13/D14/D27                 | Précisés par D38–D40 / ADR 010–012 : familles et tolérances bornées, mêmes domaines par défaut et factorisation sur ℚ                        |
| D12/D16/D23/D24/D28/D30/D32/D33 | Contrats expérimentaux remplacés par D34/ADR 008 ; noms étendus ensuite par D36                                                              |
| D25/D26                         | Liste plate/sections et IDs communs maintenus, couverture d’éléments élargie en M2                                                           |
| D08/D22/D31/D35                 | Historique des périmètres, ordre moteur avant UI et autorisation de la mission autonome achevée ; aucune autorisation nouvelle               |
| D11/D17/D43/D44                 | CLI/hôte local tranchés par ADR 014–015 ; SLO et provisioning de production toujours séparés                                                 |
| D18/D29                         | Registre/licence/adoption et emplacement d’UI nécessitent encore leur décision applicative                                                   |
| D36–D47                         | Noms, éléments, correction, formes, saisie, isolation, adaptation, démonstration et artefacts livrés sous profils ; ADR et preuves ci-dessus |

### D34 — Consolidation canonique (retenue, 11 octobre 2026)

Active : schéma unique 5, package privé 0.1.0, une génération/instanciation,
pas de `instantiationVersion` redondant ni compatibilité implicite des prototypes.
Justification et conséquences : [ADR 008](adr/008-canonical-consolidation.md).
[Formulation originale](archive/decisions.md#d34--consolidation-canonique-retenue-11-octobre-2026).

### D35 — Mission autonome V1 et référence officielle (11 octobre 2026)

Historical : l’autorisation d’enchaîner et commiter les lots M0–M12 concernait
cette mission, maintenant achevée. Le nom réel `CDC_référence.md` avait été
confirmé ; ses octets restent protégés. La demande initiale interdisait le commit
automatique ; l’utilisateur a ensuite explicitement demandé le commit local de
la documentation, sans autoriser de lot fonctionnel ou push.
[Texte original](archive/decisions.md#d35--mission-autonome-v1-et-référence-officielle-11-octobre-2026).

### D48 — Référence documentaire actuelle (12 octobre 2026)

La présente demande autorise l’audit, fusion/réécriture et archivage documentaire.
Décision : conserver les chemins opérationnels progress/decisions/roadmap et
la matrice CDC ; regrouper le fonctionnement dans architecture/features/usage/
development, avec un index. Les anciens bilans restent datés et consultables,
sans copie active concurrente. Le CDC réel reste à `docs/CDC_référence.md`.

Alternative écartée : conserver toutes les anciennes spécifications comme
références actuelles, car elles annoncent des manques déjà livrés. Aucune nouvelle
fonctionnalité, contrat, fixture, dépendance ou règle AGENTS n’est modifiée.
Les exemples sont vérifiés contre les exports réels ; les preuves anciennes sont
séparées des nouvelles exécutions. Conséquence : reprise courte, historique
préservé, aucun lot suivant ou commit lancé automatiquement.

Les 1533 tests Windows de cet audit passent sans skip, incluant l’isolation
native. Ce résultat actualise le refus observé en M9/M12 sans réécrire leurs
preuves ; aucune cause de changement de politique OS n’est affirmée.

Après livraison de l’audit sans commit, l’utilisateur demande un commit propre et
les instructions pour tester et poursuivre le projet. Le commit regroupe uniquement
les Markdown documentaires, avec revue du staging et contrôles de conservation.
Le guide development précise les niveaux de test ; aucun nouveau lot, push ou
déploiement n’est engagé.

### D49 — Exclure les caches dès le parcours Prettier (12 octobre 2026)

La demande suivante sélectionne la fiabilisation du contrôle global. Avec la CLI
installée Prettier 3.9.10, `expandPatternsInternal` énumère les chemins avant que
le filtre des fichiers ignore soit appliqué. `.cache/` est déjà ignoré, mais un
`scandir` interdit peut donc faire échouer `prettier --check .` avant ce filtre.

Décision : ajouter les globs négatifs quotés `!.cache/**` et `!.npm-cache/**`
aux deux scripts npm `format` et `format:check`. Ils sont intégrés aux exclusions
du parcours lui-même. Garder `.prettierignore` pour les éditeurs et les fichiers
protégés (CDC, corpus, lock, artefacts). Pas de script intermédiaire, dépendance,
changement de permissions ou suppression du cache. Les sources et documents
restent dans le périmètre contrôlé, y compris leurs archives.

Alternatives écartées : modifier les droits Python ou effacer le cache pour faire
passer le contrôle ; un nouvel ajout `.cache/` à `.prettierignore`, déjà présent ;
restreindre le contrôle à une liste fixe de fichiers qui oublierait des ajouts.
La [CLI officielle](https://prettier.io/docs/cli#file-patterns) recommande de
quoter les globs pour que leur expansion reste identique entre plateformes.
Le comportement exact est vérifié dans la version locale et par exécution.

Bilan finalisé le 13 octobre : format PASS, sonde hors cache refusée, contrôle
complet de confirmation 1533 tests/29 fichiers PASS sans skip et pack157 PASS.
Deux timeouts du premier passage et leur rejeu sont conservés dans progress ;
aucun seuil de test modifié pour obtenir le résultat final.

Le 13 octobre, l’utilisateur demande explicitement de commiter tous les changements
de ce complément : package.json et les quatre documents de suivi/maintenance.
Les caches et logs locaux restent hors Git ; aucun push ou lot suivant autorisé.

### D50 — Résultats de certification V1 et statut d’isolation (13 octobre 2026)

La demande de certification autorise l’audit, le banc local et ses rapports,
sans changement du CDC, du corpus ou d’un dépôt applicatif. Ajouter un banc
reproductible sur les huit fixtures adaptées, leurs éléments et questions, quatre
seeds, correction, projection publique et rejeu JSON.

La suite complète a été réellement relancée : build/typecheck/lint/format PASS,
Vitest 1508 PASS / 25 FAIL. Les 23 tests Windows `node-host` et deux tests CLI
retournent `unavailable`; le launcher ne fournit qu’un diagnostic système
générique. Ne pas attribuer une cause qui n’est pas prouvée. Le smoke du tarball
dans un consommateur séparé passe. Le rapport machine consigne les instances et
réponses ; le rapport humain sépare ces observations des anciens benchmarks
Linux/Python/navigateur, non relancés.

Conséquence : CDC-42 à requalifier, CDC-46 non démontré dans cet environnement,
CDC-47 et CDC-48 partiels. Le verdict de certification est « non prêt » pour
pilote/adoption; le cœur portable reste prêt aux tests locaux sur profils exercés.
Un cas faux candidat pour `ln(k)` demeure indéterminé, pas incorrect. La suite
doit repasser dans un environnement où le launcher peut effectivement démarrer
avant toute déclaration de qualification. Aucun commit automatique, CI distante,
publication, production ou migration n’est inclus.
