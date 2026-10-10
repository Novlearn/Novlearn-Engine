# Consignes permanentes

## Périmètre et état

Lire README.md, docs/progress.md, docs/decisions.md et le lot concerné dans docs/roadmap.md avant toute modification. Ne modifier que ce dépôt. Les dépôts Novlearn, Novlearn Creator et Novlearn-cortex-poc sont des sources en lecture seule. Ne pas commencer plusieurs lots automatiquement.

## Architecture

TypeScript strict ; package portable sans dépendance React, Next.js, FastAPI, Supabase ou MathLive dans le cœur. CortexJS est l'unique bibliothèque mathématique principale. API restreinte, contrats versionnés et aucune exportation publique des objets boxed CortexJS. Ne pas construire un CAS ni un deuxième parseur LaTeX. Ne pas ajouter service, dépendance ou abstraction sans besoin documenté.

## Garanties

Conserver la source originale ; vérifier admissibilité, domaine et forme avant réduction. Distinguer valeur, forme pédagogique, preuve exacte, heuristique, indétermination et erreur. Aucun verdict incorrect issu d'une comparaison indéterminée. `isIdenticallyEqual()` seul n'est pas une preuve universelle. Les limitations testées ne sont pas des capacités supportées.

Interdits : `eval`, `new Function`, transformations algébriques par regex, génération via `Math.random`. Substitution mathématique par CortexJS ; paramètres et variables libres distincts. Contraintes impossibles : échec explicite, jamais fallback hors contraintes.

Correction officielle serveur, projection publique par sélection de champs, aucune confiance dans politique/verdict/seed client. Isoler contextes et calculs ; timeout de promesse ou Vitest ne coupe pas un calcul synchrone.

## Travail et vérification

Les huit lignes historiques sont reçues dans docs/exercises_rows.json ; conserver leurs octets et distinguer inventaire, transcription native et migration réelle. Ne pas annoncer une migration non exécutée. Distinguer source observée et proposition. Pour les travaux multi-agents demandés, analyses initiales en lecture seule ; désigner un seul auteur par fichier. La délégation n'est pas obligatoire pour toute modification future.

Commandes : `npm.cmd ci`, `npm.cmd run check`, `npm.cmd pack --dry-run` sous PowerShell. Ajouter des tests pertinents pour les comportements critiques, y compris erreurs et indétermination. Mettre à jour décisions/progress et rapporter les commandes réellement exécutées ; ne jamais annoncer une CI distante ou suite navigateur non exécutée.
