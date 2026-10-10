# ADR 008 — Un contrat et un pipeline canoniques

Statut : retenu le 11 octobre 2026 sur demande explicite. Remplace les exigences
de compatibilité interne des ADR 004/006/007 et D12/D16/D24/D30/D32/D33 ; leurs
choix mathématiques et preuves historiques restent utiles. ADR 001/002/003/005
applicables. [Audit avant suppression](../consolidation.md).

## Décision

Sans consommateur de production, maintenir plusieurs enveloppes et orchestrateurs
n'apporte plus de garantie utile. Un schemaVersion 5, types sans suffixe,
GenerationDefinition unique integer/decimal/choice/tuple/computed et contraintes.
ExerciseDefinition composée, ExerciseInstance complète, PublicInstance sélectionnée.
Question rationnelle simple et multiquestions utilisent la même liste.

Un generateVariables prépare les dépendances puis appelle la seule boucle de
candidates.ts. Un instantiateExercise résout une fois puis prépare les éléments.
Modules PRNG/sampler/grille/CortexJS réutilisés, aucun nouveau service/dépendance.

Package privé 0.1.0. Identité mulberry32-rejection-v1 avec vecteurs complets.
Schéma : structure ; moteur : artefact ; génération : protocole de tirage/rejet.
Révision/seed/ordre/budgets/ID officiels conservés. Supprimer instantiationVersion,
sans responsabilité supplémentaire au schéma/artefact. generation.schemaVersion
identifie le même contrat accepté en autonome, sans implémentation parallèle.

Choix numériques finis tirables conservés ; utilisation mathématique subordonnée
à l'encodage exact borné. La restriction des comparaisons ne supprime pas le tirage
antérieur. AnswerSubmission reprend LaTeX brut sous schéma 5. CorrectionResult et
transport de sélection QCM restent aux Lots 6/7, jamais livrés auparavant.

## Conséquences

Anciens contrats/tableaux/options refusés, snapshots expérimentaux non rejouables.
Aucun adaptateur maintenant. Sources Creator/DB conservées, conversions explicites
futures au Lot 9 hors chemin canonique ; aucun JS historique ou migration exécuté.

Tests mathématiques/erreurs/inconnus portés au canonique ; anciennes attentes de
compatibilité remplacées par refus explicite. Nouveaux vecteurs figés et oracles
indépendants, projection/rejeu/JSON/immutabilité/inertie testés. [Preuves](../progress.md).
Correcteur, éléments avancés, UI, isolation forte/adoption différés ; aucun commit.
