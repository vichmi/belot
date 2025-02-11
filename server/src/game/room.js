// server/game/room.js
module.exports = class Room {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.players = [];
    this.deck = this.createDeck();
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

  // Deal the initial five cards to every player (first three then two).
  dealInitialCards(io) {
    this.players.forEach(player => player.hand = []);
    let deckCopy = [...this.deck];
    for (let i = 0; i < 3; i++) {
      this.players.forEach(player => {
        player.hand.push(deckCopy.pop());
      });
    }
    for (let i = 0; i < 2; i++) {
      this.players.forEach(player => {
        player.hand.push(deckCopy.pop());
      });
    }
    this.deck = deckCopy;
    io.to(this.id).emit("initialCardsDealt", { room: this });
    this.gameStage = 'dealing';
  }

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

  detectBelot() {
      // === BELLOT ===
      // Belot is only allowed when combinations are allowed.
      if (this.gameType !== "no trumps") {
        if (this.gameType === "suit") {
          // Only check the announced trump suit.
          if (
            player.hand.some(c => c.suit === this.trumpSuit && c.rank === "K") &&
            player.hand.some(c => c.suit === this.trumpSuit && c.rank === "Q")
          ) {
            combos.push({ type: "belot", suit: this.trumpSuit, bonus: 20 });
          }
        } else if (this.gameType === "all trumps") {
          // Check for belot in each suit.
          ["hearts", "diamonds", "clubs", "spades"].forEach(suit => {
            if (
              player.hand.some(c => c.suit === suit && c.rank === "K") &&
              player.hand.some(c => c.suit === suit && c.rank === "Q")
            ) {
              combos.push({ type: "belot", suit: suit, bonus: 20 });
            }
          });
        }
      }
  }

  detectCombinations() {
    let results = {};
    // Define the rank order for sequences.
    const rankOrder = ["7", "8", "9", "10", "J", "Q", "K", "A"];
    // Process each player.
    this.players.forEach(player => {
      let combos = [];
      if (!player.hand) {
        results[player.id] = combos;
        return;
      }
      
      // === SEQUENCES ===
      // For each suit, find the longest consecutive sequence.
      ["hearts", "diamonds", "clubs", "spades"].forEach(suit => {
        // Collect all ranks the player holds in this suit.
        const cardsInSuit = player.hand.filter(c => c.suit === suit).map(c => c.rank);
        // Remove duplicates and sort by rank order.
        let uniqueRanks = Array.from(new Set(cardsInSuit));
        uniqueRanks.sort((a, b) => rankOrder.indexOf(a) - rankOrder.indexOf(b));
        if (uniqueRanks.length > 0) {
          let currentSeq = [uniqueRanks[0]];
          for (let i = 1; i < uniqueRanks.length; i++) {
            if (rankOrder.indexOf(uniqueRanks[i]) === rankOrder.indexOf(uniqueRanks[i - 1]) + 1) {
              currentSeq.push(uniqueRanks[i]);
            } else {
              if (currentSeq.length >= 3) {
                // Classify based on length.
                if (currentSeq.length >= 5) {
                  combos.push({
                    type: "quint",
                    suit: suit,
                    bonus: 100,
                    highestCardRank: currentSeq[currentSeq.length - 1],
                  });
                } else if (currentSeq.length === 4) {
                  combos.push({
                    type: "quarte",
                    suit: suit,
                    bonus: 50,
                    highestCardRank: currentSeq[currentSeq.length - 1],
                  });
                } else if (currentSeq.length === 3) {
                  combos.push({
                    type: "tierce",
                    suit: suit,
                    bonus: 20,
                    highestCardRank: currentSeq[currentSeq.length - 1],
                  });
                }
              }
              currentSeq = [uniqueRanks[i]];
            }
          }
          // Check if the final sequence qualifies.
          if (currentSeq.length >= 3) {
            if (currentSeq.length >= 5) {
              combos.push({
                type: "quint",
                suit: suit,
                bonus: 100,
                highestCardRank: currentSeq[currentSeq.length - 1],
              });
            } else if (currentSeq.length === 4) {
              combos.push({
                type: "quarte",
                suit: suit,
                bonus: 50,
                highestCardRank: currentSeq[currentSeq.length - 1],
              });
            } else if (currentSeq.length === 3) {
              combos.push({
                type: "tierce",
                suit: suit,
                bonus: 20,
                highestCardRank: currentSeq[currentSeq.length - 1],
              });
            }
          }
        }
      });
      
      // === SQUARES ===
      // Count occurrences of each rank.
      let rankCounts = {};
      player.hand.forEach(c => {
        rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
      });
      // For square_standard: check for each rank among "10", "Q", "K", "A".
      ["10", "Q", "K", "A"].forEach(rank => {
        if (rankCounts[rank] === 4) {
          combos.push({ type: "square_standard", bonus: 100, rank: rank });
        }
      });
      if (rankCounts["9"] === 4) {
        combos.push({ type: "square_nines", bonus: 150, rank: "9" });
      }
      if (rankCounts["J"] === 4) {
        combos.push({ type: "square_jacks", bonus: 200, rank: "J" });
      }
      
      results[player.id] = combos;
    });
    return results;
  }

  // Process a combination bonus announcement.
  announceCombination(playerId, combination, io) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;
    if (player.hasAnnouncedCombination) {
      io.to(player.id).emit("error", { message: "Combination already announced" });
      return;
    }
    if (this.gameType === "no trumps") {
      io.to(player.id).emit("error", { message: "No combinations allowed in No Trumps game" });
      return;
    }
    if (combination.type === "belot" && this.gameType === "suit" && combination.suit !== this.trumpSuit) {
      io.to(player.id).emit("error", { message: "Belot must be announced in trump suit" });
      return;
    }
    player.hasAnnouncedCombination = true;
    let bonus = 0;
    if (combination.type === "belot") bonus = 20;
    else if (combination.type === "tierce") bonus = 20;
    else if (combination.type === "quarte") bonus = 50;
    else if (combination.type === "quint") bonus = 100;
    else if (combination.type === "square_standard") bonus = 100;
    else if (combination.type === "square_nines") bonus = 150;
    else if (combination.type === "square_jacks") bonus = 200;
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

  // Calculate combination bonus points.
  calculateCombinationBonuses() {
    const bonus = { NS: 0, EW: 0 };
    function getSequenceBonus(type) {
      if (type === 'tierce') return 20;
      if (type === 'quarte') return 50;
      if (type === 'quint') return 100;
      return 0;
    }
    function getSquareBonus(type) {
      if (type === 'square_standard') return 100;
      if (type === 'square_nines') return 150;
      if (type === 'square_jacks') return 200;
      return 0;
    }
    ['NS', 'EW'].forEach(team => {
      const belots = this.combinationAnnouncements[team].filter(c => c.type === 'belot');
      if (belots.length > 0) bonus[team] += 20;
    });
    const sequenceTypes = ['tierce', 'quarte', 'quint'];
    const seqAnnouncement = { NS: null, EW: null };
    ['NS', 'EW'].forEach(team => {
      const seqs = this.combinationAnnouncements[team].filter(c => sequenceTypes.includes(c.type));
      if (seqs.length > 0) {
        seqAnnouncement[team] = seqs.reduce((best, current) => {
          const currentBonus = getSequenceBonus(current.type);
          const bestBonus = best ? getSequenceBonus(best.type) : 0;
          if (currentBonus > bestBonus) return current;
          else if (currentBonus === bestBonus) {
            const rankOrder = { 'A': 8, 'K': 7, 'Q': 6, 'J': 5, '10': 4, '9': 3, '8': 2, '7': 1 };
            if ((current.highestCardRank && best.highestCardRank) &&
                rankOrder[current.highestCardRank] > rankOrder[best.highestCardRank]) {
              return current;
            }
          }
          return best;
        }, null);
      }
    });
    if (seqAnnouncement['NS'] && seqAnnouncement['EW']) {
      const nsBonus = getSequenceBonus(seqAnnouncement['NS'].type);
      const ewBonus = getSequenceBonus(seqAnnouncement['EW'].type);
      if (nsBonus > ewBonus) bonus['NS'] += nsBonus;
      else if (ewBonus > nsBonus) bonus['EW'] += ewBonus;
    } else if (seqAnnouncement['NS']) {
      bonus['NS'] += getSequenceBonus(seqAnnouncement['NS'].type);
    } else if (seqAnnouncement['EW']) {
      bonus['EW'] += getSequenceBonus(seqAnnouncement['EW'].type);
    }
    const squareAnnouncement = { NS: null, EW: null };
    ['NS', 'EW'].forEach(team => {
      const squares = this.combinationAnnouncements[team].filter(c => c.type.startsWith('square'));
      if (squares.length > 0) {
        squareAnnouncement[team] = squares.reduce((best, current) => {
          const currentBonus = getSquareBonus(current.type);
          const bestBonus = best ? getSquareBonus(best.type) : 0;
          if (this.gameType === 'suit' && current.suit === this.trumpSuit && (!best || best.suit !== this.trumpSuit)) {
            return current;
          }
          if (currentBonus > bestBonus) return current;
          return best;
        }, null);
      }
    });
    if (squareAnnouncement['NS'] && squareAnnouncement['EW']) {
      const nsBonus = getSquareBonus(squareAnnouncement['NS'].type);
      const ewBonus = getSquareBonus(squareAnnouncement['EW'].type);
      const nsIsTrump = (this.gameType === 'suit' && squareAnnouncement['NS'].suit === this.trumpSuit);
      const ewIsTrump = (this.gameType === 'suit' && squareAnnouncement['EW'].suit === this.trumpSuit);
      if (nsIsTrump && !ewIsTrump) bonus['NS'] += nsBonus;
      else if (ewIsTrump && !nsIsTrump) bonus['EW'] += ewBonus;
      else {
        if (nsBonus > ewBonus) bonus['NS'] += nsBonus;
        else if (ewBonus > nsBonus) bonus['EW'] += ewBonus;
      }
    } else if (squareAnnouncement['NS']) {
      bonus['NS'] += getSquareBonus(squareAnnouncement['NS'].type);
    } else if (squareAnnouncement['EW']) {
      bonus['EW'] += getSquareBonus(squareAnnouncement['EW'].type);
    }
    return bonus;
  }


   // NEW: Detect combinations for a single player.
   detectCombinationForPlayer(player) {
    let combos = [];
    if (!player.hand) return combos;
    // SEQUENCE detection.
    const rankOrder = ["7", "8", "9", "10", "J", "Q", "K", "A"];
    ["hearts", "diamonds", "clubs", "spades"].forEach(suit => {
      const cardsInSuit = player.hand.filter(c => c.suit === suit).map(c => c.rank);
      let uniqueRanks = Array.from(new Set(cardsInSuit));
      uniqueRanks.sort((a, b) => rankOrder.indexOf(a) - rankOrder.indexOf(b));
      if (uniqueRanks.length > 0) {
        let currentSeq = [uniqueRanks[0]];
        for (let i = 1; i < uniqueRanks.length; i++) {
          if (rankOrder.indexOf(uniqueRanks[i]) === rankOrder.indexOf(uniqueRanks[i - 1]) + 1) {
            currentSeq.push(uniqueRanks[i]);
          } else {
            if (currentSeq.length >= 3) {
              if (currentSeq.length >= 5) {
                combos.push({ type: "quint", suit: suit, bonus: 100, highestCardRank: currentSeq[currentSeq.length - 1], isChecked: true });
              } else if (currentSeq.length === 4) {
                combos.push({ type: "quarte", suit: suit, bonus: 50, highestCardRank: currentSeq[currentSeq.length - 1], isChecked: true });
              } else if (currentSeq.length === 3) {
                combos.push({ type: "tierce", suit: suit, bonus: 20, highestCardRank: currentSeq[currentSeq.length - 1], isChecked: true });
              }
            }
            currentSeq = [uniqueRanks[i]];
          }
        }
        if (currentSeq.length >= 3) {
          if (currentSeq.length >= 5) {
            combos.push({ type: "quint", suit: suit, bonus: 100, highestCardRank: currentSeq[currentSeq.length - 1], isChecked: true });
          } else if (currentSeq.length === 4) {
            combos.push({ type: "quarte", suit: suit, bonus: 50, highestCardRank: currentSeq[currentSeq.length - 1], isChecked: true });
          } else if (currentSeq.length === 3) {
            combos.push({ type: "tierce", suit: suit, bonus: 20, highestCardRank: currentSeq[currentSeq.length - 1], isChecked: true });
          }
        }
      }
    });
    // SQUARE detection.
    let rankCounts = {};
    player.hand.forEach(c => {
      rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
    });
    ["10", "Q", "K", "A"].forEach(rank => {
      if (rankCounts[rank] === 4) {
        combos.push({ type: "square_standard", bonus: 100, rank: rank, isChecked: true });
      }
    });
    if (rankCounts["9"] === 4) {
      combos.push({ type: "square_nines", bonus: 150, rank: "9", isChecked: true });
    }
    if (rankCounts["J"] === 4) {
      combos.push({ type: "square_jacks", bonus: 200, rank: "J", isChecked: true });
    }
    return combos;
  }

  // NEW: Compute the final combination for each team once all players have detected their combinations.
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
