// src/components/Game.jsx
import React, { useEffect, useState } from 'react';
import { socket } from '../lib/socket';
import Announcements from './Announcements';
import CombinationsAnnounce from './CombinationsAnnounce';

// Create an array of placeholders for unknown card images.
const unknownCards = Array.from({ length: 32 }, (_, i) => i);

export default function Game({ init_room, player }) {
  const [room, setRoom] = useState(init_room);
  const [players, setPlayers] = useState(init_room.players || []);
  const [cards, setCards] = useState([]);
  const [userIndex, setUserIndex] = useState(
    init_room.players ? init_room.players.findIndex(p => p.id === player.id) : 0
  );
  const [tableCards, setTableCards] = useState([]);
  const [iSplit, setISplit] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [firstPlacedCard, setFirstPlacedCard] = useState();
  const [combinations, setCombinations] = useState([]);
  const [showCombinationBox, setShowCombinationBox] = useState(false);
  const [showRoundScore, setShowRoundScore] = useState(false);
  const [roundPoints, setRoundPoints] = useState({NS: 0, EW: 0});
  const [collectTrick, setCollectTrick] = useState(false);

  // Helper: Sort cards by suit then by rank.
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
    const rankOrder = { '7': 1, '8': 2, '9': 3, '10': 4, 'J': 5, 'Q': 6, 'K': 7, 'A': 8 };
    return rankOrder[cardA.rank] - rankOrder[cardB.rank];
  };

  // Reorder players so that the local player is first.
  const reorderPlayers = (r) => {
    const idx = r.players.findIndex(p => p.id === player.id);
    if (idx < 0) return;
    const reordered = [];
    for (let i = 0; i < r.players.length; i++) {
      reordered.push(r.players[(idx + i) % r.players.length]);
    }
    setPlayers(reordered);
  };

  useEffect(() => {
    if (room && room.players) {
      setUserIndex(room.players.findIndex(p => p.id === player.id));
    }

    socket.on('playerJoined', (data) => {
      const r = data.room;
      setRoom(r);
      if (r.players.length === 4) {
        reorderPlayers(r);
      }
    });

    socket.on('splitting', (data) => {
      const r = data.room;
      setShowAnnouncements(false);
      setRoom(r);
      setCards([]);
      if (r.dealingPlayerIndex !== undefined && r.players[r.dealingPlayerIndex]?.id === player.id) {
        setISplit(true);
      } else {
        setISplit(false);
      }
    });

    socket.on('initialCardsDealt', (data) => {
      const r = data.room;
      reorderPlayers(r);
      setRoom(r);
      const myPlayer = r.players.find(p => p.id === player.id);
      if (myPlayer && myPlayer.hand) {
        // console.log()
        setCards(myPlayer.hand.filter(card => card != null).sort(sortCards));
      }
      setShowAnnouncements(true);
    });

    socket.on('restCardsDealt', (data) => {
      const r = data.room;
      reorderPlayers(r);
      setRoom(r);
      setShowAnnouncements(false);
      const myPlayer = r.players.find(p => p.id === player.id);
      if (myPlayer && myPlayer.hand) {
        setCards(myPlayer.hand.filter(card => card != null).sort(sortCards));
      }
    });

    socket.on('announcementMade', (data) => {
      setRoom(data.room);
    });

    socket.on('cardPlayed', (data) => {
      const r = data.room;
      setRoom(r);
      console.log(r);
      setTableCards(data.playedCards);
      reorderPlayers(r);
      setFirstPlacedCard(data.playedCards[0]);
      console.log(data.playedCards[0].card);
      const myPlayer = r.players.find(p => p.id === player.id);
      if (myPlayer && myPlayer.hand) {
        setCards(myPlayer.hand.filter(card => card != null).sort(sortCards));
      }
    });

    socket.on('trickCompleted', (data) => {
      setRoom(data.room);
      setCollectTrick(true);
      const myPlayer = data.room.players.find(p => p.id === player.id);
      if (myPlayer && myPlayer.hand) {
        setCards(myPlayer.hand.filter(card => card != null).sort(sortCards));
      }
      setFirstPlacedCard();
    });

    socket.on('roundEnded', (data) => {
      setRoom(data.room);
      setShowRoundScore(true);
      setRoundPoints(
        {NS: {
        trickPoints: data.trickPoints.NS,
        comboBonus: data.comboBonus.NS,
        totalPoints: data.totalPoints.NS
        },
        EW: {
          trickPoints: data.trickPoints.EW,
          comboBonus: data.comboBonus.EW,
          totalPoints: data.totalPoints.EW
        }
      })
      setTimeout(() => {
        setRoundPoints({});
        setShowRoundScore(false);
      }, 2500);
    });

    socket.on('roundRestarted', (data) => {
      setRoom(data.room);
    });

    socket.on('playerDisconnected', (data) => {
      setRoom(data.room);
      setPlayers(data.room.players);
    });

    socket.on('error', (data) => {
      console.log("Socket error:", data.message);
    });

    socket.on('combinationDetected', data => {
      if(data.playerId != player.id) {return;}
      setCombinations(data.combination);
      setShowCombinationBox(true);
    })

    socket.on('announceBelot', data => {
      if(data.playerId != player.id) {return;}
      setCombinations(data.combination);
      setShowCombinationBox(true);
    });

    return () => {
      socket.off('playerJoined');
      socket.off('splitting');
      socket.off('initialCardsDealt');
      socket.off('restCardsDealt');
      socket.off('announcementMade');
      socket.off('cardPlayed');
      socket.off('trickCompleted');
      socket.off('roundEnded');
      socket.off('roundRestarted');
      socket.off('playerDisconnected');
      socket.off('error');
    };
  }, [room, player.id]);

  // When the local player clicks on a card.
  const handleCardClick = (card) => {
    if(collectTrick) {return;}
    console.log("Playing card:", card);
    console.log('Room:', room)
    if (room.gameStage === 'playing' && room.turnIndex === userIndex) {
      socket.emit('play card', card);
    }
  };

  // Determine if the local player is the dealer.
  const isLocalDealer =
    room &&
    room.dealingPlayerIndex !== undefined &&
    room.players[room.dealingPlayerIndex] &&
    room.players[room.dealingPlayerIndex].id === player.id;

  return (
    <div className="Game">
      {/* Main Player Display */}
      <div className="main-player box">
        {isLocalDealer && <span><b>D</b></span>}
        {room.turnIndex === userIndex && <span><b>Your turn</b></span>}
        <span>{player.id}</span>
        {cards && cards.length > 0 && (
          <div
          className="card-container"
          style={{
            position: 'relative',
            width: 'fit-content',
            height: 'fit-content',
            margin: '0 auto',
          }}
        >
          {cards.map((card, idx) => {
            const maxAngle = 15; // Maximum rotation for the outer cards
            const mid = (cards.length - 1) / 2;
            // Compute rotation: center card is 0° and extremes get ±maxAngle
            const cardAngle =
              cards.length === 1 ? 0 : ((idx - mid) / mid) * maxAngle;
            // Horizontal offset for overlapping cards
            const offsetX = (idx - mid) * 20;
            // Vertical offset: the further from center, the more the card is lowered
            const offsetY = Math.abs(idx - mid) * 5;
            // Use z-index so that the center card appears on top
            const zIndex = idx;
        
            return (
              <img
                key={idx}
                className={`card ${firstPlacedCard && card.suit === firstPlacedCard.card.suit ? 'highlightCard' : ''} hand`}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  transformOrigin: "50% 100%", // Rotate around bottom center
                  transform: `translateX(${offsetX}px) translateY(${offsetY}px) translateX(-50%) rotate(${cardAngle}deg)`,
                  zIndex,
                }}
                onClick={() => handleCardClick(card)}
                src={require(`../assets/${card.rank.toLowerCase()}_of_${card.suit.toLowerCase()}.png`)}
                alt={`${card.rank} ${card.suit}`}
                width={60}
                height={80}
              />
            );
          })}
        </div>
        
        )}
      </div>

      {/* Other Players Display */}
      {players.length === 4 &&
        players.map((p, index) => {
          const isDealer =
            room &&
            room.dealingPlayerIndex !== undefined &&
            room.players[room.dealingPlayerIndex]?.id === p.id;
          const mainAngleRotate = index == 3 ? 90 : index == 2 ? 180 : 270;
          if (index === 0) return null;
          return (
            <div key={index} className={`player${index} box`} style={{transform: `${index == 2 ? 'translateX(-50%)' : ''} rotate(${mainAngleRotate}deg)`}} >
                {isDealer && <span><b>D</b></span>}
                <span>{p.id}</span>
                <span style={{fontSize: 32}}>{p.hand.length}</span>
              <div
                className="card-container"
                style={{
                  position: 'relative',
                  width: 'fit-content',
                  height: 'fit-content',
                  margin: '0 auto'
                }}
              >
          {p.hand.map((card, idx) => {
            const maxAngle = 15; // Maximum rotation for the outer cards
            const mid = (cards.length - 1) / 2;
            // Compute rotation: center card is 0° and extremes get ±maxAngle
            let cardAngle =
              cards.length === 1 ? 0 : ((idx - mid) / mid) * maxAngle;
            // Horizontal offset for overlapping cards
            const offsetX = (idx - mid) * 20;
            // Vertical offset: the further from center, the more the card is lowered
            const offsetY = Math.abs(idx - mid) * 5;
            // Use z-index so that the center card appears on top
            const zIndex = idx;
        
            return (
              <img
                key={idx}
                      className={`hand`}
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: 0,
                        transformOrigin: "50% 100%", // Rotate around bottom center
                        transform: `translateX(${offsetX}px) translateY(${offsetY}px) translateX(-50%) rotate(${cardAngle}deg)`,
                        zIndex,
                      }}
                      src={require(`../assets/back.png`)}
                      alt={`${card.rank} ${card.suit}`}
                      width={60}
                      height={80}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

      {/* Playing Sector */}
      <div className="playing-sector box">
        {iSplit && (
          <div className="splitCards">
            {unknownCards.map((_, idx) => (
              <img
                key={idx}
                className="card"
                src={require('../assets/back.png')}
                alt="unknown card"
                width={60}
                height={80}
                onClick={() => {
                  socket.emit('splitted card', idx);
                  setISplit(false);
                }}
              />
            ))}
          </div>
        )}

        {/* Optionally display team scores when gameStage is "score" */}
        {room.gameStage === 'score' && room.teams && (
          <div className="score">
            {room.teams.map((t, idx) => (
              <p key={idx}>Team {idx} has {t.gameScore}</p>
            ))}
          </div>
        )}

        {/* Display bidding announcements if it's the local player's turn */}
        {room.turnIndex === userIndex && showAnnouncements && (
          <Announcements room={room} player={player} />
        )}


        {/* Display cards played on the table */}
          <div className="table-container">
          {tableCards && tableCards.length > 0 ?
              tableCards.map((play, idx) => {
                const pos = players.findIndex(p => p.id === play.playerId);
                const trWinner = players.findIndex(p => p.id == room.players[room.turnIndex].id);
                const sides = ['bottom', 'right', 'top', 'left'];
                const winnerClass = collectTrick
                  ? `collect-${sides[trWinner]}` // e.g. "collect-top", "collect-left", etc.
                  : '';
                  console.log(winnerClass)
                return (
                  <img
                    key={idx}
                    className={`card-placement${pos} table-card ${winnerClass}`}
                    src={require(`../assets/${play.card.rank.toLowerCase()}_of_${play.card.suit.toLowerCase()}.png`)}
                    alt={`${play.card.rank} ${play.card.suit}`}
                    width={60}
                    height={80}
                    onAnimationEnd={() => {
                      setTableCards([]);
                      setCollectTrick(false);
                      setTableCards(room.playedCards);
                    }}
                  />
                );
              }) : <></>
          }
        </div>

        
        {combinations.length > 0 && showCombinationBox ? <CombinationsAnnounce combinations={combinations} setShowCombinationBox={setShowCombinationBox} /> : <></>}
      </div>

      <div className='score-container'>
          <table>
            <tr>
              <th>Us</th>
              <th>Others</th>
            </tr>
            <tr>
              <td>{room.scores[player.team]}</td>
              <td>{room.scores[player.team == 'NS' ? 'EW' : 'NS']}</td>
            </tr>
          </table>
      </div>

      {showRoundScore ? <div className='round-score-container'>
          <table>

            <tr>
              <th></th>
              <th>Us</th>
              <th>Others</th>
            </tr>

            <tr>
              <td>Hands:</td>
              <td>{roundPoints[player.team].trickPoints}</td>
              <td>{roundPoints[player.team == 'NS' ? 'EW' : 'NS'].trickPoints}</td>
            </tr>

            <tr>
              <td>Announcements:</td>
              <td>{roundPoints[player.team].comboBonus}</td>
              <td>{roundPoints[player.team == 'NS' ? 'EW' : 'NS'].comboBonus}</td>
            </tr>

            <tr>
              <td>Total:</td>
              <td>{roundPoints[player.team].totalPoints}</td>
              <td>{roundPoints[player.team == 'NS' ? 'EW' : 'NS'].totalPoints}</td>
            </tr>

          </table>
      </div> : ''}
    </div>
  );
}
