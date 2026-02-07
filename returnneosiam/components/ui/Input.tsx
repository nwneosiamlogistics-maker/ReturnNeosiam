import React, { forwardRef } from 'react';

type InputVariant = 'light' | 'dark';
type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: InputVariant;
  size?: InputSize;
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<InputVariant, string> = {
  light: 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-500/10',
  dark: 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-indigo-500/20',
};

const sizeStyles: Record<InputSize, string> = {
  sm: 'px-3 py-2 text-xs rounded-lg',
  md: 'px-4 py-3 text-sm rounded-xl',
  lg: 'px-5 py-4 text-base rounded-2xl',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  variant = 'light',
  size = 'md',
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={inputId}
          className={`block text-xs font-bold uppercase tracking-widest mb-2 px-1 ${
            variant === 'dark' ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          {label}
        </label>
      ) : null}
      
      <div className="relative">
        {leftIcon ? (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
            {leftIcon}
          </div>
        ) : null}
        
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full border
            transition-all duration-200
            focus:outline-none focus:ring-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${variantStyles[variant]}
            ${sizeStyles[size]}
            ${leftIcon ? 'pl-12' : ''}
            ${rightIcon ? 'pr-12' : ''}
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : ''}
            ${className}
          `}
          {...props}
        />
        
        {rightIcon ? (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500">
            {rightIcon}
          </div>
        ) : null}
      </div>
      
      {error ? (
        <p className="mt-1.5 text-xs text-red-500 font-medium px-1">{error}</p>
      ) : helperText ? (
        <p className={`mt-1.5 text-xs font-medium px-1 ${
          variant === 'dark' ? 'text-slate-500' : 'text-slate-400'
        }`}>
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
