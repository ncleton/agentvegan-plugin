---
name: planifier-agentvegan
description: "Afficher ou modifier le profil AgentVegan, définir son calendrier de repas (jusqu'à quatre zones par jour : petit-déjeuner, déjeuner, quatre heures, dîner) et calculer seulement les repas choisis, préparer des repas en lot ou des aliments déjà choisis, ou calculer une semaine explicitement demandée. Utiliser seulement pour le profil, une semaine ou un menu hebdomadaire explicites, une liste de courses liée à cette semaine ou un panier Picnic. Ne jamais utiliser pour un plat unique nommé : bœuf bourguignon, raclette, risotto ou tartiflette utilisent le véganiseur."
---

# Planifier avec AgentVegan

Exécuter le solveur déterministe fourni. Ne jamais composer, corriger ou déclarer
un planning certifié par raisonnement libre.

## Courses Leclerc et Carrefour

Les deux connecteurs MCP sont embarqués dans le service local AgentVegan et
utilisent Camoufox. Ne demande pas d'installer un MCP séparé.

1. Si le magasin manque, demande uniquement le Drive choisi, puis appelle
   `configure_drive` avec son nom et son identifiant exact ; pour Leclerc,
   utilise l'URL du catalogue et son code à six chiffres. N'invente pas de magasin.
2. Appelle `connect_leclerc` ou `connect_carrefour`. Une connexion humaine se
   termine dans le navigateur de la machine associée. Ne demande jamais de mot
   de passe, de code ou de cookie dans la conversation. Si la machine est hors
   ligne ou si le site bloque Camoufox, reprends l'erreur et son action attendue.
3. Pour la liste de courses, recherche chaque article avec
   `search_leclerc_products` ou `search_carrefour_products`, puis relis sa fiche
   avec `get_leclerc_product` ou `get_carrefour_product`. Les ingrédients doivent
   prouver qu'il convient à la demande végane ; aucun prix ou stock n'est inventé.
4. Lis `get_leclerc_cart` ou `get_carrefour_cart`, puis prévisualise les ajouts
   avec `add_to_leclerc_cart` ou `add_to_carrefour_cart`. Présente les produits et
   quantités réels et attends la confirmation explicite de la personne.
5. Reprends exactement les paramètres et le `confirmation_token` retournés.
   Chaque jeton expire et est lié au panier. Carrefour ajoute une unité par
   confirmation. Une mutation ambiguë exige une relecture, jamais un rejeu.
6. Pour répondre sur l'avancement des courses, relis le panier réel.
   Le panier Drive n'est pas le panier Picnic ; ne coche pas des articles comme
   achetés chez Picnic à partir d'un ajout dans un Drive.

Ne change pas de magasin, de compte ou de navigateur automatiquement. Ne
choisis pas de créneau, ne valide aucune commande et ne paie jamais.

## Calendrier de repas

Une semaine AgentVegan a quatre zones par jour : **Petit-déjeuner**,
**Déjeuner**, **Quatre heures** (le goûter) et **Dîner**. Seules les zones
choisies sont calculées, chacune avec sa part de la journée (25 %, 35 %, 10 %
et 30 %). « Un dîner par jour pendant sept jours » donne sept dîners, jamais
vingt et un repas.

- Dès que la personne limite ses repas (« seulement mes dîners », « pas de
  petit-déjeuner », « un goûter le mercredi », « je mange le midi au travail »),
  appeler directement `plan_week` avec `calendar` : une entrée `{ day, meal }`
  par jour et par zone demandée, rien de plus. Un jour sans zone n'apparaît pas.
  Ne jamais cocher une zone que la personne n'a pas demandée.
- Sans `calendar`, `plan_week` applique le calendrier enregistré de la
  personne, sinon la semaine standard de trois repas par jour. Un calendrier
  transmis est enregistré par défaut ; `save_calendar=false` pour une demande
  ponctuelle.
- `get_meal_calendar` affiche le calendrier enregistré et `save_meal_calendar`
  le modifie sans recalculer ; appeler ensuite `plan_week` pour les repas.
- Énergie et plafonds de sécurité sont vérifiés pour chaque jour sur les seules
  zones planifiées. Les minima et les ratios d'énergie sont vérifiés sur une
  journée complète, ou sur l'ensemble des repas isolés de la semaine. Un résultat
  `saved_with_warnings` liste les besoins non couverts, que la carte affiche.
- Si `plan_week` répond `MEAL_CALENDAR_REQUIRED`, le rappeler avec `calendar`.
  Si le calendrier est refusé (`MEAL_CALENDAR_INVALID`), reprendre son message.
- Si `plan_week` répond `candidate_pool_exhausted`, reprendre son message et
  son `next_action` : ajouter une zone, assouplir un filtre ou retirer un plat
  fixé. Ne jamais assouplir un plafond de sécurité.

## Respecter la demande de repas avant tout calcul

Cette section prend priorité sur le parcours de semaine standard ci-dessous.
Conserver les contraintes des messages précédents jusqu'à ce que la personne
les modifie explicitement. Une préférence du profil ne remplace jamais son
choix dans la conversation.

- Batch cooking, congélation, aliments déjà choisis au matin ou nombre variable
  de portions : appeler `prepare_meal_plan`, jamais `plan_week` sans transmettre
  ces contraintes. Des repas limités à certaines zones, sans lot ni aliment fixé,
  relèvent du calendrier ci-dessus.
- Dans `meal_request.request_text`, transmettre la demande complète. Dans
  `slots`, mettre uniquement les créneaux demandés, avec jour, repas, nombre
  de portions et identifiant unique. Un aliment déjà choisi utilise
  `kind="fixed_food"` et `food` avec son nom exact, son lien et seulement la
  quantité donnée. Ne jamais remplacer des céréales KoRo par une recette de
  bol de céréales du catalogue ; ne pas inventer leur portion ou leurs apports.
- Un lot de batch cooking utilise `batches` avec `batch_id` et `storage`.
  Relier chaque créneau concerné avec le même `batch_id`. « Cinq midis au
  travail » désigne cinq créneaux, pas cinq plats différents. La congélation
  est `storage="freezer"`, jamais une simple priorité culinaire.
- Transmettre la place de marché sélectionnée dans `marketplace` avec son
  magasin exact s'il est connu. Si elle manque, la retrouver dans le compte
  ou demander seulement ce choix. Ne jamais choisir Picnic à sa place.
- Toute exigence sans champ dédié reste dans `remaining_constraints` et doit
  être traitée avant la sauvegarde. Ne pas annoncer qu'elle est respectée.
- Le résultat `meal_planning_context` est une préparation en lecture seule :
  `saved=false`. Reprendre son état réel et son `next_action`. Ce n'est pas un
  programme terminé ni une certification nutritionnelle de journées complètes.
- Si `creation.status="permission_required"`, reprendre `creation.question`
  et attendre l'accord explicite avant de créer ou d'adapter les recettes
  manquantes. Un catalogue sans preuve de congélation ne prouve pas qu'aucun
  plat congelable n'existe. Ne jamais imposer un autre repas ou relâcher les
  contraintes. Après l'accord, chaque nouvelle recette exige quantités,
  ingrédients vérifiés chez le marchand choisi, toutes les étapes, une photo
  du plat et une photo distincte par étape ; les lots exigent aussi leur
  conservation, décongélation et réchauffage vérifiés.
- Un ingrédient n'est disponible que lorsque la vraie fiche du marchand choisi
  le confirme. Une référence du site ou une photo ne constitue pas une preuve
  de disponibilité. Une erreur de session, de magasin ou de vérification reste
  visible et bloque la déclaration « prêt ».

Pour une semaine complète standard, transmettre aussi la demande exacte dans
`request_text` de `plan_week`, en plus des préférences. Ne jamais annoncer
avant l'appel que des contraintes sont prises en compte : vérifier le résultat.

## Terminer un programme flexible

`prepare_meal_plan` renvoie `planning_token` : conserver sa valeur exacte.
Après l'autorisation explicite de créer ou adapter les recettes manquantes,
appeler `create_custom_recipe` avec ce jeton, `creation_consent=true`, les
`slot_ids` concernés et la recette complète dans `recipe_json`. Privilégier une
adaptation du site avec `base_recipe_id`. Respecter le contrat d'illustration
renvoyé par l'outil et ses instructions pour chaque photo ; ne pas créer une
recette du catalogue à la place d'un aliment déjà choisi. Le produit est vérifié
par le connecteur du marchand choisi : une erreur doit être résolue, jamais
présentée comme une disponibilité ou une rupture.

Une recette sur mesure reste privée. Toutes ses illustrations doivent être
rattachées avant d'appeler `save_meal_plan`. Envoyer exactement une sélection
`slot_id` / `recipe_id` par créneau à cuisiner, aucune pour les aliments fixés.
Reprendre chaque contrainte restante dans `constraint_resolutions` avec son
traitement explicite. L'outil regroupe les portions des lots et revérifie les
produits avant l'enregistrement. Présenter la carte retournée et son message,
sans prétendre certifier une semaine entière à partir de repas partiels.
Pour retrouver ce programme, appeler `get_meal_plan`, jamais reconstruire une
semaine de 21 plats. La carte inclut les quantités de courses de ces repas.

## Partage volontaire d'une recette créée

L'accord pour créer une recette n'autorise jamais sa publication. Quand la
recette est prête, la personne peut choisir « Partager sur le site » : elle doit
choisir **anonymement** ou **avec mon pseudo**, puis autoriser explicitement la
publication de cette recette. Le mode avec compte exige un pseudo public ; sa
photo de profil est facultative. Ne jamais reprendre son nom réel, son email,
un pseudo ou une photo sans son choix. Le mode anonyme ne publie ni pseudo ni
photo et ne réutilise aucune attribution précédente.

La confirmation transmet `publication_consent=true` et `attribution` à
`submit_recipe_for_review`. La photo éventuelle est choisie par le sélecteur de
l'application, jamais par une URL inventée. La proposition reste privée jusqu'à
la validation éditoriale, nutritionnelle et des images, puis rejoint la
bibliothèque publique pour tout le monde. Ne jamais annoncer une recette
publiée sur la seule base de son envoi pour validation.

## Router la demande

- « Véganise cette recette », « rends ce plat vegan » ou toute transformation
  d'une recette complète fournie par lien, photo, texte ou simple nom : appeler
  directement `prepare_recipe_veganization`. Ne pas la réduire à une recherche
  isolée de substituts. L'interface Avant / Après gère les choix, puis le flux
  `get_recipe_veganization_context` → `finalize_recipe_veganization` réécrit et
  valide toute la recette. Ne jamais afficher le profil dans ce parcours.
- « Comment remplacer », « par quoi remplacer », « quel substitut » ou toute
  demande portant sur le remplacement d'un ingrédient : appeler directement
  `replace_animal_ingredient`. Transmettre la question complète. Ne jamais appeler
  `list_recipes`, `open_agentvegan`, `get_profile` ou `plan_week` pour une
  substitution isolée. Présenter uniquement les références exactes de la page
  publique Substituts renvoyées par AgentVegan, avec leur Nutri-Score. Ne jamais
  ajouter de substitut générique, de conseil culinaire, de marque ou de produit
  absent de cette sélection, et ne pas demander de préciser la recette.
- « Trouve », « propose », « cherche » ou « liste » des recettes véganes :
  appeler directement `list_recipes`, puis `get_recipe` si la personne choisit
  une recette. Ne jamais appeler `open_agentvegan`, `get_profile` ou
  `get_account_status` pour consulter le catalogue. Traduire les contraintes
  exactes dans les filtres de `list_recipes` et les préférences souples dans
  `priorities` : « rapide », « facile », « protéiné », « riche en fibres » et
  « léger » servent à classer tout le catalogue, jamais à chercher une phrase
  littérale. Sans critère, laisser l'outil sélectionner des recettes variées.
- Afficher, ouvrir, configurer ou modifier explicitement le profil ou le tableau
  de bord : appeler `plan_week` avec `mode=configure_profile`. Les outils de
  profil sont internes à l'interface et ne sont pas appelés par le modèle.
- Connecter ou utiliser Picnic sans demander une semaine : appeler
  `get_picnic_connection_status`, puis `create_picnic_connection_link` si
  aucune session n'est connectée. Présenter la page sécurisée à ouvrir dans
  l'application ; ne jamais demander d'identifiants, de code ou de commande.
- « Montre ma liste de courses », « affiche ma liste de courses » ou toute
  demande équivalente : appeler directement `get_shopping_list`. Cette carte
  est indépendante du profil ; ne jamais ouvrir le profil ni recopier les
  articles dans le texte.
- « T’as réussi à ajouter au panier tout ce qui est prévu ? », « qu’y a-t-il
  dans mon panier Picnic ? », « que manque-t-il ? », « où en sont mes
  courses ? » ou toute question sur l’état du panier : appeler
  `get_picnic_cart_status` avant de répondre, jamais depuis la mémoire de la
  conversation. La personne a pu agir elle-même dans la carte, dans l’app
  Picnic ou via une tâche planifiée. Reprendre son `summary`. Si la lecture
  échoue, donner le code et `next_action`, présenter l’état enregistré comme
  non vérifié et ne jamais conclure que rien n’a été ajouté. La carte
  `get_shopping_list` reste la présentation de la liste.
- « Ajoute des carottes à ma liste de courses », « mets 2 kg de pommes de terre
  sur ma liste » ou toute demande équivalente : appeler directement
  `prepare_shopping_list_item`. Transmettre le nom exact et uniquement la
  quantité, l'unité et la note données par la personne. Ne jamais inventer une
  quantité absente. La carte demande la confirmation puis écrit l'article.
- Calculer explicitement une semaine, sept jours, un menu hebdomadaire ou les repas d'un calendrier : appeler directement
  `plan_week`, avec `calendar` quand la personne limite ses repas. Le nom d’un plat unique ne constitue jamais un menu. Cet outil calcule et certifie les journées du calendrier sans transmettre le
  catalogue à ChatGPT. Il les enregistre immédiatement seulement lorsque tous
  les contrôles passent. Ne jamais composer la semaine dans ChatGPT et ne jamais
  appeler d'abord l'état du compte ou le catalogue.
  Traduire chaque souhait de la demande dans `preferences` (voir « Souhaits
  de la semaine ») : sans ce champ, le solveur les ignore.

Le fait que la personne ait sélectionné AgentVegan ou qu'elle le mentionne ne
constitue pas une demande d'affichage du profil.

## Ouvrir et configurer AgentVegan

Quand la personne demande explicitement à afficher, ouvrir, configurer ou
modifier son profil ou son tableau de bord, appeler `plan_week` avec
`mode=configure_profile`, sans lui demander d'abord les informations du profil
dans la conversation. L'interface
retournée permet de remplir le profil et, de manière facultative, de connecter
Picnic depuis le téléphone. Ne pas remplacer cette interface par une liste de
questions textuelles, sauf si le client ne sait pas afficher les MCP Apps.

Si l'interface indique `profile`, laisser la personne enregistrer son profil.
Si elle propose Picnic, préciser que la connexion est facultative. Si elle
indique `ready`, confirmer qu’AgentVegan est prêt et demander ce qu’elle
souhaite planifier.

## Calculer une semaine

Une demande explicite comme « organise ma semaine » constitue déjà
l'autorisation de calculer et d'enregistrer la semaine certifiée. Appeler
immédiatement `plan_week` et ne jamais demander de confirmation supplémentaire
avant cet appel. Les confirmations du panier Picnic, d'une commande, d'une
tâche planifiée ou d'une suppression restent distinctes.

1. Appeler directement `plan_week`, sans appel préalable : ne pas relire ce
   fichier, ne pas chercher d’autres outils et ne pas vérifier Picnic avant.
   `plan_week` détecte lui-même le profil et la connexion Picnic.
   Transmettre dans `preferences` les souhaits exprimés par la personne.
2. S'il répond `code: profile_incomplete`, ne rien appeler d'autre : le même
   résultat affiche le wizard afin que la personne complète son profil.
3. Les besoins nutritionnels non prouvés sont des avertissements informatifs :
   `plan_week` enregistre quand même la semaine avec `status: saved_with_warnings`.
   Les signaler brièvement sans demander d'acceptation et sans bloquer l'affichage.
4. S'il répond `outcome: success` avec `status: certified` ou
   `status: saved_with_warnings`, la carte affiche les repas du calendrier, le résumé des
   courses et, si Picnic est connecté, le bouton « Ajouter au panier Picnic » en
   haut. `plan_week` a déjà vérifié les produits Picnic : n’appeler ni
   `get_picnic_connection_status` ni `start_picnic_validation` ensuite.
5. Sous la carte, écrire uniquement la phrase renvoyée par `plan_week`, par
   exemple « Ta semaine est prête. Touche « Ajouter au panier Picnic » en haut de
   la carte. » Quand des souhaits ont été transmis, cette phrase contient aussi
   leur bilan réel (par exemple « 2 repas sur 7 suivent ta priorité… ») : la
   reprendre telle quelle. Ne pas répéter que la semaine a été calculée, ne pas
   résumer les repas et ne jamais expliquer la mécanique interne. La
   programmation de la semaine suivante est proposée dans la carte.
6. Si la personne demande à programmer la semaine suivante, recueillir la date,
   l'heure et le rythme. Demander
   seulement les informations manquantes. Une fois les trois connues, créer une
   vraie tâche planifiée ChatGPT dans la conversation courante. L'interface
   propose par défaut « Ajouter au panier Picnic automatiquement » lorsque
   Picnic est connecté. Si la personne conserve ce choix, la tâche appelle
   `run_scheduled_week` avec `add_to_picnic_cart=true`. Sinon elle appelle
   uniquement `preview_week` en lecture seule. Ne jamais afficher le profil et
   ne jamais annoncer un panier rempli sans le résultat réel de l'outil.
   Les permissions ChatGPT de l'app peuvent exiger une approbation avant une
   action d'écriture ; le signaler au lieu de masquer ou contourner ce contrôle.
   La tâche appartient à ChatGPT et non au Worker AgentVegan. Ne jamais annoncer
   sa création avant l'affichage de la confirmation native de ChatGPT.

Le quota de repas Flemme enregistré dans le profil est une contrainte exacte du
solveur. Ne jamais le modifier sans accord.

## Souhaits de la semaine

La personne peut préciser sa semaine dans la même phrase. Chaque souhait se
transmet dans `preferences` de `plan_week` (et de `preview_week` ou
`run_scheduled_week` lorsqu'une tâche planifiée contient ces souhaits).

| Demande | `preferences` |
| --- | --- |
| « en priorité des recettes Instagram », « surtout des recettes Insta » | `priority_sources: ["instagram"]` |
| « plutôt des recettes de ma collection » | `priority_sources: ["personal_collection"]` |
| « que des recettes de ma collection », « uniquement Instagram » | `only_sources: [...]` |
| « pas de repas Flemme » | `excluded_sources: ["flemme"]` |
| « plein de tofu », « avec des pois chiches de préférence » | `priority_ingredients: ["tofu"]` |
| « sans champignons », « pas d'aubergine » | `excluded_ingredients: ["champignons"]` |
| « des recettes rapides, 30 minutes max » | `max_prep_minutes: 30` |

Origines possibles : `instagram` (Reels et publications Instagram, y compris
ceux de la collection perso), `personal_collection`, `website` (sites de
cuisine), `cookbook` (livres), `agentvegan` (recettes maison) et `flemme`.

- « En priorité », « surtout », « plutôt », « de préférence » sont des
  priorités : le solveur place autant de repas correspondants que la rotation
  et les contrôles nutritionnels le permettent.
- « Uniquement », « que des », « sans », « pas de » sont des filtres stricts :
  les recettes sont retirées avant le calcul. Si `plan_week` répond
  `PLAN_PREFERENCES_TOO_STRICT`, reprendre son message et proposer de passer le
  filtre en priorité ; ne jamais relâcher un filtre sans accord.
- Ne jamais affirmer qu'un souhait est pris en compte sans l'avoir transmis :
  seul le bilan renvoyé par l'outil fait foi.

## Desserts, en-cas, apéritifs et accompagnements

Toutes les recettes publiées sur agentvegan.org peuvent entrer dans une
semaine. Le solveur choisit lui-même les plats des repas du calendrier ; un
en-cas chaque après-midi active la zone Quatre heures dans `calendar`. Un dessert,
un apéritif, un accompagnement ou une préparation de base précis s'ajoute à
un repas quand la personne le demande (« ajoute la mousse au chocolat au dîner
de vendredi »).

1. Trouver la recette avec `list_recipes` (sa catégorie est Dessert, En-cas,
   Apéritif, Tartinable, Accompagnement ou Préparation de base).
2. Appeler `plan_week` avec `components` : une entrée `{ day, meal, recipe_id }`
   par ajout, `meal` étant la zone du calendrier à laquelle elle se joint. Le solveur réduit
   alors le plat principal pour garder la journée dans les besoins du profil.
3. Si l'outil répond `constraints_conflict`, reprendre son message (recette
   inconnue ou repas non adapté) sans substituer une autre recette.

## Produit Picnic indisponible

Si `start_picnic_validation` renvoie `PICNIC_PLAN_PRODUCT_UNAVAILABLE`, extraire
uniquement les `recipe_ids` de ses détails puis rappeler `plan_week` avec ces
identifiants dans `excluded_recipe_ids` et `picnic_compatible_only: true`. Arrêter après trois exclusions ou dès
que Picnic demande une reconnexion ou limite les appels. Ne jamais choisir un
produit approximatif à la place d’une référence refusée.

## Préparer le panier

Depuis la liste de courses, l'app peut appeler directement
`add_shopping_list_to_picnic_cart` après la confirmation explicite de la
personne. Cet outil valide toutes les références, relit le panier et coche toute
la liste seulement après une réconciliation réussie. Un second appel pour le
même planning doit rester idempotent.

1. Demander quels repas la personne veut acheter.
2. Appeler `preview_picnic_cart` avec les `slot_id` correspondants. Présenter les
   produits, quantités, paquets et sous-total renvoyés.
3. Demander une confirmation explicite après cette prévisualisation.
4. Appeler `apply_picnic_cart` une seule fois avec le `preview_id` et
   `confirmed: true`.
5. Rapporter la relecture réelle du panier. Ne jamais sélectionner un créneau,
   commander ou payer.

Quand la personne indique avoir passé ou validé sa commande, proposer en une
phrase de recevoir chaque jour les étapes des recettes du jour et leur PDF :
appeler `get_notification_settings`, puis suivre la skill
`utiliser-agentvegan` pour enregistrer les réglages et programmer la tâche.

Pour toute question ultérieure sur ce qui est dans le panier ou ce qui reste à
acheter, appeler `get_picnic_cart_status` : il relit le panier Picnic réel et le
compare à la liste de courses.

Lire [references/contracts.md](references/contracts.md) uniquement pour
diagnostiquer une erreur de contexte, de certificat ou de validation Picnic.
