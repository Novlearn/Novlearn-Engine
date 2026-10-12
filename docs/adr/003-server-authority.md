# ADR 003 — Autorité serveur et instance privée

> Statut documentaire : **Active** (revue du 12 octobre 2026). La décision reste applicable avec les extensions ultérieures. Les mentions de lots futurs, de nombres d’exports et de validation décrivent la date de chaque section ; [l’architecture](../architecture.md) et [les capacités](../features.md) décrivent l’état actuel.

Statut : retenu, 10 octobre 2026.

Contexte : le navigateur et le package portable sont accessibles aux élèves ; une seed peut permettre de recomposer les solutions.

Décision : serveur retrouve définition/révision, paramètres et politique officiels. Instance privée distincte de projection publique construite par allowlist. Ne pas accepter verdict, seed ou politique transmis par client comme autorité.

Conséquences : snapshots ou définitions immuables nécessaires au rejeu, IDs opaques et contrôle d'accès applicatif. Isolation des calculs obligatoire avant usage officiel ; CLI/pool/service restent à comparer, sans ADR transport prématuré.
