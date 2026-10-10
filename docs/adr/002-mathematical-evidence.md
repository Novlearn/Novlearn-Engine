# ADR 002 — Source, domaine et preuve distincts

Statut : retenu, 10 octobre 2026.

Contexte : réduction de x/x peut effacer x≠0 ; simplification efface les témoins de forme. Comparaison générale CortexJS peut être heuristique.

Décision : conserver source/raw, vérifier admissibilité et contraintes avant réduction ; dériver canonical au besoin. Séparer preuve de valeur, conformité de forme et politique de domaine. Exact seulement pour familles bornées testées ; sinon indeterminate. Une erreur/échéance n'est pas une réponse fausse.

Conséquences : correction moins large mais garanties explicites. Le raw n'assure pas conservation de toutes les commandes, notamment placeholder ; une garde serveur reste à établir. Aucun extracteur ou solveur universel de domaines annoncé.
