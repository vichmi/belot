const {createServer} = require('http');
const {Server} = require('socket.io');

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: 'http://localhost:3000'
    }
});

const gameSocket = require('./socket');

io.on('connection', socket => {
    gameSocket.init(socket, io);
});

httpServer.listen(3001);