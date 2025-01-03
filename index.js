require("dotenv").config();
const axios = require("axios");
const RSSParser = require("rss-parser");
const mongoose = require("mongoose");
const Video = require("./video"); // The Mongoose model for videos

const parser = new RSSParser();

// YouTube channel ID and webhook URL
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

// MongoDB connection
mongoose
  .connect(process.env.MONGODB)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

// Function to get or initialize the last video ID
async function getLastVideoId() {
  let video = await Video.findOne({ channelId: YOUTUBE_CHANNEL_ID });
  if (!video) {
    video = await Video.create({
      channelId: YOUTUBE_CHANNEL_ID,
      lastVideoId: "",
    });
  }
  return video;
}

// Function to update the last video ID
async function updateLastVideoId(videoId) {
  await Video.findOneAndUpdate(
    { channelId: YOUTUBE_CHANNEL_ID },
    { lastVideoId: videoId }
  );
}

// Function to send a message via webhook
async function sendWebhookMessage(message, channelName) {
  try {
    await axios.post(WEBHOOK_URL, {
      content: message, // Message content
      username: channelName,
      avatar_url: process.env.AVATAR_URL,
    });
    console.log("Message sent via webhook");
  } catch (error) {
    console.error("Error sending webhook message:", error);
  }
}

// Function to check for new videos
async function checkForNewVideos() {
  try {
    const feed = await parser.parseURL(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`
    );
    const latestVideo = feed.items[0];
    const channelName = feed.title; // Get the channel name

    const videoData = await getLastVideoId();

    if (latestVideo.id !== videoData.lastVideoId) {
      // Update the database
      await updateLastVideoId(latestVideo.id);

      // Send the message via webhook
      const message = `🎥 New video published: **${latestVideo.title}**\n${latestVideo.link}`;
      await sendWebhookMessage(message, channelName);
    }
  } catch (error) {
    console.error("Error checking YouTube videos:", error);
  }
}

// Run the check every 5 minutes
setInterval(checkForNewVideos, 5 * 60 * 1000);

// Initial check at startup
checkForNewVideos();
