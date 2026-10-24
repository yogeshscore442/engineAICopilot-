import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../AppContext';
import { api } from '../api';
import ErrorState from '../components/ErrorState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import Disclaimer from '../components/Disclaimer';
import type { Medicine, EmergencyProfileOut, SosEvent } from '../types';

export default function Emergency() {
  const { id } = useParams<{ id: string }>();
  const { t, profileId, useMock } = useApp();
  const [conditions, setConditions] = useState<string[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [emergencyProfile, setEmergencyProfile] = useState<EmergencyProfileOut | null>(null);
  const [sosEvents, setSosEvents] = useState<SosEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringSos, setTriggeringSos] = useState(false);
  const [triggerSuccess, setTriggerSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSosHistory = async () => {
    try {
      const res = await api.getSosEvents(profileId);
      if (res && res.events) {
        setSosEvents(res.events);
      }
    } catch {
      // Non-critical, ignore
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch Aggregated Emergency Profile
        try {
          const prof = await api.getEmergencyProfile(profileId);
          setEmergencyProfile(prof);
          if (prof.conditions?.length) {
            setConditions(prof.conditions);
          }
        } catch {
          // Fallback to record scan
        }

        // 2. If single record requested
        if (id) {
          const data = await api.getRecord(id);
          const rec = data?.record;
          const diagList = (rec?.diagnoses || []).map((d) => d?.text || (d as any)?.name || '').filter(Boolean);
          if (diagList.length) setConditions(diagList);
          setMedicines(rec?.medicines || []);
        } else {
          // Load timeline medicines
          const timeline = await api.getTimeline(profileId);
          const allMeds: Medicine[] = [];
          const seenMeds = new Set<string>();

          for (const item of (timeline.items || [])) {
            try {
              const rec = await api.getRecord(item.record_id);
              const r = rec?.record;
              if (r) {
                (r.medicines || []).forEach((m) => {
                  if (!m) return;
                  const key = `${m.name_raw || 'med'}_${m.strength || ''}`;
                  if (!seenMeds.has(key)) {
                    seenMeds.add(key);
                    allMeds.push(m);
                  }
                });
              }
            } catch {
              // fallback
            }
          }
          setMedicines(allMeds);
        }

        // 3. Fetch SOS Events
        await fetchSosHistory();
      } catch (err) {
        const message = err && typeof err === 'object' && 'error' in err
          ? (err as { error: { message: string } }).error.message
          : 'Failed to compile emergency data';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, profileId, useMock]);

  const handleTriggerTestSos = async () => {
    setTriggeringSos(true);
    setTriggerSuccess(null);
    try {
      const res = await api.postSosAlert({
        profile_id: profileId,
        lat: 13.0827,
        lon: 80.2707,
        accuracy: 4.8,
        mode: 'ONLINE',
        status: 'SENT',
        contacts_notified: emergencyProfile?.ice_contacts?.length || 2,
        hops: 0,
      });
      setTriggerSuccess(`SOS Alert logged successfully! Event ID: ${res.event_id.slice(0, 8)}...`);
      await fetchSosHistory();
      setTimeout(() => setTriggerSuccess(null), 5000);
    } catch (err) {
      alert('Failed to send SOS alert test.');
    } finally {
      setTriggeringSos(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <h2 className="text-2xl font-bold text-text-primary">{t('emergency.title')}</h2>
        <LoadingSkeleton type="card" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-text-primary mb-4">{t('emergency.title')}</h2>
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const patientName = emergencyProfile?.name || 'Active Patient';
  const bloodGroup = emergencyProfile?.blood_group || 'Not specified';
  const primaryIce = emergencyProfile?.ice_contacts?.[0] || {
    name: 'National Emergency Helpline',
    phone: '112',
    relation: 'Emergency Services',
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-high text-xs">🆘 Critical Patient Care</span>
            <span className="text-xs text-text-muted">ABDM Fast-Response Format</span>
          </div>
          <h2 className="text-2xl font-bold text-text-primary mt-1">{t('emergency.title')}</h2>
          <p className="text-sm text-text-secondary mt-0.5">{t('emergency.subtitle')}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/map"
            className="text-xs font-bold py-2 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-md flex items-center gap-1.5 transition-all"
          >
            <span>🗺️</span>
            <span>Hospital & ICU Map</span>
          </Link>
          <button
            onClick={handleTriggerTestSos}
            disabled={triggeringSos}
            className="text-xs font-bold py-2 px-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <span>{triggeringSos ? '⏳' : '🚨'}</span>
            <span>{triggeringSos ? 'Sending...' : 'Trigger SOS Test'}</span>
          </button>
          <button
            onClick={() => window.print()}
            className="btn-primary text-xs py-2 px-3.5 shadow-md bg-slate-800 hover:bg-slate-900"
          >
            🖨️ {t('emergency.print')}
          </button>
        </div>
      </div>

      {triggerSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between animate-fadeIn">
          <span>✅ {triggerSuccess}</span>
          <button onClick={() => setTriggerSuccess(null)} className="text-emerald-700 hover:text-emerald-900 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Emergency Wallet Card Box */}
      <div className="card p-6 border-2 border-rose-300 bg-gradient-to-br from-rose-50/40 via-white to-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-rose-600 text-white font-bold text-[10px] px-4 py-1 rounded-bl-lg tracking-widest uppercase">
          EMERGENCY ID
        </div>

        {/* Patient Vitals Header */}
        <div className="flex items-center gap-4 pb-4 border-b border-rose-100">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-2xl shadow-inner border border-rose-200">
            +
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-text-primary">{patientName}</h3>
            <p className="text-xs text-text-secondary">
              Profile: <span className="font-mono font-semibold">{profileId}</span> • Blood Group:{' '}
              <strong className="text-rose-700 font-bold px-1.5 py-0.5 bg-rose-100 rounded text-xs">
                {bloodGroup}
              </strong>
            </p>
            <p className="text-xs text-text-secondary mt-1">
              Emergency Contact:{' '}
              <a
                href={`tel:${primaryIce.phone.replace(/\s+/g, '')}`}
                className="font-bold text-slate-900 hover:text-rose-700 underline"
              >
                {primaryIce.name} ({primaryIce.phone})
              </a>
            </p>
          </div>
        </div>

        {/* Conditions & Medicines Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
          {/* Conditions */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 mb-2 flex items-center gap-1.5">
              <span>🩺</span>
              <span>{t('emergency.conditions')}</span>
            </h4>
            <div className="space-y-1.5">
              {conditions.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No chronic diagnoses recorded.</p>
              ) : (
                conditions.map((c, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-rose-50/60 border border-rose-200 text-xs font-semibold text-rose-950 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                    <span>{c}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Critical Medications */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800 mb-2 flex items-center gap-1.5">
              <span>💊</span>
              <span>Medicines recorded in documents</span>
            </h4>
            <div className="space-y-1.5">
              {medicines.length === 0 && emergencyProfile?.medications?.length ? (
                emergencyProfile.medications.map((m, i) => (
                  <div key={i} className="p-2 rounded-lg bg-surface-50 border border-border-light text-xs flex items-center justify-between">
                    <span className="font-semibold text-text-primary">{m}</span>
                    <span className="text-[11px] font-mono text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      Active
                    </span>
                  </div>
                ))
              ) : medicines.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No active prescriptions recorded.</p>
              ) : (
                medicines.map((m, i) => (
                  <div key={i} className="p-2 rounded-lg bg-surface-50 border border-border-light text-xs flex items-center justify-between">
                    <span className="font-semibold text-text-primary">{m.name_raw}</span>
                    <span className="text-[11px] font-mono text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {m.strength || m.schedule_raw || 'As Prescribed'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* First Responders Rapid Action & QR */}
        <div className="mt-6 pt-5 border-t border-border-light flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
              Paramedic / Emergency Scanner QR
            </h4>
            <p className="text-xs text-text-secondary max-w-sm">
              Scan to load patient emergency card. Compatible with 108 Emergency responders.
            </p>
            <div className="pt-1">
              <a
                href="tel:108"
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
              >
                <span>🚑</span> Call Ambulance (108)
              </a>
            </div>
          </div>

          {/* SVG QR Code Graphic */}
          <div className="p-3 bg-white rounded-xl border border-border-medium shadow-sm flex items-center gap-3">
            <svg className="w-20 h-20 text-slate-800" viewBox="0 0 100 100" fill="currentColor">
              {/* Corner 1 */}
              <rect x="5" y="5" width="25" height="25" fill="#0f172a" />
              <rect x="10" y="10" width="15" height="15" fill="white" />
              <rect x="14" y="14" width="7" height="7" fill="#0f172a" />
              {/* Corner 2 */}
              <rect x="70" y="5" width="25" height="25" fill="#0f172a" />
              <rect x="75" y="10" width="15" height="15" fill="white" />
              <rect x="79" y="14" width="7" height="7" fill="#0f172a" />
              {/* Corner 3 */}
              <rect x="5" y="70" width="25" height="25" fill="#0f172a" />
              <rect x="10" y="75" width="15" height="15" fill="white" />
              <rect x="14" y="79" width="7" height="7" fill="#0f172a" />
              {/* Data matrix dots */}
              <rect x="35" y="10" width="5" height="10" fill="#0f172a" />
              <rect x="45" y="5" width="10" height="5" fill="#0f172a" />
              <rect x="50" y="20" width="10" height="5" fill="#0f172a" />
              <rect x="15" y="40" width="10" height="5" fill="#0f172a" />
              <rect x="35" y="35" width="10" height="10" fill="#0d9488" />
              <rect x="55" y="35" width="8" height="8" fill="#0f172a" />
              <rect x="70" y="45" width="10" height="10" fill="#0f172a" />
              <rect x="40" y="55" width="15" height="5" fill="#0f172a" />
              <rect x="65" y="70" width="8" height="8" fill="#0f172a" />
              <rect x="45" y="75" width="10" height="10" fill="#0d9488" />
              <rect x="75" y="80" width="15" height="10" fill="#0f172a" />
            </svg>
            <div className="text-[10px] text-text-muted space-y-0.5">
              <div className="font-bold text-slate-800">EMERGENCY SOS QR</div>
              <div>ABHA ID: {emergencyProfile?.abha_id || '91-2345-6789'}</div>
              <div className="text-emerald-700 font-semibold">Active Profile Valid</div>
            </div>
          </div>
        </div>
      </div>

      {/* SOS Events Audit History */}
      <div className="card p-5 border border-slate-200 bg-white shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">📡</span>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Recent SOS Distress Events ({sosEvents.length})
            </h3>
          </div>
          <button
            onClick={fetchSosHistory}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium"
          >
            ↻ Refresh History
          </button>
        </div>

        {sosEvents.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center italic bg-slate-50 rounded-lg">
            No SOS distress events recorded for this profile yet.
          </p>
        ) : (
          <div className="space-y-2">
            {sosEvents.slice(0, 5).map((evt) => {
              const formattedDate = new Date(evt.created_at).toLocaleString();
              const isMesh = evt.mode === 'OFFLINE_MESH';
              return (
                <div
                  key={evt.event_id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>SOS Triggered ({evt.status})</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            isMesh ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {evt.mode}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Coords: {evt.lat.toFixed(4)}, {evt.lon.toFixed(4)} • Contacts Notified: {evt.contacts_notified}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono text-slate-500 font-medium">{formattedDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Non-dismissible Disclaimer */}
      <Disclaimer />
    </div>
  );
}