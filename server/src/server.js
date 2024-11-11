const {createServer} = require('http');
const {Server} = require('socket.io');

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: 'http://localhost:3000'
    }
});


// const Player = require('./game/')
const gameSocket = require('./socket');

// class Player {
//     constructor(id) {
//         this.id = id;
//         this.isDealer = false;
//         this.handCards = [];
//     }
// }

// const _cards = [
//     {name: '7', noTrumps: 0, allTrumps: 0},
//     {name: '8', noTrumps: 0, allTrumps: 0},
//     {name: '9', noTrumps: 0, allTrumps: 14},
//     {name: '10', noTrumps: 10, allTrumps: 10},
//     {name: 'j', noTrumps: 2, allTrumps: 20},
//     {name: 'q', noTrumps: 3, allTrumps: 3},
//     {name: 'k', noTrumps: 4, allTrumps: 4},
//     {name: 'a', noTrumps: 11, allTrumps: 11},
// ]

// class Room {
//     constructor(id, name) {
//         this.id = id;
//         this.name = name;
//         this.players = [];
//         this.cards = [];
//         for(let color of ['clubs', 'diamonds', 'hearts', 'spades']) {
//             for(let card of _cards) {
//                 this.cards.push({img: `${card.name}_of_${color}.png`, color, number: card.name, noTrumps: card.noTrumps, allTrumps: card.allTrumps});
//             }
//         }
//         this.currentAnnouncements = [];
//         this.gameType = '';
//         this.turn = -1;
//         this.dealingTurn = 0;
//         this.gameStages = ['splitting', 'dealing', 'announcements', 'playing', 'score', 'winner'];
//         this.gameStage = 'splitting';
//         this.teams = [{players: [], score: 0, currentAnnouncements: []}, {players: [], score: 0, currentAnnouncements: []}];
//         this.table = [];
//     }

//     shuffleCards() {
//         let currIndex = this.cards.length;
//         while(currIndex != 0) {
//             let randomIndex = Math.floor(Math.random() * currIndex);
//             currIndex--;
//             [this.cards[currIndex], this.cards[randomIndex]] = [
//                 this.cards[randomIndex], this.cards[currIndex]
//             ];
//         }
//     }

//     splitCards(index) {
//         let firstSplit = this.cards.slice(0, index);
//         let secondSplit = this.cards.slice(index);
//         this.cards = secondSplit;
//         this.cards = this.cards.concat(firstSplit);
//     }

//     dealCards() {
//         let firstPlayer = this.dealingTurn;
//         while(this.players[this.dealingTurn].handCards.length != 3) {
//             let nextPlayer = firstPlayer + 1;
//             if(nextPlayer >= 4) {
//                 nextPlayer = 0;
//             }
//             let nextCards = this.cards.splice(0, 3);
//             this.players[nextPlayer].handCards = nextCards;
//             firstPlayer = nextPlayer;
//             this.cards.push(...nextCards);
//         }
//         while(this.players[this.dealingTurn].handCards.length != 5) {
//             let nextPlayer = firstPlayer + 1;
//             if(nextPlayer >= 4) {
//                 nextPlayer = 0;
//             }
//             let nextCards = this.cards.splice(0, 2);
//             nextCards.map(card => {
//                 this.players[nextPlayer].handCards.push(card);
//             })
//             firstPlayer = nextPlayer;
//             this.cards.push(...nextCards);
//         }
//     }

//     dealRestCards() {
//         let firstPlayer = this.dealingTurn;
//             while(this.players[this.dealingTurn].handCards.length != 8) {
//             let nextPlayer = firstPlayer + 1;
//             if(nextPlayer >= 4) {
//                 nextPlayer = 0;
//             }
//             let nextCards = this.cards.splice(0, 3);
//             nextCards.map(card => {
//                 this.players[nextPlayer].handCards.push(card);
//             })
//             firstPlayer = nextPlayer;
//             this.cards.push(...nextCards);
//         }
//     }

//     checkAnnouncements() {
//         let announcementsLength = this.currentAnnouncements.length;
//         if(this.currentAnnouncements[announcementsLength - 1] == 'All Trumps') {
//             return 'All Trumps';
//         }
//         if(this.currentAnnouncements.length >= 4) {
//             if(this.currentAnnouncements[announcementsLength - 1] == this.currentAnnouncements[announcementsLength - 2]
//                 && this.currentAnnouncements[announcementsLength - 2] == this.currentAnnouncements[announcementsLength - 3]
//                 && this.currentAnnouncements[announcementsLength - 1] == 'Pass' && this.currentAnnouncements[announcementsLength - 4] != 'Pass') {
//                     return this.currentAnnouncements[announcementsLength - 4];
//             }
//         }
//         return false;
//     }

//     nextTurn() {
//         this.turn++;
//         if(this.turn >= 4) {
//             this.turn = 0;
//         }
//     }

//     playCard(card, player) {
//         // First card on the table. Can be anything
//         let playerIndex = this.players.indexOf(player);

//         if(this.turn != playerIndex) {
//             return;
//         }

//         if(this.table.length == 0) {
//             this.table.push({card, player});
//             this.nextTurn();
//             // console.log(this.players[playerIndex].handCards.indexOf(card));
//             // this.players[playerIndex].handCards.splice(this.players[playerIndex].handCards.indexOf(card), 1);
//             io.to(this.id).emit('play card', this);
//             return;
//         }

//         if(this.gameType == 'No Trumps') {
//             if(card.color == this.table[0].card.color) {
//                 this.table.push({card, player});
//                 if(this.table.length == 4) {
//                     let firstCard = this.table[0];
//                     let filteredTable = this.table.filter(hand => hand.card.color == firstCard.card.color);
//                     let highestHand = filteredTable.sort((a, b) => b.card.noTrumps - a.card.noTrumps)[0];
//                     console.log(highestHand)
//                     io.to(this.id).emit('play card', this);
//                     setTimeout(() => {}, 1500);
//                     return;
//                 }   
//                 this.players[playerIndex].handCards.splice(this.players[playerIndex].handCards.indexOf(card), 1);
//                 this.nextTurn();
//                 io.to(this.id).emit('play card', this);
//                 return;
//             }else{
//                 let haveColor = player.handCards.find(c => c.color == this.table[0].card.color);
//                 if(haveColor) {return}
//                 console.log('vlexah')
//                 this.table.push({card, player});
//                 this.nextTurn();
//                 this.players[playerIndex].handCards.splice(this.players[playerIndex].handCards.indexOf(card), 1);
//                 io.to(this.id).emit('play card', this);
//                 return;
//             }
//         }
//     }
// }


io.on('connection', socket => {
    gameSocket.init(socket, io);
});

httpServer.listen(3001);