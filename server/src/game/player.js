module.exports = class Player {
    constructor(id) {
        this.id = id;
        this.isDealer = false;
        this.handCards = []
        this.team;
        this.announcements = [];
    }
    
    checkHandAnnouncements() {
        let groupedByColors = {};
        let announcementsNames = {3: 'tirce', 4: 'quarte', 5: 'quinte'}
        const cardOrder = ['7', '8', '9', '10', 'j', 'q', 'k', 'a'];
        for(let card of this.handCards) {
            if(!groupedByColors[card.color]) {
                groupedByColors[card.color] = []
            }
            groupedByColors[card.color].push(card.number);
            let checkQuares = this.handCards.filter(c => c.number == card.number);
            if(checkQuares.length == 4 && !this.announcements.some(ann => ann.type == 'quare' && ann.number == card.number) && card.number != '8' && card.number != '7') {
                let quareType = card.number == '9' ? '9-quare' : card.number == 'j' ? 'j-quare' : 'quare'
                this.announcements.push({
                    type: quareType,
                    cards: checkQuares,
                    number: card.number
                })
            }
        }
        for(const color in groupedByColors) {
            const cards = groupedByColors[color];
            const cardNames = cards.sort((a, b) => cardOrder.indexOf(a) - cardOrder.indexOf(b));
            let sequence = [];
            for(let i=1;i<cardNames.length;i++) {
                const previousIndex = cardOrder.indexOf(cardNames[i - 1]);
                const currentIndex = cardOrder.indexOf(cardNames[i]);
                if(currentIndex == previousIndex + 1) {
                    if(!sequence.includes(cardNames[i - 1])) {
                        sequence.push(cardNames[i - 1]);
                    }
                    if(!sequence.includes(cardNames[i])) {
                        sequence.push(cardNames[i]);
                    }
                }
            }
            let typeAnnouncements = sequence.length >= 5 ? 5 : sequence.length;
            if(sequence.length >= 3) {
                this.announcements.push({
                    type: announcementsNames[typeAnnouncements],
                    cards: [...sequence],
                    color
                }) 
            }
        }
    }
}