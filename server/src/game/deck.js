
class Deck {
  constructor() {
    this.cards = this.createDeck();
  }

  createDeck() {
    const suits = ["hearts", "diamonds", "clubs", "spades"];
    const ranks = ["7", "8", "9", "10", "J", "Q", "K", "A"];
    let deck = [];
    suits.forEach(suit => {
      ranks.forEach(rank => deck.push({ suit, rank }));
    });
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  splitDeck(index) {
    if (index < 0 || index >= this.cards.length) return;
    this.cards = [...this.deck.slice(index), ...this.deck.slice(0, index)];
  }

  dealCards(numCards, players) {
    players.forEach(p => p.hand = []);
    for(let i=0;i<numCards;i++) {
      players.forEach(p => {
        p.hand.push(this.cards.pop());
      });
    }
  }
}

module.exports = Deck;