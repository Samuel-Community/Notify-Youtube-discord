const mongoose = require('mongoose');
const videoSchema = new mongoose.Schema({
    channelId: { type: String, }, // ID de la chaîne YouTube
    lastVideoId: { type: String, default: null }, // Par défaut, null
});

module.exports = mongoose.model('Video', videoSchema);
