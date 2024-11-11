
const Room = require('../game/room');
const Player = require('../game/player');

const rooms = [];
rooms.push(new Room(1, 'Development'))

module.exports = {
    init(socket, io) {
        socket.emit('init', rooms);
        let playerRoom, player, playerIndex;
        socket.on('join room', room => {
            if(room.players.length > 4) return;

            playerRoom = rooms.filter(r => {return r.id == room.id})[0];
            player = new Player(socket.id)
            playerIndex = playerRoom.players.findIndex( p => p.id == player.id);
            playerRoom.players.push(player);
            playerIndex = playerRoom.players.length - 1;
            socket.join(playerRoom.id);
            socket.emit('joined room', playerRoom, player);
            io.to(playerRoom.id).emit('changes', playerRoom);

            if(playerRoom.players.length == 4) {
                playerRoom.setTeams();
                playerRoom.shuffleCards();
                playerRoom.gameStage = 'split cards';
                io.to(playerRoom.id).emit('splitting', playerRoom);
            }
        });
        

        socket.on('splitted card', cardIndex => {
            playerRoom.players[playerRoom.dealingTurn].isDealer = false;
            playerRoom.dealingTurn++;
            if(playerRoom.dealingTurn >= 4) {
                playerRoom.dealingTurn = 0;
            }
            playerRoom.splitCards(cardIndex);
            playerRoom.gameStage = 'dealing';
            playerRoom.turn = playerRoom.dealingTurn + 1;
            playerRoom.players[playerRoom.dealingTurn].isDealer = true;
            if(playerRoom.turn >= 4) {
                playerRoom.turn = 0;
            }
            playerRoom.dealCards();
            playerRoom.gameStage = 'announcements';
            io.to(playerRoom.id).emit('dealing', playerRoom);
        });


        socket.on('announce', announce => {
            if(playerRoom.currentAnnouncements.includes(announce) && announce != 'Pass') {
                return;
            }
            playerRoom.turn++;
            if(playerRoom.turn >= 4) {playerRoom.turn = 0;}
            playerRoom.currentAnnouncements.push(announce);
            if(announce != 'Pass') {
                playerRoom.announcementPlayer = player;
                console.log(playerRoom.announcementPlayer.teamIndex);
            }
            if(playerRoom.currentAnnouncements.length == 4 && playerRoom.currentAnnouncements.every((val, index) => val == 'Pass')) {
                playerRoom.gameStage = 'split cards';
                playerRoom.currentAnnouncements = [];
                io.to(playerRoom.id).emit('splitting', playerRoom);
            }

            if(playerRoom.checkAnnouncements() != false) {
                playerRoom.gameStage = 'playing';
                playerRoom.gameType = playerRoom.checkAnnouncements();
                playerRoom.currentAnnouncements = [];
                playerRoom.dealRestCards();
                playerRoom.turn = playerRoom.dealingTurn + 1;
                io.to(playerRoom.id).emit('playing', playerRoom);
            }else{
                io.to(playerRoom.id).emit('changes', playerRoom);
            }
        });

        socket.on('play card', card => {
            playerRoom.playCard(card, player, io);
        });

        socket.on('disconnect', () => {
            if(playerRoom == undefined) {return;}
            console.log(playerRoom.players);
            playerRoom.players.splice(playerRoom.players.indexOf(player), 1);
            socket.leave(playerRoom.id);
            console.log(playerRoom.players);
            io.to(playerRoom.id).emit('player disconnected', playerRoom);
        })
    }
}