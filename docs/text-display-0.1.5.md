# Présentation des paramètres dans les textes

L'utilisateur autorise le 3 novembre 2026 la correction commune des signes dans
les énoncés et explications, en conservant les composants de rendu et de saisie.

La substitution purement textuelle rendait `u_n+@r` comme `u_n+-7` et une puissance
de paramètre négatif pouvait perdre ses parenthèses. Les segments `$…$` et
`$$…$$` contenant des références sont maintenant parsés par CortexJS avant
substitution. Les nombres exacts sont insérés dans l'AST brut, puis sérialisés.
Aucun appel à evaluate, simplify ou canonical n'est utilisé ; cette présentation
ne constitue pas une admission de domaine ou une preuve de correction.

Les références échappées, le texte ordinaire, les réponses textuelles exactes,
les segments sans paramètres et les notations non prises en charge restent
littéraux. Les collections ambiguës ne sont pas réinterprétées. Le budget est
de 128 nœuds, profondeur 16 et 64 segments par texte, sous le host borné habituel.
Les sources privées des définitions et les instantanés historiques sont conservés.

La version finale 0.1.6 conserve aussi les relations initiales des étapes de
démonstration ; la candidate 0.1.5 n'a pas été reçue. Les archives restent distinctes.
Le package privé 0.1.6 doit être installé à l'identique dans Admin et Novlearn.
Le schéma 5, le pipeline 0.1.0 et la génération restent inchangés. L'empreinte
exacte distingue l'archive ; aucune migration de définition ni écriture Production.
