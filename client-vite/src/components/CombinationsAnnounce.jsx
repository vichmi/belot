import React, { useState } from 'react'
import { useSocket } from '../contexts/SocketContext';
import stringToTitle from '../utils/stringToTitle';

export default function CombinationsAnnounce({combinations, setCombinations, setShowCombinationBox}) {
    const {socket} = useSocket();
    const [showModal, setShowModal] = useState(true);
    const sendWantedAnnounce = () => {
        socket.emit('saveCombinations', {combinations: combinations.filter(c => c.isChecked == true)});
        setShowCombinationBox(false);
    }

    const updateCombination = (index) => {
        setCombinations((prev) =>
          prev.map((combo, i) =>
            i === index ? { ...combo, isChecked: !combo.isChecked } : combo
          )
        );
    };

//   return (
//     <div>

//         {combinations.map((c, index) => {
//             return (
//                 <div key={index}>
//                     <label htmlFor={`combo${index}`}>{c.type}</label>
//                     <input type="checkbox" name={`combo${index}`} id="" checked={c.isChecked} onChange={() => {
//                         c.isChecked = !c.isChecked;
//                     }}/>    
//                 </div>
//             )
//         }
//         )}
//         <button type='submit' onClick={sendWantedAnnounce}>Announce</button>
//     </div>
//   )
return (
    <div className="p-4">

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[999]">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={() => setShowCombinationBox(false)}
          ></div>
          {/* Modal content */}
          <div className="relative bg-white rounded-lg shadow-lg p-6 w-11/12 max-w-md z-10 flex flex-col justify-between h-1/5">
            <h2 className="text-2xl font-semibold mb-4 text-center text-gray-800 border-b">
              Announce Combination
            </h2>
            <div className="space-y-3">
              {combinations.map((c, index) => (
                <div key={index} className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    id={`combo${index}`}
                    name={`combo${index}`}
                    className="mr-3 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={c.isChecked}
                    onChange={() => updateCombination(index)}
                  />
                  <label
                    htmlFor={`combo${index}`}
                    className="text-gray-800 font-medium"
                  >
                    {stringToTitle(c.type)}
                  </label>
                </div>
              ))}
            </div>
            <div className="flex justify-evenly mt-6 space-x-3">
              <button
                type="button"
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded"
                onClick={sendWantedAnnounce}
              >
                Announce
              </button>
              <button
                type="button"
                className="bg-red-500 hover:bg-red-400 text-white font-medium py-2 px-4 rounded"
                onClick={() => setShowCombinationBox(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
