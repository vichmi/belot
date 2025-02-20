// src/components/Game.jsx
import React, { useEffect, useState } from 'react';
import { socket } from '../lib/socket';
import Announcements from './Announcements';
import CombinationsAnnounce from './CombinationsAnnounce';
import RoundScore from '../components/RoundScore';
import ScoreTable from '../components/ScoreTable';
import TableComponent from '../components/TableComponent';
import SplitCardsComponents from '../components/SplitCardsComponents';
import PlayerComponent from '../components/PlayerComponent';
import useGameSocket from '../hooks/useGameSocket';


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

  useGameSocket({setRoom, setPlayers, sortCards, player, setCards, setTableCards, setShowAnnouncements, reorderPlayers, setCombinations, setShowCombinationBox, setShowRoundScore, setRoundPoints, setCollectTrick, setFirstPlacedCard, setISplit});

  return (
    <div className="Game">
      {/* Other Players Display */}
      {players.length === 4 ?
        players.map((p, index) => 
          <PlayerComponent key={index} index={index} player={p} cards={cards} room={room} firstPlacedCard={firstPlacedCard} collectTrick={collectTrick} userIndex={userIndex} />
        )
      : ''}

      {/* Playing Sector */}
      <div className="playing-sector box">
        {iSplit && (
          <SplitCardsComponents setISplit={setISplit} />
        )}

        {room.turnIndex === userIndex && showAnnouncements && (
          <Announcements room={room} player={player} />
        )}
        <TableComponent room={room} collectTrick={collectTrick} tableCards={tableCards} players={players} setTableCards={setTableCards} setCollectTrick={setCollectTrick} />
        {combinations.length > 0 && showCombinationBox ? <CombinationsAnnounce combinations={combinations} setShowCombinationBox={setShowCombinationBox} /> : <></>}
      </div>

      <ScoreTable player={player} room={room} />

      {showRoundScore ? <RoundScore player={player} roundPoints={roundPoints} /> : ''}
    </div>
  );
}
