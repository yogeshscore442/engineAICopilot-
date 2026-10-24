import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { api } from '../api';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import Disclaimer from '../components/Disclaimer';
import type { TimelineItem } from '../types';

export default function Timeline() {
  const { t, profileId, useMock } = useApp();
  const navigate = useNavigate();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getTimeline(profileId);
        setItems(data.items || []);
      } catch (err) {
        const message = err && typeof err === 'object' && 'error' in err
          ? (err as { error: { message: string } }).error.message
          : 'Failed to load timeline records';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profileId, useMock]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="text-2xl font-bold text-text-primary">{t('timeline.title')}</h2>
        <LoadingSkeleton type="list" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-text-primary mb-4">{t('timeline.title')}</h2>
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const filteredItems = items.filter((item) => {
    if (filterType === 'all') return true;
    return item.doc_type === filterType;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-normal text-xs">Chronological Record Feed</span>
            <span className="text-xs text-text-muted">Profile: {profileId}</span>
          </div>
          <h2 className="text-2xl font-bold text-text-primary mt-1">{t('timeline.title')}</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            Unified medical history organized across labs, prescriptions, and discharges
          </p>
        </div>

        <button
          onClick={() => navigate('/upload')}
          className="btn-primary text-sm py-2 px-4 shadow-md flex items-center gap-2"
        >
          <span>+</span>
          <span>{t('nav.upload')}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {[
          { id: 'all', label: 'All Records' },
          { id: 'lab_report', label: '🔬 Lab Reports' },
          { id: 'prescription', label: '💊 Prescriptions' },
          { id: 'discharge_summary', label: '📋 Discharge Summaries' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterType(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              filterType === f.id
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-white border border-border-light text-text-secondary hover:bg-surface-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          title={t('timeline.empty')}
          subtitle={t('timeline.emptySubtitle')}
          action={{ label: t('nav.upload'), onClick: () => navigate('/upload') }}
          
          icon="timeline"
        />
      ) : (
        /* Timeline Feed */
        <div className="relative pl-6 sm:pl-8 space-y-6">
          {/* Vertical track line */}
          <div className="absolute left-2.5 sm:left-3 top-3 bottom-3 w-0.5 bg-gradient-to-b from-primary-500 via-primary-300 to-border-light"></div>

          {filteredItems.map((item) => {
            const abnormalTests = item.tests?.filter((t) => t.flag === 'HIGH' || t.flag === 'LOW') || [];
            const isDraft = item.status === 'draft';
            const targetRoute = isDraft ? `/verify/${item.record_id}` : `/summary/${item.record_id}`;

            const docIcon =
              item.doc_type === 'prescription'
                ? '💊'
                : item.doc_type === 'discharge_summary'
                ? '📋'
                : '🔬';

            return (
              <div key={item.record_id} className="relative group">
                {/* Node icon on vertical line */}
                <div className="absolute -left-6 sm:-left-8 top-4 w-6 h-6 rounded-full bg-white border-2 border-primary-500 group-hover:scale-110 group-hover:border-primary-700 transition-all flex items-center justify-center text-xs shadow-xs">
                  {docIcon}
                </div>

                {/* Record Card */}
                <div
                  onClick={() => navigate(targetRoute)}
                  className={`card p-5 cursor-pointer hover:shadow-elevated transition-all border ${
                    isDraft ? 'border-amber-300 bg-amber-50/20' : 'border-border-light hover:border-primary-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-text-primary capitalize">
                        {item.doc_type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-text-muted">• {item.doc_date}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isDraft ? (
                        <span className="badge badge-warning text-[11px]">
                          ⚠️ {t('common.draft')} (Needs Verification)
                        </span>
                      ) : (
                        <span className="badge badge-normal text-[11px]">
                          ✓ {t('common.confirmed')}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-text-secondary mb-3 leading-relaxed">
                    {item.headline || 'Medical record document processed by AI'}
                  </p>

                  <div className="flex flex-wrap gap-2 items-center">
                    {abnormalTests.length > 0 && (
                      <span className="badge badge-high text-[11px]">
                        ▲ {abnormalTests.length} {t('timeline.abnormal')}
                      </span>
                    )}

                    {item.medicines && item.medicines.length > 0 && (
                      <span className="badge badge-normal text-[11px] bg-teal-50 text-teal-800 border-teal-200">
                        💊 {item.medicines.length} {t('timeline.medicines')}
                      </span>
                    )}

                    {item.tests && item.tests.length > 0 && (
                      <span className="badge badge-normal text-[11px] bg-sky-50 text-sky-800 border-sky-200">
                        🔬 {item.tests.length} {t('timeline.tests')}
                      </span>
                    )}

                    <span className="ml-auto text-xs font-semibold text-primary-700 group-hover:underline flex items-center gap-1">
                      {isDraft ? 'Verify Now →' : 'View Summary →'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Disclaimer />
    </div>
  );
}