# Compatibilité MathLive — banc M7

MathLive **0.111.1**, épinglé dans `tools/mathlive/package-lock.json`, est utilisé
uniquement dans un banc local. Le package moteur garde CortexJS comme unique
dépendance mathématique. Aucun calcul MathLive, MathJSON client ou verdict client
n'est une autorité de correction.

## Preuves exécutées le 11 octobre 2026

Navigateur Brave/Chromium sous Windows, locale `fr`, séparateur décimal `,`.
Le champ MathLive réel a fourni **45 observations** : 37 insertions API `setValue`,
5 saisies au clavier physique automatisé, 2 collages via presse-papiers et une
saisie par clics sur le clavier virtuel. Ces chemins restent distincts dans
[la capture](../tests/fixtures/mathlive/observed-0.111.1.json) : source API,
événements clavier/input/paste, texte collé, `latex`, `latex-expanded`, prompts,
version runtime et date. [Capture visuelle](fixtures/mathlive/browser-proof.jpg).
Les attendus des tests viennent du catalogue fiable et des témoins manuels,
jamais des valeurs ou politiques transmises par le champ.

Les deux sérialisations donnent 90 vérifications de soumission/correction :
fractions, racines, puissances, nombres signés, point/virgule décimale,
parenthèses, polynôme, π/e, infinis, quatre fermetures d'intervalles français,
unions, ensembles/vide, fonctions usuelles, placeholders et saisies incomplètes.
Les états correct, incorrect, invalide et indéterminé sont observés ; aucune panne
serveur simulée dans ce banc (M8/M11). Le collage de `$$\sqrt{8}/2$$` produit
du LaTeX sans wrappers. La source reçue est conservée sans réécriture.

## Corrections issues des observations

- Le clavier produit `\lbrace/\rbrace` et `\lbrack/\rbrack`, contrairement aux
  chaînes synthétiques initiales. Entrées locales du dictionnaire CortexJS et
  admission lexicale complétées, sans deuxième parseur ; quatre fermetures et
  combinaisons d'alias testées, une ouverture ne devient jamais une fermeture.
- `2^{}` peut être effacé par CortexJS raw. Une garde lexicale bornée détecte
  scripts vides, groupes vides imbriqués et espaces échappés, y compris les sauts
  de ligne. Un contenu non vide reste admis ; aucun calcul algébrique par regex.
- `1{,}2` est un décimal, `1;2` sépare deux éléments. Les sorties clavier d'un
  ensemble décimal singleton et d'un ensemble à deux valeurs restent distinctes.
- `getPrompts()` vide ne prouve pas une saisie complète : un placeholder anonyme
  peut rester dans la source. Il est refusé avant toute réduction.

## Reproduction et limites

```sh
npm.cmd ci --prefix tools/mathlive --ignore-scripts --no-audit --no-fund
node tools/mathlive/server.mjs
```

Ouvrir `http://127.0.0.1:4317`, exécuter le corpus API puis saisir/coller les
témoins. Pour une frappe, focaliser le champ et attendre qu'il soit actif.
« Sauver observations » écrit uniquement `.cache/mathlive-observed.json`, fichier
fixe hors distribution. Le serveur loopback borne le POST à 128KiB/128 lignes et
exige l'origine exacte. Aucun exercice officiel ni correcteur n'y est exposé.

```sh
npm.cmd run test -- --run tests/mathlive-input.test.mjs
```

Les tests rejouent les observations archivées dans le package construit ; ils
ne relancent pas le navigateur. Un changement MathLive exige une nouvelle capture.
La capture présente ne prouve pas les mobiles, tous les navigateurs, macros ou
commandes MathLive. Les profils mathématiques restent ceux des ADR 005/010–013.
Les macros personnalisées doivent être développées côté champ en conservant les
placeholders ; `latex-without-placeholders` ne convient pas aux soumissions.
La documentation [OutputFormat](https://mathlive.io/mathfield/api/#outputformat)
définit ces formats ; notre preuve porte sur les chaînes archivées, pas sur une
promesse universelle de parsing. La locale et le séparateur sont des réglages du
banc, distincts de la politique officielle.

Capture SHA256 : `2A7DA9357F04C418FDA2F6EC2AC4B73F21C91E83E0D8870130F0DD59883B3B1B`.
Image SHA256 : `9C7AFC220C25CDAA2EFDFEC51F6BE909720F6A05B190AEE09C06F8666AEC561A`.
