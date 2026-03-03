const mongoose = require('mongoose');

const BaseSchema = new mongoose.Schema({
    owner: { type: String, required: true },
    name: { type: String, default: 'Base Segura' },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    inventory: {
        metal_base: { type: Number, default: 0 },
        circuitos: { type: Number, default: 0 }
    }
});

module.exports = mongoose.model('Base', BaseSchema);