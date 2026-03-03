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