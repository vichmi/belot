const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const cookieParser = require('cookie-parser');
const cors = require('cors');
const io = new Server(server, {
    cors: {
        origin: `http://localhost:5173`,
        credentials: true
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
io.on('error', function(e) {
    if(e.code == 'ECONNREFUSED') {
        console.log('Is the server running at ' + PORT + '?');

        client.setTimeout(4000, function() {
            client.connect(PORT, HOST, function(){
                console.log('CONNECTED TO: ' + HOST + ':' + PORT);
                client.write('I am the inner superman');
            });
        });

        console.log('Timeout for 5 seconds before trying port:' + PORT + ' again');

    }   
});

server.listen(PORT, err => {
    if(err) {
        process.exit(1);
    }
    console.log(`Server running on port ${PORT}`);
});