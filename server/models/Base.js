const mongoose = require('mongoose');

const BaseSchema = new mongoose.Schema({
    owner: { type: String, required: true },
    name: { type: String, default: 'Base Segura' },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    inventory: {
        metal_base: { type: Number, default: 0 },
        circuitos: { type: Number, default: 0 },
        agua_pura: { type: Number, default: 0 },
        bombas: { type: Number, default: 0 },
        nucleo_energia: { type: Number, default: 0 },
        holofita_01: { type: Number, default: 0 },
        cofre_fechado: { type: Number, default: 0 },
        bio_chips: { type: Number, default: 0 },
        camera: { type: Number, default: 0 },
        drone: { type: Number, default: 0 }
    },
    // --- CAMPOS DO SISTEMA DE DEFESA E INDÚSTRIA ---
    defenseLevel: { type: Number, default: 0 }, 
    cameras: { type: Number, default: 0 },       
    extratores: { type: Number, default: 0 },
    lastExtracted: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Base', BaseSchema);