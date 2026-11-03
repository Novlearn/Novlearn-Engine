# Engine 0.2.0

Cette livraison reprend les corrections 0.1.8 et ajoute `sampleDisplayGraph`
avec le profil borné `display-graph-v1`, ainsi qu'un transport Node
`novlearn-exercise-engine/remote-host` vers le host officiel isolé.

Le cœur ne lit aucune variable d'environnement et n'accède à aucune base.
Le service HTTP optionnel reçoit seulement `ENGINE_TOKEN`; Compose utilise
`ENGINE_BIND_PORT` pour séparer staging (3151) et production (3152).

- Archive : `novlearn-exercise-engine-0.2.0.tgz`.
- SHA-256 : `cc62b257798bda3ebffe293f49997e72ece2ee11b7f392c28e92217ceb45af91`.
- 185 fichiers installés vérifiés dans le manifeste.
- Source de l'archive : `9c017a889e25498e22295625044351c9895de360`.
- Schéma 5 ; pipeline de rejeu 0.1.0 ; archives précédentes conservées.

Les sources originales de l'archive sont conservées dans le bundle Git joint.
Le commit de publication ajoute la distribution, les guides et la qualification
Linux du host, sans modifier les octets de l'archive.

La publication est conditionnée aux contrôles complets Windows/Linux et au test
du conteneur Linux installé : archive exacte, limites cgroup, génération,
projection publique, échantillonnage, correction et authentification HTTP.

Installer le fichier `.tgz` avec son lockfile dans chaque application.
Voir `docs/release-0.2.0.md` pour installer le host et configurer les appels serveur.
La release ne déploie pas le VPS et n'exécute aucune migration de base.
