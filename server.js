const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public')); // Aponte para a pasta onde estão seus arquivos HTML, CSS e JS

let gameState = {
    players: {}, // Mapeia jogadores e seus estados
    board: Array(8).fill().map(() => Array(8).fill(null)), // Inicializa o tabuleiro
};

io.on('connection', (socket) => {
    console.log('Novo jogador conectado');

    // Adiciona o jogador ao estado do jogo
    socket.on('registerPlayer', (playerId) => {
        gameState.players[playerId] = { /* detalhes do jogador, como a posição inicial */ };
        socket.emit('updateGame', gameState); // Envia o estado inicial do jogo ao novo jogador
    });

    socket.on('playerAction', (data) => {
        // Atualiza o estado do jogo com base na ação recebida
        // Exemplo: processar ataque ou movimento
        // Atualize gameState.board e outros elementos do estado conforme necessário
        // ...

        // Emite o novo estado do jogo para todos os jogadores
        io.emit('updateGame', gameState);
    });

    socket.on('disconnect', () => {
        console.log('Jogador desconectado');
    });
});

server.listen(3000, () => {
    console.log('Servidor ouvindo na porta 3000');
});
