---
name: planifier-agentvegan
description: "Afficher ou modifier explicitement le profil AgentVegan, ou calculer et certifier une semaine complète de 7 jours et 21 repas véganes. Utiliser seulement pour le profil, une semaine ou un menu hebdomadaire explicites, une liste de courses liée à cette semaine ou un panier Picnic. Ne jamais utiliser pour un plat unique nommé : bœuf bourguignon, raclette, risotto ou tartiflette utilisent le véganiseur."
---

# Planifier avec AgentVegan

Exécuter le solveur déterministe fourni. Ne jamais composer, corriger ou déclarer
un planning certifié par raisonnement libre.

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
- Calculer explicitement une semaine, sept jours ou un menu hebdomadaire : appeler directement
  `plan_week`. Le nom d’un plat unique ne constitue jamais un menu. Cet outil calcule et certifie les 7 journées sans transmettre le
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
   `status: saved_with_warnings`, la carte affiche les 21 repas, le résumé des
   courses et, si Picnic est connecté, le bouton « Ajouter au panier Picnic » en
   haut. `plan_week` a déjà vérifié les produits Picnic : n’appeler ni
   `get_picnic_connection_status` ni `start_picnic_validation` ensuite.
5. Sous la carte, écrire uniquement la phrase renvoyée par `plan_week`, par
   exemple « Ta semaine est prête. Touche « Ajouter au panier Picnic » en haut de
   la carte. » Quand des souhaits ont été transmis, cette phrase contient aussi
   leur bilan réel (par exemple « 2 repas sur 21 suivent ta priorité… ») : la
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
