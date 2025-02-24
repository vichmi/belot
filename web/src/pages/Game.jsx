// src/components/Game.jsx
import React, { useEffect, useState } from 'react';
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

  useGameSocket({setRoom, setPlayers, player, setCards, setTableCards, setShowAnnouncements, reorderPlayers, setCombinations, setShowCombinationBox, setShowRoundScore, setRoundPoints, setCollectTrick, setFirstPlacedCard, setISplit});

  return (
    <div className="Game">
      {players.length === 4 ?
        players.map((p, index) => 
          <PlayerComponent key={index} index={index} player={p} reorderPlayers={reorderPlayers} room={room} firstPlacedCard={firstPlacedCard} collectTrick={collectTrick} userIndex={userIndex} />
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
