// Créer un nouveau composant FloatingInput.tsx
import React, { useState } from 'react';

interface FloatingInputProps {
  id: string;
  name: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

const FloatingInput: React.FC<FloatingInputProps> = ({
  id,
  name,
  type,
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  error
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value.length > 0;
  const shouldFloat = isFocused || hasValue;

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        required={required}
        disabled={disabled}
        className={`
          peer w-full px-3 pt-6 pb-2 
          border rounded-lg transition-all duration-200
          ${error 
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
            : 'border-gray-300 focus:border-gray-900 focus:ring-gray-900'
          }
          focus:outline-none focus:ring-2 focus:ring-offset-0
          disabled:bg-gray-50 disabled:cursor-not-allowed
        `}
        placeholder=" "
      />
      
      {/* Label flottant */}
      <label
        htmlFor={id}
        className={`
          absolute left-3 transition-all duration-200 pointer-events-none
          ${shouldFloat 
            ? 'top-2 text-xs' 
            : 'top-4 text-base'
          }
          ${isFocused 
            ? 'text-gray-900' 
            : error 
              ? 'text-red-500' 
              : 'text-gray-500'
          }
        `}
      >
        {label}{required && '*'}
      </label>
      
      {/* Message d'erreur */}
      {error && (
        <p className="mt-1 text-xs text-red-500 animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
};

export default FloatingInput;