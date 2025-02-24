import React, { useEffect } from 'react'
import { useSocket } from '../contexts/SocketContext';
import cardRankOrder  from '../constants/cardRankOder';

export default function PlayerComponent({index, player, room, firstPlacedCard, collectTrick, userIndex, reoderPlayers}) {

  const sortCards = (cardA, cardB) => {
      if (!cardA && !cardB) return 0;
      if (!cardA) return 1;
      if (!cardB) return -1;
      const suitOrder = ['spades', 'hearts', 'diamonds', 'clubs'];
      const suitIndexA = suitOrder.indexOf(cardA.suit);
      const suitIndexB = suitOrder.indexOf(cardB.suit);
      if (suitIndexA !== suitIndexB) {
        return suitIndexA - suitIndexB;
      }
      const DEFAULT_RANK_ORDER = { '7': 1, '8': 2, '9': 3, '10': 4, 'J': 5, 'Q': 6, 'K': 7, 'A': 8 };
      let rankOrder = DEFAULT_RANK_ORDER;
      if(room.gameType == 'suit' && cardA.suit == room.trumpSuit && cardA.suit == cardB.suit) {
        rankOrder = { '7': 1, '8': 2, 'Q': 3, 'K': 4, '10': 5, 'A': 6, '9': 7, 'J': 8 };
      }else if(room.gameType == 'all trumps') {
        rankOrder = { '7': 1, '8': 2, 'Q': 3, 'K': 4, '10': 5, 'A': 6, '9': 7, 'J': 8 };
      }
      return rankOrder[cardA.rank] - rankOrder[cardB.rank];
  };

  const isDealer =
            room &&
            room.dealingPlayerIndex !== undefined &&
            room.players[room.dealingPlayerIndex]?.id === player.id;
  const mainAngleRotate = index == 0 ? 0 : index == 3 ? 90 : index == 2 ? 180 : 270;

  const {socket} = useSocket();
  // When the local player clicks on a card.
  const handleCardClick = (card) => {
    if(collectTrick) {return;}
    if (room.gameStage === 'playing' && room.turnIndex === userIndex) {
      socket.emit('play card', card);
    }
  };
  player.hand = player.hand.sort(sortCards);

  return (
    <div className={`player${index} box`} style={{transform: `${index == 2 || index == 0 ? 'translateX(-50%)' : ''} rotate(${mainAngleRotate}deg)`}} >
        {isDealer && <span><b>D</b></span>}
        <span>{player.id}</span>
        <span style={{fontSize: 32}}>{player.hand.length}</span>
        {room.turnIndex == userIndex && <span><b>Your Turn</b></span>}
      <div
        className="card-container"
        style={{
          position: 'relative',
          width: 'fit-content',
          height: 'fit-content',
          margin: '0 auto'
        }}
      >
      {player.hand.length > 0 && player.hand.map((card, idx) => {
        console.log(player.hand.length)
        const maxAngle = 15; // Maximum rotation for the outer cards
        const mid = (player.hand.length - 1) / 2;
        // Compute rotation: center card is 0° and extremes get ±maxAngle
        let cardAngle =
          player.hand.length === 1 ? 0 : ((idx - mid) / mid) * maxAngle;
        // Horizontal offset for overlapping cards
        const offsetX = (idx - mid) * 20;
        // Vertical offset: the further from center, the more the card is lowered
        const offsetY = Math.abs(idx - mid) * 5;
        // Use z-index so that the center card appears on top
        const zIndex = idx;
        let highlightCard = false;
        if(index == 0 && firstPlacedCard && firstPlacedCard.card.suit == card.suit) {
          highlightCard = true;
          if(room.gameType == 'all trumps' && player.hand.some(c => c.suit == firstPlacedCard.card.suit && cardRankOrder['all trumps'][c.rank] > cardRankOrder['all trumps'][firstPlacedCard.card.rank] && c != card)) {
            highlightCard = false;
          }
        }
        return (
          <img
                  key={idx}
                  className={`${index == 0 ? 'hand' : ''} card ${highlightCard ? 'highlightCard' : ''}`}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 0,
                    transformOrigin: "50% 100%", // Rotate around bottom center
                    transform: `translateX(${offsetX}px) translateY(${offsetY}px) translateX(-50%) rotate(${cardAngle}deg)`,
                    zIndex,
                  }}
                  src={require(`../assets/${index == 0 ? card.rank.toLowerCase() + '_of_' + card.suit.toLowerCase() : 'back'}.png`)}
                  alt={`${card.rank} ${card.suit}`}
                  onClick={() => {
                    if(index != 0) {return;}
                    handleCardClick(card);
                  }}
                  width={60}
                  height={80}
                />
              );
        })}
        <hr style={{border: '2px solid black'}}/>
      </div>
    </div>
  );
}
