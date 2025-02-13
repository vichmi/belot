// combinations.js

// Detect a belot combination in a player's hand.
function detectBelot(room, player) { // ✅
  let combos = [];
  if (room.gameType !== "no trumps") {
    if (room.gameType === "suit") {
      if (
        player.hand.some(c => c.suit === room.trumpSuit && c.rank === "K") &&
        player.hand.some(c => c.suit === room.trumpSuit && c.rank === "Q")
      ) {
        combos.push({ type: "belot", suit: room.trumpSuit, bonus: 20 });
      }
    } else if (room.gameType === "all trumps") {
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
  return combos;
}

// Detect sequences and squares in a player's hand.
function detectCombinations(room, player) { // ✅ before that check if game type is no trumps 
  let combos = []; 
  const rankOrder = ["7", "8", "9", "10", "J", "Q", "K", "A"];
  // Sequences: for each suit.
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
              combos.push({ type: "quint", suit, bonus: 100, highestCardRank: currentSeq[currentSeq.length - 1], startCard: currentSeq[0], isChecked: true });
            } else if (currentSeq.length === 4) {
              combos.push({ type: "quarte", suit, bonus: 50, highestCardRank: currentSeq[currentSeq.length - 1], startCard: currentSeq[0], isChecked: true });
            } else if (currentSeq.length === 3) {
              combos.push({ type: "tierce", suit, bonus: 20, highestCardRank: currentSeq[currentSeq.length - 1], startCard: currentSeq[0], isChecked: true });
            }
          }
          currentSeq = [uniqueRanks[i]];
        }
      }
      if (currentSeq.length >= 3) {
        if (currentSeq.length >= 5) {
          combos.push({ type: "quint", suit, bonus: 100, highestCardRank: currentSeq[currentSeq.length - 1], startCard: currentSeq[0], isChecked: true });
        } else if (currentSeq.length === 4) {
          combos.push({ type: "quarte", suit, bonus: 50, highestCardRank: currentSeq[currentSeq.length - 1], startCard: currentSeq[0], isChecked: true });
        } else if (currentSeq.length === 3) {
          combos.push({ type: "tierce", suit, bonus: 20, highestCardRank: currentSeq[currentSeq.length - 1], startCard: currentSeq[0], isChecked: true });
        }
      }
    }
  });
  // Squares:
  let rankCounts = {};
  player.hand.forEach(c => {
    rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
  });
  ["10", "Q", "K", "A"].forEach(rank => {
    if (rankCounts[rank] === 4) {
      combos.push({ type: "square_standard", bonus: 100, rank, isChecked: true });
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

// Combines belot and other combinations.
function detectCombinationForPlayer(room, player) {
  let combos = [];
  combos = combos.concat(detectBelot(room, player));
  combos = combos.concat(detectCombinations(room, player));
  return combos;
}

function announceCombination(playerId, combination, io) {
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


// Calculate combination bonuses according to the rules.
// For sequences: compare best sequence of team NS vs EW, only the best wins.
// For squares: compare best square (with trump preference in suit game).
function calculateCombinationBonuses(room) {
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
  const rankOrder = { '7': 1, '8': 2, '9': 3, '10': 4, 'J': 5, 'Q': 6, 'K': 7, 'A': 8 };

  // Belot bonus.
  ['NS', 'EW'].forEach(team => {
    const belots = room.combinationAnnouncements[team].filter(c => c.type === 'belot');
    if (belots.length > 0) bonus[team] += 20;
  });

  // Sequences: determine best sequence per team.
  const sequenceTypes = ['tierce', 'quarte', 'quint'];
  const bestSeq = { NS: null, EW: null };
  ['NS', 'EW'].forEach(team => {
    const seqs = room.combinationAnnouncements[team].filter(c => sequenceTypes.includes(c.type));
    if (seqs.length > 0) {
      bestSeq[team] = seqs.reduce((best, current) => {
        const currentBonus = getSequenceBonus(current.type);
        const bestBonus = best ? getSequenceBonus(best.type) : 0;
        if (currentBonus > bestBonus) return current;
        else if (currentBonus === bestBonus) {
          // Use the starting card of the sequence as tie-breaker.
          if (current.startCard && best.startCard && rankOrder[current.startCard] > rankOrder[best.startCard]) {
            return current;
          }
        }
        return best;
      }, null);
    }
  });
  if (bestSeq.NS && bestSeq.EW) {
    const nsBonus = getSequenceBonus(bestSeq.NS.type);
    const ewBonus = getSequenceBonus(bestSeq.EW.type);
    if (nsBonus > ewBonus) {
      bonus.NS += nsBonus;
    } else if (ewBonus > nsBonus) {
      bonus.EW += ewBonus;
    } else {
      // Equal bonus values, compare starting cards.
      if (bestSeq.NS.startCard && bestSeq.EW.startCard) {
        if (rankOrder[bestSeq.NS.startCard] > rankOrder[bestSeq.EW.startCard]) bonus.NS += nsBonus;
        else if (rankOrder[bestSeq.EW.startCard] > rankOrder[bestSeq.NS.startCard]) bonus.EW += ewBonus;
      }
    }
  } else if (bestSeq.NS) {
    bonus.NS += getSequenceBonus(bestSeq.NS.type);
  } else if (bestSeq.EW) {
    bonus.EW += getSequenceBonus(bestSeq.EW.type);
  }

  // Squares: determine best square per team.
  const squareTypes = ['square_standard', 'square_nines', 'square_jacks'];
  const bestSquare = { NS: null, EW: null };
  ['NS', 'EW'].forEach(team => {
    const squares = room.combinationAnnouncements[team].filter(c => squareTypes.includes(c.type));
    if (squares.length > 0) {
      bestSquare[team] = squares.reduce((best, current) => {
        const currentBonus = getSquareBonus(current.type);
        const bestBonus = best ? getSquareBonus(best.type) : 0;
        // In a suit game, prefer square announced in trump suit.
        if (room.gameType === 'suit') {
          const currentIsTrump = current.suit === room.trumpSuit;
          const bestIsTrump = best ? best.suit === room.trumpSuit : false;
          if (currentIsTrump && !bestIsTrump) return current;
          if (!currentIsTrump && bestIsTrump) return best;
        }
        if (currentBonus > bestBonus) return current;
        return best;
      }, null);
    }
  });
  if (bestSquare.NS && bestSquare.EW) {
    const nsSqBonus = getSquareBonus(bestSquare.NS.type);
    const ewSqBonus = getSquareBonus(bestSquare.EW.type);
    if (room.gameType === 'suit') {
      const nsIsTrump = bestSquare.NS.suit === room.trumpSuit;
      const ewIsTrump = bestSquare.EW.suit === room.trumpSuit;
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

// Compute final combination per team based on players’ detected combinations.
function computeFinalCombinations(room, io) {
  let finalCombos = { NS: null, EW: null };
  const rankOrder = { "7": 1, "8": 2, "9": 3, "10": 4, "J": 5, "Q": 6, "K": 7, "A": 8 };
  ["NS", "EW"].forEach(team => {
    let teamCombos = [];
    room.players.forEach(p => {
      if (p.team === team && p.detectedCombination !== undefined) {
        teamCombos = teamCombos.concat(p.detectedCombination);
      }
    });
    if (teamCombos.length === 0) return;
    // For sequences, sort by bonus then by starting card.
    teamCombos.sort((a, b) => {
      if (b.bonus !== a.bonus) return b.bonus - a.bonus;
      if (["tierce", "quarte", "quint"].includes(a.type)) {
        return (rankOrder[b.startCard] || 0) - (rankOrder[a.startCard] || 0);
      }
      return 0;
    });
    finalCombos[team] = teamCombos[0];
  });
  room.finalCombination = finalCombos;
  io.to(room.id).emit("finalCombination", { finalCombination: room.finalCombination });
}

module.exports = {
  announceCombination,
  detectBelot,
  detectCombinations,
  detectCombinationForPlayer,
  calculateCombinationBonuses,
  computeFinalCombinations
};
