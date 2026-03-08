const mongoose = require('mongoose');

const BaseSchema = new mongoose.Schema({
    owner: { type: String, required: true },
    name: { type: String, default: 'Base Segura' },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    inventory: {
        metal_base: { type: Number, default: 0 },
        circuitos: { type: Number, default: 0 }
    },
    defenseLevel: { type: Number, default: 0 },
    cameras: {type: Number, defaul: 0},
    extratores: { type: Number, default: 0 },
    lastExtracted: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Base', BaseSchema);