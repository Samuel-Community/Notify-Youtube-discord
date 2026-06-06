const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema(
    {
        channelId:   { type: String, required: true, unique: true },
        lastVideoId: { type: String, default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Channel", channelSchema);