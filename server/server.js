const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const path = require('path');


const Player = require('./models/Player');
const WorldChunk = require('./models/World');
const parser = require('./logic/commandParser');
const ascii = require('./logic/asciiLibrary');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- CONFIGURAÇÃO ---
const PORT = process.env.PORT || 3000;
const MONGO_URI = 'mongodb://127.0.0.1:27017/terminal_wasteland'; 


app.use(express.static(path.join(__dirname, '../client')));

// --- CONEXÃO BANCO DE DADOS ---
mongoose.connect(MONGO_URI)
  .then(() => console.log('[SYSTEM] Conectado ao MongoDB.'))
  .catch(err => console.error('[SYSTEM] Erro MongoDB:', err));

// ==========================================
// CICLO DIA/NOITE E CLIMA GLOBAL
// ==========================================
global.mundo = { periodo: 'DIA', clima: 'LIMPO' };

setInterval(() => {
    if (global.mundo.periodo === 'DIA') {
        global.mundo.periodo = 'NOITE';
        io.emit('output', `\r\n\x1b[1;34m[SISTEMA GLOBAL] O sol põe-se. A temperatura cai e as sombras da Zona Morta ganham vida. (Monstros mais fortes, maior chance de loot!)\x1b[0m\r\n> `);
    } else {
        global.mundo.periodo = 'DIA';
        io.emit('output', `\r\n\x1b[1;33m[SISTEMA GLOBAL] O sol nasce, iluminando a poeira radioativa. A superfície está mais calma.\x1b[0m\r\n> `);
    }
}, 30 * 60 * 1000); 

setInterval(() => {
    if (Math.random() > 0.7 && global.mundo.clima === 'LIMPO') {
        global.mundo.clima = 'TEMPESTADE_RAD';
        io.emit('output', `\r\n\x1b[1;41;37m [ ALERTA METEOROLÓGICO ] TEMPESTADE DE RADIAÇÃO APROXIMA-SE! PROCUREM ABRIGO NUMA BASE IMEDIATAMENTE! \x1b[0m\r\n> `);
        
        setTimeout(() => {
            global.mundo.clima = 'LIMPO';
            io.emit('output', `\r\n\x1b[1;32m[ALERTA METEOROLÓGICO] A tempestade dissipou-se. O ar está respirável novamente.\x1b[0m\r\n> `);
        }, 5 * 60 * 1000);
    }
}, 15 * 60 * 1000);

// --- LÓGICA DO SOCKET.IO (Tempo Real) ---
io.on('connection', (socket) => {
    console.log(`[CONN] Nova conexão: ${socket.id}`);

    
    socket.emit('output', '\x1b[1;32m[SYSTEM] Inicializando BIOS do Terminal...\r\n[==        ] 20%\r\n\x1b[0m');
    
    setTimeout(() => {
        socket.emit('output', '\x1b[1;32m[======    ] 60% - Carregando drivers de rede...\r\n\x1b[0m');
    }, 500);

    setTimeout(() => {
        const welcomeLines = [
            "CONEXÃO ESTABELECIDA COM A REDE SECUNDÁRIA.",
            "A humanidade caiu, mas o mainframe sobrevive.",
            "-----------------------------------------------",
            "PROTOCOLO DE IDENTIFICAÇÃO ATIVADO:",
            "",
            "► Novo Sobrevivente : registrar <nome> <senha>",
            "► Acesso Autorizado : login <nome> <senha>"
        ];
        socket.emit('output', '\x1b[1;32m[==========] 100% - OK.\r\n\x1b[0m' + '\x1b[1;32m' + ascii.drawBox("TERMINAL WASTELAND OS v1.0", welcomeLines) + '\x1b[0m> ');
    }, 1200);
    let currentPlayer = null;

    
    socket.on('command', async (cmdString) => {
        const output = [];
        
        output.push(`\r\n> ${cmdString}`); 

        const args = cmdString.trim().split(' ');
        const command = args[0].toLowerCase();

        // ==========================================
        // LÓGICA DE REGISTRO (COM KIT INICIAL)
        // ==========================================
        if (command === 'registrar') {
            const username = args[1];
            const password = args[2];
            
            if (!username || !password) {
                output.push(`[SISTEMA] Uso correto: registrar <nome> <senha>`);
            } else {
                try {
                    const existe = await Player.findOne({ username });
                    if (existe) {
                        output.push(`[ERRO] O nome '${username}' já está em uso.`);
                    } else {
                        
                        currentPlayer = new Player({ 
                            username, 
                            password, 
                            socketId: socket.id,
                            inventory: {
                                metal_base: 10,    
                                circuitos: 0,
                                agua_pura: 2,      
                                bombas: 0
                            }
                        });
                        await currentPlayer.save();

                        if (typeof adminLog === 'function') {
                            adminLog('CONEXAO', `Novo sobrevivente: ${username} registado com Kit Inicial.`);
                        }

                        output.push(`\x1b[32m[SISTEMA] Registo concluído! Bem-vindo(a) ao Wasteland, ${username}.\x1b[0m`);
                        output.push(`\x1b[35m[BÔNUS] Você recebeu 10x Sucata e 2x Água Pura como Kit Inicial!\x1b[0m`);
                        
                        socket.broadcast.emit('output', `\r\n[RÁDIO] Um novo sobrevivente (${username}) juntou-se à rede.\r\n> `);
                    }
                } catch (err) {
                    output.push(`[ERRO] Falha no registo: ${err.message}`);
                }
            }
        }
        
        // ==========================================
        // LÓGICA DE LOGIN
        // ==========================================
        else if (command === 'login') {
            const username = args[1];
            const password = args[2];
            
            if (!username || !password) {
                output.push(`[SISTEMA] Uso correto: login <nome> <senha>`);
            } else {
                try {
                    let player = await Player.findOne({ username });
                    if (!player) {
                        output.push(`[ERRO] Jogador não encontrado. Digite 'registrar <nome> <senha>' para criar conta.`);
                    } else if (player.password && player.password !== password) {
                        output.push(`\x1b[31m[ERRO] Senha incorreta. Acesso negado.\x1b[0m`);
                    } else {
                        if (!player.password) player.password = password;
                        
                        player.socketId = socket.id;
                        await player.save();
                        currentPlayer = player;

                        if (typeof adminLog === 'function') {
                            adminLog('CONEXAO', `Jogador ${username} fez login.`);
                        }

                        output.push(`\x1b[32m[SISTEMA] Autenticação confirmada. Bem-vindo de volta, ${username}.\x1b[0m`);
                    }
                } catch (err) {
                    output.push(`[ERRO] Falha no login: ${err.message}`);
                }
            }
        } 
        
        // ==========================================
        // LÓGICA DE COMANDOS DO JOGO (PARSER)
        // ==========================================
        else if (currentPlayer) {
        
            currentPlayer = await Player.findById(currentPlayer._id);
            
            const result = await parser.process(currentPlayer, command, args, io);
            output.push(result.text);
            currentPlayer = result.playerData; 
        } 
        else {
            output.push(`[AVISO] Você precisa fazer 'login <nome>' primeiro.`);
        }


        socket.emit('output', output.join('\r\n') + '\r\n> ');
    });

    socket.on('disconnect', () => {
        if(currentPlayer) {
            io.emit('output', `\r\n[SYSMSG] ${currentPlayer.username} desconectou.\r\n> `);
        }
        console.log(`[CONN] Desconectado: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`[SYSTEM] Servidor Wasteland rodando na porta ${PORT}`);
});

function adminLog(tipo, mensagem) {
    const agora = new Date().toLocaleTimeString();
    let cor = "\x1b[37m"; 

    switch(tipo) {
        case 'CONEXAO': cor = "\x1b[32m"; break; 
        case 'COMBATE': cor = "\x1b[31m"; break; 
        case 'BASE':    cor = "\x1b[33m"; break; 
        case 'ADMIN':   cor = "\x1b[35m"; break; 
        case 'SISTEMA': cor = "\x1b[36m"; break; 
    }

    console.log(`${cor}[${agora}] [${tipo}] ${mensagem}\x1b[0m`);
}

global.adminLog = adminLog;