import { dailySlots } from '../medicineSchedule';
import { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { api } from '../api';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import Disclaimer from '../components/Disclaimer';
import type { Medicine, Alert } from '../types';

const scheduleOrder = ['morning', 'afternoon', 'night'] as const;

export default function Medicines() {
  const { t, lang, profileId, useMock } = useApp();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // ── Browser Notification Preference ──
  const [browserNotifications, setBrowserNotifications] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`pillbox_notif_${profileId}`) === 'true';
    } catch {
      return false;
    }
  });

  const toggleBrowserNotifications = async () => {
    if (!browserNotifications) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setBrowserNotifications(true);
          try {
            localStorage.setItem(`pillbox_notif_${profileId}`, 'true');
          } catch {
            // ignore
          }
          new Notification('🔔 Health Copilot: Dose Notifications Enabled', {
            body: 'You will receive reminders for your prescribed daily medicines.',
            icon: '/favicon.ico',
          });
        } else {
          alert('Please enable browser notification permissions in your browser settings.');
        }
      } else {
        alert('Browser notifications are not supported on this device.');
      }
    } else {
      setBrowserNotifications(false);
      try {
        localStorage.setItem(`pillbox_notif_${profileId}`, 'false');
      } catch {
        // ignore
      }
    }
  };

  // Daily Adherence State (persisted per date in localStorage)
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setToday(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const todayKey = `adherence_${today.toLocaleDateString('en-CA')}_${profileId}`;
  const [doseState, setDoseState] = useState<{ key: string; doses: Record<string, boolean> }>(() => {
    try { return { key: todayKey, doses: JSON.parse(localStorage.getItem(todayKey) || '{}') }; }
    catch { return { key: todayKey, doses: {} }; }
  });
  if (doseState.key !== todayKey) {
    let doses = {};
    try { doses = JSON.parse(localStorage.getItem(todayKey) || '{}'); } catch { /* use empty state */ }
    setDoseState({ key: todayKey, doses });
  }
  const takenDoses = doseState.key === todayKey ? doseState.doses : {};

  const toggleDose = (doseId: string) => {
    const next = { ...takenDoses, [doseId]: !takenDoses[doseId] };
    setDoseState({ key: todayKey, doses: next });
    try {
      localStorage.setItem(todayKey, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [timelineData, alertsData] = await Promise.all([
          api.getTimeline(profileId),
          api.getAlerts(profileId),
        ]);

        const allMeds = timelineData.items.flatMap((item) => item.medicines || []);
        // Deduplicate medicines by raw name + strength
        const uniqueMeds: Medicine[] = [];
        const seen = new Set<string>();
        for (const m of allMeds) {
          if (!m) continue;
          const key = `${(m.name_raw || 'medication').toLowerCase()}_${m.strength || ''}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueMeds.push(m);
          }
        }

        setMedicines(uniqueMeds);
        setAlerts(alertsData.alerts || []);
      } catch (err) {
        const message = err && typeof err === 'object' && 'error' in err
          ? (err as { error: { message: string } }).error.message
          : 'Failed to load medicines';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profileId, useMock]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="text-2xl font-bold text-text-primary">{t('medicines.title')}</h2>
        <LoadingSkeleton type="list" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-text-primary mb-4">{t('medicines.title')}</h2>
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const filteredMeds = medicines.filter(
    (m) =>
      m.name_raw.toLowerCase().includes(search.toLowerCase()) ||
      (m.generic && m.generic.toLowerCase().includes(search.toLowerCase()))
  );

  // Smart Schedule Grouping: matches parsed or infers from raw strings (e.g. 1-0-1, OD, BD, bedtime)
  const scheduleGroups = scheduleOrder.reduce<Record<string, Medicine[]>>((acc, time) => {
    acc[time] = filteredMeds.filter(m => dailySlots(m).includes(time));
    return acc;
  }, {});

  // Calculate adherence percentage for today
  let totalDosesScheduled = 0;
  let totalDosesTaken = 0;
  scheduleOrder.forEach((time) => {
    (scheduleGroups[time] || []).forEach((m, idx) => {
      totalDosesScheduled++;
      const doseId = `${m.name_raw}_${time}_${idx}`;
      if (takenDoses[doseId]) totalDosesTaken++;
    });
  });

  const pendingDoses = totalDosesScheduled - totalDosesTaken;
  const adherencePercent =
    totalDosesScheduled > 0 ? Math.round((totalDosesTaken / totalDosesScheduled) * 100) : 100;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* ── Page Title Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">{t('medicines.title')}</h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Daily dosage schedule, adherence tracking & medication safety alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-normal text-xs font-bold">{medicines.length} Prescribed Medicines</span>
        </div>
      </div>

      {/* ── Clean Medication Dose Notification Banner ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center text-lg font-bold flex-shrink-0">
            🔔
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-900">
                {lang === 'ta' ? 'மருந்து உட்கொள்ளும் நினைவூட்டல்' : 'Medication Dose Notification'}
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                pendingDoses > 0
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                {pendingDoses > 0 ? `${pendingDoses} Pending` : 'All Completed ✓'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {pendingDoses > 0
                ? (lang === 'ta'
                    ? `இன்று ${pendingDoses} வேளை மருந்து இன்னும் எடுக்கப்பட வேண்டும். உணவுக்குப் பின் தவறாமல் எடுத்துக்கொள்ளவும்.`
                    : `${pendingDoses} dose(s) remaining for today. Follow the timing and food instructions on your prescription.`)
                : (lang === 'ta'
                    ? 'இன்றைய அனைத்து மருந்துகளும் வெற்றிகரமாக எடுக்கப்பட்டன. சிறந்த மருந்து ஒழுக்கம்!'
                    : 'All scheduled doses completed for today. Excellent adherence!')}
            </p>
          </div>
        </div>

        {/* Browser Push Notification Toggle */}
        <button
          onClick={toggleBrowserNotifications}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto ${
            browserNotifications
              ? 'bg-teal-50 text-teal-800 border border-teal-300'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
          }`}
          title="Toggle browser push notifications for medication reminders"
        >
          <span>{browserNotifications ? '🔔 Notifications On' : '🔕 Enable Notifications'}</span>
        </button>
      </div>

      {/* Daily Adherence Progress Box with Glowing Border */}
      {totalDosesScheduled > 0 && (
        <div className="card p-5 border-glow-teal bg-gradient-to-r from-teal-50/40 via-white to-emerald-50/30 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 block">
                Today's Adherence • {today.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
              <h3 className="font-bold text-base text-text-primary">
                Daily Pill Tracker Checklist
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold text-teal-700">{adherencePercent}%</span>
              <span className="text-xs text-text-muted">
                ({totalDosesTaken}/{totalDosesScheduled} Doses Taken)
              </span>
            </div>
          </div>

          {/* Adherence Progress Bar */}
          <div className="w-full h-2.5 bg-surface-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `${adherencePercent}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Prominent Duplicate Medicine Safety Alert Banner */}
      {alerts.length > 0 && (
        <div className="p-5 rounded-xl border border-amber-300 bg-amber-50/80 shadow-xs space-y-3 border-glow-amber">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-lg flex-shrink-0">
              ⚠️
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-amber-950 text-base">
                  {t('medicines.alertTitle')} (Duplicate Active Ingredient)
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                  Clinical Safety Check
                </span>
              </div>
              <p className="text-xs text-amber-900 mt-1 font-medium leading-relaxed">
                {alerts[0].message}
              </p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {alerts[0].medicines.map((m, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-white/90 border border-amber-200 text-xs shadow-2xs">
                    <span className="font-bold text-text-primary">{m.name_raw}</span>
                    <div className="text-amber-800 text-[11px]">Active generic: {m.generic} • {m.strength}</div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-amber-800 italic mt-2.5">
                Note: Do not stop or alter doses independently. Please confirm this with your doctor or pharmacist.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search Input */}
      {medicines.length > 0 && (
        <div className="card p-3 shadow-2xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by brand name or generic (e.g. Metformin, Dolo)…"
            className="input text-sm"
          />
        </div>
      )}

      {medicines.length === 0 ? (
        <EmptyState
          title={t('common.noData')}
          subtitle="No medicines extracted from uploaded prescriptions yet."
          icon="medicine"
        />
      ) : (
        /* Daily Dosage Schedule Grid (Morning / Afternoon / Night) with Interactive Checkbox */
        <div className="space-y-6">
          <p className="text-sm text-amber-900">Recorded schedules may be historical. Confirm current medicines with your clinician. Weekly, as-needed, and unspecified schedules are excluded from the daily checklist.</p>
          {filteredMeds.filter(m => dailySlots(m).length === 0).map(m => <p key={m.name_raw} className="card p-3">{m.name_raw}: {m.schedule_raw || 'Timing not recorded'} — review original prescription</p>)}
          {scheduleOrder.map((time) => {
            const list = scheduleGroups[time] || [];
            const title =
              time === 'morning'
                ? `🌅 ${t('medicines.morning')}`
                : time === 'afternoon'
                ? `☀️ ${t('medicines.afternoon')}`
                : `🌙 ${t('medicines.night')}`;

            return (
              <div key={time} className="card p-5 border-border-light shadow-xs card-interactive">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-light">
                  <h3 className="font-bold text-base text-text-primary">{title}</h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-100 text-text-secondary">
                    {list.length} Meds
                  </span>
                </div>

                {list.length === 0 ? (
                  <p className="text-xs text-text-muted py-2 italic">No medicines scheduled for this time slot</p>
                ) : (
                  <div className="space-y-3">
                    {list.map((med, idx) => {
                      const doseId = `${med.name_raw}_${time}_${idx}`;
                      const isTaken = Boolean(takenDoses[doseId]);

                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isTaken
                              ? 'bg-emerald-50/50 border-emerald-300'
                              : 'bg-surface-50 border-border-light hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Interactive Pill Taken Checkbox */}
                            <button
                              onClick={() => toggleDose(doseId)}
                              type="button"
                              className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                                isTaken
                                  ? 'bg-emerald-600 border-emerald-600 text-white font-bold'
                                  : 'border-slate-300 bg-white hover:border-emerald-500'
                              }`}
                              title="Mark dose as taken"
                            >
                              {isTaken ? '✓' : ''}
                            </button>

                            <div>
                              <div className="flex items-center gap-2">
                                <h4
                                  className={`font-bold text-sm ${
                                    isTaken ? 'line-through text-slate-500' : 'text-text-primary'
                                  }`}
                                >
                                  {med.name_raw}
                                </h4>
                                {med.strength && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-semibold border border-teal-200">
                                    {med.strength}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
                            {(med.food_instruction === 'before_food' || med.food_instruction === 'after_food') && (
                              <span
                                className={`badge text-xs ${
                                  med.food_instruction === 'before_food'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                }`}
                              >
                                {med.food_instruction === 'before_food'
                                  ? `🍴 ${t('medicines.beforeFood')}`
                                  : `🍲 ${t('medicines.afterFood')}`}
                              </span>
                            )}
                            {med.schedule_raw && (
                              <span className="font-mono text-xs px-2 py-1 rounded bg-white border border-border-medium text-text-primary font-bold shadow-2xs">
                                {med.schedule_raw}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Non-dismissible Disclaimer */}
      <Disclaimer />
    </div>
  );
}
