// server/index.js
const Room = require('../game/room');
const Player = require('../game/player');
const db = require('../config/db');

// Create a single room (you can expand this to multiple or dynamic rooms).
const rooms = [new Room(1, 'Development')];

module.exports = {
  init(socket, io) {
    // Send initial room data.
    let playerRoom = null;
    let player = null;
    
    socket.on('joinRoom', ({roomName}) => {
      const query = `select * from rooms where name = ${roomName}`;
      db.query(query, (err, result) => {
        if(err || result.length == 0) {
          socket.emit('error', { message: "Room not found" });
          return;
        }
        if(result[0].joinedPlayers >= 4){
          socket.emit('error', { message: "Room is full" });
          return;
        }

        playerRoom = JSON.parse(result[0].state);

      });
    });


    // --- Client-to-Server Events ---

    // Join room.
    socket.on('join room', (roomData) => {
      playerRoom = rooms.find(r => r.id === roomData.id);
      if (!playerRoom) {
        return socket.emit('error', { message: "Room not found" });
      }
      if (playerRoom.players.length >= 4) {
        return socket.emit('error', { message: "Room is full" });
      }
      player = new Player(socket.id);
      playerRoom.addPlayer(player, socket, io);
    });

    // Splitting the deck (called by the dealer).
    socket.on('splitted card', (cardIndex) => {
      if (playerRoom) {
        playerRoom.splitDeck(cardIndex, io);
      }
    });

    // Bidding announcement.
    socket.on('announce', (announcement) => {
      if (playerRoom && player) {
        playerRoom.makeAnnouncement(player.id, announcement, io);
      }
    });

    // Combination bonus announcement.
    socket.on('announce combination', (combination) => {
      // if (playerRoom && player) {
      //   playerRoom.announceCombination(player.id, combination, io);
      // }
    });

    // Play a card.
    socket.on('play card', (card) => {
      if (playerRoom && player) {
        playerRoom.playCard(player.id, card, io);
      }
    });

    socket.on('saveCombinations', ({combinations}) => {
      if (playerRoom && player) {
        combinations.forEach(element => {
          playerRoom.announceCombination(player.id, element, io);
        });
      }
    });

    // Disconnect.
    socket.on('disconnect', () => {
      if (playerRoom && player) {
        playerRoom.removePlayer(player, socket, io);
      }
    });
  }
};
