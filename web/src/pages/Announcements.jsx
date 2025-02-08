import React, { useEffect } from 'react';
import {socket} from '../lib/socket';

export default function Announcements({room, player}) {

    const announcements = ['Clubs', 'Diamonds', 'Hearts', 'Spades', 'No Trumps', 'All Trumps', 'Pass'];

    const selectColor = (announcement) => {
        console.log(announcement);
        socket.emit('announce', announcement, player);
    }

    useEffect(() => {

    }, []);

  return (
    <div className='announcements-container'>
        {announcements.map((ann, index) => {
            return (
                <div key={index} className={`announcement-container ${(room.announcements.includes(ann) || room.announcements.indexOf(room.announcements.includes(ann)) < announcements[announcements.indexOf(ann)] ) && ann != 'Pass' ? 'non-active' : ''} `} onClick={() => selectColor(ann)}>
                    {index <= 3 ? 
                    <img src={require(`../assets/a_of_${ann.toLowerCase()}.png`)} width={50} height={80} />:
                    ann == 'No Trumps' ? <span className='announcements-title'>A</span> : ann == 'All Trumps' ? <span className='announcements-title'>J</span> : <></>}
                    <span className='announcements-span'>{ann}</span>
                </div>
            )
        })}

    </div>
  )
}
