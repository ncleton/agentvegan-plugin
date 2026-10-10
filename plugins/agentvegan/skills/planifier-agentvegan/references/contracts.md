# Contrats de la planification portable

- Contexte : `agentvegan-solver-context-v1`, valable deux heures au maximum.
- Solveur : `agentvegan-portable-solver-v3`.
- Certificat standard : `agentvegan-portable-plan-certificate-v1`, 7 preuves et 21 repas.
- Certificat de calendrier : `agentvegan-portable-plan-certificate-v2`. Il porte le
  `calendar` demandé (cellules `{ day, meal }` parmi Petit-déjeuner, Déjeuner,
  Quatre heures et Dîner), exactement un repas par cellule avec sa
  `portion_scale` (0,5 à 2), une preuve par jour planifié et, pour les repas
  isolés, une preuve `balance_proof` additionnée sur la semaine. Chaque zone
  couvre une part de la journée : 25 % le petit-déjeuner, 35 % le déjeuner,
  10 % les quatre heures, 30 % le dîner. Énergie et plafonds de sécurité sont
  vérifiés pour chaque jour ; minima et ratios d'énergie pour une journée
  complète ou pour l'ensemble des repas isolés. Les limites non tenues sont
  listées dans `relaxed_minimums` ; un plafond dépassé échoue.
- Le MCP recalcule chaque preuve avant D1 ; le script ne fait pas autorité seul.
- La validation Picnic relit chaque identifiant produit dans le catalogue du
  compte, puis compare nom, marque et conditionnement à la projection certifiée.
- La preuve Picnic expire après deux heures et doit précéder toute
  prévisualisation de panier.
- Une prévisualisation expire après dix minutes et ne peut être appliquée qu’une
  fois. Un changement du panier réel l’invalide.
- Les sessions Picnic restent chiffrées dans le Durable Object du compte. Elles
  ne figurent ni dans le contexte du solveur ni dans le certificat.
