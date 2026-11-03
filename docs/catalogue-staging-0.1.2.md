# Extension commune au catalogue Staging — 2 novembre 2026

L’utilisateur autorise l’extension du moteur partagé par Novlearn et Admin pour
convertir les exercices historiques de Staging. Le développement part de
l’archive applicative 0.1.1, dans une branche isolée ; les travaux 0.2 présents
dans l’autre répertoire ne font pas partie de cette livraison.

Les profils `geometric-expression` et `elementary-positive` couvrent les
expressions géométriques sur les réels et les expressions élémentaires sur une
variable strictement positive. L’admission du domaine précède toute réduction.
Une identité exige la même forme symbolique exacte obtenue par CortexJS dans
un contexte commun. Des substitutions entières exactes peuvent réfuter une
identité ; leur accord ne constitue jamais une preuve. Une expression admise
mais non prouvée reste indéterminée.

Le profil numérique fermé accepte les puissances de e avec exposant réel
admis et les puissances ±1/2 avec domaine prouvé. Les collections peuvent
contenir ces nombres exacts, notamment des bornes logarithmiques. Les budgets
de taille, les divisions par zéro, les domaines des racines/logarithmes et le
refus des nombres mixtes ambigus restent contrôlés. Il n’y a ni calculateur
supplémentaire ni réécriture algébrique par expression régulière.

Le premier candidat 0.1.2 a révélé deux défauts de relecture : coefficients
algébriques groupés et parenthèses de bornes ouvertes sérialisées par CortexJS.
Le correctif 0.1.3 retire le groupement à l’affichage et admet ces délimiteurs
dans le dictionnaire de collections, avec des tests de relecture exacts. Les
archives candidates restent des preuves distinctes, jamais qualifiées par défaut.

Le package privé retenu devient 0.1.4. Les contrats restent schema 5 / pipeline 0.1.0,
avec des profils additifs. L’empreinte exacte de l’archive distingue les
exécutions ; l’archive 0.1.1 doit être conservée pour les anciens reçus. Une
qualification du catalogue vérifie le fonctionnement du moteur ; elle ne
remplace pas une revue indépendante de chaque énoncé et réponse historique.

La qualification source, l’installation bornée Linux, l’adoption applicative
et la conversion réelle en base doivent être rapportées séparément. Aucun
déploiement Production, publication de package ou activation éditoriale
implicite n’est autorisé par ce document.

Le correctif 0.1.4 rend explicite la multiplication lors de la sérialisation des
contre-exemples exacts, notamment pour les suites de base fractionnaire. Les
29 tests du profil élémentaire passent. L'archive immuable sélectionnée est
791c6472fc87ba0559d8889cf3f4482ab5466def49eec9e418ddbc2c7278f3ea,
identique dans Novlearn et Admin. Les preuves de qualification du catalogue sont
conservées dans Novlearn ; elles restent distinctes des reçus éditoriaux Admin.
