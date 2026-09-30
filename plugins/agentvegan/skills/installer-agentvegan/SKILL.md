---
name: installer-agentvegan
description: Installer AgentVegan de A à Z sur la machine où tourne l'agent (ordinateur via Codex ou Claude Code, ou VPS personnel via LibreAgent) quand une personne demande d'installer, configurer, réinstaller ou mettre à jour AgentVegan, d'associer cette machine, ou quand une action AgentVegan répond « En attente de votre ordinateur ». Tout le travail d'AgentVegan s'exécute ensuite sur cette machine ; le serveur ne garde que la base de données.
---

# Installer AgentVegan sur cette machine

AgentVegan calcule les menus, se connecte à Picnic et prépare les courses sur
la machine qui reçoit l'installation. Le serveur AgentVegan conserve seulement
la base de données du compte. Fais toute l'installation toi-même : la personne
n'exécute aucune commande et ne copie aucun code.

Parle en français simple. Annonce ce que tu fais en une phrase, puis fais-le.

## 1. Vérifier que le compte AgentVegan est connecté

Les outils AgentVegan doivent être disponibles dans cette conversation. Appelle
`get_decision_settings`. S'il échoue parce que la connexion manque, arrête et
explique en une phrase comment connecter AgentVegan :

- Codex ou Claude Code : autoriser le service AgentVegan quand l'application le
  propose ;
- LibreAgent : Paramètres, **Services connectés**, AgentVegan, **Se connecter**,
  sur cette même machine.

## 2. Vérifier la machine

Exécute `node --version`. Node.js 22.13 ou plus récent est nécessaire, avec
`npm` et `tar`. S'il manque, installe-le depuis sa source officielle
(nodejs.org, ou le gestionnaire de paquets du système) avant de continuer.
Windows n'est pas encore pris en charge : dis-le clairement et arrête.

## 3. Associer la machine et installer le service

1. Appelle `create_decision_device_pairing_link`. Garde `pairing_code` pour toi :
   ne l'affiche jamais et n'ouvre pas `pairing_url`.
2. Exécute, depuis le dossier de cette skill :

   ```bash
   node ../../installer/install-agentvegan.mjs --pairing-code <pairing_code>
   ```

   Le code est valable dix minutes et une seule fois. En cas de refus
   d'association, redemande un code et relance une seule fois.

   L'installateur télécharge le service sur Internet et l'enregistre comme
   service de fond hors du dossier de travail. Si l'environnement de
   l'agent limite le réseau ou l'écriture (bac à sable Codex ou LibreAgent),
   lance directement cette commande avec les autorisations étendues : la
   personne n'a qu'à approuver la demande affichée par son application. Ne
   contourne jamais un refus.
3. L'installateur télécharge le service local, vérifie son empreinte, construit
   le catalogue des menus sur la machine (une à deux minutes), installe un
   service permanent et attend sa connexion au serveur. Il affiche une ligne
   JSON : `"ok": true` et `"connected": true` confirment l'installation. Toute
   autre sortie est un échec : explique son message en une phrase, corrige la
   cause, puis relance.

Pour une mise à jour d'une machine déjà associée :

```bash
node ../../installer/install-agentvegan.mjs --update
```

## 4. Connecter Picnic sur cette machine

Appelle `get_picnic_connection_status`. Si Picnic n'est pas connecté, appelle
`create_picnic_connection_link` et laisse sa carte présenter la connexion. La
personne saisit elle-même son adresse, son mot de passe et le code SMS sur la
page sécurisée ; la session est ensuite chiffrée sur cette machine. Revérifie
l'état avec `get_picnic_connection_status` après sa confirmation.

## 5. Terminer

Appelle `get_profile`. Si le profil est incomplet, laisse sa carte le faire
compléter. Annonce ensuite que l'installation est terminée et propose une seule
action : « Planifie ma semaine ».

N'annonce jamais la fin si l'installateur n'a pas affiché `"connected": true`.
Si une action AgentVegan répond « En attente de votre ordinateur », la machine
associée est éteinte ou son service est arrêté : relance l'étape 3 avec
`--update` sur cette machine.
