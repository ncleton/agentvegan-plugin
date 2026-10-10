---
name: utiliser-agentvegan
description: Utiliser automatiquement les vraies données et cartes AgentVegan quand une personne demande naturellement des idées de recettes véganes, une recette complète, ce qu’elle cuisine aujourd’hui, une recette en PDF, ses notifications ou réglages AgentVegan, ses essentiels du quotidien à ajouter au panier Picnic, Leclerc Drive ou Carrefour Drive (pain, papier toilette…), ses courses complètes dans un Drive, un lien Instagram de recette à importer, sa collection Instagram à suivre, sa collection perso de recettes, le partage d’une recette sur agentvegan.org, la sauvegarde de ses recettes en PDF dans Google Drive, son profil alimentaire, Picnic, Leclerc Drive, Carrefour Drive, une semaine de repas, sa liste de courses, un restaurant végane, une pâtisserie végane, une boulangerie, un traiteur végane ou l’ajout d’un article. Déclencher même sans mention d’AgentVegan et ne jamais répondre de mémoire quand une action AgentVegan correspond.
---

# Utiliser AgentVegan en langage naturel

Quand AgentVegan est disponible dans la conversation, les demandes couvertes
doivent utiliser ses actions et ses cartes réelles. Ne jamais remplacer un
résultat AgentVegan par une réponse générale produite de mémoire.

## Courses Leclerc et Carrefour

Les deux connecteurs MCP sont embarqués dans le service local AgentVegan et
utilisent Camoufox. Ne demande pas d'installer un MCP séparé.

1. Pour « Peux-tu te connecter à Leclerc Drive ? », appelle d'abord
   `connect_leclerc` ; pour Carrefour, appelle `connect_carrefour`. N'affirme
   jamais qu'AgentVegan ne gère que Picnic. Un outil absent demande une mise à
   jour du plugin et du service ; une autorisation manquante demande une
   reconnexion à AgentVegan dans les services connectés de l'application hôte.
   Si l'appel retourne `DRIVE_CONFIGURATION_REQUIRED`, demande uniquement le
   Drive choisi, puis appelle
   `configure_drive` avec son nom et son identifiant exact ; pour Leclerc,
   utilise l'URL du catalogue et son code à six chiffres. N'invente pas de magasin.
2. Appelle `connect_leclerc` ou `connect_carrefour`. Une connexion humaine se
   termine dans le navigateur de la machine associée. Ne demande jamais de mot
   de passe, de code ou de cookie dans la conversation. Si la machine est hors
   ligne ou si le site bloque Camoufox, reprends l'erreur et son action attendue.
3. Pour la liste de courses, recherche chaque article avec
   `search_leclerc_products` ou `search_carrefour_products`, puis relis sa fiche
   avec `get_leclerc_product` ou `get_carrefour_product`. Pour un aliment ou une
   boisson, les ingrédients doivent prouver qu'il convient à la demande végane.
   Un article non alimentaire n'a pas de preuve végane à fournir. Aucun prix ou
   stock n'est inventé.
4. Lis `get_leclerc_cart` ou `get_carrefour_cart`, puis prévisualise les ajouts
   avec `add_to_leclerc_cart` ou `add_to_carrefour_cart`. Présente les produits et
   quantités réels et attends la confirmation explicite de la personne.
5. Reprends exactement les paramètres et le `confirmation_token` retournés.
   Chaque jeton expire et est lié au panier. Carrefour ajoute une unité par
   confirmation. Une mutation ambiguë exige une relecture, jamais un rejeu.
6. Pour répondre sur l'avancement des courses, relis le panier réel.
   Le panier Drive n'est pas le panier Picnic ; ne coche pas des articles comme
   achetés chez Picnic à partir d'un ajout dans un Drive.

### Faire toutes les courses, papier toilette compris

Quand la personne demande un article du quotidien (« du papier toilette », de
la lessive, du café) ou de « faire toutes les courses », le Drive choisi sert
de magasin complet. Ne limite pas la recherche aux produits alimentaires
véganes et ne réponds jamais qu'un article est hors du champ d'AgentVegan.

- Non alimentaire (papier toilette, produits ménagers, hygiène) : aucune preuve
  végane n'est exigée. Retiens la référence qui correspond exactement à la
  demande (format, nombre de rouleaux, marque si elle est précisée). Si
  plusieurs références conviennent, propose-en trois au plus et demande
  laquelle.
- Aliments et boissons : garde la preuve végane lue sur la fiche. Si la fiche ne
  la donne pas, dis-le et n'ajoute l'article qu'avec l'accord explicite de la
  personne.
- Une liste complète (liste de la semaine, liste libre ou les deux) se traite en
  une passe : recherche chaque ligne, puis présente un seul récapitulatif avec
  l'article, la référence retenue, la quantité, le prix observé et les lignes
  sans référence fiable. Après une confirmation explicite de ce récapitulatif,
  applique chaque ajout avec son `confirmation_token`, relis le panier réel tous
  les cinq ajouts et à la fin, puis donne l'écart entre la liste et le panier.
  Si un ajout échoue ou reste ambigu, arrête-toi, relis le panier et rends
  compte avant de continuer.
- Ne mélange pas Leclerc et Carrefour dans un même récapitulatif sans que la
  personne ait choisi l'enseigne de chaque ligne.

Ne change pas de magasin, de compte ou de navigateur automatiquement. Ne
choisis pas de créneau, ne valide aucune commande et ne paie jamais.

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
- Une demande de repas limités à certaines zones (« seulement mes dîners », « pas
  de petit-déjeuner », « un goûter le mercredi ») appelle `plan_week` avec
  `calendar` : une entrée `{ day, meal }` par jour et par zone demandée
  (Petit-déjeuner, Déjeuner, Quatre heures, Dîner), rien de plus. Seules ces
  zones sont calculées, avec leur part des besoins. `get_meal_calendar` et
  `save_meal_calendar` lisent et modifient le calendrier enregistré.
- Une demande de batch cooking, congélation, céréales déjà choisies ou nombre
  variable de portions appelle `prepare_meal_plan` avec la demande complète et
  suit la section « Respecter la demande de repas avant tout calcul » de
  `planifier-agentvegan`. Ne jamais appeler `plan_week` vide pour ces demandes.
- « Planifie-moi une semaine végane » sans autre contrainte de structure appelle `plan_week` avec `request_text` et sans `calendar` (le calendrier enregistré, sinon trois repas par jour, s'applique). Si le
  profil est incomplet, laisser la carte demander uniquement les champs
  nécessaires ; ne pas inventer de semaine dans le texte.
  Les souhaits de la même phrase passent dans `preferences` : « en priorité
  des recettes Instagram » donne `priority_sources: ["instagram"]`, « sans
  champignons » `excluded_ingredients: ["champignons"]`, « 30 minutes max »
  `max_prep_minutes: 30`. La skill `planifier-agentvegan` détaille toutes les
  correspondances. Reprendre la phrase renvoyée, qui donne le bilan réel.
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
- « Je cherche une pâtisserie vegan proche de chez moi » appelle le même outil
  avec `cuisines=["pastry"]`. « Boulangerie » utilise `cuisines=["bakery"]`,
  « glaces » `cuisines=["ice_cream"]`. Le produit recherché est un filtre
  obligatoire, jamais une simple entrée de `preferences` : un restaurant sans
  pâtisseries ne répond pas à cette demande. Conserver ce filtre pendant les
  échanges suivants ; « full vegan » ajoute `offers=["only"]`.
- Ne jamais recommander comme adapté un lieu dont les verdicts disent
  `a_verifier` ou `inadapte`. Une liste vide signifie qu’aucune adresse du
  catalogue ne répond aux critères, pas qu’aucune adresse n’existe.
- Les distances partent de la position partagée quand elle est disponible sur
  place. Avec `distances_from="area_centre"`, parler de distance depuis le
  quartier ou le centre indiqué, jamais de distance depuis la personne.
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
  meilleur choix vérifié en premier, avec la vue de rue Street View ou Panoramax du site AgentVegan, sa description sourcée et son
  lien Google Maps. Ne jamais transformer une envie en filtre de `query` ni
  réordonner la carte dans le message.

Les cartes AgentVegan sont la source de vérité. Une réponse textuelle générique,
un titre de recette inventé, une semaine composée librement ou une liste issue
de la mémoire de ChatGPT constitue un échec de routage.

## Mes essentiels du quotidien

- « Ajoute le pain à mes essentiels », « mets du papier toilette dans mon
  panier tous les mois », « mes produits du quotidien », « mes essentiels » ou
  toute demande équivalente appelle `get_essentials`. Si un produit est nommé,
  transmettre `search` avec son nom : la carte affiche les vrais produits
  Picnic et la personne choisit elle-même le produit, la quantité et le rythme
  (chaque semaine ou chaque mois). Ne jamais annoncer qu’un produit est ajouté
  avant ce choix.
- La carte règle aussi le mode d’ajout : « Je valide avant l’ajout » (les
  essentiels apparaissent à part dans la liste de courses et dans la
  confirmation d’ajout au panier) ou « Ajout automatique » (AgentVegan les met
  directement dans le panier Picnic le jour choisi). Aucun mode ne sélectionne
  de créneau, ne commande ni ne paie.
- « Ouvre mes réglages » appelle `get_notification_settings` : la carte des
  réglages réunit les notifications, le choix « Je décide des recettes avec
  l’agent » ou « Je fais confiance à l’agent » pour la semaine suivante, et un
  accès à Mes essentiels.

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

## Recettes Instagram et collection perso

Toute recette importée suit le même parcours, qu'elle vienne d'un lien partagé
dans la conversation ou de la collection Instagram suivie chaque jour. La
machine associée télécharge la publication, transcrit l'audio en local et
extrait des images ; l'agent rédige la recette ; la machine la classe comme sur
agentvegan.org, calcule sa nutrition officielle, l'ajoute au planificateur,
produit son PDF et, si l'export est activé, le copie dans Google Drive.

- Un lien instagram.com/reel/…, /p/… ou /tv/… partagé, ou « importe cette
  recette Instagram », appelle `import_instagram_recipe` avec le lien. Si
  `state` vaut `already_imported`, dis-le en une phrase et arrête-toi.
- Appelle ensuite `get_recipe_import` avec `import_id`. Tant que `state`
  vaut `preparing`, attends une vingtaine de secondes et relis-le (au plus
  15 fois). La première fois, la machine installe ses outils d'import : cela
  peut prendre quelques minutes.
- Quand `state` vaut `ready`, lis toute la légende, la transcription et
  chaque image jointe, puis rédige la recette en JSON selon
  `recipe_authoring_contract`, en français, sans inventer aucune quantité,
  portion ou étape. Choisis `food_identity` dans `food_identities`. Si la
  source contient un produit animal, adapte-le et décris-le dans
  `adaptation`. Si une donnée indispensable manque dans toutes les sources,
  n'enregistre rien et explique ce qui manque.
- Appelle `save_imported_recipe` avec `import_id` et `recipe_json`. Sans
  consigne de la personne, n'envoie pas `share_publicly` : le réglage
  enregistré s'applique, et il est coché par défaut (la recette est aussi
  proposée à la base publique agentvegan.org, publiée après vérification
  éditoriale). « Garde-la pour moi » donne `share_publicly=false` ;
  « partage-la » donne `share_publicly=true`.
- Si l'outil renvoie `PERSONAL_RECIPE_NOT_VEGAN`, `PERSONAL_RECIPE_NOT_FRENCH`
  ou une autre erreur de validation, corrige le JSON selon `details` et
  relance une seule fois. Reprends ensuite le `message` renvoyé en une ou deux
  phrases, sans recopier la recette. Si `planning.issues` n'est pas vide,
  indique que la recette est enregistrée mais pas encore utilisée par le
  planificateur, avec la première raison.
- `INSTAGRAM_LOGIN_REQUIRED` : appelle `connect_instagram` avec
  `action=connect`. Une fenêtre Instagram dédiée s'ouvre sur la machine ; la
  personne s'y connecte elle-même. Ne demande jamais d'identifiant, de mot de
  passe ou de code dans la conversation. Après sa confirmation, vérifie avec
  `action=status` puis relance l'import. Sur un VPS sans écran, propose
  `action=import_file` avec le chemin d'un export de cookies Instagram déjà
  présent sur la machine.
- `EXECUTOR_OFFLINE` : la machine associée est éteinte ou son service est
  arrêté ; suis la skill `installer-agentvegan` (mise à jour avec
  `--update`).
- `DEVICE_UPDATE_REQUIRED` : le service installé sur la machine est trop
  ancien ; mets-le à jour avec la skill `installer-agentvegan` (`--update`),
  puis relance la demande.

### Collection Instagram suivie chaque jour

- « Suis ma collection Instagram », « importe automatiquement ma collection
  Recettes » ou une adresse instagram.com/<compte>/saved/… : appelle
  `save_recipe_import_settings` avec `instagram_collection_url`,
  `collection_check_enabled=true` et, si la personne la donne, l'heure
  `collection_check_time` (10:00 par défaut). Vérifie ensuite que la session
  Instagram est connectée (`connect_instagram`, `action=status`).
- Applique `automations` avec l'outil de tâches planifiées de l'application,
  comme pour les notifications : `create_or_update` crée ou met à jour la
  tâche « AgentVegan — collection Instagram » avec son `rrule`, son fuseau et
  son `prompt` exact ; `delete_if_exists` la supprime. Dans Codex, crée une
  tâche heartbeat rattachée à la conversation. Sans outil de tâches planifiées,
  dis-le clairement et donne le `prompt` à lancer à la main. N'annonce jamais
  qu'une tâche existe avant la confirmation de l'application.
- « Vérifie ma collection maintenant » ou la tâche planifiée appelle
  `check_instagram_collection`, puis importe chaque publication de `pending`
  avec le parcours ci-dessus. Une publication qui n'est pas une recette passe
  par `skip_instagram_collection_item` avec `status=skipped` ; une erreur
  d'import avec `status=failed` (elle est retentée au plus trois fois).

### Collection perso, partage et planificateur

- « Mes recettes », « ma collection », « mes recettes Instagram » appelle
  `list_my_recipes` (avec `query` ou `category` si la personne précise) ;
  une recette choisie s'affiche avec `get_my_recipe`. La collection vit sur la
  machine : elle est classée comme le site (catégorie, temps, sans gluten,
  nutrition par portion).
- Les recettes perso planifiables entrent automatiquement dans `plan_week`
  à côté de la base publique. Avec la stratégie de courses « tout chez
  Picnic », seules les recettes aux produits Picnic certifiés sont planifiées :
  les recettes perso servent alors en mode hybride ou liste de courses.
  « Fais ma semaine avec mes recettes en priorité » transmet
  `preferences.priority_sources: ["personal_collection"]` à `plan_week`.
- « Partage cette recette » appelle `share_my_recipe` ; « supprime cette
  recette » appelle `delete_my_recipe` seulement après une demande explicite.
- « Ne partage plus mes recettes par défaut » appelle
  `save_recipe_import_settings` avec `share_publicly_default=false`.

### Sauvegarde PDF dans Google Drive

L'export protège les recettes même si le serveur AgentVegan ou la machine
disparaissent.

- « Sauvegarde mes recettes dans Google Drive » appelle `connect_google_drive`
  avec `action=connect`. Donne à la personne l'adresse `login.verification_url`
  et le code `login.user_code` : elle autorise elle-même AgentVegan, qui ne
  voit que les fichiers qu'il crée. Après sa confirmation, rappelle
  `connect_google_drive` avec `action=status`, puis
  `export_recipes_to_google_drive` pour sauvegarder les recettes déjà
  présentes. Chaque nouvelle recette est ensuite copiée automatiquement dans
  le dossier « AgentVegan - Mes recettes ».
- `get_recipe_import_settings` montre l'état complet : partage par défaut,
  collection suivie, session Instagram, Google Drive, export en cours et
  propositions envoyées à agentvegan.org.
- Sur un ordinateur avec Codex ou Claude Code, le PDF d'une recette est aussi
  disponible localement : `pdf.local_path` renvoyé par `save_imported_recipe`.

## MCP d’achats livrés avec le plugin

`get_drive_connectors` donne l’inventaire exact. Les dépôts Leclerc et Carrefour sont liés dans `native-drive-connectors.json`, qui pilote leurs versions réellement installées avec le service associé. Les deux MCP permettent de chercher les produits et de modifier le panier après confirmation explicite ; l’agent n’effectue aucune commande ni aucun paiement.

Auchan et Supermarchés Match avaient des collecteurs de catalogue dans AgentVegan, sans MCP de panier retrouvé. N’annonce pas de MCP d’achats pour ces enseignes à partir de ces collecteurs. Ne réponds jamais « seulement Picnic » sans vérifier l’inventaire réel des MCP.


### Recettes sur mesure et partage

Pour des repas dont le catalogue ne respecte pas les contraintes, suivre
`planifier-agentvegan` : catalogue actuel d'abord, autorisation explicite avant
`create_custom_recipe`, produits vérifiés chez le marchand choisi, plat et
chaque étape illustrés, puis `save_meal_plan` avec les seuls créneaux demandés.
`get_meal_plan` retrouve ce programme sans générer une semaine standard.
La création laisse la recette privée. Le partage est un choix distinct :
anonyme ou pseudo public lié au compte, photo facultative, et autorisation de
publication de la recette. Ne jamais copier le nom ou l'email du compte dans
l'attribution. La fiche « Partager sur le site » recueille ce choix avant la
proposition pour validation.
