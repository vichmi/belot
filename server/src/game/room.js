
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
            {players: [], score: 0, hands: [], gameScore: 0, announcements: []},
            {players: [], score: 0, hands: [], gameScore: 0, announcements: []}
        ];
        this.table = [];
        this.trumpColor = '';
        this.maxGamePoints;
        this.playerHandAnnouncements = {
            'belot': 20,
            'tierce': 20,
            'quarte': 50,
            'quinte': 100,
            'quare': 100,
            '9-quare': 150,
            'j-quare': 200
        }
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

    sortHandsAnnouncements() {
        const announcementsStrength = ['tierce', 'quarte', 'quinte'];
        let allTeamAnnouncements = [];
        let teamScoringIndex = -1;
        for(const team of this.teams) {
            let teamAnnouncements = [];
            for(const player of team.players) {
                const getHighestPlayerAnnouncement = player.announcements.sort((a, b) => {announcementsStrength.indexOf(b.type) - announcementsStrength.indexOf(a.type)})[0];
                teamAnnouncements.push(getHighestPlayerAnnouncement);
            }
            const highestPlayerAnnouncements = teamAnnouncements.sort((a, b) => {announcementsStrength.indexOf(b.type) - announcementsStrength.indexOf(a.type)})[0];
            allTeamAnnouncements.push(highestPlayerAnnouncements);
        }
        if(allTeamAnnouncements[0].type == allTeamAnnouncements[1].type) {
            if(allTeamAnnouncements[0].cards[allTeamAnnouncements[0].cards.length - 1].number == allTeamAnnouncements[1].cards[allTeamAnnouncements[1].cards.length - 1].number) {
                return;
            }
            let highestCard = allTeamAnnouncements.sort((a, b) => {_cards.indexOf(b.cards[b.cards.length - 1]) - _cards.indexOf(a.cards[a.cards.length - 1]) })[0];
            teamScoringIndex = allTeamAnnouncements.indexOf(highestCard);
        }else{
            const highestTeamAnnouncements = allTeamAnnouncements.sort((a, b) => {announcementsStrength.indexOf(b.type) - announcementsStrength.indexOf(a.type)})[0];
            teamScoringIndex = allTeamAnnouncements.indexOf(highestTeamAnnouncements);
        }

        this.teams[teamScoringIndex].announcements = this.teams[teamScoringIndex].players.flatMap(p => p.announcements);
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
        let highestCard, correctPointTaker;
        if(this.colors.includes(this.gameType.toLowerCase())) {
            this.maxGamePoints = 162;
            let findTrump = this.table.filter(hand => (hand.card.color == this.gameType.toLowerCase()));
            correctPointTaker = findTrump ? 'allTrumps' : 'noTrumps';
            if(findTrump.length > 0) {
                highestCard = this.table.filter(c => c.card.color == this.gameType.toLowerCase()).sort((a, b) => b.card[correctPointTaker] - a.card[correctPointTaker])[0];
            }else{
                highestCard = this.table.sort((a, b) => b.card[correctPointTaker] - a.card[correctPointTaker])[0];
            }
        }else{
            this.maxGamePoints = this.gameType == 'All Trumps' ? 258 : 260;
            correctPointTaker = this.gameType == 'All Trumps' ? 'allTrumps' : 'noTrumps';
            highestCard = filteredTable.sort((a, b) => b.card[correctPointTaker] - a.card[correctPointTaker])[0];
        }
        this.teams[highestCard.player.teamIndex].hands.push(this.table);
        io.to(this.id).emit('play card', this);
        setTimeout(() => {
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
                    if(this.gameType != 'No Trumps') {
                        for(let p of this.teams[i].players) {
                            for(let ann of p.announcements) {
                                this.teams[i].score += this.playerHandAnnouncements[ann.type];
                                this.maxGamePoints += this.playerHandAnnouncements[ann.type];
                            }
                        }
                    }
                    this.teams[i].score = this.gameType == 'No Trumps' ? this.teams[i].score * 2 : this.teams[i].score;
                }
                let ancTeamIndex = this.announcementPlayer.teamIndex;
                let otherTeamIndex = this.announcementPlayer.teamIndex == 0 ? 1 : 0;
                if(this.teams[ancTeamIndex].score >= Math.round(this.maxGamePoints/2)) {
                    this.teams[ancTeamIndex].gameScore += Math.round(this.teams[ancTeamIndex].score / 10);
                    this.teams[ancTeamIndex].score = 0;
                    this.teams[otherTeamIndex].gameScore += Math.round(this.teams[otherTeamIndex].score / 10); 
                    this.teams[otherTeamIndex].score = 0;
                }else if(this.teams[ancTeamIndex].hands.length == 0) {
                    this.teams[otherTeamIndex].gameScore += 35;
                    
                    for(let t of this.teams) {
                        for(let p of t.players) {
                            for(let ann of p.announcements) {
                                this.teams[otherTeamIndex].gameScore += this.playerHandAnnouncements[ann.type] / 10;
                            }
                        }
                    }

                    this.teams[otherTeamIndex].gameScore += this.
                    this.teams[otherTeamIndex].score = 0;
                }else if(this.teams[otherTeamIndex].hands.length == 0) {
                    this.teams[ancTeamIndex].gameScore += 35
                    for(let p of this.teams[ancTeamIndex].players) {
                        for(let ann of p.announcements) {
                            this.teams[ancTeamIndex].gameScore += this.playerHandAnnouncements[ann.type] / 10;
                        }
                    }

                    for(let p of this.teams[otherTeamIndex].players) {
                        for(let ann of p.announcements) {
                            this.teams[otherTeamIndex].gameScore += this.playerHandAnnouncements[ann.type] / 10;
                        }
                    }

                    this.teams[ancTeamIndex].score = 0;
                }else{
                    this.teams[ancTeamIndex].score = 0;
                    this.teams[otherTeamIndex].gameScore += this.maxGamePoints;
                    this.teams[otherTeamIndex].score = 0;
                }
                this.cards = this.teams[0].hands.concat(this.teams[1].hands);
                this.gameStage = 'split cards';
                io.to(this.id).emit('splitting', this);
            }
            this.turn = this.players.indexOf(highestCard.player);
            io.to(this.id).emit('play card', this);
        }, 1000);
    }

    playCard(card, player, io) {
        // First card on the table. Can be anything
        let playerIndex = this.players.indexOf(player);

        if(this.turn != playerIndex) {
            return;
        }

        if(this.table.length == 0) {
            this.table.push({card, player});
            this.players[playerIndex].handCards = this.players[playerIndex].handCards.filter(
                c => !(c.number === card.number && c.color === card.color)
            );
            this.nextTurn();
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
                // let highestCard = Math.max.apply(null, this.table.find(t => t.card.color == firstCard.color).map(c => {return c.allTrumps}));
                let findTrump = this.table.filter(c => c.card.color == firstCard.color);
                let highestCard = findTrump.sort((a, b) => {b.card.allTrumps - a.card.allTrumps})[0];
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
                let tableHasTrumps = this.table.filter(c => c.card.color == this.gameType.toLowerCase());
                let teamMateHighest = true;
                if(tableHasTrumps.length > 0) {
                    let highestTrump = tableHasTrumps.sort((a, b) => b.card.allTrumps - a.card.allTrumps)[0];
                    teamMateHighest = highestTrump.player.teamIndex == player.teamIndex ? true : false;
                }else{
                    let highestCard = this.table.filter(c => c.card.color == firstCard.color).sort((a, b) => b.card.noTrumps - a.card.noTrumps)[0];
                    teamMateHighest = highestCard.player.teamIndex == player.teamIndex ? true : false;
                }
                if(haveColor && !teamMateHighest) {return;}
            }else if(card.color == this.gameType.toLowerCase()){
                let haveFirstColor = player.handCards.find(c => c.color == firstCard.color && firstCard.color != this.gameType.toLowerCase());
                if(haveFirstColor) {return;}
                let findTrumps = this.table.filter(c => c.card.color == this.gameType.toLowerCase());
                if(findTrumps.length > 0) {
                    let highestTrump = findTrumps.sort((a, b) => b.card.allTrumps - a.card.allTrumps)[0];
                    if(firstCard != this.gameType.toLowerCase()) {
                        if(card.allTrumps < highestTrump.card.allTrumps && highestTrump.player.teamIndex != player.teamIndex) {
                            let findPlayerHigherTrump = player.handCards.find(c => c.allTrumps > highestTrump.card.allTrumps && c.color == this.gameType.toLowerCase());
                            if(findPlayerHigherTrump) {return;}
                        }
                    }else{
                        if(card.allTrumps < highestTrump.card.allTrumps) {
                            let findPlayerHigherTrump = player.handCards.find(c => c.allTrumps > highestTrump.card.allTrumps && c.color == this.gameType.toLowerCase());
                            if(findPlayerHigherTrump) {return;}
                        }
                    }
                }
            }
            this.table.push({card, player});
            this.players[playerIndex].handCards = this.players[playerIndex].handCards.filter(
                c => !(c.number === card.number && c.color === card.color)
            );
        }

        // Checks for belot
        if(this.gameType != 'No Trumps') {
            if((card.number == 'q' && player.handCards.some(hCards => hCards.number == 'k' && hCards.color == card.color)) || card.number == 'k' && player.handCards.some(hCards => hCards.number == 'q' && hCards.color == card.color)) {
                if(this.gameType == 'All Trumps' || this.gameType == card.color) {
                    io.to(this.id).emit('hand announce', `${player.id} has belot of ${card.color}`);
                    player.announcements.push({type: 'belot', cards: player.handCards.filter(c => c.number == 'q' || c.number == 'k'), color: card.color})}
            }
        }
        if(this.table.length == 4) {
            this.scoring(io);
        }else{
            this.nextTurn();
        }
        io.to(this.id).emit('play card', this); 

    }
}