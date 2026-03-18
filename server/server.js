const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const path = require('path');

const Player = require('./models/Player');
const Base = require('./models/Base'); 
const parser = require('./logic/commandParser');
const ascii = require('./logic/asciiLibrary');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;
const MONGO_URI = 'mongodb://127.0.0.1:27017/terminal_wasteland'; 

app.use(express.static(path.join(__dirname, '../client')));

mongoose.connect(MONGO_URI)
  .then(() => console.log('[SYSTEM] Conectado ao MongoDB Local.'))
  .catch(err => console.error('[SYSTEM] Erro MongoDB:', err));

// ==========================================
// GHOST ENGINE - A ILUSÃO SINGLE PLAYER
// ==========================================
const botNames = ['LoboSolitario', 'CyberNinja99', 'Ghost', 'Viper', 'Sucateiro_Maluco', 'Kakaroto_Fake'];
const botMessages = [
    "Alguém vendendo água pura perto do [0,0]?",
    "Vi o Leviatã nas Planícies, fujam pra base!",
    "Quem foi o maldito que plantou uma mina no norte?",
    "Compro circuitos, pago bem.",
    "A radiação tá subindo de novo... cuidado fora dos bunkers.",
    "Tomei um tiro de raspão de um Andarilho de Ferro, quase fui pro saco."
];

// Rádio Global Falso
setInterval(() => {
    if(Math.random() > 0.5) {
        const bot = botNames[Math.floor(Math.random() * botNames.length)];
        const msg = botMessages[Math.floor(Math.random() * botMessages.length)];
        io.emit('output', `\r\n\x1b[1;36m[RÁDIO GLOBAL] ${bot} grita: "${msg}"\x1b[0m\r\n> `);
    }
}, 3 * 60 * 1000);

// Invasão de Base Simulada 
setInterval(async () => {
    const bases = await Base.find({});
    if(bases.length > 0 && Math.random() > 0.6) {
        const baseAlvo = bases[Math.floor(Math.random() * bases.length)];
        const botInvasor = botNames[Math.floor(Math.random() * botNames.length)];
        
        const defBase = (baseAlvo.defenseLevel || 0) * 15;
        const ataqueBot = 20 + Math.floor(Math.random() * 40); 
        
        io.emit('play_audio', 'alarm'); 
        io.emit('output', `\r\n\x1b[1;41;37m [ ALERTA DE SEGURANÇA ] A SUA BASE '${baseAlvo.name}' ESTÁ SOB ATAQUE DO SAQUEADOR '${botInvasor}'! \x1b[0m\r\n> `);
        
        setTimeout(async () => {
            const baseAtualizada = await Base.findById(baseAlvo._id);
            if(baseAtualizada) {
                if (ataqueBot > defBase) {
                    const roubo = Math.floor(Math.random() * 50) + 10;
                    baseAtualizada.inventory.metal_base = Math.max(0, baseAtualizada.inventory.metal_base - roubo);
                    baseAtualizada.securityLogs.push(`[${new Date().toLocaleTimeString()}] ALERTA CRÍTICO: ${botInvasor} invadiu e roubou ${roubo} sucata.`);
                    io.emit('output', `\r\n\x1b[31m[SISTEMA DE BASE] As suas defesas falharam! ${botInvasor} fugiu com ${roubo} sucata do seu cofre.\x1b[0m\r\n> `);
                } else {
                    baseAtualizada.securityLogs.push(`[${new Date().toLocaleTimeString()}] SAQUEADOR NEUTRALIZADO: As torretas fuzilaram ${botInvasor}.`);
                    io.emit('output', `\r\n\x1b[32m[SISTEMA DE BASE] As torretas fuzilaram ${botInvasor}! O cofre está seguro.\x1b[0m\r\n> `);
                }
                await baseAtualizada.save();
            }
        }, 5000);
    }
}, 10 * 60 * 1000);

// ==========================================
// EVENTOS GLOBAIS
// ==========================================
global.mundo = { periodo: 'DIA', clima: 'LIMPO' };
global.worldBoss = { active: false, name: 'LEVIATÃ DE FERRO', hp: 0, maxHp: 5000, x: 0, y: 0, world: 'world_002' };
global.nomade = { active: false, x: 0, y: 0, world: 'world_001', item: 'sniper', preco: 500, atk: 50 };
global.airdrop = { active: false, x: 0, y: 0, world: 'world_001' };

setInterval(() => {
    if (global.mundo.periodo === 'DIA') {
        global.mundo.periodo = 'NOITE';
        io.emit('output', `\r\n\x1b[1;34m[SISTEMA GLOBAL] O sol põe-se. A temperatura cai e as sombras ganham vida.\x1b[0m\r\n> `);
    } else {
        global.mundo.periodo = 'DIA';
        io.emit('output', `\r\n\x1b[1;33m[SISTEMA GLOBAL] O sol nasce, iluminando a poeira radioativa.\x1b[0m\r\n> `);
    }
}, 30 * 60 * 1000); 

setInterval(() => {
    if (Math.random() > 0.7 && global.mundo.clima === 'LIMPO') {
        global.mundo.clima = 'TEMPESTADE_RAD';
        io.emit('play_audio', 'alarm'); 
        io.emit('output', `\r\n\x1b[1;41;37m [ ALERTA METEOROLÓGICO ] TEMPESTADE DE RADIAÇÃO APROXIMA-SE! \x1b[0m\r\n> `);
        setTimeout(() => {
            global.mundo.clima = 'LIMPO';
            io.emit('output', `\r\n\x1b[1;32m[ALERTA METEOROLÓGICO] A tempestade dissipou-se.\x1b[0m\r\n> `);
        }, 5 * 60 * 1000);
    }
}, 15 * 60 * 1000);

setInterval(() => {
    if (!global.worldBoss.active && Math.random() > 0.7) { 
        global.worldBoss.active = true; global.worldBoss.hp = global.worldBoss.maxHp;
        global.worldBoss.x = Math.floor(Math.random() * 20) - 10; global.worldBoss.y = Math.floor(Math.random() * 20) - 10; 
        io.emit('play_audio', 'boss'); 
        io.emit('output', `\r\n\x1b[1;41;37m [ ALERTA VERMELHO ] O ${global.worldBoss.name} emergiu em [${global.worldBoss.x}, ${global.worldBoss.y}] (world_002)!\x1b[0m\r\n> `);
    }
}, 45 * 60 * 1000);

setInterval(() => {
    if (!global.airdrop.active && Math.random() > 0.6) {
        global.airdrop.active = true; global.airdrop.world = Math.random() > 0.5 ? 'world_001' : 'world_002';
        global.airdrop.x = Math.floor(Math.random() * 30) - 15; global.airdrop.y = Math.floor(Math.random() * 30) - 15;
        io.emit('play_audio', 'alarm'); 
        io.emit('output', `\r\n\x1b[1;45;37m [ EVENTO DE SATÉLITE ] UM SATÉLITE CAIU EM [${global.airdrop.x}, ${global.airdrop.y}] NO ${global.airdrop.world.toUpperCase()}! \x1b[0m\r\n> `);
    }
}, 50 * 60 * 1000);

setInterval(() => {
    if (!global.nomade.active && Math.random() > 0.5) {
        global.nomade.active = true; global.nomade.x = Math.floor(Math.random() * 20) - 10; global.nomade.y = Math.floor(Math.random() * 20) - 10;
        const itens = [ { name: 'sniper', price: 500, atk: 50 }, { name: 'bomba_nuclear', price: 1000, atk: 0 }, { name: 'nucleo_energia', price: 300, atk: 0 } ];
        const oferta = itens[Math.floor(Math.random() * itens.length)];
        global.nomade.item = oferta.name; global.nomade.preco = oferta.price; global.nomade.atk = oferta.atk;
        io.emit('play_audio', 'bounty');
        io.emit('output', `\r\n\x1b[1;36m[RÁDIO] O Nômade armou a sua tenda no Mercado Negro em [${global.nomade.x}, ${global.nomade.y}]! Vendendo: ${global.nomade.item.toUpperCase()}!\x1b[0m\r\n> `);
    } else if (global.nomade.active) {
        global.nomade.active = false; io.emit('output', `\r\n\x1b[33m[RÁDIO] O Nômade sumiu na névoa...\x1b[0m\r\n> `);
    }
}, 60 * 60 * 1000);

// --- LÓGICA DO SOCKET.IO (Tempo Real) ---
io.on('connection', (socket) => {
    console.log(`[CONN] Nova conexão: ${socket.id}`);

    socket.emit('output', '\x1b[1;32m[SYSTEM] Inicializando BIOS do Terminal...\r\n[==        ] 20%\r\n\x1b[0m');
    setTimeout(() => { socket.emit('output', '\x1b[1;32m[======    ] 60% - Carregando Módulo Ghost...\r\n\x1b[0m'); }, 500);
    setTimeout(() => {
        const welcomeLines = [ "CONEXÃO ESTABELECIDA. MODO OFFLINE ATIVADO.", "O mainframe simula vida, mas você está sozinho.", "-----------------------------------------------", "► Novo Sobrevivente : registrar <nome> <senha>", "► Acesso Autorizado : login <nome> <senha>" ];
        socket.emit('output', '\x1b[1;32m[==========] 100% - OK.\r\n\x1b[0m' + '\x1b[1;32m' + ascii.drawBox("WASTELAND OS v2.0 (GHOST EDITION)", welcomeLines) + '\x1b[0m> ');
    }, 1200);

    let currentPlayer = null;

    socket.on('command', async (cmdString) => {
        const output = []; output.push(`\r\n> ${cmdString}`); 
        const args = cmdString.trim().split(' '); const command = args[0].toLowerCase();

        if (command === 'registrar') {
            const username = args[1]; const password = args[2];
            if (!username || !password) output.push(`[SISTEMA] Uso: registrar <nome> <senha>`);
            else {
                try {
                    const existe = await Player.findOne({ username });
                    if (existe) output.push(`[ERRO] O nome '${username}' já está em uso.`);
                    else {
                        currentPlayer = new Player({ username, password, socketId: socket.id, inventory: { metal_base: 10, circuitos: 0, agua_pura: 2, bombas: 0 } });
                        await currentPlayer.save();
                        output.push(`\x1b[32m[SISTEMA] Bem-vindo(a) ao Wasteland, ${username}.\x1b[0m`);
                        socket.broadcast.emit('output', `\r\n[RÁDIO] Um novo sobrevivente (${username}) conectou-se.\r\n> `);
                    }
                } catch (err) { output.push(`[ERRO] Falha no registo.`); }
            }
        } 
        else if (command === 'login') {
            const username = args[1]; const password = args[2];
            if (!username || !password) output.push(`[SISTEMA] Uso: login <nome> <senha>`);
            else {
                try {
                    let player = await Player.findOne({ username });
                    if (!player) output.push(`[ERRO] Jogador não encontrado.`);
                    else if (player.password && player.password !== password) output.push(`\x1b[31m[ERRO] Senha incorreta.\x1b[0m`);
                    else {
                        if (!player.password) player.password = password;
                        player.socketId = socket.id; await player.save(); currentPlayer = player;
                        output.push(`\x1b[32m[SISTEMA] Autenticação confirmada. Bem-vindo, ${username}.\x1b[0m`);
                    }
                } catch (err) { output.push(`[ERRO] Falha no login.`); }
            }
        } 
        else if (currentPlayer) {
            currentPlayer = await Player.findById(currentPlayer._id);
            const result = await parser.process(currentPlayer, command, args, io);
            output.push(result.text); currentPlayer = result.playerData; 
        } else output.push(`[AVISO] Você precisa fazer 'login <nome>' primeiro.`);
        socket.emit('output', output.join('\r\n') + '\r\n> ');
    });

    socket.on('disconnect', () => {
        if(currentPlayer) io.emit('output', `\r\n[SYSMSG] ${currentPlayer.username} desconectou.\r\n> `);
        console.log(`[CONN] Desconectado: ${socket.id}`);
    });
});

server.listen(PORT, () => { console.log(`[SYSTEM] Servidor Wasteland (Ghost Edition) rodando na porta ${PORT}`); });
function adminLog(tipo, mensagem) { console.log(`[${new Date().toLocaleTimeString()}] [${tipo}] ${mensagem}`); }
global.adminLog = adminLog;