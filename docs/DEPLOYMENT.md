# Déploiement du host Engine

## Architecture livrée

Le package Engine reste une bibliothèque privée aux applications. Le binaire
`novlearn-engine-server` ajoute un adaptateur HTTP interne autour du host isolé ;
il n'ajoute aucune dépendance applicative. Il expose :

| Route          | Accès                                       | Rôle                                                                                   |
| -------------- | ------------------------------------------- | -------------------------------------------------------------------------------------- |
| `GET /healthz` | VPS local / contrôle de santé Docker        | État minimal, avec une opération de démarrage réellement exécutée dans le worker isolé |
| `POST /run`    | `Authorization: Bearer <token>` obligatoire | Requête JSON du protocole Engine version 1, limite d'entrée 1 MiB                      |

Les tokens staging et production sont différents et ne doivent rester que dans
les backends NovLearn/Admin et les fichiers `.env` root-only sur le VPS. La route
de calcul est réservée aux backends serveur ; ne l'appelle jamais depuis un
navigateur. Chaque appel `/run` doit fournir le SHA-256 de l'archive Engine dans
`x-engine-archive-sha256`; le host refuse un client épinglé sur une archive
différente et renvoie l'identité qu'il exécute. TLS est terminé par Apache.
L'adaptateur limite connexions, délais, taille d'entrée et délègue la file et les
limites de calcul à `createNodeHost`.

Compose lance deux projets distincts, publie leurs ports hôtes sur `127.0.0.1`
uniquement, désactive le swap du conteneur et applique 384 MiB, 64 processus,
utilisateur non-root, système de fichiers en lecture seule et redémarrage
automatique. Le host exige un cgroup v2 ; le bootstrap refuse un VPS ou un daemon
Docker qui ne l'expose pas. Le conteneur réalise une opération de calcul au
démarrage et reste non sain tant qu'elle n'a pas réussi.

## Premier démarrage — Alexandre, administrateur VPS

Le workflow manuel **Initialize Engine VPS** peut d'abord vérifier l'accès sans
changer la configuration du VPS, puis copier et exécuter le bootstrap décrit
ci-dessous. Il utilise les secrets de dépôt existants `VPS_HOST`, `VPS_USERNAME`
et `VPS_SSH_KEY`; il n'exige aucun secret supplémentaire. Il ne publie aucune
image, ne démarre pas de conteneur et ne modifie pas Apache.

Dans GitHub → dépôt Engine → **Actions** → **Initialize Engine VPS** →
**Run workflow**, sélectionne `main` et choisis :

- `preflight` pour vérifier la connexion SSH, `sudo` sans interaction, Docker,
  Compose, cgroup v2, les outils requis, les ports et les éventuels fichiers
  Engine existants. Cette vérification ne change pas les fichiers ni les services
  du VPS (les accès SSH peuvent toutefois être journalisés par le serveur).
- `initialize` pour copier les trois fichiers de bootstrap vers un dossier
  temporaire privé et lancer `deploy/bootstrap-vps.sh`. Les ports par défaut
  sont `3151` (staging) et `3152` (production); garde-les cohérents avec le
  routage NovLearn. Pour ce choix, saisis exactement
  `INITIALIZE NOVLEARN ENGINE ON VPS` dans le champ de confirmation. Cette
  action écrit des fichiers sous `/opt`, `/etc` et `/usr/local`, ainsi qu'une
  règle `sudoers` pour un compte non-root, mais ne démarre toujours aucun conteneur et ne touche pas
  Apache.

Le workflow doit être lancé depuis `main`. Le compte associé à `VPS_USERNAME`
doit déjà exister sur le VPS et pouvoir exécuter `sudo -n`; une clé SSH seule ne
donne pas les droits administrateur. Si le préflight échoue sur ce point,
l'administrateur du VPS doit installer le bootstrap manuellement ou accorder les
droits nécessaires avant de réessayer. Le workflow ne peut ni demander un mot de
passe interactif, ni obtenir les secrets masqués depuis un autre dépôt.

Le compte `root` existant est accepté : les workflows qui utilisent sa clé
conservent alors tous les droits sur le VPS. Le bootstrap n'ajoute pas de règle
sudo pour root. Pour passer ensuite à un compte dédié, Alexandre doit créer le
compte et autoriser sa clé SSH, puis installer la règle limitée au wrapper
`/usr/local/sbin/novlearn-engine-deploy` (ou relancer le bootstrap avec ce compte
et les droits administrateur nécessaires). Remplacer ensuite `VPS_USERNAME` et
`VPS_SSH_KEY`, vérifier l'accès, puis retirer l'ancienne clé root si elle n'est
plus utilisée par les autres déploiements.

La procédure manuelle ci-dessous reste disponible si Alexandre préfère exécuter
le bootstrap depuis une copie du dépôt Engine sur le VPS. Elle ne touche pas à
Apache et ne démarre pas de conteneur.

1. Installer Docker Engine et le plugin Docker Compose, puis vérifier que le VPS
   utilise cgroup v2. Le bootstrap vérifiera Docker, Compose, curl, OpenSSL,
   `ss`, `flock`, `visudo` et les utilitaires Linux employés par ses scripts.
2. Choisir deux ports libres supérieurs ou égaux à 1024. Vérifier avec
   `sudo ss -ltnp`. Le premier sert au vhost staging, le second au vhost prod.
3. Réutiliser le compte SSH et la clé déjà utilisés par les déploiements NovLearn.
   Alexandre doit vérifier que la clé publique correspondante est déjà dans
   `~/.ssh/authorized_keys` de ce compte. Aucune clé ni aucun compte SSH Engine
   supplémentaire n'est créé.

4. Lancer le bootstrap en remplaçant l'organisation, le nom de compte et les ports
   retenues :

   ```sh
   sudo bash deploy/bootstrap-vps.sh \
     --gh-owner novlearn \
     --staging-port PORT_STAGING \
     --production-port PORT_PRODUCTION \
     --ssh-user NOM_UTILISATEUR_VPS
   ```

   Le script refuse les ports occupés, le cgroup v1, les fichiers de
   configuration existants différents et les ports identiques. Il crée
   `/opt/novlearn-engine/{staging,production}`, deux tokens aléatoires séparés,
   le wrapper root-owned et, pour un compte non-root, une règle sudo limitée à ce
   wrapper. Le nom passé à `--ssh-user` doit être exactement la valeur du
   secret GitHub `VPS_USERNAME`. Le bootstrap ne modifie pas `authorized_keys`
   et n'ajoute pas l'utilisateur au groupe Docker. Il est réexécutable sans
   remplacer les tokens ou configurations déjà créés.

5. Récupérer chaque token séparément par un canal sécurisé pour le placer comme
   secret serveur dans les backends qui appelleront Engine :

   ```sh
   sudo awk -F= '$1 == "ENGINE_API_TOKEN" {print $2}' /opt/novlearn-engine/staging/.env
   sudo awk -F= '$1 == "ENGINE_API_TOKEN" {print $2}' /opt/novlearn-engine/production/.env
   ```

   Ne pas envoyer ces valeurs au navigateur, ni les mettre dans GitHub, un ticket
   ou un fichier du dépôt. Le bootstrap ne les affiche pas.

6. Conserver le routage Apache Novlearn existant : staging publie uniquement
   `/run` vers `127.0.0.1:3151/run`. Les applications du VPS appellent
   directement `127.0.0.1:3152/run` en production ; ne pas ajouter de proxy
   public `/run` pour la production ni de proxy catch-all Engine. Le bootstrap
   ne modifie pas Apache. Vérifier la santé en local sur le port de staging ou
   production avec `GET /healthz`.

7. Les images GHCR sont lues par un `GITHUB_TOKEN` temporaire, transmis par SSH
   pour un seul déploiement, conservé dans un répertoire privé sous `/run` pendant
   le pull, puis effacé. Aucun PAT ou credential Docker persistant n'est conservé
   sur le VPS.

## Configuration GitHub

### Récupérer le token staging sans accès SSH local

Le workflow manuel **Read staging Engine token (encrypted)** utilise les mêmes
trois secrets VPS. Il fonctionne sur `main`, lit uniquement le token staging
existant et ne démarre aucun service. Le compte SSH doit pouvoir lire le fichier
avec `sudo -n`. Il n'accorde aucun droit supplémentaire.

Générer une paire RSA 3072 bits localement et garder sa clé privée hors Git.
Passer le PEM de la clé publique encodé en base64 à l'entrée
`public_key_base64`. Le VPS chiffre le token avec RSA-OAEP/SHA-256 ; les logs
contiennent seulement `ENCRYPTED_ENGINE_TOKEN=<base64>`. Déchiffrer cette valeur
sur l'ordinateur détenteur de la clé privée, puis copier le token dans les
secrets serveur de NovLearn staging et de l'Admin appelant ce host staging.
Ne pas publier la clé privée ni la valeur déchiffrée dans les logs ou le dépôt.
Le workflow ne permet pas de récupérer le token production et ne renouvelle pas
le token staging. Les fichiers temporaires de clé publique du VPS sont supprimés.

### Accès et environnements

Créer deux **Environments** dans `Settings → Environments` : `staging` et
`production`. Ajouter au dépôt Engine les secrets existants `VPS_HOST`,
`VPS_USERNAME` et `VPS_SSH_KEY`, avec les mêmes valeurs que dans le dépôt
Novlearn. Les secrets d'un dépôt ne sont pas partagés automatiquement avec un
autre dépôt.

- `staging` : autoriser les tags de release `v*`.
- `production` : autoriser `main`, définir au moins un required reviewer et
  activer l'interdiction d'approuver son propre déploiement si disponible.
- Le port SSH reste 22. Le workflow utilise `appleboy/ssh-action` avec ces
  secrets, comme le workflow Novlearn ; aucune variable `VPS_KNOWN_HOSTS` n'est
  requise.
- `GITHUB_TOKEN` est généré par Actions avec `packages: write` pour publier et
  `packages: read` pour installer. Il n'est pas à créer manuellement. Pour un
  package déjà existant, vérifier ses paramètres **Manage Actions access** afin
  que le dépôt Engine puisse publier et lire l'image.
- Le workflow SSH ne vérifie pas une empreinte fixe de clé d'hôte, comme le
  workflow Novlearn actuel. Cela simplifie la configuration, mais ne protège pas
  contre une interception ou un faux serveur SSH. L'action tierce est épinglée à
  une révision fixe.

La même identité SSH existante permet aux workflows d'atteindre les deux
environnements. Le VPS conserve l'isolation des conteneurs, ports loopback,
tokens API et répertoires staging/production. En revanche, une compromission de
cette clé peut appeler le wrapper pour staging **ou production** (et garde aussi
les droits préexistants du compte SSH). L'approbation GitHub production réduit
les déclenchements accidentels, mais ne crée pas une séparation de privilèges au
niveau SSH. Une identité distincte par environnement serait nécessaire pour
cette séparation stricte.

Les workflows appliquent les permissions minimales, n'exposent aucun secret aux
pull requests et n'utilisent pas de runner self-hosted.

## Publier et déployer

1. Sur `main`, mettre à jour `package.json` et son lock si nécessaire, puis
   valider la version SemVer.
2. Créer et pousser un tag correspondant exactement à la version du package :

   ```sh
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

3. `release.yml` vérifie que le tag pointe sur un commit de `main`, installe
   Node 24.19.0/npm 11.17.0, exécute check/pack/smoke, calcule le SHA-256 de
   l'archive npm et l'intègre au host. La release publie ce SHA dans
   `engine-artifact-sha256.txt` avec l'image GHCR immuable. Elle déploie ensuite
   **ce digest** en staging et attend `/healthz`.
4. Dans Actions, lancer `Promote or roll back Engine production` avec la version
   `vX.Y.Z` et `promote`. Le workflow exige un déploiement staging réussi pour
   cette version, résout le digest publié, puis attend l'approbation de
   l'Environment `production` avant de déployer exactement la même image.
   Mettre à jour les consommateurs Novlearn/Admin avec le SHA-256
   `engine-artifact-sha256.txt` attaché à la release avant de leur permettre
   d'appeler cette image ; les anciens clients épinglés à une autre archive
   seront refusés par `/run`.
5. Pour revenir à une ancienne version, lancer le même workflow avec cette
   version publiée et `rollback`. Un échec de santé restaure automatiquement
   l'image précédente saine, quand elle existe. Le premier déploiement échoué
   s'arrête sans laisser tourner une instance invalide.

Aucun de ces workflows n'a été déclenché pendant cette modification. Les tags
`latest` ne sélectionnent jamais une version de déploiement.

## Diagnostic et nettoyage

Sur le VPS, consulter les logs par environnement sans afficher les tokens :

```sh
sudo docker compose --project-name novlearn-engine-staging \
  --env-file /opt/novlearn-engine/staging/.env \
  -f /opt/novlearn-engine/compose.yml logs --tail=100 engine
sudo docker compose --project-name novlearn-engine-production \
  --env-file /opt/novlearn-engine/production/.env \
  -f /opt/novlearn-engine/compose.yml ps
```

Le driver Docker conserve au plus trois fichiers de logs de 10 MiB par
conteneur. Pour libérer de l'espace, inspecter d'abord les images Engine :

```sh
sudo docker image ls ghcr.io/NOVLEARN_ORG/novlearn-engine-host
```

Supprimer seulement un ID d'image Engine non utilisé, après vérification. Ne pas
exécuter `docker system prune` ou un prune global sur ce VPS partagé : cela
pourrait toucher les autres applications.

## Contrôles locaux de cette livraison

`npm.cmd ci`, le check complet (1 579 tests / 33 fichiers),
`npm.cmd pack --dry-run`, le smoke du package (host Windows natif et navigateur),
Prettier et `docker compose config --quiet` avec variables factices passent.
Docker Desktop n'a pas accordé l'accès au daemon, et l'environnement a refusé
l'exécution de Bash. L'image, les scripts Linux sur VPS, les workflows distants,
SSH et le rollback réel restent à valider dans leurs environnements respectifs.
