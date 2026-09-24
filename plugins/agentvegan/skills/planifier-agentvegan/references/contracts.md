# Contrats de la planification portable

- Contexte : `agentvegan-solver-context-v1`, valable deux heures au maximum.
- Solveur : `agentvegan-portable-solver-v1`.
- Certificat : `agentvegan-portable-plan-certificate-v1`, 7 preuves et 21 repas.
- Le MCP recalcule chaque preuve avant D1 ; le script ne fait pas autorité seul.
- La validation Picnic relit chaque identifiant produit dans le catalogue du
  compte, puis compare nom, marque et conditionnement à la projection certifiée.
- La preuve Picnic expire après deux heures et doit précéder toute
  prévisualisation de panier.
- Une prévisualisation expire après dix minutes et ne peut être appliquée qu’une
  fois. Un changement du panier réel l’invalide.
- Les sessions Picnic restent chiffrées dans le Durable Object du compte. Elles
  ne figurent ni dans le contexte du solveur ni dans le certificat.
