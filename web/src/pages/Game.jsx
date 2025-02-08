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
    const [showAnnouncements, setShowAnnouncement] = useState(false);

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
        setPlayers([r.players[initialPlayerIndex], r.players[firstPlayer], r.players[secondPlayer], r.players[thirdPlayer]]);
    }

    useEffect(() => {
        setUserIndex(room.players.findIndex(p => p.id == player.id));

        socket.on('playerJoined', (r, _) => {
            setRoom(r);
            setUserIndex(room.players.findIndex(p => p.id == player.id));
            if(r.players.length == 4) {
                getAndSetPlayers(r);
            }
        });

        socket.on('gameStarted', r => {
            setRoom(r);
        })

        socket.on('splitting', r => {
            setRoom(r);
            setCards([]);
            setISplit(r.dealingPlayerIndex == userIndex);
            console.log(r, userIndex)
            if(r.dealingPlayerIndex == userIndex) {
                setISplit(true)
            }else{
                setISplit(false);
            }
        })

        socket.on('initialCardsDealt', r => {
            getAndSetPlayers(r);
            setRoom(r);
            setCards(r.players.filter(p => p.id == player.id)[0].handCards.sort(sortCards));
            setShowAnnouncement(true);
        })

        socket.on('announcementMade', r => {
            setRoom(r);
        })

        socket.on('finalCardsDealt', r => {
            getAndSetPlayers(r);
            setRoom(r);
            setCards(r.players.filter(p => p.id == player.id)[0].handCards.sort(sortCards));
        })

        socket.on('player disconnected', r => {
            setRoom(r);
            setPlayers(r.players);
        });

        socket.on('playing', room => {
            setRoom(room);
            setCards(room.players[userIndex].handCards.sort(sortCards));
        });

        socket.on('play card', r => {
            setRoom(r);
            setCards(r.players[userIndex].handCards.sort(sortCards));
        });

        socket.on('hand announce', msg => {console.log(msg)})
    }, []);

    return (
        <div className='Game'>

            {/* {room.teams.map((t, index) => {
                let result = 0;
                t.hands.map((h, indx) => {
                    h.map((c, i) => {
                        result += c.card.allTrumps;
                    })
                });
                return (
                    <p style={{position: 'absolute', left:0, marginTop: `${index * 50 + 20}px`}}>Team {index} has: {result}</p>
                )
            })} */}

            <div className='main-player box'>
                {players[0].isDealer ? <span><b>D</b></span> : <></>}
                {userIndex == room.turnIndex ? <span><b>Your turn</b></span> : <></>}
                {cards.length >= 1 ? 
                    <div className='card-container'>
                        {cards.map((card, index) => {
                            return <img className='card' onClick={() => {
                                if(room.turn == userIndex) {
                                    socket.emit('play card', card);
                                }
                            }} key={index} src={require(`../assets/${card.rank.toLowerCase()}_of_${card.suit.toLowerCase()}.png`)} alt={`${card.rank} ${card.suit}`} width={60} height={80} />
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

                {userIndex == room.turnIndex && showAnnouncements ? 
                    <Announcements room={room} plyaer={player} />
                :<></>}
                {/* <div className='table-container'> */}
                    {room.gameStage == 'playing' && room.table.length > 0 ? 
                    <div className='table-container'>
                        {room.table.map((card, i) => {
                            let index = players.findIndex(p => p.id == card.player.id);
                            return (
                                    <img key={i} className={`card card-placement${index}`} src={require(`../assets/${card.card.img}`)} alt={card.card.img} width={60} height={80} />
                                
                            )
                        })} </div>: <></>
                    }
                {/* </div> */}
            </div>
        </div>
    )
}