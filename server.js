const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public')); // Serve arquivos estáticos

let gameState = {
    players: {},
    board: Array(8).fill().map(() => Array(8).fill(null)), // Tabuleiro 8x8
    gameStarted: false
};

io.on('connection', (socket) => {
    console.log('Novo jogador conectado');

    socket.on('registerPlayer', (playerId) => {
        gameState.players[socket.id] = { id: playerId, type: Object.keys(gameState.players).length + 1 }; // Tipo do jogador (1 ou 2)
        console.log(`Jogador registrado: ${playerId}`);

        // Inicia o jogo quando dois jogadores se registram
        if (Object.keys(gameState.players).length === 2 && !gameState.gameStarted) {
            gameState.gameStarted = true;
            io.emit('startGame', gameState); // Inicia o jogo para todos os jogadores
        }

        socket.emit('updateGame', gameState); // Envia o estado inicial do jogo ao novo jogador
    });

    socket.on('playerAction', (data) => {
        // Atualiza o estado do jogo com base na ação recebida
        // Exemplo: processar movimento ou ataque
        if (data.action === 'move' || data.action === 'attack') {
            // Atualize gameState.board e outros elementos do estado conforme necessário
            // Exemplo simples de movimento
            const { from, to } = data;
            const player = gameState.players[socket.id];

            // Verifique se a célula de destino está vazia
            if (gameState.board[to.row][to.col] === null) {
                gameState.board[to.row][to.col] = gameState.board[from.row][from.col];
                gameState.board[from.row][from.col] = null;
            }
        }

        // Emite o novo estado do jogo para todos os jogadores
        io.emit('updateGame', gameState);
    });

    socket.on('disconnect', () => {
        console.log('Jogador desconectado');
        delete gameState.players[socket.id]; // Remove o jogador ao desconectar
    });
});

server.listen(3000, () => {
    console.log('Servidor ouvindo na porta 3000');
});
