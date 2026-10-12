# ADR016 — Adaptation explicite du corpus historique vers le schéma5

Statut : validé M10. Auteur unique root ; revues
indépendantes en lecture seule. Aucune nouvelle dépendance, aucun autre dépôt écrit.

## Décision et provenance

`novlearn-exercise-engine/legacy` expose seulement `adaptLegacyExercise` et ses
types JSON. Le cœur garde ses sept fonctions et son contrat canonique5. L'import
prend un format source explicite et une recette serveur revue : ID/révision,
variables libres, politiques par ID de question, aliases, contraintes et arbitrages.
Le champ `number` historique ne choisit aucune politique de correction implicitement.

Formats : ligne DB avec content/competences encodés JSON ; payload de publication
Creator avec content objet et competences tableau ; état Creator plat avec
variables/elements/appTitle à la racine. Ces deux formes Creator sont observées
dans useExercises.js:4–44 et publishUtils.js:96–117 du dépôt voisin en lecture seule.
Leurs tests sont des reconstructions synthétiques fondées sur le code : aucun
export fichier/runtime Creator nouveau n'est revendiqué. Un ID canonique fourni
par recette est obligatoire si le document neuf ne possède pas d'ID.

La ligne originale complète, chaînes JSON incluses, reste dans le rapport et les
extensions privées ; contenu décodé, recette et sources des éléments sont aussi
conservés. Un mapping couvre chaque chemin observé (558 pour les huit lignes).
Les champs non transposés, dont difficulté textuelle sans taxonomie numérique,
created_at, hints/explanations et données inactives, sont marqués preserved-private.
created_at n'est pas une révision ni une date d'export. Aucune seed historique n'a
été fournie : nouveau replay canonique, jamais promesse de retrouver un ancien tirage.

## Conversion bornée, sans code historique

La copie JSON inerte commune refuse getters, classes, cycles, clés dangereuses,
nonfinis, chaînes>4096, profondeur>16, collections>128 et nœuds>10000. JSON.parse
décode explicitement les deux champs de DB, sans passe d'unescape supplémentaire.
Les références @nom sont admises lexicalement en entier avant CortexJS, afin que
@u01 ne soit pas silencieusement lu comme @u0×1. Le parsing original réutilise
tous les gardes de source de input.ts, avec un dictionnaire Cortex local différent.
Cela conserve virgules françaises et refuse scripts/décimaux incomplets/commentaires.

CortexJS parse en raw et sérialise vers les références natives `\mathrm{nom}`.
Ni calcul ni réduction pendant conversion ; aucun parseur LaTeX parallèle ou
remplacement algébrique regex. Les exclusions numériques séparées par `;` et les
références simples @nom sont des grammaires de données explicites. Les autres
sources/éléments/flags contradictoires sans arbitrage bloquent l'adaptation.
Une expression JavaScript, Math.random ou process.exit reste une chaîne refusée,
jamais exécutée. Les changements de templates textuels portent seulement sur
leurs références lexicales ; leur source originale demeure privée.

Le canal backend privé accepte aussi l'opération `adaptLegacyExercise`
`{source,sourceFormat,recipe}` : même worker neuf/quotas/deadline que les sept
opérations du cœur. C'est la huitième opération interne, sans ajout d'export racine
ou de route HTTP d'import. Toute conversion de source non fiable doit passer par
cet hôte ; un budget AST ou une promesse timeout ne coupe pas un parsing synchrone.
La recette et les arbitrages restent choisis côté serveur. L'adaptateur public seul
est destiné aux imports offline revus, comme tools/adapt-corpus.mjs sur ce corpus.

Les bornes min/max computed sont ignorées par les générateurs observés :
Novlearn/frontend/app/utils/variableGenerator.ts:289–309 et
Novlearn Creator/src/utils/generateRandomValues.js:118–163. Importer ces champs
comme restrictions changerait le comportement et rendrait36/106 impossibles.
Ils restent privés ; le computed natif est rationnel exact, sans arrondi historique.
QCM sans points : défaut1 observé MCQRenderer.jsx:71. Graph sans showExpression :
défauttrue observé GraphRenderer.tsx:127 et GraphRenderer.jsx:208. Les IDs manquants
deviennent des IDs synthétiques stables par chemin, signalés, jamais présentés comme
identifiants historiques. Les IDs des éléments restent scoped par exercice.

## Arbitrages pédagogiques confirmés

- 36 : a≠0 pour garder des options textuelles distinctes.
- 78 : u0≠1 et k≠2u0² pour garder les distracteurs ; 4/9 restent exclus pour k.
- 96 : u0≤2k pour rendre croissance/majoration cohérentes ; alias mécanique
  L→limitValue, sans supprimer la source originale.
- 103 : Is_Flash=true de la ligne prévaut sur content.isFlash=false ; les deux
  valeurs et la décision restent privées.

Ces décisions utilisateur réduisent explicitement les domaines de tirage.
Pour64, « négative » est l'interprétation nonpositive, compatible avec f'(0)=0.
Les autres politiques numériques sont exactes, sans tolérance inventée.

## Complément nécessaire pour106

Profil explicite `log-affine-positive` : variable réelle nommée, domaine intrinsèque
x>0 ; A·ln(x)+B à coefficients rationnels bornés. Admission raw de tous descendants
avant réduction : ln ne prend que x, variables ailleurs refusées ; dénominateurs
fermés rationnels non nuls ; produits/pouvoirs non affines refusés, y compris termes
qui pourraient ensuite s'annuler. AST128/profondeur16 ; ratios/intermédiaires≤10^9,
puissances fermées entières −16…16. Hors profil → indéterminé, aucun faux incorrect.

Après admission, Cortex remplace ln(x) par un atome formel privé avec
`replace(...,{recursive:true})`, puis fournit polynomialCoefficients degré≤1.
Égalité des deux coefficients est une preuve exacte puisque ln bijecte ]0,+∞[ sur ℝ.
La preuve `exact-log-affine` et le domaine restricted sont distingués du polynôme
et d'un domaine cofinite. Aucun boxed ni solveur de dérivation public.
[API officielle Cortex](https://cortexjs.io/compute-engine/guides/patterns-and-rules/)
et déclarations0.151.0 locales vérifiées ; remplacement sym explicite, pas string LaTeX.

Le numérique fermé admet e élevé à un rationnel exact de [−16,16], après contrôle
de tous descendants. Les autres bases gardent leurs restrictions antérieures.
La nouvelle forme `power-of-e` exige un Power raw de base e et d'exposant rationnel.
exp(q) peut avoir la même valeur avec une forme non conforme : valeur et forme restent
séparées. Il s'agit de réponses connues de106, pas d'un solveur logarithmique général.
Deux exponentielles d'exposants rationnels exacts sont comparées par injectivité
sur ℝ, preuve distincte exponential-injectivity ; l'ordre indéterminé reste inconnu.
Cela distingue aussi e^q de1=e^0. Aucun calcul approché utilisé comme preuve.
La stricte positivité de ces exponentielles distingue zéro/nombres exacts nonpositifs,
avec preuve positive-exponential ; un ordre exact inconnu ne prouve jamais le signe.

## Livraison et qualification

tools/adapt-corpus.mjs vérifie le SHA256 reçu, produit huit définitions et huit rapports
dans tests/fixtures/legacy/adapted, puis instancie/corrige officiellement seed42.
Les fixtures canoniques64/103 antérieures restent des transcriptions manuelles,
distinctes de cette conversion complète. Tests complémentaires : quatre seeds par
ligne, oracles indépendants des formules/computed/contraintes et QCM, projection sans
secrets, erreurs de source/inertie/conflits/éléments inconnus, profil106 et formes.
État des commandes et limites d'environnement dans progress.md. La conversion locale
n'écrit aucune DB ni production. Coexistence/rollback : [guide](../migration-guide.md).
