const mongoose = require('mongoose');

const clanSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    founder: { type: String, required: true },
    inventory: {
        metal_base: { type: Number, default: 0 },
        circuitos: { type: Number, default: 0 }
    }
});

module.exports = mongoose.model('Clan', clanSchema);