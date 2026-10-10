# ADR 004 — Premier contrat natif de valeur rationnelle

**Archive de décisions expérimentales.** Depuis le 11 octobre 2026, les anciens contrats/options ne sont plus disponibles. [ADR 008](008-canonical-consolidation.md) les remplace ; profils mathématiques et preuves historiques conservés. [API actuelle](../architecture.md).

Statut : retenu pour le premier lot, 10 octobre 2026. Le package reste privé et en version 0.0.0 ; schéma natif version 1, sans engagement de release pilote.

Contexte : les huit lignes reçues dans `docs/exercises_rows.json` contiennent des enveloppes JSON encodées et des champs ambigus. `answerFormat=number` recouvre plusieurs familles mathématiques. Des collisions de flags, distracteurs et contraintes interdisent une reprise aveugle du format historique.

Décision : choisir la seule question de minimum du trinôme de la ligne 103 comme premier cas natif, dont a>0 garantit une réponse rationnelle −b/(2a). Transcription manuelle explicitement documentée, sans importeur ni migration du graphe. Conserver le corpus original byte-identique, empreinte et inventaire de tous les chemins. Le contrat `schemaVersion:1`, `kind:rational-value` décrit une question unique, ses paramètres integer bornés et ses variables contextuelles séparées. Politique native : domaine de réponse rationnel, valeur seule, aucune forme irréductible implicitement exigée.

Définition privée et soumission disposent de validateurs structurels depuis unknown, de diagnostics localisés et de copies détachées. Champs inconnus refusés ; données supplémentaires admises uniquement dans extensions JSON privées, sans interprétation d'aliases. Sources mathématiques non parsées : la validation de contrat ne démontre ni admissibilité, ni domaine, ni preuve de l'attendu. Les limites précises sont dans compatibility.md ; elles n'imposent pas de nouvelles capacités aux lots mathématiques.

Instance privée avec snapshot/version/seed et affichage public par sélection de champs sont des DTO séparés. Les types d'instance sont préparatoires : validation runtime, génération et projection appartiennent aux lots suivants. Soumission : IDs et LaTeX brut seulement ; aucune politique/seed/verdict client n'est accepté comme autorité. Aucun objet boxed CortexJS public, builtin Node ou nouvelle dépendance runtime ajouté.

Conséquences : API petite (`validateDefinition`, `validateSubmission`), pas de compatibilité implicite avec les autres familles du corpus. Symboles initialement limités à une lettre minuscule non réservée ; computed, exclusions dépendantes, QCM et graphes différés. La version de schéma, la révision native et les versions de génération/moteur restent distinctes. Des consommateurs et garanties mathématiques seront nécessaires avant publication ou correction officielle.

Actualisation documentaire : les mentions de DTO préparatoires et d'API réduite décrivent la livraison du Lot 2. [ADR 007](007-native-instantiation.md) concrétise désormais les instances/projection natives ; [architecture.md](../architecture.md) recense les six fonctions réellement exportées. D25/D26 proposent un schéma étendu de composition multiquestion ; v1 reste à question unique, aucune migration implicite.
