# NovLearn Exercise Engine

`novlearn-exercise-engine` est une bibliothèque TypeScript qui définit, génère,
instancie et corrige des exercices mathématiques. Elle fournit des règles communes
à NovLearn élève, NovLearn Admin et aux duels pour éviter des calculs et des
corrections divergents entre applications.

Le package privé **0.2.1** est ESM, utilise le **schéma 5** et repose sur
**CortexJS 0.151.0**, son unique bibliothèque mathématique principale. Le cœur
portable ne dépend d’aucun framework ni de MathLive. Un adaptateur Node optionnel
isole les calculs côté serveur ; le rendu, les droits, le stockage et les points
appartiennent aux applications.

Le [correctif numérique du 17 octobre](docs/certification/numeric-render-cache.md)
réutilise les succès exacts identiques au sein d’une seule instanciation. Les
contrats, diagnostics et limites restent inchangés ; son état et ses preuves
sont distincts de la certification historique ci-dessous. Aucun registre ni
environnement distant n’est modifié.

L’[extension de sampling D54 / Admin D10](docs/graph-sampling.md) est autorisée
localement et en cours de qualification dans le package de développement 0.2.1.
Elle ne remplace pas les certifications et archives historiques ci-dessous.

## Disponible aujourd’hui

- Génération reproductible d’entiers, décimaux exacts, choix, tuples et variables
  calculées rationnelles, avec exclusions, dépendances et contraintes bornées.
- Exercices à plusieurs questions, sections et QCM ; données typées pour graphes,
  tableaux, suites, arbres, vecteurs et figures, sans renderer graphique.
- Instance privée contenant les attendus ; projection publique par sélection de
  champs ; correction par question depuis l’instance officielle du serveur.
- Correction numérique, algébrique, ensembles et intervalles dans des profils
  précis ; formes pédagogiques et tolérances explicites. Une preuve insuffisante
  donne `indeterminate`, une panne donne `error`.
- Huit adaptations historiques locales, banc MathLive/FastAPI et consommation
  réelle du package documentés. Aucune migration de production effectuée.

La [certification locale du 14 octobre](docs/certification/linux-requalification.md)
valide le profil **Linux avec cgroup v2 borné** choisi par l’utilisateur et
l’archive réellement installée. Suite source : **1534 tests**, sans skip ;
12 contrôles OS Linux, huit parcours historiques, 13 tests Python/FastAPI,
exports/types/bundle et sept opérations du tarball installé passent.
Les [refus Windows antérieurs](docs/certification/windows-requalification.md)
restent documentés ; aucun contrôle ni politique n’est assoupli. Cela ne vaut
pas adoption applicative ou qualification d’un hébergement encore inconnu.
Le moteur ne fournit pas de CAS universel,
solveur général de limites/dérivées, correction libre multivariée ou complexe,
éditeur Admin ni interface de production. L’hôte Linux exige un cgroup v2 borné ;
chaque nouveau binaire Windows reste soumis à la politique du poste. Les
[capacités et limites](docs/features.md) précisent ce qui est garanti et testé.

## Démarrer dans le dépôt

Prérequis : **Node 24.19.x et npm 11.17.x**.

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd pack --dry-run
```

`check` construit le package puis exécute types, lint, format et Vitest. Le
package est privé : le tarball local sert aux consommateurs, sans publication
automatique. Voir [installation et maintenance](docs/development.md).

Après installation du tarball dans un projet ESM, la lecture d’une saisie utilise
l’API exportée :

```ts
import { parseMathInput } from 'novlearn-exercise-engine';

const parsed = parseMathInput('1{,}25');
if (!parsed.ok) console.log(parsed.diagnostics);
// Le parsing conserve la source ; il ne prouve ni la valeur ni le domaine.
```

Le [guide d’utilisation](docs/usage.md) donne un exemple complet et vérifié :
définition avec deux questions → génération → instance privée → projection →
soumission → correction, puis rejeu et erreurs.

## Lire la documentation

Commencer par [l’index](docs/README.md), puis [l’architecture](docs/architecture.md).
Les [capacités](docs/features.md) décrivent les profils opérationnels ; la
[matrice CDC](docs/feature-coverage.md) relie les exigences à leurs preuves.
[Progression](docs/progress.md) et [roadmap](docs/roadmap.md) permettent la reprise.
[Déploiement du host](docs/DEPLOYMENT.md) décrit l'API privée et le CI/CD VPS.
Les [décisions](docs/decisions.md) et leurs ADR conservent les justifications.

Le [cahier des charges officiel](docs/CDC_référence.md) décrit la cible validée.
Les [archives](docs/archive/README.md) conservent les bilans historiques.
