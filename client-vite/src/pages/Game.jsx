// src/components/Game.jsx
import React, { useEffect, useState } from 'react';
import Announcements from '../components/Announcements';
import CombinationsAnnounce from '../components/CombinationsAnnounce';
import RoundScore from '../components/RoundScore';
import ScoreTable from '../components/ScoreTable';
import TableComponent from '../components/TableComponent';
import SplitCardsComponents from '../components/SplitCardsComponents';
import PlayerComponent from '../components/PlayerComponent';
import useGameSocket from '../hooks/useGameSocket';
import '../Game.css'
import { useLocation } from 'react-router';


export default function Game() {
  const {state} = useLocation();
  const {init_room, player} = state;
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
  const [combinations, setCombinations] = useState([{ type: "tierce", suit: 'spades', bonus: 20, highestCardRank: "A", isChecked: true }]);
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
        {room.players.length < 4 && <h2 className='z-1'>Waiting for players {room.players.length}/4</h2>}
      </div>
      {combinations.length > 0 && showCombinationBox && <CombinationsAnnounce combinations={combinations} setCombinations={setCombinations} setShowCombinationBox={setShowCombinationBox} />}
      <ScoreTable player={player} room={room} />

      {showRoundScore ? <RoundScore player={player} roundPoints={roundPoints} /> : ''}
    </div>
  );
}
