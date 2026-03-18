const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    socketId: { type: String, default: null },
    clan: { type: String, default: null },
    
    status: {
        level: { type: Number, default: 1 }, xp: { type: Number, default: 0 }, nextLevelXp: { type: Number, default: 100 },
        hp: { type: Number, default: 100 }, maxHp: { type: Number, default: 100 }, energy: { type: Number, default: 100 }, maxEnergy: { type: Number, default: 100 }
    },
    equipment: { weapon: { name: { type: String, default: "Punhos" }, atk: { type: Number, default: 5 } }, armor: { name: { type: String, default: "Traje de Reciclador" }, def: { type: Number, default: 2 } } },
    
    inventory: {
        metal_base: { type: Number, default: 10 }, circuitos: { type: Number, default: 0 }, agua_pura: { type: Number, default: 2 },
        estimulante: { type: Number, default: 0 }, bombas: { type: Number, default: 0 }, minas: { type: Number, default: 0 },
        nucleo_energia: { type: Number, default: 0 }, holofita_01: { type: Number, default: 0 }, camera: { type: Number, default: 0 },
        drone: { type: Number, default: 0 }, cofre_fechado: { type: Number, default: 0 }, bio_chips: { type: Number, default: 0 },
        cofre_dourado: { type: Number, default: 0 } // NOVO: Loot Supremo do Bunker
    },

    implants: { pernas: { type: Boolean, default: false }, optica: { type: Boolean, default: false }, exoesqueleto: { type: Boolean, default: false } },
    
    // NOVAS MECÂNICAS (V2.2)
    pet: { active: { type: Boolean, default: false }, level: { type: Number, default: 1 }, xp: { type: Number, default: 0 } },
    vehicle: { moto: { type: Boolean, default: false } },
    dungeon: { active: { type: Boolean, default: false }, wave: { type: Number, default: 0 } },

    bounty: { type: Number, default: 0 },
    hacking: { active: { type: Boolean, default: false }, password: { type: String, default: "" }, attempts: { type: Number, default: 0 } },
    location: { world: { type: String, default: 'world_001' }, x: { type: Number, default: 0 }, y: { type: Number, default: 0 }, event: { type: String, default: null } },
    combatState: { inCombat: { type: Boolean, default: false }, enemyId: { type: String, default: null }, enemyHp: { type: Number, default: 0 } },
    quest: { active: { type: Boolean, default: false }, targetId: { type: String, default: null }, targetName: { type: String, default: "" }, goal: { type: Number, default: 0 }, progress: { type: Number, default: 0 }, rewardCirc: { type: Number, default: 0 } }
});

module.exports = mongoose.model('Player', PlayerSchema);