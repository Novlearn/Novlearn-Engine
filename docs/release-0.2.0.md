# Distribution et exécution de la version 0.2.0

Cette version réunit les corrections du catalogue, des textes et des courbes de
0.1.8 avec l'API `sampleDisplayGraph` du chantier 0.2.0. Le schéma reste 5 et le
pipeline de rejeu reste 0.1.0. Les archives historiques restent inchangées.

Le cœur ne dépend d'aucune base, clé Supabase, variable d'environnement ou
framework. Le sous-chemin Node `novlearn-exercise-engine/remote-host` transporte
les requêtes d'un backend vers le host officiel ; il ne calcule rien lui-même.
Le serveur HTTP fourni dans `deploy/` est un adaptateur d'exploitation distinct
du cœur. Seul cet adaptateur reçoit un token de transport, jamais une clé DB.

## Host sur le VPS existant

L'image utilise Node 24.19.0 et les archives locales verrouillées. Aucun accès
registre n'est nécessaire pendant le build. Le conteneur est en lecture seule,
sans capabilities, sans nouvelle élévation de privilèges, dans un réseau Docker
interne dédié. Son port est publié uniquement sur la boucle locale du VPS.
Les limites sont 384 Mio mémoire et mémoire+swap, 64 pids ; le host officiel
impose 128 Mio de heap, cinq secondes file comprise, un calcul actif et quatre
en attente. Chaque processus de calcul reçoit un environnement nettoyé, sans
token HTTP ni identifiants de base. Les contrôles Linux restent obligatoires.

Le dossier `deploy/vendor/` contient les dépendances exactes et le package ;
`releases/0.2.0/` contient l'archive publique aux consommateurs et son manifeste.

```sh
npm ci --ignore-scripts
python3 tools/verify-release-archive.py releases/0.2.0
node deploy/prepare-image.mjs
cp deploy/engine.env.example deploy/staging.env
# Remplacer le token et conserver ENGINE_BIND_PORT=3151.
docker compose --env-file deploy/staging.env -p novlearn-engine-staging -f deploy/compose.yaml up -d --build
```

Préparer un second fichier privé pour la production, un token différent et
`ENGINE_BIND_PORT=3152`, avec le projet Compose `novlearn-engine-production`.
Les deux processus sont séparés ; l'archive peut être identique.
Ne jamais versionner ces fichiers privés ni leurs tokens.

Le service refuse les requêtes portant un en-tête navigateur `Origin`, les
tokens incorrects et les empreintes d'archive différentes. Les entrées et sorties
sont bornées, les redirections interdites et les messages d'erreur génériques.
La déconnexion de l'appelant annule le travail officiel. Aucun payload n'est
enregistré dans les logs du superviseur.

## Intégration des applications

Chaque application conserve son archive dans `vendor/`, son manifeste et son
lockfile. Installer via `npm ci`. Ne pas dépendre d'un dossier Engine voisin.

```ts
import { createRemoteHost } from 'novlearn-exercise-engine/remote-host';
const host = createRemoteHost({
  url: process.env.ENGINE_URL!,
  token: process.env.ENGINE_TOKEN!,
  archiveSha256: 'empreinte du manifeste installé',
});
```

Sur le VPS : `ENGINE_URL=http://127.0.0.1:3151/run` en staging et port 3152 en
production. Pour Admin sur Vercel, exposer uniquement le service staging à travers
Apache avec TLS, par exemple `https://staging.novlearn.fr/run` ; déclarer
cette URL et le token staging dans les variables serveur Vercel. L'URL et le
token n'ont jamais de préfixe `NEXT_PUBLIC_`. Le proxy Apache doit être réellement appliqué avant activation ; la préparation
des fichiers ne vaut pas déploiement.

L'Admin, même déployé dans l'environnement Vercel « Production », continue
d'utiliser la base Supabase **staging** et le host Engine **staging**. La
production élèves utilise sa base et son host séparés. Le moteur ne choisit
aucune base et ne donne aucune autorisation de publication de contenu.

Le transport vérifie l'empreinte de l'archive avant d'accepter un résultat.
La montée de version ne réécrit aucun reçu ni tentative historique. Les bases
doivent enregistrer la nouvelle identité avant la création de nouveaux reçus ;
les propositions de rotation et leur rollback sont à revoir par environnement.

## Qualification

Les résultats exécutés pour cette livraison sont consignés dans le rapport
de vérification. Une compilation ou une fixture HTTP ne certifie pas le profil
du VPS. Vérifier le vrai conteneur installé, sa santé authentifiée, les quotas,
l'arrêt des workers et les parcours applicatifs avant activation hébergée.
