import React, { useState } from 'react';
import Header from '../Common/Header';
import BackBtn from '../Common/BackBtn';

const PongGame: React.FC = () => {
  const [gameStarted, setGameStarted] = useState(false);
  
  return (
    <div className="relative min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none bg-gradient-to-r from-blue-600 to-red-600 text-white">

      <Header />

      <div className='flex mb-8'>
        <BackBtn />
        <h2 className="text-[5rem] border-b-2 border-white w-full flex-1 text-center">Pong</h2>
        <div className='flex-1'></div>
      </div>


 
        
        {!gameStarted ? (
          <div className="flex flex-col items-center">
            <form action="" className='min-w-[450px] h-[500px] border-2 flex flex-col items-center justify-evenly text-[2rem]'>
              <h1>Reglages ?</h1>
              <h1>choix</h1>
              <h1>choix</h1>


              <button 
                className="bg-blue-500 hover:scale-110 text-white py-2 px-4 rounded-md border-white border-2 w-2/3"
                onClick={() => setGameStarted(true)}>
                  Start 
              </button>

            </form>


          </div>
        ) : (
          <div className="relative flex flex-col items-center">
            <h1 className='text-[10rem]'>Y A PAS DE JEU MDR</h1>
            <button 
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mt-4"
              onClick={() => setGameStarted(false)}
            >
              Arrêter
            </button>
          </div>
        )}

    </div>

  );
};

export default PongGame;