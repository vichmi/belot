// announcements.js
function makeAnnouncement(room, playerId, announcement, io) { // ✅ room param!
  const validOrder = ["clubs", "diamonds", "hearts", "spades", "no trumps", "all trumps"];
  const player = room.players.find(p => p.id === playerId);
  if (!player) return;

  if (announcement !== "pass") {
    const lastNonPass = room.announcements.filter(a => a !== "pass").slice(-1)[0];
    if (lastNonPass && validOrder.indexOf(announcement) <= validOrder.indexOf(lastNonPass)) {
      io.to(player.id).emit('error', { message: 'Cannot call this suit' });
      return;
    }
    if (["clubs", "diamonds", "hearts", "spades"].includes(announcement)) {
      room.trumpSuit = announcement;
      room.gameType = "suit";
    } else if (announcement === "no trumps") {
      room.trumpSuit = null;
      room.gameType = "no trumps";
    } else if (announcement === "all trumps") {
      room.trumpSuit = null;
      room.gameType = "all trumps";
    }
    room.callingTeam = player.team;
  } else {
    // If a pass is given and three passes already exist, let the caller handle round reset.
    if (room.announcements.length === 3 && room.announcements.every(a => a === "pass")) {
      // Caller (or room.js) should call nextRound() in this case.
      return;
    }
  }
  room.gameStage = 'announcing';
  room.announcements.push(announcement);
  // Advance turn (here using clockwise order; adjust as needed)
  room.turnIndex = (room.turnIndex + 1) % 4;

  // Termination conditions:
  if (room.announcements.length === 4 && room.announcements.every(a => a === "pass")) {
    room.deck = require('./deck').createDeck();
    io.to(room.id).emit("roundRestarted", { room });
    return;
  }
  if (room.gameType === "all trumps") {
    // Caller should then call dealRestCards() externally.
    return;
  }
  const lastNonPassIndex = room.announcements
    .map((a, i) => a !== "pass" ? i : -1)
    .filter(i => i !== -1)
    .pop();
  let consecutivePasses = 0;
  for (let i = room.announcements.length - 1; i > lastNonPassIndex; i--) {
    if (room.announcements[i] === "pass") consecutivePasses++;
    else break;
  }
  if (lastNonPassIndex !== undefined && consecutivePasses >= 3) {
    // Caller should then call dealRestCards() externally.
    return;
  }
  io.to(room.id).emit("announcementMade", { room, lastAnnouncement: announcement });
}

module.exports = { makeAnnouncement };
