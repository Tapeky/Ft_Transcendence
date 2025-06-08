import React, { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    // 🌟 Container principal avec padding et fond gris
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-100">
      
      {/* 📦 Container principal - Bloc unifié avec ombre */}
      <div className="flex w-full max-w-[1600px] h-[800px] bg-white rounded-3xl shadow-2xl overflow-hidden">
        
        {/* 📝 CÔTÉ GAUCHE - Formulaire (40%) */}
        <div className="w-full lg:w-2/5 bg-white flex items-center justify-center px-8 py-12">
          {/* 📦 Container du formulaire - Centré avec largeur max */}
          <div className="max-w-md w-full space-y-1">
            
            {/* 🎯 En-tête */}
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {title}
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                {subtitle}
              </p>
            </div>

            {/* 📋 Contenu du formulaire (injecté via children) */}
            <div className="space-y-6">
              {children}
            </div>

          </div>
        </div>

        {/* 🎨 CÔTÉ DROIT - Illustration (60%) */}
        <div className="hidden lg:flex lg:w-3/5 pl-6 pr-3 py-3 items-center justify-center">
          <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl flex items-center justify-center relative">
            
            {/* 🖼️ Container de l'illustration */}
            <div className="relative z-10 text-center text-white px-12">
              
              {/* 🏓 Illustration Pong simple et élégante */}
              <div className="mb-8">
                <div className="w-80 h-48 mx-auto relative">
                  
                  {/* 🎮 Terrain de Pong stylisé */}
                  <div className="w-full h-full border-2 border-white/20 rounded-lg relative backdrop-blur-sm bg-white/5">
                    
                    {/* ⚪ Ligne centrale */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/30 transform -translate-x-1/2"></div>
                    
                    {/* 🏓 Raquette gauche */}
                    <div className="absolute left-2 top-1/2 w-1 h-12 bg-white/80 rounded-full transform -translate-y-1/2"></div>
                    
                    {/* 🏓 Raquette droite */}
                    <div className="absolute right-2 top-1/2 w-1 h-12 bg-white/80 rounded-full transform -translate-y-1/2"></div>
                    
                    {/* ⚪ Balle */}
                    <div className="absolute left-1/3 top-1/3 w-2 h-2 bg-white rounded-full shadow-lg shadow-white/50"></div>
                    
                  </div>
                </div>
              </div>

              {/* 📝 Texte de l'illustration */}
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

            {/* 🌟 Effets visuels subtils */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl"></div>
            <div className="absolute top-20 right-20 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
            <div className="absolute bottom-20 left-20 w-24 h-24 bg-white/3 rounded-full blur-lg"></div>
            
          </div>
        </div>

      </div>
    </div>
  );
};

export default AuthLayout;