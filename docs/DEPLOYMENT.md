# Déploiement du host Engine

Ce guide décrit le service HTTP privé, sa configuration et les workflows actuellement présents dans le dépôt. Les détails du diagnostic du vhost staging sont dans [apache-staging.md](apache-staging.md).

## Contrat HTTP

L’image GHCR exécute `novlearn-engine-server` derrière le host Node isolé.

| Route          | Accès                       | Fonction                                                        |
| -------------- | --------------------------- | --------------------------------------------------------------- |
| `GET /healthz` | Contrôle de santé local     | Retourne l’état du host après un calcul de démarrage réussi.    |
| `POST /run`    | Serveur autorisé uniquement | Accepte une requête JSON du protocole Engine v1, jusqu’à 1 MiB. |

Chaque appel `POST /run` porte `Authorization: Bearer <token>` et
`x-engine-archive-sha256: <sha256>`. Le host compare l’empreinte reçue à celle
de l’archive Engine qu’il exécute et refuse les versions différentes. N’appelle
pas cette route depuis le navigateur. Le sous-chemin public
`novlearn-exercise-engine/remote-host` fournit le client serveur
`createRemoteHost`; sa configuration exige une URL HTTPS terminant par `/run`
(HTTP est accepté seulement sur loopback), un token et une empreinte SHA-256.

Le staging est joignable via `https://staging.novlearn.fr/run`, derrière Apache.
La production reste liée à son port loopback et est appelée depuis les serveurs
autorisés. Les ports hôtes par défaut sont 3151 (staging) et 3152 (production).

## Configuration et isolation

Les fichiers de configuration actifs sont root-only sur le VPS :

- `/opt/novlearn-engine/staging/.env`
- `/opt/novlearn-engine/production/.env`

Chaque fichier définit `ENGINE_IMAGE` par digest GHCR immuable,
`HOST_PORT` et `ENGINE_API_TOKEN`. Les tokens des deux environnements sont
distincts ; ne les ajoute ni à Git, ni aux logs, ni à une variable exposée au
client. Les applications appelantes gardent leur propre secret serveur.

Compose utilise les projets `novlearn-engine-staging` et
`novlearn-engine-production`. Le service écoute dans le conteneur sur 8080,
publié uniquement sur `127.0.0.1`. Il tourne en utilisateur non-root, avec
système de fichiers en lecture seule, sans capabilities, sans swap, et avec
384 MiB, 64 processus et 1,5 CPU au maximum. Le healthcheck appelle `/healthz`.
Les logs JSON sont limités à trois fichiers de 10 MiB par conteneur.

## Workflows actifs

| Workflow                                 | Déclenchement et effet                                                                                                                                                                             |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CI`                                     | Push et PR vers `main`, ou lancement manuel. Vérifie Windows/Linux, le package et le host conteneurisé.                                                                                            |
| `Engine release`                         | Push d’un tag `v*`. Vérifie le tag et le package, publie l’archive exacte avec son SHA-256 et l’image GHCR par digest, puis déploie cette release en staging.                                      |
| `Deploy Engine release to staging`       | Lancement manuel depuis `main` pour redéployer une release publiée en staging, avec confirmation du tag exact.                                                                                     |
| `Promote or roll back Engine production` | Lancement manuel depuis `main`. Une promotion exige le dernier déploiement staging réussi ; un rollback cible une release publiée. L’environnement production applique son approbation configurée. |
| `Test staging Apache repair`             | PR/push modifiant les scripts, tests ou workflow Apache. Teste sur un runner jetable ; ne contacte pas le VPS.                                                                                     |
| `Repair Engine staging Apache route`     | Lancement manuel depuis `main`, environnement staging. Modes inspect/apply/rollback limités au vhost HTTPS staging.                                                                                |

Les anciens workflows d’initialisation du VPS et de récupération du token ont
été retirés. Le dépôt ne contient plus de procédure automatisée de bootstrap ;
la configuration existante du VPS est gérée par l’administrateur. Le workflow
Apache ne déploie aucune image Engine.

## Publier, déployer et revenir en arrière

1. Depuis un commit de `main`, mettre à jour la version SemVer et son lock si
   nécessaire, puis pousser le tag correspondant (`vX.Y.Z`).
2. `Engine release` exécute la CI et le smoke du vrai tarball, produit une seule
   archive npm sous Windows, calcule son SHA-256, puis publie cette archive et
   l’image GHCR par digest. Le déploiement staging utilise le digest de cette
   même release et attend le healthcheck.
3. Pour redéployer en staging une release déjà publiée, lancer
   `Deploy Engine release to staging`, depuis `main`, avec le tag publié et
   la confirmation exacte demandée par le formulaire.
4. Pour la production, lancer `Promote or roll back Engine production`.
   `promote` exige un déploiement staging réussi pour ce tag ; `rollback`
   sélectionne une release publiée. Le workflow utilise le digest de release,
   attend l’approbation de l’environnement production et vérifie la santé.
5. Mettre à jour chaque consommateur avec le SHA-256 du tarball attaché à la
   release. Le serveur doit envoyer cette empreinte dans chaque requête ; la
   version seule ne suffit pas pour identifier un build privé.

Ne remplace pas une image par un tag mutable comme `latest`. Garde l’archive et
l’empreinte exactes nécessaires au rejeu des tentatives historiques.

## Diagnostic

- Vérifier `/healthz` sur le port loopback de l’environnement concerné et
  l’état Compose avec le bon fichier `.env`.
- Pour diagnostiquer un refus 401, un 503 ou une empreinte incompatible,
  vérifier côté serveur les noms de variables et le digest attendu sans afficher
  les valeurs secrètes. Le token serveur est nommé `ENGINE_API_TOKEN`.
- Pour une redirection publique ou une erreur de routage staging, lancer le mode
  `inspect` du workflow Apache et suivre
  [la procédure staging](apache-staging.md). N’appliquer une réparation
  qu’après revue du diagnostic ; conserver l’identifiant de sauvegarde pour un
  rollback.
- Les logs d’un service se consultent dans son projet isolé. Sur le VPS partagé,
  n’utilise jamais `docker system prune` ni un nettoyage global : ils pourraient
  supprimer les images d’autres services.

Aucun workflow de déploiement ou de réparation n’est déclenché par les contrôles
locaux de ce dépôt.
