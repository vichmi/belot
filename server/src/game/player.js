// server/game/player.js
module.exports = class Player {
    constructor(id) {
      this.id = id;
      this.team = null;
      this.hand = [];
      this.hasAnnouncedCombination = false;
    }
  };
  