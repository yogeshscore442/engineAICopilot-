import React, { useState } from 'react';
import {
  CalendarPlus,
  Check,
  Copy,
  Download,
  FileCheck2,
  Printer,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  ShieldX,
  Lock,
  FileKey
} from 'lucide-react';
import { ScheduleRow, SignatureBundle } from '../types';
import { downloadCalendarFile } from '../utils/calendar';
import { SafeMarkdown } from '../utils/markdown';
import { verifyResultSignature, pqcFetch } from '../pqcClient';

interface SummaryStepProps {
  summaryText: string;
  schedule: ScheduleRow[];
  sessionId?: string;
  signatureBundle?: SignatureBundle;
  onStartNewDocument: () => void;
  onOpenMap?: () => void;
}

export const SummaryStep: React.FC<SummaryStepProps> = ({
  summaryText,
  schedule,
  sessionId,
  signatureBundle,
  onStartNewDocument,
  onOpenMap,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloadedIcs, setDownloadedIcs] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Validate ML-DSA-65 Signature if present
  const isSignatureValid = signatureBundle && sessionId
    ? verifyResultSignature(sessionId, { summary: summaryText }, signatureBundle)
    : null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback
    }
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clinical_summary_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSignedBundle = () => {
    const bundle = {
      summary: summaryText,
      session_id: sessionId,
      signature_bundle: signatureBundle,
      exported_at: new Date().toISOString(),
      instructions: "To verify offline: decode signature with server ML-DSA-65 public key against commitment HC-VERIFY-V1|session_id|timestamp|data_digest."
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `signed_clinical_summary_${new Date().toISOString().split('T')[0]}.pqc.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSecureExport = async () => {
    if (!sessionId || !exportPassphrase) return;
    setExportLoading(true);
    try {
      const res = await pqcFetch('/pqc/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          passphrase: exportPassphrase,
        })
      });
      if (!res.ok) throw new Error('Export request failed');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename || `encrypted_record_${Date.now()}.pqcenc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        setShowExportModal(false);
        setExportPassphrase('');
      }, 2500);
    } catch (e) {
      alert(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setExportLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAddReminders = () => {
    downloadCalendarFile(schedule);
    setDownloadedIcs(true);
    setTimeout(() => setDownloadedIcs(false), 3000);
  };

  const hasScheduleReminders = schedule && schedule.some((r) => r.parsed && !r.as_needed);

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8 px-4 space-y-6">
      {/* Top Completion Header */}
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/30 p-5 text-center shadow-sm">
        <div className="inline-flex p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 mb-2">
          <FileCheck2 className="h-7 w-7" />
        </div>
        
        <div className="flex items-center justify-center gap-2 flex-wrap mb-1">
          <h2 className="text-lg sm:text-xl font-bold text-emerald-950 dark:text-emerald-200">
            Clinical Consultation Summary
          </h2>
          {isSignatureValid === true && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-sm"
              title={`Digital signature verified via ML-DSA-65 (${signatureBundle?.signer_fingerprint})`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
              <span>Verified (ML-DSA-65)</span>
            </span>
          )}
          {isSignatureValid === false && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-200 dark:bg-red-950 text-red-900 dark:text-red-200 border border-red-400 dark:border-red-800 shadow-sm"
              title="Cryptographic verification failed"
            >
              <ShieldX className="h-3.5 w-3.5 text-red-700 dark:text-red-300" />
              <span>Verification Failed</span>
            </span>
          )}
        </div>

        <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 mt-1">
          Review your finalized instructions, download cryptographic verification proof, or save calendar alerts
        </p>

        {/* Action bar */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs font-semibold shadow-sm transition-all min-h-[40px]"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Text'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadTxt}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs font-semibold shadow-sm transition-all min-h-[40px]"
          >
            <Download className="h-4 w-4" />
            <span>Download .txt</span>
          </button>

          {signatureBundle && (
            <button
              type="button"
              onClick={handleDownloadSignedBundle}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold shadow-sm transition-all min-h-[40px]"
              title="Download summary bundle with offline ML-DSA-65 signature"
            >
              <FileKey className="h-4 w-4" />
              <span>Signed Bundle (.sig)</span>
            </button>
          )}

          {sessionId && (
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 text-xs font-semibold shadow-sm transition-all min-h-[40px]"
              title="Secure encrypted export for sharing with doctor"
            >
              <Lock className="h-4 w-4" />
              <span>Encrypted Export</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs font-semibold shadow-sm transition-all min-h-[40px]"
          >
            <Printer className="h-4 w-4" />
            <span>Print Report</span>
          </button>

          {hasScheduleReminders && (
            <button
              type="button"
              onClick={handleAddReminders}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition-all min-h-[40px]"
            >
              {downloadedIcs ? <Check className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />}
              <span>{downloadedIcs ? 'Calendar .ics Downloaded' : 'Add Reminders (.ics)'}</span>
            </button>
          )}

          {onOpenMap ? (
            <button
              type="button"
              onClick={onOpenMap}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-md shadow-teal-600/20 transition-all min-h-[40px] cursor-pointer"
              title="Navigate to nearest 24/7 pharmacies, ICU beds, and hospitals"
            >
              <span>🏥</span>
              <span>Hospital &amp; Pharmacy Map</span>
            </button>
          ) : (
            <a
              href="/map/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-md shadow-teal-600/20 transition-all min-h-[40px]"
              title="Navigate to nearest 24/7 pharmacies, ICU beds, and hospitals"
            >
              <span>🏥</span>
              <span>Hospital &amp; Pharmacy Map</span>
            </a>
          )}
        </div>

        {hasScheduleReminders && (
          <p className="mt-3 text-[11px] text-emerald-800 dark:text-emerald-400">
            * Reminder times default to Morning 08:00, Afternoon 14:00, Evening 18:00, Night 21:00. You can adjust them in your calendar app.
          </p>
        )}
      </div>

      {/* Rendered Summary Document */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm print:border-none print:shadow-none">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
            <Sparkles className="h-5 w-5" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Structured Summary Record</h3>
          </div>
          {signatureBundle && (
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
              Fingerprint: {signatureBundle.signer_fingerprint.slice(0, 22)}...
            </span>
          )}
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed">
          <SafeMarkdown content={summaryText} />
        </div>
      </div>

      {/* Secure Encrypted Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Quantum-Safe Encrypted Export</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Encrypt medical record with AES-256-GCM + PBKDF2</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Create a password-protected export bundle to share securely with your physician or store offline. Only someone with this passphrase can decrypt the document.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Decryption Passphrase
              </label>
              <input
                type="password"
                placeholder="Enter strong passphrase..."
                value={exportPassphrase}
                onChange={(e) => setExportPassphrase(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!exportPassphrase || exportLoading}
                onClick={handleSecureExport}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-md disabled:opacity-50"
              >
                {exportLoading ? 'Encrypting...' : exportSuccess ? 'Downloaded!' : 'Generate Encrypted Export'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start New Document Button */}
      <div className="pt-4 text-center print:hidden">
        <button
          type="button"
          onClick={onStartNewDocument}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 min-h-[44px]"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Upload New Medical Document</span>
        </button>
      </div>
    </div>
  );
};
