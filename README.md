# Youtube discord

Send a notification when you post a new youtube video on discord

## Installation

Clone the **Project** or download it.

Then open a terminal in the project folder.

Do an **npm install** to install the dependencies.

Change the name of the file **example_config.js** to **config.js** and **example_current.json** to **current.json**

And complete the following information. Put the information in the **' '**

    webhook:  '', link webhook discord
    iconUrl: '', url avatar
    idChannel: '', id channel youtube https://www.youtube.com/account_advanced
    tokenYT: '',  https://console.cloud.google.com/
    username: '' username webhook


Once all this is done. Make node **index.js** a request will be made every 10 minutes.

To keep the program running in the background on your server you can use **pm2** if you have it. **pm2 start index.js --name "Webhook-Youtube"**.
You can choose any name you want.

**Preview**
![](https://sharemedia.tutorapide.xyz/mazHyRcB.png)

##### Contact

Discord: *𝓢amuel#7455*

![Discord Banner 2](https://discordapp.com/api/guilds/753294055554809956/widget.png?style=banner2)

Made with 💖 by [TutoRapide](https://discord.gg/YM9XTZP)