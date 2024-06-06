const {createServer} = require('http');
const {Server} = require('socket.io');

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: 'http://localhost:3000'
    }
});

class Player {
    constructor(id) {
        this.id = id;
        this.isDealer = false;
        this.handCards = [];
    }
}

const _cards = [
    {name: '7', noTrumps: 0, allTrumps: 0},
    {name: '8', noTrumps: 0, allTrumps: 0},
    {name: '9', noTrumps: 0, allTrumps: 14},
    {name: '10', noTrumps: 10, allTrumps: 10},
    {name: 'J', noTrumps: 2, allTrumps: 20},
    {name: 'Q', noTrumps: 3, allTrumps: 3},
    {name: 'K', noTrumps: 4, allTrumps: 4},
    {name: 'A', noTrumps: 11, allTrumps: 11},
]

class Room {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.players = [];
        this.cards = [];
        for(let color of ['clubs', 'diamonds', 'hearts', 'spades']) {
            for(let card of _cards) {
                this.cards.push({img: `${card.name}_of_${color}.png`, color, number: card.name, noTrumps: card.noTrumps, allTrumps: card.allTrumps});
            }
        }
        this.currentAnnouncements = [];
        this.gameType = '';
        this.turn = -1;
        this.dealingTurn = 0;
        this.gameStages = ['splitting', 'dealing', 'announcements', 'playing', 'score', 'winner'];
        this.gameStage = 'splitting';
        this.teams = [{players: [], score: 0, currentAnnouncements: []}, {players: [], score: 0, currentAnnouncements: []}];
        this.table = [];
    }

    shuffleCards() {
        let currIndex = this.cards.length;
        while(currIndex != 0) {
            let randomIndex = Math.floor(Math.random() * currIndex);
            currIndex--;
            [this.cards[currIndex], this.cards[randomIndex]] = [
                this.cards[randomIndex], this.cards[currIndex]
            ];
        }
    }

    splitCards(index) {
        let firstSplit = this.cards.slice(0, index);
        let secondSplit = this.cards.slice(index);
        this.cards = secondSplit;
        this.cards = this.cards.concat(firstSplit);
    }

    dealCards() {
        let firstPlayer = this.dealingTurn;
        while(this.players[this.dealingTurn].handCards.length != 3) {
            let nextPlayer = firstPlayer + 1;
            if(nextPlayer >= 4) {
                nextPlayer = 0;
            }
            let nextCards = this.cards.splice(0, 3);
            this.players[nextPlayer].handCards = nextCards;
            firstPlayer = nextPlayer;
            this.cards.push(...nextCards);
        }
        while(this.players[this.dealingTurn].handCards.length != 5) {
            let nextPlayer = firstPlayer + 1;
            if(nextPlayer >= 4) {
                nextPlayer = 0;
            }
            let nextCards = this.cards.splice(0, 2);
            nextCards.map(card => {
                this.players[nextPlayer].handCards.push(card);
            })
            firstPlayer = nextPlayer;
            this.cards.push(...nextCards);
        }
    }

    dealRestCards() {
        let firstPlayer = this.dealingTurn;
            while(this.players[this.dealingTurn].handCards.length != 8) {
            let nextPlayer = firstPlayer + 1;
            if(nextPlayer >= 4) {
                nextPlayer = 0;
            }
            let nextCards = this.cards.splice(0, 3);
            nextCards.map(card => {
                this.players[nextPlayer].handCards.push(card);
            })
            firstPlayer = nextPlayer;
            this.cards.push(...nextCards);
        }
    }

    checkAnnouncements() {
        let announcementsLength = this.currentAnnouncements.length;
        if(this.currentAnnouncements[announcementsLength - 1] == 'All Trumps') {
            return true;
        }
        if(this.currentAnnouncements.length >= 4) {
            if(this.currentAnnouncements[announcementsLength - 1] == this.currentAnnouncements[announcementsLength - 2]
                && this.currentAnnouncements[announcementsLength - 2] == this.currentAnnouncements[announcementsLength - 3]
                && this.currentAnnouncements[announcementsLength - 1] == 'Pass' && this.currentAnnouncements[announcementsLength - 4] != 'Pass') {
                    return true;
            }
        }
        return false;
    }
}
const rooms = [];
rooms.push(new Room(1, 'Development'))
rooms.push(new Room(2, 'Development2'))


io.on('connection', socket => {
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

        if(playerRoom.currentAnnouncements.length == 4 && playerRoom.currentAnnouncements.every((val, index) => val == 'Pass')) {
            playerRoom.gameStage = 'split cards';
            playerRoom.currentAnnouncements = [];
            io.to(playerRoom.id).emit('splitting', playerRoom);
        }

        if(playerRoom.checkAnnouncements()) {
            playerRoom.gameStage = 'playing';
            playerRoom.gameType = playerRoom.currentAnnouncements[playerRoom.currentAnnouncements.length - 1];
            playerRoom.currentAnnouncements = [];
            playerRoom.dealRestCards();
            playerRoom.turn = playerRoom.dealingTurn + 1;
            io.to(playerRoom.id).emit('playing', playerRoom);
        }else{
            io.to(playerRoom.id).emit('changes', playerRoom);
        }
    });

    socket.on('play card', card => {

        if(playerRoom.table.length > 0) {
            if(card.color != playerRoom.table[0].color) {
                let playerHasColor = player.handCards.find(c => c.color == playerRoom.table[0].color);
                return
            }
        }

        if(playerRoom.currentAnnouncements == 'All Trumps') {
            let highestCard = playerRoom.table.reduce((prev, curr) => {
                return prev.allTrumps > curr.allTrumps ? prev : curr;
            }, card);
            playerRoom.table.push(card);
            let c = player.handCards.splice(player.handCards.indexOf(card), 1);
            if(playerRoom.table.length == 4) {
                playerRoom.table = [];
                io.to(playerRoom.id).emit('get hand')
            }   
            playerRoom.turn = playerRoom.turn + 1 >= 4 ? 0 : playerRoom.turn + 1;
            io.to(playerRoom.id).emit('play card', playerRoom, player);
        }
    });

    socket.on('disconnect', () => {
        if(playerRoom == undefined) {return;}
        console.log(playerRoom.players);
        playerRoom.players.splice(playerRoom.players.indexOf(player), 1);
        socket.leave(playerRoom.id);
        console.log(playerRoom.players);
        io.to(playerRoom.id).emit('player disconnected', playerRoom);
    })
});

httpServer.listen(3001);