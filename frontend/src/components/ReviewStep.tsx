import React, { useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileCode,
  FileText,
  MessageSquare,
  Sparkles,
  Stethoscope,
  User,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldX
} from 'lucide-react';
import { AnalyzeResponse, Medicine } from '../types';
import { MedicineCard } from './MedicineCard';
import { ScheduleGrid } from './ScheduleGrid';
import { LabTable } from './LabTable';
import { verifyResultSignature } from '../pqcClient';

interface ReviewStepProps {
  data: AnalyzeResponse;
  onGoToChat: (initialQuery?: string) => void;
  onOpenLinks: (index: number, kind: 'purchase' | 'images') => void;
  onOpenMap?: () => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  data,
  onGoToChat,
  onOpenLinks,
  onOpenMap,
}) => {
  const [showFullText, setShowFullText] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  const isPrescription = data.document_type === 'prescription';
  const p = data.patient;
  const rx = data.prescription;
  const lab = data.lab_report;

  const isSignatureValid = data.signature_bundle
    ? verifyResultSignature(data.session_id, data, data.signature_bundle)
    : null;

  const handleAskDetails = (med: Medicine) => {
    const q = `Explain ${med.name || 'this medicine'} ${med.strength || ''}: what it is for, how to take it, side effects and warnings.`;
    onGoToChat(q);
  };

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-8 px-4 space-y-6 pb-24 lg:pb-12">
      {/* 1. Top Validation Banner & Quality Chip & PQC Verified Badge */}
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/30 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-emerald-950 dark:text-emerald-200">
                  Valid Document: {isPrescription ? 'Medical Prescription' : 'Laboratory Diagnostic Report'}
                </h2>
                {isSignatureValid === true && (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-sm"
                    title={`Cryptographically signed and verified with ML-DSA-65 (${data.signature_bundle?.signer_fingerprint})`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
                    <span>Verified (ML-DSA-65)</span>
                  </span>
                )}
                {isSignatureValid === false && (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-200 dark:bg-red-950 text-red-900 dark:text-red-200 border border-red-400 dark:border-red-800 shadow-sm"
                    title="Cryptographic signature verification failed! Data may have been altered."
                  >
                    <ShieldX className="h-3.5 w-3.5 text-red-700 dark:text-red-300" />
                    <span>Signature Verification Failed!</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                {data.reason || 'Document structure and clinical entities identified successfully.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {data.image_quality && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-emerald-300 dark:border-emerald-800 shadow-sm">
                Quality: <strong className="capitalize">{data.image_quality}</strong>
              </span>
            )}
            <button
              type="button"
              onClick={() => onGoToChat()}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-md shadow-brand-500/20 transition-all min-h-[38px]"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Ask Healthcare Copilot</span>
            </button>
          </div>
        </div>
      </div>

      {/* Critical Red Warning if PQC Signature verification failed */}
      {isSignatureValid === false && (
        <div role="alert" className="rounded-2xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4 sm:p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldX className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-red-950 dark:text-red-200">
                Warning: Post-Quantum Integrity Check Failed
              </h3>
              <p className="text-xs text-red-800 dark:text-red-300 mt-1">
                The ML-DSA-65 digital signature returned for this consultation could not be verified against the server public key. The document payload may have been tampered with or corrupted in transit.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Needs human review prominent amber banner */}
      {data.needs_human_review && data.review_notes && data.review_notes.length > 0 && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 sm:p-5 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                Please verify highlighted items with your doctor or pharmacist
              </h3>
              <ul className="mt-2 list-disc pl-5 space-y-1 text-xs text-amber-900 dark:text-amber-300">
                {data.review_notes.map((note, idx) => (
                  <li key={idx} className="leading-relaxed">{note}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 2. Patient & Consultation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Patient card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
            <User className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <span>Patient Information</span>
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Name</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                {p.name || 'Not specified'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Age / Gender</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {p.age || '—'} &bull; {p.gender || '—'}
              </span>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Patient ID / UHID</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{p.id || 'Not recorded'}</span>
            </div>
          </div>
        </div>

        {/* Doctor & visit card / Lab facility card */}
        {isPrescription && rx ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <Stethoscope className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              <span>Doctor &amp; Visit Details</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block text-sm">
                    {rx.doctor_name || 'Clinician'}
                  </span>
                  {rx.registration_no && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Reg. No: {rx.registration_no}
                    </span>
                  )}
                </div>
                {rx.date && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    <Calendar className="h-3 w-3" />
                    {rx.date}
                  </span>
                )}
              </div>

              {rx.clinic_or_hospital && (
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 pt-1">
                  <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                  <span>{rx.clinic_or_hospital}</span>
                </div>
              )}

              {rx.diagnosis && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Diagnosis</span>
                  <p className="font-semibold text-brand-700 dark:text-brand-300">{rx.diagnosis}</p>
                </div>
              )}
            </div>
          </div>
        ) : lab ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              <span>Laboratory Facility</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block text-sm">
                  {lab.lab_name || 'Diagnostic Laboratory'}
                </span>
                {lab.referred_by && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Referred by: {lab.referred_by}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 pt-2 text-[11px] text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                {lab.collection_date && <span>Collected: {lab.collection_date}</span>}
                {lab.report_date && <span>Reported: {lab.report_date}</span>}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Map & Pharmacy Quick Action Banner */}
      <div className="rounded-2xl border border-teal-200 dark:border-teal-900/60 bg-gradient-to-r from-teal-50/90 to-cyan-50/70 dark:from-teal-950/40 dark:to-cyan-950/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-600 text-white shadow-md shadow-teal-600/20 text-lg flex-shrink-0">
            🏥
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-teal-950 dark:text-teal-100 flex items-center gap-1.5">
              <span>Need to buy these medicines or locate ICU beds?</span>
              <span className="text-[10px] bg-teal-200 dark:bg-teal-800 text-teal-900 dark:text-teal-100 px-2 py-0.5 rounded-full font-bold">Zero API Cost</span>
            </h4>
            <p className="text-xs text-teal-800 dark:text-teal-300 mt-0.5">
              Access the live high-resolution satellite map for 24x7 pharmacies, Apollo/Fortis hospitals, and live ambulance routing.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenMap ? (
            <button
              type="button"
              onClick={onOpenMap}
              className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md shadow-teal-700/20 flex items-center justify-center gap-1.5 transition-all flex-shrink-0 cursor-pointer"
            >
              <span>🗺️</span>
              <span>Open Medical Map HUD &rarr;</span>
            </button>
          ) : (
            <a
              href="/map/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md shadow-teal-700/20 flex items-center justify-center gap-1.5 transition-all flex-shrink-0"
            >
              <span>Open Medical Map HUD &rarr;</span>
            </a>
          )}
          <a
            href="/map/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl bg-teal-100 hover:bg-teal-200 dark:bg-teal-900/60 dark:hover:bg-teal-800 text-teal-800 dark:text-teal-200 text-xs font-bold transition-all flex-shrink-0"
            title="Open in new tab"
          >
            ↗
          </a>
        </div>
      </div>

      {/* 3. Prescription Medicines: Cards on mobile, Table on desktop */}
      {isPrescription && rx && rx.medicines && rx.medicines.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                <span>Prescribed Medicines ({rx.medicines.length})</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Review each drug, dose, and click Details for comprehensive guidance
              </p>
            </div>
          </div>

          {/* Mobile: Cards */}
          <div className="block lg:hidden space-y-3">
            {rx.medicines.map((med, idx) => (
              <MedicineCard
                key={idx}
                medicine={med}
                index={idx}
                onAskDetails={handleAskDetails}
                onBuyLinks={(i) => onOpenLinks(i, 'purchase')}
                onImageLinks={(i) => onOpenLinks(i, 'images')}
              />
            ))}
          </div>

          {/* Desktop: Table */}
          <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Medicine</th>
                  <th className="py-3 px-2">Strength / Form</th>
                  <th className="py-3 px-2">Dosage</th>
                  <th className="py-3 px-2">Frequency</th>
                  <th className="py-3 px-2">Duration</th>
                  <th className="py-3 px-3">Instructions</th>
                  <th className="py-3 px-2 text-center">Confidence</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {rx.medicines.map((med, idx) => {
                  const isLowConf = med.confidence === 'low' || Boolean(med.uncertain_text);
                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                        isLowConf ? 'bg-red-50/60 dark:bg-red-950/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {med.name}
                        </span>
                        {isLowConf && (
                          <span className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1 mt-0.5">
                            <AlertCircle className="h-3 w-3" />
                            <span>
                              {med.uncertain_text ? `Unclear: "${med.uncertain_text}"` : 'Confirm name'}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-2 text-xs">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{med.strength || '—'}</span>
                        {med.form && <span className="block text-slate-400 text-[11px]">{med.form}</span>}
                      </td>
                      <td className="py-3.5 px-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {med.dosage || '1 dose'}
                      </td>
                      <td className="py-3.5 px-2 text-xs font-semibold text-brand-600 dark:text-brand-400">
                        {med.frequency || '—'}
                      </td>
                      <td className="py-3.5 px-2 text-xs text-slate-600 dark:text-slate-400">
                        {med.duration || '—'}
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-300 max-w-xs">
                        {med.instructions || '—'}
                      </td>
                      <td className="py-3.5 px-2 text-center">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            med.confidence === 'high'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                              : med.confidence === 'medium'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                              : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
                          }`}
                        >
                          {med.confidence}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAskDetails(med)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium"
                            title="Explain this medicine"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenLinks(idx, 'purchase')}
                            className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-xs font-medium"
                            title="Buy links"
                          >
                            Buy
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenLinks(idx, 'images')}
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-medium"
                            title="Image links"
                          >
                            Images
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Advice & Follow-Up */}
          {(rx.advice || rx.follow_up) && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {rx.advice && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Doctor's Advice:</span>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{rx.advice}</p>
                </div>
              )}
              {rx.follow_up && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Follow-up:</span>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{rx.follow_up}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. Dosing Schedule Timeline/Grid */}
      {isPrescription && data.schedule && data.schedule.length > 0 && (
        <ScheduleGrid schedule={data.schedule} />
      )}

      {/* 5. Lab Table */}
      {!isPrescription && lab && (
        <LabTable labReport={lab} />
      )}

      {/* 6. Collapsible Developer Sections (Full transcription & Raw JSON) */}
      <div className="space-y-3 pt-2">
        {data.full_text && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowFullText(!showFullText)}
              className="w-full p-4 text-left font-semibold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" />
                <span>Full OCR Transcription</span>
              </div>
              {showFullText ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showFullText && (
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                {data.full_text}
              </div>
            )}
          </div>
        )}

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowRawJson(!showRawJson)}
            className="w-full p-4 text-left font-semibold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-slate-400" />
              <span>Raw JSON (Developer Inspection)</span>
            </div>
            {showRawJson ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showRawJson && (
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-96 overflow-y-auto">
              {JSON.stringify(data, null, 2)}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Bar on Mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-md z-40 lg:hidden shadow-lg">
        <button
          type="button"
          onClick={() => onGoToChat()}
          className="w-full py-3.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 min-h-[48px]"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Ask Healthcare Copilot</span>
        </button>
      </div>
    </div>
  );
};
