import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { EmergencyProfileOut } from '../types/sos';

type EmergencySosModalProps = {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
};

export default function EmergencySosModal({ isOpen, onClose, profileId }: EmergencySosModalProps) {
  const [emergencyProfile, setEmergencyProfile] = useState<EmergencyProfileOut | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api.getEmergencyProfile(profileId)
      .then((res) => setEmergencyProfile(res))
      .catch(() => {
        // Fallback gracefully to default
        setEmergencyProfile(null);
      })
      .finally(() => setLoading(false));
  }, [isOpen, profileId]);

  if (!isOpen) return null;

  const firstContact = emergencyProfile?.ice_contacts?.[0] || {
    name: 'National Emergency Helpline',
    phone: '112',
    relation: 'National Emergency',
  };

  const primaryCondition = emergencyProfile?.conditions?.[0] || 'None documented';
  const allergy = emergencyProfile?.conditions?.find(c => c.toLowerCase().includes('allerg')) || 'None reported';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl modal-glow-popup p-6 text-slate-900 border-2 border-red-500 shadow-2xl overflow-hidden bg-white">
        {/* Red Flashing Top Banner */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 animate-pulse" />

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-xl bg-red-600 flex items-center justify-center text-white text-xl shadow-lg shadow-red-500/30 border border-red-400 animate-bounce">
              🚨
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                  Emergency Medical HUD
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900">Critical Emergency Panel</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Patient Emergency Card Header */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-red-50 to-rose-100/60 border border-red-200 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-slate-600 font-bold">Patient Name:</p>
              <h4 className="text-sm font-extrabold text-slate-900">
                {loading ? 'Fetching records...' : (emergencyProfile?.name || 'Verified Patient')}
              </h4>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-black text-xs shadow-sm">
                Blood group: {emergencyProfile?.blood_group || 'Not specified'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-red-200/80">
            <div>
              <span className="text-[10px] uppercase font-bold text-red-700">Allergies / Flags:</span>
              <p className="font-extrabold text-red-950 truncate">{allergy}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-600">Chronic Diagnosis:</span>
              <p className="font-extrabold text-slate-900 truncate">{primaryCondition}</p>
            </div>
          </div>
        </div>

        {/* Instant Rapid Call Actions */}
        <div className="space-y-2 mb-4">
          <a
            href="tel:108"
            className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black tracking-wide flex items-center justify-center gap-2 shadow-md shadow-red-600/25 transition-all"
          >
            <span>🚑</span> Call Ambulance (108 Free Emergency)
          </a>
          <a
            href={`tel:${firstContact.phone.replace(/\s+/g, '')}`}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <span>📞</span> Call ICE: {firstContact.name} ({firstContact.phone})
          </a>
        </div>

        {/* Full Card Link */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <Link
            to={`/emergency/${profileId}`}
            onClick={onClose}
            className="text-xs font-bold text-red-600 hover:text-red-800 underline flex items-center gap-1"
          >
            View Complete Emergency QR & Medical Card →
          </Link>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

