import React from 'react';
import { FileQuestion } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
      <div className="p-4 bg-slate-100 rounded-2xl text-slate-400 mb-4">
        {icon || <FileQuestion className="w-10 h-10" />}
      </div>
      
      <h3 className="text-lg font-bold text-slate-700 mb-2">
        {title}
      </h3>
      
      {description ? (
        <p className="text-sm text-slate-500 max-w-sm mb-4">
          {description}
        </p>
      ) : null}
      
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
};

export default EmptyState;
