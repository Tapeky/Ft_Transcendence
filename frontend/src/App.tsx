import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './components/Auth/AuthPage';
import { Navigate } from 'react-router-dom';



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
    return <Navigate to="/dashboard" />;
    //return <Dashboard/>;
  }

  // ❌ Utilisateur non connecté → AuthPage
  return <Navigate to="/" />;
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