import React from 'react';

type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';
type SpinnerVariant = 'primary' | 'white' | 'slate';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  className?: string;
}

const sizeStyles: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3',
  xl: 'w-12 h-12 border-4',
};

const variantStyles: Record<SpinnerVariant, string> = {
  primary: 'border-indigo-200 border-t-indigo-600',
  white: 'border-white/30 border-t-white',
  slate: 'border-slate-200 border-t-slate-600',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'primary',
  className = '',
}) => {
  return (
    <div
      className={`
        rounded-full animate-spin
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${className}
      `}
      role="status"
      aria-label="กำลังโหลด"
    >
      <span className="sr-only">กำลังโหลด...</span>
    </div>
  );
};

interface LoadingOverlayProps {
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'กำลังโหลด...',
}) => {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
        <LoadingSpinner size="xl" />
        <p className="text-slate-600 font-medium">{message}</p>
      </div>
    </div>
  );
};

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
}) => {
  const baseStyles = 'animate-pulse bg-slate-200';
  
  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
  };

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${className}`} />
  );
};

export default LoadingSpinner;
