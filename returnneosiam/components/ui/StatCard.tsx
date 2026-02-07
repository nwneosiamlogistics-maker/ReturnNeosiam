import React from 'react';

type StatCardVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: StatCardVariant;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const variantStyles: Record<StatCardVariant, {
  bg: string;
  text: string;
  icon: string;
  subtitle: string;
}> = {
  default: {
    bg: 'bg-white border-slate-200',
    text: 'text-slate-800',
    icon: 'bg-slate-100 text-slate-600',
    subtitle: 'text-slate-500',
  },
  primary: {
    bg: 'bg-gradient-to-br from-indigo-600 to-indigo-700 border-transparent',
    text: 'text-white',
    icon: 'bg-white/20 text-white',
    subtitle: 'text-indigo-200',
  },
  success: {
    bg: 'bg-gradient-to-br from-emerald-500 to-teal-600 border-transparent',
    text: 'text-white',
    icon: 'bg-white/20 text-white',
    subtitle: 'text-emerald-200',
  },
  warning: {
    bg: 'bg-gradient-to-br from-amber-400 to-orange-500 border-transparent',
    text: 'text-white',
    icon: 'bg-white/20 text-white',
    subtitle: 'text-amber-100',
  },
  danger: {
    bg: 'bg-gradient-to-br from-red-500 to-rose-600 border-transparent',
    text: 'text-white',
    icon: 'bg-white/20 text-white',
    subtitle: 'text-red-200',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  trend,
  className = '',
}) => {
  const styles = variantStyles[variant];
  const isDark = variant !== 'default';

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl p-6 border
        transition-all duration-200 ease-out
        hover:shadow-lg hover:-translate-y-1
        cursor-pointer
        ${styles.bg}
        ${className}
      `}
    >
      {/* Background decoration for gradient variants */}
      {isDark ? (
        <>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-black opacity-10 rounded-full -ml-8 -mb-8 blur-xl" />
        </>
      ) : null}

      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1">
          <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${styles.subtitle}`}>
            {title}
          </p>
          <h3 className={`text-3xl font-black tracking-tight ${styles.text}`}>
            {value}
          </h3>
          {subtitle ? (
            <p className={`text-sm mt-1 ${styles.subtitle}`}>{subtitle}</p>
          ) : null}
          
          {trend ? (
            <div className={`flex items-center gap-1 mt-2 text-sm font-semibold ${
              trend.isPositive ? 'text-emerald-500' : 'text-red-500'
            }`}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          ) : null}
        </div>

        {icon ? (
          <div className={`p-3 rounded-xl ${styles.icon}`}>
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default StatCard;
