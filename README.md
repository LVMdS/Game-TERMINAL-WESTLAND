# ☢️ Terminal Wasteland

> *"A humanidade caiu, mas o mainframe sobrevive. Conecte-se, sobreviva e domine a Zona Morta."*

**Terminal Wasteland** é um RPG Textual (MUD) de sobrevivência pós-apocalíptica jogável diretamente no navegador através de um emulador de terminal retrô. 

Construído com uma arquitetura inicialmente Multiplayer (Socket.io), o jogo evoluiu para utilizar a inovadora **Ghost Engine**: um sistema Single-Player offline que simula um ecossistema multiplayer vivo, onde "Bots Fantasmas" conversam no rádio, exploram o mapa e tentam invadir a sua base enquanto você não está olhando.

---

## 🚀 Funcionalidades Principais

* 👻 **Ghost Engine (Ecossistema Simulado):** Sinta a tensão de um mundo vivo. O servidor gera rádio falso, eventos globais e "jogadores fantasmas" que caçam você e invadem sua base.
* 🏗️ **Construção de Bases:** Erga sua fortaleza no mapa. Instale extratores de sucata, forjas, garagens, sistema de câmeras (CCTV) e defenda tudo com Torretas Automatizadas.
* ⚔️ **Combate e Exploração:** Enfrente criaturas mutantes, invada Masmorras (Bunkers) com ondas de inimigos Elite e una-se (ou lute sozinho) contra World Bosses colossais.
* 🛠️ **Crafting e Upgrade:** Crie facas, bombas, minas terrestres e drones. Use a **Forja** para elevar o nível das suas armas (com risco de destruição em níveis altos!).
* 🐕 **Mascotes e Veículos:** Salve um Cão Mutante para lutar ao seu lado e monte uma Moto-Sucata movida a núcleos de energia para cruzar a Zona Morta em alta velocidade.
* 💰 **Economia Viva:** Aposte sua sucata no Cassino, negocie no Mercado Negro com o Nômade, coloque recompensas (Bounties) na cabeça de inimigos ou saqueie Airdrops (Satélites caídos).

---

## 🛠️ Tecnologias Utilizadas

* **Backend:** Node.js, Express
* **Banco de Dados:** MongoDB (com Mongoose)
* **Comunicação em Tempo Real:** Socket.io
* **Frontend:** HTML5, CSS3, Xterm.js (Emulador de Terminal)
* **Áudio:** Web Audio API (Efeitos sonoros e ambientação)

---

## ⚙️ Como Instalar e Jogar (Modo Offline)

O jogo foi projetado para rodar localmente em sua máquina, sendo 100% blindado contra a falta de internet (dependências e assets salvos localmente).

### Pré-requisitos
* [Node.js](https://nodejs.org/) instalado.
* [MongoDB](https://www.mongodb.com/try/download/community) rodando localmente na porta padrão (`27017`).

### Passos
1. Clone este repositório:
   ```bash
   git clone [https://github.com/SEU_USUARIO/terminal-wasteland.git](https://github.com/SEU_USUARIO/terminal-wasteland.git)
   cd Terminal-Wasteland
    ```
    **Instale as dependencias**
    ```bash
        npm install express socket.io mongoose
    ```

    **Rode o servidor**
    ```bash
        node server/server.js
    ```

**inicie o Banco de Dados:**
    Certifique-se de que o MongoDB está rodando na sua máquina na porta 27017 (ou configure sua string no server.js).

## Acesse o Terminal:
Abra seu navegador em http://localhost:3000, e siga as instruções de registro ou login.


## Comandos Básicos
| Comando | Descrição |
| :--- | :--- |
| `registrar <nome> <senha>` | Cria sua conta no Mainframe (Você ganha um Kit Inicial!). |
| `login <nome> <senha>` | Acessa seu personagem salvo. |
| `ajuda` | Mostra a lista completa de comandos disponíveis. |
| `status` | Exibe seus atributos, HP, Energia, inventário e GPS. |
| `explorar` | Gasta energia para procurar loot ou enfrentar inimigos. |
| `norte`, `sul`, `leste`, `oeste` | Movimenta seu personagem pelo mapa da Zona Morta. |
| `mapa` | Abre o radar local mostrando escombros e bases próximas. |

## Comandos Avançados
## ⚙️ Comandos Avançados (V2.2)

| Comando | Descrição |
| :--- | :--- |
| `construir [tipo]` | Constrói estruturas (`base`, `extrator`, `forja`, `garagem`, `moto`). |
| `base [ação]` | Gere a tua base (`status`, `recolher`, `depositar [item]`, `sacar [item]`). |
| `melhorar arma` | Aprimora o dano da tua arma (requer uma Forja construída na base). |
| `craft [item]` | Fabrica itens de sobrevivência (`faca`, `bomba`, `mina`, `drone`, `estimulante`). |
| `usar [item]` | Consome um item do inventário (ex: `agua_pura`, `estimulante`, `cofre_dourado`). |
| `apostar [valor]` | Aposta sucata na roleta do Cassino (disponível apenas nas coordenadas [0,0]). |
| `saquear satelite` | Recolhe o airdrop global quando um satélite cai na tua zona. |
| `domesticar cao` | Salva um filhote ferido durante a exploração (requer Água e Estimulante). |
| `acelerar [direção]` | Usa a Moto-Sucata e 1 Núcleo de Energia para avançar 3 casas rapidamente. |
| `entrar bunker` | Inicia o evento de Masmorra com ondas de inimigos Elite (em coordenadas secretas). |

**"A humanidade precisa de sucata. O terminal está esperando por você." - Desenvolvido por Leonardo De Souza.**