import React, { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
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

        {/* CÔTÉ DROIT - Animation Pong réaliste */}
        <div className="hidden lg:flex lg:w-3/5 pl-6 pr-3 py-3 items-center justify-center">
          <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl flex items-center justify-center relative overflow-hidden">
            
            {/* Terrain de Pong avec gameplay réaliste */}
            <div className="relative z-10 text-center text-white px-12">
              
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
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-2xl font-bold">
                  Master the Classic
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed max-w-sm mx-auto">
                  Experience the legendary Pong game with modern multiplayer features, 
                  tournaments, and real-time competitions.
                </p>
              </div>

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