# Réutilisation des nombres de rendu — qualification locale du 17 octobre 2026

**Correctif et archive qualifiés localement ; adoption Admin encore à réaliser.**
La [preuve détaillée](numeric-render-cache.json) distingue suite source, package
installé, comparaison portable et runtime natif. Les preuves du 14 octobre
restent historiques et ne sont pas réécrites.

## Régression et correction

La définition Admin complète (vecteurs 2D/3D, géométrie, plan complexe, suite,
formule et question) avait rencontré un timeout natif à 5 022 ms, avec 1,3 ms
d’attente dans la file. Une seule reproduction inchangée passait à 4 985 ms.
Les cas isolés localisaient le coût pendant l’instanciation. Ces diagnostics
ne remplaçaient pas l’acceptation de la définition complète.

Le correctif concerne uniquement src/instantiation.ts. Une Map créée pour une
seule instanciation réutilise les succès numériques exacts d’une source brute
strictement identique. Les paramètres et variables sont déjà résolus et stables.
Ni échec, formule à scope distinct, autre contexte ou génération suivante ne
réutilisent ce cache. Les chemins de provenance restent propres à chaque champ.
La validation finale existante recopie chaque occurrence dans le snapshot et
conserve des objets et AST détachés. Aucun contexte Cortex global, nouvelle
admission, normalisation de source, dépendance ou API n’est ajouté.

## Vérifications réellement exécutées

| Contrôle                                          | Résultat                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------- |
| Suite source standard Windows, npm.cmd run check  | 1 540 PASS, 30 fichiers, zéro skip ; 445,89 s                                   |
| Build, types, lint, format                        | PASS                                                                            |
| Tests ciblés de données et réutilisation          | 80 PASS, dont six nouveaux invariants                                           |
| Tarball réellement installé, exports/types/bundle | PASS ; 157 fichiers ; bundle browser sans builtin Node, exécuté dans Node       |
| Smoke isolé Windows de cette archive              | PASS, 1 590 ms, 62 062 592 octets de pic engagé ; aucune protection changée     |
| Package installé Linux                            | Sept opérations distinctes, huit appels avec rejeu privé ; workers arrêtés      |
| Définition avancée complète, Linux natif          | Six instanciations, seeds 0/42, trois tours ; 2 412–2 638 ms                    |
| Projections publiques                             | Identiques aux captures antérieures, six comparaisons                           |
| Corrections attendue/incorrecte/invalide          | PASS pour les deux seeds                                                        |
| Snapshots privés et diagnostics ancien/nouveau    | 10 comparaisons JSON exactement identiques, dont huit refus attendus            |
| Isolation OS Linux existante                      | 12 PASS, dont pression mémoire réelle, arrêt/reprise et refus de sous-processus |
| Parcours historiques isolés                       | Huit lignes PASS, recette invalide refusée                                      |

La comparaison portable des snapshots et diagnostics ne qualifie pas le délai
natif. Celui-ci est vérifié séparément sur six workers neufs par le host officiel,
avec son délai par défaut de cinq secondes, une opération active et quatre en
attente. Aucun succès partiel ou indéterminé n’est accepté. Les assertions et
limites existantes restent inchangées. Les six nouveaux tests protègent sources,
chemins, domaine, détachement, paramètres entre appels et formules display-only.

Le tarball privé 0.1.0 et le schéma 5 gardent leurs contrats ; le build exact
est distingué par SHA256 :

`d4d3abc408ab37f2f8a5faa512964b48947828bae9209cb1460b47111ca582f9`

Les conteneurs inspectés utilisent l’image Node 24.19.0 épinglée, 384 MiB,
swap 0, 64 pids, réseau none, racine en lecture seule, UID 65534, cap-drop ALL
et no-new-privileges. Les archives sont montées en lecture seule et installées
hors ligne. Aucun identifiant Auth/base n’est transmis. Les conteneurs arrêtés
et leurs sorties sont conservés. Les logs du banc sont dans le dossier ignoré
.local/lot1a du dépôt Admin ; le tarball et son smoke restent dans .cache Engine.

## Adoption et limites

L’Admin utilise encore son archive précédente : SQL épingle cette empreinte
pour l’enregistrement signé et la publication. Une migration locale qualifiée
et un changement coordonné du package/signature restent nécessaires avant
l’adoption. Les anciens reçus, archives et journaux ne sont ni réécrits ni
déclarés issus du nouveau build. Aucun environnement distant, CDC, corpus
original, donnée métier, politique Windows ou registre n’est modifié.

Les temps observés ne garantissent ni un SLO d’hébergement ni toutes les
définitions possibles. Python/FastAPI et une nouvelle session MathLive navigateur
ne sont pas réexécutés ; aucune réception visuelle, acceptation de futurs
binaires Windows ou qualification distante n’est déduite de ce bilan.
