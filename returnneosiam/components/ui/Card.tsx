import React from 'react';

type CardVariant = 'glass' | 'solid' | 'outline' | 'elevated';

interface CardProps {
  variant?: CardVariant;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  hoverable?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  glass: 'glass-card bg-white/70 border-white/20',
  solid: 'bg-white border border-slate-200',
  outline: 'bg-transparent border border-slate-200',
  elevated: 'bg-white border border-slate-100 shadow-xl shadow-slate-200/50',
};

export const Card: React.FC<CardProps> = ({
  variant = 'solid',
  className = '',
  children,
  onClick,
  hoverable = false,
}) => {
  const isClickable = !!onClick || hoverable;
  
  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl p-6
        transition-all duration-200 ease-out
        ${variantStyles[variant]}
        ${isClickable ? 'cursor-pointer hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/50' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  icon,
}) => {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        {icon ? (
          <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
            {icon}
          </div>
        ) : null}
        <div>
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          {subtitle ? (
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
};

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className = '',
}) => {
  return <div className={className}>{children}</div>;
};

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`mt-4 pt-4 border-t border-slate-100 ${className}`}>
      {children}
    </div>
  );
};

export default Card;
