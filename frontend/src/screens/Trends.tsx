import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { useApp } from '../AppContext';
import { api } from '../api';
import ErrorState from '../components/ErrorState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import Disclaimer from '../components/Disclaimer';
import type { TrendsResponse } from '../types';

const COMMON_TESTS = [
  { name: 'HbA1c', unit: '%', normalLow: 4.0, normalHigh: 5.6, description: 'Glycated Hemoglobin - 3-month average blood glucose' },
  { name: 'Fasting Blood Sugar', unit: 'mg/dL', normalLow: 70, normalHigh: 99, description: 'Fasting Blood Glucose level' },
  { name: 'Postprandial Blood Sugar', unit: 'mg/dL', normalLow: 90, normalHigh: 140, description: 'Post-meal Blood Glucose level' },
  { name: 'LDL Cholesterol', unit: 'mg/dL', normalLow: 50, normalHigh: 100, description: 'Low-Density Lipoprotein (bad cholesterol)' },
  { name: 'Serum Creatinine', unit: 'mg/dL', normalLow: 0.7, normalHigh: 1.3, description: 'Kidney filtration biomarker' },
];

export default function Trends() {
  const { t, profileId, useMock } = useApp();
  const [selectedTestName, setSelectedTestName] = useState('HbA1c');
  const [data, setData] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeTestMeta = useMemo(() => COMMON_TESTS.find((ct) => ct.name === selectedTestName) || {
    name: selectedTestName,
    unit: data?.unit || '%',
    normalLow: 4.0,
    normalHigh: 5.6,
    description: 'Biomarker clinical trend analytics',
  }, [selectedTestName, data?.unit]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.getTrends(profileId, selectedTestName);
        setData(result);
      } catch (err) {
        const message = err && typeof err === 'object' && 'error' in err
          ? (err as { error: { message: string } }).error.message
          : 'Failed to load biomarker trends';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profileId, selectedTestName, useMock]);

  const yDomain = useMemo(() => {
    if (!data || data.points.length === 0) return [0, 10];
    const vals = data.points.map((p) => p.value);
    const minVal = Math.min(...vals, activeTestMeta.normalLow);
    const maxVal = Math.max(...vals, activeTestMeta.normalHigh);
    const pad = (maxVal - minVal) * 0.25 || 1;
    return [Math.max(0, Math.floor(minVal - pad)), Math.ceil(maxVal + pad)];
  }, [data, activeTestMeta]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="text-2xl font-bold text-text-primary">{t('trends.title')}</h2>
        <LoadingSkeleton type="card" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-text-primary mb-4">{t('trends.title')}</h2>
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const points = data?.points || [];
  const latestPoint = points[points.length - 1];
  const earliestPoint = points[0];
  const isImproving =
    latestPoint && earliestPoint && points.length > 1
      ? latestPoint.value < earliestPoint.value
      : false;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">{t('trends.title')}</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            Historical laboratory values and longitudinal progress tracking
          </p>
        </div>

        {points.length > 1 && (
          <span
            className={`badge text-xs px-3 py-1 ${
              isImproving
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}
          >
            {isImproving ? '📉 Values decreased — clinical meaning varies' : '📈 Tracked Values'}
          </span>
        )}
      </div>

      {/* Test Selector Tabs / Dropdown */}
      <div className="card p-4 space-y-3">
        <label className="label font-bold text-text-primary">{t('trends.selectTest')}</label>
        <div className="flex flex-wrap gap-2">
          {COMMON_TESTS.map((tItem) => (
            <button
              key={tItem.name}
              onClick={() => setSelectedTestName(tItem.name)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                selectedTestName === tItem.name
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-surface-100 text-text-secondary hover:bg-surface-200'
              }`}
            >
              {tItem.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-text-muted mt-1">{activeTestMeta.description}</p>
      </div>

      {/* Recharts Analytics Card */}
      <div className="card p-6 border-border-light shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-border-light gap-2">
          <div>
            <h3 className="font-bold text-lg text-text-primary">
              {selectedTestName} Trend Line
            </h3>
            <span className="text-xs text-text-muted">
              Green shaded band indicates standard clinical normal range ({activeTestMeta.normalLow} - {activeTestMeta.normalHigh} {activeTestMeta.unit})
            </span>
          </div>

          {latestPoint && (
            <div className="text-right">
              <span className="text-xs text-text-muted block">Latest Value ({latestPoint.date}):</span>
              <span className="text-xl font-bold text-text-primary">
                {latestPoint.value} {activeTestMeta.unit}
              </span>
            </div>
          )}
        </div>

        {points.length === 0 ? (
          <div className="text-center py-12 text-sm text-text-muted">
            No historical data points found for {selectedTestName}. Upload more lab reports to build a timeline.
          </div>
        ) : (
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 15, right: 25, bottom: 15, left: 0 }}>
                {/* Normal Reference Zone Shading */}
                <ReferenceArea
                  y1={activeTestMeta.normalLow}
                  y2={activeTestMeta.normalHigh}
                  fill="#10b981"
                  fillOpacity={0.12}
                  stroke="#10b981"
                  strokeOpacity={0.3}
                  strokeDasharray="4 4"
                />

                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return isNaN(d.getTime()) ? val : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  }}
                />

                <YAxis
                  domain={yDomain}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  unit={` ${activeTestMeta.unit}`}
                />

                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const pt = payload[0].payload;
                      const isHigh = pt.flag === 'HIGH';
                      const isLow = pt.flag === 'LOW';
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
                          <p className="font-bold text-slate-300">{pt.date}</p>
                          <p className="text-sm font-extrabold text-teal-300">
                            {pt.value} {activeTestMeta.unit}
                          </p>
                          <p className={`font-semibold ${isHigh ? 'text-rose-400' : isLow ? 'text-blue-400' : 'text-emerald-400'}`}>
                            Status: {pt.flag}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#0d9488"
                  strokeWidth={3}
                  activeDot={{ r: 8, stroke: '#0f766e', strokeWidth: 2, fill: '#ffffff' }}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const fill =
                      payload.flag === 'HIGH'
                        ? '#dc2626'
                        : payload.flag === 'LOW'
                        ? '#2563eb'
                        : '#16a34a';
                    return <circle cx={cx} cy={cy} r={5} fill={fill} stroke="#ffffff" strokeWidth={2} />;
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Historical Data Table */}
      {points.length > 0 && (
        <div className="card p-5 border-border-light shadow-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
            Recorded Measurement History
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-light text-text-muted">
                  <th className="py-2">Date</th>
                  <th className="py-2">Recorded Value</th>
                  <th className="py-2">Clinical Classification</th>
                  <th className="py-2">Record ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {points.map((pt, i) => (
                  <tr key={i} className="hover:bg-surface-50 transition-colors">
                    <td className="py-2.5 font-medium text-text-primary">{pt.date}</td>
                    <td className="py-2.5 font-bold text-text-primary">
                      {pt.value} {activeTestMeta.unit}
                    </td>
                    <td className="py-2.5">
                      {pt.flag === 'HIGH' ? (
                        <span className="badge badge-high text-[10px]">▲ HIGH</span>
                      ) : pt.flag === 'LOW' ? (
                        <span className="badge badge-low text-[10px]">▼ LOW</span>
                      ) : (
                        <span className="badge badge-normal text-[10px]">✓ NORMAL</span>
                      )}
                    </td>
                    <td className="py-2.5 font-mono text-[11px] text-text-muted">
                      {pt.record_id || `rec-${i + 1}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Disclaimer />
    </div>
  );
}
