const colors = {
    green: "\x1b[32m",
    amber: "\x1b[33m",
    red: "\x1b[31m",
    white: "\x1b[37m",
    reset: "\x1b[0m",
    bold: "\x1b[1m"
};

const asciiLibrary = {
    
    drawBox: (title, content) => {
        let box = `${colors.white}+-----------------------------------------------+\n`;
        box += `| ${colors.bold}${colors.green}${title.padEnd(45)}${colors.reset}${colors.white} |\n`;
        box += `+-----------------------------------------------+\n`;
        content.forEach(line => {
            box += `| ${line.padEnd(45)} |\n`;
        });
        box += `+-----------------------------------------------+${colors.reset}\n`;
        return box;
    },

    enemies: {
        rat_mutante: {
            name: "RAT MUTANTE",
            baseHp: 45, atk: 12, def: 3, xpReward: 20,
            art: [ "      /\\___/\\", 
                   "     (  o o  )", 
                   "     /   * \\", 
                   "     \\_______/" 
                ]
        },
        escorpiao: {
            name: "ESCORPIÃO RADIACTIVO",
            baseHp: 65, atk: 18, def: 8, xpReward: 35,
            art: [ "       _   _ ", 
                   "      ( )_( )", 
                   "       / . \\ ", 
                   "  ---(  _  )---", 
                   "       \\_/" 
                ]
        },
        saqueador: {
            name: "SAQUEADOR DO DESERTO",
            baseHp: 85, atk: 22, def: 5, xpReward: 50,
            art: [ "       [###] ",
                   "      /(o_o)\\ ", 
                   "     /|  |  |\\ ", 
                   "      |__|__| ", 
                   "       /   \\ " 
                ]
        },
        rei_mutante: {
            name: "REI MUTANTE (CHEFÃO)",
            baseHp: 250, atk: 35, def: 15,
            xpReward: 150, 
            art: [
                "       (M)       ",
                "     /|o_o|\\     ",
                "    / \\___/ \\    ",
                "   |   | |   |   ",
                "   |___| |___|   ",
                "  ZONA DE PERIGO "
            ]
        },
        andarilho_ferro: {
            name: "ANDARILHO DE FERRO (ELITE)",
            baseHp: 180, atk: 45, def: 20,
            xpReward: 120,
            art: [
                "     [⚙️]_____  ",
                "    /|  |  |\\ ",
                "   /_|__|__|_\\",
                "    | |  | |  ",
                "   /_/    \\_\\ "
            ]
        }
    },

    mapIcons: {
        player: `${colors.bold}${colors.green}@${colors.reset}`,
        enemy: `${colors.red}M${colors.reset}`,
        resource: `${colors.amber}R${colors.reset}`,
        empty: ".",
        wall: "#"
    },

    // --- ADICIONADO AQUI PARA DENTRO DO OBJETO ---
    cameraViews: [
        // 0: Vazio / Calmo
        [
            "     .      .       .         .       .      ",
            "         / \\               * ",
            "        /   \\      _             .           ",
            "       /_____\\   _( )_                       ",
            "      |       | (_ o _)    .                 ",
            "      |_______|   |_|                        ",
            "                                             ",
            " STATUS: NENHUM MOVIMENTO DETECTADO          "
        ],
        // 1: Andarilho de Ferro ao longe
        [
            " .         .                  .          .   ",
            "      .             ___                      ",
            "           .       [o_o]         .           ",
            "                   /[_]\\                     ",
            "      _            _/ \\_             _       ",
            "     ( )_         _______          _( )_     ",
            "    (_o _)       |       |        (_ o _)    ",
            " \x1b[31mWARNING: ANOMALIA METÁLICA NO SETOR 4\x1b[90m       "
        ],
        // 2: Estática / Ruído de Radiação
        [
            " %$#@!*&^%$#@!*&^%$#@!*&^%$#@!*&^%$#@!*&^%$# ",
            " &^%$#@!* \x1b[37mNO SIGNAL\x1b[90m   &^%$#@!*&^%$#@!*&^%$# ",
            " !*&^%$#@!*&^%$#@!*&^%$#@!*&^%$#@!*&^%$#@!*& ",
            " %$#@! \x1b[33mINTERFERÊNCIA RADIOATIVA\x1b[90m !*&^%$#@!*&^ ",
            " &^%$#@!*&^%$#@!*&^%$#@!*&^%$#@!*&^%$#@!*&^% ",
            " !*&^%$#@!*&^%$#@!*&^%$#@!*&^%$#@!*&^%$#@!*& ",
            " %$#@!*&^%$#@!*&^%$#@!*&^%$#@!*&^%$#@!*&^%$# ",
            " ERRO: CONEXÃO COM A CÂMERA PERDIDA          "
        ]
    ]
};

module.exports = asciiLibrary;