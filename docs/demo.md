# Démonstration verticale M11

Le banc local `examples/e2e` relie réellement MathLive 0.111.1, HTTP FastAPI,
le pont Python et la CLI privée Node. Le serveur adapte les lignes originales
78 et 106 avec les recettes revues avant de constituer son registre privé.
Le navigateur ne fournit que l'identifiant d'exercice puis la question/réponse.
Une seed cryptographique et un identifiant opaque sont choisis par le backend.
La même projection et le même `gradeAnswer` servent pratique et manche de duel.

## Exécution locale

Prérequis : Node24.19.x/npm11.17.x, Docker Desktop Linuxx86_64/cgroupv2,
Python3.11 dans l'image officielle figée par digest dans `examples/e2e/run.ps1`.
Installer les dépendances du dépôt et du banc MathLive (`npm.cmd ci` à la racine,
puis dans `tools/mathlive`). Construire avec `npm.cmd run build`.
Le cache `.cache/linux-python` doit contenir les dépendances Linux de
`examples/e2e/requirements.lock` ; installation dans un conteneur jetable,
jamais avec les extensions Windows pydantic-core. Uvicorn0.32.0 est le serveur
de socket du banc, séparé du package moteur ; Click8.5.0 a été observé et figé.
L'image Node n'a pas pip : utiliser le zipapp pip officiel ou un builder Python
officiel pour installer ce cache. Aucun lanceur Windows bloqué n'est contourné.

```powershell
./examples/e2e/run.ps1 start -Faults
# Ouvrir http://127.0.0.1:4318/
./examples/e2e/run.ps1 test
./examples/e2e/run.ps1 stop
```

Le conteneur est jetable, non root, lecture seule hors répertoire d'observations,
sans capabilities, quota384MiB/swap0/pids64. Le quota est partagé par Python,
superviseur et workers ; ce n'est pas une garantie de survie API sous OOM.
Les tests sans navigateur n'ont pas de réseau. Le banc HTTP utilise le bridge
Docker pour joindre uniquement le port publié sur127.0.0.1 ; il ne télécharge
aucun asset externe. Seuls les assets du banc et MathLive sont servis en statique,
jamais le dépôt, les recettes, snapshots, rapports ou fichiers d'audit.

## Parcours effectivement observé

`tests/e2e/fixtures/browser-observations.json` conserve13 observations réelles
et `browser-resume-duel.json` en conserve4 après rechargement. Navigateur Brave
Chromium155 sous Windows ; moteur et API sous Linux. Ce sont des preuves locales,
aucune suite navigateur distante ni adoption de production annoncée.

1. Créer78 : u0=5 et k=12 dans ce tirage officiel. Les trois questions commencent
   « Non répondu ». Taper1,25 au clavier : `1{,}25` transmis intact, incorrect.
2. Charger par API MathLive `\frac{\placeholder{}}{2}` : invalide, code incomplete,
   même si getPrompts() renvoie[]. Charger `\ln(2)` : indéterminé, jamais faux.
3. Coller réellement `$$\sqrt{12}$$` : MathLive transmet `\sqrt{12}`, correct.
   Les captures distinguent clavier, collage et chargement API ; le texte collé
   et les événements clavier sont enregistrés.
4. Inverser les options du deuxième QCM, sélectionner `$u_0$` : ID1, correct.
   Reprendre : deux réponses retrouvées, troisième question encore non répondue.
   L'ordre inversé a été vérifié par l'interaction navigateur ; cette première
   capture JSON ne conserve pas l'ordre DOM. Le banc ajoute désormais optionOrder
   aux captures QCM et fige les sources/événements avant l'attente HTTP.
5. Troisième question : ID1 incorrect, puis ID2 correct. Toutes les questions
   de cet exercice historique adapté sont alors corrigées.
6. Avec `-Faults`, la huitième correction ouvre une vraie CLI froide dont le
   transport expire à100ms : HTTP504. La neuvième lance une fixture privée qui
   termine réellement son processus : HTTP503/protocol-error. La dixième revient
   au moteur officiel : correct. Aucun champ HTTP ne choisit ces pannes ni une
   commande. Ce timeout froid ne prétend pas prouver une interruption CPU :
   cette preuve native est fournie par M8/M9. Les pannes n'écrivent pas de tentative.
7. Ajouter policy/seed/verdict/score au corps : HTTP422 générique, aucun écho du
   snapshot ni autorité client. Recharger la page puis reprendre par ID opaque :
   les trois réponses et corrections serveur sont restaurées.
8. Créer deux manches successives, soumettre à la précédente : HTTP410 expired-round.

Le banc présente les énoncés comme texte brut sûr et les champs de réponse en
MathLive ; il ne livre pas le renderer définitif. La petite fixture de duel
autorise Alice/Bob, conserve leur progression séparément et n'implémente ni
matchmaking, classement ni calcul de points. Authentification de démonstration,
stockage en mémoire et durée600s doivent être remplacés dans l'application.
Tentatives limitées à64 par instance ; erreur technique différente d'incorrect.

## Rejeu et limites

`private-replay.json` est une fixture **privée de test**, exclue du package et
des routes HTTP. Elle conserve définition, seed, snapshot et tentatives pour
reproduire les projections et corrections observées. `tests/e2e/vertical.test.ts`
rejoue les sources MathLive sans les nettoyer ; compare chaque verdict et
réinstancie les snapshots depuis leur seed. Les données publiques sont vérifiées
par clés, y compris lors de la reprise, sans confondre un ID legacy-option avec
une fuite de provenance.

Les tests Python utilisent le vrai moteur isolé : propriété/TTL, bornes,
soumissions falsifiées/non finies/profondes, reprise partielle et rejeu complet.
Ils changent la manche pendant une correction réellement exécutée et vérifient
le refus après await sans enregistrer la tentative. L'expiration est revérifiée
après projection et correction. Aucun stockage DB ou dépôt voisin modifié.
La capture [navigateur](../tests/e2e/fixtures/browser-proof.jpg) montre la reprise.

À intégrer : identité/droits/persistance/points côté backend, validation et
projection communes, transport privé borné, envoi de latex-expanded brut et IDs
QCM côté frontend. Une évolution du moteur exige rejeu des snapshots/fixtures
avec artefact et version figés avant activation ; aucune preuve de compatibilité
automatique entre versions différentes n'est fournie par ce banc.
