module.exports = class Room {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.players = [];
    this.deck = this.createDeck();
    this.scores = { NS: 0, EW: 0 };
    this.rounds = [];
    this.trumpSuit = null;
    this.turnIndex = 0;
    this.playedCards = [];
    this.winner = null;
    this.announcements = [];
    this.gameType = null;
    this.dealingPlayerIndex = 0;
  }

  createDeck() {
    const suits = ["hearts", "diamonds", "clubs", "spades"];
    const ranks = ["7", "8", "9", "10", "J", "Q", "K", "A"];
    return suits.flatMap(suit => ranks.map(rank => ({ suit, rank })))
               .sort(() => Math.random() - 0.5);
  }

  splitDeck(index, io) {
    if (index < 0 || index >= this.deck.length) return;
    this.deck = [...this.deck.slice(index), ...this.deck.slice(0, index)];
    this.dealInitialCards(io);
  }

  addPlayer(player, socket, io) {
    if (this.players.length < 4) {
      player.team = this.players.length % 2 === 0 ? "NS" : "EW";
      this.players.push(player);
      socket.join(this.id);
      socket.emit('userJoined', this, player)
      io.to(this.id).emit('playerJoined', this);
      if (this.players.length === 4) {this.startGame(io);}
    }
  }

  removePlayer(player, socket, io) {
    this.players = this.players.filter(p => p.id !== player.id);
    socket.leave(this.id);
    io.to(this.id).emit('playerDisconnected', this);
  }

  startGame(io) {
    // Reset initial variables
    this.nextRound(io);
  }

  nextRound(io) {
    if (this.announcements.length === 4 && this.announcements.every(a => a === "pass")) {
      this.deck = this.createDeck();
      io.to(this.id).emit("roundRestarted", this);
      return;
    }
    
    this.announcements = [];
    this.gameType = null;
    this.trumpSuit = null;
    this.playedCards = [];
    this.turnIndex = 0;
    this.dealingPlayerIndex = (this.dealingPlayerIndex + 3) % 4;
    this.deck = this.createDeck();
    io.to(this.id).emit("splitting", this);
  }

  dealInitialCards(io) {
    const dealer = this.players[this.dealingPlayerIndex];
    let deckCopy = [...this.deck];
    this.players.forEach(player => player.handCards = []);
    
    for (let i = 0; i < 3; i++) {
      this.players.forEach(player => player.handCards.push(deckCopy.pop()));
    }
    for (let i = 0; i < 2; i++) {
      this.players.forEach(player => player.handCards.push(deckCopy.pop()));
    }
    
    this.deck = deckCopy;
    io.to(this.id).emit("initialCardsDealt", this);
  }

  makeAnnouncement(playerId, announcement, io) {
    const validOrder = ["clubs", "diamonds", "hearts", "spades", "no trumps", "all trumps"];
    if (!this.players.find(p => p.id === playerId)) return;
    
    if (this.announcements.length) {
      const lastAnnouncement = this.announcements.filter(a => a !== "pass").pop();
      if (lastAnnouncement && validOrder.indexOf(announcement) <= validOrder.indexOf(lastAnnouncement)) {
        return;
      }
    }
    
    this.announcements.push(announcement);
    this.turnIndex = (this.turnIndex + 1) % 4;
    
    if (this.announcements.length >= 4 && (this.announcements.filter(a => a === "pass").length >= 3 || this.gameType === "all trumps")) {
      this.dealRestCards(io);
    } else {
      io.to(this.id).emit("announcementMade", { room: this, lastAnnouncement: announcement });
    }
  }

  dealRestCards(io) {
    this.players.forEach(player => {
      for (let i = 0; i < 3; i++) {
        player.hand.push(this.deck.pop());
      }
    });
    io.to(this.id).emit("restCardsDealt", this);
  }

  // All play-out logic
  playCard(playerId, card, io) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || !player.hand.some(c => c.suit === card.suit && c.rank === card.rank)) return;
    player.hand = player.hand.filter(c => !(c.suit === card.suit && c.rank === card.rank));
    this.playedCards.push({ playerId, card });
    this.turnIndex = (this.turnIndex + 1) % 4;
    io.to(this.id).emit("cardPlayed", this);
  }
}
