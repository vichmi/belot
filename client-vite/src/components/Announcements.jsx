// src/components/Announcements.jsx
import React from 'react';
import { useSocket } from '../contexts/SocketContext';

export default function Announcements({ room, player }) {
  const { socket } = useSocket();

  const announcementOptions = [
    { display: 'Clubs', value: 'clubs' },
    { display: 'Diamonds', value: 'diamonds' },
    { display: 'Hearts', value: 'hearts' },
    { display: 'Spades', value: 'spades' },
    { display: 'No Trumps', value: 'no trumps' },
    { display: 'All Trumps', value: 'all trumps' },
    { display: 'Pass', value: 'pass' },
  ];

  const validOrder = ['clubs', 'diamonds', 'hearts', 'spades', 'no trumps', 'all trumps'];

  const nonPassAnnouncements = room.announcements
    ? room.announcements.filter(a => a !== 'pass')
    : [];

  const currentHighest =
    nonPassAnnouncements.length > 0
      ? nonPassAnnouncements[nonPassAnnouncements.length - 1]
      : null;

  const selectAnnouncement = (announcementValue) => {
    socket.emit('announce', announcementValue);
  };

  return (
    <div className="flex flex-row space-x-4 p-4 bg-gray-800 rounded-xl shadow-lg justify-center">
      {announcementOptions.map((ann, index) => {
        let isDisabled = false;
        if (ann.value !== 'pass') {
          if (currentHighest) {
            if (validOrder.indexOf(ann.value) <= validOrder.indexOf(currentHighest)) {
              isDisabled = true;
            }
          }
          if (room.announcements && room.announcements.includes(ann.value)) {
            isDisabled = true;
          }
        }

        return (
          <button
            key={index}
            disabled={isDisabled}
            onClick={() => !isDisabled && selectAnnouncement(ann.value)}
            className={`
              flex flex-col items-center justify-center w-[90px] h-[120px] rounded-xl border-2 
              transition-all duration-200
              ${isDisabled
                ? 'opacity-40 cursor-not-allowed border-gray-500 bg-gray-700'
                : 'cursor-pointer border-gray-600 hover:bg-gray-700 hover:scale-105'
              }
            `}
          >
            {index <= 3 ? (
              <img
                src={`/assets/a_of_${ann.value}.png`}
                width={50}
                height={70}
                alt={ann.display}
                className="drop-shadow"
              />
            ) : ann.value === 'no trumps' ? (
              <span className="text-4xl font-bold">NT</span>
            ) : ann.value === 'all trumps' ? (
              <span className="text-4xl font-bold">AT</span>
            ) : ann.value === 'pass' ? (
              <span className="text-lg font-semibold text-red-400">PASS</span>
            ) : null}
            <span className="mt-2 text-sm font-medium">{ann.display}</span>
          </button>
        );
      })}
    </div>
  );
}
