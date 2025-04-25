import React from 'react';
import PongGame from './components/Pong/PongGame';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-blue-600 mb-4">ft_transcendence</h1>
      <p className="text-xl text-gray-700 mb-8">Bienvenue sur notre plateforme de jeu Pong!</p>
      
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full">
        <PongGame />
      </div>
    </div>
  );
}

export default App;