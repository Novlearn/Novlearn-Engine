# Import progressif et rollback

M10 convertit les huit documents reçus vers des définitions canoniques locales.
Il ne déploie pas le moteur et ne migre aucune base distante. Chaque rapport dans
tests/fixtures/legacy/adapted contient original, chemins, décisions et vérification
officielle. Tous sont adaptables sous leurs recettes explicites ; cette qualification
ne couvre pas un catalogue inconnu ou une version historique non identifiée.

1. Sauvegarder les octets originaux avant toute écriture applicative ; stocker empreinte,
   origine réelle, format et date d'export effectivement connue. Ne pas utiliser created_at
   comme preuve de révision. Le corpus reçu et sa copie ont SHA256
   0f4d1173a78f9bd41e88678704c212c5147627e7e5a42ee28eb398f25f41c3ae.
2. Pour une source non fiable, appeler l'opération privée `adaptLegacyExercise`
   de l'hôte isolé avec `{source,sourceFormat,recipe}`. L'API ./legacy directe est
   adaptée aux imports offline revus. Garder tous les appels dans le backend privé.
   Sélectionner les politiques officielles et arbitrer les conflits avant publication.
   Évaluer le rapport et les mappings ; bloqué signifie conservation sans définition active.
   Les pertes fonctionnelles, champs privés et IDs synthétiques sont des décisions visibles.
3. Valider puis instancier avec seed et ID serveur, via l'hôte isolé pour une entrée non fiable.
   Conserver définition, snapshot officiel, engineVersion/generation.version et artefact.
   Publier uniquement `projectPublicInstance`. Corriger avec `gradeAnswer` sur le snapshot
   serveur, jamais sur les extensions, attendus ou politique reçus d'un client.
4. Conserver legacy et canonical côte à côte, avec un pointeur applicatif de version active
   séparé. Basculer un seul exercice après revue des tirages et correction. Les huit recettes
   ici changent volontairement certaines contraintes : ne pas prétendre à un replay legacy
   sans seed/versions. Aucun backfill ni bascule automatique de production dans cette mission.
5. Rollback : remettre le pointeur applicatif sur la version sauvegardée, garder les snapshots
   des tentatives déjà ouvertes et leur correcteur associé jusqu'à expiration. Ne pas convertir
   à rebours un snapshot natif en JSON legacy et ne pas écraser l'original. Une version engine
   incompatible exige ancien artefact pour replay ou expiration explicite, jamais regrade silencieux.

Formats sources acceptés : database-row-v1 (JSON imbriqués encodés), creator-publication-v1
(content objet, competences tableau) et creator-document-v1 (document plat). Pour un nouveau
document sans ID, fournir un ID canonique de recette. Les formes Creator sont fondées sur
lecture du code voisin ; leurs tests reconstruits ne sont pas des exports runtime capturés.

Générer les artefacts de conversion après build : `node tools/adapt-corpus.mjs`, puis formater
uniquement les dérivés. Relire les rapports de36/78/96/103 pour les arbitrages utilisateur ;
106 requiert log-affine-positive et power-of-e. Sources JS inconnues, type non supporté,
contraintes impossibles ou mathématiques hors profil restent des échecs explicites.
