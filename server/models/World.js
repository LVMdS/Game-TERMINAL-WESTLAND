const mongoose = require('mongoose');

const WorldChunkSchema = new mongoose.Schema({
    worldId: { type: String, required: true }, 
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    type: { type: String }, 
    dynamicElements: {
        resource: { 
            type: { type: String }, 
            amount: { type: Number },
            respawnTime: { type: Date }
        },
        enemy: {
            type: { type: String },
            hp: { type: Number },
            alive: { type: Boolean, default: true }
        }
    }
});


WorldChunkSchema.index({ worldId: 1, x: 1, y: 1 }, { unique: true });

module.exports = mongoose.model('WorldChunk', WorldChunkSchema);