import React, { ReactNode, useState, useEffect } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  const [currentAnimation, setCurrentAnimation] = useState(0);
  const animations = ['pong', 'tournament', 'chat'];

  // Carrousel automatique
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAnimation((prev) => (prev + 1) % animations.length);
    }, 15000); // Change toutes les 15 secondes

    return () => clearInterval(interval);
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-100">
      
      <div className="flex w-full max-w-[1600px] h-[800px] bg-white rounded-3xl shadow-2xl overflow-hidden">
        
        {/* CÔTÉ GAUCHE - Formulaire */}
        <div className="w-full lg:w-2/5 bg-white flex items-center justify-center px-8 py-12">
          <div className="max-w-md w-full space-y-1">
            
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {title}
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                {subtitle}
              </p>
            </div>

            <div className="space-y-6">
              {children}
            </div>

          </div>
        </div>

        {/* CÔTÉ DROIT - Carrousel d'animations */}
        <div className="hidden lg:flex lg:w-3/5 pl-6 pr-3 py-3 items-center justify-center">
          <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl flex items-center justify-center relative overflow-hidden">
            
            {/* Animation Pong */}
            {currentAnimation === 0 && (
              <div className="relative z-10 text-center text-white px-12 animate-fade-in">
                
                <div className="mb-8">
                  <div className="w-80 h-48 mx-auto relative">
                    
                    {/* Terrain avec effet de lueur */}
                    <div className="w-full h-full border-2 border-white/20 rounded-lg relative backdrop-blur-sm bg-white/5 shadow-2xl overflow-hidden">
                      
                      {/* Ligne centrale animée */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/30 transform -translate-x-1/2">
                        <div className="w-full h-full bg-gradient-to-b from-transparent via-white/50 to-transparent animate-pulse"></div>
                      </div>
                      
                      {/* Raquette gauche avec mouvement réaliste */}
                      <div className="absolute left-2 w-1.5 h-12 bg-white/80 rounded-full shadow-lg animate-paddle-realistic-left">
                        <div className="absolute inset-0 bg-white/50 blur-sm animate-pulse"></div>
                      </div>
                      
                      {/* Raquette droite avec mouvement réaliste */}
                      <div className="absolute right-2 w-1.5 h-12 bg-white/80 rounded-full shadow-lg animate-paddle-realistic-right">
                        <div className="absolute inset-0 bg-white/50 blur-sm animate-pulse"></div>
                      </div>
                      
                      {/* Balle avec trajectoire réaliste */}
                      <div className="absolute w-2 h-2 animate-ball-realistic">
                        <div className="relative">
                          {/* Traînée de la balle */}
                          <div className="absolute inset-0 bg-white rounded-full blur-md scale-150 opacity-50"></div>
                          {/* Balle principale */}
                          <div className="relative w-2 h-2 bg-white rounded-full shadow-lg">
                            <div className="absolute inset-0 bg-white rounded-full animate-ping"></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Effet de collision (flash) */}
                      <div className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 opacity-0 animate-collision-left">
                        <div className="w-full h-full bg-white/60 rounded-full blur-md"></div>
                      </div>
                      <div className="absolute right-3 top-1/2 w-4 h-4 -translate-y-1/2 opacity-0 animate-collision-right">
                        <div className="w-full h-full bg-white/60 rounded-full blur-md"></div>
                      </div>
                      
                      {/* Points de score subtils */}
                      <div className="absolute top-4 left-1/4 w-1 h-1 bg-white/40 rounded-full animate-score-flash"></div>
                      <div className="absolute top-4 right-1/4 w-1 h-1 bg-white/40 rounded-full animate-score-flash" style={{ animationDelay: '3s' }}></div>
                      
                    </div>
                  </div>
                </div>

                {/* Texte avec animation subtile */}
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold">
                    Master the Classic
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed max-w-sm mx-auto">
                    Experience the legendary Pong game with modern multiplayer features, 
                    tournaments, and real-time competitions.
                  </p>
                </div>

              </div>
            )}

            {/* Animation Live Chat */}
            {currentAnimation === 2 && (
              <div className="relative z-10 text-center text-white px-12 animate-fade-in">
                
                <div className="mb-8">
                  <div className="w-80 h-60 mx-auto relative">
                    
                    {/* Interface de chat minimaliste */}
                    <div className="w-full h-full relative">
                      
                      {/* Messages flottants */}
                      <div className="absolute inset-0">
                        
                        {/* Message 1 - Gauche */}
                        <div className="absolute top-8 left-4 animate-chat-message-1">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                              <div className="text-sm opacity-90">Ready to play?</div>
                            </div>
                          </div>
                        </div>

                        {/* Message 2 - Droite */}
                        <div className="absolute top-20 right-6 animate-chat-message-2">
                          <div className="flex items-center space-x-3 justify-end">
                            <div className="bg-white/15 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/30">
                              <div className="text-sm opacity-90">Let's go!</div>
                            </div>
                            <div className="w-2 h-2 bg-white/80 rounded-full"></div>
                          </div>
                        </div>

                        {/* Message 3 - Centre */}
                        <div className="absolute top-32 left-1/2 transform -translate-x-1/2 animate-chat-message-3">
                          <div className="bg-white/8 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/15 text-center">
                            <div className="text-xs opacity-70 mb-1">Game Invitation</div>
                            <div className="text-sm opacity-90">Join Tournament</div>
                          </div>
                        </div>

                        {/* Typing indicator minimaliste */}
                        <div className="absolute top-44 left-8 animate-chat-typing">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-white/40 rounded-full"></div>
                            <div className="bg-white/5 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
                              <div className="flex space-x-1 items-center">
                                <div className="w-1 h-1 bg-white/60 rounded-full animate-chat-dot-1"></div>
                                <div className="w-1 h-1 bg-white/60 rounded-full animate-chat-dot-2"></div>
                                <div className="w-1 h-1 bg-white/60 rounded-full animate-chat-dot-3"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                      </div>

                      {/* Lignes de connexion élégantes */}
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 240" fill="none">
                        
                        {/* Connexions entre utilisateurs */}
                        <line x1="20" y1="40" x2="160" y2="120" className="stroke-white/20 stroke-1 animate-chat-connection-1" strokeDasharray="3,3" />
                        <line x1="300" y1="80" x2="160" y2="120" className="stroke-white/20 stroke-1 animate-chat-connection-2" strokeDasharray="3,3" />
                        <line x1="160" y1="120" x2="160" y2="160" className="stroke-white/20 stroke-1 animate-chat-connection-3" strokeDasharray="3,3" />
                        <line x1="40" y1="180" x2="160" y2="160" className="stroke-white/20 stroke-1 animate-chat-connection-4" strokeDasharray="3,3" />
                        
                        {/* Point central - hub de communication */}
                        <circle cx="160" cy="120" r="4" className="fill-white/30 animate-chat-hub" />
                        <circle cx="160" cy="120" r="8" className="fill-none stroke-white/20 stroke-1 animate-chat-hub-ring" />
                        
                      </svg>

                      {/* Particules minimalistes */}
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-16 right-12 w-1 h-1 bg-white/40 rounded-full animate-chat-particle-1"></div>
                        <div className="absolute top-36 left-12 w-1 h-1 bg-white/30 rounded-full animate-chat-particle-2"></div>
                        <div className="absolute bottom-20 right-16 w-1 h-1 bg-white/35 rounded-full animate-chat-particle-3"></div>
                      </div>
                      
                    </div>
                  </div>
                </div>

                {/* Texte avec animation subtile */}
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold">
                    Connect & Communicate
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed max-w-sm mx-auto">
                    Seamless real-time communication with players worldwide. 
                    Chat, invite, and build your gaming network.
                  </p>
                </div>

              </div>
            )}

            {/* Animation Tournoi */}
            {currentAnimation === 1 && (
              <div className="relative z-10 text-center text-white px-12 animate-fade-in">
                
                <div className="mb-8">
                  <div className="w-80 h-60 mx-auto relative">
                    
                    {/* Arbre de tournoi */}
                    <div className="w-full h-full relative">
                      
                      {/* Trophée flottant au sommet */}
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                        <div className="w-8 h-8 animate-tournament-trophy">
                          <div className="text-2xl animate-float-slow">🏆</div>
                          {/* Confettis */}
                          <div className="absolute inset-0 animate-tournament-confetti">
                            <div className="absolute -top-2 -left-1 w-1 h-1 bg-yellow-400 rounded-full animate-confetti-1"></div>
                            <div className="absolute -top-1 left-2 w-1 h-1 bg-blue-400 rounded-full animate-confetti-2"></div>
                            <div className="absolute -top-3 right-0 w-1 h-1 bg-red-400 rounded-full animate-confetti-3"></div>
                            <div className="absolute -top-2 right-3 w-1 h-1 bg-green-400 rounded-full animate-confetti-4"></div>
                            <div className="absolute -top-1 -right-1 w-1 h-1 bg-purple-400 rounded-full animate-confetti-5"></div>
                          </div>
                        </div>
                      </div>

                      {/* Structure du bracket */}
                      <svg className="w-full h-full" viewBox="0 0 320 240" fill="none">
                        
                        {/* Finale */}
                        <line x1="160" y1="20" x2="160" y2="40" className="stroke-white/30 stroke-1 animate-tournament-final" strokeDasharray="2,2" />
                        
                        {/* Demi-finales */}
                        <line x1="120" y1="40" x2="160" y2="40" className="stroke-white/40 animate-tournament-semi-1" strokeDasharray="2,2" />
                        <line x1="200" y1="40" x2="160" y2="40" className="stroke-white/40 animate-tournament-semi-2" strokeDasharray="2,2" />
                        <line x1="120" y1="40" x2="120" y2="70" className="stroke-white/40 animate-tournament-semi-1" strokeDasharray="2,2" />
                        <line x1="200" y1="40" x2="200" y2="70" className="stroke-white/40 animate-tournament-semi-2" strokeDasharray="2,2" />
                        
                        {/* Quarts de finale */}
                        <line x1="80" y1="70" x2="120" y2="70" className="stroke-white/50 animate-tournament-quarter-1" strokeDasharray="2,2" />
                        <line x1="160" y1="70" x2="120" y2="70" className="stroke-white/50 animate-tournament-quarter-2" strokeDasharray="2,2" />
                        <line x1="160" y1="70" x2="200" y2="70" className="stroke-white/50 animate-tournament-quarter-3" strokeDasharray="2,2" />
                        <line x1="240" y1="70" x2="200" y2="70" className="stroke-white/50 animate-tournament-quarter-4" strokeDasharray="2,2" />
                        
                        <line x1="80" y1="70" x2="80" y2="100" className="stroke-white/50 animate-tournament-quarter-1" strokeDasharray="2,2" />
                        <line x1="160" y1="70" x2="160" y2="100" className="stroke-white/50 animate-tournament-quarter-2" strokeDasharray="2,2" />
                        <line x1="240" y1="70" x2="240" y2="100" className="stroke-white/50 animate-tournament-quarter-4" strokeDasharray="2,2" />
                        
                        {/* Premier tour */}
                        <line x1="40" y1="100" x2="80" y2="100" className="stroke-white/60 animate-tournament-first-1" strokeDasharray="2,2" />
                        <line x1="120" y1="100" x2="80" y2="100" className="stroke-white/60 animate-tournament-first-2" strokeDasharray="2,2" />
                        <line x1="120" y1="100" x2="160" y2="100" className="stroke-white/60 animate-tournament-first-3" strokeDasharray="2,2" />
                        <line x1="200" y1="100" x2="160" y2="100" className="stroke-white/60 animate-tournament-first-4" strokeDasharray="2,2" />
                        <line x1="200" y1="100" x2="240" y2="100" className="stroke-white/60 animate-tournament-first-5" strokeDasharray="2,2" />
                        <line x1="280" y1="100" x2="240" y2="100" className="stroke-white/60 animate-tournament-first-6" strokeDasharray="2,2" />
                        
                        {/* Joueurs (cercles) */}
                        <circle cx="40" cy="120" r="3" className="fill-white/60 animate-tournament-player-1" />
                        <circle cx="80" cy="120" r="3" className="fill-white/60 animate-tournament-player-2" />
                        <circle cx="120" cy="120" r="3" className="fill-white/60 animate-tournament-player-3" />
                        <circle cx="160" cy="120" r="3" className="fill-white/60 animate-tournament-player-4" />
                        <circle cx="200" cy="120" r="3" className="fill-white/60 animate-tournament-player-5" />
                        <circle cx="240" cy="120" r="3" className="fill-white/60 animate-tournament-player-6" />
                        <circle cx="280" cy="120" r="3" className="fill-white/60 animate-tournament-player-7" />
                        
                        {/* Chemin du vainqueur qui s'illumine */}
                        <line x1="120" y1="120" x2="120" y2="100" className="stroke-yellow-400/80 stroke-2 animate-tournament-winner-path-1" />
                        <line x1="120" y1="100" x2="160" y2="100" className="stroke-yellow-400/80 stroke-2 animate-tournament-winner-path-2" />
                        <line x1="160" y1="100" x2="160" y2="70" className="stroke-yellow-400/80 stroke-2 animate-tournament-winner-path-3" />
                        <line x1="160" y1="70" x2="120" y2="70" className="stroke-yellow-400/80 stroke-2 animate-tournament-winner-path-4" />
                        <line x1="120" y1="70" x2="120" y2="40" className="stroke-yellow-400/80 stroke-2 animate-tournament-winner-path-5" />
                        <line x1="120" y1="40" x2="160" y2="40" className="stroke-yellow-400/80 stroke-2 animate-tournament-winner-path-6" />
                        <line x1="160" y1="40" x2="160" y2="20" className="stroke-yellow-400/80 stroke-2 animate-tournament-winner-path-7" />
                        
                        {/* Joueur vainqueur */}
                        <circle cx="120" cy="120" r="4" className="fill-yellow-400 animate-tournament-winner-glow" />
                        
                      </svg>
                      
                    </div>
                  </div>
                </div>

                {/* Texte avec animation subtile */}
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold">
                    Tournament Glory
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed max-w-sm mx-auto">
                    Compete in thrilling tournaments, climb the brackets, 
                    and claim your victory with style and strategy.
                  </p>
                </div>

              </div>
            )}

            {/* Indicateurs de carrousel */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
              {animations.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentAnimation(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    currentAnimation === index 
                      ? 'bg-white scale-125' 
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>

            {/* Effets visuels améliorés */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl"></div>
            
            {/* Orbes de lumière animées */}
            <div className="absolute top-20 right-20 w-32 h-32 bg-white/5 rounded-full blur-xl animate-float"></div>
            <div className="absolute bottom-20 left-20 w-24 h-24 bg-white/3 rounded-full blur-lg animate-float-delayed"></div>
            <div className="absolute top-1/2 left-1/3 w-20 h-20 bg-white/2 rounded-full blur-xl animate-float-slow"></div>
            
            {/* Grille de fond subtile */}
            <div className="absolute inset-0 opacity-5">
              <div className="h-full w-full" style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), 
                                 linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                backgroundSize: '50px 50px'
              }}></div>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
};

export default AuthLayout;