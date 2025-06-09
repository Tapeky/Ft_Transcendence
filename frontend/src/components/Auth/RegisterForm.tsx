import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import FloatingInput from './FloatingInput';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { register, loading } = useAuth();

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

      {/* Bouton d'inscription */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0"
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Creating account...
          </div>
        ) : (
          'Sign Up'
        )}
      </button>

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
          className="relative flex items-center justify-center px-4 py-2.5 
            border border-gray-300 rounded-lg bg-white
            transition-all duration-300 overflow-hidden group
            hover:border-gray-400 hover:shadow-lg hover:-translate-y-0.5
            active:translate-y-0 active:shadow-md"
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

        {/* Apple */}
        <button
          type="button"
          className="relative flex items-center justify-center px-4 py-2.5 
            border border-gray-300 rounded-lg bg-white
            transition-all duration-300 overflow-hidden group
            hover:border-gray-400 hover:shadow-lg hover:-translate-y-0.5
            active:translate-y-0 active:shadow-md"
        >
          {/* Fond coloré au hover */}
          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>

          {/* Icône */}
          <svg className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
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