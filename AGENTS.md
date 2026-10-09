# AgentVegan Plugin

Ce dépôt public distribue le plugin AgentVegan pour Codex, Claude Code et
LibreAgent, ainsi que l'installateur du service qui s'exécute sur la machine de
l'utilisateur (ordinateur ou VPS personnel).

## Quand ce dossier sert d’agent dans LibreAgent, Codex ou Claude Code

Pour une demande de connexion à Leclerc Drive, appelle immédiatement
`connect_leclerc` ; pour Carrefour Drive, appelle `connect_carrefour`.
AgentVegan inclut ces connecteurs dans le service de la machine associée.
N'affirme jamais qu'il ne gère que Picnic. Un outil absent demande une mise à
jour du plugin ; `DRIVE_SERVICE_UPDATE_REQUIRED` demande aussi la mise à jour
du service. Une permission manquante demande de reconnecter AgentVegan dans
les services connectés de l'application hôte. Suis ensuite la section
« Courses Leclerc et Carrefour » de
`plugins/agentvegan/skills/utiliser-agentvegan/SKILL.md` : magasin exact,
connexion humaine, puis relecture de la session. Ne demande jamais de mot de
passe, de code ou de cookie dans la conversation. Aucun ajout au panier n'est
autorisé par une simple demande de connexion.

Toute demande réelle d’une adresse où manger ou acheter des pâtisseries,
d’une boulangerie, d’un café, d’un restaurant ou d’un traiteur végane utilise
immédiatement et exactement une fois `find_vegan_locations` et sa carte.
Cette règle vaut aussi quand la personne indique déjà une ville, un quartier
ou une adresse précise. Une demande d’établissement n’est jamais une question
à laquelle répondre de mémoire ou par une recherche Web générale.

- Une pâtisserie utilise `cuisines=["pastry"]`, une boulangerie
  `cuisines=["bakery"]`, des glaces `cuisines=["ice_cream"]`.
  Ce sont des filtres obligatoires, à conserver pendant les échanges suivants.
- « 100 % végane », « entièrement végane », « full vegan » ou « uniquement
  vegan » impose `offers=["only"]`. Ne jamais remplacer cette exigence par un
  établissement proposant seulement des options, même faute de résultat.
- Transmettre le lieu dans `query` et toute position partagée dans `latitude`
  et `longitude`. Ne jamais inventer une position. Sans lieu ni coordonnées,
  la carte demande la localisation ; si elle reste inconnue, demander le lieu.
- Ne lancer aucune recherche Web avant la carte ni après un résultat vide.
  Ne recommander que les établissements effectivement renvoyés, compatibles
  avec tous les filtres et vérifiés pour la demande. Un résultat vide signifie
  qu’aucune adresse du catalogue ne répond aux critères ; ce n’est pas une
  preuve qu’aucune adresse n’existe. Présenter cet état et conserver les
  contraintes jusqu’à une demande explicite de les élargir.
- Si le connecteur est indisponible, donner l’erreur et la marche à suivre
  pour le reconnecter. Ne pas substituer des adresses issues de la mémoire
  ou du Web.

## Distribution et maintenance du plugin

- Le plugin se connecte au serveur `https://mcp.agentvegan.org/mcp`, qui ne garde que la base de données du compte. Les menus, Picnic et les modes de décision s'exécutent sur la machine associée.
- L'installateur ne télécharge le service qu'après association de la machine à un compte, et vérifie son empreinte SHA-256. Ne jamais publier ici le code privé du service ni le catalogue des menus.
- Ne jamais ajouter de session marchand, identifiant, jeton, cookie, profil utilisateur, secret d'infrastructure ou donnée privée de la plateforme.
- Ne jamais présenter une commande, un paiement ou une modification de panier comme automatique sans confirmation explicite de l'utilisateur.
- Garder tous les textes destinés aux utilisateurs en français naturel.
- Valider le plugin et les manifestes des catalogues avant chaque publication.
