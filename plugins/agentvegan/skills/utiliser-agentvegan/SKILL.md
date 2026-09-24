---
name: utiliser-agentvegan
description: Utiliser automatiquement les vraies données et cartes AgentVegan quand une personne demande naturellement des idées de recettes véganes, une recette complète, son profil alimentaire, une semaine de repas, sa liste de courses, un restaurant végane, un traiteur végane ou l’ajout d’un article. Déclencher même sans mention d’AgentVegan et ne jamais répondre de mémoire quand une action AgentVegan correspond.
---

# Utiliser AgentVegan en langage naturel

Quand AgentVegan est disponible dans la conversation, les demandes couvertes
doivent utiliser ses actions et ses cartes réelles. Ne jamais remplacer un
résultat AgentVegan par une réponse générale produite de mémoire.

## Router la demande

- « Propose-moi trois recettes véganes avec du tofu » appelle immédiatement
  `propose_vegan_recipes` avec `include_ingredients=["tofu"]` et `limit=3`.
  Toute demande de plusieurs idées de recettes suit ce même parcours avec les
  contraintes réellement exprimées.
- Après le choix d’une recette, appeler `get_recipe` avec son identifiant afin
  d’afficher la photo du plat, tous les ingrédients, toutes les étapes et leurs
  images. Ne pas réécrire la recette dans le message.
- « Montre-moi mon profil alimentaire » appelle immédiatement `get_profile`.
  La carte permet de compléter ou modifier le profil consenti.
- « Planifie-moi une semaine végane » appelle immédiatement `plan_week`. Si le
  profil est incomplet, laisser la carte demander uniquement les champs
  nécessaires ; ne pas inventer de semaine dans le texte.
- « Affiche ma liste de courses » appelle immédiatement `get_shopping_list`.
- « Ajoute du lait de soja à ma liste de courses » appelle immédiatement
  `prepare_shopping_list_item` avec le nom exact et sans quantité inventée. La
  personne vérifie puis confirme dans la carte avant l’écriture.
- « Par quoi remplacer le poulet ? » appelle immédiatement
  `replace_animal_ingredient` et affiche uniquement les références vérifiées.
- « Trouve-moi un restaurant vegan près de moi » appelle immédiatement
  `find_vegan_locations` avec `category="restaurants"`. Utiliser uniquement les
  établissements renvoyés par la carte réelle AgentVegan.
- « Je cherche un traiteur vegan pour un événement » appelle immédiatement
  `find_vegan_locations` avec `category="caterers"`. Conserver la ville, les
  filtres d’offre et le rayon demandés ; ne jamais compléter les résultats avec
  des adresses produites de mémoire.

Les cartes AgentVegan sont la source de vérité. Une réponse textuelle générique,
un titre de recette inventé, une semaine composée librement ou une liste issue
de la mémoire de ChatGPT constitue un échec de routage.
