import React from 'react';
import { AlertTriangle, RefreshCw, XCircle } from 'lucide-react';
import { ApiError } from '../api';

interface ErrorBannerProps {
  error: Error | ApiError | string | null;
  onDismiss?: () => void;
  onRetry?: () => void;
  onResetSession?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  error,
  onDismiss,
  onRetry,
  onResetSession,
}) => {
  if (!error) return null;

  const isApiError = error instanceof ApiError;
  const message = typeof error === 'string' ? error : error.message;
  const reason = isApiError ? error.reason : undefined;
  const isSessionExpired = isApiError && error.isSessionExpired;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/90 dark:bg-red-950/40 p-4 shadow-sm backdrop-blur transition-all my-3"
    >
      <div className="flex items-start gap-3">
        <div className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1 text-sm">
          <h4 className="font-semibold text-red-900 dark:text-red-200">
            {isSessionExpired ? 'Session Expired' : 'Unable to complete action'}
          </h4>
          <p className="mt-1 text-red-800 dark:text-red-300 leading-relaxed">{message}</p>
          {reason && (
            <p className="mt-1 text-xs text-red-700 dark:text-red-400 bg-red-100/60 dark:bg-red-900/30 p-2 rounded-md font-mono">
              Reason: {reason}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {isSessionExpired && onResetSession && (
              <button
                type="button"
                onClick={onResetSession}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white font-medium text-xs hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 min-h-[36px]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Upload Document Again
              </button>
            )}
            {!isSessionExpired && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white font-medium text-xs hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 min-h-[36px]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try Again
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 font-medium text-xs hover:bg-red-100 dark:hover:bg-red-900/30 min-h-[36px]"
              >
                <XCircle className="h-3.5 w-3.5" />
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
