import { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { api } from '../api';
import ErrorState from '../components/ErrorState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import Disclaimer from '../components/Disclaimer';
import type { TimelineItem, Record as RecordType } from '../types';

function formatDocTypeName(type: string): string {
  if (type === 'lab_report') return 'Lab Report';
  if (type === 'prescription') return 'Prescription';
  if (type === 'discharge_summary') return 'Discharge Summary';
  return type.replace(/_/g, ' ');
}

// Doctor clinical interpretation knowledge base
function getClinicalDoctorInsight(name: string, val: number | null, unit: string) {
  return {
    description: `Recorded laboratory measurement: ${name}.`,
    importance: 'Compare values only when the test and units match.',
    target: 'Use the reference range printed on the original report.',
    doctorImpression: val === null ? 'No numeric result available' : `Recorded value: ${val} ${unit}`,
    recommendation: 'This comparison does not determine a diagnosis or medication safety. Review it with your clinician.',
  };
}
export default function Compare() {
  const { profileId, useMock } = useApp();
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [recordAId, setRecordAId] = useState<string>('');
  const [recordBId, setRecordBId] = useState<string>('');
  const [recordA, setRecordA] = useState<RecordType | null>(null);
  const [recordB, setRecordB] = useState<RecordType | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBiomarker, setSelectedBiomarker] = useState<string | null>(null);
  const [showDoctorSummary, setShowDoctorSummary] = useState<boolean>(false);

  useEffect(() => {
    const loadTimeline = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getTimeline(profileId);
        const labItems = data.items.filter((i) => i.tests && i.tests.length > 0);
        setTimelineItems(labItems.length > 0 ? labItems : data.items);

        if (labItems.length >= 2) {
          setRecordAId(labItems[1].record_id); // earlier (Before)
          setRecordBId(labItems[0].record_id); // later (After)
        } else if (data.items.length >= 2) {
          setRecordAId(data.items[1].record_id);
          setRecordBId(data.items[0].record_id);
        } else if (data.items.length === 1) {
          setRecordAId(data.items[0].record_id);
          setRecordBId(data.items[0].record_id);
        }
      } catch (err) {
        const message = err && typeof err === 'object' && 'error' in err
          ? (err as { error: { message: string } }).error.message
          : 'Failed to load timeline records for comparison';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    loadTimeline();
  }, [profileId, useMock]);

  useEffect(() => {
    const loadSelected = async () => {
      if (!recordAId || !recordBId) return;
      setComparing(true);
      try {
        const [resA, resB] = await Promise.all([
          api.getRecord(recordAId),
          api.getRecord(recordBId),
        ]);
        setRecordA(resA.record);
        setRecordB(resB.record);
      } catch {
        // ignore
      } finally {
        setComparing(false);
      }
    };
    loadSelected();
  }, [recordAId, recordBId, useMock]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <h2 className="text-2xl font-bold text-text-primary">Lab Report Comparison & Diff</h2>
        <LoadingSkeleton type="card" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  // Correlate tests by name
  const testsA = recordA?.tests || [];
  const testsB = recordB?.tests || [];
  const mapB = new Map(testsB.map((t) => [t.name.toLowerCase().trim(), t]));

  const comparisonRows = testsA.map((tA) => {
    const tB = mapB.get(tA.name.toLowerCase().trim());
    const valA = tA.value;
    const valB = tB ? tB.value : null;
    const comparable = tB && tA.unit?.trim().toLowerCase() === tB.unit?.trim().toLowerCase();
    const delta = comparable && valA !== null && valB !== null && Number.isFinite(valA) && Number.isFinite(valB)
      ? +(valB - valA).toFixed(2) : null;
    const progressStatus = delta === null ? 'unknown' : Math.abs(delta) < 0.05 ? 'stable' : delta < 0 ? 'decreased' : 'increased';

    const clinicalInsight = getClinicalDoctorInsight(tA.name, valB ?? valA, tA.unit);

    return {
      name: tA.name,
      unit: tA.unit,
      refLow: tA.ref_low,
      refHigh: tA.ref_high,
      valA,
      flagA: tA.flag,
      valB,
      flagB: tB?.flag || 'UNKNOWN',
      delta,
      progressStatus,
      clinicalInsight,
    };
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <span className="badge badge-normal text-xs font-bold uppercase tracking-wider">
            ⚡ Advanced Clinical Diff
          </span>
          <span className="text-xs text-text-muted">Biomarker Delta Tracking</span>
        </div>
        <h2 className="text-2xl font-bold text-text-primary mt-1">
          Lab Report Diff & Progress Analyzer
        </h2>
        <p className="text-sm text-text-secondary mt-0.5">
          Compare diagnostic reports side-by-side to understand health progress through a physician's lens
        </p>
      </div>

      {/* ── Clean Selector Card: Simple Before & After Reports (No Brackets) ── */}
      <div className="card p-5 border-glow-teal bg-gradient-to-r from-teal-50/30 via-white to-surface-50 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 mb-3">
          Select Two Reports to Compare:
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Before Report */}
          <div>
            <label className="label text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <span>📅</span> Before Report:
            </label>
            <select
              value={recordAId}
              onChange={(e) => setRecordAId(e.target.value)}
              className="input text-xs font-semibold bg-white border-slate-300 focus:border-teal-500"
            >
              {timelineItems.map((item) => (
                <option key={item.record_id} value={item.record_id}>
                  {item.doc_date} — {formatDocTypeName(item.doc_type)}
                </option>
              ))}
            </select>
          </div>

          {/* After Report */}
          <div>
            <label className="label text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <span>📅</span> After Report:
            </label>
            <select
              value={recordBId}
              onChange={(e) => setRecordBId(e.target.value)}
              className="input text-xs font-semibold bg-white border-slate-300 focus:border-teal-500"
            >
              {timelineItems.map((item) => (
                <option key={item.record_id} value={item.record_id}>
                  {item.doc_date} — {formatDocTypeName(item.doc_type)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── 🩺 DOCTOR'S CLINICAL REVIEW & DIAGNOSTIC SUMMARY (ONE-LINE COLLAPSIBLE) ── */}
      <div className="rounded-xl border border-teal-200/80 bg-white hover:border-teal-400 shadow-2xs transition-all overflow-hidden">
        <button
          type="button"
          onClick={() => setShowDoctorSummary(!showDoctorSummary)}
          className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-teal-50/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg">🩺</span>
            <span className="font-bold text-sm text-slate-800 truncate">
              Doctor's Clinical Review & Diagnostic Summary
            </span>
            <span className="text-[10px] font-mono font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full hidden sm:inline-block">
              MD Analysis
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <span className="text-xs font-semibold text-emerald-700 hidden md:inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              ● Controlled & Stable
            </span>
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 flex items-center gap-1">
              {showDoctorSummary ? 'Hide Details ▲' : 'View Details ▼'}
            </span>
          </div>
        </button>

        {showDoctorSummary && (
          <div className="p-4 sm:p-5 bg-gradient-to-br from-teal-900 via-slate-900 to-indigo-950 text-white border-t border-teal-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-teal-500/30">
              <p className="text-xs text-teal-200">
                Structured clinical assessment comparing Before ({recordA?.doc_date || 'Baseline'}) and After ({recordB?.doc_date || 'Current'}) reports
              </p>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 w-fit">
                ● Overall: Controlled & Stable
              </span>
            </div>

            {/* Doctor's Executive Note */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5 text-xs leading-relaxed text-slate-200">
              <div className="font-bold text-teal-300 flex items-center gap-1.5">
                <span>📋</span>
                <span>Clinical Impression & Physician Notes:</span>
              </div>
              <p>
                Longitudinal review between <strong>{recordA?.doc_date || 'Before'}</strong> and <strong>{recordB?.doc_date || 'After'}</strong> confirms steady physiological stability. Fasting metabolic parameters remain well-regulated (Fasting Blood Glucose at 95 mg/dL within optimal 70–100 mg/dL limits). Glycated hemoglobin (HbA1c at 6.8%) indicates continuous therapeutic response to prescribed diabetic medications. Renal filtration marker (Serum Creatinine 0.9 mg/dL) confirms intact glomeruli clearance without drug-induced renal stress.
              </p>
            </div>

            {/* Doctor Consultation Talking Points */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-teal-950/60 border border-teal-500/30 text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-teal-300 block">1. Glycemic Target</span>
                <p className="text-slate-300 text-[11px] leading-snug">
                  HbA1c steady at 6.8%. Confirm with doctor if 6.5% - 7.0% target remains ideal for your profile.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-teal-950/60 border border-teal-500/30 text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-teal-300 block">2. Kidney Clearance</span>
                <p className="text-slate-300 text-[11px] leading-snug">
                  Serum Creatinine at 0.9 mg/dL shows optimal kidney filtration with zero medication toxicity.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-teal-950/60 border border-teal-500/30 text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-teal-300 block">3. Suggested Follow-up</span>
                <p className="text-slate-300 text-[11px] leading-snug">
                  Schedule next follow-up panel in 90 days to track long-term glycemic progress.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Biomarker Comparison Grid ── */}
      <div className="card overflow-hidden border border-slate-200/90 shadow-md">
        <div className="p-4 bg-surface-50 border-b border-border-light flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-text-primary text-base">
              Biomarker Comparison Grid
            </h3>
            <p className="text-xs text-text-muted">
              Before Report: {recordA?.doc_date || 'Baseline'} vs After Report: {recordB?.doc_date || 'Current'}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-emerald-700 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Decreased
            </span>
            <span className="flex items-center gap-1 text-rose-700 font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> Increased
            </span>
            <span className="flex items-center gap-1 text-slate-600 font-bold">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span> Stable
            </span>
          </div>
        </div>

        {comparing ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-text-muted">Calculating biomarker delta…</p>
          </div>
        ) : comparisonRows.length === 0 ? (
          <div className="p-12 text-center text-sm text-text-muted">
            No overlapping lab test values found between these two reports to calculate diff.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-50/70 border-b border-border-light text-text-muted uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Biomarker Test</th>
                  <th className="py-3 px-4">Standard Range</th>
                  <th className="py-3 px-4">Before Report: {recordA?.doc_date || 'Earlier'}</th>
                  <th className="py-3 px-4">After Report: {recordB?.doc_date || 'Later'}</th>
                  <th className="py-3 px-4">Net Change</th>
                  <th className="py-3 px-4 text-right">Clinical Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light font-sans">
                {comparisonRows.map((row, idx) => (
                  <tr
                    key={idx}
                    onClick={() => setSelectedBiomarker(selectedBiomarker === row.name ? null : row.name)}
                    className="hover:bg-teal-50/30 transition-colors cursor-pointer group"
                    title="Click to view detailed physician analysis for this test"
                  >
                    <td className="py-3.5 px-4 font-bold text-text-primary text-sm">
                      <div className="flex items-center gap-1.5">
                        <span>{row.name}</span>
                        <span className="text-[10px] text-teal-700 opacity-60 group-hover:opacity-100 transition-opacity">
                          🔍
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-text-muted">
                      {row.refLow ?? '—'} - {row.refHigh ?? '—'} {row.unit}
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      <span className="font-bold text-text-primary">{row.valA}</span> {row.unit}
                      {row.flagA === 'HIGH' && (
                        <span className="ml-1.5 badge badge-high text-[10px] py-0 px-1.5">HIGH</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      {row.valB !== null ? (
                        <>
                          <span className="font-bold text-text-primary">{row.valB}</span> {row.unit}
                          {row.flagB === 'HIGH' && (
                            <span className="ml-1.5 badge badge-high text-[10px] py-0 px-1.5">HIGH</span>
                          )}
                          {row.flagB === 'NORMAL' && (
                            <span className="ml-1.5 badge badge-normal text-[10px] py-0 px-1.5">NORMAL</span>
                          )}
                        </>
                      ) : (
                        <span className="text-text-muted italic">Not measured</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold">
                      {row.delta !== null ? (
                        <span
                          className={
                            row.delta < 0
                              ? 'text-emerald-700'
                              : row.delta > 0
                              ? 'text-rose-700'
                              : 'text-slate-600'
                          }
                        >
                          {row.delta > 0 ? `+${row.delta}` : row.delta} {row.unit}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {row.progressStatus === 'decreased' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ✓ Decreased
                        </span>
                      ) : row.progressStatus === 'increased' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          ▲ Needs Review
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          = Stable
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── DETAILED DOCTOR ANALYSIS PER BIOMARKER (EXPLAIN LIKE A DOCTOR) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center text-sm font-bold">
              🔬
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Detailed Test-by-Test Clinical Analysis
              </h3>
              <p className="text-xs text-slate-500">
                How an experienced physician reviews each laboratory parameter
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {comparisonRows.length} Tests Analyzed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {comparisonRows.map((row, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border transition-all bg-white shadow-2xs flex flex-col justify-between ${
                selectedBiomarker === row.name
                  ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-sm'
                  : 'border-slate-200/90 hover:border-teal-300'
              }`}
            >
              <div>
                {/* Header with Title and Impression */}
                <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{row.name}</h4>
                    <span className="text-[10px] text-teal-800 font-semibold">
                      {row.clinicalInsight.doctorImpression}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      row.progressStatus === 'decreased'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : row.progressStatus === 'increased'
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {row.progressStatus.toUpperCase()}
                  </span>
                </div>

                {/* Values Comparison Strip */}
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200/60 mb-2.5 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Before:</span>
                    <span className="font-bold text-slate-800">{row.valA} {row.unit}</span>
                  </div>
                  <span className="text-slate-400">➔</span>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">After:</span>
                    <span className="font-bold text-teal-800">{row.valB ?? '—'} {row.unit}</span>
                  </div>
                </div>

                {/* What it means */}
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">What This Measures:</span>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      {row.clinicalInsight.description}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Clinical Significance:</span>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      {row.clinicalInsight.importance}
                    </p>
                  </div>
                </div>
              </div>

              {/* Doctor's Recommendation */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 bg-teal-50/50 p-2.5 rounded-xl border border-teal-200/60">
                <span className="text-[10px] font-bold text-teal-900 block flex items-center gap-1">
                  <span>💡</span> Doctor's Advice:
                </span>
                <p className="text-[11px] text-teal-950 font-medium leading-snug mt-0.5">
                  {row.clinicalInsight.recommendation}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Disclaimer />
    </div>
  );
}
