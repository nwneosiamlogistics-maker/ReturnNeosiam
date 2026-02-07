import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

type SelectVariant = 'light' | 'dark';
type SelectSize = 'sm' | 'md' | 'lg';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  variant?: SelectVariant;
  size?: SelectSize;
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
}

const variantStyles: Record<SelectVariant, string> = {
  light: 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 focus:ring-indigo-500/10',
  dark: 'bg-white/5 border-white/10 text-white focus:border-indigo-500 focus:ring-indigo-500/20',
};

const sizeStyles: Record<SelectSize, string> = {
  sm: 'px-3 py-2 text-xs rounded-lg',
  md: 'px-4 py-3 text-sm rounded-xl',
  lg: 'px-5 py-4 text-base rounded-2xl',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  variant = 'light',
  size = 'md',
  label,
  error,
  helperText,
  options,
  placeholder,
  className = '',
  id,
  ...props
}, ref) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={selectId}
          className={`block text-xs font-bold uppercase tracking-widest mb-2 px-1 ${
            variant === 'dark' ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          {label}
        </label>
      ) : null}

      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={`
            w-full border appearance-none
            transition-all duration-200
            focus:outline-none focus:ring-2
            disabled:opacity-50 disabled:cursor-not-allowed
            cursor-pointer
            pr-10
            ${variantStyles[variant]}
            ${sizeStyles[size]}
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : ''}
            ${className}
          `}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>

        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <ChevronDown className={`w-4 h-4 ${variant === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
        </div>
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

Select.displayName = 'Select';

export default Select;
