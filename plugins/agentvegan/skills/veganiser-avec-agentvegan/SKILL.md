---
name: veganiser-avec-agentvegan
description: Faire automatiquement n’importe quel plat traditionnel nommé en version végane ou transformer une recette traditionnelle complète quand la personne fournit un lien, une photo lisible, un texte ou seulement le nom du plat. Utiliser même sans mention d’AgentVegan pour « je veux un bœuf bourguignon vegan », « comment faire un risotto vegan ? », « une quiche lorraine vegan », « un hachis parmentier vegan », « une tartiflette végane », « version vegan de la blanquette », « je veux faire une raclette », « véganise cette recette » ou toute formulation équivalente. Ne jamais répondre directement avec une recette végane lorsque ce workflow s’applique.
---

# Véganiser une recette avec AgentVegan

Produire une recette complète, jamais une simple liste de remplacements. La
source et les choix restent séparés dans l’interface Avant / Après. Dès que la
recette finale est validée, l’interface masque totalement la source et affiche
uniquement la nouvelle fiche végane.

## Établir la source

- URL publique : appeler `make_dish_vegan` avec `source_kind=url`
  et `source_url`. Ne pas inventer ni transmettre une autre recette :
  AgentVegan extrait la recette Recipe JSON-LD exacte et échoue clairement si
  la page ne la fournit pas.
- Photo lisible d’une recette : transcrire fidèlement le titre, les portions,
  chaque ingrédient avec sa quantité et toutes les étapes. Sérialiser cet objet
  complet dans `recipe_json`, puis appeler l’outil avec `source_kind=photo` et
  `source_basis=visual_transcription`.
- Photo d’un plat sans texte exploitable : signaler que les quantités et les
  étapes manquent. Ne pas inventer une recette à partir de l’apparence.
- Recette collée : structurer exactement le texte avec `source_kind=text` et
  `source_basis=user_text`.
- Simple nom de plat, y compris « je veux un [plat] vegan », « recette de [plat] vegan », « comment faire/préparer/cuisiner [plat] vegan »
  ou « propose-moi un [plat] vegan ». Dans une conversation AgentVegan, cela
  inclut aussi une demande comme « je veux faire une raclette » même si la
  personne omet le mot vegan : ne jamais appeler `list_recipes` ;
  appeler immédiatement `make_dish_vegan`. Proposer la recette traditionnelle
  complète d'avant transformation côté serveur, sans auteur ni fausse URL,
  avec uniquement `source_kind=name`, `source_basis=proposed_standard` et
  `source_label=nom du plat`. Ne jamais transmettre `recipe_json` pour un nom
  de plat. La base serveur conserve les ingrédients animaux qui caractérisent
  réellement le plat afin de proposer leurs substituts et l’interface
  l’étiquette comme une proposition.

Pour `source_kind=photo` ou `text`, toujours utiliser `recipe_json`, jamais
l’ancien champ imbriqué `recipe`. Avant l’appel, vérifier que chaque
ingrédient possède `name` et `quantity` et que `steps` contient au moins une
instruction. Si un outil de véganisation renvoie une erreur autre que la
correction structurée `VEGANIZED_RECIPE_STEP_SPLIT_REQUIRED` décrite plus bas,
arrêter immédiatement : ne jamais générer une image de plat, une variante
visuelle ou une recette de remplacement pour contourner l’échec.

## Laisser choisir les produits

Après `make_dish_vegan`, ne pas rédiger la recette dans la réponse.
L’interface montre les ingrédients animaux, leurs fonctions et uniquement les
références exactes de la page publique Substituts AgentVegan. Attendre que la
personne coche un produit pour chaque ingrédient. Pour le fromage d’une
raclette, elle peut composer un assortiment de un à quatre produits ; la
recette finale doit tous les utiliser en répartissant la quantité prévue.

Le vin est accepté comme ingrédient végane et ne doit déclencher aucun
avertissement. Une bière ou un autre produit composé dont la composition doit
être contrôlée peut apparaître comme un avertissement non bloquant. Il ne doit
jamais masquer les substituts disponibles. Après les choix, la recette finale
doit résoudre uniquement les compositions effectivement signalées.

Ne jamais appeler `replace_animal_ingredient` en plus : les candidats sont déjà
liés à la source et certifiés dans le jeton de l’interface. Ne jamais lire le
profil ni exiger de compte marchand.

## Réécrire après les choix

Quand l’interface envoie un `generation_id` :

1. appeler `get_recipe_veganization_context` avec cet identifiant ;
2. appliquer intégralement l’objet `recipe_authoring_contract` renvoyé et recopier
   exactement son `contract_version` dans
   `illustration_contract_version`. La finalisation doit échouer si
   cette preuve du skill est absente ou différente ;
3. utiliser exactement la source, les produits, les fonctions et les allergènes
   renvoyés ;
4. remplacer chaque fonction culinaire et recalculer hydratation, matière
   grasse, amidon, sucre, sel, acidité, levée, ordre d’incorporation, repos,
   température et cuisson ;
5. réécrire la liste complète des ingrédients avec quantités métriques ;
6. réécrire toutes les étapes dans l’ordre réel, en reliant chaque ingrédient
   final à ses étapes et réciproquement ;
7. faire de chaque étape une opération culinaire utile et observable :
   préciser le geste, l’outil ou le récipient, l’état actuel et le repère de
   fin ; interdire les phases vagues comme « préparer » ou « cuire le plat »,
   mais aussi les micro-étapes comme « chauffer l’huile », « saler » ou
   « remuer » isolément ; intégrer ces gestes à l’opération qu’ils servent ;
8. ajouter un `completion_check` concret à chaque étape et un `dish_brief`
   décrivant précisément le plat fini ;
9. rendre chaque étape illustrable séparément avec `image_required=true`,
   `visible_ingredient_ids`, `image_brief`, `visual_action` et, lorsque
   plusieurs ingrédients cuisent ensemble dans un récipient avec le même geste
   et le même résultat, `composite_cooking=true` ;
10. séparer les découpes de plusieurs ingrédients et les cuissons réellement
   indépendantes. Une matière grasse, de l’eau, du bouillon, du vin ou un
   assaisonnement ne compte pas comme une transformation supplémentaire. Si
   plusieurs ingrédients cuisent ensemble dans le même récipient avec le même
   geste principal et le même résultat, conserver une seule étape et utiliser
   `composite_cooking=true`. AgentVegan déduit toutefois ce marqueur lorsque la
   structure de l’étape le prouve : son oubli ne doit pas interrompre le flux ;
11. pour une découpe, préciser la forme recherchée, la planche stable et le
   geste sûr ; pour une cuisson, préciser le récipient, la chaleur, le geste et
   l’état de cuisson. Ne rendre visibles que les ingrédients présents à cet
   instant, jamais ceux d’une étape future ;
12. renseigner pour chaque remplacement l’ajustement et le changement de résultat
   attendu ;
13. résoudre chaque `composition_checks` sans conserver de libellé ambigu ;
14. sérialiser l’objet recette complet en JSON, sans bloc Markdown ni texte
   autour, puis appeler `submit_recipe_veganization` avec le même identifiant et
   cette chaîne dans `recipe_json`. Ne jamais utiliser l’ancien
   `finalize_recipe_veganization` dans une nouvelle conversation : son schéma
   imbriqué est conservé uniquement pour la compatibilité.

Si `submit_recipe_veganization` renvoie
`VEGANIZED_RECIPE_STEP_SPLIT_REQUIRED`, ne pas transformer cette correction
technique en réponse pour la personne. Lire toutes les entrées de `details`,
scinder chaque étape indiquée en une étape par ingrédient découpé ou épluché,
mettre à jour `ingredient_ids`, `visible_ingredient_ids` et tous les
`used_in_steps`, puis relancer automatiquement une seule fois
`submit_recipe_veganization` avec le même `generation_id`. Cette correction ne
doit créer aucune micro-étape pour l’huile, les liquides, l’assaisonnement ou le
simple mélange et ne doit déclencher aucune génération d’image.

## Générer les illustrations sur le compte ChatGPT de la personne

Après le succès de `submit_recipe_veganization`, ne pas recopier la recette dans
le message et ne pas lancer spontanément le générateur d’images. La fiche finale
affiche la première tâche renvoyée dans `image_generation.next_task` et fournit,
pour cette tâche seulement, trois actions : « Créer cette photo », « Choisir
l’image générée » et « Importer depuis l’appareil ».

Le bridge UI ChatGPT ne donne pas directement au MCP le fichier produit par le
générateur natif d’images. Il expose uniquement les fichiers importés avec
`uploadFile`, choisis avec `selectFiles`, reçus comme paramètres de fichier ou
renvoyés comme références de fichier par un outil. Ne jamais prétendre que la
photo native vient d’être rattachée tant que l’appel
`attach_recipe_veganization_image` n’a pas réellement réussi.

Pour chaque tâche, dans l’ordre :

1. traiter uniquement le prompt littéral placé entre les balises
   `AGENTVEGAN_IMAGE_PROMPT` ; ne pas le résumer, le traduire, l’enrichir, le
   réécrire ni lui ajouter le titre ou les autres étapes de la recette ;
2. quand la personne touche « Créer cette photo », laisser le composant envoyer
   le prompt exact à ChatGPT afin de demander un seul fichier image carré ;
3. ne jamais demander une affiche, une fiche, une infographie, un collage, une
   planche, un avant/après, une scène multiple ou du texte intégré ;
4. contrôler visuellement ce seul résultat selon le contrat
   `agentvegan-image-prompter`. Si l’image contient du texte, un chiffre, un
   logo, un collage, plusieurs scènes, un aliment animal, un ingrédient absent
   de `allowed_visible_ingredients` ou un état incompatible avec
   `expected_visual_state`, régénérer uniquement cette même tâche ;
5. après la génération, la personne revient dans la fiche et touche « Choisir
   l’image générée ». Le composant appelle `selectFiles`, exige une seule image,
   récupère son URL temporaire avec `getFileDownloadUrl`, puis appelle lui-même
   `attach_recipe_veganization_image` avec l’`asset_id` et le `plan_token`
   exacts de la tâche active ;
6. seulement après le succès réel de cet attachement, afficher la photo sur
   l’étape correspondante et passer à la nouvelle
   `image_generation.next_task`. Répéter le même flux jusqu’à
   `image_generation.state=complete`.

Si l’image générée n’apparaît pas dans la bibliothèque ChatGPT, « Importer
depuis l’appareil » reste disponible. Le composant utilise alors `uploadFile`,
`getFileDownloadUrl`, puis le même appel
`attach_recipe_veganization_image`. Cette solution reste limitée à la tâche
active et fonctionne sur mobile sans ordinateur.

La première tâche est toujours la photographie de l’étape 1. Les étapes sont
générées dans l’ordre avant la photographie finale du plat. Un intitulé comme
« affiche recette », « carte recette », « infographie » ou « planche » est une
erreur : ne pas accepter cette image et ne pas la transmettre à AgentVegan.

AgentVegan télécharge immédiatement chaque fichier ChatGPT et le stocke dans le
brouillon privé, puis l’interface affiche :

1. une photographie carrée du plat terminé ;
2. une photographie carrée distincte pour chaque étape, dans l’ordre ;
3. aucune carte recette, affiche, infographie, montage, collage, planche-contact
   ou image avec texte ;
4. uniquement les ingrédients autorisés à l’instant illustré, sans emballage,
   marque, ingrédient animal ni ingrédient ajouté plus tard.

Ne demander aucune clé API ni aucun ordinateur. Ne pas masquer l’étape de
sélection ou d’import nécessaire : c’est l’autorisation explicite qui permet au
bridge de remettre le vrai fichier au MCP.

Lorsque toutes les images sont présentes, le bouton « Proposer sur
AgentVegan » envoie le dossier dans une file privée. Cette action ne publie
jamais directement sur le site : une validation humaine, les contrôles
nutritionnels et le transfert vers le stockage public restent obligatoires.

Ne pas remplacer un produit choisi par un autre. Ne jamais ajouter un
substitut générique. Ne jamais présenter la recette comme validée avant le
succès du dernier outil. AgentVegan réinjecte lui-même les liens d’achat du
catalogue et refuse tout ingrédient animal, produit composé ambigu, quantité
absente, incohérence ingrédient/étape ou ajustement manquant.

interface:
  display_name: "Véganiser avec AgentVegan"
  short_description: "Transforme et illustre une recette végane"
  default_prompt: "Utilise $veganiser-avec-agentvegan pour transformer cette recette en version végane, me laisser choisir les produits, puis générer la fiche finale et ses images d’étapes."
dependencies:
  tools:
    - type: "mcp"
      value: "agentvegan"
      description: "Analyse de recette, choix de substituts vérifiés et interface Avant / Après AgentVegan"
      transport: "streamable_http"
      url: "https://mcp.agentvegan.org/mcp"
policy:
  allow_implicit_invocation: true
