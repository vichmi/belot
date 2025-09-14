// ...existing code...
import React from 'react'
import { useSocket } from '../contexts/SocketContext';
// Create an array of placeholders for unknown card images.
const unknownCards = Array.from({ length: 32 }, (_, i) => i);

export default function SplitCardsComponents({setISplit}) {
  const {socket} = useSocket();
  return (
      <>
        {/* Updated heading with a readable drop shadow */}
        <h1 style={{
          textAlign: 'center',
          textShadow: '0 6px 14px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.03)',
          color: '#ffffff',
          fontSize: '32px',
          fontWeight: 700,
          margin: '12px 0'
        }}>
          Split cards
        </h1>

          <div className="flex flex-row justify-self-center align-self-center">
            {unknownCards.map((_, idx) => (
              <img
                key={idx}
                className="hand -ml-13 text-center"
                src={`/assets/back.png`}
                alt="unknown card"
                width={60}
                height={80}
                onClick={() => {
                  socket.emit('splitted card', idx);
                  setISplit(false);
                }}
              />
            ))}
          </div>
      </>
    )
}
// ...existing code...