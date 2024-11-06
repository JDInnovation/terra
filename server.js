const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public')); // Aponte para a pasta onde estão seus arquivos HTML, CSS e JS

let gameState = {
    players: {},
    board: Array(8).fill().map(() => Array(8).fill(null)),
    gameStarted: false // Flag para verificar se o jogo começou
};

io.on('connection', (socket) => {
    console.log('Novo jogador conectado');

    // Adiciona o jogador ao estado do jogo
    socket.on('registerPlayer', (playerId) => {
        gameState.players[socket.id] = { id: playerId }; // Armazena o ID do jogador
        console.log(`Jogador registrado: ${playerId}`);
        
        // Verifica se o jogo já começou
        if (Object.keys(gameState.players).length === 2 && !gameState.gameStarted) {
            gameState.gameStarted = true;
            io.emit('startGame', gameState); // Inicia o jogo para todos os jogadores
        }
        
        socket.emit('updateGame', gameState); // Envia o estado inicial do jogo ao novo jogador
    });

    socket.on('playerAction', (data) => {
        // Aqui você deve atualizar o estado do jogo com base na ação recebida
        // Exemplo: processar movimento ou ataque
        // Atualize gameState.board e outros elementos do estado conforme necessário
        // ...

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
