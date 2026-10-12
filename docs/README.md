# Documentation du moteur

Référence technique du package privé 0.1.0, schéma 5, revue le 12 octobre 2026.
Le [CDC officiel](CDC_référence.md) décrit les objectifs. Le code et les tests
déterminent les capacités réelles ; la [matrice CDC](feature-coverage.md) en
assure la traçabilité. Une observation historique et une proposition ne sont
pas des capacités livrées.

## Parcours de lecture

| Document                            | Contenu                                                       | À consulter pour…                                       |
| ----------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------- |
| [README du projet](../README.md)    | Rôle, état et démarrage                                       | Découvrir le moteur en quelques minutes                 |
| [Architecture](architecture.md)     | Contrats, modules, pipeline et frontières de confiance        | Comprendre comment les données circulent                |
| [Capacités et limites](features.md) | Profils opérationnels, garanties et tests                     | Savoir si un exercice ou une réponse est pris en charge |
| [Utilisation](usage.md)             | Sept API, exemples exécutables, résultats et erreurs          | Écrire une définition et corriger une soumission        |
| [Développement](development.md)     | Installation, scripts, tests, extensions, CI et versions      | Maintenir le moteur sans casser ses garanties           |
| [Roadmap](roadmap.md)               | Lots M0–M12, correspondance CDC et suites non engagées        | Choisir le travail suivant et ses critères              |
| [Progression](progress.md)          | Dernière livraison, contrôles actuels et procédure de reprise | Reprendre une session interrompue                       |

## Traçabilité et intégration

| Document                                     | Rôle et moment de consultation                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [Matrice CDC](feature-coverage.md)           | Vérifier chaque exigence, son lot, son implémentation et ses preuves                            |
| [Décisions et ADR](decisions.md)             | Retrouver les motifs, alternatives et décisions remplacées                                      |
| [Compatibilité historique](compatibility.md) | Comprendre les huit adaptations, leurs arbitrages et leur provenance                            |
| [Migration progressive](migration-guide.md)  | Préparer une coexistence et un rollback applicatifs, sans migration implicite                   |
| [MathLive](mathlive-compatibility.md)        | Reproduire le banc de saisie et distinguer capture réelle et rejeu de fixtures                  |
| [Démonstration locale](demo.md)              | Lancer le parcours FastAPI/MathLive et examiner les scénarios de reprise/duel                   |
| [Distribution et adoption](release.md)       | Consommer un tarball, identifier l’artefact et qualifier un upgrade/rollback                    |
| [Audit documentaire](audit.md)               | Lire le diagnostic, l’inventaire, les changements et les contrôles de cette mission             |
| [Changements](../CHANGELOG.md)               | Voir la synthèse de la version du package                                                       |
| [Archives](archive/README.md)                | Retrouver les rapports détaillés et états anciens, sans les appliquer comme consignes actuelles |

Les guides spécialisés restent séparés parce qu’ils portent des procédures ou
des preuves propres. Les anciennes visions, spécifications, revues et stratégies
de tests sont archivées ; leur contenu actuel a été intégré aux guides principaux.
[AGENTS.md](../AGENTS.md) conserve les règles de travail dans ce dépôt.
