import React, { useState } from 'react';
import GameCanvas from './GameCanvas';
import './PongGame.css';

const PongGame: React.FC = () => {
  const [gameStarted, setGameStarted] = useState(false);
  
  return (
    <div className="pong-container relative">
      <h2 className="text-2xl font-bold mb-4">Pong</h2>
      
      {!gameStarted ? (
        <div className="flex flex-col items-center">
          <p className="mb-4">Appuyez sur Start pour commencer</p>
          <button 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => setGameStarted(true)}
          >
            Start
          </button>
        </div>
      ) : (
        <div className="game-area relative">
          <GameCanvas />
          <button 
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mt-4"
            onClick={() => setGameStarted(false)}
          >
            Arrêter
          </button>
        </div>
      )}
      
      <div className="controls mt-4">
        <h3 className="text-lg font-semibold">Contrôles:</h3>
        <p>Joueur 1: W (haut) et S (bas)</p>
        <p>Joueur 2: Flèche haut et Flèche bas</p>
        <p className="mt-2 font-medium">Premier à 3 points gagne!</p>
      </div>
    </div>
  );
};

export default PongGame;