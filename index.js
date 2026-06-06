require("dotenv").config();
const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { XMLParser } = require("fast-xml-parser");
const Channel = require("./channel");

const app = express();
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

const HUB_URL = "https://pubsubhubbub.appspot.com/subscribe";
const LEASE_SECONDS = 86400;

// ─── Config ───────────────────────────────────────────────────────────────────
// YOUTUBE_CHANNELS est un tableau JSON dans le .env :
// [{"channelId":"UCxxx","roleToMention":"123456","avatarUrl":"https://..."}]

const WEBHOOK_URL = process.env.WEBHOOK_URL;
const CALLBACK_BASE_URL = process.env.CALLBACK_URL; // ex: https://xxxx.ngrok-free.app
const HUB_SECRET = process.env.HUB_SECRET || "";
const PORT = process.env.PORT || 3000;

let YOUTUBE_CHANNELS = [];
try {
    YOUTUBE_CHANNELS = JSON.parse(process.env.YOUTUBE_CHANNELS || "[]");
} catch {
    console.error("[Config] ❌ YOUTUBE_CHANNELS invalide dans .env — doit être un tableau JSON");
    process.exit(1);
}

const required = ["WEBHOOK_URL", "CALLBACK_URL", "MONGODB", "YOUTUBE_CHANNELS"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
    console.error(`[Config] ❌ Variables manquantes dans .env : ${missing.join(", ")}`);
    process.exit(1);
}

// ─── MongoDB ──────────────────────────────────────────────────────────────────

mongoose
    .connect(process.env.MONGODB)
    .then(() => console.log("[MongoDB] ✅ Connecté"))
    .catch((err) => {
        console.error("[MongoDB] ❌ Erreur de connexion :", err.message);
        process.exit(1);
    });

// ─── Anti-doublon ─────────────────────────────────────────────────────────────

async function isVideoAlreadySent(channelId, videoId) {
    const doc = await Channel.findOne({ channelId });
    return doc?.lastVideoId === videoId;
}

async function markVideoSent(channelId, videoId) {
    await Channel.findOneAndUpdate(
        { channelId },
        { lastVideoId: videoId },
        { upsert: true }
    );
}

// ─── Discord ──────────────────────────────────────────────────────────────────

async function sendWebhookMessage(message, channelName, avatarUrl, mention = "") {
    const content = mention ? `${mention}\n${message}` : message;
    try {
        await axios.post(WEBHOOK_URL, {
            content,
            username: channelName,
            avatar_url: avatarUrl || null,
        });
        console.log(`[Discord] ✅ Notification envoyée pour ${channelName}`);
    } catch (err) {
        console.error("[Discord] ❌ Erreur webhook :", err.message);
    }
}

// ─── PubSubHubbub ─────────────────────────────────────────────────────────────

async function subscribe(channelId) {
    const topicUrl = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`;
    const callbackUrl = `${CALLBACK_BASE_URL}/youtube/callback`;

    try {
        await axios.post(HUB_URL, new URLSearchParams({
            "hub.mode": "subscribe",
            "hub.topic": topicUrl,
            "hub.callback": callbackUrl,
            "hub.lease_seconds": String(LEASE_SECONDS),
            "hub.secret": HUB_SECRET,
        }), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        console.log(`[PubSub] 📡 Abonné à la chaîne ${channelId}`);
    } catch (err) {
        console.error(`[PubSub] ❌ Erreur subscribe ${channelId} :`, err.response?.data || err.message);
    }
}

async function subscribeAll() {
    for (const channel of YOUTUBE_CHANNELS) {
        await subscribe(channel.channelId);
    }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Vérification WebSub (GET)
app.get("/youtube/callback", (req, res) => {
    const { "hub.challenge": challenge, "hub.mode": mode } = req.query;
    console.log(`[PubSub] 🤝 Vérification WebSub (${mode})`);
    res.status(200).send(challenge);
});

// Réception d'une nouvelle vidéo (POST)
app.post("/youtube/callback", express.text({ type: "application/atom+xml" }), async (req, res) => {
    res.sendStatus(200); // Toujours répondre 200 rapidement

    try {
        // Vérification signature HMAC si HUB_SECRET configuré
        if (HUB_SECRET) {
            const signature = req.headers["x-hub-signature"];
            const expected = "sha1=" + crypto
                .createHmac("sha1", HUB_SECRET)
                .update(req.body)
                .digest("hex");

            if (signature !== expected) {
                console.warn("[PubSub] ⚠️ Signature invalide, push ignoré.");
                return;
            }
        }

        const data = parser.parse(req.body);
        const entry = data?.feed?.entry;
        if (!entry) return; // Ping de test ou suppression

        const videoId = entry["yt:videoId"];
        const title = entry.title;
        const link = entry.link?.["@_href"] || `https://www.youtube.com/watch?v=${videoId}`;
        const channelId = entry["yt:channelId"];
        const channelName = entry.author?.name || "YouTube";

        if (await isVideoAlreadySent(channelId, videoId)) {
            console.log(`[PubSub] ℹ️ Vidéo ${videoId} déjà notifiée.`);
            return;
        }
        await markVideoSent(channelId, videoId);

        const channelConfig = YOUTUBE_CHANNELS.find((c) => c.channelId === channelId);
        const mention = channelConfig?.roleToMention ? `<@&${channelConfig.roleToMention}>` : "";
        const avatarUrl = channelConfig?.avatarUrl || "";

        const message = `🎥 Nouvelle vidéo publiée sur **${channelName}** : **${title}**\n${link}`;
        await sendWebhookMessage(message, channelName, avatarUrl, mention);

    } catch (err) {
        console.error("[PubSub] ❌ Erreur traitement push :", err);
    }
});

// ─── Démarrage ────────────────────────────────────────────────────────────────

app.listen(PORT, async () => {
    console.log(`[Server] 🚀 En écoute sur le port ${PORT}`);
    if (CALLBACK_BASE_URL.includes("ngrok")) {
        console.log(`[ngrok] ⚠️  L'URL change à chaque redémarrage — pense à mettre à jour CALLBACK_URL dans .env`);
    }
    await subscribeAll();
    setInterval(subscribeAll, 23 * 60 * 60 * 1000);
});