# ADR 014 — Hôte Node isolé M8

> Statut documentaire : **Active** (revue du 12 octobre 2026). La décision reste applicable avec les extensions ultérieures. Les mentions de lots futurs, de nombres d’exports et de validation décrivent la date de chaque section ; [l’architecture](../architecture.md) et [les capacités](../features.md) décrivent l’état actuel.

## Décision et frontière

CDC10.1/12.3 : sous-chemin optionnel `novlearn-exercise-engine/node-host`, séparé
des sept exports du cœur portable. `createNodeHost()` lance un processus Node neuf
par requête, limite concurrence/file, puis attend sa fermeture complète avant de
libérer un slot. Aucun serveur HTTP, moteur mathématique supplémentaire ou calcul
via Worker partagé. @types/node 24.19.2 est une dépendance de développement ;
la seule dépendance mathématique runtime reste CortexJS 0.151.0.

Le lanceur Windows est du C# fixe, compilé avec le compilateur .NET Framework64
du système pendant `build`, copié avec sa source dans dist/node-host/windows.
La première expérience PowerShell `-File` a été refusée par la politique locale.
La solution compilée ne modifie aucune politique d'exécution. Aucun code ou chemin
d'exécutable fourni par un exercice n'est accepté. Aucun téléchargement natif.

Profil hôte validé : **Windows 10+/x64, Node 24.19.x, .NET Framework 4.x**.
Le cœur reste portable. Sur un OS/architecture sans lanceur mémoire OS validé,
`run()` renvoie `unavailable` ; aucun repli vers un processus non borné. Linux et
les contraintes du déploiement applicatif ne sont pas certifiés par les essais
locaux Windows. M9 doit documenter le transport Python/FastAPI et ses mesures ;
une intégration de production reste distincte.

## Garanties de ressources

| Limite par défaut  | Valeur | Contrôle                                                                |
| ------------------ | ------ | ----------------------------------------------------------------------- |
| Entrée JSON UTF8   | 1MiB   | Avant JSON.parse, profondeur64/nœuds32768 et nombres finis              |
| Sortie stdout      | 2MiB   | Chaque chunk avant stockage/concaténation                               |
| stderr             | 64KiB  | Compteur sans conserver les messages privés                             |
| Deadline globale   | 5000ms | Horloge monotone, file/lancement/calcul/sortie ; résultat tardif refusé |
| Mémoire engagée OS | 384MiB | Job Object process/job commit, allocations natives incluses             |
| Heap V8 old space  | 128MiB | Défense complémentaire, distincte du quota OS                           |
| Concurrence/file   | 2/8    | Slots libérés après close, refus busy, IDs actifs uniques               |
| Octets en file     | 4MiB   | Indépendant du nombre de requêtes                                       |

Les bornes configurables sont validées et documentées par HostLimits : durée
50–60000ms, mémoire64–2048MiB, heap16–512MiB sans dépasser le quota OS,
concurrence1–4, file0–32 ; entrée≤1MiB/sortie≤4MiB/stderr≤64KiB/file≤8MiB.
La mémoire engagée n'est ni la mémoire virtuelle réservée ni le RSS. Le quota
concerne le worker mathématique ; le backend, le superviseur et le petit lanceur
fiables ont leur propre budget de déploiement. Le besoin maximal des workers
est concurrence × quota. Aucune promesse de quota global sur tout le backend.

Le Job est configuré avant création : PROCESS_MEMORY/JOB_MEMORY,
ACTIVE_PROCESS=1, KILL_ON_JOB_CLOSE, aucun breakaway. Le worker est assigné
**atomiquement** via JOB_LIST et créé suspendu pour imposer l'ordre des trames :
started écrit avant ResumeThread. Seuls stdin/out/err sont hérités, jamais le
handle du Job ou le pipe de vie du superviseur. Un watchdog natif indépendant
de la boucle Node arrête le lanceur à échéance, même si cette boucle bloque.
La fermeture du dernier handle Job tue le worker ; EOF du parent produit aussi
une terminaison. Toute erreur de configuration/lancement échoue explicitement.

Sources primaires : [Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects),
[limites commit](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_basic_limit_information),
[JOB_LIST/HANDLE_LIST](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-updateprocthreadattribute).
L'API [child_process Node24](https://nodejs.org/download/release/v24.19.0/docs/api/child_process.html)
sert uniquement à lancer le fichier fixe sans shell et à attendre close.

## Protocole privé versionné et API

```ts
import { createNodeHost } from 'novlearn-exercise-engine/node-host';
const host = createNodeHost({ maxConcurrent: 2 });
try {
  const result = await host.run(
    JSON.stringify({
      protocolVersion: 1,
      requestId: 'parse-1',
      operation: 'parseMathInput',
      payload: { source: '1+2', context: {}, profile: 'scalar-latex-v1' },
    }),
  );
  // result.ok décrit le transport ; result.value.ok décrit ici le parsing.
} finally {
  await host.close();
}
```

`run(json, {signal?})` exige une chaîne déjà encodée. Il n'exécute pas de getter
ou toJSON. Le superviseur parse après borne UTF8, vérifie schéma/version/ID et
complexité, puis réencode ce JSON inerte sur une ligne ; les sources mathématiques
dans les champs restent intactes. Worker mono-requête, opérations des sept exports
en whitelist, payload exact par opération. Validation/admissibilité mathématiques
restent celles du cœur. Pas de chemin worker, commande shell, source JS ou option
de chaos dans l'API publique. NODE_OPTIONS/NODE_PATH/secrets ne sont pas hérités.

Les opérations sont validateDefinition `{definition}`, validateSubmission
`{submission}`, parseMathInput `{source,context,profile}`, generateVariables
`{definition,seed}`, instantiateExercise `{definition,instanceId,seed}`,
projectPublicInstance `{official}` et gradeAnswer `{official,submission}`.
La seed de ce canal est uint32. `official` vient exclusivement du backend :
le schéma ne prouve pas sa provenance. **Ce protocole bas niveau ne doit pas être
exposé au navigateur.** M9/M11 choisissent les opérations/données depuis l'état
serveur et refusent une politique, un verdict, une seed ou un snapshot client.

Réponse worker `{protocolVersion,requestId,ok,value|error}` encadrée par deux
trames natives started/finished avec PID, quota et pic de mémoire engagée.
Le superviseur exige IDs/version/clés/nombre de trames/UTF8/newline exacts, fermeture
saine et délai respecté. Un succès écrit avant un calcul bloqué est refusé.
`HostResult.ok` ne signifie jamais « réponse mathématique correcte » : les cinq
états de CorrectionResult restent dans value. Timeout/crash/protocole/quotas,
annulation/fermeture et indisponibilité restent des erreurs runtime distinctes.
Un crash mémoire n'a pas toujours de cause fiable observable ; il reste crash,
sans inventer un diagnostic OOM à partir d'un texte stderr ou d'un code quelconque.

Metrics donnent elapsedMs, queuedMs et éventuellement workerPid/peakCommittedBytes.
PID absent avant démarrage, pic absent après interruption sans trame finale.
Close est idempotent, annule actifs et attente, puis attend leur cleanup.
Stats donne active/queued/queuedBytes/closed sans exposer sources ou attendus.

## Preuves et limites

tests/node-host.test.mjs utilise le vrai package et des fixtures de chaos privées.
Blocage synchrone infini après marqueur PID, réponse prématurée, pause de la boucle
parent, mort forcée du superviseur, absence des PIDs après cleanup, allocations
Buffer externes au heap refusées par l'OS, OOM heap/crash puis requête suivante
saine, stdout/stderr bornés, protocole corrompu/double/mauvais ID/newline absent,
concurrence/file/octets/deadline/annulation/close, refus de processus enfants,
environnement sans secrets, chemins avec espaces, JSON UTF8/infini/profondeur,
exceptions synchrones de spawn et contexte mathématique neuf. Les sept opérations
et rejeu de snapshot sont testés via canal privé, sans confiance navigateur.

Revue indépendante : course d'ordre started/réponse corrigée par suspension avec
Job atomique ; exception synchrone de spawn corrigée avec slot libéré et requête
suivante saine ; options héritées du prototype refusées via Object.hasOwn.
Ces fixtures ne sont jamais distribuées comme opérations publiques.
Les résultats complets/commandes sont dans [progress](../archive/progress.md).
Les métriques initiales ne sont pas un benchmark p50/p95/débit ; M9 reste requis.
Pas de CI distante, de runtime Linux ou de liaison production testés dans M8.
