---
name: utiliser-agentvegan
description: Utiliser automatiquement les vraies données et cartes AgentVegan quand une personne demande naturellement des idées de recettes véganes, une recette complète, ce qu’elle cuisine aujourd’hui, une recette en PDF, ses notifications AgentVegan, son profil alimentaire, Picnic, une semaine de repas, sa liste de courses, un restaurant végane, un traiteur végane ou l’ajout d’un article. Déclencher même sans mention d’AgentVegan et ne jamais répondre de mémoire quand une action AgentVegan correspond.
---

# Utiliser AgentVegan en langage naturel

Quand AgentVegan est disponible dans la conversation, les demandes couvertes
doivent utiliser ses actions et ses cartes réelles. Ne jamais remplacer un
résultat AgentVegan par une réponse générale produite de mémoire.

## Router la demande

- Après l’installation du plugin, ou pour « Que peut faire AgentVegan ? »,
  appeler `discover_agentvegan` afin d’afficher son choix interactif. La
  personne sélectionne ensuite une action dans la carte.
- « Propose-moi trois recettes véganes avec du tofu » appelle immédiatement
  `propose_vegan_recipes` avec `include_ingredients=["tofu"]` et `limit=3`.
  Toute demande de plusieurs idées de recettes suit ce même parcours avec les
  contraintes réellement exprimées.
- Après le choix d’une recette, appeler `get_recipe` avec son identifiant afin
  d’afficher la photo du plat, tous les ingrédients, toutes les étapes et leurs
  images. Ne pas réécrire la recette dans le message.
- « Montre-moi mon profil alimentaire » appelle immédiatement `get_profile`.
  La carte permet de compléter ou modifier le profil consenti.
- « Je veux utiliser Picnic » ou « Connecte Picnic » appelle
  `get_picnic_connection_status`. Si Picnic n'est pas connecté, appeler
  `create_picnic_connection_link` et présenter sa page sécurisée. La personne
  saisit elle-même ses identifiants et son code éventuel sur cette page.
  Si AgentVegan demande les autorisations Picnic, faire ouvrir le consentement
  par l'application hôte et ne jamais demander une commande de terminal.
- « Planifie-moi une semaine végane » appelle immédiatement `plan_week`. Si le
  profil est incomplet, laisser la carte demander uniquement les champs
  nécessaires ; ne pas inventer de semaine dans le texte.
- « Affiche ma liste de courses » appelle immédiatement `get_shopping_list`.
- « T’as réussi à ajouter au panier tout ce qui est prévu ? », « qu’y a-t-il
  dans mon panier ? » ou « où en sont mes courses ? » appelle immédiatement
  `get_picnic_cart_status`, jamais une réponse de mémoire : la personne a pu
  agir dans la carte, dans l’app Picnic ou via une tâche planifiée. Reprendre
  son résumé ; en cas d’erreur de lecture, donner le code et l’action indiquée
  sans conclure que rien n’a été ajouté.
- « Ajoute du lait de soja à ma liste de courses » appelle immédiatement
  `prepare_shopping_list_item` avec le nom exact et sans quantité inventée. La
  personne vérifie puis confirme dans la carte avant l’écriture.
- « Configure Jev », « utilise Laya », « passe sur Luna » ou « quel mode de
  décision utilises-tu ? » appelle `get_decision_settings`. Pour Jev, appeler
  `create_jev_settings_link` et présenter la page sécurisée : la clé TypeSafe
  se saisit uniquement sur cette page, jamais dans la conversation. Pour Laya ou
  Luna, appeler `create_decision_device_pairing_link` afin d’associer
  l’ordinateur de la personne. Changer de mode appelle `set_decision_mode`.
  Ne jamais passer d’un mode à un autre sans que la personne l’ait demandé.
- « Propose-moi des recettes crémeuses et épicées » ajoute ces goûts dans
  `taste_preferences` (un à huit) de `propose_vegan_recipes`. Les exclusions,
  durées et contraintes nutritionnelles restent des filtres exacts ; les goûts
  ordonnent seulement les recettes admissibles avec le mode choisi. Si le mode
  attend l’ordinateur de la personne, relire le classement avec
  `get_decision_task` et `job_ids` au lieu de relancer la recherche.
- « Par quoi remplacer le poulet ? » appelle immédiatement
  `replace_animal_ingredient` et affiche uniquement les références vérifiées.
- « Trouve-moi un restaurant vegan près de moi » appelle immédiatement
  et exactement une fois `find_vegan_locations` avec `category="restaurants"`.
  Utiliser uniquement les établissements renvoyés par la carte réelle AgentVegan.
- Si le message contient une position partagée, par exemple « Ma position
  actuelle (partagée depuis LibreAgent) : latitude …, longitude … », transmettre
  `latitude` et `longitude`, y compris quand un lieu est aussi nommé.
- Transmettre dans `query` le lieu tel que la personne le formule : « centre de
  Lille », « Vieux-Lille », « gare Part-Dieu » ou « japonais à Wazemmes ».
  AgentVegan géocode ce lieu et cherche dans un rayon adapté ; ne jamais le
  réduire à la seule ville.
- Sans lieu ni position, appeler l’outil sans `query` : la carte demande la
  position de l’appareil. Si `summary.needs_device_position` reste vrai,
  demander à la personne sa ville, son quartier ou une adresse.
- « Je cherche un traiteur vegan pour un événement » appelle immédiatement
  et exactement une fois `find_vegan_locations` avec `category="caterers"`.
  Conserver la ville, les filtres d’offre et le rayon demandés. Dans `query`,
  transmettre seulement la localité, la cuisine ou le nom recherché, jamais la
  phrase complète de la personne. Si la carte ne renvoie aucun résultat, ne pas
  rappeler l’outil et ne lancer aucune recherche Web ; conserver son état vide.
  Ne jamais compléter les résultats avec des adresses produites de mémoire.
- « Un resto vegan plutôt épicé à Lyon », « un traiteur gourmand près de
  moi » ou toute autre envie (romantique, en terrasse, pour un anniversaire…)
  appelle le même outil une seule fois avec la localité dans `query` et chaque
  envie dans `preferences` (une à huit). Le mode de décision du compte (Jev,
  Laya ou Luna) classe alors les adresses les plus proches ; la carte montre le
  meilleur choix en premier, avec sa photo, sa première description et son
  lien Google Maps. Ne jamais transformer une envie en filtre de `query` ni
  réordonner la carte dans le message.

Les cartes AgentVegan sont la source de vérité. Une réponse textuelle générique,
un titre de recette inventé, une semaine composée librement ou une liste issue
de la mémoire de ChatGPT constitue un échec de routage.

## Recettes du jour, PDF et notifications

- « Qu’est-ce que je cuisine aujourd’hui ? », « mes recettes du jour », « les
  étapes de mon dîner » ou « et demain ? » appelle `get_daily_recipes`, avec
  `date` au format AAAA-MM-JJ pour un autre jour. La carte affiche toutes les
  étapes illustrées, un mode pas à pas avec minuteurs et le PDF de la journée.
  Dans ChatGPT, écrire une seule phrase et le lien PDF, sans recopier les
  étapes. Sans carte (Codex, Claude Code), présenter les recettes renvoyées.
  Si `status` n’est pas `ready`, reprendre uniquement `message`.
- « Télécharge le PDF », « envoie-moi la recette en PDF » ou « je veux
  l’imprimer » appelle `get_recipe_pdf` : sans argument pour les recettes du
  jour, `recipe_ids` pour des recettes choisies, `generation_id` pour une
  recette véganisée. Le lien est signé et valable huit jours.
- Sur un ordinateur avec Codex ou Claude Code, télécharger réellement le
  fichier : créer `~/Downloads/AgentVegan`, lancer
  `curl -fL -o ~/Downloads/AgentVegan/<filename> "<pdf.url>"`, vérifier que le
  fichier commence par `%PDF`, puis donner son chemin. En cas d’échec, donner
  le code HTTP et le message de la page au lieu d’annoncer un téléchargement.
- « Configure mes notifications », « envoie-moi les recettes tous les jours à
  18 h », « coupe les notifications » ou toute demande équivalente appelle
  `get_notification_settings` pour afficher la carte, ou
  `save_notification_settings` avec uniquement les champs demandés. Quand la
  personne indique avoir passé ou validé sa commande, proposer en une phrase
  de recevoir chaque jour les recettes du jour, à partir du jour de livraison
  si elle le donne (`starts_on`).
- Après l’enregistrement, appliquer chaque entrée de `automations` avec l’outil
  de tâches planifiées de l’application, sans créer de doublon :
  `create_or_update` crée ou met à jour la tâche avec son nom, son `rrule`, son
  fuseau et son `prompt` exact ; `delete_if_exists` supprime la tâche du même
  nom si elle existe.
  - ChatGPT : créer la tâche planifiée native dans la conversation courante.
  - Codex : utiliser l’outil d’automatisations de Codex, en tâche heartbeat
    rattachée à la conversation, avec `notificationPolicy=failed_runs_only`
    lorsque `notify_only_when_action_needed` vaut vrai.
  - Claude Code ou LibreAgent : utiliser leur outil de tâches planifiées. S’il
    n’en existe pas, dire clairement que cette application ne peut pas
    programmer la tâche et donner la consigne `prompt` à lancer à la main.
  Ne jamais annoncer qu’une tâche existe avant la confirmation de l’application.
