import React from 'react';
import { KeyRound, ShieldAlert, ShieldCheck, ShieldAlert as ShieldWarn } from 'lucide-react';
import { HealthResponse } from '../types';
import { PQCChannelState } from '../pqcClient';

interface HealthBannerProps {
  health: HealthResponse | null;
  serverError: string | null;
  pqcState?: PQCChannelState | null;
}

export const HealthBanner: React.FC<HealthBannerProps> = ({ health, serverError, pqcState }) => {
  if (serverError) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span>
              Backend server at <code className="font-mono bg-amber-100 dark:bg-amber-950/50 px-1 py-0.5 rounded">localhost:8000</code> is currently unreachable. You can use Mock Mode to test all features.
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (health && health.api_key_configured === false) {
    return (
      <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2.5 text-xs text-red-800 dark:text-red-200">
        <div className="max-w-5xl mx-auto flex items-center gap-2.5">
          <KeyRound className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span>
            <strong>Setup Required:</strong> Google Gemini API key is missing. Set <code className="font-mono bg-red-100 dark:bg-red-950/60 px-1.5 py-0.5 rounded">GEMINI_API_KEY=your_key</code> in your backend <code className="font-mono">.env</code> file.
          </span>
        </div>
      </div>
    );
  }

  if (pqcState?.status === 'failed') {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-800 dark:text-amber-300">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldWarn className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span>
              <strong>PQC Notice:</strong> Quantum-safe handshake failed ({pqcState.errorMessage || 'Server unreachable'}). Gracefully falling back to standard HTTPS channel.
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (pqcState?.status === 'active') {
    return (
      <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-1.5 text-xs text-emerald-800 dark:text-emerald-300">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>
              <strong>Quantum-Safe Channel Active:</strong> Protected by Hybrid <strong>FIPS 203 ML-KEM-768 + X25519</strong> &amp; <strong>AES-256-GCM</strong>.
            </span>
          </div>
          {pqcState.serverFingerprint && (
            <div className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/80">
              Key Fingerprint: {pqcState.serverFingerprint}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};
