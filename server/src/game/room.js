
const {makeAnnouncement} = require('./announcements');
const {
  announceCombination,
  detectBelot,
  detectCombinations,
  detectCombinationForPlayer,
  calculateCombinationBonuses,
  computeFinalCombinations
} = require('./combinations');
const {
  createDeck,
  splitDeck,
  dealInitialCards,
  dealRestCards,
  setDeckAfterPlayOut
} = require('./deck.js');

module.exports = class Room {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.players = [];
    this.scores = { NS: 0, EW: 0 };
    this.rounds = [];
    this.trumpSuit = null;
    this.turnIndex = 0;       // index of the player whose turn it is (for bidding/playing)
    this.playedCards = [];    // cards played in the current trick
    this.winner = null;
    this.announcements = [];  // bidding announcements (strings, e.g., "hearts", "no trumps")
    this.gameType = null;     // "suit" (trump color), "no trumps", or "all trumps"
    this.dealingPlayerIndex = 0; // the current dealer (the one who receives the split deck)
    // Combination bonus announcements and scoring:
    this.combinationAnnouncements = { NS: [], EW: [] };
    this.finalCombinationAnnouncements = this.combinationAnnouncements;
    this.tricksPlayed = 0;
    this.capturedCards = { NS: [], EW: [] };
    this.callingTeam = null;
    this.lastHandTeam = null;
    this.gameStage = null;
    // NEW: Final combination that will be applied for each team.
    this.finalCombination = { NS: null, EW: null };
  }

  // Add a player to the room.
  addPlayer(player, socket, io) {
    if (this.players.length < 4) {
      // Assign teams: even indices → "NS", odd indices → "EW"
      player.team = this.players.length % 2 === 0 ? "NS" : "EW";
      player.hand = [];
      player.hasAnnouncedCombination = false;
      this.players.push(player);
      socket.join(this.id);
      socket.emit('userJoined', { room: this, player });
      io.to(this.id).emit('playerJoined', { room: this });
      if (this.players.length === 4) {
        this.nextRound(io);
      }
    }
  }

  // Remove a player from the room.
  removePlayer(player, socket, io) {
    this.players = this.players.filter(p => p.id !== player.id);
    socket.leave(this.id);
    io.to(this.id).emit('playerDisconnected', { room: this });
  }
  // Start the next round.
  nextRound(io) {
    // If all four bidding announcements are "pass", reset the round.
    if (this.announcements.length === 4 && this.announcements.every(a => a === "pass")) {
      this.deck = this.createDeck();
      // Rotate the dealer anti-clockwise:
      this.dealingPlayerIndex = (this.dealingPlayerIndex + 1) % 4;
      this.announcements = [];
      io.to(this.id).emit("splitting", { room: this });
      return;
    }
    // Reset round-specific variables.
    this.announcements = [];
    this.combinationAnnouncements = { NS: [], EW: [] };
    this.gameType = null;
    this.trumpSuit = null;
    this.playedCards = [];
    this.tricksPlayed = 0;
    this.capturedCards = { NS: [], EW: [] };
    this.callingTeam = null;
    this.players.forEach(player => player.hasAnnouncedCombination = false);
    // Rotate dealer anti-clockwise:
    this.dealingPlayerIndex = (this.dealingPlayerIndex + 1) % 4;
    // For announcing, the turn starts with the player immediately anti-clockwise to the dealer.
    this.turnIndex = (this.dealingPlayerIndex + 1) % 4;
    this.deck = this.setDeckAfterPlayOut(this);
    io.to(this.id).emit("splitting", { room: this });
  }

  // End the round: calculate points, update scores, emit "roundEnded", and start a new round.
  endRound(io) {
    const comboBonus = this.calculateCombinationBonuses();
    let trickPoints = { NS: 0, EW: 0 };
    ['NS', 'EW'].forEach(team => {
      this.capturedCards[team].forEach(card => {
        trickPoints[team] += this.getCardValue(card);
      });
    });
    console.log(comboBonus);
    let totalPoints = {
      NS: trickPoints.NS + comboBonus.NS,
      EW: trickPoints.EW + comboBonus.EW
    };
    let threshold = 0;
    if (this.gameType === 'suit') threshold = 162 / 2;
    else if (this.gameType === 'no trumps') threshold = 260 / 2;
    else if (this.gameType === 'all trumps') threshold = 258 / 2;
    totalPoints[this.lastHandTeam] += 10;
    if (this.callingTeam) {
      const opponent = this.callingTeam === 'NS' ? 'EW' : 'NS';
      if (totalPoints[this.callingTeam] < threshold + comboBonus[this.callingTeam] + comboBonus[opponent]) {
        totalPoints[opponent] += totalPoints[this.callingTeam];
        totalPoints[this.callingTeam] = 0;
      }
    }
    this.scores.NS += totalPoints.NS;
    this.scores.EW += totalPoints.EW;
    io.to(this.id).emit("roundEnded", {
      room: this,
      trickPoints,
      comboBonus,
      totalPoints,
      scores: this.scores
    });
    console.log('--------------------------');
    console.log(totalPoints);
    console.log('--------------------------');
    this.nextRound(io);
  }

  // Check if a move is valid.
  isValidMove(player, card) {
    // First, ensure the card exists in the player's hand.
    if (!player.hand.some(c => c.suit === card.suit && c.rank === card.rank)) {
      return false;
    }
  
    // 2. If no trick is in progress, any card is allowed.
    if (this.playedCards.length === 0) {
      return true;
    }

    const ledSuit = this.playedCards[0].card.suit;
    const trump = this.trumpSuit; // announced trump suit
    const gameType = this.gameType; // here, expected to be "suit"
    
    // Helper: get team by player id.
    const getTeam = (playerId) => {
      const p = this.players.find(p => p.id === playerId);
      return p ? p.team : null;
    };
  
    // If the game is "all trumps" and a trick is in progress, enforce following suit and overtrumping rules.
    if (this.gameType === 'all trumps' && this.playedCards && this.playedCards.length > 0) {
      const ledSuit = this.playedCards[0].card.suit;
      // Check if the player has any card in the led suit.
      const playerHasLedSuit = player.hand.some(c => c.suit === ledSuit);
      if (playerHasLedSuit && card.suit !== ledSuit) {
        // Must follow suit.
        return false;
      }
      // If the card is of the led suit, then enforce overtrumping if possible.
      if (card.suit === ledSuit) {
        // Define trump order for All Trumps (lower index is higher).
        const trumpOrder = ["J", "9", "A", "10", "K", "Q", "8", "7"];
        // Find the best (i.e. highest) card in the trick from the led suit.
        const playedInLedSuit = this.playedCards.filter(play => play.card.suit === ledSuit);
        let bestIndex = Infinity;
        playedInLedSuit.forEach(play => {
          const idx = trumpOrder.indexOf(play.card.rank);
          if (idx < bestIndex) {
            bestIndex = idx;
          }
        });
        // Determine if the player has any card in led suit that can beat the current highest.
        const playerCardsInLed = player.hand.filter(c => c.suit === ledSuit);
        const canOvertrump = playerCardsInLed.some(c => trumpOrder.indexOf(c.rank) < bestIndex);
        if (canOvertrump) {
          // If the player can overtrump, then the played card must be one of those.
          if (trumpOrder.indexOf(card.rank) >= bestIndex) {
            return false;
          }
        }
        // Otherwise, if the player cannot overtrump, then playing any card of led suit is acceptable.
      }
    } if(this.gameType == 'suit') {
      if (ledSuit === trump) {
        // (a) If the player has any trump, they must play a trump.
        const hasTrump = player.hand.some(c => c.suit === trump);
        if (hasTrump && card.suit !== trump) return false;
  
        // (b) If at least one trump has been played in this trick,
        // check if the current winning trump (lowest index in trumpOrder)
        // is held by an opponent.
        const playedTrumps = this.playedCards.filter(play => play.card.suit === trump);
        if (playedTrumps.length > 0) {
          const trumpOrder = ["J", "9", "A", "10", "K", "Q", "8", "7"];
          const currentWinning = playedTrumps.reduce((best, cur) =>
            trumpOrder.indexOf(cur.card.rank) < trumpOrder.indexOf(best.card.rank)
              ? cur : best
          );
          if (getTeam(currentWinning.playerId) !== player.team) {
            // If the opponent is winning and the player can overtrump, they must.
            const playerTrumps = player.hand.filter(c => c.suit === trump);
            const overtrumpOptions = playerTrumps.filter(c =>
              trumpOrder.indexOf(c.rank) < trumpOrder.indexOf(currentWinning.card.rank)
            );
            if (overtrumpOptions.length > 0) {
              // Then the played card must be one of the options.
              if (!overtrumpOptions.some(c => c.suit === card.suit && c.rank === card.rank)) {
                return false;
              }
            }
          }
        }
        return true;
      } 
      // --- CASE B: Led suit is NOT trump ---
      else {
        // (a) If the player has cards in the led suit, they must follow suit.
        const hasLed = player.hand.some(c => c.suit === ledSuit);
        if (hasLed) {
          if (card.suit !== ledSuit) return false;
          // No overtrumping rule applies if following led suit.
          return true;
        } else {
          // (b) If the player has no cards in the led suit, normally they must play trump.
          const hasTrump = player.hand.some(c => c.suit === trump);
          if (hasTrump) {
            // Check if any trump is already played.
            const playedTrumps = this.playedCards.filter(play => play.card.suit === trump);
            if (playedTrumps.length > 0) {
              const trumpOrder = ["J", "9", "A", "10", "K", "Q", "8", "7"];
              const currentWinning = playedTrumps.reduce((best, cur) =>
                trumpOrder.indexOf(cur.card.rank) < trumpOrder.indexOf(best.card.rank)
                  ? cur : best
              );
              // If the current winning trump belongs to an opponent, and if the player can overtrump, they must.
              if (getTeam(currentWinning.playerId) !== player.team) {
                const playerTrumps = player.hand.filter(c => c.suit === trump);
                const overtrumpOptions = playerTrumps.filter(c =>
                  trumpOrder.indexOf(c.rank) < trumpOrder.indexOf(currentWinning.card.rank)
                );
                if (overtrumpOptions.length > 0) {
                  if (!overtrumpOptions.some(c => c.suit === card.suit && c.rank === card.rank)) {
                    return false;
                  }
                } else {
                  // If the player cannot overtrump, they still must play a trump.
                  if (card.suit !== trump) return false;
                }
              } else {
                // If the current winning trump is held by a teammate, no obligation to overtrump.
                return true;
              }
            } else {
              // No trump has been played yet: the rule forces playing trump.
              if (card.suit !== trump) return false;
              return true;
            }
          } else {
            // If the player has neither led suit nor trump, they can play any card.
            return true;
          }
        }
      }
    } else {
      return player.hand.some(c => c.suit === card.suit && c.rank === card.rank);
    }
    return true;
  }
  
  // Process a card play.
  playCard(playerId, card, io) {
    const currentPlayer = this.players[this.turnIndex];
    if (currentPlayer.id !== playerId) {
      io.to(this.id).emit("error", { message: "Not your turn" });
      return;
    }
    
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;
    
    if (!this.isValidMove(player, card)) {
      io.to(this.id).emit("error", { message: "Invalid move" });
      return;
    }
    
    // NEW: If this is the first card the player is playing in the round,
    // detect and emit his combination.
    if (player.hand.length === 8 && player.detectedCombination === undefined) {
      player.detectedCombination = this.detectCombinationForPlayer(player);
      io.to(this.id).emit("combinationDetected", { playerId: player.id, combination: player.detectedCombination });
      // If all players have been processed, compute the final combination.
    }

    // Remove the card from the player's hand.
    player.hand = player.hand.filter(c => !(c.suit === card.suit && c.rank === card.rank));
    this.playedCards.push({ playerId, card });
    
    if (this.playedCards.length === 4) {
      const trickWinnerIndex = this.determineTrickWinner();
      const winningPlayer = this.players[trickWinnerIndex];
      // console.log("Players:", this.players, "Trick winner index:", trickWinnerIndex);
      this.capturedCards[winningPlayer.team].push(...this.playedCards.map(play => play.card));
      this.turnIndex = trickWinnerIndex;
      this.playedCards = [];
      this.tricksPlayed++;
      io.to(this.id).emit("trickCompleted", { room: this, playedCards: [] });
      if (this.tricksPlayed === 8) {
        this.lastHandTeam = winningPlayer.team;
        if (this.players.every(p => p.detectedCombination !== undefined)) {
          this.computeFinalCombinations(io);
        }
        this.endRound(io);
      }
    } else {
      this.turnIndex = (this.turnIndex + 1) % 4;
      io.to(this.id).emit("cardPlayed", { room: this, playedCards: this.playedCards });
    }
  }

  determineTrickWinner() {
    if (this.playedCards.length !== 4) return null;
    const ledSuit = this.playedCards[0].card.suit;
    const trump = this.trumpSuit;
    const gameType = this.gameType;
  
    // For "suit" games:
    if (gameType === "suit") {
      // Check if any trump cards have been played.
      const playedTrumps = this.playedCards.filter(play => play.card.suit === trump);
      if (playedTrumps.length > 0) {
        const trumpOrder = ["J", "9", "A", "10", "K", "Q", "8", "7"];
        const winningPlay = playedTrumps.reduce((best, cur) =>
          trumpOrder.indexOf(cur.card.rank) < trumpOrder.indexOf(best.card.rank)
            ? cur : best
        );
        return this.players.findIndex(p => p.id === winningPlay.playerId);
      } else {
        // Otherwise, use the led suit.
        const nonTrumpOrder = ["A", "10", "K", "Q", "J", "9", "8", "7"];
        const ledPlays = this.playedCards.filter(play => play.card.suit === ledSuit);
        const winningPlay = ledPlays.reduce((best, cur) =>
          nonTrumpOrder.indexOf(cur.card.rank) < nonTrumpOrder.indexOf(best.card.rank)
            ? cur : best
        );
        return this.players.findIndex(p => p.id === winningPlay.playerId);
      }
    }
    // For "all trumps", use the trump order on all cards.
    else if (gameType === "all trumps") {
      const trumpOrder = ["J", "9", "A", "10", "K", "Q", "8", "7"];
      const winningPlay = this.playedCards.reduce((best, cur) =>
        trumpOrder.indexOf(cur.card.rank) < trumpOrder.indexOf(best.card.rank)
          ? cur : best
      );
      return this.players.findIndex(p => p.id === winningPlay.playerId);
    }
    // For "no trumps", follow led suit only.
    else {
      const nonTrumpOrder = ["A", "10", "K", "Q", "J", "9", "8", "7"];
      const ledPlays = this.playedCards.filter(play => play.card.suit === ledSuit);
      const winningPlay = ledPlays.reduce((best, cur) =>
        nonTrumpOrder.indexOf(cur.card.rank) < nonTrumpOrder.indexOf(best.card.rank)
          ? cur : best
      );
      return this.players.findIndex(p => p.id === winningPlay.playerId);
    }
  }
};