# Réparer le routage Engine staging

Le `POST https://staging.novlearn.fr/run` sans token renvoie actuellement,
selon le constat utilisateur, `307 Location: /accueil`. La réception attendue
est `401` avec `{"error":"unauthorized"}`, sans en-tête `Location`.

Le bootstrap réussi [41818738477](https://github.com/Novlearn/Novlearn-Engine/actions/runs/41818738477)
a reçu `STAGING_PORT=3151`. Le script de correction relit néanmoins le seul
`HOST_PORT` de `/opt/novlearn-engine/staging/.env` et exige sa correspondance
avec `docker port` du conteneur portant les labels du service `engine` et du
projet `novlearn-engine-staging`. Il n'affiche ni ne source les secrets du
fichier. Il vérifie le refus 401 du service local avant de changer Apache.

## Exécution après revue et intégration de la PR

Dans le seul dépôt `Novlearn/Novlearn-Engine`, Actions → **Repair Engine staging
Apache route** (`repair-staging-apache.yml`) → Run workflow, branche `main` :

1. Choisir `mode=inspect`, laisser `backup` vide. Cette étape identifie par
   `apachectl -S` le vhost HTTPS actif, son fichier réel et le port du conteneur.
   Elle affiche les règles staging avec masquage des valeurs sensibles,
   l'empreinte et les directives des includes et les modules manquants, puis
   sonde Engine sans token et avec un calcul authentifié local. Elle ne modifie
   pas la configuration et ne recharge pas Apache.
   Un dossier temporaire de transfert et un verrou staging sont utilisés.
   `INSPECT_COMPLETE=true` indique seulement que le diagnostic est terminé.
   Avant apply, exiger `LOCAL_UNAUTHENTICATED=PASS`,
   `LOCAL_AUTHENTICATED=PASS`, `STAGING_MISSING_MODULES=[]` et
   `STAGING_CANDIDATE_PREPARED=true`. Le contrôle public peut encore échouer
   tant que la route n'est pas corrigée. Le diagnostic reste disponible si
   le candidat est refusé ; lire le motif plutôt que relancer à l'identique.
2. Après revue de ces constats, choisir `mode=apply`, `backup` vide. Le workflow
   requiert les trois secrets VPS existants et l'accès `sudo -n` déjà utilisé.
   Il ne déploie ni image ni application. Conserver l'identifiant
   `STAGING_APACHE_BACKUP` imprimé dans les logs.
3. Vérifier le contrôle public depuis le runner GitHub. La requête ne suit
   aucune redirection et n'utilise aucun token. Contrôle manuel équivalent :

   ```powershell
   curl.exe -i --max-time 15 -X POST "https://staging.novlearn.fr/run" -H "Content-Type: application/json" --data "{}"
   ```

4. Depuis l'Admin déjà déployé sur Vercel, relancer son action existante de
   qualification Engine, puis validation de définition, génération de
   prévisualisation et tests de correction. Exiger une qualification réussie,
   l'identité de l'archive attendue et les réponses réelles. Le seul 401 public
   ne prouve pas cette qualification. Le token reste une variable serveur
   Vercel ; ne pas l'envoyer au navigateur ou dans les logs.

Ce workflow est exclusivement manuel et limité à `main` et à l'environnement
`staging`. Aucun workflow VPS n'est déclenché par la préparation de la PR.
La CI de PR teste le patch et son rollback, ainsi que le routage avec un Apache
sur un runner jetable ; cela ne vaut pas réception VPS ou Admin.

## Modification précise et préservation

Le script sélectionne un unique vhost `ServerName staging.novlearn.fr`, SSL
actif sur 443, dont le fichier résolu est dans `sites-available`. Le fichier
et le numéro de ligne fournis par `apachectl -S` identifient le bloc ; TLS peut
être hérité et le ServerName peut être quoted ou porter un schéma/port. Les
autres noms/alias et un `SSLEngine off` explicite sont refusés. Les logs
`STAGING_HTTPS_VHOST_LINE` et `STAGING_VHOSTS` ne contiennent que la structure,
sans directive privée ni chemin de clé. Le script conserve
les octets des autres vhosts, même s'ils sont dans le même fichier. Aucun
fichier `.env`, conteneur, image, certificat ou routage de production n'est
modifié. Le rechargement gracieux concerne le processus Apache partagé.

Il insère une règle proxy exacte `^/run$` et une règle Rewrite `[P,END]` avant
le routage général Novlearn. Les règles Rewrite existantes reçoivent une
condition excluant exactement `/run`; les directives Redirect/RedirectMatch
sont conservées dans un `<If>` qui exclut cette même URI. Cela évite la
priorité des Redirect de mod_alias sur les ProxyPass. `/run/`, `/runner`,
`/healthz` et les autres chemins gardent leurs règles antérieures.

Les configurations ambiguës (vhost partagé avec un autre domaine, doublon,
blocs déséquilibrés, héritage ou includes inconnus) sont refusées avant
écriture. Les blocs imbriqués (`IfModule`, `Location`, `Directory`, `If`, etc.)
et les directives continuées sont conservés. Les Redirect/RewriteRule y sont
exclus de `/run` à chaque profondeur ; les proxys antérieurs restent après
la réservation exacte Engine. L'include Certbot standard
est conservé sans imposer un préfixe SSL à toutes ses directives. Les blocs
et LogFormat y sont valides. Du routage dans cet include partagé est signalé
pour revue, sans modification du fichier. Si `inspect` refuse, conserver son diagnostic et préparer
une adaptation revue à la configuration observée. Aucun vhost de remplacement
n'est généré à l'aveugle et aucun module Apache n'est activé automatiquement.

## Sauvegarde et retour arrière

Avant chaque changement, le fichier intégral et un manifeste d'empreintes
sont conservés sous `/var/backups/novlearn-engine-apache-staging/<ID>/`, dossier 0700. Le remplacement atomique préserve propriétaire et permissions. Ensuite :
`apachectl configtest`, `systemctl reload apache2`, POST HTTPS via SNI local,
puis POST HTTPS via DNS public. Les deux sondes doivent obtenir exactement
401/unauthorized, sans Location, avec certificat et identité de l'archive
vérifiés. Un calcul authentifié public doit ensuite réussir avec HTTP 200,
le requestId attendu et `ok=true`. Le secret passe dans un en-tête en mémoire,
pas dans les arguments du processus, et aucune redirection n'est suivie.
Le comportement HTTP de `/` et `/accueil` doit rester identique au constat
avant modification. Ces contrôles ne remplacent pas les actions Admin.

Un échec de remplacement, configtest, reload ou de l'une de ces sondes restaure
le fichier original puis refait configtest et reload, tout en gardant le run
en échec. Un échec de restauration est explicite. La vérification supplémentaire
depuis le runner arrive après cette transaction ; si elle seule échoue, utiliser
le retour arrière manuel ci-dessous après diagnostic réseau.

Pour un retour ultérieur : même workflow, `mode=rollback`, `backup=<ID>` issu
des logs. Le manifeste doit correspondre au fichier et aux empreintes avant/après ;
si une autre intervention a modifié le vhost entre-temps, le rollback est refusé.
Le retour arrière ne dépend pas de la santé du conteneur Engine. Il sauvegarde
également l'état qu'il remplace, puis vérifie et recharge Apache. La restauration
réintroduit le routage antérieur, donc peut réintroduire le 307 initial.

Ne pas utiliser un workflow de release ou de promotion production pour cette
correction. Ne pas relancer le bootstrap VPS.

## Qualification et limites de la PR de diagnostic

La CI utilise un vrai Apache, un fichier Certbot représentatif contenant
LogFormat/IfModule, puis l'image publiée Engine 0.2.1 épinglée par digest.
Elle vérifie les appels authentifiés, refus de token/empreinte/Origin/type MIME,
les chemins voisins et la conservation du vhost production. Elle ne déploie
rien et n'utilise aucun secret VPS. Le token de test est temporaire.

Le fichier Certbot testé n'est pas une copie observée du VPS. Le certificat
public, le réseau réel et les actions de l'Admin sur Vercel restent à recevoir
dans ces environnements. L'appel serveur Vercel ne doit pas transférer l'en-tête
Origin du navigateur. L'URL du contrat est exactement `/run` ; une query string
ou `/run/` ne constitue pas cette route dans le host publié.
