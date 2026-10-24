import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { api } from '../api';
import type { WellnessResponse } from '../types';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import Disclaimer from '../components/Disclaimer';

export default function Wellness() {
  const navigate = useNavigate();
  const { profileId, activeProfile, lang } = useApp();
  const [data, setData] = useState<WellnessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getWellness(profileId);
        setData(res);
      } catch (err: any) {
        setError(err?.error?.message || 'Failed to generate personalized wellness recommendations');
      } finally {
        setLoading(false);
      }
    };
    if (profileId) {
      load();
    }
  }, [profileId]);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'DIET': return '🥗';
      case 'EXERCISE': return '🏃';
      case 'MONITORING': return '🩺';
      case 'HYDRATION': return '💧';
      case 'LIFESTYLE': return '🌙';
      default: return '🌿';
    }
  };

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'DIET': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'EXERCISE': return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'MONITORING': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'HYDRATION': return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      default: return 'bg-purple-50 text-purple-800 border-purple-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200/80 mb-2">
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
          <span>{lang === 'ta' ? 'தனிப்பயனாக்கப்பட்ட நல்வாழ்வு பரிந்துரைகள்' : 'Personalized Clinical Wellness'}</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {lang === 'ta' ? `${activeProfile?.name || 'நோயாளி'} - நல்வாழ்வு வழிகாட்டி` : `Wellness Guidance — ${activeProfile?.name || 'Patient'}`}
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm mt-0.5">
          {lang === 'ta'
            ? 'உங்கள் இரத்தப் பரிசோதனை அளவுகள் மற்றும் மருத்துவ ஆவணங்களை அடிப்படையாகக் கொண்ட வாழ்க்கை முறை ஆலோசனைகள்'
            : 'Personalized dietary, physical activity, and vital monitoring recommendations calculated from your verified clinical records.'}
        </p>
      </div>

      <Disclaimer />

      {/* ── Content ── */}
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      ) : !data || data.recommendations.length === 0 ? (
        <EmptyState
          title="No Health Data Available for Wellness Analysis"
          subtitle={`Upload a lab report or prescription for ${activeProfile?.name || 'this profile'} to receive personalized dietary, metabolic, and lifestyle recommendations.`}
          action={{
            label: 'Upload Medical Report',
            onClick: () => navigate('/upload'),
          }}
          icon="timeline"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.recommendations.map((rec) => (
            <div
              key={rec.id}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-teal-400 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{getCategoryIcon(rec.category)}</span>
                    <span className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border ${getCategoryBadgeClass(rec.category)}`}>
                      {rec.category}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm font-black text-slate-900 mb-2">
                  {rec.title}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  {rec.recommendation}
                </p>
              </div>

              {/* Explicit Grounding Rationale */}
              <div className="pt-3 border-t border-slate-100">
                <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-100 text-[11px] text-teal-900 leading-normal font-medium">
                  <span className="font-bold text-teal-950 block mb-0.5">💡 Rationale:</span>
                  {rec.why_suggested}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
