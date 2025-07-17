import React, { useRef, useEffect } from 'react';
import useGameLogic from './useGameLogic';

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gameState, startGameLoop, resetGame } = useGameLogic();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Configuration du canvas
    canvas.width = 800;
    canvas.height = 400;

    // Démarrer la boucle de jeu
    const stopGameLoop = startGameLoop(canvas, context);

    // Nettoyage quand le composant est démonté
    return () => {
      stopGameLoop();
    };
  }, []);

  // Vérifier si un joueur a gagné
  const winner = gameState.player1Score >= 3 ? 1 : gameState.player2Score >= 3 ? 2 : null;

  return (
    <div className="canvas-container">
      <div className="score-display flex justify-between w-full mb-2">
        <div className="player-score">Joueur 1: {gameState.player1Score}</div>
        <div className="player-score">Joueur 2: {gameState.player2Score}</div>
      </div>
      <div className="game-canvas">
        <canvas 
          ref={canvasRef} 
          className="border-2 border-gray-800 bg-black"
          style={{ width: '800px', height: '400px' }}
        />
        {winner && (
          <div className="winner-overlay absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center bg-black bg-opacity-70">
            <div className="winner-text text-3xl font-bold mb-4">
              Joueur {winner} a gagné!
            </div>
            <button 
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={resetGame}
            >
              Nouvelle partie
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameCanvas;