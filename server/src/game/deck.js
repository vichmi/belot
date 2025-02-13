// deck.js
function createDeck() { // ✅
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  const ranks = ["7", "8", "9", "10", "J", "Q", "K", "A"];
  let deck = [];
  suits.forEach(suit => {
    ranks.forEach(rank => deck.push({ suit, rank }));
  });
  // Fisher–Yates shuffle.
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function splitDeck(deck, index) { // ✅ this.dealInitialCards was here
  if (index < 0 || index >= deck.length) return deck;
  return [...deck.slice(index), ...deck.slice(0, index)];
}

function dealInitialCards(deck, players) { // deck, and players param! ✅
  // Create a copy of the deck.
  let deckCopy = [...deck];
  players.forEach(player => player.hand = []);
  for (let i = 0; i < 3; i++) {
    players.forEach(player => {
      player.hand.push(deckCopy.pop());
    });
  }
  for (let i = 0; i < 2; i++) {
    players.forEach(player => {
      player.hand.push(deckCopy.pop());
    });
  }
  return { deck: deckCopy, players };
}

function dealRestCards(deck, players) { // deck, and players param! ✅
  let deckCopy = [...deck];
  players.forEach(player => {
    for (let i = 0; i < 3; i++) {
      player.hand.push(deckCopy.pop());
    }
  });
  return { deck: deckCopy, players };
}

function setDeckAfterPlayOut(room) {
  return room.capturedCards.NS.concat(room.capturedCards.EW);
}

function getCardValue(card, gameType, trumpSuit = null) {
  const trumpValues = { 'A': 11, '10': 10, 'K': 4, 'Q': 3, 'J': 20, '9': 14, '8': 0, '7': 0 };
  const nonTrumpValues = { 'A': 11, '10': 10, 'K': 4, 'Q': 3, 'J': 2, '9': 0, '8': 0, '7': 0 };
  if (gameType === 'suit') {
    return card.suit === trumpSuit ? trumpValues[card.rank] : nonTrumpValues[card.rank];
  } else if (gameType === 'no trumps') {
    return nonTrumpValues[card.rank];
  } else if (gameType === 'all trumps') {
    return trumpValues[card.rank];
  }
  return 0;
}

module.exports = {
  createDeck,
  splitDeck,
  dealInitialCards,
  dealRestCards,
  setDeckAfterPlayOut
};
