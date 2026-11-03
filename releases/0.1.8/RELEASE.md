# Engine 0.1.8 — archive de distribution

Archive privée utilisée par Novlearn et Novlearn Admin. Le package reste
`novlearn-exercise-engine`, ESM, schéma 5 et pipeline 0.1.0.
Prérequis : Node `>=24.19.0 <25`, npm `>=11.17.0 <12`.

## Fichiers à utiliser

Télécharger **novlearn-exercise-engine-0.1.8.tgz** et son manifeste
**engine-release-0.1.8.json** dans les pièces jointes de cette release.
Les ZIP/TAR générés par GitHub sont les sources, pas le package npm construit.
L'archive distribuée conserve les octets déjà adoptés par les consommateurs.

SHA-256 : `82e499726db2da454627903ed65802eaa2ab3e7185f7f6cb3c84c1cbdbde3cea`.

Exemple depuis la racine Novlearn, après authentification GitHub :

```sh
gh release download v0.1.8 --repo BBuclon/Novlearn-Engine --pattern '*.tgz' --pattern '*.json' --dir frontend/vendor
cd frontend
npm ci
```

La dépendance reste `file:vendor/novlearn-exercise-engine-0.1.8.tgz`.
Vérifier le manifeste et conserver le lockfile avant déploiement.
Pour Admin, télécharger dans son propre dossier `vendor/`.
Ce dépôt privé nécessite une authentification pour le téléchargement ;
aucun registre npm public ni token GitHub à l'exécution n'est nécessaire.

## Provenance et vérification

Le snapshot publié `c1155b5b38ce113a09870d7d82b359b861a3e2d0` a exactement
l'arbre `b0019d5d4b0544764f4890cf787f4d6c9c5149a8` du snapshot local
`de1e8b766938908d0536b0cfc0c9e82742395ec0`.
Le manifeste conserve le commit source original de l'artefact
`bb0cc0b1e1cda79117395f2506c49b57d6e781b5` ; le patch joint conserve les
changements de provenance. Le commit de publication ne prétend pas remplacer
les identifiants des commits locaux originaux.

- Archive SHA-256/SHA-512 et 169 fichiers vérifiés.
- Build, types, lint et format source conformes.
- Windows local : 1 589 tests passent sans skip.
- [CI source Linux et Windows](https://github.com/BBuclon/Novlearn-Engine/actions/runs/41626455083) : succès, contrôle complet et smoke du package inclus.
- Le workflow de publication vérifie le tarball et chaque fichier du manifeste
  avant de créer la release et de joindre les fichiers à un brouillon.

## Limites de cette publication

Cette pré-release distribue l'artefact existant. Elle ne certifie pas son
déploiement en production. La version de développement 0.2.0 est exclue.
Engine ne se connecte pas à Supabase et ne possède aucune base propre :
Novlearn et Admin choisissent leur base et passent les données au moteur.

L'intégration Novlearn actuelle reste limitée à localhost et au projet staging.
L'adoption hébergée nécessite l'adaptation de cette configuration, les variables
par environnement, les migrations requises et la qualification du host officiel
avec ses limites OS. Aucune migration ni activation de production n'est incluse.
