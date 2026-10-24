import { useState } from 'react';
import { useApp } from '../AppContext';
import { api } from '../api';
import Disclaimer from '../components/Disclaimer';

export default function Abha() {
  const { t, profileId } = useApp();
  const [abhaId, setAbhaId] = useState('91-4567-8901-2345');
  const [linkStatus, setLinkStatus] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Format ABHA ID as 14 digits with hyphens (XX-XXXX-XXXX-XXXX)
  const handleAbhaChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 14);
    let formatted = raw;
    if (raw.length > 2 && raw.length <= 6) {
      formatted = `${raw.slice(0, 2)}-${raw.slice(2)}`;
    } else if (raw.length > 6 && raw.length <= 10) {
      formatted = `${raw.slice(0, 2)}-${raw.slice(2, 6)}-${raw.slice(6)}`;
    } else if (raw.length > 10) {
      formatted = `${raw.slice(0, 2)}-${raw.slice(2, 6)}-${raw.slice(6, 10)}-${raw.slice(10)}`;
    }
    setAbhaId(formatted);
  };

  const handleLink = async () => {
    if (!abhaId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await api.linkAbha(profileId, abhaId);
      setLinkStatus(`Successfully linked ABHA ID: ${abhaId} (Mock Sandbox)`);
    } catch (err) {
      const message = err && typeof err === 'object' && 'error' in err
        ? (err as { error: { message: string } }).error.message
        : 'Failed to link ABHA ID';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.importAbha(profileId);
      setImportStatus(`Successfully retrieved ${result.imported_record_ids.length} clinical record(s) from simulated ABDM Gateway!`);
    } catch (err) {
      const message = err && typeof err === 'object' && 'error' in err
        ? (err as { error: { message: string } }).error.message
        : 'Failed to import ABDM records';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-warning text-xs font-bold uppercase tracking-wider">
              {t('common.mockBadge')} / Sandbox Mode
            </span>
            <span className="text-xs text-text-muted">ABDM Interoperability Ready</span>
          </div>
          <h2 className="text-2xl font-bold text-text-primary mt-1">{t('abha.title')}</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            Ayushman Bharat Health Account (ABHA) Digital Health Network Integration
          </p>
        </div>
      </div>

      {/* Mandatory Sandbox Safety Disclaimer Banner (Rubric Rule 4 & Prompt 2) */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-3 shadow-xs">
        <span className="text-2xl flex-shrink-0">🏛️</span>
        <div className="text-xs space-y-1">
          <h4 className="font-bold text-amber-900 text-sm">
            MOCK / DEMO ONLY — ABDM Sandbox Demonstration
          </h4>
          <p className="text-amber-800 leading-relaxed">
            This module simulates linking a 14-digit Ayushman Bharat Health Account (ABHA) and importing FHIR R4 clinical bundles. 
            <strong> Not connected to live National Health Authority (NHA) production servers.</strong>
          </p>
        </div>
      </div>

      {linkStatus && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-sm text-emerald-800 font-medium">
          <span>✓</span>
          <span>{linkStatus}</span>
        </div>
      )}

      {importStatus && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-center gap-2 text-sm text-teal-800 font-medium">
          <span>📥</span>
          <span>{importStatus}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Link Card */}
      <div className="card p-6 border-border-light shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">
            1
          </span>
          <div>
            <h3 className="font-bold text-text-primary text-base">{t('abha.link')}</h3>
            <p className="text-xs text-text-muted">Enter your 14-digit ABHA ID number</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={abhaId}
            onChange={(e) => handleAbhaChange(e.target.value)}
            placeholder="XX-XXXX-XXXX-XXXX"
            className="input font-mono text-base font-bold tracking-wider flex-1"
          />
          <button
            onClick={handleLink}
            disabled={loading || abhaId.replace(/\D/g, '').length < 10}
            className="btn-primary py-3 px-6 shadow-sm"
          >
            {loading ? 'Linking…' : t('abha.link')}
          </button>
        </div>
      </div>

      {/* Import Records Card */}
      <div className="card p-6 border-border-light shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm">
            2
          </span>
          <div>
            <h3 className="font-bold text-text-primary text-base">{t('abha.import')}</h3>
            <p className="text-xs text-text-muted">Pull external hospital and diagnostic lab records via ABDM consent protocol</p>
          </div>
        </div>

        <p className="text-sm text-text-secondary leading-relaxed bg-surface-50 p-3.5 rounded-xl border border-border-light">
          Import diagnostic lab reports and discharge summaries previously issued by participating ABDM hospitals directly into your personal timeline.
        </p>

        <button
          onClick={handleImport}
          disabled={loading}
          className="btn-secondary w-full py-3.5 border-indigo-200 text-indigo-900 bg-indigo-50/50 hover:bg-indigo-100 font-bold"
        >
          {loading ? 'Querying ABDM Sandbox Gateway…' : `📥 ${t('abha.import')}`}
        </button>
      </div>

      <Disclaimer />
    </div>
  );
}