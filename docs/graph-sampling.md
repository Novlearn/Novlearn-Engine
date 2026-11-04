# Échantillonnage officiel d’affichage — D54 / Admin D10

**Implémentation en cours de qualification locale. Aucun tarball adopté ni
nouveau runtime certifié à ce stade.** L’utilisateur autorise explicitement
l’extension locale, sa certification et son intégration dans Admin le 21 octobre 2026. Les protections, quotas et délais existants restent inchangés.

L’API asynchrone sampleDisplayGraph reçoit une instance officielle conservée par
un serveur et un ID d’élément. Le profil fixe display-graph-v1 produit une sortie
séparée versionnée 1 : coordonnées numériques approximatives, segments admis,
lacunes et états complete/partial/unsupported. Aucun snapshot, corrigé ou ancien
reçu n’est réécrit. Un objet navigateur n’acquiert aucune provenance officielle.

Le package de développement passe à 0.2.0 pour cette nouvelle API ; le champ
engineVersion des snapshots reste 0.1.0, identifiant du pipeline d’instanciation
et de correction inchangé, sous schéma 5. Le nouveau résultat porte son propre
profil versionné. L’archive et sa version devront être qualifiées ensemble avant
adoption ; aucune archive Admin existante n’est remplacée par ce jalon.

## Calcul et domaine

CortexJS 0.151.0 reste l’unique moteur principal. Le sampling examine l’AST
substitué avant réduction. Les restrictions des divisions, logarithmes, racines
et puissances sont contrôlées avant toute valeur numérique. Les preuves exactes
de domaines viennent du parcours algébrique existant, extrait sans changer son
corps ; les contraintes dérivées ne sont plus sérialisées puis reparsées en LaTeX.
Les preuves identiques sont réutilisées seulement dans une opération, avec une
clé incluant variable, relation et AST substitué. Aucun cache global.

Deux points ne sont reliés que si les restrictions sont prouvées sur l’intervalle.
Un domaine non résolu reste explicitement partiel ; une proximité de valeurs ne
prouve pas la continuité. Les graphes gardent formulaDomain=unverified. La limite
actuelle de preuve algébrique reste celle des profils existants ; aucune capacité
générale de résolution ou tangente arbitraire n’est annoncée.

Fonctions : 65 abscisses déterministes, jusqu’à 16 séries. Suites : 1–64 termes,
indice initial et récurrence respectés, sans réamorçage après un terme indéfini.
Les suites à points prescrits restent distinctes et leur option connectPoints
décrit une liaison graphique discrète, sans preuve de continuité d’une fonction.
L’ordre d’évaluation reste borné à 2 048 calculs de formule/contrôles de domaine ;
les réservations de contrôles restent comptées même en cas de preuve réutilisée.
Un dépassement signale budget-limit, conserve la présence de toutes les séries et
ne transforme pas une couverture partielle en succès complet.

La projection ne contient ni source privée, AST, valeurs générées, politique,
attendu ou trace Cortex. L’empreinte de l’élément lie le résultat à sa source ;
elle n’est ni une attestation pédagogique ni une preuve d’autorisation.

## Résultats obtenus jusqu’ici

Compilation et types stricts passent. Le dernier contrôle ciblé passe **109 tests / quatre fichiers**, dont 28 cas de sampling, avec le délai Vitest inchangé de cinq secondes. Les deux scénarios à seize fonctions rationnelles valent 2 165 ms et 2 087 ms. Le nouveau test de comptage exige 390 opérations pour deux séries identiques : admission, valeurs, gardes ponctuelles et gardes d’intervalle, y compris lorsque les preuves sont réutilisées. Le calcul exact est conservé pour la chaîne récurrente ; une fonction dessinée ne recalcule plus une seconde valeur exacte inutilisée.

Le premier contrôle complet a réellement terminé : **1 555 succès, dix échecs / 31 fichiers**, 837,73 s. Neuf échecs provenaient de tests liant encore version de package et pipeline ou ignorant les deux nouveaux exports ; les vecteurs historiques restent inchangés, les assertions complètes sont conservées et le pipeline est maintenant épinglé explicitement à 0.1.0. Le dixième était le scénario distinct à seize numérateurs dépassant cinq secondes. Une passe ciblée ultérieure passait 108 tests, mais à 4 966 ms dans ce cas ; cette marge insuffisante n’a pas été certifiée. Les optimisations suivantes et le comptage complet passent maintenant les 109 contrôles. Une exécution intermédiaire interrompue sans rapport n’est pas comptée comme réussie. Tous les échecs et rapports sont conservés dans le dossier privé Admin .local/engine-graph-work.

Ces résultats ne qualifient pas encore le host Linux, un tarball installé,
l’ensemble de la suite source ou l’intégration Admin. Regressions algébriques,
contrôle complet, mémoire/arrêt réel et ancienne projection, package installé,
rejeu public/privé, adoption locale et parcours HTTP restent obligatoires.

Aucun changement NovLearn élève, base distante, publication, push, déploiement
ou réglage de sécurité. L’ancien artefact certifié conserve sa portée propre.
