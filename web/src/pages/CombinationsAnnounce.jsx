import React from 'react'
import { socket } from '../lib/socket'

export default function CombinationsAnnounce({combinations, setShowCombinationBox}) {

    const sendWantedAnnounce = () => {
        console.log(combinations)
        socket.emit('saveCombinations', {combinations: combinations.filter(c => c.isChecked == true)});
        setShowCombinationBox(false);
    }

  return (
    <div style={{display: 'flex', width: 400, height: 300, backgroundColor: 'red', zIndex: 99}}>
        {combinations.map((c, index) => {
            return (
                <div key={index}>
                    <label htmlFor={`combo${index}`}>{c.type}</label>
                    <input type="checkbox" name={`combo${index}`} id="" checked={c.isChecked} onChange={() => {
                        c.isChecked = !c.isChecked;
                    }}/>    
                </div>
            )
        }
        )}
        <button type='submit' onClick={sendWantedAnnounce}>Announce</button>
    </div>
  )
}
