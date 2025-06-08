import React, { useState } from 'react';
import AuthLayout from './AuthLayout';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

type AuthMode = 'login' | 'register';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');

  // Configuration dynamique selon le mode
  const authConfig = {
    login: {
      title: "Welcome Back!",
      subtitle: "Sign in to access your Pong account and compete with players worldwide."
    },
    register: {
      title: "Join the Game!",
      subtitle: "Create your account and start your journey in the legendary Pong universe."
    }
  };

  // Fonctions pour switcher entre les modes
  const switchToRegister = () => setMode('register');
  const switchToLogin = () => setMode('login');

  return (
    <AuthLayout
      title={authConfig[mode].title}
      subtitle={authConfig[mode].subtitle}
    >
      {/* 🔄 Transition entre Login et Register */}
      <div className="transition-all duration-300 ease-in-out">
        {mode === 'login' ? (
          <LoginForm onSwitchToRegister={switchToRegister} />
        ) : (
          <RegisterForm onSwitchToLogin={switchToLogin} />
        )}
      </div>
    </AuthLayout>
  );
};

export default AuthPage;