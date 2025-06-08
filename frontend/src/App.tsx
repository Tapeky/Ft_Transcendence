import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Composant de test qui utilise useAuth
function TestAuth() {
  const { user, isAuthenticated, loading, login, logout } = useAuth();

  if (loading) {
    return <div>🔄 Chargement...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>❌ Pas connecté</h2>
        <button 
          onClick={() => login({ 
            email: 'alice@test.com', 
            password: 'alice123' 
          })}
        >
          🔐 Test Login Alice
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>✅ Connecté !</h2>
      <p>👤 Utilisateur: {user?.username}</p>
      <p>📧 Email: {user?.email}</p>
      <p>🏆 Victoires: {user?.total_wins}</p>
      <button onClick={logout}>
        🚪 Déconnexion
      </button>
    </div>
  );
}

// App avec le Provider
function App() {
  return (
    <AuthProvider>
      <TestAuth />
    </AuthProvider>
  );
}

export default App;