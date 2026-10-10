# Analyse initiale : sources et confrontation

Date : 10 octobre 2026. Trois sous-agents Codex natifs indépendants ont été exécutés en lecture seule. L'agent principal est le seul auteur du socle et des documents. Aucun autre dépôt modifié.

## Sources

Cadrage fourni : `C:/Users/balth/.codex/attachments/0cb2def7-bb48-45f8-b3ce-bac3bc090cfd/Pasted text.txt`. Dépôt initial vide, hors configuration locale `.codex/config.toml`.

POC voisin : `../Novlearn-cortex-poc/docs/{lot-0bis-results,lot-0bis-conclusion,equivalence-and-domains,mathlive-compatibility}.md`, archives `lot0bis-previous`, preuves `evidence/npm-test.txt`, `evidence/mathlive-browser.json`, tests `exact-equivalence-lot0bis.test.ts` et déclarations installées des bibliothèques.

Audits voisins du 9 octobre : `../Novlearn/docs/audits/exercise-engine/` et `../Novlearn Creator/docs/audits/exercise-engine/`, documents inventory/contracts/extraction-risks. Code Creator `src/utils/generateRandomValues.js`, publication `publishUtils.js`, élève `frontend/app/utils/variableGenerator.ts`.

Les huit JSON historiques n'ont pas été trouvés dans les trois dépôts voisins, hors `.git` et `node_modules`. La fixture élève `frontend/__tests__/fixtures/correction-reference.json` se déclare synthétique et ne constitue pas un export de catalogue. Aucun catalogue distant, secret ou contenu d'anciennes attachments utilisé. Il manque également les contraintes réelles de déploiement FastAPI et des objectifs chiffrés de charge/latence.

## Agent 1 — Mathématiques (`/root/mathematiques`)

Conserve source et MathJSON raw, extrait les contraintes dans une famille bornée avant canonicalisation. Dérive les formes à la demande. Correction exacte candidate : rationnels et polynômes univariés à coefficients rationnels bornés via API CortexJS `polynomialCoefficients`, avec contrôle raw préalable. `x/x` canonique ne doit jamais être admis comme polynôme total parce qu'il est devenu `1`. Aucune preuve générale par `isIdenticallyEqual`, sampling ou simplification.

La conclusion ancienne rapporte 91 tests. Rapport récent et journal documentent 162 tests / 14 fichiers et 23 scénarios Edge. Ils n'ont pas été réexécutés ici. Onze comparaisons de coefficients sont explorées ; aucun correcteur production n'existe.

La frappe française exporte `3{,}14`, interprétée par défaut comme 314 ; `3,14` peut devenir tuple. Option native `decimalSeparator: '{,}'` observée pour le clavier français. Placeholder peut disparaître même en raw ; conservation raw seule n'est pas une garde suffisante. MathLive exporte LaTeX : depuis 0.111, `.expression` et `getValue('math-json')` ont été retirés. [Changelog officiel](https://github.com/arnog/mathlive/blob/master/CHANGELOG.md).

## Agent 2 — Exercices (`/root/exercices`)

Huit documents absents : aucune analyse exhaustive annoncée. Code observé : enveloppe Creator aplatie, ligne DB avec `content`, objets élève/duel. Six familles de paramètres : integer, decimal, choice, computed, doublet, triplet ; douze familles de contenus Creator, certaines sans renderer élève équivalent. Les structures signTable/sign_table et variationTable/variation_table diffèrent réellement : un renommage ne suffit pas.

Risques vérifiés : `new Function` Creator à la ligne 148, secours hors exclusions à la ligne 87, retour élève après essais sans garantie aux lignes 91–118, `Math.random`, conversions `Number`/`parseFloat` divergentes, dépendances computed non garanties. Ne pas reproduire ces bugs pour obtenir la parité.

Définition privée, instance privée et soumission distinctes. Rejeu = révision de définition + seed + version moteur/RNG. Projection publique par allowlist ; seed pouvant révéler les solutions reste serveur. Adaptateurs explicites par enveloppe, sauvegarde originale et diagnostic sur contenu non pris en charge.

## Agent 3 — Architecture et QA (`/root/architecture_qa`)

ESM seul + déclarations, export racine et archive limitée. Pas de CJS ou export browser divergent sans consommateur démontré. Comparer processus Node par requête, pool local, service interne, runtime JS Python, runtime Node applicatif existant. Recommande une expérience CLI puis pool ; transport production non décidé.

Calcul synchrone non préempté par Promise.race. Worker seul n'est pas une garantie mémoire forte : processus terminable et limites OS/conteneur à vérifier. Tests indépendants, archive consommable, scopes isolés, quotas et protection des projections. CI sans publication automatique.

## Arbitrages du principal

| Tension ou désaccord                                                                                | Décision                                                                                                                                   |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| QA et conclusion ancienne : 91 tests / navigateur absent ; math et preuves récentes : 162 / 23 Edge | Retenir les preuves récentes pour observations, les réserves mathématiques pour garanties. Aucune suite POC réexécutée dans cette mission. |
| Ancienne conclusion demande un normaliseur ; API coefficients déjà explorée                         | Étudier couche bornée sur API CortexJS, sans écrire un CAS ; pas de généralisation à rationnelles partielles.                              |
| Inventaires proposent une couverture large des figures                                              | Cœur étroit ; préserver les contenus non interprétés et signaler leur incompatibilité.                                                     |
| Isolation nécessaire pourrait sembler imposer un microservice                                       | Processus local peut isoler sans service réseau. Mesurer avant ADR définitif.                                                              |
| Versions POC TS7 et tooling lint                                                                    | TS6.0.3 retenu : typescript-eslint8.71.1 déclare >=4.8.4 <6.1.0. TS7 reste option future après compatibilité vérifiée.                     |

Convergence : séparation valeur/forme/domaine, seed privée quand sensible, aucun JavaScript legacy exécuté, aucun contrat JSON complet avant corpus.

## Sources externes de référence

- [Node : packages et exports](https://nodejs.org/api/packages.html)
- [FastAPI : async et fonctions utilitaires](https://fastapi.tiangolo.com/async/)
- [Python : sous-processus asyncio](https://docs.python.org/3/library/asyncio-subprocess.html)
- [Node : limites des workers](https://nodejs.org/api/worker_threads.html)
- [npm ci](https://docs.npmjs.com/cli/commands/npm-ci/)
- [TypeScript : installation locale](https://www.typescriptlang.org/download/)
- [Vitest : guide](https://vitest.dev/guide/)
- [ESLint : installation](https://eslint.org/docs/latest/use/getting-started)
- [Prettier : installation et verrouillage](https://prettier.io/docs/install)

Les comportements de CortexJS sont attribués aux déclarations/tests de la version locale 0.151.0, pas à une documentation flottante supposée identique.
