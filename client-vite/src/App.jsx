import { useEffect, useState } from "react";
import Game from "./pages/Game";
import Lobby from "./pages/Lobby";
import { SocketProvider, useSocket } from "./contexts/SocketContext";
import Login from "./pages/Login"
import Register from "./pages/Register"
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";;
import Home from "./pages/Home";
import { AuthProvider } from "./contexts/AuthContext";
import PublicRoute from "./pages/PublicRoute";
import PrivateRoute from "./pages/PrivateRoute";

// function AppContent() {
//   const { socket } = useSocket();
//   const [rooms, setRooms] = useState([]);
//   const [room, setRoom] = useState({});
//   const [player, setPlayer] = useState({});

//   useEffect(() => {
//     if (!socket) return;

//     socket.on('init', ({ rooms }) => {
//       setRooms(rooms);
//     });

//     socket.on('userJoined', ({ room, player }) => {
//       setRoom(room);
//       setPlayer(player);
//     });

//     socket.on('error', err => {
//       console.error(err.message);
//     });

//     return () => {
//       socket.off('connect');
//       // Clean up other events if needed
//     };
//   }, [socket]);

//   return room.id === undefined ? <Lobby rooms={rooms} /> : <Game init_room={room} player={player} />;
//   // return <LandingPage />;
// }

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PrivateRoute><Home /> </PrivateRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/lobby" element={<PrivateRoute><SocketProvider><Lobby /></SocketProvider></PrivateRoute>} />
          <Route path="/game" element={<PrivateRoute><SocketProvider><Game /></SocketProvider></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
