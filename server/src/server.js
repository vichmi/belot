const {createServer} = require('http');
const {Server} = require('socket.io');
require('dotenv').config();
const httpServer = createServer();

const PORT = process.env.PORT;

const io = new Server(httpServer, {
    cors: {
        origin: 'http://localhost:5173'
    }
});

const gameSocket = require('./socket');

io.on('connection', socket => {
    gameSocket.init(socket, io);
});

httpServer.listen(PORT, err => {
    if(err) {
        process.exit(1);
    }
    console.log(`Server running on port ${PORT}`);
});