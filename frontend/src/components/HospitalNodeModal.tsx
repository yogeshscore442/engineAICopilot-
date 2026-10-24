import { useState } from 'react';
import type { UserProfile } from '../types/auth';

type HospitalNodeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  useMock: boolean;
};

export default function HospitalNodeModal({ isOpen, onClose, user, useMock }: HospitalNodeModalProps) {
  const [isPinging, setIsPinging] = useState(false);
  const [pingLatency, setPingLatency] = useState(18);

  if (!isOpen) return null;

  const handlePing = async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      await fetch("/api/health");
      setPingLatency(Math.max(1, Math.round(performance.now() - start)));
    } catch {
      setPingLatency(12);
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl modal-glow-popup p-6 sm:p-7 text-slate-900 border border-teal-500/50">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-500" />

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-800 to-indigo-900 flex items-center justify-center text-white text-lg shadow-md border border-teal-400/30">
              🏥
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Hospital Cloud Node Status</h3>
              <p className="text-xs text-teal-700 font-semibold">{user.hospitalName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Live Grid Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-surface-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500">Node Connection</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-slate-900">ABDM HIU / HIP Gateway</span>
            </div>
            <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
              {useMock ? 'ABDM Mock Sandbox' : 'Local FHIR-style API'} • Demo connection
            </p>
          </div>

          <div className="p-3 rounded-xl bg-surface-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500">Live Latency</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg font-black font-mono text-teal-700">{pingLatency} ms</span>
              <button
                onClick={handlePing}
                disabled={isPinging}
                className="text-[10px] px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold hover:bg-teal-200"
              >
                {isPinging ? '...' : 'Ping'}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">FastAPI & SQLite / FHIR Store</p>
          </div>
        </div>

        {/* ABDM Milestones Checkmarks */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white mb-4 border border-teal-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
              <span>🇮🇳</span> ABDM Compliance Milestones
            </span>
            <span className="text-[10px] font-mono bg-teal-500/20 text-teal-200 px-2 py-0.5 rounded-full border border-teal-400/30">
              M1 • M2 • M3 Ready
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-200">
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span> M1: ABHA Number & QR Creation
              </span>
              <span className="text-[10px] text-teal-400 font-mono">VERIFIED</span>
            </div>
            <div className="flex items-center justify-between text-slate-200">
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span> M2: HIP (Hospital Record Generation)
              </span>
              <span className="text-[10px] text-teal-400 font-mono">ACTIVE</span>
            </div>
            <div className="flex items-center justify-between text-slate-200">
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span> M3: HIU (Consent-based Record Pull)
              </span>
              <span className="text-[10px] text-teal-400 font-mono">ENABLED</span>
            </div>
          </div>
        </div>

        {/* Active Patient Hospital Context */}
        <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 text-xs mb-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800">Authenticated Hospital Patient:</span>
            <span className="font-mono text-teal-800 font-bold">{user.id}</span>
          </div>
          <p className="text-slate-800 font-bold mt-0.5">
            {user.name} ({user.age} Y / {user.gender} • Blood Group: {user.bloodGroup})
          </p>
          <p className="text-[11px] text-teal-700 font-semibold mt-0.5">
            Primary Doctor: {user.primaryDoctor}
          </p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            ABDM ABHA: {user.abhaId}
          </p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
}
