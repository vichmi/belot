import React from 'react'

export default function TableComponent({room, collectTrick, tableCards, players, setCollectTrick, setTableCards}) {
  return (
    <div className="table-container">
        {tableCards && tableCards.length > 0 ?
            tableCards.map((play, idx) => {
                const pos = players.findIndex(p => p.id === play.playerId);
                const trWinner = players.findIndex(p => p.id == room.players[room.turnIndex].id);
                const sides = ['bottom', 'right', 'top', 'left'];
                const winnerClass = collectTrick
                ? `collect-${sides[trWinner]}` // e.g. "collect-top", "collect-left", etc.
                : '';
                console.log(winnerClass)
                return (
                <img
                    key={idx}
                    className={`card-placement${pos} table-card ${winnerClass}`}
                    src={require(`../assets/${play.card.rank.toLowerCase()}_of_${play.card.suit.toLowerCase()}.png`)}
                    alt={`${play.card.rank} ${play.card.suit}`}
                    width={60}
                    height={80}
                    onAnimationEnd={() => {
                    setTableCards([]);
                    setCollectTrick(false);
                    setTableCards(room.playedCards);
                    }}
                />
                );
            }) : <></>
        }
    </div>
  )
}
