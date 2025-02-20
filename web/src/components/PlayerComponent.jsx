import React from 'react'
import { useSocket } from '../contexts/SocketContext';


export default function PlayerComponent({index, player, cards, room, firstPlacedCard, collectTrick, userIndex}) {
  const isDealer =
            room &&
            room.dealingPlayerIndex !== undefined &&
            room.players[room.dealingPlayerIndex]?.id === player.id;
  const mainAngleRotate = index == 0 ? 0 : index == 3 ? 90 : index == 2 ? 180 : 270;

  const {socket} = useSocket();
  // When the local player clicks on a card.
  const handleCardClick = (card) => {
    if(collectTrick) {return;}
    console.log("Playing card:", card);
    console.log('Room:', room)
    if (room.gameStage === 'playing' && room.turnIndex === userIndex) {
      socket.emit('play card', card);
    }
  };

  return (
    <div className={`player${index} box`} style={{transform: `${index == 2 || index == 0 ? 'translateX(-50%)' : ''} rotate(${mainAngleRotate}deg)`}} >
        {isDealer && <span><b>D</b></span>}
        <span>{player.id}</span>
        <span style={{fontSize: 32}}>{player.hand.length}</span>
      <div
        className="card-container"
        style={{
          position: 'relative',
          width: 'fit-content',
          height: 'fit-content',
          margin: '0 auto'
        }}
      >
      {player.hand.map((card, idx) => {
        console.log(card);
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

        return (
          <img
                  key={idx}
                  className={`hand card ${index == 0 && firstPlacedCard && card.suit == firstPlacedCard.suit ? 'highlightCard' : ''}`}
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
      </div>
    </div>
  );
}
