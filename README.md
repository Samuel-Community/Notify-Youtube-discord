# YouTube Discord

Send a notification on Discord when you upload a new YouTube video.

## Installation

1. **Clone** the project or download it.
2. **Open a terminal** in the project folder.
3. Run **npm install** to install the dependencies.
4. Rename the file **example.env** to **.env**.

### Configuring the `.env` file

Rename `.env-example` to `.env`
Fill in the following details in the `.env` file:

WEBHOOK_URL=          # Discord webhook URL 
AVATAR_URL=           # URL du webhook Discord
YOUTUBE_CHANNEL_ID=   # YouTube channel ID (find it here: https://www.youtube.com/account_advanced)


### Database

Make sure you have a **MongoDB** instance ready (local or remote).  
By default, the script connects to:  
`mongodb://localhost:27017/discordbot`.

If you use a different address, update it in the main script or add it as an environment variable.

---

## Running the Script

1. Run the following command to start the script:


   ```bash node index.js```

The script will check for new videos every 5 minutes.

2. Keep the script running in the background:
If you want the script to run continuously on a server, use pm2:

```pm2 start index.js --name "Webhook-Youtube"```
You can replace "Webhook-Youtube" with any name you prefer.

**Preview**
![](https://media.tutorapide.xyz/G4nUj7lVKRrn.png)

##### Contact


![Discord Banner 2](https://discordapp.com/api/guilds/753294055554809956/widget.png?style=banner2)

Made with 💖 by [TutoRapide](https://discord.gg/YM9XTZP)