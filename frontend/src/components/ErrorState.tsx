import { useApp } from '../AppContext';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useApp();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-error-bg flex items-center justify-center mb-4 shadow-sm">
        <svg className="w-8 h-8 text-error-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">{t('common.error')}</h3>
      <p className="text-sm text-text-secondary mb-6 max-w-md">
        {message || t('common.error')}
      </p>
      <div className="flex items-center gap-3 flex-wrap justify-center">
        {onRetry && (
          <button onClick={onRetry} className="btn-primary text-sm py-2 px-4 shadow-sm">
            ↻ {t('common.retry')}
          </button>
        )}
        
      </div>
    </div>
  );
}