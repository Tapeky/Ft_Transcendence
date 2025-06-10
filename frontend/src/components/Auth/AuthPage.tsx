import React, { useState } from 'react';
import AuthLayout from './AuthLayout';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

type AuthMode = 'login' | 'register';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [isTransitioning, setIsTransitioning] = useState(false);

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

  // Transition améliorée avec délai
  const switchMode = (newMode: AuthMode) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setMode(newMode);
      setIsTransitioning(false);
    }, 150);
  };

  const switchToRegister = () => switchMode('register');
  const switchToLogin = () => switchMode('login');

  return (
    <AuthLayout
      title={authConfig[mode].title}
      subtitle={authConfig[mode].subtitle}
    >
      {/* 🔄 Transition entre Login et Register avec fade */}
      <div className={`transition-all duration-300 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
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