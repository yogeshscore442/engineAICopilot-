import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { api } from '../api';
import Disclaimer from '../components/Disclaimer';
import ErrorState from '../components/ErrorState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import type { Record, Medicine, Test } from '../types';

export default function Verify() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, useMock } = useApp();
  const [record, setRecord] = useState<Record | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBbox, setShowBbox] = useState(true);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fileBlobUrl, setFileBlobUrl] = useState<string | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<'doc' | 'fields'>('fields');

  useEffect(() => {
    let cancelled = false;
    let previewUrl: string | null = null;
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const data = await api.getRecord(id);
        if (cancelled) return;
        setFileBlobUrl(null);
        if ('error' in data.record && data.record.error) throw { error: { message: 'Extraction failed. Please retry the upload.' } };
        setRecord(data.record);

        // Try to load original file for preview if live
        try {
          const blob = await api.getRecordFile(id);
          if (!cancelled && blob && blob.size > 100 && blob.type.startsWith('image/')) {
            const url = URL.createObjectURL(blob);
            previewUrl = url;
            setFileBlobUrl(url);
          }
        } catch {
          // fallback to simulated document scan
        }
      } catch (err) {
        const message = err && typeof err === 'object' && 'error' in err
          ? (err as { error: { message: string } }).error.message
          : 'Failed to load record for verification';
        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();

    return () => {
      cancelled = true;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [id, useMock]);

  const needsReviewIds = useMemo(() => new Set(Array.isArray(record?.needs_review) ? record.needs_review : []), [record]);

  const isLowConfidence = (confidence: number) => confidence < 0.7;

  const updateMedicine = (index: number, field: keyof Medicine, value: any) => {
    if (!record) return;
    const updated = [...(record.medicines || [])];
    updated[index] = { ...updated[index], [field]: value };
    setRecord({ ...record, medicines: updated });
  };

  const updateTest = (index: number, field: keyof Test, value: any) => {
    if (!record) return;
    const updated = [...(record.tests || [])];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate flag based on reference range
    if (field === 'value' || field === 'ref_low' || field === 'ref_high') {
      const val = field === 'value' ? parseFloat(value) : updated[index].value;
      const low = field === 'ref_low' ? parseFloat(value) : updated[index].ref_low;
      const high = field === 'ref_high' ? parseFloat(value) : updated[index].ref_high;
      if (val !== undefined && low !== null && high !== null) {
        if (val < low) updated[index].flag = 'LOW';
        else if (val > high) updated[index].flag = 'HIGH';
        else updated[index].flag = 'NORMAL';
      }
    }

    setRecord({ ...record, tests: updated });
  };

  const handleSave = async () => {
    if (!record || !id) return;
    setSaving(true);
    try {
      const payloadRecord = {
        ...record,
        medicines: record.medicines || [],
        tests: record.tests || [],
        diagnoses: record.diagnoses || [],
      };
      await api.confirmRecord(id, payloadRecord);
      navigate(`/summary/${id}`);
    } catch (err) {
      const message = err && typeof err === 'object' && 'error' in err
        ? (err as { error: { message: string } }).error.message
        : 'Failed to confirm and save record';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="h-8 w-64 bg-surface-200 rounded animate-pulse mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LoadingSkeleton type="card" />
          <LoadingSkeleton type="list" />
        </div>
      </div>
    );
  }

  if (error && !record) {
    return (
      <div className="max-w-4xl mx-auto">
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (!record) return null;

  // Collect all bounding boxes
  const allBboxes: Array<{ id: string; label: string; bbox: [number, number, number, number]; isWarning: boolean }> = [];
  (record.medicines || []).forEach((m, idx) => {
    if (m.bbox) {
      allBboxes.push({
        id: `med-${idx}`,
        label: m.name_raw,
        bbox: m.bbox as [number, number, number, number],
        isWarning: needsReviewIds.has(`medicines[${idx}]`) || isLowConfidence(m.confidence),
      });
    }
  });
  (record.tests || []).forEach((tItem, idx) => {
    if (tItem.bbox) {
      allBboxes.push({
        id: `test-${idx}`,
        label: tItem.name,
        bbox: tItem.bbox as [number, number, number, number],
        isWarning: needsReviewIds.has(`tests[${idx}]`) || isLowConfidence(tItem.confidence) || tItem.flag === 'HIGH' || tItem.flag === 'LOW',
      });
    }
  });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-warning text-xs">AI Extracted • Unconfirmed</span>
            <span className="text-xs text-text-muted capitalize">Doc: {record.doc_type.replace('_', ' ')}</span>
          </div>
          <h2 className="text-2xl font-bold text-text-primary mt-1">{t('verify.title')}</h2>
          <p className="text-sm text-text-secondary mt-0.5">{t('verify.subtitle')}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary text-sm py-2 px-3"
          >
            ← {t('common.back')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-sm py-2 px-4 shadow-md"
          >
            {saving ? 'Saving…' : `✓ ${t('verify.confirmSave')}`}
          </button>
        </div>
      </div>

      {/* Human in the loop callout banner */}
      <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
        <span className="text-xl">⚠️</span>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-amber-900">Human-In-The-Loop Verification Required</h4>
          <p className="text-xs text-amber-800 mt-0.5">
            AI medical extraction must be verified by you before entering your permanent timeline. 
            Highlighted fields with low confidence (&lt; 70%) or warnings need your review. Click any value to edit.
          </p>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden mb-4 rounded-lg bg-surface-100 p-1 border border-border-light">
        <button
          onClick={() => setActiveMobileTab('fields')}
          className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
            activeMobileTab === 'fields' ? 'bg-white shadow text-primary-700' : 'text-text-muted'
          }`}
        >
          Extracted Fields ({(record.medicines?.length || 0) + (record.tests?.length || 0)})
        </button>
        <button
          onClick={() => setActiveMobileTab('doc')}
          className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
            activeMobileTab === 'doc' ? 'bg-white shadow text-primary-700' : 'text-text-muted'
          }`}
        >
          Original Document & Regions
        </button>
      </div>

      {/* Two Column Layout (Document on Left, Extracted Fields on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Document & Bounding Box Viewer */}
        <div className={`lg:col-span-5 ${activeMobileTab === 'fields' ? 'hidden lg:block' : 'block'}`}>
          <div className="card sticky top-20 overflow-hidden border border-border-light shadow-md bg-white">
            <div className="px-4 py-3 bg-surface-50 border-b border-border-light flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-500"></span>
                <span className="text-xs font-bold text-text-primary uppercase tracking-wide">
                  {t('verify.document')}
                </span>
              </div>
              <button
                onClick={() => setShowBbox(!showBbox)}
                className="text-xs font-medium text-primary-700 hover:text-primary-900 bg-primary-50 px-2 py-1 rounded"
              >
                {showBbox ? 'Hide AI BBoxes' : 'Show AI BBoxes'}
              </button>
            </div>

            {/* Document Surface with Interactive Overlays */}
            <div className="relative bg-slate-900/5 min-h-[460px] p-4 flex flex-col justify-center items-center overflow-hidden">
              {fileBlobUrl ? (
                <div className="relative max-w-full">
                  <img src={fileBlobUrl} alt="Original Document" className="w-full h-auto rounded shadow-sm" />
                </div>
              ) : (
                /* Simulated Clinical Document Scan Rendering */
                <div className="relative w-full max-w-md bg-white rounded-lg p-5 shadow-sm border border-slate-200 text-[11px] font-sans leading-relaxed select-none">
                  {/* Header */}
                  <div className="border-b border-slate-200 pb-2 mb-3 flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-800 text-xs">APOLLO HOSPITALS & HEALTHCARE</div>
                      <div className="text-[10px] text-slate-500">Clinical Department • OPD Summary</div>
                    </div>
                    <div className="text-right text-[10px] text-slate-500">
                      <div>Date: {record.doc_date || '2024-06-15'}</div>
                      <div>ID: {id?.slice(0, 8)}</div>
                    </div>
                  </div>

                  {/* Diagnoses block in scan */}
                  {record.diagnoses && record.diagnoses.length > 0 && (
                    <div className="mb-3 bg-slate-50 p-2 rounded border border-slate-100">
                      <span className="font-bold text-slate-700">Diagnosis: </span>
                      <span className="text-slate-900 font-semibold">{record.diagnoses.map(d => d.text || (d as any).name || '').filter(Boolean).join(', ')}</span>
                    </div>
                  )}

                  {/* Medicines block in scan */}
                  {record.medicines && record.medicines.length > 0 && (
                    <div className="mb-3">
                      <div className="font-bold text-slate-700 mb-1">Prescribed Rx:</div>
                      <div className="space-y-1 font-mono text-[10px]">
                        {record.medicines.map((m, idx) => (
                          <div
                            key={idx}
                            id={`doc-med-${idx}`}
                            className={`p-1.5 rounded transition-all ${
                              activeHighlight === `med-${idx}`
                                ? 'bg-amber-100 border border-amber-400 font-bold'
                                : 'bg-slate-50 border border-slate-100 text-slate-700'
                            }`}
                          >
                            <span className="text-primary-700 font-bold">Rx {idx + 1}: </span>
                            {m.name_raw} {m.strength || ''} — {m.schedule_raw || '1-0-1'} ({m.food_instruction || 'after food'})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lab Tests block in scan */}
                  {record.tests && record.tests.length > 0 && (
                    <div>
                      <div className="font-bold text-slate-700 mb-1">Investigation Report:</div>
                      <table className="w-full text-left text-[10px] font-mono border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="py-1">Test Name</th>
                            <th className="py-1">Result</th>
                            <th className="py-1">Ref Range</th>
                          </tr>
                        </thead>
                        <tbody>
                          {record.tests.map((tItem, idx) => (
                            <tr
                              key={idx}
                              id={`doc-test-${idx}`}
                              className={`border-b border-slate-100 transition-all ${
                                activeHighlight === `test-${idx}`
                                  ? 'bg-amber-100 font-bold'
                                  : ''
                              }`}
                            >
                              <td className="py-1">{tItem.name}</td>
                              <td className="py-1 font-bold">
                                {tItem.value} {tItem.unit}
                              </td>
                              <td className="py-1 text-slate-500">
                                {tItem.ref_low} - {tItem.ref_high}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Document Footer stamp */}
                  <div className="mt-4 pt-2 border-t border-slate-200 flex justify-between text-[9px] text-slate-400">
                    <span>Verified Electronic Medical Document</span>
                    <span>Page 1 of 1</span>
                  </div>
                </div>
              )}

              {/* Bounding Box Visualizer Legend */}
              {showBbox && (
                <div className="mt-3 w-full max-w-md bg-white/90 backdrop-blur-xs p-2 rounded-lg border border-border-light text-[11px] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-emerald-700 font-medium">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> High Conf
                    </span>
                    <span className="flex items-center gap-1 text-amber-700 font-medium">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span> Review (&lt; 70%)
                    </span>
                  </div>
                  <span className="text-text-muted text-[10px]">Hover field to highlight</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Extracted Editable Fields */}
        <div className={`lg:col-span-7 space-y-6 ${activeMobileTab === 'doc' ? 'hidden lg:block' : 'block'}`}>
          
          {/* Medicines Section */}
          {record.medicines && record.medicines.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide flex items-center gap-2">
                  <span>💊</span>
                  <span>{t('verify.medicine')}s ({record.medicines.length})</span>
                </h3>
                <span className="text-xs text-text-muted">Click any value to correct</span>
              </div>

              {record.medicines.map((med, i) => {
                const isNeedsReview = needsReviewIds.has(`medicines[${i}]`) || isLowConfidence(med.confidence);
                const isHighlighted = activeHighlight === `med-${i}`;

                return (
                  <div
                    key={i}
                    onMouseEnter={() => setActiveHighlight(`med-${i}`)}
                    onMouseLeave={() => setActiveHighlight(null)}
                    className={`card p-4 transition-all duration-200 ${
                      isHighlighted
                        ? 'ring-2 ring-primary-500 shadow-md'
                        : isNeedsReview
                        ? 'ring-2 ring-amber-400 bg-amber-50/20'
                        : 'border-border-light'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-surface-100 text-text-secondary">
                          Rx #{i + 1}
                        </span>
                        {isNeedsReview && (
                          <span className="badge badge-warning text-[11px] py-0.5">
                            ⚠️ {t('verify.needsReview')}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-text-muted">AI Confidence:</span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            med.confidence >= 0.8
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {Math.round(med.confidence * 100)}%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="label">{t('verify.name')} (Brand Name)</label>
                        <input
                          className="input text-sm"
                          value={med.name_raw}
                          onChange={(e) => updateMedicine(i, 'name_raw', e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="label">{t('verify.generic')} Active Salt</label>
                        <input
                          className="input text-sm"
                          value={med.generic || ''}
                          placeholder="e.g. Paracetamol"
                          onChange={(e) => updateMedicine(i, 'generic', e.target.value || null)}
                        />
                      </div>

                      <div>
                        <label className="label">{t('verify.strength')}</label>
                        <input
                          className="input text-sm"
                          value={med.strength || ''}
                          placeholder="e.g. 500 mg"
                          onChange={(e) => updateMedicine(i, 'strength', e.target.value || null)}
                        />
                      </div>

                      <div>
                        <label className="label">{t('verify.schedule')} (Raw notation)</label>
                        <input
                          className="input text-sm"
                          value={med.schedule_raw || ''}
                          placeholder="e.g. 1-0-1"
                          onChange={(e) => updateMedicine(i, 'schedule_raw', e.target.value || null)}
                        />
                      </div>

                      <div>
                        <label className="label">{t('verify.food')} Timing</label>
                        <select
                          className="input text-sm"
                          value={med.food_instruction || ''}
                          onChange={(e) => updateMedicine(i, 'food_instruction', e.target.value === '' ? null : e.target.value)}
                        >
                          <option value="">No food restriction (—)</option>
                          <option value="before_food">{t('medicines.beforeFood')}</option>
                          <option value="after_food">{t('medicines.afterFood')}</option>
                        </select>
                      </div>

                      <div>
                        <label className="label">{t('verify.duration')} (Days)</label>
                        <input
                          type="number"
                          className="input text-sm"
                          value={med.duration_days || 0}
                          onChange={(e) => updateMedicine(i, 'duration_days', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Lab Tests Section */}
          {record.tests && record.tests.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide flex items-center gap-2">
                  <span>🔬</span>
                  <span>{t('verify.test')}s ({record.tests.length})</span>
                </h3>
                <span className="text-xs text-text-muted">Flags calculated from reference values</span>
              </div>

              {record.tests.map((test, i) => {
                const isNeedsReview = needsReviewIds.has(`tests[${i}]`) || isLowConfidence(test.confidence);
                const isHighlighted = activeHighlight === `test-${i}`;

                return (
                  <div
                    key={i}
                    onMouseEnter={() => setActiveHighlight(`test-${i}`)}
                    onMouseLeave={() => setActiveHighlight(null)}
                    className={`card p-4 transition-all duration-200 ${
                      isHighlighted
                        ? 'ring-2 ring-primary-500 shadow-md'
                        : isNeedsReview
                        ? 'ring-2 ring-amber-400 bg-amber-50/20'
                        : 'border-border-light'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-text-primary">{test.name}</span>
                        {test.flag === 'HIGH' && (
                          <span className="badge badge-high text-[11px] py-0.5">▲ HIGH</span>
                        )}
                        {test.flag === 'LOW' && (
                          <span className="badge badge-low text-[11px] py-0.5">▼ LOW</span>
                        )}
                        {test.flag === 'NORMAL' && (
                          <span className="badge badge-normal text-[11px] py-0.5">✓ NORMAL</span>
                        )}
                        {isNeedsReview && (
                          <span className="badge badge-warning text-[11px] py-0.5">
                            ⚠️ {t('verify.needsReview')}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-text-muted">Confidence:</span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            test.confidence >= 0.8
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {Math.round(test.confidence * 100)}%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="label">{t('verify.value')}</label>
                        <input
                          type="number"
                          step="0.01"
                          className="input text-sm font-bold"
                          value={test.value}
                          onChange={(e) => updateTest(i, 'value', e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="label">{t('verify.unit')}</label>
                        <input
                          className="input text-sm"
                          value={test.unit}
                          onChange={(e) => updateTest(i, 'unit', e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="label">{t('verify.refRange')} Low</label>
                        <input
                          type="number"
                          step="0.01"
                          className="input text-sm"
                          value={test.ref_low ?? ''}
                          onChange={(e) => updateTest(i, 'ref_low', e.target.value)}
                          placeholder="e.g. 4.0"
                        />
                      </div>

                      <div>
                        <label className="label">{t('verify.refRange')} High</label>
                        <input
                          type="number"
                          step="0.01"
                          className="input text-sm"
                          value={test.ref_high ?? ''}
                          onChange={(e) => updateTest(i, 'ref_high', e.target.value)}
                          placeholder="e.g. 5.6"
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="label">{t('verify.explanation')} (Plain Language Note)</label>
                      <input
                        className="input text-sm"
                        value={test.explanation_en || ''}
                        placeholder="Plain-language explanation for patients…"
                        onChange={(e) => updateTest(i, 'explanation_en', e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Diagnoses Section */}
          {record.diagnoses.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide flex items-center gap-2">
                <span>📋</span>
                <span>{t('verify.diagnosis')}s</span>
              </h3>
              <div className="space-y-2">
                {record.diagnoses.map((d, i) => (
                  <div key={i} className="card p-3 flex items-center justify-between bg-surface-50 border-border-light">
                    <span className="text-sm font-semibold text-text-primary">{d.text}</span>
                    <span className="text-xs text-text-muted">AI Conf: {Math.round(d.confidence * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save & Confirm Action Bar */}
          <div className="pt-4 border-t border-border-light flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary w-full sm:w-auto flex-1 py-3.5 text-base font-bold shadow-lg shadow-primary-600/20"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Confirming & Saving Record…
                </span>
              ) : (
                `✓ ${t('verify.confirmSave')}`
              )}
            </button>
            <button
              onClick={() => navigate(-1)}
              className="btn-secondary w-full sm:w-auto py-3.5 text-sm"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>

      {/* Non-Dismissible Fixed Medical Disclaimer */}
      <div className="mt-10">
        <Disclaimer />
      </div>
    </div>
  );
}
