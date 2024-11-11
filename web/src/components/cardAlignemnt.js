
const _cards = [
    {name: '7', noTrumps: 0, allTrumps: 0},
    {name: '8', noTrumps: 0, allTrumps: 0},
    {name: '9', noTrumps: 0, allTrumps: 14},
    {name: '10', noTrumps: 10, allTrumps: 10},
    {name: 'J', noTrumps: 2, allTrumps: 20},
    {name: 'Q', noTrumps: 3, allTrumps: 3},
    {name: 'K', noTrumps: 4, allTrumps: 4},
    {name: 'A', noTrumps: 11, allTrumps: 11},
];
const _colors = ['clubs', 'diamonds', 'hearts', 'spades'];

function sortByColor(cardA, cardB) {
    const colorIndexA = _colors.indexOf(cardA);
    const colorIndexB = _colors.indexOf(cardB);
    return colorIndexA - colorIndexB;
}


export default function cardAlignment(gameType, currentCards) {
    let playerCards = currentCards.sort(sortByColor);
    console.log(playerCards);
}