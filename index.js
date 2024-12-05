require('dotenv').config();
const axios = require('axios');
const RSSParser = require('rss-parser');
const mongoose = require('mongoose');
const Video = require('./video'); // Le modèle Mongoose pour les vidéos

const parser = new RSSParser();

// ID de la chaîne YouTube et URL du webhook
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

// Connexion à MongoDB
mongoose.connect('mongodb://localhost:27017/youtube', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connecté à MongoDB'))
  .catch(err => console.error('Erreur de connexion à MongoDB :', err));

// Fonction pour récupérer ou initialiser l'ID de la dernière vidéo
async function getLastVideoId() {
  let video = await Video.findOne({ channelId: YOUTUBE_CHANNEL_ID });
  if (!video) {
    video = await Video.create({ channelId: YOUTUBE_CHANNEL_ID, lastVideoId: '' });
  }
  return video;
}

// Fonction pour mettre à jour l'ID de la dernière vidéo
async function updateLastVideoId(videoId) {
  await Video.findOneAndUpdate(
    { channelId: YOUTUBE_CHANNEL_ID },
    { lastVideoId: videoId }
  );
}

// Fonction pour envoyer un message via le webhook
async function sendWebhookMessage(message, channelName) {
  try {
    await axios.post(WEBHOOK_URL, {
      content: message, // Contenu du message
      username: channelName,
      avatar_url: process.env.AVATAR_URL
    });
    console.log('Message envoyé via le webhook');
  } catch (error) {
    console.error('Erreur lors de l\'envoi du webhook :', error);
  }
}

// Fonction pour vérifier les nouvelles vidéos
async function checkForNewVideos() {
  try {
    const feed = await parser.parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`);
    const latestVideo = feed.items[0];
    const channelName = feed.title; // Récupère le nom de la chaîne

    const videoData = await getLastVideoId();

    if (latestVideo.id !== videoData.lastVideoId) {
      // Mise à jour de la base de données
      await updateLastVideoId(latestVideo.id);

      // Envoi du message via le webhook
      const message = `🎥 Nouvelle vidéo publiée : **${latestVideo.title}**\n${latestVideo.link}`;
      await sendWebhookMessage(message, channelName);
    }
  } catch (error) {
    console.error('Erreur lors de la vérification des vidéos YouTube :', error);
  }
}

// Lancer la vérification toutes les 5 minutes
setInterval(checkForNewVideos, 5 * 60 * 1000);

// Vérification au démarrage
checkForNewVideos();
