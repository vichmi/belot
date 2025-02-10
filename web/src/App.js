import { useEffect, useState } from "react";
import { socket } from "./lib/socket";
import './App.css'
import Game from "./pages/Game";
import Lobby from "./pages/Lobby";

function App() {

  const [rooms, setRooms] = useState([]);
  const [room, setRoom] = useState({});
  const [player, setPlayer] = useState({});

  useEffect(() => {
    socket.on('init', ({rooms}) => {
      setRooms(rooms);
    });

    socket.on('userJoined', ({room, player}) => {
      setRoom(room);
      setPlayer(player);
    })
    
    socket.on('error', err => {
      console.error(err.message);
    });

    return () => {
      socket.off('connect');
    }
  }, []);

  return room.id === undefined ? <Lobby rooms={rooms} /> : <Game init_room={room} player={player} />
}

export default App;
