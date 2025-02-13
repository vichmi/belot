// server/game/room.js
module.exports = class Room {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.players = [];
    this.deck = this.createDeck();
    this.points = { NS: 0, EW: 0 };
    this.score = { NS: 0, EW: 0 };
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
    this.tricksPlayed = 0;
    this.capturedCards = { NS: [], EW: [] };
    this.callingTeam = null;
    this.lastHandTeam = null;
    this.gameStage = null;
    // NEW: Final combination that will be applied for each team.
    this.finalCombination = { NS: null, EW: null };
  }

  /* ======================
       DECK AND DEALING
  ========================= */

  // Create a 32–card deck and shuffle it using Fisher–Yates.
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

  // Rotate the deck from a given index then deal the initial cards.
  splitDeck(index, io) {
    if (index < 0 || index >= this.deck.length) return;
    this.deck = [...this.deck.slice(index), ...this.deck.slice(0, index)];
    this.dealInitialCards(io);
    this.gameStage = 'splitting';
  }

  // Deal the initial five cards to every player (first three then two).
  dealInitialCards(io) {
    this.players.forEach(player => (player.hand = []));
    let deckCopy = [...this.deck];
    // Deal in two rounds: first 3 cards, then 2 cards.
    [3, 2].forEach(numCards => {
      for (let i = 0; i < numCards; i++) {
        this.players.forEach(player => {
          player.hand.push(deckCopy.pop());
        });
      }
    });
    this.deck = deckCopy;
    io.to(this.id).emit("initialCardsDealt", { room: this });
    this.gameStage = 'dealing';
  }

  // Deal the remaining three cards so that each player ends up with eight cards.
  dealRestCards(io) {
    this.players.forEach(player => {
      for (let i = 0; i < 3; i++) {
        player.hand.push(this.deck.pop());
      }
    });
    this.gameStage = 'playing';
    // The announcing turn starts with the player immediately anti-clockwise to the dealer.
    this.turnIndex = (this.dealingPlayerIndex + 1) % 4;
    io.to(this.id).emit("restCardsDealt", { room: this });
    console.log(this.detectCombinations());
  }

  /* ======================
          PLAYERS
  ========================= */

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
        this.startGame(io);
      }
    }
  }

  // Remove a player from the room.
  removePlayer(player, socket, io) {
    this.players = this.players.filter(p => p.id !== player.id);
    socket.leave(this.id);
    io.to(this.id).emit('playerDisconnected', { room: this });
  }

  // Start the game (reset variables and start a new round).
  startGame(io) {
    this.nextRound(io);
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
    this.deck = this.createDeck();
    io.to(this.id).emit("splitting", { room: this });
  }

  /* ======================
         BIDDING & ANNOUNCEMENTS
  ========================= */

  // Process a bidding announcement.
  makeAnnouncement(playerId, announcement, io) {
    const validOrder = ["clubs", "diamonds", "hearts", "spades", "no trumps", "all trumps"];
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;

    // For non‑pass bids, ensure the new bid is higher than the last non‑pass bid.
    if (announcement !== "pass") {
      const lastNonPass = this.announcements.filter(a => a !== "pass").slice(-1)[0];
      if (lastNonPass && validOrder.indexOf(announcement) <= validOrder.indexOf(lastNonPass)) {
        io.to(player.id).emit('error', { message: 'Cannot call this suit' });
        return;
      }
      if (["clubs", "diamonds", "hearts", "spades"].includes(announcement)) {
        this.trumpSuit = announcement;
        this.gameType = "suit";
      } else if (announcement === "no trumps") {
        this.trumpSuit = null;
        this.gameType = "no trumps";
      } else if (announcement === "all trumps") {
        this.trumpSuit = null;
        this.gameType = "all trumps";
      }
      this.callingTeam = player.team;
    } else {
      // If a pass is given and all four are passes, restart the round.
      if (this.announcements.length === 3 && this.announcements.every(a => a === "pass")) {
        this.nextRound(io);
        return;
      }
    }
    this.gameStage = 'announcing';
    this.announcements.push(announcement);
    // Advance turn anti-clockwise.
    this.turnIndex = (this.turnIndex + 1) % 4;

    // Termination Conditions:
    // (1) All four players pass → round reset.
    if (this.announcements.length === 4 && this.announcements.every(a => a === "pass")) {
      this.deck = this.createDeck();
      io.to(this.id).emit("roundRestarted", { room: this });
      return;
    }
    // (2) "All trumps" bid ends bidding immediately.
    if (this.gameType === "all trumps") {
      this.dealRestCards(io);
      return;
    }
    // (3) For a suit or "no trumps" bid, if three consecutive passes follow the last non‑pass bid, end bidding.
    const lastNonPassIndex = this.announcements
      .map((a, i) => a !== "pass" ? i : -1)
      .filter(i => i !== -1)
      .pop();
    let consecutivePasses = 0;
    for (let i = this.announcements.length - 1; i > lastNonPassIndex; i--) {
      if (this.announcements[i] === "pass") consecutivePasses++;
      else break;
    }
    if (lastNonPassIndex !== undefined && consecutivePasses >= 3) {
      this.dealRestCards(io);
      return;
    }
    io.to(this.id).emit("announcementMade", { room: this, lastAnnouncement: announcement });
  }

  // Process a combination bonus announcement.
  announceCombination(playerId, combination, io) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;
    if (this.gameType === "no trumps") {
      io.to(player.id).emit("error", { message: "No combinations allowed in No Trumps game" });
      return;
    }
    // In a suit game, belot must be in trump.
    if (combination.type === "belot" && this.gameType === "suit" && combination.suit !== this.trumpSuit) {
      io.to(player.id).emit("error", { message: "Belot must be announced in trump suit" });
      return;
    }
    player.hasAnnouncedCombination = true;
    player.detectedCombination = combination;
    // Use helper to get bonus value.
    const bonus = this._getCombinationBonus(combination.type);
    combination.bonus = bonus;
    const team = player.team;
    this.combinationAnnouncements[team].push({
      playerId,
      type: combination.type,
      suit: combination.suit,
      bonus: bonus,
      highestCardRank: combination.highestCardRank || null
    });
    io.to(this.id).emit("combinationAnnounced", { team, combination });
  }

  // Helper: return bonus value for a combination type.
  _getCombinationBonus(type) {
    const bonuses = {
      belot: 20,
      tierce: 20,
      quarte: 50,
      quint: 100,
      square_standard: 100,
      square_nines: 150,
      square_jacks: 200
    };
    return bonuses[type] || 0;
  }

  /* ======================
      COMBINATION DETECTION
  ========================= */

  // Detect all combinations for every player.
  detectCombinations() {
    let results = {};
    this.players.forEach(player => {
      results[player.id] = this.detectCombinationForPlayer(player);
    });
    return results;
  }

  // Detect combinations (sequences and squares) for a single player.
  detectCombinationForPlayer(player) {
    if (!player.hand) return [];
    const sequences = this._detectSequences(player.hand);
    const squares = this._detectSquares(player.hand);
    // (Optionally, belot detection could be added here.)
    return [...sequences, ...squares];
  }

  // Helper: Detect sequences within a hand.
  _detectSequences(hand) {
    const sequences = [];
    const rankOrder = ["7", "8", "9", "10", "J", "Q", "K", "A"];
    ["hearts", "diamonds", "clubs", "spades"].forEach(suit => {
      const cardsInSuit = hand.filter(c => c.suit === suit).map(c => c.rank);
      let uniqueRanks = Array.from(new Set(cardsInSuit));
      uniqueRanks.sort((a, b) => rankOrder.indexOf(a) - rankOrder.indexOf(b));
      if (uniqueRanks.length > 0) {
        let currentSeq = [uniqueRanks[0]];
        for (let i = 1; i < uniqueRanks.length; i++) {
          if (rankOrder.indexOf(uniqueRanks[i]) === rankOrder.indexOf(uniqueRanks[i - 1]) + 1) {
            currentSeq.push(uniqueRanks[i]);
          } else {
            if (currentSeq.length >= 3) {
              let type = currentSeq.length >= 5 ? "quint" : (currentSeq.length === 4 ? "quarte" : "tierce");
              sequences.push({
                type,
                suit,
                bonus: this._getCombinationBonus(type),
                highestCardRank: currentSeq[currentSeq.length - 1],
                startCard: currentSeq[0]
              });
            }
            currentSeq = [uniqueRanks[i]];
          }
        }
        if (currentSeq.length >= 3) {
          let type = currentSeq.length >= 5 ? "quint" : (currentSeq.length === 4 ? "quarte" : "tierce");
          sequences.push({
            type,
            suit,
            bonus: this._getCombinationBonus(type),
            highestCardRank: currentSeq[currentSeq.length - 1],
            startCard: currentSeq[0]
          });
        }
      }
    });
    return sequences;
  }

  // Helper: Detect squares within a hand.
  _detectSquares(hand) {
    const squares = [];
    let rankCounts = {};
    hand.forEach(c => {
      rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
    });
    ["10", "Q", "K", "A"].forEach(rank => {
      if (rankCounts[rank] === 4) {
        squares.push({ type: "square_standard", bonus: this._getCombinationBonus("square_standard"), rank });
      }
    });
    if (rankCounts["9"] === 4) {
      squares.push({ type: "square_nines", bonus: this._getCombinationBonus("square_nines"), rank: "9" });
    }
    if (rankCounts["J"] === 4) {
      squares.push({ type: "square_jacks", bonus: this._getCombinationBonus("square_jacks"), rank: "J" });
    }
    return squares;
  }

  // Compute the final combination for each team once all players have detected their combinations.
  computeFinalCombinations(io) {
    let finalCombos = { NS: null, EW: null };
    const rankOrder = { "A": 8, "K": 7, "Q": 6, "J": 5, "10": 4, "9": 3, "8": 2, "7": 1 };
    ["NS", "EW"].forEach(team => {
      let teamCombos = [];
      this.players.forEach(p => {
        if (p.team === team && p.detectedCombination !== undefined) {
          teamCombos = teamCombos.concat(p.detectedCombination);
        }
      });
      if (teamCombos.length === 0) return;
      // Sort combinations by bonus descending. For sequence types, use highest card as tie-breaker.
      teamCombos.sort((a, b) => {
        if (b.bonus !== a.bonus) return b.bonus - a.bonus;
        if (["tierce", "quarte", "quint"].includes(a.type)) {
          return (rankOrder[b.highestCardRank] || 0) - (rankOrder[a.highestCardRank] || 0);
        }
        return 0;
      });
      finalCombos[team] = teamCombos[0];
    });
    this.finalCombination = finalCombos;
    io.to(this.id).emit("finalCombination", { finalCombination: this.finalCombination });
  }

  /* ======================
         CARD PLAYING & SCORING
  ========================= */

  // Get the point value of a card based on the game type.
  getCardValue(card) {
    const trumpValues = { 'A': 11, '10': 10, 'K': 4, 'Q': 3, 'J': 20, '9': 14, '8': 0, '7': 0 };
    const nonTrumpValues = { 'A': 11, '10': 10, 'K': 4, 'Q': 3, 'J': 2, '9': 0, '8': 0, '7': 0 };
    if (this.gameType === 'suit') {
      return card.suit === this.trumpSuit ? trumpValues[card.rank] : nonTrumpValues[card.rank];
    } else if (this.gameType === 'no trumps') {
      return nonTrumpValues[card.rank];
    } else if (this.gameType === 'all trumps') {
      return trumpValues[card.rank];
    }
    return 0;
  }

  // End the round: calculate points, update points, emit "roundEnded", and start a new round.
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
    this.points.NS += totalPoints.NS;
    this.points.EW += totalPoints.EW;
    if (this.gameType == 'all trumps' && this.points.NS % 10 == 4 && this.points.EW % 10 == 4) {
      if (this.points.EW < this.points.NS) { this.score.EW += Math.ceil(this.points.EW / 10); }
      else { this.score.NS += Math.ceil(this.points.NS / 10); }
    } else {
      if (this.gameType == 'no trumps') {
        this.score.NS = Math.round((this.points.NS * 2) / 10);
        this.score.EW = Math.round((this.points.NS * 2) / 10);
      } else {
        this.score.NS = Math.round(this.points.NS / 10);
        this.score.EW = Math.round(this.points.NS / 10);
      }
    }
    io.to(this.id).emit("roundEnded", {
      room: this,
      trickPoints,
      comboBonus,
      totalPoints,
      points: this.points
    });
    console.log('--------------------------');
    console.log(totalPoints);
    console.log('--------------------------');
    this.nextRound(io);
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

    // If this is the first card the player plays in the round,
    // detect and emit his combinations.
    if (player.hand.length === 8 && player.detectedCombination === undefined) {
      player.detectedCombination = this.detectCombinationForPlayer(player);
      io.to(this.id).emit("combinationDetected", { playerId: player.id, combination: player.detectedCombination });
    }

    // Remove the card from the player's hand.
    player.hand = player.hand.filter(c => !(c.suit === card.suit && c.rank === card.rank));
    this.playedCards.push({ playerId, card });

    if (this.playedCards.length === 4) {
      const trickWinnerIndex = this.determineTrickWinner();
      const winningPlayer = this.players[trickWinnerIndex];
      this.capturedCards[winningPlayer.team].push(...this.playedCards.map(play => play.card));
      this.turnIndex = trickWinnerIndex;
      this.playedCards = [];
      this.tricksPlayed++;
      io.to(this.id).emit("trickCompleted", { room: this, playedCards: [] });
      if (this.tricksPlayed === 8) {
        this.lastHandTeam = winningPlayer.team;
        this.players.forEach(p => {
          if (p.detectedCombination === undefined) p.detectedCombination = [];
        });
        this.computeFinalCombinations(io);
        this.endRound(io);
      }
    } else {
      this.turnIndex = (this.turnIndex + 1) % 4;
      io.to(this.id).emit("cardPlayed", { room: this, playedCards: this.playedCards });
    }
  }

  /* ======================
         MOVE VALIDATION
  ========================= */

  // Check if a move is valid.
  isValidMove(player, card) {
    // Ensure the card exists in the player's hand.
    if (!player.hand.some(c => c.suit === card.suit && c.rank === card.rank)) {
      return false;
    }

    // If no trick is in progress, any card is allowed.
    if (this.playedCards.length === 0) {
      return true;
    }

    const ledSuit = this.playedCards[0].card.suit;
    if (this.gameType === 'all trumps') {
      return this._validateAllTrumpsMove(player, card, ledSuit);
    } else if (this.gameType === 'suit') {
      return this._validateSuitMove(player, card, ledSuit);
    } else if (this.gameType === 'no trumps') {
      return true;
    }
    return true;
  }

  // Helper: Validate a move in an "all trumps" game.
  _validateAllTrumpsMove(player, card, ledSuit) {
    const trumpOrder = this._getTrumpOrder();
    // Must follow led suit if possible.
    const playerHasLedSuit = player.hand.some(c => c.suit === ledSuit);
    if (playerHasLedSuit && card.suit !== ledSuit) return false;
    // If playing led suit, enforce overtrumping if possible.
    if (card.suit === ledSuit) {
      const playedInLedSuit = this.playedCards.filter(play => play.card.suit === ledSuit);
      let bestIndex = Infinity;
      playedInLedSuit.forEach(play => {
        const idx = trumpOrder.indexOf(play.card.rank);
        if (idx < bestIndex) bestIndex = idx;
      });
      const playerCardsInLed = player.hand.filter(c => c.suit === ledSuit);
      const canOvertrump = playerCardsInLed.some(c => trumpOrder.indexOf(c.rank) < bestIndex);
      if (canOvertrump && trumpOrder.indexOf(card.rank) >= bestIndex) {
        return false;
      }
    }
    return true;
  }

  // Helper: Validate a move in a "suit" game.
  _validateSuitMove(player, card, ledSuit) {
    const trump = this.trumpSuit;
    const trumpOrder = this._getTrumpOrder();
    const getTeam = (playerId) => {
      const p = this.players.find(p => p.id === playerId);
      return p ? p.team : null;
    };

    if (ledSuit === trump) {
      // Must play trump if holding any.
      const hasTrump = player.hand.some(c => c.suit === trump);
      if (hasTrump && card.suit !== trump) return false;

      const playedTrumps = this.playedCards.filter(play => play.card.suit === trump);
      if (playedTrumps.length > 0) {
        const currentWinning = playedTrumps.reduce((best, cur) =>
          trumpOrder.indexOf(cur.card.rank) < trumpOrder.indexOf(best.card.rank) ? cur : best
        );
        if (getTeam(currentWinning.playerId) !== player.team) {
          const playerTrumps = player.hand.filter(c => c.suit === trump);
          const overtrumpOptions = playerTrumps.filter(c =>
            trumpOrder.indexOf(c.rank) < trumpOrder.indexOf(currentWinning.card.rank)
          );
          if (overtrumpOptions.length > 0 && !overtrumpOptions.some(c => c.suit === card.suit && c.rank === card.rank)) {
            return false;
          }
        }
      }
      return true;
    } else {
      // Led suit is not trump.
      const hasLed = player.hand.some(c => c.suit === ledSuit);
      if (hasLed) {
        if (card.suit !== ledSuit) return false;
        return true;
      } else {
        // If no led suit, but holds trump then may be forced to play trump.
        const hasTrump = player.hand.some(c => c.suit === trump);
        if (hasTrump) {
          const playedTrumps = this.playedCards.filter(play => play.card.suit === trump);
          if (playedTrumps.length > 0) {
            const currentWinning = playedTrumps.reduce((best, cur) =>
              trumpOrder.indexOf(cur.card.rank) < trumpOrder.indexOf(best.card.rank) ? cur : best
            );
            if (getTeam(currentWinning.playerId) !== player.team) {
              const playerTrumps = player.hand.filter(c => c.suit === trump);
              const overtrumpOptions = playerTrumps.filter(c =>
                trumpOrder.indexOf(c.rank) < trumpOrder.indexOf(currentWinning.card.rank)
              );
              if (overtrumpOptions.length > 0 && !overtrumpOptions.some(c => c.suit === card.suit && c.rank === card.rank)) {
                return false;
              } else if (overtrumpOptions.length === 0 && card.suit !== trump) {
                return false;
              }
            } else {
              return true;
            }
          } else {
            // No trump played yet, force playing trump.
            if (card.suit !== trump) return false;
            return true;
          }
        } else {
          return true;
        }
      }
    }
  }

  // Helper: Returns the trump order used in "suit" and "all trumps" games.
  _getTrumpOrder() {
    return ["J", "9", "A", "10", "K", "Q", "8", "7"];
  }

  /* ======================
         TRICK WINNER
  ========================= */

  // Determine the winner of the trick.
  determineTrickWinner() {
    if (this.playedCards.length !== 4) return null;
    const ledSuit = this.playedCards[0].card.suit;
    if (this.gameType === "suit") {
      const playedTrumps = this.playedCards.filter(play => play.card.suit === this.trumpSuit);
      if (playedTrumps.length > 0) {
        const trumpOrder = this._getTrumpOrder();
        const winningPlay = this._determineWinner(playedTrumps, trumpOrder);
        return this.players.findIndex(p => p.id === winningPlay.playerId);
      } else {
        const nonTrumpOrder = ["A", "10", "K", "Q", "J", "9", "8", "7"];
        const ledPlays = this.playedCards.filter(play => play.card.suit === ledSuit);
        const winningPlay = this._determineWinner(ledPlays, nonTrumpOrder);
        return this.players.findIndex(p => p.id === winningPlay.playerId);
      }
    } else if (this.gameType === "all trumps") {
      const trumpOrder = this._getTrumpOrder();
      const winningPlay = this._determineWinner(this.playedCards, trumpOrder);
      return this.players.findIndex(p => p.id === winningPlay.playerId);
    } else if (this.gameType === "no trumps") {
      const nonTrumpOrder = ["A", "10", "K", "Q", "J", "9", "8", "7"];
      const ledPlays = this.playedCards.filter(play => play.card.suit === ledSuit);
      const winningPlay = this._determineWinner(ledPlays, nonTrumpOrder);
      return this.players.findIndex(p => p.id === winningPlay.playerId);
    }
    return null;
  }

  // Helper: Given an array of played cards and an order array, return the winning play.
  _determineWinner(playCards, order) {
    return playCards.reduce((best, cur) =>
      order.indexOf(cur.card.rank) < order.indexOf(best.card.rank) ? cur : best
    );
  }

  /* ======================
      COMBINATION BONUS CALCULATION
  ========================= */

  calculateCombinationBonuses() {
    const bonus = { NS: 0, EW: 0 };

    // Helper functions.
    const getSequenceBonus = type => (type === 'tierce' ? 20 : type === 'quarte' ? 50 : type === 'quint' ? 100 : 0);
    const getSquareBonus = type => (type === 'square_standard' ? 100 : type === 'square_nines' ? 150 : type === 'square_jacks' ? 200 : 0);
    const rankOrder = { '7': 1, '8': 2, '9': 3, '10': 4, 'J': 5, 'Q': 6, 'K': 7, 'A': 8 };

    // --- BELOT BONUS ---
    ['NS', 'EW'].forEach(team => {
      const belots = this.combinationAnnouncements[team].filter(c => c.type === 'belot');
      if (belots.length > 0) bonus[team] += 20;
    });

    // --- SEQUENCE BONUS ---
    const sequenceTypes = ['tierce', 'quarte', 'quint'];
    const bestSeq = { NS: null, EW: null };
    ['NS', 'EW'].forEach(team => {
      const seqs = this.combinationAnnouncements[team].filter(c => sequenceTypes.includes(c.type));
      if (seqs.length > 0) {
        bestSeq[team] = seqs.reduce((best, current) => {
          const currentSeqBonus = getSequenceBonus(current.type);
          const bestSeqBonus = best ? getSequenceBonus(best.type) : 0;
          if (currentSeqBonus > bestSeqBonus) return current;
          else if (currentSeqBonus === bestSeqBonus && current.startCard && best.startCard &&
                   rankOrder[current.startCard] > rankOrder[best.startCard]) {
            return current;
          }
          return best;
        }, null);
      }
    });
    if (bestSeq.NS && bestSeq.EW) {
      const nsSeqBonus = getSequenceBonus(bestSeq.NS.type);
      const ewSeqBonus = getSequenceBonus(bestSeq.EW.type);
      if (nsSeqBonus > ewSeqBonus) bonus.NS += nsSeqBonus;
      else if (ewSeqBonus > nsSeqBonus) bonus.EW += ewSeqBonus;
      else {
        const nsStart = bestSeq.NS.startCard || '7';
        const ewStart = bestSeq.EW.startCard || '7';
        if (rankOrder[nsStart] > rankOrder[ewStart]) bonus.NS += nsSeqBonus;
        else if (rankOrder[ewStart] > rankOrder[nsStart]) bonus.EW += ewSeqBonus;
      }
    } else if (bestSeq.NS) {
      bonus.NS += getSequenceBonus(bestSeq.NS.type);
    } else if (bestSeq.EW) {
      bonus.EW += getSequenceBonus(bestSeq.EW.type);
    }

    // --- SQUARE BONUS ---
    const squareTypes = ['square_standard', 'square_nines', 'square_jacks'];
    const bestSquare = { NS: null, EW: null };
    ['NS', 'EW'].forEach(team => {
      const squares = this.combinationAnnouncements[team].filter(c => squareTypes.includes(c.type));
      if (squares.length > 0) {
        bestSquare[team] = squares.reduce((best, current) => {
          const currentSqBonus = getSquareBonus(current.type);
          const bestSqBonus = best ? getSquareBonus(best.type) : 0;
          // In a suit game, prefer a square announced in the trump suit.
          if (this.gameType === 'suit') {
            const currentIsTrump = (current.suit === this.trumpSuit);
            const bestIsTrump = best ? (best.suit === this.trumpSuit) : false;
            if (currentIsTrump && !bestIsTrump) return current;
            if (!currentIsTrump && bestIsTrump) return best;
          }
          return currentSqBonus > bestSqBonus ? current : best;
        }, null);
      }
    });
    if (bestSquare.NS && bestSquare.EW) {
      const nsSqBonus = getSquareBonus(bestSquare.NS.type);
      const ewSqBonus = getSquareBonus(bestSquare.EW.type);
      if (this.gameType === 'suit') {
        const nsIsTrump = bestSquare.NS.suit === this.trumpSuit;
        const ewIsTrump = bestSquare.EW.suit === this.trumpSuit;
        if (nsIsTrump && !ewIsTrump) bonus.NS += nsSqBonus;
        else if (ewIsTrump && !nsIsTrump) bonus.EW += ewSqBonus;
        else {
          if (nsSqBonus > ewSqBonus) bonus.NS += nsSqBonus;
          else if (ewSqBonus > nsSqBonus) bonus.EW += ewSqBonus;
        }
      } else {
        if (nsSqBonus > ewSqBonus) bonus.NS += nsSqBonus;
        else if (ewSqBonus > nsSqBonus) bonus.EW += ewSqBonus;
      }
    } else if (bestSquare.NS) {
      bonus.NS += getSquareBonus(bestSquare.NS.type);
    } else if (bestSquare.EW) {
      bonus.EW += getSquareBonus(bestSquare.EW.type);
    }

    return bonus;
  }
};
