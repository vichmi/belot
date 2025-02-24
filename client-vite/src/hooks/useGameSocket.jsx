import { useEffect } from "react";
import { useSocket } from "../contexts/SocketContext"


const useGameSocket = ({setRoom, setPlayers, player, setCards, setTableCards, setShowAnnouncements, reorderPlayers, setCombinations, setShowCombinationBox, setShowRoundScore, setRoundPoints, setCollectTrick, setFirstPlacedCard, setISplit}) => {
    const {socket} = useSocket();

    const setPlayerHand = (pl, room) => {
        const myPlayer = room.players.find(p => p.id === pl.id);
        if (myPlayer && myPlayer.hand) {
          setCards(myPlayer.hand.filter(card => card != null));
        }
    };

    useEffect(() => {
        if(!socket) {return;}

        const handlePlayerJoined = data => {
            setRoom(data.room);
            if (data.room.players.length === 4) {
              reorderPlayers(data.room);
            }
        };
        const handleSplitting = data => {
            setShowAnnouncements(false);
            setRoom(data.room);
            setCards([]);
            setISplit(data.room.dealingPlayerIndex !== undefined && data.room.players[data.room.dealingPlayerIndex]?.id === player.id)
        };
        const handleInitialCardsDealt = data => {
            reorderPlayers(data.room);
            setRoom(data.room);
            setPlayerHand(player, data.room);
            setShowAnnouncements(true);
        };
        const handleRestCardsDealt = data => {
            reorderPlayers(data.room);
            setRoom(data.room);
            setShowAnnouncements(false);
            setPlayerHand(player, data.room);
        };
        const handleCardPlayed = data => {
            setRoom(data.room);
            setTableCards(data.playedCards);
            reorderPlayers(data.room);
            setFirstPlacedCard(data.playedCards[0]);
            setPlayerHand(player, data.room);
        };
        const handleTrickCompleted = data => {
            setRoom(data.room);
            setCollectTrick(true);
            setPlayerHand(player, data.room);
            setFirstPlacedCard();
        };
        const handleRoundEnded = data => {
            setRoom(data.room);
            setShowRoundScore(true);
            setRoundPoints(
                {NS: {
                trickPoints: data.trickPoints.NS,
                comboBonus: data.comboBonus.NS,
                totalPoints: data.totalPoints.NS
                },
                EW: {
                  trickPoints: data.trickPoints.EW,
                  comboBonus: data.comboBonus.EW,
                  totalPoints: data.totalPoints.EW
                }
            });
            setTimeout(() => {
                setRoundPoints({});
                setShowRoundScore(false);
            }, 2500);
        };
        const handleRoundRestarted = data => {
            setRoom(data.room);
        };
        const handlePlayerDisconnected = data => {
            setRoom(data.room);
            setPlayers(data.room.players);
        };
        const handleErrorMessage = data => {
            console.log("Socket error:", data.message);
        };
        const handleCombinationDetected = data => {
            if(data.playerId != player.id) {return;}
            setCombinations(data.combination);
            setShowCombinationBox(true);
        }
        const handleAnnounceBelot = data => {
            if(data.playerId != player.id) {return;}
            setCombinations(data.combination);
            setShowCombinationBox(true);
        };
        const handleAnnouncementMade = data => {
            console.log(data);
            setRoom(data.room);
        };
        socket.on('playerJoined', handlePlayerJoined);
        socket.on('splitting', handleSplitting);
        socket.on('initialCardsDealt', handleInitialCardsDealt);
        socket.on('restCardsDealt', handleRestCardsDealt);
        socket.on('cardPlayed', handleCardPlayed);
        socket.on('trickCompleted', handleTrickCompleted);
        socket.on('announcementMade', handleAnnouncementMade);
        socket.on('roundEnded', handleRoundEnded);
        socket.on('roundRestarted', handleRoundRestarted);
        socket.on('playerDisconnected', handlePlayerDisconnected);
        socket.on('error', handleErrorMessage);
        socket.on('combinationDetected', handleCombinationDetected);
        socket.on('announceBelot', handleAnnounceBelot);

        return () => {
            socket.off('playerJoined', handlePlayerJoined);
            socket.off('splitting', handleSplitting);
            socket.off('initialCardsDealt', handleInitialCardsDealt);
            socket.off('restCardsDealt', handleRestCardsDealt);
            socket.off('cardPlayed', handleCardPlayed);
            socket.off('trickCompleted', handleTrickCompleted);
            socket.off('roundEnded', handleRoundEnded);
            socket.off('roundRestarted', handleRoundRestarted);
            socket.off('playerDisconnected', handlePlayerDisconnected);
            socket.off('error', handleErrorMessage);
            socket.off('combinationDetected', handleCombinationDetected);
            socket.off('announceBelot', handleAnnounceBelot);
            socket.off('announcementMade', handleAnnouncementMade);
        };
    }, [socket, setRoom, setPlayers, player, setCards, setTableCards, setShowAnnouncements, reorderPlayers, setCombinations, setShowCombinationBox, setShowRoundScore, setRoundPoints, setCollectTrick, setFirstPlacedCard, setISplit]);
}

export default useGameSocket;