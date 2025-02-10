// src/components/Announcements.jsx
import React from 'react';
import { socket } from '../lib/socket';

export default function Announcements({ room, player }) {
  // Define each announcement option with a display name and normalized value.
  const announcementOptions = [
    { display: 'Clubs', value: 'clubs' },
    { display: 'Diamonds', value: 'diamonds' },
    { display: 'Hearts', value: 'hearts' },
    { display: 'Spades', value: 'spades' },
    { display: 'No Trumps', value: 'no trumps' },
    { display: 'All Trumps', value: 'all trumps' },
    { display: 'Pass', value: 'pass' },
  ];

  // Valid order for comparing bids.
  const validOrder = ['clubs', 'diamonds', 'hearts', 'spades', 'no trumps', 'all trumps'];

  // Determine the current highest (non-pass) announcement.
  const nonPassAnnouncements = room.announcements ? room.announcements.filter(a => a !== 'pass') : [];
  const currentHighest = nonPassAnnouncements.length > 0 ? nonPassAnnouncements[nonPassAnnouncements.length - 1] : null;

  const selectAnnouncement = (announcementValue) => {
    console.log("Announcing:", announcementValue);
    socket.emit('announce', announcementValue);
  };

  return (
    <div className="announcements-container">
      {announcementOptions.map((ann, index) => {
        let isDisabled = false;
        if (ann.value !== 'pass') {
          if (currentHighest) {
            // Disable options that are not higher than the current highest bid.
            if (validOrder.indexOf(ann.value) <= validOrder.indexOf(currentHighest)) {
              isDisabled = true;
            }
          }
          // Also disable if this bid has already been announced.
          if (room.announcements && room.announcements.includes(ann.value)) {
            isDisabled = true;
          }
        }
        return (
          <div
            key={index}
            className={`announcement-container ${isDisabled ? 'non-active' : ''}`}
            onClick={() => {
              if (!isDisabled) {
                selectAnnouncement(ann.value);
              }
            }}
          >
            {index <= 3 ? (
              <img
                src={require(`../assets/a_of_${ann.value}.png`)}
                width={50}
                height={80}
                alt={ann.display}
              />
            ) : ann.value === 'no trumps' ? (
              <span className="announcements-title">A</span>
            ) : ann.value === 'all trumps' ? (
              <span className="announcements-title">J</span>
            ) : null}
            <span className="announcements-span">{ann.display}</span>
          </div>
        );
      })}
    </div>
  );
}
