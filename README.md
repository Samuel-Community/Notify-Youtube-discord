# Notify YouTube → Discord

Envoie une notification Discord instantanée dès qu'une nouvelle vidéo est publiée sur une ou plusieurs chaînes YouTube, via **PubSubHubbub (WebSub)**.

> Google pousse lui-même la notification dès la publication — le délai est quasi nul, contrairement à un polling RSS.

---

## Prérequis

- [Node.js](https://nodejs.org/) v18+
- Une base MongoDB (local ou [Atlas](https://www.mongodb.com/atlas))
- Un webhook Discord (Paramètres du salon → Intégrations → Webhooks)
- Une URL publique accessible depuis internet (voir section [Exposer le serveur](#exposer-le-serveur))

---

## Installation

```bash
git clone https://github.com/ton-repo/notify-youtube-discord
cd notify-youtube-discord
npm install
cp .env-example .env
```

Remplis le fichier `.env` (voir section suivante).

---

## Configuration `.env`

```env
WEBHOOK_URL=https://discord.com/api/webhooks/...
CALLBACK_URL=https://xxxx.ngrok-free.app
HUB_SECRET=un_secret_optionnel
MONGODB=mongodb://localhost:27017/youtube-notify
PORT=3000

YOUTUBE_CHANNELS=[{"channelId":"UCxxxxxxxxxxxxxxxx","roleToMention":"","avatarUrl":""}]
```

### Détail des variables

| Variable | Obligatoire | Description |
|---|---|---|
| `WEBHOOK_URL` | ✅ | URL du webhook Discord |
| `CALLBACK_URL` | ✅ | URL publique de ton serveur (sans `/youtube/callback`) |
| `MONGODB` | ✅ | URI de connexion MongoDB |
| `YOUTUBE_CHANNELS` | ✅ | Tableau JSON des chaînes à surveiller (voir ci-dessous) |
| `HUB_SECRET` | ❌ | Secret HMAC pour vérifier les pushs de Google (recommandé) |
| `PORT` | ❌ | Port du serveur (défaut : `3000`) |

### `YOUTUBE_CHANNELS` — format JSON

Un objet par chaîne à surveiller :

```json
[
  {
    "channelId": "UCxxxxxxxxxxxxxxxx",
    "roleToMention": "123456789012345678",
    "avatarUrl": "https://exemple.com/avatar.png"
  },
  {
    "channelId": "UCyyyyyyyyyyyyyyyyyy"
  }
]
```

| Champ | Obligatoire | Description |
|---|---|---|
| `channelId` | ✅ | ID de la chaîne YouTube (commence par `UC`) |
| `roleToMention` | ❌ | ID du rôle Discord à mentionner (`<@&ID>`) |
| `avatarUrl` | ❌ | Avatar affiché pour le webhook Discord |

**Où trouver le `channelId` ?**

Sur la page de la chaîne YouTube → clic droit → "Afficher le code source" → chercher `channel_id`. 

Ou directement dans l'URL si elle contient `/channel/UCxxx`.

---

## Exposer le serveur

Google doit pouvoir contacter ton serveur pour valider la souscription et envoyer les notifications.

### ✅ En production (VPS)

Configure Nginx en reverse proxy avec ton domaine :

```nginx
location /youtube/callback {
    proxy_pass http://localhost:3000;
}
```

```env
CALLBACK_URL=https://tondomaine.com
```

---

### 💻 En local / Windows — ngrok

**1. Installer ngrok**

```bash
winget install ngrok
```

Ou télécharger sur [ngrok.com/download](https://ngrok.com/download).

**2. Créer un compte gratuit** sur [ngrok.com](https://ngrok.com) et connecter ton authtoken :

```bash
ngrok config add-authtoken TON_TOKEN_ICI
```

**3. Lancer dans deux terminaux séparés**

```bash
# Terminal 1 — le bot
node index.js

# Terminal 2 — le tunnel
ngrok http 3000
```

ngrok affiche une ligne comme :
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:3000
```

Copie cette URL et mets à jour ton `.env` :
```env
CALLBACK_URL=https://abc123.ngrok-free.app
```

Puis redémarre le bot (`Ctrl+C` → `node index.js`).

> ⚠️ **L'URL ngrok change à chaque redémarrage** (version gratuite). À chaque fois que tu relances ngrok, mets à jour `CALLBACK_URL` dans le `.env` et redémarre le bot.

---

## Lancement

```bash
node index.js
```

Au démarrage, le bot :
1. Se connecte à MongoDB
2. Envoie une souscription à Google PubSubHubbub pour chaque chaîne configurée
3. Google appelle `/youtube/callback` en GET pour valider la souscription
4. Renouvelle automatiquement la souscription toutes les 23h (le bail expire à 24h)

---

## Tester en local

Simule un push YouTube depuis PowerShell sans attendre une vraie vidéo :

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/youtube/callback" `
  -Method POST `
  -ContentType "application/atom+xml" `
  -Body @'
<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015">
  <entry>
    <yt:videoId>dQw4w9WgXcQ</yt:videoId>
    <yt:channelId>UCxxxxxxxxxxxxxxxx</yt:channelId>
    <title>Ma super vidéo de test</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"/>
    <author><name>MaChaîne</name></author>
  </entry>
</feed>
'@
```

> Remplace `UCxxxxxxxxxxxxxxxx` par le `channelId` configuré dans ton `.env` — sinon l'anti-doublon ne trouvera pas la config et la mention ne s'appliquera pas.

---

## Structure

```
├── index.js        — serveur Express + logique WebSub
├── channel.js      — modèle Mongoose (anti-doublon par chaîne)
├── .env-example    — template de configuration
└── package.json
```