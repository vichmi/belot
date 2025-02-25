import React, { useState, useEffect } from 'react'
import { useSocket } from '../contexts/SocketContext';
import { useNavigate } from 'react-router';

export default function Lobby() {
    const {socket} = useSocket();
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);

    useEffect(() => {
        if(!socket) return;
        socket.on('get rooms', ({rooms}) => {
            setRooms(rooms);
        });
        socket.on('userJoined', ({ room, player }) => {
            navigate('/game', {state: {init_room: room, player}});
        });

        return () => {
            socket.off('connect');
            socket.off('get rooms');
            socket.off('userJoined');
        }
    }, [socket, navigate]);

    const joinRoom = r => {
        socket.emit('join room', r);
    }
  return (
    <div className='Lobby'>
        <h1>Lobby</h1>
        <span>Active Game Rooms:</span>
        <table className='rooms-table'>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Players</th>
                    <th>Join</th>
                </tr>
            </thead>
            <tbody>
                {rooms.map((r, index) => {
                    return (
                        <tr key={index}>
                            <td>{r.name}</td>
                            <td>{r.players.length}/4</td>
                            <td>
                                <button onClick={() => {joinRoom(r)}}>JOIN</button>
                            </td>
                        </tr>
                    )
                })}
            </tbody>
        </table>
    </div>
  )
}