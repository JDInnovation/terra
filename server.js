const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public')); // Aponte para a pasta onde estão seus arquivos HTML, CSS e JS

io.on('connection', (socket) => {
    console.log('Novo jogador conectado');

    // Receber a ação do jogador
    socket.on('playerAction', (data) => {
        console.log(`Ação recebida de ${data.player}:`, data); // Log para depuração
        // Enviar a ação para todos os outros jogadores conectados
        socket.broadcast.emit('updateGame', data);
    });

    socket.on('disconnect', () => {
        console.log('Jogador desconectado');
    });
});

server.listen(3000, () => {
    console.log('Servidor ouvindo na porta 3000');
});
