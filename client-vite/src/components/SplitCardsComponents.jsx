import React from 'react'
import { useSocket } from '../contexts/SocketContext';
// Create an array of placeholders for unknown card images.
const unknownCards = Array.from({ length: 32 }, (_, i) => i);

export default function SplitCardsComponents({setISplit}) {
  const {socket} = useSocket();
  return (
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
    )
}
