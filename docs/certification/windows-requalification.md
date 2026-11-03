# Requalification Engine locale — 13–14 octobre 2026

**Certification Windows de l'artefact installé : bloquée.** La suite source
passe, mais le nouveau smoke natif du tarball échoue. Aucune politique Windows,
limite, règle mathématique ou donnée distante n'est modifiée.

## Correctifs et preuves

L'autorisation explicite de l'utilisateur couvre les corrections locales et
la certification Engine, avec critères inchangés. Le launcher conserve son
code de sortie 70 et ajoute le code natif Windows ou le nom du type d'exception
à son diagnostic stderr. Les chemins et messages d'exception ne sont pas exposés.
Un test d'exécutable absent exige le diagnostic natif 2.

Le smoke du tarball vérifie désormais un vrai parsing depuis le package installé
sous Windows, la source conservée, le quota de 384 MiB et l'arrêt du worker.
Il ne se limite plus à importer 'node-host'. L'échec reste bloquant.

| Contrôle                                           | Résultat                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Suite instrumentée, diagnostic préalable           | 1 533 PASS / 29 fichiers, 373,63 s                                                         |
| 'npm.cmd run check' standard, sans instrumentation | **1 534 PASS / 29 fichiers**, aucun skip, 377,21 s ; build/types/lint/format PASS          |
| Lint après renforcement du smoke                   | PASS                                                                                       |
| 'npm.cmd pack --dry-run'                           | PASS, 157 fichiers                                                                         |
| 'npm.cmd run smoke:package' renforcé               | **FAIL**, package installé : 'unavailable' ; arrêt avant les étapes types/bundle suivantes |
| Python/FastAPI, banc officiel Docker local         | **13 PASS**, 65,060 s                                                                      |
| 'tools/check-linux.mjs', cgroup v2 borné           | **12 PASS**, mémoire 402 653 184 octets, swap 0, pids 64                                   |
| 'tools/check-legacy-host.mjs'                      | **8 parcours PASS**, recette invalide refusée                                              |

La suite standard précède l'ajout du smoke renforcé ; le runtime et les tests
natifs restent identiques. Les bancs Linux utilisent des conteneurs neufs sans
réseau, sans privilèges ajoutés et avec sources en lecture seule. Le contrôle
de pression mémoire atteint réellement la limite du cgroup, puis la reprise
réussit. Les tests Python ne remplacent pas les douze preuves OS.

## Refus Windows confirmé

Le launcher source et celui installé ont la même empreinte :

'76c85858b1d09686515ad805bfe7895721033858ba8f925deb75e247e52d1695'.

Le launcher installé est 'NotSigned'. Node échoue avec 'spawnError: UNKNOWN'.
PowerShell confirme qu'une stratégie de contrôle d'applications bloque le fichier.
Code Integrity **3077**, le **14 octobre à 00:00:24 Europe/Paris**, identifie
exactement le launcher installé, la politique 'VerifiedAndReputableDesktop'
et le statut '0xc0e90002'. Des événements 3077 concernent également le launcher
source pendant les 25 échecs reproduits à 23:40–23:41. Ces preuves expliquent
ces refus ; elles n'établissent pas seules la cause des anciens timeouts de 10 s.

Microsoft documente [l'événement 3077](https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/operations/event-id-explanations)
et [les signatures reconnues par Smart App Control](https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/code-signing-for-smart-app-control).
La protection n'est ni désactivée ni contournée. Un check source vert ne vaut
pas qualification du launcher distribué sous cette politique.

Tarball testé : '14fb7028875ebceae9ab1bcdfece97521b792f0fcbfea3e072207865fea3b762'.
Les [preuves machine](windows-requalification.json) conservent les empreintes,
les résultats et leurs périmètres. Le [rapport initial](report.md) reste historique.
CDC, corpus et dépendances sont conservés ; aucune CI distante ou nouvelle
session navigateur MathLive n'est annoncée.

## Suite nécessaire

Retenir le runtime de livraison : tarball et hébergement Linux sous cgroup v2
borné, ou launcher Windows signé avec un certificat reconnu, puis réussir le
smoke natif exact sans assouplissement. Les contrôles Linux positifs ne valent
pas adoption applicative ni certification Windows. L'utilisateur est interrogé
sur cette cible ; aucune activation ou publication n'est engagée.
