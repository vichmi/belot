// server/index.js
const Room = require('../game/room');
const Player = require('../game/player');
const db = require('../config/db');
const jwt = require('jsonwebtoken');

// Create a single room (you can expand this to multiple or dynamic rooms).
const activeRooms = {};

module.exports = {
  init(socket, io) {
    // Send initial room data.
    let playerRoom = null;
    let player = null;
    const cookies = socket.handshake.headers.cookie;
    if (!cookies) return new Error("Unauthorized");
    const matchToken = socket.request.headers.cookie.match(/token=([^;]+)/);
    let token;
    if(matchToken) {
      token = matchToken[1];
    }else{
      console.log("token not found");
    }
    socket.on('joinRoom', ({roomName}) => {
      playerRoom = activeRooms[roomName];
      if (!playerRoom) {
        db.query(`select * from rooms where name = '${roomName}'`, (err, result) => {
          if(err || result.length == 0) {
            socket.emit('error', { message: "Room not found" });
            return;
          }
        });
        playerRoom = new Room(roomName);
        activeRooms[roomName] = playerRoom;
        // db.query(`update rooms set name = '${roomName}', state = '${JSON.stringify(playerRoom)}', joinedPlayers = '1')`, (err, res) => {
        //   if(err) {
        //     console.log(err);
        //   }
        // });
      }
      if(playerRoom.players.filter(player => player.name === jwt.decode(token).username).length > 0) {
        socket.emit('error', { message: "You are already in the room" });
        return;
      }

      player = new Player(jwt.decode(token).username);
      playerRoom.addPlayer(player, socket, io);
      
      db.query(`update rooms set state = '${JSON.stringify(playerRoom)}', joinedPlayers = '${playerRoom.players.length}' where name = '${roomName}'`, (err, res) => {
        if(err) {
          console.log(err);
        }
      });
      if(playerRoom.players.length > 4){
        socket.emit('error', { message: "Room is full" });
        return;
      }
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
        console.log(combinations);
        combinations.forEach(element => {
          playerRoom.announceCombination(player.id, element, io);
        });
      }
    });

    // Disconnect.
    socket.on('disconnect', () => {
      if (playerRoom && player) {
        playerRoom.removePlayer(player, socket, io);
        db.query(`update rooms set state = '${JSON.stringify(playerRoom)}', joinedPlayers = '${playerRoom.players.length}' where name = '${playerRoom.name}'`, (err, res) => {
          if(err) {
            console.log(err);
          }
        });
      }
    });
  }
};
