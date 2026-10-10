# Décisions

Statut « retenue » = cohérente avec le cadrage et adoptée pour ce socle ; pas une validation métier externe implicite.

| ID  | Statut     | Décision et motif                                                                                 |
| --- | ---------- | ------------------------------------------------------------------------------------------------- |
| D01 | Retenue    | Package strict ESM indépendant ; `.d.ts`, export racine, pas de CJS sans besoin. ADR 001.         |
| D02 | Retenue    | CortexJS 0.151.0 seul moteur mathématique principal ; MathLive hors cœur.                         |
| D03 | Retenue    | Source originale/raw et restrictions avant réduction ; forme séparée de valeur. ADR 002.          |
| D04 | Retenue    | Exact/heuristique/indéterminé/erreur explicites ; aucun faux incorrect par défaut.                |
| D05 | Retenue    | Correction serveur et projection publique par allowlist ; pas de seed sensible publique. ADR 003. |
| D06 | Retenue    | Génération future seedée et versionnée, échec explicite sur contraintes impossibles.              |
| D07 | Retenue    | Aucun `eval`, `new Function`, parseur LaTeX supplémentaire ou CAS parallèle.                      |
| D08 | Retenue    | Socle seulement : pas de génération/correction/UI, publication désactivée.                        |
| D09 | Provisoire | TS6.0.3 au lieu du TS7.0.2 POC : peer déclaré de typescript-eslint8.71.1 <6.1.0.                  |
| D10 | Provisoire | Rationnels/polynômes univariés bornés pour premier correcteur ; spécifier bornes et coefficients. |
| D11 | Provisoire | CLI puis pool local comme expériences FastAPI ; aucun service imposé.                             |
| D12 | Ouverte    | Contrat JSON exact, versionnement et aliases après réception des huit documents.                  |
| D13 | Ouverte    | Domaines identiques ou domaine imposé, types numériques, tolérances et familles pédagogiques.     |
| D14 | Ouverte    | Politique forme factorisée/réduite, cas triviaux et états de forme inconnue.                      |
| D15 | Ouverte    | Profil décimal serveur et rejet placeholders ; ne pas normaliser virgule par regex.               |
| D16 | Ouverte    | RNG/seed encodage, stockage snapshot et ordre stable des tirages.                                 |
| D17 | Ouverte    | Transport production, budgets de ressources, SLO et contraintes déploiement.                      |
| D18 | Ouverte    | Registre privé, licence, nom final, processus de release et compatibilité consommateurs.          |

Les arbitrages entre agents et documents contradictoires figurent dans [analysis.md](analysis.md). Ne pas utiliser les 162 tests externes comme certification du moteur neuf. Les onze sondes polynomialCoefficients justifient un candidat borné, pas un correcteur général. La migration des tableaux/figures reste conditionnelle, sans transformation générique de noms.
