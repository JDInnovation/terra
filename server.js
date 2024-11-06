const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let gameState = {
    players: {},
    board: Array(8).fill().map(() => Array(8).fill(null)),
    gameStarted: false
};

io.on('connection', (socket) => {
    console.log('Novo jogador conectado');

    socket.on('registerPlayer', (playerId) => {
        gameState.players[socket.id] = { id: playerId };
        console.log(`Jogador registrado: ${playerId}`);
        
        if (Object.keys(gameState.players).length === 2 && !gameState.gameStarted) {
            gameState.gameStarted = true;
            io.emit('startGame', gameState);
        }
        
        socket.emit('updateGame', gameState);
    });

    socket.on('playerAction', (data) => {
        io.emit('updateGame', gameState);
    });

    socket.on('disconnect', () => {
        console.log('Jogador desconectado');
        delete gameState.players[socket.id];
    });
});

server.listen(3000, () => {
    console.log('Servidor ouvindo na porta 3000');
});
