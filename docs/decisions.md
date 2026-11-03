# Décisions et ADR

## D56 — Retrait du moteur mathématique historique de Novlearn (3 novembre 2026)

L'utilisateur autorise le retrait de mathjs et des anciennes fonctions de calcul,
en conservant rendu et saisie. La projection publique prépare, sur demande privée
du serveur, les coordonnées approchées des graphes par Cortex. La sortie est
bornée, les sources et domaines sont examinés avant évaluation numérique et les
points non réels/non finis restent des trous. Aucun verdict n'utilise ces points.
L'option est additive : ni instantané privé, génération, politique de correction
ni projection sans option ne change. Aucun nouvel endpoint ou moteur concurrent.
Le nouvel artefact doit être adopté à l'identique dans Novlearn et Admin.

## D55 — Présentation commune des paramètres dans les textes (3 novembre 2026)

L'utilisateur demande de corriger les signes dans Engine et de conserver les
composants de rendu et de saisie. Les segments mathématiques paramétrés des textes
sont liés et sérialisés par CortexJS sans évaluation ; les générations, politiques
et réponses attendues restent distinctes. Voir [le périmètre 0.1.5](text-display-0.1.5.md).
La même archive doit être adoptée par Admin et Novlearn. La suppression des
anciens correcteurs et de mathjs n'appartient pas à ce correctif d'affichage.

## D54 — Catalogue Staging dans le moteur commun (2 novembre 2026)

L’autorisation explicite de l’utilisateur étend Engine pour Novlearn et Admin.
Les besoins observés et les garanties sont consignés dans
[le relevé 0.1.2](catalogue-staging-0.1.2.md). Les profils sont bornés, exacts
et prudents : aucune réussite fondée seulement sur des valeurs échantillonnées.
Les archives précédentes et les sources éditoriales sont conservées. L’adoption
des deux applications exige la même archive qualifiée, sans déploiement Production.

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

### D51 — Requalification locale et smoke natif du package (13–14 octobre 2026)

L'utilisateur autorise explicitement les corrections locales Engine et leur
certification, sans assouplir les tests ni modifier d'environnement distant.
Ajouter un diagnostic natif borné sans chemin/message privé et son test de
refus. Renforcer le smoke avec une exécution isolée réelle depuis le tarball.
Conserver l'échec sous Smart App Control comme une porte bloquante : le check
source vert ne qualifie pas le launcher installé, pourtant identique en octets.

Les preuves source, Linux et Python positives sont séparées du refus Windows.
Ne pas désactiver ou contourner la politique, ni attribuer aux anciens timeouts
une cause non établie. Choisir le runtime et requalifier l'artefact exact avant
adoption ; [preuves et résultats](certification/windows-requalification.md).

### D52 — Cible Linux bornée et archive installée (14 octobre 2026)

L’utilisateur retient explicitement « Linux avec cgroup v2 borné, testé dans
Docker local ». Qualifier l’archive exacte par installation npm hors ligne,
sept opérations publiques, projection, rejeu et arrêt réel des workers sous
384 MiB, swap 0 et 64 pids. Conserver les refus Windows antérieurs et le
passage du dernier artefact comme des preuves distinctes, sans promettre
l’acceptation des futurs binaires ni modifier Smart App Control.

Le banc permanent tools/check-installed-package.ps1 épingle l’image locale,
le daemon Docker Desktop local, les dépendances existantes et l’archive ;
aucun réseau ou privilège supplémentaire. Les résultats sont dans la
[certification Linux](certification/linux-requalification.md). Cette décision
ne vaut pas adoption applicative, migration distante, publication ou déploiement.

### D53 — Réutilisation locale des nombres de rendu exacts (17 octobre 2026)

L’autorisation humaine D51 / Admin D05 couvre cette correction locale et sa
certification. La charge avancée Admin a dépassé le délai natif de cinq secondes ;
une reproduction inchangée réussit à 4 985 ms, sans marge suffisante pour qualifier
sa disponibilité. Les familles isolées localisent le coût pendant l’instanciation.

Décision : mémoriser uniquement les succès numériques exacts, par source brute
identique, pendant l’unique passage d’une instanciation dont les paramètres et
variables sont déjà résolus. Ne mémoriser ni échec ni formule à scope distinct.
Le validate() final existant recopie chaque occurrence et préserve le détachement
des AST. Ne pas réutiliser de contexte Cortex global, modifier une admission,
augmenter les limites ou réessayer automatiquement pour masquer un refus.

Six tests de sources, chemins, domaine, détachement et isolation complètent les
tests existants. Qualification complète, comparaisons et package Linux borné
requis avant adoption Admin. Le package reste privé ; aucun registre ou
environnement distant n’est modifié. Les résultats sont consignés séparément
dans [le relevé ciblé](certification/numeric-render-cache.md).

### D54 — Sampling local officiel des courbes (21 octobre 2026)

L’utilisateur répond explicitement « Oui, autoriser cette extension locale et sa
certification » à la proposition Admin D10. Autoriser le calcul des fonctions et
suites dans le moteur, sa certification puis l’intégration locale Admin ; garder
quotas, délais et protections. Aucun changement de l’application élève NovLearn,
base distante, publication réelle, push ou déploiement n’est inclus.
Le profil et les limites sont décrits dans [le travail en cours](graph-sampling.md).
Cette capacité s’ajoute au package 0.2.0 sans changer le pipeline des snapshots
schéma 5 / engineVersion 0.1.0, ni réécrire les anciens artefacts.

### D55 — Sérialisation des attendus numériques Admin (30 octobre 2026)

La mission Admin/Engine autorisée reproduit un attendu rendu par Cortex avec des
séparateurs de groupes, puis refusé par le profil numérique inchangé. Les deux
chemins numériques sérialisent désormais avec digitGroup: 0. Aucune admission,
contrainte, forme, limite, source originale ou autorité mathématique n'est relâchée.
Le test numeric-display-roundtrip couvre rationnels/réels, négatifs, grands nombres,
rejeu et maintien du refus des entrées groupées hors profil.

L'archive distribuée Admin 0.1.1 est construite depuis baa48c45 et ce correctif,
sans les travaux 0.2.0 préexistants. SHA256 :
c7116f9310da49478deb43ca64e04b974efd34765b45a22294c13b5235bdf927.
Schéma 5 et pipeline 0.1.0 conservés ; les octets de présentation peuvent changer.
Conserver l'archive exacte pour le rejeu et renouveler les reçus. Les sources de
développement restent en 0.2.0 ; aucun tarball ancien n'est remplacé.

Qualification candidate : build/types/lint ; 1542/1544 tests au premier passage,
deux timeouts algébriques à 5 s pendant des builds concurrents ; relance complète
du fichier algébrique 126/126 sans concurrence, même délai. Le contrôle composé
s'arrête au format d'un ancien CDC de la copie de référence, conservé. Le banc
officiel du package installé Linux passe sous 384 Mio / swap 0 / 64 pids et réseau
coupé, avec arrêt des workers et rejeu. Cela ne qualifie pas Vercel ni NovLearn.
Les manifests, patch exact de release et anciennes archives sont conservés dans
Novlearn-admin/vendor ; aucune dépendance applicative au dossier voisin.

### D57 — Release commune 0.2.0 et transport privé (3 novembre 2026)

La demande utilisateur autorise la finalisation du moteur et son adoption dans
les deux applications. Conserver tous les correctifs 0.1.8, ajouter le sampling
0.2.0 et un adaptateur Node HTTP explicitement séparé. Le host officiel et ses
quotas ne sont pas assouplis. Préparer son installation sur le VPS existant,
les variables par environnement et les commits ; ne pas déduire une activation
Production ni modifier les données historiques de la publication du package.
