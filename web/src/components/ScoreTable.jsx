import React from 'react'

export default function ScoreTable({room, player}) {
  return (
    <div className='score-container'>
        <table>
          <thead>
            <tr>
                <th>Us</th>
                <th>Others</th>
            </tr>
          </thead>
          
          <tbody>
            <tr>
              <td>{room.scores[player.team]}</td>
              <td>{room.scores[player.team == 'NS' ? 'EW' : 'NS']}</td>
            </tr>
          </tbody>
        
        </table>
    </div>
  )
}
