const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String },
    socketId: { type: String }, 
    clan: { type: String, default: null },
    status: {
        hp: { type: Number, default: 100 },
        maxHp: { type: Number, default: 100 },
        energy: { type: Number, default: 70 },
        maxEnergy: { type: Number, default: 70 },
        level: { type: Number, default: 1 },
        xp: { type: Number, default: 0 }, 
        nextLevelXp: { type: Number, default: 50 }
    },
    hacking: {
        active: { type: Boolean, default: false },
        password: { type: String, default: "" },
        attempts: { type: Number, default: 0 }
    },
    location: {
        world: { type: String, default: 'world_001' },
        x: { type: Number, default: 10 },
        y: { type: Number, default: 10 }
    },
    inventory: {
        metal_base: { type: Number, default: 10 },
        circuitos: { type: Number, default: 2 },
        agua_pura: { type: Number, default: 1 },
        bombas: { type: Number, default: 0 },
        nucleo_energia: {type: Number, default: 0},
        holofita_01: { type: Number, default: 0 },
        camera: { type: Number, default: 0 },
        drone: { type: Number, default: 0 },
        cofre_fechado: { type: Number, default: 0 },
        items: [] 
    },
    quest: {
        active: { type: Boolean, default: false },
        targetId: { type: String, default: null },
        targetName: { type: String, default: "" },
        goal: { type: Number, default: 0 },
        progress: { type: Number, default: 0 },
        rewardCirc: { type: Number, default: 0 }
    },
    equipment: {
        weapon: { 
            name: { type: String, default: "Cano enferrujado" }, 
            atk: { type: Number, default: 8 } 
        },
        armor: { 
            name: { type: String, default: "Trapos de Sobrevivente" }, 
            def: { type: Number, default: 2 } 
        }
    },
    combatState: {
        inCombat: { type: Boolean, default: false },
        enemyId: { type: String, default: null },
        enemyHp: { type: Number, default: 0 },
        turn: { type: String, default: 'player' }
    }
});

module.exports = mongoose.model('Player', PlayerSchema);