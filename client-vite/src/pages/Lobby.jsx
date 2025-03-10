import React, { useState, useEffect } from 'react'
import { useSocket } from '../contexts/SocketContext';
import { useNavigate } from 'react-router';
import axios from '../libs/axios';

export default function Lobby() {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const [roomName, setRoomName] = useState('');
    const [roomPassword, setRoomPassword] = useState('');
    const [sortNames, setSortNames] = useState(null);
    const [sortPlayers, setSortPlayers] = useState(null);

    const getRooms = () => {
        axios.get('/game/rooms')
        .then(({data}) => {
            setRooms(data.rooms);
        })
        .catch(err => {
            console.log(err);
        });
    }

    useEffect(() => {
        getRooms();
    }, []);

    const joinRoom = (room, password) => {
        axios.post('/game/joinRoom', {roomName: room.name, password})
        .then(({data}) => {
            navigate(`/game/${room.name}`);
        })
        .catch(err => {
            console.log(err);
        });
    }

    const createRoom = e => {
        axios.post('/game/createRoom', {name: roomName, password: roomPassword})
        .then(({data}) => {
            // navigate(`/game/${data.roomId}`);
        })
        .catch(err => {
            console.log(err);
        });
    };


    const sortByRoomName = () => {
        const newRooms = [...rooms];
        const wasNull = sortNames == null;
        setSortNames(!sortNames);
        setSortPlayers(null);
        setRooms(newRooms.sort((a, b) => sortNames == true ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
    };
    const sortByRoomPlayers = () => {
        const newRooms = [...rooms];
        setSortPlayers(!sortPlayers)
        setSortNames(null);
        setRooms(newRooms.sort((a, b) => sortPlayers == true ? a.joinedPlayers - b.joinedPlayers : b.joinedPlayers - a.joinedPlayers));
    };

  return (
    <div className='Lobby text-center'>
        <h1 className='mb-20'>Lobby</h1>
        <table className='table-fixed w-160 border-gray-500 border-1'>
            <colgroup>
                <col className='w-1/4' />
                <col className='w-1/4' />
                <col className='w-1/4' />
                <col className='w-1/4' />
            </colgroup>
            <thead className='text-sx text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400'>
                <tr>
                    <th className='p-3'><button onClick={() => {sortByRoomName()}}>Name {sortNames != null ? sortNames == 0 ? '↑' : '>' : ''}</button></th>
                    <th><button onClick={() => sortByRoomPlayers()}>Players</button></th>
                    <th><button>Password</button></th>
                    <th><button onClick={() => {getRooms();}}>Refresh</button></th>
                </tr>
            </thead>
            <tbody>
                {rooms.map((r, index) => {
                    let roomPassword = '';
                    return (
                        <tr key={index}>
                            <td className='p-3'>{r.name}</td>
                            <td>{r.joinedPlayers}/4</td>
                            <td>{r.requiresPassword ? <input className='bg-gray-900' type='password' name='roomPassword' placeholder='Room password' onChange={e => {roomPassword = e.target.value}} /> : ''}</td>
                            <td>
                                <button className='bg-blue-700' onClick={() => {joinRoom(r, roomPassword)}}>JOIN</button>
                            </td>
                        </tr>
                    )
                })}
            </tbody>

            <tfoot>
                <tr className='bg-gray-700 text-center'>
                    <th colSpan={4}>Create a room</th>
                </tr>
                <tr>
                    <th><input className='bg-gray-900' onChange={e => {setRoomName(e.target.value)}} type="text" name='roomName' id='roomName' placeholder='Room name' /></th>
                    <th></th>
                    <th><input className='bg-gray-900' onChange={e => {setRoomPassword(e.target.value)}} type="password" name='roomPassword' id='roomPassword' placeholder='Room password' /></th>
                    <th><button className='bg-blue-700' onClick={createRoom}>Create</button></th>
                </tr>
            </tfoot>
        </table>
    </div>
  )
}