const mongoose = require('mongoose');

const MineSchema = new mongoose.Schema({
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    world: { type: String, default: 'world_001' },
    owner: { type: String, required: true },
    clan: { type: String, default: null },
    damage: { type: Number, default: 60 }
});

module.exports = mongoose.model('Mine', MineSchema);