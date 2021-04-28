const {get, post} = require("axios"),
 { readFileSync, writeFileSync } = require('fs'),
 path = require('path'),
 CronJob = require('cron').CronJob,
 config  = require('./config.js')

let current = {}
try { current = JSON.parse(readFileSync(path.join(__dirname, 'current.json'), 'utf8')) } catch (e) { };
 
    const job = new CronJob('*/10 * * * *', function() {
       try {
            get(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${config.idChannel}&order=date&maxResults=50&key=${config.tokenYT}`, {
                headers: {
                    Accept: "application/json",
                }
            }).then((res) => {

                let latest = res.data.items[0].id.videoId;

                if (latest === current) return;
        
                current = latest;

                console.log('Post Youtube');

                post(config.webhook, {
                    "username": config.username,
                    "avatar_url": config.iconUrl,
                    "content": `**${res.data.items[0].snippet.channelTitle}** has just posted a video! Go see it!`,
                    "embeds": [
                        {
                            title: `${res.data.items[0].snippet.title}`,
                            color: 0xFF0000,
                            url: `https://www.youtube.com/watch?v=${res.data.items[0].id.videoId}`,
                            image: { url: `https://img.youtube.com/vi/${res.data.items[0].id.videoId}/maxresdefault.jpg`},
                            author: { name: res.data.items[0].snippet.channelTitle, icon_url: config.iconUrl },
                            footer: { icon_url: config.iconUrl, text: res.data.items[0].snippet.channelTitle },
        
                        }
                    ],
                }); 
                writeFileSync(path.join(__dirname, 'current.json'), JSON.stringify(current), 'utf8')
            });

        } catch (error) {
            console.log(error);
        }

}, null, true, 'Europe/Paris'); //List timezone https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
console.log('Job Start...')
job.start();
console.log('Job pending...')