import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../AppContext';
import { api } from '../api';
import Disclaimer from '../components/Disclaimer';
import ErrorState from '../components/ErrorState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import type { Record as RecordType } from '../types';

export default function Summary() {
  const { id } = useParams<{ id: string }>();
  const { t, lang, useMock } = useApp();
  const [record, setRecord] = useState<RecordType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [downloadingFhir, setDownloadingFhir] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const data = await api.getRecord(id);
        setRecord(data.record);
      } catch (err) {
        const message = err && typeof err === 'object' && 'error' in err
          ? (err as { error: { message: string } }).error.message
          : 'Failed to load summary';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, useMock]);

  const abnormalCount = useMemo(
    () => (record?.tests || []).filter((t) => t.flag === 'HIGH' || t.flag === 'LOW').length || 0,
    [record]
  );

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setVoiceNotice(null);

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();

    if (lang === 'ta') {
      const taVoice = voices.find((v) => v.lang.startsWith('ta'));
      if (taVoice) {
        utterance.voice = taVoice;
      } else {
        setVoiceNotice('Tamil voice synthesis not found on system; reading in available voice engine.');
      }
    } else if (lang === 'hi') {
      const hiVoice = voices.find((v) => v.lang.startsWith('hi'));
      if (hiVoice) {
        utterance.voice = hiVoice;
      } else {
        setVoiceNotice('Hindi voice synthesis not found on system; reading in available voice engine.');
      }
    }

    utterance.rate = 0.95;
    utterance.pitch = 1;
    setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };

  const downloadFhir = async () => {
    if (!id) return;
    setDownloadingFhir(true);
    try {
      const fhirData = await api.getFhirBundle(id);
      const blob = new Blob([JSON.stringify(fhirData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FHIR_R4_Bundle_${id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to generate FHIR Bundle');
    } finally {
      setDownloadingFhir(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <LoadingSkeleton type="detail" />
      </div>
    );
  }

  if (error && !record) {
    return (
      <div className="max-w-3xl mx-auto">
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (!record) return null;

  // Bilingual logic
  const hasTamilSummary = Boolean(record.summary_ta);
  const activeSummary = lang === 'ta' && hasTamilSummary ? record.summary_ta! : record.summary_en || 'No summary generated.';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header & Badges */}
      <div className="card p-6 bg-gradient-to-r from-teal-50/50 via-white to-sky-50/30 border-border-light shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="badge badge-normal text-xs">
                ✓ Verified Medical Record
              </span>
              {abnormalCount > 0 ? (
                <span className="badge badge-high text-xs">
                  ▲ {abnormalCount} {t('timeline.abnormal')}
                </span>
              ) : (
                <span className="badge badge-normal text-xs">
                  ✓ All Values In Normal Range
                </span>
              )}
              <span className="text-xs text-text-muted capitalize">
                {record.doc_type.replace('_', ' ')} • {record.doc_date || 'No Date'}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-text-primary tracking-tight">
              {t('summary.title')}
            </h2>
            <p className="text-xs text-text-secondary mt-1">
              AI-generated clinical synthesis verified by patient
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/verify/${id}`} className="btn-secondary text-xs py-2 px-3">
              ✏️ {t('common.edit')}
            </Link>
            <button
              onClick={downloadFhir}
              disabled={downloadingFhir}
              className="btn-secondary text-xs py-2 px-3 border-teal-300 text-teal-800 bg-teal-50/50 hover:bg-teal-100"
              title="Download interoperable FHIR R4 Bundle JSON"
            >
              {downloadingFhir ? 'Exporting…' : '📥 FHIR R4 Export'}
            </button>
            <button
              onClick={() => window.print()}
              className="btn-secondary text-xs py-2 px-3"
              title="Print for doctor appointment"
            >
              🖨️ Print
            </button>
          </div>
        </div>
      </div>

      {/* Plain Language Summary Box */}
      <div className="card p-6 border-l-4 border-l-primary-500 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
              AI
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide">
                {lang === 'ta' ? 'மருத்துவ சுருக்கம் (Plain Language)' : 'Plain-Language Health Summary'}
              </h3>
              <p className="text-[11px] text-text-muted">Simplified for non-medical understanding</p>
            </div>
          </div>

          {/* Read Aloud Button */}
          <button
            onClick={() => (speaking ? stopSpeaking() : speak(activeSummary))}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              speaking
                ? 'bg-rose-100 text-rose-800 animate-pulse border border-rose-300'
                : 'bg-primary-50 text-primary-800 hover:bg-primary-100 border border-primary-200'
            }`}
          >
            {speaking ? (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                <span>Stop Audio / நிறுத்து</span>
              </>
            ) : (
              <>
                <span>🔊</span>
                <span>{lang === 'ta' ? 'குரல் வாசிப்பு (Read Aloud)' : 'Read Aloud'}</span>
              </>
            )}
          </button>
        </div>

        {voiceNotice && (
          <div className="mb-3 p-2 rounded bg-amber-50 text-amber-800 text-xs border border-amber-200">
            {voiceNotice}
          </div>
        )}

        {lang === 'ta' && !hasTamilSummary && (
          <div className="mb-3 p-2 rounded bg-amber-50 text-amber-800 text-xs border border-amber-200">
            குறிப்பு: இந்த ஆவணத்திற்கான தமிழ் சுருக்கம் தயாராக இல்லை; ஆங்கிலத்தில் காட்டப்படுகிறது.
          </div>
        )}

        <div className="text-text-primary text-base leading-relaxed bg-surface-50 p-4 rounded-xl border border-border-light font-normal">
          {activeSummary}
        </div>
      </div>

      {/* Lab Tests with Abnormal Explanation */}
      {record.tests && record.tests.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <span>🔬</span>
              <span>{t('timeline.tests')} & Biomarkers ({record.tests.length})</span>
            </h3>
            <span className="text-xs text-text-muted">Reference range evaluated by clinical rules</span>
          </div>

          <div className="space-y-3">
            {record.tests.map((test, i) => {
              const isHigh = test.flag === 'HIGH';
              const isLow = test.flag === 'LOW';
              const isNormal = test.flag === 'NORMAL';

              return (
                <div
                  key={i}
                  className={`card p-4 transition-all ${
                    isHigh
                      ? 'border-rose-200 bg-rose-50/20'
                      : isLow
                      ? 'border-blue-200 bg-blue-50/20'
                      : 'border-border-light'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-base text-text-primary">{test.name}</span>
                      {test.loinc && (
                        <span className="text-[10px] font-mono bg-surface-100 px-1.5 py-0.5 rounded text-text-muted">
                          LOINC {test.loinc}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-text-primary">
                        {test.value} <span className="text-xs font-normal text-text-secondary">{test.unit}</span>
                      </span>

                      {/* Flag with dual visual cues (Color + Icon) */}
                      {isHigh && (
                        <span className="badge badge-high text-xs">
                          ▲ HIGH
                        </span>
                      )}
                      {isLow && (
                        <span className="badge badge-low text-xs">
                          ▼ LOW
                        </span>
                      )}
                      {isNormal && (
                        <span className="badge badge-normal text-xs">
                          ✓ NORMAL
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Reference Range Bar */}
                  <div className="text-xs text-text-secondary mb-2 flex items-center gap-2">
                    <span>Clinical Normal Range:</span>
                    <span className="font-semibold text-text-primary">
                      {test.ref_low ?? '—'} - {test.ref_high ?? '—'} {test.unit}
                    </span>
                  </div>

                  {/* Plain Language Explanation */}
                  {test.explanation_en && (
                    <div className="p-2.5 rounded-lg bg-white border border-border-light text-xs text-text-secondary">
                      <span className="font-semibold text-text-primary">What this means: </span>
                      {test.explanation_en}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Prescribed Medicines */}
      {record.medicines && record.medicines.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <span>💊</span>
            <span>{t('timeline.medicines')} ({record.medicines.length})</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {record.medicines.map((med, i) => (
              <div key={i} className="card p-4 border-border-light bg-white">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-text-primary">{med.name_raw}</h4>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {med.generic ? `Generic: ${med.generic}` : ''} {med.strength ? `• ${med.strength}` : ''}
                    </p>
                  </div>
                  {med.food_instruction && (
                    <span className="badge badge-normal text-[11px]">
                      {med.food_instruction === 'before_food' ? t('medicines.beforeFood') : t('medicines.afterFood')}
                    </span>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-border-light flex items-center justify-between text-xs text-text-secondary">
                  <span>Schedule: <strong className="text-text-primary">{med.schedule_raw || 'As directed'}</strong></span>
                  {med.duration_days ? <span>{med.duration_days} days</span> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diagnoses List */}
      {record.diagnoses && record.diagnoses.length > 0 && (
        <div className="card p-4 border-border-light bg-surface-50">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
            Clinical Diagnoses / Conditions
          </h4>
          <div className="flex flex-wrap gap-2">
            {record.diagnoses.map((d, i) => (
              <span key={i} className="px-3 py-1 bg-white border border-border-medium rounded-lg text-sm font-semibold text-text-primary shadow-xs">
                {d.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Non-dismissible Disclaimer */}
      <div className="pt-4">
        <Disclaimer />
      </div>
    </div>
  );
}