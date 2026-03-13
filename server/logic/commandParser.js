const ascii = require('./asciiLibrary');
const Base = require('../models/Base');
const Player = require('../models/Player');
const Market = require('../models/Market');
const Clan = require('../models/Clan');
const Mine = require('../models/Mine'); 

const parser = {
    process: async (player, command, args, io) => {
        let responseText = "";

        // ==========================================
        // SISTEMA 0: TRAVA DE HACKING (MINI-GAME)
        // ==========================================
        if (player.hacking && player.hacking.active) {
            if (command === 'sair' || command === 'fugir') {
                player.hacking.active = false;
                await player.save();
                return { text: `\x1b[31m[SISTEMA] Conexão com o cofre abortada.\x1b[0m`, playerData: player };
            }

            const guess = command;
            if (guess.length !== 3 || isNaN(guess)) {
                return { text: `\x1b[33m[SISTEMA DE INVASÃO]\x1b[0m Digite 3 números (ex: 123) ou 'sair'.`, playerData: player };
            }

            player.hacking.attempts += 1;
            
            let exatos = 0; 
            let parciais = 0;
            let senhaArr = player.hacking.password.split('');
            let palpiteArr = guess.split('');

            for(let i = 0; i < 3; i++) {
                if (palpiteArr[i] === senhaArr[i]) {
                    exatos++;
                    senhaArr[i] = null;
                    palpiteArr[i] = null;
                }
            }
            for(let i = 0; i < 3; i++) {
                if (palpiteArr[i] !== null && senhaArr.includes(palpiteArr[i])) {
                    parciais++;
                    senhaArr[senhaArr.indexOf(palpiteArr[i])] = null;
                }
            }

            if (exatos === 3) {
                player.hacking.active = false;
                player.inventory.cofre_fechado -= 1;
                
                const lootSucata = Math.floor(Math.random() * 50) + 50;
                player.inventory.metal_base += lootSucata;
                player.inventory.circuitos += 5;
                
                responseText = `\x1b[1;32m[ACESSO CONCEDIDO]\x1b[0m\nA porta pesada se abre com um assobio de ar pressurizado.\nVocê saqueou: ${lootSucata}x metal_base e 5x circuitos!`;
            } else if (player.hacking.attempts >= 5) {
                player.hacking.active = false;
                player.inventory.cofre_fechado -= 1;
                player.status.hp -= 30;
                
                io.to(player.socketId).emit('play_audio', 'explosion'); 
                
                responseText = `\x1b[1;41;37m [ PROTOCOLO DE AUTODESTRUIÇÃO ATIVADO ] \x1b[0m\nA senha incorreta ativou os explosivos do cofre. Você tomou 30 de dano!`;
            } else {
                responseText = `\x1b[36m[ANÁLISE DE CÓDIGO]\x1b[0m Números Exatos: \x1b[32m${exatos}\x1b[0m | Posição Errada: \x1b[33m${parciais}\x1b[0m\n\x1b[31mTentativas restantes: ${5 - player.hacking.attempts}\x1b[0m`;
            }
            await player.save();
            return { text: responseText, playerData: player };
        }

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

                if (player.inventory.drone > 0 && player.combatState.enemyHp > 0) {
                    const droneDano = 15;
                    player.combatState.enemyHp -= droneDano;
                    responseText += `\x1b[36m[DRONE] O seu companheiro robótico dispara um laser! (+${droneDano} Dano)\x1b[0m\n`;
                }

                if (player.combatState.enemyHp <= 0) {
                    const xpGanha = enemy.xpReward || 20;
                    player.status.xp += xpGanha;
                    
                    responseText += `\x1b[32m[VITÓRIA] O ${enemy.name} foi destruído!\x1b[0m\n`;
                    responseText += `[LOOT] Você encontrou: 5x metal_base | \x1b[36m+${xpGanha} XP\x1b[0m\n`;
                    player.inventory.metal_base += 5;
                    player.combatState.inCombat = false;
                    player.combatState.enemyId = null;

                    if (player.quest && player.quest.active && player.quest.targetId === enemyKey) {
                        player.quest.progress += 1;
                        responseText += `\x1b[36m[MISSÃO] Progresso: ${player.quest.progress}/${player.quest.goal}\x1b[0m\n`;
                        
                        if (player.quest.progress >= player.quest.goal) {
                            player.inventory.circuitos += player.quest.rewardCirc;
                            responseText += `\x1b[1;32m[MISSÃO CONCLUÍDA!] O Terminal transferiu ${player.quest.rewardCirc}x circuitos para ti.\x1b[0m\n`;
                            player.quest.active = false; 
                        }
                    }

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
        // MODO LIVRE (Usando chaves {} para isolar escopo)
        // ==========================================
        switch(command) {
            case 'online': {
                const playersOnline = await Player.find({ socketId: { $ne: null } });
                let lista = playersOnline.map(p => `• ${p.username} (Nível ${p.status.level})`).join('\n');
                responseText = ascii.drawBox("SOBREVIVENTES ONLINE", [lista || "Ninguém online no momento."]);
                break;
            }
                
            case 'ajuda': {
                responseText = ascii.drawBox("COMANDOS DO SISTEMA", [
                    "status / mapa / base  - Sistemas principais",
                    "norte/sul/leste/oeste - Navega pelo mapa",
                    "explorar              - Busca loot ou inimigos",
                    "saquear satelite      - Pega o airdrop quando cair",
                    "apostar [valor]       - Joga no Cassino [0,0] do world_001",
                    "sussurrar [nome] [msg]- Manda uma mensagem privada",
                    "c [mensagem]          - Chat secreto exclusivo do seu clã",
                    "mercado / nomade      - Lojas e mercado negro",
                    "comprar / vender      - Adquire ou vende um item",
                    "usar [item]           - Consome um item",
                    "reciclar              - Transforma 5 sucata em 1 circuito",
                    "craft [item]          - faca, bomba, camera, drone, mina",
                    "plantar mina          - Arma uma mina terrestre onde você está",
                    "construir [tipo]      - base, extrator, forja",
                    "melhorar arma         - Aprimora o seu dano na Forja",
                    "defender              - Instala torretas na base",
                    "instalar / cam [1-8]  - Instala e acessa CCTV na base",
                    "hackear cofre         - Tenta abrir um cofre_fechado",
                    "clinica               - Vê loja de implantes cibernéticos",
                    "implantar [tipo]      - Instala uma melhoria permanente",
                    "caça [nome] [sucata]  - Põe recompensa na cabeça de alguém",
                    "assassinar [nome]     - Tenta matar player na mesma coordenada",
                    "atacar leviata        - Ataca o World Boss(quando ocorrer)",
                    "viajar [world_001/2]  - Viaja entre mapas(world_002 no Lvl 5)",
                    "ranking               - Mostra os 5 jogadores mais fortes",
                    "clan [ação]           - criar, juntar, status, depositar",
                    "invadir               - Ataca base inimiga local",
                    "missoes               - Vê ou pede um contrato de caça",
                    "base [ação]           - status, recolher, logs",
                    "base depositar/sacar  - Ex: base depositar bio_chips 2",
                ]);
                break;
            }

            case 'sussurrar':
            case 'pm': {
                const alvoNomePm = args[1];
                const msgSussurro = args.slice(2).join(' ');

                if (!alvoNomePm || !msgSussurro) {
                    responseText = `\x1b[33m[USO]\x1b[0m sussurrar <jogador> <mensagem>`;
                    break;
                }
                if (alvoNomePm.toLowerCase() === player.username.toLowerCase()) {
                    responseText = `\x1b[31m[ERRO] Falar sozinho é o primeiro sintoma da loucura radioativa.\x1b[0m`;
                    break;
                }

                const alvoPm = await Player.findOne({ username: new RegExp('^' + alvoNomePm + '$', 'i') });
                
                if (!alvoPm || !alvoPm.socketId) {
                    responseText = `\x1b[31m[ERRO] Sinal não encontrado. O jogador '${alvoNomePm}' está offline ou não existe.\x1b[0m`;
                    break;
                }
                
                io.to(alvoPm.socketId).emit('output', `\r\n\x1b[1;35m[SUSSURRO de ${player.username}] ${msgSussurro}\x1b[0m\r\n> `);
                responseText = `\x1b[35m[SUSSURRO para ${alvoPm.username}] ${msgSussurro}\x1b[0m`;
                break;
            }

            case 'c':
            case 'clanchat': {
                const msgClan = args.slice(1).join(' ');
                
                if (!player.clan) {
                    responseText = `\x1b[31m[ERRO] Você não pertence a nenhuma facção.\x1b[0m`;
                    break;
                }
                if (!msgClan) {
                    responseText = `\x1b[33m[USO]\x1b[0m c <mensagem secreta para o seu clã>`;
                    break;
                }

                const clanMembers = await Player.find({ clan: player.clan, socketId: { $ne: null } });
                let onlineCount = 0;
                
                clanMembers.forEach(member => {
                    onlineCount++;
                    io.to(member.socketId).emit('output', `\r\n\x1b[1;32m[RÁDIO DO CLÃ: ${player.clan}] ${player.username}: ${msgClan}\x1b[0m\r\n> `);
                });

                if (onlineCount === 1) {
                    responseText = `\x1b[33m[AVISO] Você é o único membro do clã online agora.\x1b[0m`;
                }
                break;
            }

            // === CASSINO (BAR DA FERRUGEM) ===
            case 'apostar': {
                const valorAposta = parseInt(args[1]);
                
                if (player.location.x !== 0 || player.location.y !== 0 || player.location.world !== 'world_001') {
                    responseText = `\x1b[31m[ERRO] O Cassino (Bar da Ferrugem) fica na zona neutra [0,0] do world_001.\x1b[0m`;
                    break;
                }
                
                if (isNaN(valorAposta) || valorAposta <= 0) {
                    responseText = `\x1b[33m[USO]\x1b[0m apostar <valor_em_sucata>`;
                    break;
                }
                
                if (player.inventory.metal_base < valorAposta) {
                    responseText = `\x1b[31m[BAR DA FERRUGEM] "Você não tem essa sucata, Reciclador. Cai fora."\x1b[0m`;
                    break;
                }

                player.inventory.metal_base -= valorAposta;
                const roleta = Math.floor(Math.random() * 100) + 1;
                
                let slotUI = `\n\x1b[1;30m[ \x1b[31mCassino da Zona Morta\x1b[1;30m ]\x1b[0m\n`;
                slotUI += `\x1b[33mOs dados rolam...\x1b[0m Resultado: [ ${roleta} ]\n`;

                if (roleta === 100) {
                    const premioJackpot = valorAposta * 5;
                    player.inventory.metal_base += premioJackpot;
                    responseText = slotUI + `\x1b[1;35m[JACKPOT!!!] Você tirou o 100 perfeito! Ganhou ${premioJackpot}x sucata!\x1b[0m`;
                    io.emit('play_audio', 'bounty');
                    io.emit('output', `\r\n\x1b[1;35m[CASSINO GLOBAL] As sirenes tocam! ${player.username} tirou um JACKPOT no Bar da Ferrugem!\x1b[0m\r\n> `);
                } else if (roleta > 55) {
                    const premioNet = valorAposta * 2;
                    player.inventory.metal_base += premioNet;
                    io.to(player.socketId).emit('play_audio', 'bounty');
                    responseText = slotUI + `\x1b[1;32m[VITÓRIA] A sorte sorri pra você. Dobrou a aposta e levou ${premioNet}x sucata.\x1b[0m`;
                } else {
                    responseText = slotUI + `\x1b[31m[DERROTA] A banca vence sempre. Perdeu ${valorAposta}x sucata.\x1b[0m`;
                }
                break;
            }

            // === AIRDROP (SATÉLITE) ===
            case 'saquear': {
                if (args[1] === 'satelite' || args[1] === 'satélite') {
                    if (global.airdrop && global.airdrop.active && player.location.x === global.airdrop.x && player.location.y === global.airdrop.y && player.location.world === global.airdrop.world) {
                        global.airdrop.active = false;
                        player.inventory.metal_base += 300;
                        player.inventory.circuitos += 15;
                        player.inventory.nucleo_energia = (player.inventory.nucleo_energia || 0) + 1;
                        player.inventory.bio_chips = (player.inventory.bio_chips || 0) + 1;
                        
                        responseText = `\x1b[1;32m[AIRDROP SAQUEADO]\x1b[0m\nVocê arrombou o cofre do satélite antes de todos!\n\x1b[33m+300x sucata | +15x circuitos | +1x núcleo | +1x bio-chip\x1b[0m`;
                        io.emit('output', `\r\n\x1b[1;36m[NOTÍCIA GLOBAL] O satélite foi saqueado por ${player.username}! A corrida terminou.\x1b[0m\r\n> `);
                    } else {
                        responseText = `\x1b[31m[ERRO] Não há nenhum satélite caído nesta coordenada exata.\x1b[0m`;
                    }
                } else {
                    responseText = `[USO] saquear satelite`;
                }
                break;
            }

            case 'atacar': {
                if (args[1] === 'leviata') {
                    if (!global.worldBoss || !global.worldBoss.active) {
                        responseText = `\x1b[31m[ERRO] O ${global.worldBoss.name} não está ativo neste momento.\x1b[0m`;
                        break;
                    }
                    if (player.location.world !== global.worldBoss.world || player.location.x !== global.worldBoss.x || player.location.y !== global.worldBoss.y) {
                        responseText = `\x1b[31m[ERRO] Não estás nas coordenadas do Boss! Ele está em [${global.worldBoss.x}, ${global.worldBoss.y}] no ${global.worldBoss.world}.\x1b[0m`;
                        break;
                    }

                    const meuDano = player.equipment.weapon.atk + Math.floor(Math.random() * 10);
                    global.worldBoss.hp -= meuDano;
                    
                    responseText = `\x1b[1;33m[RAID GLOBAL] Disparaste contra o ${global.worldBoss.name} causando ${meuDano} de dano!\x1b[0m\nHP do Boss: ${global.worldBoss.hp}/${global.worldBoss.maxHp}`;
                    
                    if (global.worldBoss.hp <= 0) {
                        global.worldBoss.active = false;
                        player.inventory.nucleo_energia = (player.inventory.nucleo_energia || 0) + 2;
                        player.inventory.bio_chips = (player.inventory.bio_chips || 0) + 5;
                        player.inventory.metal_base += 500;
                        
                        io.emit('output', `\r\n\x1b[1;32m[VITÓRIA GLOBAL] O ${global.worldBoss.name} FOI DERROTADO!\x1b[0m\n\x1b[36mO golpe final foi dado por ${player.username}! A zona está a salvo.\x1b[0m\r\n> `);
                        responseText += `\n\x1b[32m[RECOMPENSA DE ABATE] Recebeste 500 sucata, 2 Núcleos de Energia e 5 Bio-Chips!\x1b[0m`;
                    } else {
                        player.status.hp -= 20;
                        responseText += `\n\x1b[31m[CONTRA-ATAQUE] O Leviatã balança os seus tentáculos de metal! Sofres 20 de dano!\x1b[0m`;
                        
                        if (player.status.hp <= 0) {
                            player.status.hp = player.status.maxHp; 
                            player.location.x = 10; 
                            player.location.y = 10;
                            responseText += `\n[SISTEMA] Foste esmagado. Clonagem ativada na base.`;
                        }
                    }
                } else {
                    responseText = `[USO] 'atacar leviata' (Somente quando o evento global estiver ativo). Para combates normais, use 'explorar'.`;
                }
                break;
            }

            case 'caca':
            case 'caça': {
                const alvoCaca = args[1];
                const valorCaca = parseInt(args[2]);

                if (!alvoCaca || isNaN(valorCaca) || valorCaca <= 0) {
                    responseText = `[USO] caça <nome_do_jogador> <valor_em_sucata>\nExemplo: caça Leonardo 200`;
                    break;
                }
                if (player.inventory.metal_base < valorCaca) {
                    responseText = `\x1b[31m[ERRO] Não tens ${valorCaca} de sucata para pagar esta recompensa.\x1b[0m`;
                    break;
                }

                const procurado = await Player.findOne({ username: new RegExp('^' + alvoCaca + '$', 'i') });
                if (!procurado) {
                    responseText = `\x1b[31m[ERRO] Jogador '${alvoCaca}' não encontrado.\x1b[0m`;
                    break;
                }

                player.inventory.metal_base -= valorCaca;
                procurado.bounty = (procurado.bounty || 0) + valorCaca;
                await procurado.save();

                responseText = `\x1b[32m[CONTRATO EMITIDO] Pagaste ${valorCaca} sucata pela cabeça de ${procurado.username}.\x1b[0m`;
                
                io.emit('play_audio', 'bounty'); 
                io.emit('output', `\r\n\x1b[1;33m[SINDICATO DOS CAÇADORES] NOVA RECOMPENSA: ${procurado.bounty} sucata pela cabeça de ${procurado.username}!\x1b[0m\r\n> `);
                break;
            }

            case 'assassinar': {
                const alvoAssassinar = args[1];
                if (!alvoAssassinar) {
                    responseText = `[USO] assassinar <nome_do_jogador>`;
                    break;
                }
                if (alvoAssassinar.toLowerCase() === player.username.toLowerCase()) {
                    responseText = `\x1b[31m[ERRO] Não te podes auto-assassinar.\x1b[0m`;
                    break;
                }

                const vitima = await Player.findOne({ username: new RegExp('^' + alvoAssassinar + '$', 'i') });
                if (!vitima) {
                    responseText = `\x1b[31m[ERRO] Alvo não encontrado no banco de dados.\x1b[0m`;
                    break;
                }
                if (vitima.location.world !== player.location.world || vitima.location.x !== player.location.x || vitima.location.y !== player.location.y) {
                    responseText = `\x1b[31m[ERRO] O alvo não está nas tuas coordenadas atuais [${player.location.x}, ${player.location.y}].\x1b[0m`;
                    break;
                }

                const hit = (player.equipment.weapon.atk + Math.floor(Math.random()*10)) - (vitima.equipment.armor.def);
                if (hit > 20) {
                    const premio = vitima.bounty || 0;
                    player.inventory.metal_base += premio;
                    vitima.bounty = 0;
                    
                    vitima.location.x = 10; 
                    vitima.location.y = 10;
                    vitima.inventory.metal_base = Math.floor(vitima.inventory.metal_base * 0.5); 
                    await vitima.save();

                    responseText = `\x1b[1;31m[ASSASSINATO BEM SUCEDIDO]\x1b[0m\nEliminaste ${vitima.username} a sangue frio!`;
                    
                    if (premio > 0) {
                        responseText += `\n\x1b[32mReivindicaste a recompensa de ${premio} sucata!\x1b[0m`;
                        io.to(player.socketId).emit('play_audio', 'bounty'); 
                    }
                    
                    io.emit('output', `\r\n\x1b[1;31m[SISTEMA GLOBAL] ${vitima.username} foi assassinado por ${player.username}!\x1b[0m\r\n> `);
                    if (vitima.socketId) {
                        io.to(vitima.socketId).emit('output', `\r\n\x1b[1;41;37m [ ALERTA ] FOSTE ASSASSINADO POR ${player.username}! \x1b[0m\r\nPerdeste metade da tua sucata e renasceste na base.\r\n> `);
                    }
                } else {
                    player.status.hp -= 25;
                    responseText = `\x1b[31m[FALHA] ${vitima.username} defendeu-se e revidou! Sofreste 25 de dano.\x1b[0m`;
                }
                break;
            }

            case 'clinica': {
                responseText = ascii.drawBox("CLÍNICA CLANDESTINA", [
                    "Moeda aceita: bio_chips (Encontrados ao explorar)",
                    "-----------------------------------------------",
                    "1. pernas       - 3 bio_chips (Andar gasta 1 de Energia, não 2)",
                    "2. optica       - 5 bio_chips (+15% de chance de achar itens/cofres)",
                    "3. exoesqueleto - 8 bio_chips (+50 de HP Máximo permanente)",
                    "-----------------------------------------------",
                    "Digite 'implantar [nome_do_implante]' para instalar."
                ]);
                break;
            }

            case 'implantar': {
                const tipoImp = args[1];
                if (!player.implants) player.implants = { pernas: false, optica: false, exoesqueleto: false };

                if (tipoImp === 'pernas') {
                    if (player.implants.pernas) {
                        responseText = `[ERRO] Já tens pernas cibernéticas.`;
                    } else if ((player.inventory.bio_chips || 0) >= 3) {
                        player.inventory.bio_chips -= 3; 
                        player.implants.pernas = true;
                        responseText = `\x1b[32m[CIRURGIA CONCLUÍDA] Pernas Cibernéticas instaladas! Andar agora custa 1 de Energia.\x1b[0m`;
                    } else {
                        responseText = `[ERRO] Precisas de 3 bio_chips.`;
                    }
                }
                else if (tipoImp === 'optica') {
                    if (player.implants.optica) {
                        responseText = `[ERRO] Já tens ótica aprimorada.`;
                    } else if ((player.inventory.bio_chips || 0) >= 5) {
                        player.inventory.bio_chips -= 5; 
                        player.implants.optica = true;
                        responseText = `\x1b[32m[CIRURGIA CONCLUÍDA] Ótica instalada! +15% de probabilidade de achar itens valiosos.\x1b[0m`;
                    } else {
                        responseText = `[ERRO] Precisas de 5 bio_chips.`;
                    }
                }
                else if (tipoImp === 'exoesqueleto') {
                    if (player.implants.exoesqueleto) {
                        responseText = `[ERRO] Já tens o exoesqueleto.`;
                    } else if ((player.inventory.bio_chips || 0) >= 8) {
                        player.inventory.bio_chips -= 8; 
                        player.implants.exoesqueleto = true;
                        player.status.maxHp += 50; 
                        player.status.hp = player.status.maxHp;
                        responseText = `\x1b[32m[CIRURGIA CONCLUÍDA] Exoesqueleto soldado aos ossos! HP Máximo aumentou em +50.\x1b[0m`;
                    } else {
                        responseText = `[ERRO] Precisas de 8 bio_chips.`;
                    }
                }
                else {
                    responseText = `[USO] implantar <pernas|optica|exoesqueleto>`;
                }
                break;
            }

            case 'missoes': {
                if (!player.quest || !player.quest.active) {
                    const targets = ['rat_mutante', 'escorpiao', 'saqueador'];
                    const tId = targets[Math.floor(Math.random() * targets.length)];
                    const tName = ascii.enemies[tId].name;
                    const req = Math.floor(Math.random() * 3) + 3; 
                    const rew = Math.floor(Math.random() * 3) + 1; 
                    
                    player.quest = { active: true, targetId: tId, targetName: tName, goal: req, progress: 0, rewardCirc: rew };
                    responseText = `\x1b[1;33m[NOVA MISSÃO EMITIDA]\x1b[0m\nO Mainframe precisa que elimines \x1b[31m${req}x ${tName}\x1b[0m.\nRecompensa: ${rew}x circuitos.`;
                } else {
                    responseText = ascii.drawBox("CONTRATO ATIVO", [
                        `Alvo a Abater : ${player.quest.targetName}`,
                        `Progresso     : ${player.quest.progress} / ${player.quest.goal}`,
                        `Recompensa    : ${player.quest.rewardCirc}x circuitos`,
                        `---------------------------------------`,
                        `Vai explorar para encontrares o teu alvo!`
                    ]);
                }
                break;
            }

            case 'hackear': {
                if (args[1] === 'cofre') {
                    if (player.inventory.cofre_fechado > 0) {
                        const pwd = Math.floor(Math.random() * 900 + 100).toString();
                        player.hacking = { active: true, password: pwd, attempts: 0 };
                        responseText = `\x1b[1;36m[SISTEMA DE INVASÃO INICIADO]\x1b[0m\nO cofre está bloqueado por uma senha de 3 dígitos numéricos.\nDigite o seu palpite ou 'sair' para abortar. (Aviso: 5 erros = BOOM)`;
                    } else {
                        responseText = `\x1b[31m[ERRO] Você não possui nenhum cofre_fechado.\x1b[0m`;
                    }
                } else {
                    responseText = `[USO] hackear cofre`;
                }
                break;
            }

           case 'status': {
                const impList = [];
                if(player.implants && player.implants.pernas) impList.push('Pernas Cib.');
                if(player.implants && player.implants.optica) impList.push('Ótica Kiroshi');
                if(player.implants && player.implants.exoesqueleto) impList.push('Exo-Armor');

                const localAtual = await Base.findOne({ x: player.location.x, y: player.location.y });
                let infoLocal = `Mundo: ${player.location.world.toUpperCase()} | Coord: [${player.location.x}, ${player.location.y}]`;
                
                if (localAtual) {
                    infoLocal = `\x1b[36mZONA SEGURA: ${localAtual.name} | Coord: [${player.location.x}, ${player.location.y}]\x1b[0m`;
                }

                const statusLines = [
                    `Nível: ${player.status.level}  |  XP: ${player.status.xp}`,
                    `HP: ${player.status.hp}/${player.status.maxHp}  |  Energia: ${player.status.energy}/${player.status.maxEnergy}`,
                    `Prêmio na sua cabeça: \x1b[33m${player.bounty || 0} sucata\x1b[0m`,
                    `-------------------------------------------`,
                    `LOCALIZAÇÃO (GPS):`,
                    `> ${infoLocal}`,
                    `-------------------------------------------`,
                    `ARMA: ${player.equipment.weapon.name} (ATK: ${player.equipment.weapon.atk})`,
                    `-------------------------------------------`,
                    `INVENTÁRIO DE RECURSOS:`,
                    `> Sucata (metal_base): ${player.inventory.metal_base}`,
                    `> Circuitos          : ${player.inventory.circuitos}`,
                    `> Água Pura          : ${player.inventory.agua_pura}`,
                    `> Bio-Chips          : ${player.inventory.bio_chips || 0}`,
                    `> Cofres Fechados    : ${player.inventory.cofre_fechado || 0}`,
                    `-------------------------------------------`,
                    `EQUIPAMENTO ESPECIAL E CIBERNÉTICA:`,
                    `> Implantes Ativos   : ${impList.join(', ') || 'Nenhum (100% Humano)'}`,
                    `> Drone Assistente   : ${player.inventory.drone ? 'Online 🔋' : 'Offline'}`,
                    `> Bombas Caseiras    : ${player.inventory.bombas || 0} unit.`, 
                    `> Minas Terrestres   : ${player.inventory.minas || 0} unit.`,
                    `> Câmeras p/ Instalar: ${player.inventory.camera || 0} unit.`,
                    `> Núcleo de Energia  : ${player.inventory.nucleo_energia || 0} unit.`, 
                    `> Fita (holofita_01) : ${player.inventory.holofita_01 ? '1' : '0'} unit.`, 
                    `-------------------------------------------`,
                    `CLÃ: ${player.clan || 'Sem afiliação'}`
                ];
                responseText = ascii.drawBox(`STATUS DE ${player.username.toUpperCase()}`, statusLines);
                break;
            }
            
            case 'construir': {
                if (args[1] === 'base') {
                    if (player.inventory.metal_base >= 50 && player.inventory.circuitos >= 10) {
                        const baseExistente = await Base.findOne({ x: player.location.x, y: player.location.y });
                        if (baseExistente) {
                            responseText = `\x1b[31m[ERRO] Já existe uma base nestas coordenadas!\x1b[0m`;
                            break;
                        }
                        player.inventory.metal_base -= 50;
                        player.inventory.circuitos -= 10;
                        
                        await new Base({ 
                            owner: player.username, 
                            name: `Base de ${player.username}`, 
                            x: player.location.x, 
                            y: player.location.y 
                        }).save();
                        
                        responseText = `\x1b[32m[ENGENHARIA] Estrutura concluída! Construíste uma Base Segura em [${player.location.x}, ${player.location.y}].\x1b[0m`;
                    } else {
                        responseText = `\x1b[31m[ERRO] Recursos insuficientes. Precisas de 50x metal_base e 10x circuitos.\x1b[0m`;
                    }
                } 
                else if (args[1] === 'extrator') {
                    const baseExt = await Base.findOne({ x: player.location.x, y: player.location.y, owner: player.username });
                    if (!baseExt) {
                        responseText = `\x1b[31m[ERRO] Extratores só podem ser construídos dentro da tua base.\x1b[0m`;
                        break;
                    }
                    if (player.inventory.metal_base >= 80 && player.inventory.circuitos >= 15) {
                        player.inventory.metal_base -= 80;
                        player.inventory.circuitos -= 15;
                        baseExt.extratores = (baseExt.extratores || 0) + 1;
                        baseExt.lastExtracted = new Date();
                        await baseExt.save();
                        
                        responseText = `\x1b[32m[INDÚSTRIA] Extrator Automático instalado! (${baseExt.extratores} Ativos).\x1b[0m\nEles farmam sucata offline. Use 'base recolher' de vez em quando!`;
                    } else {
                        responseText = `\x1b[31m[ERRO] Custo do Extrator: 80x metal_base, 15x circuitos.\x1b[0m`;
                    }
                }
                else if (args[1] === 'forja') {
                    const baseForja = await Base.findOne({ x: player.location.x, y: player.location.y, owner: player.username });
                    if (!baseForja) { 
                        responseText = `\x1b[31m[ERRO] Deves estar na tua base para construir uma Forja.\x1b[0m`; 
                        break; 
                    }
                    if (baseForja.forja) { 
                        responseText = `\x1b[31m[ERRO] A tua base já tem uma Forja operacional.\x1b[0m`; 
                        break; 
                    }
                    
                    if (player.inventory.metal_base >= 100 && player.inventory.circuitos >= 20) {
                        player.inventory.metal_base -= 100; 
                        player.inventory.circuitos -= 20;
                        baseForja.forja = true; 
                        await baseForja.save();
                        responseText = `\x1b[32m[INDÚSTRIA] Forja de Armas construída com sucesso!\x1b[0m\nAgora podes usar 'melhorar arma' para dar upgrade aos teus equipamentos.`;
                    } else {
                        responseText = `\x1b[31m[ERRO] Custo da Forja: 100x sucata, 20x circuitos.\x1b[0m`;
                    }
                }
                else {
                    responseText = `[USO] construir base | construir extrator | construir forja`;
                }
                break;
            }

            // === SISTEMA DA FORJA (UPGRADE DE ARMAS) ===
            case 'melhorar': {
                if (args[1] === 'arma') {
                    const bForja = await Base.findOne({ x: player.location.x, y: player.location.y, owner: player.username });
                    if (!bForja || !bForja.forja) { 
                        responseText = `\x1b[31m[ERRO] Precisas de estar na tua base e ter uma Forja construída ('construir forja').\x1b[0m`; 
                        break; 
                    }
                    if (player.equipment.weapon.name === "Punhos") { 
                        responseText = `\x1b[31m[ERRO] Não podes fundir aço nos teus próprios punhos.\x1b[0m`; 
                        break; 
                    }

                    if (player.inventory.metal_base >= 50 && player.inventory.circuitos >= 5) {
                        player.inventory.metal_base -= 50; 
                        player.inventory.circuitos -= 5;
                        
                        let wName = player.equipment.weapon.name;
                        let lvl = 0;
                        let match = wName.match(/\+(\d+)$/); // Procura se já tem um +1, +2
                        
                        if (match) { 
                            lvl = parseInt(match[1]); 
                            wName = wName.replace(/ \+\d+$/, ''); 
                        }
                        
                        if (lvl >= 5) { 
                            responseText = `\x1b[31m[FORJA] A tua arma já atingiu o nível máximo de perfeição (+5)!\x1b[0m`; 
                            player.inventory.metal_base += 50; 
                            player.inventory.circuitos += 5; // Devolve o custo
                            break; 
                        }

                        // Lógica de Sucesso: Níveis mais altos são mais difíceis
                        let chance = 100 - (lvl * 20); // Ex: +1 = 100%, +2 = 80%, +3 = 60%
                        let roll = Math.floor(Math.random() * 100);

                        if (roll <= chance) {
                            lvl++;
                            player.equipment.weapon.name = `${wName} +${lvl}`;
                            player.equipment.weapon.atk += 10;
                            responseText = `\x1b[1;32m[FORJA] SUCESSO!\x1b[0m A arma brilhou intensamente e evoluiu para \x1b[33m${player.equipment.weapon.name}\x1b[0m (ATK: ${player.equipment.weapon.atk}).`;
                        } else {
                            if (lvl >= 2) { // Armas a partir do +2 QUEBRAM se falhar
                                player.equipment.weapon = { name: "Punhos", atk: 5 };
                                responseText = `\x1b[1;31m[FORJA] FALHA CATASTRÓFICA!\x1b[0m A temperatura saiu de controle e a tua arma foi DESTRUÍDA!`;
                                io.to(player.socketId).emit('play_audio', 'explosion');
                            } else {
                                responseText = `\x1b[31m[FORJA] FALHA!\x1b[0m O processo falhou e os materiais foram perdidos. Felizmente a tua arma continua inteira.`;
                            }
                        }
                    } else {
                        responseText = `\x1b[31m[ERRO] Custo de Melhoria: 50x sucata, 5x circuitos.\x1b[0m`;
                    }
                } else {
                    responseText = `[USO] melhorar arma`;
                }
                break;
            }
                
            case 'base': {
                const acaoBase = args[1];
                const minhaBase = await Base.findOne({ x: player.location.x, y: player.location.y });

                if (!minhaBase || minhaBase.owner !== player.username) {
                    responseText = `\x1b[31m[ERRO] Não estás dentro da tua base para aceder ao cofre.\x1b[0m`;
                    break;
                }

                if (acaoBase === 'status') {
                    responseText = ascii.drawBox(`COFRE DA BASE: ${minhaBase.name}`, [
                        `Nível Defesa       : ${minhaBase.defenseLevel || 0}/4 Torretas`,
                        `CCTV Ativas        : ${minhaBase.cameras || 0}/8 Câmeras`,
                        `Extratores         : ${minhaBase.extratores || 0} Operando`,
                        `Forja              : ${minhaBase.forja ? 'Ativa 🔥' : 'Inativa'}`,
                        `-------------------------------------------`,
                        `ITENS ARMAZENADOS:`,
                        `> Sucata (metal_base) : ${minhaBase.inventory.metal_base || 0}`,
                        `> Circuitos           : ${minhaBase.inventory.circuitos || 0}`,
                        `> Água Pura           : ${minhaBase.inventory.agua_pura || 0}`,
                        `> Bombas/Minas        : ${minhaBase.inventory.bombas || 0} / ${minhaBase.inventory.minas || 0}`,
                        `> Núcleo de Energia   : ${minhaBase.inventory.nucleo_energia || 0}`,
                        `> Bio-Chips           : ${minhaBase.inventory.bio_chips || 0}`,
                        `> Cofres Fechados     : ${minhaBase.inventory.cofre_fechado || 0}`,
                        `> Câmeras / Drones    : ${minhaBase.inventory.camera || 0} / ${minhaBase.inventory.drone || 0}`,
                        `> Holofitas           : ${minhaBase.inventory.holofita_01 || 0}`
                    ]);
                } 
                else if (acaoBase === 'recolher') {
                    if ((minhaBase.extratores || 0) > 0) {
                        const minutosPassados = Math.floor((new Date() - (minhaBase.lastExtracted || new Date())) / 60000);
                        if (minutosPassados > 0) {
                            const ganho = minutosPassados * minhaBase.extratores * 2;
                            minhaBase.inventory.metal_base += ganho;
                            minhaBase.lastExtracted = new Date();
                            await minhaBase.save();
                            responseText = `\x1b[1;32m[INDÚSTRIA] As máquinas trabalharam! Foram recolhidas ${ganho}x sucatas para o cofre.\x1b[0m`;
                        } else {
                            responseText = `\x1b[33m[INDÚSTRIA] Os extratores ainda estão processando. Volte mais tarde.\x1b[0m`;
                        }
                    } else {
                        responseText = `\x1b[31m[ERRO] Você não construiu nenhum extrator nesta base.\x1b[0m`;
                    }
                }
                else if (acaoBase === 'logs') {
                    const logs = minhaBase.securityLogs ? minhaBase.securityLogs.slice(-5) : [];
                    if (logs.length === 0) {
                        responseText = `[SEGURANÇA] Nenhum registro de invasão nas câmeras.`;
                    } else {
                        responseText = ascii.drawBox(`HISTÓRICO DE SEGURANÇA (CCTV)`, logs);
                    }
                }
                else if (acaoBase === 'depositar' || acaoBase === 'sacar') {
                    const itemAlvo = args[2];
                    const qtdItem = parseInt(args[3]);
                    
                    const itensPermitidos = ['metal_base', 'circuitos', 'agua_pura', 'bombas', 'minas', 'nucleo_energia', 'holofita_01', 'cofre_fechado', 'bio_chips', 'camera', 'drone'];

                    if (!itemAlvo || isNaN(qtdItem) || qtdItem <= 0) {
                        responseText = `\x1b[33m[USO]\x1b[0m base ${acaoBase} <item> <quantidade>\nExemplo: base ${acaoBase} agua_pura 2`;
                        break;
                    }

                    if (!itensPermitidos.includes(itemAlvo)) {
                        responseText = `\x1b[31m[ERRO] Item '${itemAlvo}' inválido para o cofre.\x1b[0m`;
                        break;
                    }

                    if (acaoBase === 'depositar') {
                        if ((player.inventory[itemAlvo] || 0) >= qtdItem) {
                            player.inventory[itemAlvo] -= qtdItem;
                            minhaBase.inventory[itemAlvo] = (minhaBase.inventory[itemAlvo] || 0) + qtdItem;
                            await minhaBase.save();
                            responseText = `\x1b[32m[COFRE] Depositaste ${qtdItem}x ${itemAlvo} em segurança.\x1b[0m`;
                        } else {
                            responseText = `\x1b[31m[ERRO] Não tens ${qtdItem}x ${itemAlvo} no inventário.\x1b[0m`;
                        }
                    } 
                    else if (acaoBase === 'sacar') {
                        if ((minhaBase.inventory[itemAlvo] || 0) >= qtdItem) {
                            minhaBase.inventory[itemAlvo] -= qtdItem;
                            player.inventory[itemAlvo] = (player.inventory[itemAlvo] || 0) + qtdItem;
                            await minhaBase.save();
                            responseText = `\x1b[32m[COFRE] Retiraste ${qtdItem}x ${itemAlvo} do cofre.\x1b[0m`;
                        } else {
                            responseText = `\x1b[31m[ERRO] O cofre não possui ${qtdItem}x ${itemAlvo}.\x1b[0m`;
                        }
                    }
                }
                else {
                    responseText = `[USO] base status | base recolher | base logs | base depositar [i] [q] | base sacar [i] [q]`;
                }
                break;
            }

            case 'defender': {
                const baseDef = await Base.findOne({ x: player.location.x, y: player.location.y, owner: player.username });
                if (!baseDef) {
                    responseText = `\x1b[31m[ERRO] Você precisa estar na SUA base para instalar defesas.\x1b[0m`;
                    break;
                }
                if ((baseDef.defenseLevel || 0) >= 4) {
                    responseText = `\x1b[31m[ERRO] A infraestrutura da base suporta no máximo 4 Torretas.\x1b[0m`;
                    break;
                }
                if (player.inventory.metal_base >= 30 && player.inventory.circuitos >= 5) {
                    player.inventory.metal_base -= 30;
                    player.inventory.circuitos -= 5;
                    baseDef.defenseLevel = (baseDef.defenseLevel || 0) + 1;
                    await baseDef.save();
                    responseText = `\x1b[32m[SEGURANÇA] Torreta instalada! (${baseDef.defenseLevel}/4 permitidas).\x1b[0m`;
                } else {
                    responseText = `\x1b[31m[ERRO] Recursos insuficientes (Custo: 30x suc, 5x circ).\x1b[0m`;
                }
                break;
            }
                
            case 'instalar': {
                if (args[1] === 'camera') {
                    const baseCam = await Base.findOne({ x: player.location.x, y: player.location.y, owner: player.username });
                    if (!baseCam) {
                        responseText = `\x1b[31m[ERRO] Você precisa estar na SUA base para instalar câmeras.\x1b[0m`;
                        break;
                    }
                    if ((baseCam.cameras || 0) >= 8) {
                        responseText = `\x1b[31m[ERRO] A rede local suporta no máximo 8 Câmeras.\x1b[0m`;
                        break;
                    }
                    if (player.inventory.camera > 0) {
                        player.inventory.camera -= 1;
                        baseCam.cameras = (baseCam.cameras || 0) + 1;
                        await baseCam.save();
                        responseText = `\x1b[36m[CCTV] Câmera instalada com sucesso! (${baseCam.cameras}/8 permitidas).\x1b[0m\nDigite 'cam ${baseCam.cameras}' para ver as imagens.`;
                    } else {
                        responseText = `\x1b[31m[ERRO] Você não possui câmeras no inventário. Use 'craft camera'.\x1b[0m`;
                    }
                } else {
                    responseText = `[USO] instalar camera`;
                }
                break;
            }

            case 'cam': {
                const numCam = parseInt(args[1]);
                const baseParaOlhar = await Base.findOne({ x: player.location.x, y: player.location.y, owner: player.username });
                
                if (!baseParaOlhar) {
                    responseText = `\x1b[31m[ERRO] O sistema CCTV só pode ser acessado de dentro da sua base.\x1b[0m`;
                    break;
                }
                if (isNaN(numCam) || numCam < 1 || numCam > (baseParaOlhar.cameras || 0)) {
                    responseText = `\x1b[31m[ERRO] Câmera ${args[1] || '?'} inválida ou não instalada. Você possui ${baseParaOlhar.cameras || 0} câmeras ativas.\x1b[0m`;
                    break;
                }

                const cenarioRandom = ascii.cameraViews[Math.floor(Math.random() * ascii.cameraViews.length)];
                
                let uiCamera = [
                    `\x1b[1;30m[=============================================]\x1b[0m`,
                    `\x1b[1;30m[\x1b[0m \x1b[32mCCTV FEED - CAM 0${numCam}\x1b[0m  |  \x1b[31mREC *\x1b[0m  |  ${new Date().toLocaleTimeString()} \x1b[1;30m]\x1b[0m`,
                    `\x1b[1;30m[---------------------------------------------]\x1b[0m`
                ];
               
                cenarioRandom.forEach(linha => {
                    uiCamera.push(`\x1b[1;30m[\x1b[0m \x1b[90m${linha}\x1b[0m \x1b[1;30m]\x1b[0m`);
                });
                
                uiCamera.push(`\x1b[1;30m[=============================================]\x1b[0m`);
                
                responseText = uiCamera.join('\n');
                break;
            }

            case 'viajar': {
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
            }

            case 'ranking': {
                const topPlayers = await Player.find().sort({ "status.level": -1, "status.xp": -1 }).limit(5);
                let rankMsg = ["TOP 5 SOBREVIVENTES DO WASTELAND", "-------------------------------"];
                topPlayers.forEach((p, i) => {
                    rankMsg.push(`${i+1}. ${p.username.padEnd(10)} | Nível: ${p.status.level}`);
                });
                responseText = ascii.drawBox("RANKING MUNDIAL", rankMsg);
                break;
            }

            case 'admin': {
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
                        responseText = `\x1b[33m[USO]\x1b[0m admin dar <jogador> <item> <qtd>\nItens: metal_base, circuitos, agua_pura, bombas, minas, nucleo_energia, holofita_01, cofre_fechado, bio_chips`;
                        break;
                    }
                    
                    const alvo = await Player.findOne({ username: new RegExp('^' + alvoNome + '$', 'i') });
                    if(!alvo) {
                        responseText = `\x1b[31m[ERRO] Jogador '${alvoNome}' não encontrado no banco de dados.\x1b[0m`;
                        break;
                    }
                    
                    if (alvo.inventory[itemNome] !== undefined || ['minas'].includes(itemNome)) {
                        alvo.inventory[itemNome] = (alvo.inventory[itemNome] || 0) + qtdItem;
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
                else if (adminCmd === 'boss') {
                    global.worldBoss.active = true;
                    global.worldBoss.hp = global.worldBoss.maxHp;
                    global.worldBoss.x = player.location.x;
                    global.worldBoss.y = player.location.y;
                    global.worldBoss.world = player.location.world;
                    
                    io.emit('play_audio', 'boss'); // Toca o rugido Global!
                    io.emit('output', `\r\n\x1b[1;41;37m [ ALERTA VERMELHO ] O ADMIN INVOCOU O ${global.worldBoss.name}! ELE ESTÁ NAS COORDENADAS [${global.worldBoss.x}, ${global.worldBoss.y}] (${global.worldBoss.world})! \x1b[0m\r\n> `);
                    responseText = `[GOD MODE] World Boss invocado nas tuas coordenadas.`;
                }
                else if (adminCmd === 'airdrop') {
                    global.airdrop.active = true;
                    global.airdrop.x = player.location.x; 
                    global.airdrop.y = player.location.y; 
                    global.airdrop.world = player.location.world;
                    io.emit('play_audio', 'alarm'); 
                    io.emit('output', `\r\n\x1b[1;45;37m [ EVENTO GLOBAL DE TESTE ] UM SATÉLITE FOI DERRUBADO PELO ADMIN EM [${global.airdrop.x}, ${global.airdrop.y}]! \x1b[0m\r\n> `);
                    responseText = `[GOD MODE] Airdrop forçado nas suas coordenadas.`;
                }
                else {
                    responseText = ascii.drawBox("PAINEL DE ADMINISTRAÇÃO", [
                        "admin dar [jogador] [item] [qtd] - Spawna itens para alguém",
                        "admin tp [x] [y]                 - Teletransporte instantâneo",
                        "admin anuncio [msg]              - Mensagem global",
                        "admin boss                       - Invoca o Leviatã",
                        "admin airdrop                    - Força a queda de um satélite"
                    ]);
                }
                break;
            }

            case 'clan': {
                const acaoClan = args[1];
                const nomeClan = args.slice(2).join(' ');

                if (acaoClan === 'criar') {
                    if (!nomeClan) return { text: `[USO] clan criar <Nome do Clã>`, playerData: player };
                    if (player.clan) return { text: `\x1b[31m[ERRO] Já pertences a um clã.\x1b[0m`, playerData: player };
                    if (player.inventory.circuitos < 5) return { text: `\x1b[31m[ERRO] Custa 5 circuitos registar um Clã.\x1b[0m`, playerData: player };
                    
                    const clanExiste = await Clan.findOne({ name: new RegExp('^' + nomeClan + '$', 'i') });
                    if (clanExiste) return { text: `\x1b[31m[ERRO] Esse nome já está em uso.\x1b[0m`, playerData: player };

                    player.inventory.circuitos -= 5;
                    player.clan = nomeClan;
                    await new Clan({ name: nomeClan, founder: player.username }).save();
                    
                    responseText = `\x1b[32m[FACÇÃO] Sucesso! Fundaste o clã [${nomeClan}].\x1b[0m`;
                    io.emit('output', `\r\n\x1b[1;35m[NOTÍCIA MUNDIAL] A facção [${nomeClan}] foi fundada por ${player.username}!\x1b[0m\r\n> `);
                } 
                else if (acaoClan === 'juntar') {
                    if (!nomeClan) return { text: `[USO] clan juntar <Nome>`, playerData: player };
                    if (player.clan) return { text: `\x1b[31m[ERRO] Já pertences a um clã.\x1b[0m`, playerData: player };
                    
                    const clanAlvo = await Clan.findOne({ name: new RegExp('^' + nomeClan + '$', 'i') });
                    if (!clanAlvo) return { text: `\x1b[31m[ERRO] O clã '${nomeClan}' não existe.\x1b[0m`, playerData: player };

                    player.clan = clanAlvo.name;
                    responseText = `\x1b[32m[FACÇÃO] Foste aceite no clã [${clanAlvo.name}].\x1b[0m`;
                }
                else if (acaoClan === 'status') {
                    if (!player.clan) return { text: `\x1b[31m[ERRO] Não tens clã.\x1b[0m`, playerData: player };
                    const meuClan = await Clan.findOne({ name: player.clan });
                    if (meuClan) {
                        responseText = ascii.drawBox(`COFRE DA FACÇÃO: ${meuClan.name}`, [
                            `Fundador: ${meuClan.founder}`,
                            `-------------------------------------`,
                            `Sucata (metal_base): ${meuClan.inventory.metal_base}`,
                            `Circuitos          : ${meuClan.inventory.circuitos}`
                        ]);
                    }
                }
                else if (acaoClan === 'depositar') {
                    const itemDep = args[2];
                    const qtdDep = parseInt(args[3]);
                    
                    if (!player.clan) return { text: `\x1b[31m[ERRO] Não tens clã.\x1b[0m`, playerData: player };
                    if (!itemDep || !qtdDep || qtdDep <= 0) return { text: `[USO] clan depositar metal_base 100`, playerData: player };
                    if (player.inventory[itemDep] === undefined || player.inventory[itemDep] < qtdDep) return { text: `\x1b[31m[ERRO] Não tens ${qtdDep}x ${itemDep}.\x1b[0m`, playerData: player };

                    const meuClan = await Clan.findOne({ name: player.clan });
                    player.inventory[itemDep] -= qtdDep;
                    meuClan.inventory[itemDep] += qtdDep;
                    await meuClan.save();
                    responseText = `\x1b[32m[COFRE DO CLÃ] Depositaste ${qtdDep}x ${itemDep} para a tua facção!\x1b[0m`;
                }
                else {
                    responseText = `[COMANDOS DE CLÃ]\nclan criar <Nome> - Funda facção (5 circ)\nclan juntar <Nome> - Entra noutra facção\nclan status - Vê o cofre do clã\nclan depositar <item> <qtd> - Ajuda a tua equipa!`;
                }
                break;
            }

            case 'invadir': {
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
                    
                    io.to(player.socketId).emit('play_audio', 'explosion'); // Som bomba
                    
                    logBomba = `\x1b[1;33m[EXPLOSIVO] Usaste 1x Bomba Caseira! As defesas inimigas foram obliteradas (+40% Chance).\x1b[0m\n`;
                }

                const defInimiga = (alvoBase.defenseLevel || 0) * 15;
                const chanceSucesso = 30 + (player.equipment.weapon.atk) + bonusBomba - defInimiga;
                const rolagem = Math.floor(Math.random() * 100);
                const sucesso = rolagem <= chanceSucesso;

                // --- GRAVAÇÃO DE LOG DE SEGURANÇA NA BASE ALVO ---
                if (!alvoBase.securityLogs) alvoBase.securityLogs = [];
                alvoBase.securityLogs.push(`[${new Date().toLocaleTimeString()}] ${player.username} tentou invadir. Sucesso: ${sucesso ? 'SIM' : 'NÃO'}`);
                
                // --- TOCA SIRENE NO FONE DO DONO DA BASE ---
                const donoBase = await Player.findOne({ username: alvoBase.owner });
                if (donoBase && donoBase.socketId) {
                    io.to(donoBase.socketId).emit('play_audio', 'alarm'); // TOCA SIRENE!
                    io.to(donoBase.socketId).emit('output', `\r\n\x1b[1;41;37m [ ALERTA DE SEGURANÇA ] A SUA BASE EM [${alvoBase.x}, ${alvoBase.y}] ESTÁ SOB ATAQUE DE ${player.username}! \x1b[0m\r\n> `);
                }

                if (sucesso) {
                    const saqueMetal = alvoBase.inventory.metal_base + (Math.floor(Math.random() * 20) + 10);
                    player.inventory.metal_base += saqueMetal;
                    
                    await Base.deleteOne({ _id: alvoBase._id }); 
                    
                    responseText = logBomba + `\x1b[1;32m[INVASÃO BEM SUCEDIDA]\x1b[0m\nArrombaste os portões da ${alvoBase.name} e saqueaste o cofre!\n\x1b[33mRoubaste ${saqueMetal}x metal_base no total.\x1b[0m`;
                    io.emit('output', `\r\n\x1b[1;31m[ALERTA GLOBAL] A base de ${alvoBase.owner} foi REDUZIDA A CINZAS por ${player.username}!\x1b[0m\r\n> `);
                } else {
                    player.status.hp -= 30;
                    await alvoBase.save(); // Salva o log de falha
                    responseText = logBomba + `\x1b[1;31m[FALHA NA INVASÃO]\x1b[0m\nAs defesas automatizadas resistiram! Tomas 30 de dano pelos estilhaços.`;
                }
                break;
            }
            
            case 'mapa': {
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
                            linha += "\x1b[1;32m@\x1b[0m "; 
                        } else if (temBaseAqui) {
                            linha += "\x1b[1;34mB\x1b[0m "; 
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
            }

            case 'nomade': {
                if (global.nomade && global.nomade.active && player.location.x === global.nomade.x && player.location.y === global.nomade.y) {
                    if (player.inventory.metal_base >= global.nomade.preco) {
                        player.inventory.metal_base -= global.nomade.preco;
                        
                        if (global.nomade.item === 'sniper') {
                            player.equipment.weapon = { name: "Sniper Nômade", atk: global.nomade.atk };
                        } else {
                            player.inventory[global.nomade.item] = (player.inventory[global.nomade.item] || 0) + 1;
                        }
                        
                        responseText = `\x1b[1;32m[MERCADO NEGRO] Negócio fechado! Você comprou ${global.nomade.item} por ${global.nomade.preco} sucata.\x1b[0m`;
                        global.nomade.active = false; 
                        io.emit('output', `\r\n\x1b[33m[RÁDIO] O Nômade vendeu o seu estoque e desapareceu.\x1b[0m\r\n> `);
                    } else {
                        responseText = `\x1b[31m[O NÔMADE] "Sem sucata, sem papo, garoto." Custa ${global.nomade.preco}.\x1b[0m`;
                    }
                } else {
                    responseText = `\x1b[31m[ERRO] O Nômade não está aqui.\x1b[0m`;
                }
                break;
            }

            case 'mercado': {
                if (args[1] === 'livre') {
                    const ofertas = await Market.find({});
                    if (ofertas.length === 0) {
                        responseText = ascii.drawBox("MERCADO LIVRE (JOGADORES)", ["Nenhuma oferta ativa no momento."]);
                        break;
                    }
                    let linhasMercado = ["ID   | VENDEDOR   | ITEM (QTD)        | PREÇO", "-----------------------------------------------"];
                    ofertas.forEach(of => {
                        linhasMercado.push(`#${of.offerId.padEnd(4)} | ${of.seller.padEnd(10)} | ${of.item} (x${of.quantity})`.padEnd(36) + `| ${of.price} suc`);
                    });
                    linhasMercado.push("-----------------------------------------------");
                    linhasMercado.push("Digite 'comprar [ID]' para adquirir de um jogador.");
                    responseText = ascii.drawBox("MERCADO LIVRE (JOGADORES)", linhasMercado);
                } else {
                    responseText = ascii.drawBox("MERCADO DA ZONA MORTA", [
                        "Moeda aceita: metal_base (Sucata)",
                        "-----------------------------------------------",
                        "1. agua_pura   - 10 sucata (Recupera HP/Energia)",
                        "2. pistola     - 50 sucata (Arma: ATK+25)",
                        "3. colete      - 40 sucata (Armadura: DEF+10)",
                        "-----------------------------------------------",
                        "Digite 'comprar [nome_do_item]' para comprar da loja NPC.",
                        "Digite '\x1b[33mmercado livre\x1b[0m' para ver ofertas de jogadores."
                    ]);
                }
                break;
            }

            case 'comprar': {
                const itemComprar = args[1];
                if (!itemComprar) {
                    responseText = `\x1b[33m[USO]\x1b[0m comprar <item_da_loja> OU comprar <ID_da_oferta>`;
                    break;
                }

                let isOfferId = itemComprar.startsWith('#') ? itemComprar.substring(1) : itemComprar;
                const ofertaAtiva = await Market.findOne({ offerId: isOfferId.toUpperCase() });

                if (ofertaAtiva) {
                    if (ofertaAtiva.seller === player.username) {
                        responseText = `\x1b[31m[ERRO] Não podes comprar a tua própria oferta!\x1b[0m`;
                        break;
                    }
                    if (player.inventory.metal_base < ofertaAtiva.price) {
                        responseText = `\x1b[31m[MERCADO] Saldo insuficiente. Esta oferta custa ${ofertaAtiva.price} sucata.\x1b[0m`;
                        break;
                    }

                    player.inventory.metal_base -= ofertaAtiva.price;
                    player.inventory[ofertaAtiva.item] = (player.inventory[ofertaAtiva.item] || 0) + ofertaAtiva.quantity;
                    
                    const vendedor = await Player.findOne({ username: ofertaAtiva.seller });
                    if (vendedor) {
                        vendedor.inventory.metal_base += ofertaAtiva.price;
                        await vendedor.save();
                        
                        if (vendedor.socketId) {
                            io.to(vendedor.socketId).emit('output', `\r\n\x1b[1;32m[VENDAS] Ca-Ching! ${player.username} comprou o teu ${ofertaAtiva.item}. Recebeste ${ofertaAtiva.price} sucata!\x1b[0m\r\n> `);
                        }
                    }

                    await Market.deleteOne({ _id: ofertaAtiva._id });

                    responseText = `\x1b[32m[MERCADO LIVRE] Negócio fechado! Compraste ${ofertaAtiva.quantity}x ${ofertaAtiva.item} por ${ofertaAtiva.price} sucata.\x1b[0m`;
                } 
                else if (itemComprar === 'agua_pura') {
                    if (player.inventory.metal_base >= 10) {
                        player.inventory.metal_base -= 10;
                        player.inventory.agua_pura = (player.inventory.agua_pura || 0) + 1;
                        responseText = `\x1b[32m[MERCADO] Sucesso! Você comprou 1x agua_pura.\x1b[0m`;
                    } else {
                        responseText = `\x1b[31m[MERCADO] Saldo insuficiente. Custa 10 sucata.\x1b[0m`;
                    }
                } 
                else if (itemComprar === 'pistola') {
                    if (player.inventory.metal_base >= 50) {
                        player.inventory.metal_base -= 50;
                        player.equipment.weapon = { name: "Pistola Improvisada", atk: 25 };
                        responseText = `\x1b[32m[MERCADO] Sucesso! Você equipou a Pistola Improvisada!\x1b[0m`;
                    } else {
                        responseText = `\x1b[31m[MERCADO] Saldo insuficiente. Custa 50 sucata.\x1b[0m`;
                    }
                } 
                else if (itemComprar === 'colete') {
                    if (player.inventory.metal_base >= 40) {
                        player.inventory.metal_base -= 40;
                        player.equipment.armor = { name: "Colete de Kevlar", def: 10 };
                        responseText = `\x1b[32m[MERCADO] Sucesso! Você vestiu o Colete de Kevlar!\x1b[0m`;
                    } else {
                        responseText = `\x1b[31m[MERCADO] Saldo insuficiente. Custa 40 sucata.\x1b[0m`;
                    }
                } 
                else {
                    responseText = `\x1b[31m[ERRO] O ID '${itemComprar}' não foi encontrado nas ofertas ativas e não é um item de NPC.\x1b[0m`;
                }
                break;
            }
            
            case 'vender': {
                const itemVender = args[1];
                const qtdVender = parseInt(args[2]);
                const precoVender = parseInt(args[3]);

                const itensValidos = ['metal_base', 'circuitos', 'agua_pura', 'bombas', 'minas', 'nucleo_energia', 'holofita_01', 'cofre_fechado', 'bio_chips'];

                if (!itemVender || !qtdVender || !precoVender || qtdVender <= 0 || precoVender <= 0) {
                    responseText = `\x1b[33m[USO]\x1b[0m vender <item> <quantidade> <preco_em_sucata>\nExemplo: vender nucleo_energia 1 500`;
                    break;
                }

                if (!itensValidos.includes(itemVender)) {
                    responseText = `\x1b[31m[ERRO] O item '${itemVender}' não pode ser comercializado ou não existe.\x1b[0m`;
                    break;
                }

                if (player.inventory[itemVender] === undefined || player.inventory[itemVender] < qtdVender) {
                    responseText = `\x1b[31m[ERRO] Você não possui ${qtdVender}x ${itemVender} no inventário.\x1b[0m`;
                    break;
                }

                player.inventory[itemVender] -= qtdVender;

                const offerId = Math.random().toString(16).slice(-4).toUpperCase();
                
                await new Market({
                    seller: player.username,
                    item: itemVender,
                    quantity: qtdVender,
                    price: precoVender,
                    offerId: offerId
                }).save();

                responseText = `\x1b[32m[MERCADO LIVRE] Oferta criada! ID: #${offerId} | Vendendo ${qtdVender}x ${itemVender} por ${precoVender} sucata.\x1b[0m`;
                
                io.emit('output', `\r\n\x1b[1;36m[COMÉRCIO GLOBAL] ${player.username} colocou ${qtdVender}x ${itemVender} à venda no Mercado Livre!\x1b[0m\r\n> `);
                break;
            }

            case 'usar': {
                const itemUsar = args[1];
                if (!itemUsar) {
                    responseText = `\x1b[33m[USO]\x1b[0m Digite: usar agua_pura`;
                }
                else if (itemUsar === 'holofita_01') {
                    if (player.inventory.holofita_01 > 0) {
                        responseText = `\x1b[32m[REPRODUZINDO HOLOFITA DE DADOS...]\x1b[0m\n\x1b[36m"Registo #402. Ano 2098. Os drones pararam de nos obedecer. O Vírus Ômega... não é apenas um código. Ele está a reescrever o DNA do planeta. Se alguém ouvir isto, não confie no Mainframe Central. A chave para parar a mutação está em..."\x1b[0m \x1b[31m[GRAVAÇÃO CORROMPIDA]\x1b[0m`;
                    } else {
                        responseText = `\x1b[31m[ERRO] Não possuis a holofita_01.\x1b[0m`;
                    }
                    break;
                }
                else if (itemUsar === 'agua_pura') {
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
            }
            
            case 'gritar': {
                const mensagem = args.slice(1).join(' ');
                if (!mensagem) {
                    responseText = `[USO] gritar <sua mensagem aqui>`;
                } else {
                    io.emit('output', `\r\n\x1b[1;36m[RÁDIO GLOBAL] ${player.username} grita: "${mensagem}"\x1b[0m\r\n> `);
                    responseText = `[SISTEMA] Mensagem transmitida pelas frequências abertas.`;
                }
                break;
            }

            case 'norte': case 'sul': case 'leste': case 'oeste': {
                const custoMovimento = (player.implants && player.implants.pernas) ? 1 : 2;

                if (player.status.energy < custoMovimento) {
                    responseText = `\x1b[31m[AVISO] Exaustão extrema. Impossível mover-se.\x1b[0m`;
                    break;
                }
                player.status.energy -= custoMovimento;
                
                if (command === 'norte') player.location.y += 1;
                if (command === 'sul') player.location.y -= 1;
                if (command === 'leste') player.location.x += 1;
                if (command === 'oeste') player.location.x -= 1;
                
                responseText = `[NAVEGAÇÃO] Avançando para o ${command}...\n[SISTEMA] Nova localização: [${player.location.x}, ${player.location.y}]`;

                // --- VERIFICAÇÃO DE MINAS TERRESTRES AO ANDAR ---
                const minaPisada = await Mine.findOne({ x: player.location.x, y: player.location.y, world: player.location.world });
                
                if (minaPisada && minaPisada.owner !== player.username && minaPisada.clan !== player.clan) {
                    player.status.hp -= minaPisada.damage;
                    await Mine.deleteOne({ _id: minaPisada._id }); // Destrói a mina
                    
                    io.to(player.socketId).emit('play_audio', 'explosion'); // SOM DE EXPLOSÃO!
                    
                    responseText += `\n\n\x1b[1;41;37m [ KABOOM! ] \x1b[0m\n\x1b[31mVocê pisou numa Mina Terrestre deixada por ${minaPisada.owner}! Tomou ${minaPisada.damage} de dano crítico.\x1b[0m`;

                    // Avisa o dono da mina!
                    const donoMina = await Player.findOne({ username: minaPisada.owner });
                    if (donoMina && donoMina.socketId) {
                        io.to(donoMina.socketId).emit('output', `\r\n\x1b[1;33m[SEGURANÇA] A sua mina plantada em [${minaPisada.x}, ${minaPisada.y}] explodiu! ${player.username} sofreu o dano.\x1b[0m\r\n> `);
                    }

                    if (player.status.hp <= 0) {
                        player.status.hp = player.status.maxHp; 
                        player.location.x = 10; 
                        player.location.y = 10;
                        responseText += `\n[SISTEMA] Você virou pó vermelho. Clonagem ativada na base.`;
                    }
                }
                break;
            }

            case 'reciclar': {
                if (player.inventory.metal_base >= 5) {
                    player.inventory.metal_base -= 5;
                    player.inventory.circuitos += 1;
                    responseText = `[CRAFT] Processamento concluído: -5x metal_base | +1x circuitos.`;
                } else {
                    responseText = `[ERRO] Sucata insuficiente. Necessário: 5x metal_base.`;
                }
                break;
            }

            case 'craft': {
                const itemCraft = args[1];
                if (itemCraft === 'faca') {
                    if (player.inventory.metal_base >= 10 && player.inventory.circuitos >= 2) {
                        player.inventory.metal_base -= 10;
                        player.inventory.circuitos -= 2;
                        player.equipment.weapon = { name: "Faca Tática", atk: 15 };
                        responseText = `\x1b[32m[CRAFT] SUCESSO! Forjaste uma FACA TÁTICA (ATK+15).\x1b[0m`;
                    } else {
                        responseText = `[ERRO] Recursos insuficientes (Custo: 10x suc, 2x circ).`;
                    }
                } 
                else if (itemCraft === 'bomba') {
                    if (player.inventory.metal_base >= 15 && player.inventory.circuitos >= 5) {
                        player.inventory.metal_base -= 15;
                        player.inventory.circuitos -= 5;
                        player.inventory.bombas = (player.inventory.bombas || 0) + 1;
                        responseText = `\x1b[32m[CRAFT] SUCESSO! Fabricaste uma BOMBA CASEIRA.\x1b[0m\n(Será usada automaticamente na tua próxima invasão para +40% de chance!)`;
                    } else {
                        responseText = `[ERRO] Recursos insuficientes (Custo: 15x suc, 5x circ).`;
                    }
                }
                else if (itemCraft === 'mina') {
                    if (player.inventory.metal_base >= 10 && player.inventory.bombas >= 1) {
                        player.inventory.metal_base -= 10;
                        player.inventory.bombas -= 1;
                        player.inventory.minas = (player.inventory.minas || 0) + 1;
                        responseText = `\x1b[32m[CRAFT] SUCESSO! Fabricaste uma MINA TERRESTRE.\x1b[0m\n(Usa 'plantar mina' no mapa para proteger territórios)`;
                    } else {
                        responseText = `[ERRO] Recursos insuficientes (Custo: 10x suc, 1x bomba).`;
                    }
                }
                else if (itemCraft === 'camera') {
                    if (player.inventory.metal_base >= 10 && player.inventory.circuitos >= 3) {
                        player.inventory.metal_base -= 10;
                        player.inventory.circuitos -= 3;
                        player.inventory.camera = (player.inventory.camera || 0) + 1;
                        responseText = `\x1b[32m[CRAFT] SUCESSO! Fabricaste um MÓDULO DE CÂMERA (CCTV).\x1b[0m\n(Vai até a tua base e usa 'instalar camera')`;
                    } else {
                        responseText = `[ERRO] Recursos insuficientes (Custo: 10x suc, 3x circ).`;
                    }
                }
                else if (itemCraft === 'drone') {
                    if (player.inventory.metal_base >= 100 && player.inventory.circuitos >= 20 && player.inventory.nucleo_energia >= 1) {
                        player.inventory.metal_base -= 100;
                        player.inventory.circuitos -= 20;
                        player.inventory.nucleo_energia -= 1;
                        player.inventory.drone = 1;
                        responseText = `\x1b[1;36m[CRAFT ÉPICO] SUCESSO! Você reativou um DRONE DE COMPANHIA!\x1b[0m\nEle vai te ajudar em combate e economizar energia na exploração.`;
                    } else {
                        responseText = `[ERRO] Custo do Drone: 100x suc, 20x circ, 1x nucleo_energia.`;
                    }
                }
                else {
                    responseText = `[CRAFT] Receitas válidas: 'craft faca', 'craft bomba', 'craft mina', 'craft camera', 'craft drone'`;
                }
                break;
            }

            case 'plantar': {
                if (args[1] === 'mina') {
                    if ((player.inventory.minas || 0) > 0) {
                        const minaExistente = await Mine.findOne({ x: player.location.x, y: player.location.y, world: player.location.world });
                        if (minaExistente) {
                            responseText = `\x1b[31m[ERRO] Já existe uma mina plantada nestas coordenadas.\x1b[0m`;
                            break;
                        }
                        player.inventory.minas -= 1;
                        await new Mine({
                            x: player.location.x,
                            y: player.location.y,
                            world: player.location.world,
                            owner: player.username,
                            clan: player.clan
                        }).save();
                        responseText = `\x1b[32m[TÁTICA] Mina terrestre armada e invisível nas coordenadas [${player.location.x}, ${player.location.y}].\x1b[0m`;
                    } else {
                        responseText = `\x1b[31m[ERRO] Não tens minas no inventário. Use 'craft mina'.\x1b[0m`;
                    }
                } else {
                     responseText = `[USO] plantar mina`;
                }
                break;
            }
            
            case 'explorar': {
                // DRONE reduz o custo de explorar de 5 para 3 de energia!
                const custoEnergia = (player.inventory.drone || 0) > 0 ? 3 : 5;

                if (player.status.energy < custoEnergia) {
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

                if (global.mundo && global.mundo.clima === 'TEMPESTADE_RAD') {
                    player.status.hp -= 15;
                    responseText += `\x1b[1;31m[RADIAÇÃO] Estás exposto à tempestade! Sofreste 15 de dano radiativo.\x1b[0m\n`;
                    if (player.status.hp <= 0) {
                        responseText += `\x1b[31m[SISTEMA] O teu traje derreteu com a radiação. Clonagem de emergência ativada.\x1b[0m\n`;
                        player.status.hp = player.status.maxHp;
                        player.location.x = 10; 
                        player.location.y = 10;
                        await player.save();
                        return { text: responseText, playerData: player };
                    }
                }

                player.status.energy -= custoEnergia;

                // 1. CHEFÃO DO WORLD_001
                if (player.location.x === 15 && player.location.y === 15 && player.location.world === 'world_001') {
                    player.combatState.inCombat = true;
                    player.combatState.enemyId = 'rei_mutante';
                    player.combatState.enemyHp = ascii.enemies.rei_mutante.baseHp;
                    
                    io.to(player.socketId).emit('play_audio', 'boss'); // Toca RUGIDO!
                    
                    responseText = `\x1b[1;31m[PERIGO EXTREMO] O CHÃO TREME. VOCÊ ENTROU NO NINHO DO CHEFE!\x1b[0m\n` + 
                                   ascii.enemies.rei_mutante.art.join('\n') + 
                                   `\n\n\x1b[31m[COMBATE] O ${ascii.enemies.rei_mutante.name} surge das sombras. Digite 'atacar'.\x1b[0m`;
                    break; 
                }

                // 2. NOVO CHEFÃO DO WORLD_002
                if (player.location.x === 20 && player.location.y === 20 && player.location.world === 'world_002') {
                    player.combatState.inCombat = true;
                    player.combatState.enemyId = 'behemoth_radioativo';
                    player.combatState.enemyHp = ascii.enemies.behemoth_radioativo.baseHp;
                    
                    io.to(player.socketId).emit('play_audio', 'boss'); // Toca RUGIDO!
                    
                    responseText = `\x1b[1;41;37m [ AMEAÇA NÍVEL OMEGA DETECTADA ] \x1b[0m\n` + 
                                   `\x1b[31mO contador Geiger do seu traje estoura. Uma montanha de metal e radiação se ergue!\x1b[0m\n` +
                                   ascii.enemies.behemoth_radioativo.art.join('\n') + 
                                   `\n\n\x1b[31m[COMBATE] O ${ascii.enemies.behemoth_radioativo.name} ruge. Digite 'atacar' se tiver coragem.\x1b[0m`;
                    break; 
                }

                let sorte = Math.random();
                if (player.implants && player.implants.optica) sorte -= 0.15;
                
                if (sorte < 0.45) { 
                    let multiplicador = (global.mundo && global.mundo.periodo === 'NOITE') ? 2 : 1;
                    const sucata = (Math.floor(Math.random() * 5) + 1) * multiplicador;
                    
                    player.inventory.metal_base += sucata;
                    responseText = `[SISTEMA] Vasculhando os destroços... \x1b[33mEncontraste ${sucata}x metal_base!\x1b[0m`;
                    
                    const chanceDrop = Math.floor(Math.random() * 100) + 1;
                    if (chanceDrop >= 98 && !player.inventory.holofita_01) { 
                        player.inventory.holofita_01 = 1; 
                        responseText += `\n\x1b[1;35m[MISTÉRIO] Escavaste uma cassete antiga: "holofita_01".\x1b[0m`; 
                    }
                    else if (chanceDrop >= 96) { 
                        player.inventory.nucleo_energia = (player.inventory.nucleo_energia || 0) + 1; 
                        responseText += `\n\x1b[1;33m[DROP ÉPICO!] Você encontrou 1x NÚCLEO DE ENERGIA!\x1b[0m`; 
                    }
                    else if (chanceDrop >= 88) { 
                        player.inventory.cofre_fechado = (player.inventory.cofre_fechado || 0) + 1; 
                        responseText += `\n\x1b[1;34m[ACHADO RARO] Você desenterrou um COFRE ANTIGO! (Use 'hackear cofre').\x1b[0m`; 
                    }
                    else if (chanceDrop >= 78) { 
                        player.inventory.bio_chips = (player.inventory.bio_chips || 0) + 1; 
                        responseText += `\n\x1b[1;35m[TECNOLOGIA MÉDICA] Encontraste 1x bio_chip!\x1b[0m`; 
                    }
                    else if (chanceDrop >= 65) { 
                        player.inventory.circuitos += 1; 
                        responseText += `\n\x1b[36m[DROP INCOMUM] Você encontrou 1x circuito!\x1b[0m`; 
                    }

                } else if (sorte < 0.6) {
                    responseText = `[SISTEMA] Apenas poeira e vento radioativo. Nada útil encontrado.`;
                } else {
                    let listaInimigos = ['rat_mutante', 'escorpiao', 'drone_corrompido', 'cao_sintetico'];
                    
                    if (player.location.world === 'world_002') {
                        listaInimigos = ['saqueador', 'andarilho_ferro', 'golias_mutante'];
                    }

                    const inimigoSorteado = listaInimigos[Math.floor(Math.random() * listaInimigos.length)];
                    const inimigoInfo = ascii.enemies[inimigoSorteado];

                    player.combatState.inCombat = true;
                    player.combatState.enemyId = inimigoSorteado;
                    player.combatState.enemyHp = inimigoInfo.baseHp;
                    
                    io.to(player.socketId).emit('play_audio', 'mob'); // Toca SOM DE MOB!
                    
                    responseText = `\x1b[31m[ALERTA] Inimigo detectado!\x1b[0m\n` + 
                                   inimigoInfo.art.join('\n') + 
                                   `\n\n\x1b[31m[COMBATE] O ${inimigoInfo.name} prepara-se para atacar. Digite 'atacar' ou 'fugir'.\x1b[0m`;
                }
                break;
            }

            case 'limpar': {
                responseText = "\x1b[2J\x1b[H" + ascii.drawBox("TERMINAL WASTELAND", ["TELA LIMPA. SISTEMA PRONTO."]);
                break;
            }

            default: {
                responseText = `\x1b[31m[ERRO] Comando '${command}' não reconhecido.\x1b[0m Digite 'ajuda'.`;
            }
        }

        await player.save();
        return { text: responseText, playerData: player };
    }
};

module.exports = parser;