module.exports = class Player {
    constructor(id) {
        this.id = id;
        this.isDealer = false;
        this.handCards = [];
        this.teamIndex = -1;
    }
}