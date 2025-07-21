import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import FloatingInput from './FloatingInput';
import PremiumButton from './PremiumButton';
import { apiService } from '../../services/api';
import { useNav } from '../../contexts/NavContext';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { register, loading } = useAuth();
  const { goTo } = useNav();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    display_name: '',
    data_consent: false
  });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.username || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!formData.data_consent) {
      setError('You must agree to the data processing terms');
      return;
    }

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        display_name: formData.display_name || formData.username,
        data_consent: formData.data_consent
      });
      goTo("/menu");
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Username avec Floating Label */}
      <FloatingInput
        id="username"
        name="username"
        type="text"
        value={formData.username}
        onChange={handleChange}
        label="Username"
        required
        disabled={loading}
        autoComplete="username"
      />

      {/* Email avec Floating Label */}
      <FloatingInput
        id="email"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        label="Email"
        required
        disabled={loading}
        autoComplete="email"
      />

      {/* Password avec Floating Label */}
      <FloatingInput
        id="password"
        name="password"
        type="password"
        value={formData.password}
        onChange={handleChange}
        label="Password (min. 6 characters)"
        required
        disabled={loading}
        autoComplete="new-password"
        minLength={6}
      />

      {/* Display Name avec Floating Label */}
      <div>
        <FloatingInput
          id="display_name"
          name="display_name"
          type="text"
          value={formData.display_name}
          onChange={handleChange}
          label="Display Name (optional)"
          disabled={loading}
        />
        <p className="text-xs text-gray-500 mt-1">How you'll appear to others</p>
      </div>

      {/* Checkbox GDPR */}
      <div className="flex items-start">
        <input
          id="data_consent"
          name="data_consent"
          type="checkbox"
          checked={formData.data_consent}
          onChange={handleChange}
          required
          className="mt-1 h-4 w-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
          disabled={loading}
        />
        <label htmlFor="data_consent" className="ml-2 text-sm text-gray-600">
          I agree to the processing of my personal data for the purpose of using this application*
        </label>
      </div>

      {/* Bouton d'inscription avec PremiumButton */}
      <PremiumButton
        type="submit"
        disabled={loading}
        loading={loading}
        variant="primary"
      >
        {loading ? 'Creating account...' : 'Sign Up'}
      </PremiumButton>

      {/* Séparateur */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or sign up with</span>
        </div>
      </div>

      {/* Boutons sociaux améliorés */}
      <div className="grid grid-cols-3 gap-3">
        {/* Google */}
        <button
          type="button"
          onClick={() => window.location.href = apiService.getGoogleAuthUrl()}
          disabled={loading}
          className="relative flex items-center justify-center px-4 py-2.5 
            border border-gray-300 rounded-lg bg-white
            transition-all duration-300 overflow-hidden group
            hover:border-gray-400 hover:shadow-lg hover:-translate-y-0.5
            active:translate-y-0 active:shadow-md
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {/* Fond coloré au hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-red-500 to-yellow-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>

          {/* Icône */}
          <svg className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC04" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>

          {/* Effet de brillance */}
          <div className="absolute inset-0 -top-20 -left-20 w-40 h-40 bg-white/20 rotate-45 translate-x-full group-hover:translate-x-[-250%] transition-transform duration-1000"></div>
        </button>

        {/* Meta/Facebook */}
        <button
          type="button"
          className="relative flex items-center justify-center px-4 py-2.5 
            border border-gray-300 rounded-lg bg-white
            transition-all duration-300 overflow-hidden group
            hover:border-gray-400 hover:shadow-lg hover:-translate-y-0.5
            active:translate-y-0 active:shadow-md"
        >
          {/* Fond coloré au hover */}
          <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>

          {/* Icône */}
          <svg className="w-5 h-5 relative z-10 transition-all duration-300 group-hover:scale-110 group-hover:text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>

          {/* Effet de brillance */}
          <div className="absolute inset-0 -top-20 -left-20 w-40 h-40 bg-white/20 rotate-45 translate-x-full group-hover:translate-x-[-250%] transition-transform duration-1000"></div>
        </button>

        {/* GitHub */}
        <button
          type="button"
          onClick={() => window.location.href = apiService.getGitHubAuthUrl()}
          disabled={loading}
          className="relative flex items-center justify-center px-4 py-2.5 
            border border-gray-300 rounded-lg bg-white
            transition-all duration-300 overflow-hidden group
            hover:border-gray-400 hover:shadow-lg hover:-translate-y-0.5
            active:translate-y-0 active:shadow-md
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {/* Fond coloré au hover */}
          <div className="absolute inset-0 bg-gray-900 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>

          {/* Icône */}
          <svg className="w-5 h-5 relative z-10 transition-all duration-300 group-hover:scale-110 group-hover:text-gray-900" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
          </svg>

          {/* Effet de brillance */}
          <div className="absolute inset-0 -top-20 -left-20 w-40 h-40 bg-white/20 rotate-45 translate-x-full group-hover:translate-x-[-250%] transition-transform duration-1000"></div>
        </button>
      </div>

      {/* Lien vers Login */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-medium text-gray-900 hover:text-gray-700 transition duration-200"
            disabled={loading}
          >
            Sign in
          </button>
        </p>
      </div>
    </form>
  );
};

export default RegisterForm;