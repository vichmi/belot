const Room = require('../game/room');
const Player = require('../game/player');

const rooms = [new Room(1, 'Development')];

module.exports = {
    init(socket, io) {
        socket.emit('init', rooms);
        let playerRoom, player;
        
        socket.on('join room', room => {
            playerRoom = rooms.find(r => r.id === room.id);
            if (!playerRoom || playerRoom.players.length >= 4) return;

            player = new Player(socket.id);
            playerRoom.addPlayer(player, socket, io);
        });

        socket.on('splitted card', cardIndex => {
            playerRoom.splitDeck(cardIndex, io);
        });

        socket.on('announce', announce => {
            playerRoom.makeAnnouncement(player.id, announce, io);
        });

        socket.on('play card', card => {
            playerRoom.playCard(player.id, card, io);
        });

        socket.on('disconnect', () => {
            if (!playerRoom) return;
            playerRoom.removePlayer(player, socket, io);
        });
    }
};
