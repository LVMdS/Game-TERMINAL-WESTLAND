const ascii = require('./asciiLibrary');
const Base = require('../models/Base');
const Player = require('../models/Player');

const parser = {
    process: async (player, command, args, io) => {
        let responseText = "";

        // ==========================================
        // SISTEMA 1: TRAVA DE COMBATE (Turnos)
        // ==========================================
        if (player.combatState.inCombat) {
            const enemyKey = player.combatState.enemyId;
            const enemy = ascii.enemies[enemyKey];

            if (command === 'atacar') {
                
                const seuDano = player.equipment.weapon.atk + Math.floor(Math.random() * 4);
                player.combatState.enemyHp -= seuDano;
                responseText = `\x1b[33m[COMBATE] Você ataca com ${player.equipment.weapon.name} e causa ${seuDano} de dano!\x1b[0m\n`;

                if (player.combatState.enemyHp <= 0) {
                    
                  const xpGanha = enemy.xpReward || 20;
                    player.status.xp += xpGanha;
                    
                    responseText += `\x1b[32m[VITÓRIA] O ${enemy.name} foi destruído!\x1b[0m\n`;
                    responseText += `[LOOT] Você encontrou: 5x metal_base | \x1b[36m+${xpGanha} XP\x1b[0m\n`;
                    player.inventory.metal_base += 5;
                    player.combatState.inCombat = false;
                    player.combatState.enemyId = null;

                 
                    if (player.status.xp >= player.status.nextLevelXp) {
                        player.status.level += 1;
                        player.status.xp -= player.status.nextLevelXp;
                        player.status.nextLevelXp = Math.floor(player.status.nextLevelXp * 1.5); 
                        player.status.maxHp += 20;
                        player.status.hp = player.status.maxHp; 
                        player.status.maxEnergy += 10;
                        player.status.energy = player.status.maxEnergy;
                        
                        responseText += `\n\x1b[1;33m*** LEVEL UP! ***\x1b[0m\n`;
                        responseText += `\x1b[33mVocê alcançou o NÍVEL ${player.status.level}! HP Máximo: ${player.status.maxHp} | Energia Máxima: ${player.status.maxEnergy}\x1b[0m\n`;
                    }
                } else {
                   
                    const danoInimigo = Math.max(0, enemy.atk - player.equipment.armor.def + Math.floor(Math.random() * 3));
                    player.status.hp -= danoInimigo;
                    responseText += `\x1b[31m[COMBATE] O ${enemy.name} revida e causa ${danoInimigo} de dano!\x1b[0m\n`;
                    responseText += `-----------------------------------------------\n`;
                    responseText += `HP INIMIGO: ${player.combatState.enemyHp}/${enemy.baseHp} | SEU HP: ${player.status.hp}/${player.status.maxHp}\n`;

                    if (player.status.hp <= 0) {
                        responseText += `\n\x1b[31m[SISTEMA] ALERTA CRÍTICO: SINAIS VITAIS PERDIDOS.\x1b[0m\n`;
                        responseText += `[SISTEMA] Clonagem de emergência ativada. Você renasceu na base.\n`;
                        player.status.hp = player.status.maxHp;
                        player.location.x = 10;
                        player.location.y = 10;
                        player.combatState.inCombat = false;
                    }
                }
                await player.save();
                return { text: responseText, playerData: player };
            } 
            else if (command === 'fugir') {
                player.combatState.inCombat = false;
                player.combatState.enemyId = null;
                responseText = `[COMBATE] Você fugiu para as sombras. Covarde, mas vivo.`;
                await player.save();
                return { text: responseText, playerData: player };
            } 
            else {
                return { text: `\x1b[31m[SISTEMA] Você está em combate! Comandos permitidos: 'atacar', 'fugir'.\x1b[0m`, playerData: player };
            }
        }

        // ==========================================
        // MODO LIVRE (Exploração, Crafting, Movimento)
        // ==========================================
        switch(command) {
          case 'online':
    
                const playersOnline = await Player.find({ socketId: { $ne: null } });
                let lista = playersOnline.map(p => `• ${p.username} (Nível ${p.status.level})`).join('\n');
                responseText = ascii.drawBox("SOBREVIVENTES ONLINE", [lista || "Ninguém online no momento."]);
                break;
          case 'ajuda':
                responseText = ascii.drawBox("COMANDOS DO SISTEMA", [
                    "status                - Exibe atributos, nível e inventário",
                    "mapa                  - Exibe o radar local e bases",
                    "norte/sul/leste/oeste - Navega pelo mapa",
                    "explorar              - Busca loot ou inimigos (Custa 5 Eng)",
                    "mercado               - Abre a loja da Zona Morta",
                    "comprar [item]        - Adquire um item do mercado",
                    "usar [item]           - Consome um item",
                    "reciclar              - Transforma 5 sucata em 1 circuito",
                    "craft [item]          - Forja itens (ex: craft faca, craft bomba)",,
                    "construir base        - Cria zona segura (50 suc, 10 circ)",
                    "defender              - Instala torretas na base (Custa 30 suc, 5 circ)",
                    "viajar [world_001/2]  - Viaja entre mapas (world_002 exige Lvl 5)",
                    "ranking               - Mostra os 5 jogadores mais fortes",
                    "base depositar [qtd]  - Guarda sucata na tua base",
                    "base sacar [qtd]      - Retira sucata da tua base",
                    "clan criar [nome]     - Funda uma fação (Custa 5 circuitos)",
                    "clan juntar [nome]    - Entra numa fação existente",
                    "invadir               - Ataca base inimiga (Usa bomba se tiveres)",
                    "clan / limpar / gritar- Comandos sociais e de sistema"
                ]);
                break;

            case 'status':
    
                const statusLines = [
                    `Nível: ${player.status.level}  |  XP: ${player.status.xp}`,
                    `HP: ${player.status.hp}/100  |  Energia: ${player.status.energy}/100`,
                    `-------------------------------------------`,
                    `ARMA: ${player.equipment.weapon.name} (ATK: ${player.equipment.weapon.atk})`,
                    `-------------------------------------------`,
                    `INVENTÁRIO DE RECURSOS:`,
                    `> Sucata (metal_base): ${player.inventory.metal_base}`,
                    `> Circuitos          : ${player.inventory.circuitos}`,
                    `> Água Pura          : ${player.inventory.agua_pura}`,
                    `-------------------------------------------`,
                    `EQUIPAMENTO ESPECIAL:`,
                    `> Bombas Caseiras    : ${player.inventory.bombas || 0} unit.`, 
                    `-------------------------------------------`,
                    `CLÃ: ${player.clan || 'Sem afiliação'}`
                ];

                responseText = ascii.drawBox(`STATUS DE ${player.username.toUpperCase()}`, statusLines);
                break;
            
            case 'construir':
                if (args[1] === 'base') {
                    if (player.inventory.metal_base >= 50 && player.inventory.circuitos >= 10) {
                        const baseExistente = await Base.findOne({ x: player.location.x, y: player.location.y });
                        if (baseExistente) {
                            responseText = `\x1b[31m[ERRO] Já existe uma base nestas coordenadas!\x1b[0m`;
                            break;
                        }
                        player.inventory.metal_base -= 50;
                        player.inventory.circuitos -= 10;
                        await new Base({ owner: player.username, name: `Base de ${player.username}`, x: player.location.x, y: player.location.y }).save();
                        responseText = `\x1b[32m[ENGENHARIA] Estrutura concluída! Construíste uma Base Segura em [${player.location.x}, ${player.location.y}].\x1b[0m`;
                    } else {
                        responseText = `\x1b[31m[ERRO] Recursos insuficientes. Precisas de 50x metal_base e 10x circuitos.\x1b[0m`;
                    }
                } else {
                    responseText = `[USO] Digite 'construir base'`;
                }
                break;
                case 'base':
                const acaoBase = args[1];
                const qtd = parseInt(args[2]);
                const minhaBase = await Base.findOne({ x: player.location.x, y: player.location.y });

                if (!minhaBase || minhaBase.owner !== player.username) {
                    responseText = `\x1b[31m[ERRO] Não estás dentro da tua base para aceder ao cofre.\x1b[0m`;
                    break;
                }

                if (acaoBase === 'status') {
                    responseText = ascii.drawBox(`COFRE: ${minhaBase.name}`, [
                        `Sucata (metal_base): ${minhaBase.inventory.metal_base}`,
                        `Circuitos          : ${minhaBase.inventory.circuitos}`
                    ]);
                } 
                else if (acaoBase === 'depositar' && qtd > 0) {
                    if (player.inventory.metal_base >= qtd) {
                        player.inventory.metal_base -= qtd;
                        minhaBase.inventory.metal_base += qtd;
                        await minhaBase.save();
                        responseText = `\x1b[32m[COFRE] Depositaste ${qtd}x metal_base em segurança.\x1b[0m`;
                    } else responseText = `\x1b[31m[ERRO] Não tens sucata suficiente no inventário.\x1b[0m`;
                }
                else if (acaoBase === 'sacar' && qtd > 0) {
                    if (minhaBase.inventory.metal_base >= qtd) {
                        minhaBase.inventory.metal_base -= qtd;
                        player.inventory.metal_base += qtd;
                        await minhaBase.save();
                        responseText = `\x1b[32m[COFRE] Retiraste ${qtd}x metal_base do cofre.\x1b[0m`;
                    } else responseText = `\x1b[31m[ERRO] O cofre não tem essa quantidade de sucata.\x1b[0m`;
                }
                else {
                    responseText = `[USO] base status | base depositar [qtd] | base sacar [qtd]`;
                }
                break;
            // ==========================================
            // SISTEMA DE DEFESA DE BASE
            // ==========================================
            case 'defender':
                const baseDef = await Base.findOne({ x: player.location.x, y: player.location.y, owner: player.username });
                if (!baseDef) {
                    responseText = `\x1b[31m[ERRO] Você precisa estar na SUA base para instalar defesas.\x1b[0m`;
                    break;
                }
                if (player.inventory.metal_base >= 30 && player.inventory.circuitos >= 5) {
                    player.inventory.metal_base -= 30;
                    player.inventory.circuitos -= 5;
                    baseDef.defenseLevel = (baseDef.defenseLevel || 0) + 1;
                    await baseDef.save();
                    responseText = `\x1b[32m[SEGURANÇA] Torreta instalada! Nível de Defesa da Base: ${baseDef.defenseLevel}.\x1b[0m\n(Cada nível reduz a chance de invasão inimiga em 15%)`;
                } else {
                    responseText = `\x1b[31m[ERRO] Recursos insuficientes (Custo: 30x suc, 5x circ).\x1b[0m`;
                }
                break;

            // ==========================================
            // SISTEMA DE VIAGEM (NOVOS BIOMAS)
            // ==========================================
            case 'viajar':
                const destino = args[1]; 
                if (destino === 'world_001' || destino === 'world_002') {
                    if (player.status.level < 5 && destino === 'world_002') {
                        responseText = `\x1b[31m[BLOQUEADO] Radiação muito alta! Você precisa de NÍVEL 5 para ir às Planícies.\x1b[0m`;
                        break;
                    }
                    player.location.world = destino;
                    player.location.x = 0; 
                    player.location.y = 0;
                    responseText = `\x1b[1;35m[VIAGEM INTERDIMENSIONAL] Você viajou para o ${destino.toUpperCase()}.\x1b[0m`;
                } else {
                    responseText = `[VIAJAR] Destinos conhecidos: world_001 (Ruínas), world_002 (Planícies)`;
                }
                break;

            // ==========================================
            // RANKING GLOBAL (LEADERBOARD)
            // ==========================================
            case 'ranking':
                const topPlayers = await Player.find().sort({ "status.level": -1, "status.xp": -1 }).limit(5);
                let rankMsg = ["TOP 5 SOBREVIVENTES DO WASTELAND", "-------------------------------"];
                topPlayers.forEach((p, i) => {
                    rankMsg.push(`${i+1}. ${p.username.padEnd(10)} | Nível: ${p.status.level}`);
                });
                responseText = ascii.drawBox("RANKING MUNDIAL", rankMsg);
                break;
            // ==========================================
            // SISTEMA DE ADMINISTRADOR (GOD MODE)
            // ==========================================
            case 'admin':
                
                const admins = ['leonardo', 'Leonardo', 'kakaroto', 'Kakaroto'];
                if (!admins.includes(player.username)) {
                    responseText = `\x1b[31m[ACESSO NEGADO] Você não tem privilégios de Administrador do Mainframe.\x1b[0m`;
                    break;
                }
                
                const adminCmd = args[1];
                
                if (adminCmd === 'dar') {
                    
                    const alvoNome = args[2];
                    const itemNome = args[3];
                    const qtdItem = parseInt(args[4]) || 1;
                    
                    if(!alvoNome || !itemNome) {
                        responseText = `\x1b[33m[USO]\x1b[0m admin dar <jogador> <item> <qtd>\nItens: metal_base, circuitos, agua_pura, bombas`;
                        break;
                    }
                    
                   
                    const alvo = await Player.findOne({ username: new RegExp('^' + alvoNome + '$', 'i') });
                    if(!alvo) {
                        responseText = `\x1b[31m[ERRO] Jogador '${alvoNome}' não encontrado no banco de dados.\x1b[0m`;
                        break;
                    }
                    
                    
                    if (alvo.inventory[itemNome] !== undefined) {
                        alvo.inventory[itemNome] += qtdItem;
                        await alvo.save();
                        responseText = `\x1b[32m[GOD MODE] Você invocou ${qtdItem}x ${itemNome} no inventário de ${alvo.username}.\x1b[0m`;
                        
                        
                        if (alvo.socketId) {
                            io.to(alvo.socketId).emit('output', `\r\n\x1b[1;35m[INTERVENÇÃO DIVINA] Uma fenda se abre no céu e deixa cair ${qtdItem}x ${itemNome} aos seus pés!\x1b[0m\r\n> `);
                        }
                    } else {
                        responseText = `\x1b[31m[ERRO] Item '${itemNome}' inválido.\x1b[0m`;
                    }
                }
                else if (adminCmd === 'tp') {
                    
                    const nx = parseInt(args[2]);
                    const ny = parseInt(args[3]);
                    if (isNaN(nx) || isNaN(ny)) {
                        responseText = `\x1b[33m[USO]\x1b[0m admin tp <x> <y>`;
                    } else {
                        player.location.x = nx;
                        player.location.y = ny;
                        responseText = `\x1b[1;36m[GOD MODE] Você se teletransportou instantaneamente para as coordenadas [${nx}, ${ny}].\x1b[0m`;
                    }
                }
                else if (adminCmd === 'anuncio') {
                    
                    const msg = args.slice(2).join(' ');
                    if(!msg) {
                        responseText = `\x1b[33m[USO]\x1b[0m admin anuncio <sua mensagem aqui>`;
                    } else {
                        
                        io.emit('output', `\r\n\x1b[1;41;37m [ TRANSMISSÃO DO MAINFRAME ] ${msg} \x1b[0m\r\n> `);
                        responseText = `[GOD MODE] Anúncio global disparado com sucesso.`;
                    }
                }
                else {
                    responseText = ascii.drawBox("PAINEL DE ADMINISTRAÇÃO", [
                        "admin dar [jogador] [item] [qtd] - Spawna itens para alguém",
                        "admin tp [x] [y]                 - Teletransporte instantâneo",
                        "admin anuncio [msg]              - Mensagem global do servidor"
                    ]);
                }
                break;

            // ==========================================
            // SISTEMA DE CLÃS E FACÇÕES
            // ==========================================
            case 'clan':
                const acaoClan = args[1];
                const nomeClan = args.slice(2).join(' ');

                if (acaoClan === 'criar') {
                    if (!nomeClan) {
                        responseText = `[USO] clan criar <Nome do Clã>`;
                    } else if (player.clan) {
                        responseText = `\x1b[31m[ERRO] Você já pertence ao clã [${player.clan}].\x1b[0m`;
                    } else if (player.inventory.circuitos < 5) {
                        responseText = `\x1b[31m[ERRO] Criar um registro de Clã custa 5x circuitos.\x1b[0m`;
                    } else {
                        player.inventory.circuitos -= 5;
                        player.clan = nomeClan;
                        responseText = `\x1b[32m[FACÇÃO] Sucesso! Você fundou o clã [${nomeClan}].\x1b[0m`;
                        io.emit('output', `\r\n\x1b[1;35m[NOTÍCIA MUNDIAL] A facção [${nomeClan}] foi fundada por ${player.username}!\x1b[0m\r\n> `);
                    }
                } 
                else if (acaoClan === 'juntar') {
                    if (!nomeClan) {
                        responseText = `[USO] clan juntar <Nome do Clã>`;
                    } else if (player.clan) {
                        responseText = `\x1b[31m[ERRO] Você já pertence ao clã [${player.clan}].\x1b[0m`;
                    } else {
                        
                        player.clan = nomeClan;
                        responseText = `\x1b[32m[FACÇÃO] Você se juntou ao clã [${nomeClan}].\x1b[0m`;
                    }
                }
                else {
                    responseText = `[COMANDOS DE CLÃ]\nclan criar <Nome> - Funda uma facção (Custa 5 circuitos)\nclan juntar <Nome> - Entra em uma facção existente\nSua facção atual: ${player.clan || 'Nenhuma'}`;
                }
                break;

            // ==========================================
            // SISTEMA DE INVASÃO (RAID)
            // ==========================================
            case 'invadir':
                const alvoBase = await Base.findOne({ x: player.location.x, y: player.location.y });
                
                if (!alvoBase) {
                    responseText = `\x1b[31m[ERRO] Não há nenhuma base nestas coordenadas para invadir.\x1b[0m`;
                    break;
                }
                if (alvoBase.owner === player.username) {
                    responseText = `\x1b[31m[ERRO] Não podes invadir a tua própria base.\x1b[0m`;
                    break;
                }
                if (player.status.energy < 20) {
                    responseText = `\x1b[31m[ERRO] Precisas de 20 de Energia para iniciar um cerco.\x1b[0m`;
                    break;
                }

                player.status.energy -= 20;

               
                let bonusBomba = 0;
                let logBomba = "";
                if (player.inventory.bombas > 0) {
                    player.inventory.bombas -= 1;
                    bonusBomba = 40; 
                    logBomba = `\x1b[1;33m[EXPLOSIVO] Usaste 1x Bomba Caseira! As defesas inimigas foram obliteradas (+40% Chance).\x1b[0m\n`;
                }

               
                const defInimiga = (alvoBase.defenseLevel || 0) * 15;
                const chanceSucesso = 30 + (player.equipment.weapon.atk) + bonusBomba - defInimiga;
                const rolagem = Math.floor(Math.random() * 100);

                if (rolagem <= chanceSucesso) {
                    
                    const saqueMetal = alvoBase.inventory.metal_base + (Math.floor(Math.random() * 20) + 10);
                    player.inventory.metal_base += saqueMetal;
                    
                    await Base.deleteOne({ _id: alvoBase._id }); 
                    
                    responseText = logBomba + `\x1b[1;32m[INVASÃO BEM SUCEDIDA]\x1b[0m\nArrombaste os portões da ${alvoBase.name} e saqueaste o cofre!\n\x1b[33mRoubaste ${saqueMetal}x metal_base no total.\x1b[0m`;
                    io.emit('output', `\r\n\x1b[1;31m[ALERTA GLOBAL] A base de ${alvoBase.owner} foi REDUZIDA A CINZAS por ${player.username}!\x1b[0m\r\n> `);
                } else {
                   
                    player.status.hp -= 30;
                    responseText = logBomba + `\x1b[1;31m[FALHA NA INVASÃO]\x1b[0m\nAs defesas automatizadas resistiram! Tomas 30 de dano pelos estilhaços.`;
                }
                break;
            
            case 'mapa':
                const basesLocais = await Base.find({
                    x: { $gte: player.location.x - 3, $lte: player.location.x + 3 },
                    y: { $gte: player.location.y - 3, $lte: player.location.y + 3 }
                });

                let radar = "\n\x1b[36m[ RADAR DE PROXIMIDADE ]\x1b[0m\n";
                for (let y = player.location.y + 3; y >= player.location.y - 3; y--) {
                    let linha = "";
                    for (let x = player.location.x - 3; x <= player.location.x + 3; x++) {
                        const temBaseAqui = basesLocais.find(b => b.x === x && b.y === y);
                        
                        if (x === player.location.x && y === player.location.y) {
                            linha += "\x1b[1;32m@\x1b[0m "; // VOCÊ
                        } else if (temBaseAqui) {
                            linha += "\x1b[1;34mB\x1b[0m "; // BASE (Azul)
                        } else {
                            const terreno = Math.abs((x * 73 + y * 37) % 10);
                            if (terreno < 2) linha += "\x1b[31m#\x1b[0m ";
                            else if (terreno === 3) linha += "\x1b[33m*\x1b[0m ";
                            else linha += ". ";
                        }
                    }
                    radar += linha + "\n";
                }
                radar += "-----------------------------------------------\n";
                radar += "Legenda: @(Você) | .(Caminho) | #(Escombros) | *(Recursos) | \x1b[1;34mB(Base)\x1b[0m\n";
                responseText = radar;
                break;
            // ==========================================
            // SISTEMA DE MERCADO E INVENTÁRIO
            // ==========================================
            case 'mercado':
                responseText = ascii.drawBox("MERCADO DA ZONA MORTA", [
                    "Moeda aceita: metal_base (Sucata)",
                    "-----------------------------------------------",
                    "1. agua_pura   - 10 sucata (Recupera HP/Energia)",
                    "2. pistola     - 50 sucata (Arma: ATK+25)",
                    "3. colete      - 40 sucata (Armadura: DEF+10)",
                    "-----------------------------------------------",
                    "Digite 'comprar [nome_do_item]' para adquirir."
                ]);
                break;

            case 'comprar':
                const itemComprar = args[1];
                if (!itemComprar) {
                    responseText = `\x1b[33m[USO]\x1b[0m Digite: comprar agua_pura, comprar pistola ou comprar colete`;
                    break;
                }

                if (itemComprar === 'agua_pura') {
                    if (player.inventory.metal_base >= 10) {
                        player.inventory.metal_base -= 10;
                        player.inventory.agua_pura = (player.inventory.agua_pura || 0) + 1;
                        responseText = `\x1b[32m[MERCADO] Sucesso! Você comprou 1x agua_pura.\x1b[0m`;
                    } else responseText = `\x1b[31m[MERCADO] Saldo insuficiente. Custa 10 sucata.\x1b[0m`;
                } 
                else if (itemComprar === 'pistola') {
                    if (player.inventory.metal_base >= 50) {
                        player.inventory.metal_base -= 50;
                        player.equipment.weapon = { name: "Pistola Improvisada", atk: 25 };
                        responseText = `\x1b[32m[MERCADO] Sucesso! Você equipou a Pistola Improvisada!\x1b[0m`;
                    } else responseText = `\x1b[31m[MERCADO] Saldo insuficiente. Custa 50 sucata.\x1b[0m`;
                } 
                else if (itemComprar === 'colete') {
                    if (player.inventory.metal_base >= 40) {
                        player.inventory.metal_base -= 40;
                        player.equipment.armor = { name: "Colete de Kevlar", def: 10 };
                        responseText = `\x1b[32m[MERCADO] Sucesso! Você vestiu o Colete de Kevlar!\x1b[0m`;
                    } else responseText = `\x1b[31m[MERCADO] Saldo insuficiente. Custa 40 sucata.\x1b[0m`;
                } 
                else {
                    responseText = `\x1b[31m[ERRO] Item '${itemComprar}' não existe no mercado.\x1b[0m`;
                }
                break;

            case 'usar':
                const itemUsar = args[1];
                if (!itemUsar) {
                    responseText = `\x1b[33m[USO]\x1b[0m Digite: usar agua_pura`;
                    break;
                }

                if (itemUsar === 'agua_pura') {
                    if (player.inventory.agua_pura > 0) {
                        player.inventory.agua_pura -= 1;
                        player.status.hp = player.status.maxHp;
                        player.status.energy = player.status.maxEnergy;
                        responseText = `\x1b[36m[CONSUMÍVEL] Você bebe a agua_pura. HP e ENERGIA totalmente restaurados!\x1b[0m`;
                    } else {
                        responseText = `\x1b[31m[ERRO] Você não possui agua_pura no inventário.\x1b[0m`;
                    }
                } else {
                    responseText = `\x1b[31m[ERRO] Item '${itemUsar}' não pode ser usado ou não existe.\x1b[0m`;
                }
                break;
            
            case 'gritar':
                const mensagem = args.slice(1).join(' ');
                if (!mensagem) {
                    responseText = `[USO] gritar <sua mensagem aqui>`;
                } else {
                    
                    io.emit('output', `\r\n\x1b[1;36m[RÁDIO GLOBAL] ${player.username} grita: "${mensagem}"\x1b[0m\r\n> `);
                    responseText = `[SISTEMA] Mensagem transmitida pelas frequências abertas.`;
                }
                break;

            
            case 'norte': case 'sul': case 'leste': case 'oeste':
                if (player.status.energy < 2) {
                    responseText = `\x1b[31m[AVISO] Exaustão extrema. Impossível mover-se.\x1b[0m`;
                    break;
                }
                player.status.energy -= 2;
                if (command === 'norte') player.location.y += 1;
                if (command === 'sul') player.location.y -= 1;
                if (command === 'leste') player.location.x += 1;
                if (command === 'oeste') player.location.x -= 1;
                responseText = `[NAVEGAÇÃO] Avançando para o ${command}...\n[SISTEMA] Nova localização: [${player.location.x}, ${player.location.y}]`;
                break;

            
            case 'reciclar':
                if (player.inventory.metal_base >= 5) {
                    player.inventory.metal_base -= 5;
                    player.inventory.circuitos += 1;
                    responseText = `[CRAFT] Processamento concluído: -5x metal_base | +1x circuitos.`;
                } else {
                    responseText = `[ERRO] Sucata insuficiente. Necessário: 5x metal_base.`;
                }
                break;

            case 'craft':
                const item = args[1];
                if (item === 'faca') {
                    if (player.inventory.metal_base >= 10 && player.inventory.circuitos >= 2) {
                        player.inventory.metal_base -= 10;
                        player.inventory.circuitos -= 2;
                        player.equipment.weapon = { name: "Faca Tática", atk: 15 };
                        responseText = `\x1b[32m[CRAFT] SUCESSO! Forjaste uma FACA TÁTICA (ATK+15).\x1b[0m`;
                    } else responseText = `[ERRO] Recursos insuficientes (Custo: 10x suc, 2x circ).`;
                } 
                else if (item === 'bomba') {
                    if (player.inventory.metal_base >= 15 && player.inventory.circuitos >= 5) {
                        player.inventory.metal_base -= 15;
                        player.inventory.circuitos -= 5;
                        player.inventory.bombas = (player.inventory.bombas || 0) + 1;
                        responseText = `\x1b[32m[CRAFT] SUCESSO! Fabricaste uma BOMBA CASEIRA.\x1b[0m\n(Será usada automaticamente na tua próxima invasão para +40% de chance!)`;
                    } else responseText = `[ERRO] Recursos insuficientes (Custo: 15x suc, 5x circ).`;
                }
                else {
                    responseText = `[CRAFT] Receitas válidas: 'craft faca', 'craft bomba'`;
                }
                break;
            
            case 'explorar':
                let listaInimigos = ['rat_mutante', 'escorpiao'];

                if (player.location.world === 'world_002') {
                    listaInimigos = ['saqueador', 'andarilho_ferro'];
                }

                const inimigoSorteado = listaInimigos[Math.floor(Math.random() * listaInimigos.length)];

                if (player.status.energy < 5) {
                    responseText = `\x1b[31m[AVISO] Energia insuficiente.\x1b[0m`;
                    break;
                }

                
                const baseSegura = await Base.findOne({ x: player.location.x, y: player.location.y });
                if (baseSegura) {
                    
                    player.status.hp = Math.min(player.status.maxHp, player.status.hp + 15);
                    player.status.energy = Math.min(player.status.maxEnergy, player.status.energy + 10);
                    responseText = `\x1b[36m[ZONA SEGURA] Você está na ${baseSegura.name}. Descansando em segurança (Recuperou HP e Energia).\x1b[0m`;
                    break; 
                }

                
                player.status.energy -= 5;

               
                if (player.location.x === 15 && player.location.y === 15) {
                    player.combatState.inCombat = true;
                    player.combatState.enemyId = 'rei_mutante';
                    player.combatState.enemyHp = ascii.enemies.rei_mutante.baseHp;
                    
                    responseText = `\x1b[1;31m[PERIGO EXTREMO] O CHÃO TREME. VOCÊ ENTROU NO NINHO DO CHEFE!\x1b[0m\n` + 
                                   ascii.enemies.rei_mutante.art.join('\n') + 
                                   `\n\n\x1b[31m[COMBATE] O ${ascii.enemies.rei_mutante.name} surge das sombras. Não há como fugir. Digite 'atacar'.\x1b[0m`;
                    break; 
                }

                
                const sorte = Math.random();
                
                if (sorte < 0.4) {
                    
                    const sucata = Math.floor(Math.random() * 5) + 1;
                    player.inventory.metal_base += sucata;
                    responseText = `[SISTEMA] Vasculhando os destroços... \x1b[33mVocê encontrou ${sucata}x metal_base!\x1b[0m`;
                } else if (sorte < 0.6) {
                   
                    responseText = `[SISTEMA] Apenas poeira e vento radioativo. Nada útil encontrado.`;
                } else {
                    
                    const listaInimigos = ['rat_mutante', 'escorpiao', 'saqueador'];
                    const inimigoSorteado = listaInimigos[Math.floor(Math.random() * listaInimigos.length)];
                    const inimigoInfo = ascii.enemies[inimigoSorteado];

                    player.combatState.inCombat = true;
                    player.combatState.enemyId = inimigoSorteado;
                    player.combatState.enemyHp = inimigoInfo.baseHp;
                    
                    responseText = `\x1b[31m[ALERTA] Inimigo detectado!\x1b[0m\n` + 
                                   inimigoInfo.art.join('\n') + 
                                   `\n\n\x1b[31m[COMBATE] O ${inimigoInfo.name} prepara-se para atacar. Digite 'atacar' ou 'fugir'.\x1b[0m`;
                }
                break;

            case 'limpar':
                responseText = "\x1b[2J\x1b[H" + ascii.drawBox("TERMINAL WASTELAND", ["TELA LIMPA. SISTEMA PRONTO."]);
                break;

            default:
                responseText = `\x1b[31m[ERRO] Comando '${command}' não reconhecido.\x1b[0m Digite 'ajuda'.`;
        }

       
        await player.save();

        return { text: responseText, playerData: player };
    }
};

module.exports = parser;