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
  autoComplete?: string;
  minLength?: number;
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
  autoComplete,
  minLength
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value.length > 0;

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
        autoComplete={autoComplete}
        minLength={minLength}
        placeholder=" "
        className={`
          peer w-full px-3 pt-5 pb-2 
          border border-gray-300 rounded-lg
          transition-all duration-900
          focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
          disabled:bg-gray-50 disabled:cursor-not-allowed
          ${hasValue ? 'bg-white' : 'bg-transparent'}
        `}
      />
      
      <label
        htmlFor={id}
        className={`
          absolute left-3 
          transition-all duration-200 pointer-events-none
          ${isFocused || hasValue 
            ? 'top-2 text-xs text-gray-600' 
            : 'top-4 text-base text-gray-500'
          }
          ${isFocused ? 'text-gray-900' : ''}
        `}
      >
        {label}{required && '*'}
      </label>
    </div>
  );
};

export default FloatingInput;