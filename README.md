# 🌌 TERMINAL WASTELAND: O ÚLTIMO MAINFRAME

### 📜 O Grande Colapso (Ano 2098)
O mundo não acabou com uma grande explosão, mas com um silêncio ensurdecedor seguido de caos digital. O "Vírus Ômega" infectou a infraestrutura global, transformando drones de entrega em máquinas de caça e sistemas de suporte à vida em armadilhas mortais. Em meses, a civilização colapsou. O céu escureceu com a poeira de cidades em chamas e a humanidade recuou para os subsolos profundos.

### 📡 A Rede Secundária (Ano 2142)
Décadas depois, a superfície tornou-se uma "Zona Morta" dominada por biomas radioativos e máquinas de guerra defeituosas, como os **Andarilhos de Ferro**. A única forma de comunicação e exploração remota é através da **Rede Secundária** — um sistema de terminais militares de texto puro que sobreviveu aos pulsos eletromagnéticos por ser analógico e isolado.

### 🤖 O Seu Papel: O Reciclador
Você assume o controle de um terminal mestre. Através dele, você comanda trajes de exploração robótica na superfície. Sua missão é vital para a sobrevivência da colônia subterrânea:
1. **Coletar:** Vasculhar escombros em busca de `metal_base` (sucata) e circuitos.
2. **Reconstruir:** Erigir Bases Seguras para estocar recursos e processar energia.
3. **Dominar:** Formar Clãs com outros Recicladores, proteger seu território com torretas e usar explosivos para saquear cofres inimigos.

**"No Wasteland, o conhecimento é poder, mas o metal é a única lei que resta."**


## 🕹️ Principais Mecânicas Implementadas

O jogo evoluiu de um simples chat para um ecossistema persistente e vivo:

* **Mundo Procedural & Biomas:** Navegação por coordenadas infinitas com radar (`mapa`). Viagens dimensionais/zonas de alto nível (`world_002` para nível 5+).
* **Economia B2B (Mercado Livre):** Sistema de comércio entre jogadores. Venda itens e receba os lucros em tempo real (`mercado livre`, `vender`).
* **Ciclo Dia/Noite & Clima Dinâmico:** Eventos de servidor independentes dos jogadores. A noite dobra o loot e aumenta a força inimiga; tempestades radioativas causam dano a quem não estiver em abrigos.
* **Construção de Bases & Indústria:** Construa abrigos, instale até 4 *Torretas Automáticas* de defesa e implemente *Extratores* para farmar recursos passivamente offline (`base recolher`).
* **Sistemas CCTV (Five Nights at Freddy's style):** Craft e instale Câmeras na sua base. Acesse feeds de vigilância renderizados em Arte ASCII em tempo real (`cam 1`).
* **Hacking de Cofres:** Mini-game de lógica (estilo Mastermind) integrado ao terminal para decodificar senhas de 3 dígitos e obter loots épicos (`hackear cofre`).
* **Companheiros Robóticos (Pets):** Crafter um `drone` reduz o custo de estamina nas explorações e auxilia com tiros de laser durante os combates por turnos.
* **Guerra de Facções & PvP Assíncrono:** Sistema de clãs com cofre compartilhado e mecânicas de invasão de base (Raid) utilizando bombas caseiras contra defesas inimigas.
* **Lore & Áudio Imersivo:** Efeitos Sonoros de digitação mecânica e ruídos de reator, associados a um shader visual CRT/Neon Green e colecionáveis narrativos (`holofita_01`).


# 📑 ESPECIFICAÇÕES TÉCNICAS - TERMINAL WASTELAND V1.0

### 🔧 Stack Tecnológica (Arquitetura)
* **Servidor:** Node.js (Ambiente de execução JavaScript assíncrono).
* **Comunicação:** Socket.io (WebSockets para latência zero em tempo real).
* **Banco de Dados:** MongoDB v4.4 (Persistência de jogadores, inventários e bases).
* **Frontend:** Xterm.js (Emulação de terminal profissional via navegador).
* **Túnel de Rede:** Ngrok (Exposição segura de porta local para a Web).

### ⚙️ Sistemas Implementados
1.  **Geração de Mapa:** Algoritmo Procedural Determinístico baseado em coordenadas (x, y). O mapa é infinito e não consome espaço em disco.
2.  **Mecânica de Invasão:** Cálculo de probabilidade baseado em ATK da Arma + Bônus de Bomba - Nível de Defesa da Base Alvo.
3.  **Sistema de Biomas:** Suporte a múltiplos mundos (`world_001`, `world_002`) com tabelas de monstros e loot distintas.
4.  **Segurança:** Filtro de comandos por `socket.id` e verificação de login obrigatória para acesso à lógica do jogo.

### 👑 Comandos de Administrador (God Mode)
Restrito a usuários pré-definidos no código:
* `admin dar [user] [item] [qtd]`: Manipulação direta de inventário.
* `admin tp [x] [y]`: Teletransporte global.
* `admin anuncio [msg]`: Transmissão broadcast para todos os terminais ativos.


## 🚀 Como Executar Localmente

Se você deseja rodar o seu próprio servidor de Terminal Wasteland:

1. **Clone o repositório:**
   ```bash
   git clone [https://github.com/SeuUsuario/Terminal-Wasteland.git](https://github.com/SeuUsuario/Terminal-Wasteland.git)
   cd Terminal-Wasteland
    ```
    ```bash
        npm install
    ```

**inicie o Banco de Dados:**
    Certifique-se de que o MongoDB está rodando na sua máquina na porta 27017 (ou configure sua string no server.js).

## Acesse o Terminal:
Abra seu navegador em http://localhost:3000, clique em qualquer lugar da tela preta para habilitar os recursos de som,
e digite registrar <seu_nome> e <senha> .




**"A humanidade precisa de sucata. O terminal está esperando por você." - Desenvolvido por Leonardo De Souza.**