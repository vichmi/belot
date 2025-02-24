import React from 'react'

export default function RoundScore({roundPoints, player}) {
  return (
    <div className='round-score-container'>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Us</th>
                <th>Others</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Hands:</td>
                <td>{roundPoints[player.team].trickPoints}</td>
                <td>{roundPoints[player.team == 'NS' ? 'EW' : 'NS'].trickPoints}</td>
              </tr>

              <tr>
                <td>Announcements:</td>
                <td>{roundPoints[player.team].comboBonus}</td>
                <td>{roundPoints[player.team == 'NS' ? 'EW' : 'NS'].comboBonus}</td>
              </tr>

              <tr>
                <td>Total:</td>
                <td>{roundPoints[player.team].totalPoints}</td>
                <td>{roundPoints[player.team == 'NS' ? 'EW' : 'NS'].totalPoints}</td>
              </tr>
            </tbody>
          </table>
      </div>
  )
}
