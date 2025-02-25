const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const cookieParser = require('cookie-parser');
const cors = require('cors');
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173'
    }
});
require('dotenv').config();

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const PORT = process.env.PORT;

const routes = require('./routes/index');
app.use('/', routes);

const gameSocket = require('./socket');

io.on('connection', socket => {
    gameSocket.init(socket, io);
});

server.listen(PORT, err => {
    if(err) {
        process.exit(1);
    }
    console.log(`Server running on port ${PORT}`);
});