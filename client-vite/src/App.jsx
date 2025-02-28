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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PrivateRoute><Home /> </PrivateRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/lobby" element={<PrivateRoute><Lobby /></PrivateRoute>} />
          <Route path="/game/:id" element={<PrivateRoute><SocketProvider><Game /></SocketProvider></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
