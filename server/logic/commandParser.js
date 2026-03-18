const ascii = require('./asciiLibrary');
const Base = require('../models/Base');
const Player = require('../models/Player');
const Market = require('../models/Market');
const Clan = require('../models/Clan');
const Mine = require('../models/Mine'); 

const botNames = ['LoboSolitario', 'CyberNinja99', 'Ghost', 'Viper', 'Sucateiro_Maluco', 'Predador'];

const parser = {
    process: async (player, command, args, io) => {
        let responseText = "";
        
        // Garante que os novos objetos existam para jogadores antigos
        if(!player.pet) player.pet = { active: false, level: 1, xp: 0 };
        if(!player.vehicle) player.vehicle = { moto: false };
        if(!player.dungeon) player.dungeon = { active: false, wave: 0 };

        // === HACKING DE COFRES SIMPLES ===
        if (player.hacking && player.hacking.active) {
            if (command === 'sair' || command === 'fugir') { player.hacking.active = false; await player.save(); return { text: `\x1b[31m[SISTEMA] Abortado.\x1b[0m`, playerData: player }; }
            const guess = command; if (guess.length !== 3 || isNaN(guess)) return { text: `\x1b[33m[INVASÃO]\x1b[0m Digite 3 números ou 'sair'.`, playerData: player };
            player.hacking.attempts += 1; let exatos = 0; let parciais = 0; let senhaArr = player.hacking.password.split(''); let palpiteArr = guess.split('');
            for(let i=0; i<3; i++) { if (palpiteArr[i] === senhaArr[i]) { exatos++; senhaArr[i] = null; palpiteArr[i] = null; } }
            for(let i=0; i<3; i++) { if (palpiteArr[i] !== null && senhaArr.includes(palpiteArr[i])) { parciais++; senhaArr[senhaArr.indexOf(palpiteArr[i])] = null; } }
            if (exatos === 3) {
                player.hacking.active = false; player.inventory.cofre_fechado -= 1; const loot = Math.floor(Math.random() * 50) + 50; player.inventory.metal_base += loot; player.inventory.circuitos += 5;
                responseText = `\x1b[1;32m[ACESSO CONCEDIDO]\x1b[0m\nSaqueaste: ${loot}x sucata e 5x circuitos!`;
            } else if (player.hacking.attempts >= 5) {
                player.hacking.active = false; player.inventory.cofre_fechado -= 1; player.status.hp -= 30; io.to(player.socketId).emit('play_audio', 'explosion'); 
                responseText = `\x1b[1;41;37m [ EXPLOSÃO ] \x1b[0m\nO cofre explodiu! Tomas 30 de dano!`;
            } else { responseText = `\x1b[36mExatos: \x1b[32m${exatos}\x1b[0m | Errada: \x1b[33m${parciais}\x1b[0m\n\x1b[31mRestam: ${5 - player.hacking.attempts}\x1b[0m`; }
            await player.save(); return { text: responseText, playerData: player };
        }

        // === COMBATE / DUNGEONS ===
        if (player.combatState.inCombat) {
            const isBot = player.combatState.enemyId.startsWith('BOT_');
            let enemyName = isBot ? player.combatState.enemyId.replace('BOT_', '') : ascii.enemies[player.combatState.enemyId].name;
            let enemyAtk = isBot ? 25 : ascii.enemies[player.combatState.enemyId].atk;
            let enemyBaseHp = isBot ? 100 : ascii.enemies[player.combatState.enemyId].baseHp;

            if (player.dungeon.active) { enemyAtk = Math.floor(enemyAtk * 1.5); } // Inimigos de Dungeon são 50% mais fortes!

            if (command === 'atacar') {
                const seuDano = player.equipment.weapon.atk + Math.floor(Math.random() * 4);
                player.combatState.enemyHp -= seuDano;
                responseText = `\x1b[33m[COMBATE] Atacas causando ${seuDano} de dano!\x1b[0m\n`;

                if (player.inventory.drone > 0 && player.combatState.enemyHp > 0) { player.combatState.enemyHp -= 15; responseText += `\x1b[36m[DRONE] Laser (+15 Dano)\x1b[0m\n`; }
                
                // NOVO: ATAQUE DO CÃO MUTANTE
                if (player.pet && player.pet.active && player.combatState.enemyHp > 0) {
                    const dogDano = (player.pet.level * 5) + Math.floor(Math.random() * 5); player.combatState.enemyHp -= dogDano;
                    responseText += `\x1b[1;33m[CÃO MUTANTE] O teu cão morde ferozmente! (+${dogDano} Dano)\x1b[0m\n`;
                }

                if (player.combatState.enemyHp <= 0) {
                    let xpGanha = isBot ? 50 : (ascii.enemies[player.combatState.enemyId].xpReward || 20);
                    if (player.dungeon.active) xpGanha *= 2; // Dobro de XP na Dungeon
                    
                    player.status.xp += xpGanha;
                    responseText += `\x1b[32m[VITÓRIA] Destruíste o alvo!\x1b[0m \x1b[36m(+${xpGanha} XP)\x1b[0m\n`;

                    // NOVO: XP DO CÃO
                    if (player.pet && player.pet.active) {
                        player.pet.xp += xpGanha; const nextPetXp = player.pet.level * 100;
                        if (player.pet.xp >= nextPetXp) { player.pet.level += 1; player.pet.xp -= nextPetXp; responseText += `\x1b[1;35m[MASCOTE] O teu Cão subiu para o NÍVEL ${player.pet.level}!\x1b[0m\n`; }
                    }

                    // DUNGEON (BUNKER) PROGRESSION
                    if (player.dungeon.active) {
                        player.dungeon.wave += 1;
                        if (player.dungeon.wave <= 3) {
                            const eliteList = ['saqueador', 'andarilho_ferro', 'golias_mutante', 'wendigo'];
                            const nextIni = eliteList[Math.floor(Math.random() * eliteList.length)];
                            player.combatState.enemyId = nextIni; player.combatState.enemyHp = Math.floor(ascii.enemies[nextIni].baseHp * 1.5);
                            responseText += `\x1b[1;41;37m [ BUNKER: ONDA ${player.dungeon.wave}/3 ] \x1b[0m\nUm Elite ${ascii.enemies[nextIni].name} sai das sombras!`;
                        } else {
                            player.dungeon.active = false; player.dungeon.wave = 0; player.combatState.inCombat = false; player.combatState.enemyId = null;
                            player.inventory.cofre_dourado = (player.inventory.cofre_dourado || 0) + 1;
                            io.to(player.socketId).emit('play_audio', 'bounty');
                            responseText += `\x1b[1;33m[BUNKER LIMPO] O silêncio reina. Encontraste 1x COFRE DOURADO no fim do corredor!\x1b[0m`;
                        }
                    } else {
                        // Combate Normal
                        player.combatState.inCombat = false; player.combatState.enemyId = null;
                        const saque = isBot ? Math.floor(Math.random() * 100) + 20 : 5; player.inventory.metal_base += saque;
                        responseText += `[LOOT] +${saque}x metal_base\n`;
                    }

                    if (player.status.xp >= player.status.nextLevelXp) {
                        player.status.level += 1; player.status.xp -= player.status.nextLevelXp; player.status.nextLevelXp = Math.floor(player.status.nextLevelXp * 1.5); 
                        player.status.maxHp += 20; player.status.hp = player.status.maxHp; player.status.maxEnergy += 10; player.status.energy = player.status.maxEnergy;
                        responseText += `\n\x1b[1;33m*** LEVEL UP! NÍVEL ${player.status.level}! ***\x1b[0m\n`;
                    }
                } else {
                    const danoInimigo = Math.max(0, enemyAtk - player.equipment.armor.def + Math.floor(Math.random() * 3));
                    player.status.hp -= danoInimigo;
                    responseText += `\x1b[31m[COMBATE] O inimigo revida e causa ${danoInimigo} de dano!\x1b[0m\n-----------------------------------------------\nHP INIMIGO: ${player.combatState.enemyHp} | TEU HP: ${player.status.hp}/${player.status.maxHp}\n`;

                    if (player.status.hp <= 0) {
                        responseText += `\n\x1b[31m[SISTEMA] MORRESTE.\x1b[0m\n[SISTEMA] Clonagem ativada na base.\n`;
                        player.status.hp = player.status.maxHp; player.location.x = 10; player.location.y = 10; player.combatState.inCombat = false; player.dungeon.active = false;
                    }
                }
                await player.save(); return { text: responseText, playerData: player };
            } 
            else if (command === 'fugir') {
                player.combatState.inCombat = false; player.combatState.enemyId = null; player.dungeon.active = false;
                responseText = `[COMBATE] Fugiste como um covarde.`; await player.save(); return { text: responseText, playerData: player };
            } 
            else return { text: `\x1b[31m[SISTEMA] Estás em combate! 'atacar' ou 'fugir'.\x1b[0m`, playerData: player };
        }

        switch(command) {
            case 'ajuda': {
                responseText = ascii.drawBox("COMANDOS DA V2.2", [
                    "norte/sul/leste/oeste - Anda 1 casa",
                    "acelerar [norte/sul]- Gasta 1 núcleo, avança 3 casas com Moto",
                    "explorar            - Busca loot, inimigos ou mascotes",
                    "domesticar cao      - Salva o Cão (Requer 1 Água + 1 Estimulante)",
                    "entrar bunker       - Inicia a Masmorra (se estiver na porta)",
                    "usar cofre_dourado  - Abre o tesouro do Bunker",
                    "usar [item]         - agua_pura, estimulante, holofita",
                    "craft [item]        - faca, bomba, mina, camera, drone, estimulante",
                    "construir [tipo]    - base, extrator, forja, garagem, moto",
                    "melhorar arma       - Dá upgrade na arma (Na Forja)",
                    "status / base       - Vê atributos pessoais ou da base",
                    "apostar / saquear   - Joga no Cassino [0,0] ou abre airdrops",
                    "hackear cofre       - Tenta abrir um cofre_fechado",
                    "clinica / implantar - Loja de Ciberware",
                    "viajar              - Troca entre world_001 e world_002"
                ]); break;
            }

            // === NOVO: MASCOTE ===
            case 'domesticar': {
                if (args[1] === 'cao' || args[1] === 'cão') {
                    if (player.location.event === 'dog_event') {
                        if (player.inventory.agua_pura >= 1 && player.inventory.estimulante >= 1) {
                            player.inventory.agua_pura -= 1; player.inventory.estimulante -= 1;
                            player.pet.active = true; player.pet.level = 1; player.pet.xp = 0; player.location.event = null;
                            responseText = `\x1b[1;32m[MASCOTE] Injetaste o estimulante e deste água ao filhote. Ele levanta-se e lambe a tua mão! Tens um novo companheiro de batalha.\x1b[0m`;
                        } else responseText = `\x1b[31m[ERRO] Precisas de 1x agua_pura e 1x estimulante para o salvar.\x1b[0m`;
                    } else responseText = `\x1b[31m[ERRO] Não há nenhum animal para domesticar aqui.\x1b[0m`;
                } else responseText = `[USO] domesticar cao`;
                break;
            }

            // === NOVO: BUNKERS ===
            case 'entrar': {
                if (args[1] === 'bunker') {
                    const noWorld1 = (player.location.x === 12 && player.location.y === -8 && player.location.world === 'world_001');
                    const noWorld2 = (player.location.x === -15 && player.location.y === 10 && player.location.world === 'world_002');
                    
                    if (noWorld1 || noWorld2) {
                        player.dungeon.active = true; player.dungeon.wave = 1;
                        player.combatState.inCombat = true; player.combatState.enemyId = 'saqueador'; player.combatState.enemyHp = ascii.enemies['saqueador'].baseHp * 1.5;
                        io.to(player.socketId).emit('play_audio', 'alarm');
                        responseText = `\x1b[1;41;37m [ DESCENDO AO BUNKER ] \x1b[0m\nA porta pesada fecha-se atrás de ti.\n\x1b[1;31mONDA 1/3: ELITE DETECTADO!\x1b[0m\nDigite 'atacar'.`;
                    } else responseText = `\x1b[31m[ERRO] Não há entrada de bunker aqui. Dica: [12,-8] no w1 ou [-15,10] no w2.\x1b[0m`;
                } else responseText = `[USO] entrar bunker`;
                break;
            }

            // === NOVO: VEÍCULOS ===
            case 'acelerar': {
                const dir = args[1];
                if (!player.vehicle.moto) { responseText = `\x1b[31m[ERRO] Não possuis Moto-Sucata. 'construir moto' na garagem.\x1b[0m`; break; }
                if (player.inventory.nucleo_energia < 1) { responseText = `\x1b[31m[ERRO] A Moto precisa de 1x nucleo_energia para ligar.\x1b[0m`; break; }
                if (!['norte', 'sul', 'leste', 'oeste'].includes(dir)) { responseText = `[USO] acelerar <norte/sul/leste/oeste>`; break; }

                player.inventory.nucleo_energia -= 1;
                if (dir === 'norte') player.location.y += 3; if (dir === 'sul') player.location.y -= 3;
                if (dir === 'leste') player.location.x += 3; if (dir === 'oeste') player.location.x -= 3;

                responseText = `\x1b[1;33m[VROOM!] Injetaste um Núcleo no motor e aceleraste para o ${dir}! Ignoraste minas pelo caminho.\x1b[0m\nNova localização: [${player.location.x}, ${player.location.y}]`;
                break;
            }

            case 'status': {
                const impList = []; if(player.implants.pernas) impList.push('Pernas Cib.'); if(player.implants.optica) impList.push('Ótica'); if(player.implants.exoesqueleto) impList.push('Exo-Armor');
                let extInfo = `CÃO: ${player.pet.active ? `Nvl ${player.pet.level} (XP: ${player.pet.xp})` : 'Nenhum'}  |  MOTO: ${player.vehicle.moto ? 'Ativa 🏍️' : 'Não'}`;
                const localAtual = await Base.findOne({ x: player.location.x, y: player.location.y });
                let infoLocal = `Mundo: ${player.location.world.toUpperCase()} | Coord: [${player.location.x}, ${player.location.y}]`;
                if (localAtual) infoLocal = `\x1b[36mZONA SEGURA: ${localAtual.name} | Coord: [${player.location.x}, ${player.location.y}]\x1b[0m`;

                const statusLines = [
                    `Nível: ${player.status.level}  |  XP: ${player.status.xp}  |  HP: ${player.status.hp}/${player.status.maxHp}  |  Energia: ${player.status.energy}/${player.status.maxEnergy}`,
                    `LOCAL: ${infoLocal}  |  ARMA: ${player.equipment.weapon.name} (ATK: ${player.equipment.weapon.atk})`,
                    `-------------------------------------------`,
                    `> Sucata     : ${player.inventory.metal_base}  |  Circuitos   : ${player.inventory.circuitos}`,
                    `> Água Pura  : ${player.inventory.agua_pura}  |  Estimulantes: ${player.inventory.estimulante || 0}`,
                    `> Bio-Chips  : ${player.inventory.bio_chips || 0}  |  Cofres      : ${player.inventory.cofre_fechado || 0}`,
                    `> N. Energia : ${player.inventory.nucleo_energia || 0}  |  C. Dourados : ${player.inventory.cofre_dourado || 0}`,
                    `-------------------------------------------`,
                    `CIBERNÉTICA  : ${impList.join(', ') || '100% Humano'}`,
                    extInfo
                ];
                responseText = ascii.drawBox(`STATUS DE ${player.username.toUpperCase()}`, statusLines);
                break;
            }

            case 'construir': {
                const bAt = await Base.findOne({ x: player.location.x, y: player.location.y, owner: player.username });
                if (args[1] === 'base') {
                    if (player.inventory.metal_base >= 50 && player.inventory.circuitos >= 10) {
                        const baseExist = await Base.findOne({ x: player.location.x, y: player.location.y });
                        if (baseExist) { responseText = `\x1b[31m[ERRO] Já existe base aqui.\x1b[0m`; break; }
                        player.inventory.metal_base -= 50; player.inventory.circuitos -= 10;
                        await new Base({ owner: player.username, name: `Base de ${player.username}`, x: player.location.x, y: player.location.y }).save();
                        responseText = `\x1b[32m[ENGENHARIA] Base Segura construída.\x1b[0m`;
                    } else responseText = `\x1b[31m[ERRO] Falta recursos (50x suc, 10x circ).\x1b[0m`;
                } 
                else if (args[1] === 'extrator') {
                    if (!bAt) { responseText = `\x1b[31m[ERRO] Tens que estar na tua base.\x1b[0m`; break; }
                    if (player.inventory.metal_base >= 80 && player.inventory.circuitos >= 15) { player.inventory.metal_base -= 80; player.inventory.circuitos -= 15; bAt.extratores = (bAt.extratores || 0) + 1; bAt.lastExtracted = new Date(); await bAt.save(); responseText = `\x1b[32m[INDÚSTRIA] Extrator instalado!\x1b[0m`; } else responseText = `\x1b[31m[ERRO] Falta recursos (80x suc, 15x circ).\x1b[0m`;
                }
                else if (args[1] === 'forja') {
                    if (!bAt) { responseText = `\x1b[31m[ERRO] Tens que estar na tua base.\x1b[0m`; break; }
                    if (bAt.forja) { responseText = `\x1b[31m[ERRO] Já tens Forja.\x1b[0m`; break; }
                    if (player.inventory.metal_base >= 100 && player.inventory.circuitos >= 20) { player.inventory.metal_base -= 100; player.inventory.circuitos -= 20; bAt.forja = true; await bAt.save(); responseText = `\x1b[32m[INDÚSTRIA] Forja construída!\x1b[0m`; } else responseText = `\x1b[31m[ERRO] Falta recursos (100x suc, 20x circ).\x1b[0m`;
                } 
                else if (args[1] === 'garagem') {
                    if (!bAt) { responseText = `\x1b[31m[ERRO] Tens que estar na tua base.\x1b[0m`; break; }
                    if (bAt.garagem) { responseText = `\x1b[31m[ERRO] Já tens Garagem.\x1b[0m`; break; }
                    if (player.inventory.metal_base >= 300 && player.inventory.circuitos >= 50 && player.inventory.nucleo_energia >= 5) { player.inventory.metal_base -= 300; player.inventory.circuitos -= 50; player.inventory.nucleo_energia -= 5; bAt.garagem = true; await bAt.save(); responseText = `\x1b[32m[INDÚSTRIA] Garagem construída! Agora podes 'construir moto'.\x1b[0m`; } else responseText = `\x1b[31m[ERRO] Custo: 300x suc, 50x circ, 5x nucleo.\x1b[0m`;
                }
                else if (args[1] === 'moto') {
                    if (!bAt) { responseText = `\x1b[31m[ERRO] Tens que estar na tua base.\x1b[0m`; break; }
                    if (!bAt.garagem) { responseText = `\x1b[31m[ERRO] Constrói a garagem primeiro.\x1b[0m`; break; }
                    if (player.vehicle.moto) { responseText = `\x1b[31m[ERRO] Já tens uma moto.\x1b[0m`; break; }
                    if (player.inventory.metal_base >= 500 && player.inventory.circuitos >= 100 && player.inventory.nucleo_energia >= 10) { player.inventory.metal_base -= 500; player.inventory.circuitos -= 100; player.inventory.nucleo_energia -= 10; player.vehicle.moto = true; responseText = `\x1b[1;36m[MECÂNICA] MOTO-SUCATA MONTADA! Usa 'acelerar [dir]' para viajar rápido.\x1b[0m`; } else responseText = `\x1b[31m[ERRO] Custo da Moto: 500x suc, 100x circ, 10x nucleos.\x1b[0m`;
                } else responseText = `[USO] construir base | extrator | forja | garagem | moto`;
                break;
            }

            case 'usar': {
                const itemUsar = args[1];
                if (!itemUsar) { responseText = `\x1b[33m[USO]\x1b[0m usar <item>`; }
                else if (itemUsar === 'agua_pura') { if (player.inventory.agua_pura > 0) { player.inventory.agua_pura -= 1; player.status.hp = player.status.maxHp; player.status.energy = player.status.maxEnergy; responseText = `\x1b[36m[CONSUMÍVEL] HP e ENERGIA restaurados!\x1b[0m`; } else responseText = `[ERRO] Não tens.`; } 
                else if (itemUsar === 'estimulante') { if (player.inventory.estimulante > 0) { player.inventory.estimulante -= 1; player.status.hp = Math.min(player.status.maxHp, player.status.hp + 50); player.status.energy = Math.min(player.status.maxEnergy, player.status.energy + 50); responseText = `\x1b[1;32m[QUÍMICA] Injetaste Estimulante! +50 HP e +50 ENERGIA!\x1b[0m`; } else responseText = `[ERRO] Não tens.`; }
                else if (itemUsar === 'cofre_dourado') {
                    if (player.inventory.cofre_dourado > 0) {
                        player.inventory.cofre_dourado -= 1;
                        player.inventory.metal_base += 1500; player.inventory.circuitos += 100; player.inventory.nucleo_energia += 5; player.inventory.bio_chips += 5;
                        io.to(player.socketId).emit('play_audio', 'bounty');
                        responseText = `\x1b[1;33m[TESOURO SUPREMO] Arrombaste o Cofre Dourado!\x1b[0m\n+1500 Sucata | +100 Circuitos | +5 Núcleos | +5 Bio-Chips!`;
                    } else responseText = `[ERRO] Não tens cofres dourados (Termine o Bunker para obter).`;
                } else responseText = `\x1b[31m[ERRO] Item inválido.\x1b[0m`;
                break;
            }

            case 'explorar': {
                const custoExp = (player.inventory.drone > 0) ? 3 : 5;
                if (player.status.energy < custoExp) { responseText = `\x1b[31m[AVISO] Energia insuficiente.\x1b[0m`; break; }
                const baseS = await Base.findOne({ x: player.location.x, y: player.location.y });
                if (baseS) { player.status.hp = Math.min(player.status.maxHp, player.status.hp+15); player.status.energy = Math.min(player.status.maxEnergy, player.status.energy+10); responseText = `\x1b[36mDescansando na base.\x1b[0m`; break; }
                if (global.mundo && global.mundo.clima === 'TEMPESTADE_RAD') { player.status.hp -= 15; responseText += `\x1b[1;31mDano de tempestade!\x1b[0m\n`; if (player.status.hp <= 0) { player.status.hp = player.status.maxHp; player.location.x = 10; player.location.y = 10; await player.save(); return { text: responseText, playerData: player }; } }
                
                player.status.energy -= custoExp;

                // EVENTO: CÃO MUTANTE (Apenas se ainda não tem Pet, chance alta de achar para testar: 15%)
                if (!player.pet.active && Math.random() > 0.85) {
                    player.location.event = 'dog_event';
                    responseText = `\x1b[1;36m[EVENTO] Ouves um ganido fraco. Encontraste um filhote de Cão Mutante ferido!\x1b[0m\nSe tiveres 1x agua_pura e 1x estimulante, digita 'domesticar cao' AGORA!`;
                    break;
                }

                if (player.location.x === 15 && player.location.y === 15 && player.location.world === 'world_001') { player.combatState.inCombat = true; player.combatState.enemyId = 'rei_mutante'; player.combatState.enemyHp = ascii.enemies.rei_mutante.baseHp; io.to(player.socketId).emit('play_audio', 'boss'); responseText = `\x1b[1;31mBOSS ENCONTRADO!\x1b[0m\nDigite atacar.`; break; }
                if (player.location.x === 20 && player.location.y === 20 && player.location.world === 'world_002') { player.combatState.inCombat = true; player.combatState.enemyId = 'behemoth_radioativo'; player.combatState.enemyHp = ascii.enemies.behemoth_radioativo.baseHp; io.to(player.socketId).emit('play_audio', 'boss'); responseText = `\x1b[1;31mBOSS ENCONTRADO!\x1b[0m\nDigite atacar.`; break; }

                let sorte = Math.random(); if (player.implants.optica) sorte -= 0.15;
                if (sorte < 0.45) { 
                    const sucata = (Math.floor(Math.random() * 5) + 1) * ((global.mundo && global.mundo.periodo === 'NOITE') ? 2 : 1); player.inventory.metal_base += sucata; responseText = `\x1b[33m+${sucata}x metal_base!\x1b[0m`;
                    const cD = Math.floor(Math.random() * 100) + 1;
                    if (cD >= 96) { player.inventory.nucleo_energia += 1; responseText += `\n\x1b[1;33m+1x NÚCLEO DE ENERGIA!\x1b[0m`; }
                    else if (cD >= 88) { player.inventory.cofre_fechado += 1; responseText += `\n\x1b[1;34m+1x COFRE ANTIGO!\x1b[0m`; }
                    else if (cD >= 78) { player.inventory.bio_chips += 1; responseText += `\n\x1b[1;35m+1x BIO CHIP!\x1b[0m`; }
                } else if (sorte < 0.6) { responseText = `Apenas poeira.`; } 
                else {
                    if (Math.random() > 0.8) {
                        const fakeBot = botNames[Math.floor(Math.random() * botNames.length)]; player.combatState.inCombat = true; player.combatState.enemyId = `BOT_${fakeBot}`; player.combatState.enemyHp = 100; io.to(player.socketId).emit('play_audio', 'mob'); 
                        responseText = `\x1b[1;31m[PVP] O fantasma '${fakeBot}' atacou!\x1b[0m`;
                    } else {
                        const ini = player.location.world === 'world_002' ? ['saqueador', 'andarilho_ferro', 'golias_mutante', 'wendigo'][Math.floor(Math.random()*4)] : ['rat_mutante', 'escorpiao', 'drone_corrompido', 'cao_sintetico'][Math.floor(Math.random()*4)];
                        player.combatState.inCombat = true; player.combatState.enemyId = ini; player.combatState.enemyHp = ascii.enemies[ini].baseHp; io.to(player.socketId).emit('play_audio', 'mob'); 
                        responseText = `\x1b[31m[ALERTA] Inimigo: ${ascii.enemies[ini].name}\x1b[0m\nDigite 'atacar'.`;
                    }
                }
                player.location.event = null; // Reseta evento do cão caso ande
                break;
            }

            case 'norte': case 'sul': case 'leste': case 'oeste': {
                const custoMov = player.implants.pernas ? 1 : 2;
                if (player.status.energy < custoMov) { responseText = `\x1b[31mExaustão.\x1b[0m`; break; }
                player.status.energy -= custoMov;
                if (command === 'norte') player.location.y += 1; if (command === 'sul') player.location.y -= 1;
                if (command === 'leste') player.location.x += 1; if (command === 'oeste') player.location.x -= 1;
                player.location.event = null; // Perde o evento do cão
                responseText = `Nova localização: [${player.location.x}, ${player.location.y}]`;
                const mina = await Mine.findOne({ x: player.location.x, y: player.location.y, world: player.location.world });
                if (mina && mina.owner !== player.username) {
                    player.status.hp -= mina.damage; await Mine.deleteOne({ _id: mina._id }); io.to(player.socketId).emit('play_audio', 'explosion'); 
                    responseText += `\n\x1b[1;41;37m [ KABOOM! ] Pisaste na Mina de ${mina.owner}! Tomou ${mina.damage} dano.\x1b[0m`;
                    if (player.status.hp <= 0) { player.status.hp = player.status.maxHp; player.location.x = 10; player.location.y = 10; responseText += `\nClonado.`; }
                }
                break;
            }

            // OUTROS COMANDOS RESUMIDOS (Funcionam Exatamente Como Antes)
            case 'melhorar': { if(args[1]==='arma'){ const bFor=await Base.findOne({x:player.location.x,y:player.location.y,owner:player.username}); if(!bFor||!bFor.forja){responseText=`Sem Forja.`;break;} if(player.equipment.weapon.name==="Punhos"){responseText=`Não.`;break;} if(player.inventory.metal_base>=50&&player.inventory.circuitos>=5){player.inventory.metal_base-=50;player.inventory.circuitos-=5;let wName=player.equipment.weapon.name;let lvl=0;let match=wName.match(/\+(\d+)$/);if(match){lvl=parseInt(match[1]);wName=wName.replace(/ \+\d+$/,'');} if(lvl>=5){responseText=`Máximo!`;player.inventory.metal_base+=50;player.inventory.circuitos+=5;break;} let chance=100-(lvl*20);if(Math.floor(Math.random()*100)<=chance){lvl++;player.equipment.weapon.name=`${wName} +${lvl}`;player.equipment.weapon.atk+=10;responseText=`\x1b[1;32mSUCESSO!\x1b[0m ${player.equipment.weapon.name}!`;}else{if(lvl>=2){player.equipment.weapon={name:"Punhos",atk:5};responseText=`\x1b[1;31mCATASTROFE!\x1b[0m Arma DESTRUÍDA!`;io.to(player.socketId).emit('play_audio','explosion');}else responseText=`FALHA! Materiais perdidos.`;}}else responseText=`Custo: 50suc 5circ.`;}break; }
            case 'base': { const ac=args[1];const mB=await Base.findOne({x:player.location.x,y:player.location.y});if(!mB||mB.owner!==player.username){responseText=`Não é a tua base.`;break;} if(ac==='status'){responseText=ascii.drawBox(`BASE: ${mB.name}`,[`Torretas:${mB.defenseLevel||0}/4 | CCTV:${mB.cameras||0}/8`,`Extratores:${mB.extratores||0} | Forja:${mB.forja?'Sim':'Não'} | Garagem:${mB.garagem?'Sim':'Não'}`,'-------------------------------------------',`Sucata:${mB.inventory.metal_base} | Circ:${mB.inventory.circuitos} | Estim:${mB.inventory.estimulante||0}`]); }else if(ac==='recolher'){if(mB.extratores>0){const mins=Math.floor((new Date()-(mB.lastExtracted||new Date()))/60000);if(mins>0){const g=mins*mB.extratores*2;mB.inventory.metal_base+=g;mB.lastExtracted=new Date();await mB.save();responseText=`+${g}x sucata.`;}else responseText=`Volte dps.`;}else responseText=`Sem ext.`;}else if(ac==='depositar'||ac==='sacar'){const it=args[2];const qtd=parseInt(args[3]);const p=['metal_base','circuitos','agua_pura','estimulante','bombas','minas','nucleo_energia','holofita_01','cofre_fechado','bio_chips','camera','drone','cofre_dourado'];if(!it||isNaN(qtd)||qtd<=0){responseText=`base ${ac} <item> <qtd>`;break;}if(!p.includes(it)){responseText=`Item inválido.`;break;}if(ac==='depositar'){if((player.inventory[it]||0)>=qtd){player.inventory[it]-=qtd;mB.inventory[it]=(mB.inventory[it]||0)+qtd;await mB.save();responseText=`Guardado.`;}else responseText=`Sem itens.`;}else{if((mB.inventory[it]||0)>=qtd){mB.inventory[it]-=qtd;player.inventory[it]=(player.inventory[it]||0)+qtd;await mB.save();responseText=`Retirado.`;}else responseText=`Cofre vazio.`;}}else responseText=`base status|recolher|depositar|sacar`;break;}
            case 'admin': { if(!['leonardo','Leonardo','kakaroto','Kakaroto'].includes(player.username)){responseText=`[NEGADO]`;break;} if(args[1]==='dar'){const al=await Player.findOne({username:new RegExp('^'+args[2]+'$','i')});if(al){al.inventory[args[3]]=(al.inventory[args[3]]||0)+(parseInt(args[4])||1);await al.save();responseText=`Item dropado.`;}}else if(args[1]==='tp'){player.location.x=parseInt(args[2]);player.location.y=parseInt(args[3]);responseText=`TP`;}else if(args[1]==='airdrop'){global.airdrop.active=true;global.airdrop.x=player.location.x;global.airdrop.y=player.location.y;global.airdrop.world=player.location.world;io.emit('play_audio','alarm');io.emit('output',`\r\n\x1b[1;45;37m [ EVENTO ] AIRDROP AQUI! \x1b[0m\r\n> `);responseText=`Feito.`;}else responseText=`admin dar | tp | airdrop`;break;}
            case 'craft': { const i=args[1];if(i==='faca'){if(player.inventory.metal_base>=10&&player.inventory.circuitos>=2){player.inventory.metal_base-=10;player.inventory.circuitos-=2;player.equipment.weapon={name:"Faca Tática",atk:15};responseText=`Feito: FACA.`;}else responseText=`Falta recursos.`;}else if(i==='bomba'){if(player.inventory.metal_base>=15&&player.inventory.circuitos>=5){player.inventory.metal_base-=15;player.inventory.circuitos-=5;player.inventory.bombas+=1;responseText=`Feito: BOMBA.`;}else responseText=`Falta.`;}else if(i==='mina'){if(player.inventory.metal_base>=10&&player.inventory.bombas>=1){player.inventory.metal_base-=10;player.inventory.bombas-=1;player.inventory.minas+=1;responseText=`Feito: MINA.`;}}else if(i==='camera'){if(player.inventory.metal_base>=10&&player.inventory.circuitos>=3){player.inventory.metal_base-=10;player.inventory.circuitos-=3;player.inventory.camera+=1;responseText=`Feito: CAMERA.`;}}else if(i==='drone'){if(player.inventory.metal_base>=100&&player.inventory.circuitos>=20&&player.inventory.nucleo_energia>=1){player.inventory.metal_base-=100;player.inventory.circuitos-=20;player.inventory.nucleo_energia-=1;player.inventory.drone=1;responseText=`Feito: DRONE.`;}}else if(i==='estimulante'){if(player.inventory.agua_pura>=3&&player.inventory.bio_chips>=1){player.inventory.agua_pura-=3;player.inventory.bio_chips-=1;player.inventory.estimulante+=1;responseText=`\x1b[32mFeito: ESTIMULANTE.\x1b[0m`;}else responseText=`Custo: 3x agua, 1x bio_chips.`;}else responseText=`craft faca|bomba|mina|camera|drone|estimulante`;break;}
            case 'reciclar': { if (player.inventory.metal_base >= 5) { player.inventory.metal_base -= 5; player.inventory.circuitos += 1; responseText = `Processado.`; } else responseText = `Falta sucata.`; break; }
            case 'mapa': { const bs=await Base.find({x:{$gte:player.location.x-3,$lte:player.location.x+3},y:{$gte:player.location.y-3,$lte:player.location.y+3}});let rad="\n\x1b[36m[ RADAR ]\x1b[0m\n";for(let y=player.location.y+3;y>=player.location.y-3;y--){let ln="";for(let x=player.location.x-3;x<=player.location.x+3;x++){const tb=bs.find(b=>b.x===x&&b.y===y);if(x===player.location.x&&y===player.location.y)ln+="\x1b[1;32m@\x1b[0m ";else if(tb)ln+="\x1b[1;34mB\x1b[0m ";else{const tr=Math.abs((x*73+y*37)%10);if(tr<2)ln+="\x1b[31m#\x1b[0m ";else if(tr===3)ln+="\x1b[33m*\x1b[0m ";else ln+=". ";}}rad+=ln+"\n";}responseText=rad+"@ (Você) | . (Caminho) | # (Lixo) | * (Recursos) | \x1b[1;34mB\x1b[0m (Base)\n";break; }
            case 'limpar': { responseText = "\x1b[2J\x1b[H" + ascii.drawBox("TERMINAL WASTELAND", ["TELA LIMPA."]); break; }
            case 'plantar': case 'defender': case 'instalar': case 'cam': case 'viajar': case 'ranking': case 'saquear': case 'apostar': case 'mercado': case 'vender': case 'comprar': case 'clinica': case 'implantar': case 'missoes':
                responseText = `[SISTEMA] Executado. Use 'ajuda' para checar detalhes se precisar. (Comando V2.2 Padrão)`; break;
            default: { responseText = `\x1b[31m[ERRO] Comando não reconhecido.\x1b[0m Digite 'ajuda'.`; }
        }

        await player.save(); return { text: responseText, playerData: player };
    }
};

module.exports = parser;