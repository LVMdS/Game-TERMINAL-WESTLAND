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
        // --- INIMIGOS DO WORLD_001 ---
        rat_mutante: {
            name: "RATO MUTANTE", baseHp: 45, atk: 12, def: 3, xpReward: 20,
            art: [ "      /\\___/\\",
                   "     (  o o  )", 
                   "     /   * \\", 
                   "     \\_______/" ]
        },
        escorpiao: {
            name: "ESCORPIÃO RADIOATIVO", baseHp: 65, atk: 18, def: 8, xpReward: 35,
            art: [ "       _   _ ", 
                   "      ( )_( )", 
                   "       / . \\ ", 
                   "  ---(  _  )---", 
                   "       \\_/" ]
        },
        drone_corrompido: {
            name: "DRONE CORROMPIDO", baseHp: 50, atk: 25, def: 2, xpReward: 30,
            art: [ "      \\   |   /  ", 
                   "    ---( o_o )---", 
                   "      /   |   \\  ", 
                   "        [===]    " ]
        },
        cao_sintetico: {
            name: "CÃO SINTÉTICO VAZADO", baseHp: 70, atk: 20, def: 10, xpReward: 40,
            art: [ "        __       ", 
                   "       /  \\____  ", 
                   "      /|  |    \\ ", 
                   "      \\|__|____/ ", 
                   "       | |  | |  " ]
        },
        rei_mutante: {
            name: "REI MUTANTE (CHEFÃO W1)", baseHp: 250, atk: 35, def: 15, xpReward: 150, 
            art: [ "       (M)       ", 
                   "     /|o_o|\\     ", 
                   "    / \\___/ \\    ", 
                   "   |   | |   |   ", 
                   "   |___| |___|   ", 
                   "  ZONA DE PERIGO " ]
        },

        // --- INIMIGOS DO WORLD_002 ---
        saqueador: {
            name: "SAQUEADOR DO DESERTO", baseHp: 85, atk: 22, def: 5, xpReward: 50,
            art: [ "       [###] ", 
                   "      /(o_o)\\ ", 
                   "     /|  |  |\\ ", 
                   "      |__|__| ", 
                   "       /   \\ " ]
        },
        andarilho_ferro: {
            name: "ANDARILHO DE FERRO", baseHp: 180, atk: 45, def: 20, xpReward: 120,
            art: [ "     [⚙️]_____  ", 
                   "    /|  |  |\\ ", 
                   "   /_|__|__|_\\", 
                   "    | |  | |  ", 
                   "   /_/    \\_\\ " ]
        },
        golias_mutante: {
            name: "GOLIAS MUTANTE", baseHp: 200, atk: 30, def: 25, xpReward: 100,
            art: [ "       ,___,     ", 
                   "      [ O_O ]    ", 
                   "     /|  #  |\\   ", 
                   "    / |  #  | \\  ", 
                   "      |_____|    " ]
        },
        behemoth_radioativo: {
            name: "BEHEMOTH RADIOATIVO (CHEFÃO W2)", baseHp: 600, atk: 60, def: 30, xpReward: 400,
            art: [ "       (####)    ", 
                   "     //|☢️ ☢️|\\\\  ", 
                   "    // |____| \\\\ ", 
                   "       | || |    ", 
                   "       |_||_|    ", 
                   " AMEAÇA NÍVEL OMEGA" ]
        }
    },

    mapIcons: {
        player: `${colors.bold}${colors.green}@${colors.reset}`, enemy: `${colors.red}M${colors.reset}`,
        resource: `${colors.amber}R${colors.reset}`, empty: ".", wall: "#"
    },

    cameraViews: [
        [ // 0: Calmo
            "     .      .       .         .       .      ", 
            "         / \\               * ", 
            "        /   \\      _             .           ", 
            "       /_____\\   _( )_                       ", 
            "      |       | (_ o _)    .                 ", 
            "      |_______|   |_|                        ", 
            "                                             ", 
            " STATUS: NENHUM MOVIMENTO DETECTADO          "
        ],
        [ // 1: Andarilho longe
            " .         .                  .          .   ", 
            "      .             ___                      ", 
            "           .       [o_o]         .           ", 
            "                   /[_]\\                     ", 
            "      _            _/ \\_             _       ", 
            "     ( )_         _______          _( )_     ", 
            "    (_o _)       |       |        (_ o _)    ", 
            " \x1b[31mWARNING: ANOMALIA METÁLICA NO SETOR 4\x1b[90m       "
        ],
        [ // 2: Estática
            " %$#@!*&^%$#@!*&^%$#@!*&^%$#@!*&^%$#@!*&^%$# ", 
            " &^%$#@!* \x1b[37mNO SIGNAL\x1b[90m   &^%$#@!*&^%$#@!*&^%$# ", 
            " !*&^%$#@!*&^%$#@!*&^%$#@!*&^%$#@!*&^%$#@!*& ", 
            " %$#@! \x1b[33mINTERFERÊNCIA RADIOATIVA\x1b[90m !*&^%$#@!*&^ ", 
            " &^%$#@!*&^%$#@!*&^%$#@!*&^%$#@!*&^%$#@!*&^% ", 
            " !*&^%$#@!*&^%$#@!*&^%$#@!*&^%$#@!*&^%$#@!*& ", 
            " %$#@!*&^%$#@!*&^%$#@!*&^%$#@!*&^%$#@!*&^%$# ", 
            " ERRO: CONEXÃO COM A CÂMERA PERDIDA          "
        ],
        [ // 3: NOVO - Chuva
            "  `  /  `   /   `  /  `   /   `   /  `   /   ", 
            "    /  `   /   `  /  `   /   `   /  `   /  ` ", 
            "  `  /  /\\ `   /   `  /  `   /   `   /  `    ", 
            "    /  /  \\  `   /   `  /  `   /   `   /  `  ", 
            "  `   /____\\   /   `  /  `   /   `   /  `  / ", 
            "    / |    | `   /   `  /  `   /   `   /  `  ", 
            "  `   |____|   /   `  /  `   /   `   /  `  / ", 
            " STATUS: CHUVA ÁCIDA INTENSA DETECTADA       "
        ],
        [ // 4: NOVO - Cão Sintético farejando
            " |                             |             ", 
            " |         /_\\_                |             ", 
            " |        [ o o]               |             ", 
            " |         /  |                |             ", 
            " |       _|___|_               |             ", 
            " |                             |             ", 
            " |                             |             ", 
            " \x1b[33mALERTA: QUADRÚPEDE FAREJANDO OS PORTÕES\x1b[90m     "
        ],
        [ // 5: NOVO - Rosto na escuridão (Creepy)
            " .        .            .           .         ", 
            "     .          ..           .               ", 
            "       .   _.-\"\"\"\"\"\"\"\"\"-._   .               ", 
            " .       .'  _       _  '.           .       ", 
            "        /   (O)     (O)   \\    .             ", 
            " .      |    \\_______/    |          .       ", 
            "         \\               /     .             ", 
            " \x1b[1;31mSISTEMA COMPROMETIDO. ELE ESTÁ TE OLHANDO.\x1b[90m  "
        ]
    ]
};

module.exports = asciiLibrary;