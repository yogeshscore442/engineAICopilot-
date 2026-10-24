import { type ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  icon?: 'upload' | 'timeline' | 'medicine' | 'search';
}

const icons: Record<string, ReactNode> = {
  upload: (
    <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-600 shadow-sm">
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5h12a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 18.75 4.5H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    </div>
  ),
  timeline: (
    <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-600 shadow-sm">
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    </div>
  ),
  medicine: (
    <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-sm">
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h.75m9 0h3.75m-3.75 0v3.75m0-3.75H18" />
      </svg>
    </div>
  ),
  search: (
    <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shadow-sm">
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    </div>
  ),
};

export default function EmptyState({ title, subtitle, action, secondaryAction, icon = 'upload' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center rounded-3xl bg-gradient-to-b from-white via-surface-50 to-teal-50/20 border border-slate-200/80 shadow-sm max-w-lg mx-auto">
      <div className="relative mb-4">
        {icons[icon]}
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-teal-500 animate-ping opacity-75"></span>
      </div>
      
      <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{title}</h3>
      {subtitle && <p className="text-sm text-slate-500 mt-2 max-w-sm leading-relaxed">{subtitle}</p>}
      
      <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
        {action && (
          <button 
            onClick={action.onClick} 
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm shadow-md shadow-teal-600/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            {action.label}
          </button>
        )}
        {secondaryAction && (
          <button 
            onClick={secondaryAction.onClick} 
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-sm shadow-2xs transition-all cursor-pointer hover:border-teal-400"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}