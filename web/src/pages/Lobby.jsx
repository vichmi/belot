import React from 'react'
import { useSocket } from '../contexts/SocketContext';


export default function Lobby({rooms}) {
    const {socket} = useSocket();
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