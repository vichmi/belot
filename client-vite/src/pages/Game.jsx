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
import { useSocket } from '../contexts/SocketContext';


export default function Game() {
  // const {state} = useLocation();
  const {socket} = useSocket();
  const [player, setPlayer] = useState({});
  const [room, setRoom] = useState({});
  const [players, setPlayers] = useState([]);
  const [cards, setCards] = useState([]);
  const [userIndex, setUserIndex] = useState(-1);
  const [tableCards, setTableCards] = useState([]);
  const [iSplit, setISplit] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [firstPlacedCard, setFirstPlacedCard] = useState();
  const [combinations, setCombinations] = useState([]);
  const [showCombinationBox, setShowCombinationBox] = useState(false);
  const [showRoundScore, setShowRoundScore] = useState(false);
  const [roundPoints, setRoundPoints] = useState({NS: 0, EW: 0});
  const [collectTrick, setCollectTrick] = useState(false);

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
    if(!socket) {return;}
    socket.emit('joinRoom', {roomName: window.location.href.match(/\/game\/(.*)/)[1]});
  }, [socket]);

  useGameSocket({setRoom, setPlayers, userIndex, setUserIndex, player, setPlayer, setCards, setTableCards, setShowAnnouncements, reorderPlayers, setCombinations, setShowCombinationBox, setShowRoundScore, setRoundPoints, setCollectTrick, setFirstPlacedCard, setISplit});
  return Object.keys(room).length == 0 ? <span>Loading</span> : (
    <div className="Game">
      { players.length === 4 ?
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
    // <div>game</div>
  );
}
