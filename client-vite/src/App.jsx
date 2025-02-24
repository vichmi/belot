import { useEffect, useState } from "react";
import Game from "./pages/Game";
import Lobby from "./pages/Lobby";
import { SocketProvider, useSocket } from "./contexts/SocketContext";
import LandingPage from "./pages/LandingPage"
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";;
import './App.css';

function AppContent() {
  const { socket } = useSocket();
  const [rooms, setRooms] = useState([]);
  const [room, setRoom] = useState({});
  const [player, setPlayer] = useState({});

  useEffect(() => {
    if (!socket) return;

    socket.on('init', ({ rooms }) => {
      setRooms(rooms);
    });

    socket.on('userJoined', ({ room, player }) => {
      setRoom(room);
      setPlayer(player);
    });

    socket.on('error', err => {
      console.error(err.message);
    });

    return () => {
      socket.off('connect');
      // Clean up other events if needed
    };
  }, [socket]);

  return room.id === undefined ? <Lobby rooms={rooms} /> : <Game init_room={room} player={player} />;
  // return <LandingPage />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/lobby" element={<SocketProvider><AppContent /></SocketProvider>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
