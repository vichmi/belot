
const _cards = [
    {name: '7', noTrumps: 0, allTrumps: 0},
    {name: '8', noTrumps: 0, allTrumps: 0},
    {name: '9', noTrumps: 0, allTrumps: 14},
    {name: '10', noTrumps: 10, allTrumps: 10},
    {name: 'j', noTrumps: 2, allTrumps: 20},
    {name: 'q', noTrumps: 3, allTrumps: 3},
    {name: 'k', noTrumps: 4, allTrumps: 4},
    {name: 'a', noTrumps: 11, allTrumps: 11},
]

module.exports = class Room {
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
        this.gameStages = ['splitting', 'dealing', 'announcements', 'playing', 'score', 'winner'];
        this.gameStage = this.gameStages[0];
        this.currentAnnouncements = []; // On the announcements stage every player has the choice to choose Clubs, Diamonds, Hearts, Spades, No Trumps, All Trumps. In this order 
        this.announecementPlayer;
        this.gameType = '';
        this.turn = -1;
        this.dealingTurn = 0;
        this.teams = [
            {players: [], score: 0, hands: [], gameScore: 0},
            {players: [], score: 0, hands: [], gameScore: 0}
        ];
        this.table = [];
    }

    setTeams() {
        this.teams[0].players = [this.players[0], this.players[2]];
        this.players[0].teamIndex = 0;
        this.players[2].teamIndex = 0;
        this.teams[1].players = [this.players[1], this.players[3]];
        this.players[1].teamIndex = 1;
        this.players[3].teamIndex = 1;
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
            return 'All Trumps';
        }
        if(this.currentAnnouncements.length >= 4) {
            if(this.currentAnnouncements[announcementsLength - 1] == this.currentAnnouncements[announcementsLength - 2]
                && this.currentAnnouncements[announcementsLength - 2] == this.currentAnnouncements[announcementsLength - 3]
                && this.currentAnnouncements[announcementsLength - 1] == 'Pass' && this.currentAnnouncements[announcementsLength - 4] != 'Pass') {
                    return this.currentAnnouncements[announcementsLength - 4];
            }
        }
        return false;
    }
    nextTurn() {
        this.turn++;
        if(this.turn >= 4) {
            this.turn = 0;
        }
    }

    scoring() {
        if(this.gameType == 'No Trumps') {

        }
    }

    playCard(card, player, io) {
        // First card on the table. Can be anything
        let playerIndex = this.players.indexOf(player);

        if(this.turn != playerIndex) {
            return;
        }

        if(this.table.length == 0) {
            this.table.push({card, player});
            console.log(this.players[playerIndex].handCards.filter(c => {c != card}))
            this.players[playerIndex].handCards = this.players[playerIndex].handCards.filter(
                c => !(c.number === card.number && c.color === card.color)
            );
            this.nextTurn();
            // console.log(this.players[playerIndex].handCards.indexOf(card));
            // this.players[playerIndex].handCards.splice(this.players[playerIndex].handCards.indexOf(card), 1);
            io.to(this.id).emit('play card', this);
            return;
        }

        if(this.gameType == 'No Trumps') {
            // Checks if the played card color is the same as the first played card
            if(card.color != this.table[0].card.color) {
                let haveColor = player.handCards.find(c => c.color == this.table[0].card.color);
                if(haveColor) {return;}
            }
            this.table.push({card, player});
            this.players[playerIndex].handCards = this.players[playerIndex].handCards.filter(
                c => !(c.number === card.number && c.color === card.color)
            );
            if(this.table.length == 4) {
                let firstCard = this.table[0];
                let filteredTable = this.table.filter(hand => hand.card.color == firstCard.card.color);
                let highestCard = filteredTable.sort((a, b) => b.card.noTrumps - a.card.noTrumps)[0];
                this.teams[highestCard.player.teamIndex].hands.push(this.table);
                io.to(this.id).emit('take hand', highestCard.player);
                this.table = [];
                if(this.teams[0].hands.length + this.teams[1].hands.length == 8) {
                    this.teams[highestCard.player.teamIndex].score += 10;
                    this.gameStage = this.gameStages[4];
                    for(let i=0;i<this.teams.length;i++) {
                        for(let h of this.teams[i].hands) {
                            for(let c of h) {
                                this.teams[i].score += c.card.noTrumps;
                            }
                        }
                        this.teams[i].score *= 2;
                    }
                    let ancTeamIndex = this.announcementPlayer.teamIndex;
                    let otherTeamIndex = this.announcementPlayer.teamIndex == 0 ? 1 : 0;
                    if(this.teams[ancTeamIndex].score >= 125) {
                        this.teams[ancTeamIndex].gameScore += Math.round(this.teams[ancTeamIndex].score / 10);
                        this.teams[ancTeamIndex].score = 0;
                        this.teams[otherTeamIndex].gameScore += Math.round(this.teams[otherTeamIndex].score / 10); 
                        this.teams[otherTeamIndex].score = 0;
                    }else{
                        this.teams[ancTeamIndex].score = 0;
                        this.teams[otherTeamIndex].gameScore += 26;
                        this.teams[otherTeamIndex].score = 0;
                    }
                    io.to(this.id).emit('playing', this);
                }
                this.turn = this.players.indexOf(highestCard.player);
            }else{
                this.nextTurn();
            }

            io.to(this.id).emit('play card', this); 
        }


    }
}