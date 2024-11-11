import React, { useEffect, useState } from 'react';
import {socket} from '../lib/socket';
import Announcements from './Announcements';
// const images = [];

const unknownCards = [];
for(let i=0;i<32;i++) {
    unknownCards.push(1);
}

export default function Game({init_room, player}) {

    const [room, setRoom] = useState(init_room)
    const [players, setPlayers] = useState(room.players);
    const [cards, setCards] = useState([]);
    const [userIndex, setUserIndex] = useState(room.players.findIndex(p => p.id == player.id));
    const [tableCards, setTableCards] = useState([]);
    const [iSplit, setISplit] = useState(false);
    const [takeHand, setTakeHand] = useState();

    const sortCards = (cardA, cardB) => {
        const colorStrength = ['spades', 'hearts', 'diamonds', 'clubs'];
        
        const colorA = cardA.color;
        const colorB = cardB.color;

        let strengthA = cardA.noTrumps;
        let strengthB = cardB.noTrumps;

        if(room.gameType == 'All Trumps') {
            strengthA = cardA.allTrumps;
            strengthB = cardB.allTrumps;
        }

        const colorIndexA = colorStrength.indexOf(colorA);
        const colorIndexB = colorStrength.indexOf(colorB);

        if(colorIndexA != colorIndexB) {
            return colorIndexA - colorIndexB;
        }
        return strengthA - strengthB;
    }

    const selectCard = card => {
        if(room.turn == userIndex && room.gameStage == 'playing') {
            socket.emit('play card', card);
        }
    };

    function getAndSetPlayers(r) {
        let initialPlayerIndex = r.players.findIndex(p => p.id == player.id);
        let firstPlayer = initialPlayerIndex + 1 >= 4 ? 0 : initialPlayerIndex + 1;
        let secondPlayer = initialPlayerIndex + 2 >= 4 ? initialPlayerIndex - 2 : initialPlayerIndex + 2;
        let thirdPlayer = initialPlayerIndex + 3 >= 4 ? initialPlayerIndex - 1 : initialPlayerIndex + 3;
        // console.log([player, r.players[firstPlayer], r.players[secondPlayer], r.players[thirdPlayer]])
        setPlayers([r.players[initialPlayerIndex], r.players[firstPlayer], r.players[secondPlayer], r.players[thirdPlayer]]);
    }

    useEffect(() => {
        setUserIndex(room.players.findIndex(p => p.id == player.id));
        socket.on('changes', r => {
            setRoom(r);
            // setPlayers(r.players);
            if(r.players.length == 4) {
                getAndSetPlayers(r);
            }
        })

        socket.on('splitting', r => {
            setRoom(r);
            setCards([]);
            setISplit(r.dealingTurn == userIndex);
            if(r.dealingTurn == userIndex) {
                setISplit(true)
            }else{
                setISplit(false);
            }
            console.log(r.dealingTurn, userIndex, r.dealingTurn == userIndex);
        })

        socket.on('dealing', r => {
            getAndSetPlayers(r);
            setRoom(r);
            setCards(r.players.filter(p => p.id == player.id)[0].handCards.sort(sortCards));
            console.log(cards);
        })

        socket.on('player disconnected', r => {
            setRoom(r);
            setPlayers(r.players);
        });

        socket.on('playing', room => {
            console.log(room)
            setRoom(room);
            setCards(room.players[userIndex].handCards.sort(sortCards));
        });

        socket.on('play card', r => {
            setRoom(r);
            setCards(r.players[userIndex].handCards.sort(sortCards));
            console.log(r);
        });
    }, []);

    return (
        <div className='Game'>
            <div className='main-player box'>
                {players[0].isDealer ? <span><b>D</b></span> : <></>}
                {userIndex == room.turn ? <span><b>Your turn</b></span> : <></>}
                {cards.length >= 1 ? 
                    <div className='card-container'>
                        {cards.map((card, index) => {
                            return <img className='card' onClick={() => {
                                if(room.turn == userIndex) {
                                    console.log(room);
                                    socket.emit('play card', card);
                                }
                            }} key={index} src={require(`../assets/${card.img.toLowerCase()}`)} alt={card.name} width={60} height={80} />
                        })}
                    </div>
                :<></>}
                <span>{player.id}</span>
            </div>

            {players.length == 4 ? players.map((p, index) => {
                if(index == 0) return;
                return (
                    <div key={index} className={`player${index} box`}>
                        {p.isDealer ? <span><b>D</b></span> : <></>}
                        <span>{p.id}</span>
                    </div>
                )
            }) : <></>}
            <div className='playing-sector box'>

                {iSplit ? 
                    <div className='splitCards'>
                        {unknownCards.map((val, index) => {
                            return <img key={index} className='card' src={require('../assets/back.png')} alt='unknown card' width={60} height={80} onClick={() => {
                                socket.emit('splitted card', index);
                                setISplit(false);
                            }} />
                        })}
                </div>
                :<></>}

                {room.gameStage == 'score' ? 
                <div className='score'>
                    {room.teams.map((t, index) => {
                        return (
                            <p key={index}>Team {index} has {t.gameScore}</p>
                        )
                    })}
                </div> : <></>}

                {userIndex == room.turn && room.gameStage == 'announcements' ? 
                    <Announcements room={room} plyaer={player} />
                :<></>}

                {room.gameStage == 'playing' && room.table.length > 0 ? room.table.map((card, index) => {
                    return <img key={index} className='card' src={require(`../assets/${card.card.img}`)} alt={card.card.img} width={60} height={80} />
                }) : <></>}
            </div>
        </div>
    )
}