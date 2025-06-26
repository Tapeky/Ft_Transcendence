import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './components/Auth/AuthPage';

// 🏠 Composant Dashboard simple pour les utilisateurs connectés
function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* 🎯 Header simple */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo/Titre */}
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                🏓 ft_transcendence
              </h1>
            </div>

            {/* Info utilisateur + Avatar + Logout */}
            <div className="flex items-center space-x-4">
              
              {/* Avatar simple pour test */}
              <div className="flex items-center space-x-2">
                <img 
                  src={user?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default&backgroundColor=b6e3f4'} 
                  alt="Avatar"
                  className="w-8 h-8 rounded-full border-2 border-gray-200"
                />
                <div className="text-sm text-gray-700">
                  Welcome, <span className="font-medium">{user?.display_name || user?.username}</span>!
                </div>
              </div>

              <button
                onClick={logout}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition duration-200"
              >
                Sign out
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* 📊 Contenu principal */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        
        {/* 🎮 Section principale */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6">
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Dashboard
            </h2>
            
            {/* 📈 Stats utilisateur */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {user?.total_wins || 0}
                </div>
                <div className="text-sm text-blue-800">Wins</div>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {user?.total_losses || 0}
                </div>
                <div className="text-sm text-red-800">Losses</div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {user?.total_games || 0}
                </div>
                <div className="text-sm text-green-800">Total Games</div>
              </div>

            </div>

            {/* 🎯 Actions rapides */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                
                <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition duration-200">
                  <div className="text-center">
                    <div className="text-2xl mb-2">🏓</div>
                    <div className="font-medium">Play Pong</div>
                    <div className="text-sm text-gray-500">Start a quick game</div>
                  </div>
                </button>
                
                <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition duration-200">
                  <div className="text-center">
                    <div className="text-2xl mb-2">🏆</div>
                    <div className="font-medium">Tournaments</div>
                    <div className="text-sm text-gray-500">Join competitions</div>
                  </div>
                </button>
                
                <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition duration-200">
                  <div className="text-center">
                    <div className="text-2xl mb-2">👥</div>
                    <div className="font-medium">Friends</div>
                    <div className="text-sm text-gray-500">Manage connections</div>
                  </div>
                </button>

              </div>
            </div>

            {/* ℹ️ Info de développement */}
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">🚧 Development Info</h4>
              <p className="text-sm text-yellow-700">
                Tu es maintenant connecté avec succès ! Les fonctionnalités du jeu (Pong, tournois, etc.) 
                seront implémentées dans les prochaines étapes du projet ft_transcendence.
              </p>
              <div className="mt-2 text-xs text-yellow-600">
                <strong>User ID:</strong> {user?.id} | 
                <strong> Email:</strong> {user?.email} | 
                <strong> Online:</strong> {user?.is_online ? '🟢' : '🔴'}
              </div>
            </div>

          </div>
        </div>

      </main>

    </div>
  );
}

// 🔄 Composant principal avec logique d'authentification
function MainApp() {
  const { isAuthenticated, loading, user } = useAuth();

  // 🔄 État de chargement
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // ✅ Utilisateur connecté → Dashboard
  if (isAuthenticated && user) {
    return <Dashboard />;
  }

  // ❌ Utilisateur non connecté → AuthPage
  return <AuthPage />;
}

// 🎯 App principal avec AuthProvider
function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;