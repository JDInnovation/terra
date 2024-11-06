const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public')); // Onde seus arquivos HTML, CSS, JS estão

io.on('connection', (socket) => {
    console.log('Novo jogador conectado');
    
    socket.on('playerAction', (data) => {
        // Envia a ação do jogador para todos os clientes
        io.emit('updateGame', data);
    });

    socket.on('disconnect', () => {
        console.log('Jogador desconectado');
    });
});

server.listen(3000, () => {
    console.log('Servidor ouvindo na porta 3000');
});
