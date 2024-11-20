
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
        this.colors = ['clubs', 'diamonds', 'hearts', 'spades'];
        for(let color of this.colors) {
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
        this.trumpColor = '';
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
                    if(this.currentAnnouncements[announcementsLength - 4] != 'All Trumps' || this.currentAnnouncements[announcementsLength - 4] != 'No Trumps') {
                        this.trumpColor = this.currentAnnouncements[announcementsLength - 4];
                    }
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

    scoring(io) {
        if(this.table.length < 4) {return;}
        let firstCard = this.table[0];
        let filteredTable = this.table.filter(hand => (this.gameType != 'No Trumps' && this.gameType != 'All Trumps' && hand.card.color == this.gameType.toLowerCase())
        || (hand.card.color == firstCard.card.color)) ; // Only the correct color played 
        // let highestCard = filteredTable.sort((a, b) => this.gameType == 'All Trumps' ? b.card.allTrumps - a.card.allTrumps : this.gameType == 'No Trumps' ? b.card.noTrumps - a.card.noTrumps : this.gameType in this.colors ? )[0];
        let highestCard, correctPointTaker, maxGamePoints;
        if(this.gameType.toLowerCase() in this.colors) {
            maxGamePoints = 162;
            let findTrump = this.table.find(hand => (hand.card.color == this.gameType.toLowerCase()));
            correctPointTaker = findTrump ? 'allTrumps' : 'noTrumps';
        }else{
            maxGamePoints = this.gameType == 'All Trumps' ? 258 : 260;
            correctPointTaker = this.gameType == 'All Trumps' ? 'allTrumps' : 'noTrumps';
        }
        console.log('-------------------------------')
        console.log(filteredTable);
        highestCard = filteredTable.sort((a, b) => b.card[correctPointTaker] - a.card[correctPointTaker])[0];
        console.log('-------------------------------');
        console.log(highestCard);
        this.teams[highestCard.player.teamIndex].hands.push(this.table);
        io.to(this.id).emit('take hand', highestCard.player);
        this.table = [];

        if(this.teams[0].hands.length + this.teams[1].hands.length == 8) {
            this.teams[highestCard.player.teamIndex].score += 10;
            this.gameStage = this.gameStages[4];
            for(let i=0;i<this.teams.length;i++) {
                for(let h of this.teams[i].hands) {
                    for(let c of h) {
                        this.teams[i].score += c.card[correctPointTaker];
                    }
                }
                this.teams[i].score = this.gameType == 'No Trumps' ? this.teams[i].score * 2 : this.teams[i].score;
            }
            let ancTeamIndex = this.announcementPlayer.teamIndex;
            let otherTeamIndex = this.announcementPlayer.teamIndex == 0 ? 1 : 0;
            if(this.teams[ancTeamIndex].score >= Math.round(maxGamePoints/2)) {
                this.teams[ancTeamIndex].gameScore += Math.round(this.teams[ancTeamIndex].score / 10);
                this.teams[ancTeamIndex].score = 0;
                this.teams[otherTeamIndex].gameScore += Math.round(this.teams[otherTeamIndex].score / 10); 
                this.teams[otherTeamIndex].score = 0;
            }else if(this.teams[ancTeamIndex].hands.length == 0) {
                this.teams[otherTeamIndex].gameScore += 35;
                this.teams[otherTeamIndex].score = 0;
            }else if(this.teams[otherTeamIndex].hands.length == 0) {
                this.teams[ancTeamIndex].gameScore += 35
                this.teams[ancTeamIndex].score = 0;
            }else{
                this.teams[ancTeamIndex].score = 0;
                this.teams[otherTeamIndex].gameScore += maxGamePoints == 162 ? 16 : 26;
                this.teams[otherTeamIndex].score = 0;
            }
            io.to(this.id).emit('playing', this);
        }
        this.turn = this.players.indexOf(highestCard.player);
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

        
        let firstCard = this.table[0].card;
        // No Trumps
        if(this.gameType == 'No Trumps') {
            if(card.color != firstCard.color) {
                let haveColor = player.handCards.find(c => c.color == firstCard.color);
                if(haveColor) {return;}
            }
            this.table.push({card, player});
            this.players[playerIndex].handCards = this.players[playerIndex].handCards.filter(
                c => !(c.number === card.number && c.color === card.color)
            );
            // All Trumps
        }else if(this.gameType == 'All Trumps') {
            if(card.color != firstCard.color) {
                let haveColor = player.handCards.find(c => c.color == firstCard.color);
                if(haveColor) {return;}
            }
            if(card.color == firstCard.color) {
                let highestCard = Math.max.apply(null, this.table.find(t => t.card.color == firstCard.color).map(c => {return c.allTrumps}));
                if(card.allTrumps < highestCard) {
                    let findPlayerHigherCard = player.handCards.find(c => c.allTrumps > card.allTrumps);
                    if(findPlayerHigherCard) {return;}
                }
            }else{
                let findPlayerSameColor = player.handCards.find(c => c.color == firstCard.color);
                if(findPlayerSameColor) {return;}
            }
            this.table.push({card, player});
            this.players[playerIndex].handCards = this.players[playerIndex].handCards.filter(
                c => !(c.number === card.number && c.color === card.color)
            );

            // TRUMPS
        }else{
            if(card.color != firstCard.color && card.color != this.gameType.toLowerCase()) {
                let haveColor = player.handCards.find(c => c.color == firstCard.color || c.color == this.gameType.toLowerCase());
                if(haveColor) {return;}
            }else if(card.color == this.gameType.toLowerCase()){
                let haveFirstColor = player.handCards.find(c => c.color == firstCard.color);
                if(haveFirstColor) {return;}
                let higherCard = player.handCards.find(c => c.allTrumps > card.allTrumps && c.color == card.color);
                if(higherCard) {return;}
            }
            this.table.push({card, player});
            this.players[playerIndex].handCards = this.players[playerIndex].handCards.filter(
                c => !(c.number === card.number && c.color === card.color)
            );
        }
        console.log(this.teams)
        if(this.table.length == 4) {
            this.scoring(io);
        }else{
            this.nextTurn();
        }
        io.to(this.id).emit('play card', this); 

    }
}