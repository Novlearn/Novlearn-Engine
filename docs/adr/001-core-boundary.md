# ADR 001 — Bibliothèque ESM portable

> Statut documentaire : **Active** (revue du 12 octobre 2026). La décision reste applicable avec les extensions ultérieures. Les mentions de lots futurs, de nombres d’exports et de validation décrivent la date de chaque section ; [l’architecture](../architecture.md) et [les capacités](../features.md) décrivent l’état actuel.

Statut : retenu, 10 octobre 2026.

Contexte : plusieurs applications Node et un backend Python doivent réutiliser les règles mathématiques. Le dépôt initial est vide ; aucun besoin CJS démontré.

Décision : TypeScript strict, ESM avec déclarations et export racine ; CortexJS unique bibliothèque mathématique. Frameworks et MathLive hors cœur. Adaptateurs de transport hors entrée portable. Aucun objet boxed public.

Conséquences : dépendances limitées, signatures contrôlées, Python nécessite une frontière explicite. Pas de double build CJS ni microservice présumé. Revoir si un consommateur impose réellement une autre distribution.
