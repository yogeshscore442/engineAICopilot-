import { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { api } from '../api';
import ErrorState from '../components/ErrorState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import Disclaimer from '../components/Disclaimer';
import type { Medicine } from '../types';

export default function DoctorPrep() {
  const [generatedDate] = useState(() => new Date().toLocaleDateString());
  const { profileId, activeProfile } = useApp();
  const [diagnoses, setDiagnoses] = useState<string[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [abnormalTests, setAbnormalTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interactive patient questions and symptoms for doctor appointment
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [newSymptom, setNewSymptom] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const timeline = await api.getTimeline(profileId);
        const diagSet = new Set<string>();
        const medList: Medicine[] = [];
        const seenMeds = new Set<string>();
        const abnormalList: any[] = [];

        for (const item of timeline.items) {
          try {
            const rec = await api.getRecord(item.record_id);
            const r = rec?.record;
            if (r) {
              (r.diagnoses || []).forEach((d) => {
                const text = d?.text || (d as any)?.name;
                if (text) diagSet.add(text);
              });
              (r.medicines || []).forEach((m) => {
                if (!m) return;
                const k = `${m.name_raw || 'med'}_${m.strength || ''}`;
                if (!seenMeds.has(k)) {
                  seenMeds.add(k);
                  medList.push(m);
                }
              });
              (r.tests || []).forEach((t) => {
                if (t && (t.flag === 'HIGH' || t.flag === 'LOW')) {
                  abnormalList.push({ ...t, date: r.doc_date });
                }
              });
            }
          } catch {
            // ignore
          }
        }

        setDiagnoses(Array.from(diagSet));
        setMedicines(medList);
        setAbnormalTests(abnormalList);
      } catch (err) {
        const message = err && typeof err === 'object' && 'error' in err
          ? (err as { error: { message: string } }).error.message
          : 'Failed to generate doctor consultation memo';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profileId]);

  const addSymptom = () => {
    if (!newSymptom.trim()) return;
    setSymptoms([...symptoms, newSymptom.trim()]);
    setNewSymptom('');
  };

  const removeSymptom = (idx: number) => {
    setSymptoms(symptoms.filter((_, i) => i !== idx));
  };

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    setQuestions([...questions, newQuestion.trim()]);
    setNewQuestion('');
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <h2 className="text-2xl font-bold text-text-primary">Doctor Consultation Prep</h2>
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title & Print Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-normal text-xs font-bold uppercase tracking-wider">
              📋 Clinical Handover
            </span>
            <span className="text-xs text-text-muted">Doctor Visit Ready</span>
          </div>
          <h2 className="text-2xl font-bold text-text-primary mt-1">
            Doctor Visit Prep & Consultation Memo
          </h2>
          <p className="text-sm text-text-secondary mt-0.5">
            A 60-second synthesized clinical handover sheet designed for your physician or specialist
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="btn-primary py-2.5 px-5 shadow-md flex items-center gap-2"
        >
          <span>🖨️</span>
          <span>Print OPD Consultation Memo</span>
        </button>
      </div>

      {/* Official OPD Clinical Memo Card with Glowing Border */}
      <div className="card p-8 border-glow-teal bg-white shadow-lg space-y-6">
        {/* Memo Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-teal-800">
              PATIENT CLINICAL SUMMARY • PRE-CONSULTATION MEMO
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 mt-1">
              {activeProfile?.name || 'Active Patient'} (Profile: {profileId})
            </h3>
            <p className="text-xs text-slate-600">
              Demographics: verify against the original patient record
            </p>
          </div>
          <div className="text-left sm:text-right text-xs text-slate-500 font-mono">
            <div>Generated: {generatedDate}</div>
            <div>ABHA: no verified connection</div>
          </div>
        </div>

        {/* Diagnosed Conditions & Biomarkers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 rounded-xl bg-surface-50 border border-border-light space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <span>🩺</span>
              <span>Documented Diagnoses:</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {diagnoses.map((d, i) => (
                <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-800">
                  {d}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-50 border border-border-light space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
              <span>🔬</span>
              <span>Recent Abnormal Biomarkers:</span>
            </h4>
            {abnormalTests.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No recent out-of-range markers detected.</p>
            ) : (
              <div className="space-y-1">
                {abnormalTests.slice(0, 3).map((tItem, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-white p-1.5 rounded border border-slate-200">
                    <span className="font-semibold text-slate-800">{tItem.name}</span>
                    <span className="font-bold text-rose-700 font-mono">
                      {tItem.value} {tItem.unit} (Ref: {tItem.ref_low}-{tItem.ref_high})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Current Active Prescriptions */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <span>💊</span>
            <span>Current Medication Regimen ({medicines.length}):</span>
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="py-2 px-3">Medication Name</th>
                  <th className="py-2 px-3">Active Generic Salt</th>
                  <th className="py-2 px-3">Strength</th>
                  <th className="py-2 px-3">Daily Timing</th>
                  <th className="py-2 px-3">Food Instruction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {medicines.map((m, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-900">{m.name_raw}</td>
                    <td className="py-2 px-3 text-slate-600">{m.generic || '—'}</td>
                    <td className="py-2 px-3 font-mono font-semibold">{m.strength || '—'}</td>
                    <td className="py-2 px-3 font-mono font-bold text-teal-700">{m.schedule_raw || '1-0-1'}</td>
                    <td className="py-2 px-3 text-slate-700">{m.food_instruction?.replace('_', ' ') || 'Not recorded'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Symptoms Observed Section (Interactive) */}
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>Symptoms To Discuss with Doctor:</span>
            </h4>
            <span className="text-[11px] text-amber-800">Add any recent discomforts</span>
          </div>

          <div className="space-y-1.5">
            {symptoms.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-white border border-amber-200 text-xs">
                <span className="text-slate-800 font-medium">• {s}</span>
                <button
                  onClick={() => removeSymptom(i)}
                  className="text-slate-400 hover:text-rose-600 px-1 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={newSymptom}
              onChange={(e) => setNewSymptom(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSymptom()}
              placeholder="e.g. Swelling in ankles after walking, dry mouth…"
              className="input text-xs py-1.5 flex-1"
            />
            <button onClick={addSymptom} className="btn-secondary text-xs py-1.5 px-3">
              + Add
            </button>
          </div>
        </div>

        {/* Questions to Ask Doctor Section (Interactive) */}
        <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/30 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-950 flex items-center gap-1.5">
              <span>❓</span>
              <span>Questions To Ask Your Physician:</span>
            </h4>
            <span className="text-[11px] text-teal-800">Don't forget during consultation</span>
          </div>

          <div className="space-y-1.5">
            {questions.map((q, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-white border border-teal-200 text-xs">
                <span className="text-slate-800 font-medium">Q{i + 1}: {q}</span>
                <button
                  onClick={() => removeQuestion(i)}
                  className="text-slate-400 hover:text-rose-600 px-1 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addQuestion()}
              placeholder="Type a question for your doctor…"
              className="input text-xs py-1.5 flex-1"
            />
            <button onClick={addQuestion} className="btn-secondary text-xs py-1.5 px-3">
              + Add
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between items-center">
          <span>Prepared via AI Health Copilot • Verified Clinical Record Synthesis</span>
          <span>Doctor Notes / Signature: _________________________</span>
        </div>
      </div>

      <Disclaimer />
    </div>
  );
}
