import { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { api } from '../api';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import type { Alert } from '../types';

export default function Alerts() {
  const { t, profileId, useMock } = useApp();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getAlerts(profileId);
        setAlerts(data.alerts || []);
      } catch (err) {
        const message = err && typeof err === 'object' && 'error' in err
          ? (err as { error: { message: string } }).error.message
          : 'Failed to load alerts';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profileId, useMock]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-text-primary mb-4">{t('medicines.alertTitle')}</h2>
        <LoadingSkeleton type="list" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-text-primary mb-4">{t('medicines.alertTitle')}</h2>
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-text-primary mb-4">{t('medicines.alertTitle')}</h2>
        <EmptyState title="No alerts" subtitle="No duplicate medicines or conflicts found" icon="medicine" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-text-primary mb-4">{t('medicines.alertTitle')}</h2>

      <div className="space-y-4">
        {alerts.map((alert, i) => (
          <div key={i} className="card p-5 border-warning-border bg-warning-bg/50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning-bg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-warning-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-warning-text mb-1">{t('medicines.alertTitle')}</h3>
                <p className="text-sm text-warning-text mb-3">{alert.message}</p>
                <div className="space-y-2">
                  {alert.medicines.map((med, j) => (
                    <div key={j} className="flex items-center justify-between p-2 bg-white rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{med.name_raw}</p>
                        <p className="text-xs text-text-muted">{med.generic}</p>
                      </div>
                      <span className="text-xs text-text-muted">Record: {alert.record_ids[j]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}