import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { api } from '../api';
import type { Reminder } from '../types';
import EmptyState from '../components/EmptyState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

export default function Reminders() {
  const navigate = useNavigate();
  const { profileId, activeProfile, lang, reminders, refreshReminders } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });

  // New reminder form state
  const [newTitle, setNewTitle] = useState('');
  const [newMedName, setNewMedName] = useState('');
  const [newDose, setNewDose] = useState('');
  const [newTiming, setNewTiming] = useState('Morning (08:00 AM)');
  const [newTimeOfDay, setNewTimeOfDay] = useState('08:00');
  const [newDuration, setNewDuration] = useState('30');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        await refreshReminders();
      } catch (err: any) {
        setError(err?.error?.message || 'Could not load medication schedules');
      } finally {
        setLoading(false);
      }
    };
    if (profileId) {
      load();
    }
  }, [profileId]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        new Notification('AarogyaAI Health Reminders Enabled', {
          body: `Medication reminders for ${activeProfile?.name || 'you'} will alert you on schedule.`,
          icon: '/favicon.ico',
        });
      }
    }
  };

  const handleToggleTaken = async (rem: Reminder) => {
    try {
      await api.updateReminder(profileId, rem.id, {
        is_completed: !rem.is_completed,
      });
      await refreshReminders();
    } catch {
      // ignore
    }
  };

  const handleDeleteReminder = async (remId: string) => {
    try {
      await api.deleteReminder(profileId, remId);
      await refreshReminders();
    } catch {
      // ignore
    }
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      await api.createReminder(profileId, {
        title: newTitle.trim(),
        medicine_name: newMedName.trim() || undefined,
        dose: newDose.trim() || undefined,
        timing: newTiming,
        time_of_day: newTimeOfDay,
        duration_days: parseInt(newDuration, 10) || 30,
      });
      setShowAddModal(false);
      setNewTitle('');
      setNewMedName('');
      setNewDose('');
      await refreshReminders();
    } catch (err: any) {
      alert(err?.error?.message || 'Failed to create reminder');
    } finally {
      setSaving(false);
    }
  };

  const dueNowReminders = reminders.filter((r) => r.is_active && !r.is_completed);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200/80 mb-2">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            <span>{lang === 'ta' ? 'மருந்து அட்டவணை & நினைவூட்டல்' : 'Prescription Schedules & Reminders'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {lang === 'ta' ? `${activeProfile?.name || 'நோயாளி'} - மருந்து நினைவூட்டல்கள்` : `Medication Reminders — ${activeProfile?.name || 'Patient'}`}
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-0.5">
            {lang === 'ta'
              ? 'மருந்து சீட்டிலிருந்து தானாக உருவாக்கப்பட்ட அட்டவணை மற்றும் நேரடி எச்சரிக்கைகள்'
              : 'Auto-synchronized with verified prescriptions to ensure high medication adherence.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {notifPermission !== 'granted' && (
            <button
              onClick={requestNotificationPermission}
              className="py-2 px-3 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-300 transition-all flex items-center gap-1.5"
            >
              <span>🔔</span>
              <span>Enable Browser Alerts</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="py-2.5 px-4 rounded-xl text-xs font-black bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 transition-all flex items-center gap-1.5"
          >
            <span>+</span>
            <span>Add Reminder</span>
          </button>
        </div>
      </div>

      {/* ── Due Now Alert Banner ── */}
      {dueNowReminders.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-teal-500/10 to-transparent border border-amber-400/30 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-lg font-black shadow-md shadow-amber-500/20 animate-bounce">
              ⏰
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  Due Today
                </span>
                <span className="text-xs font-extrabold text-slate-900">
                  {dueNowReminders.length} Pending Medication Dose(s)
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Next scheduled dose: <span className="font-bold text-slate-800">{dueNowReminders[0].title}</span> ({dueNowReminders[0].timing || 'Daily'})
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content Area ── */}
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      ) : reminders.length === 0 ? (
        <EmptyState
          title="No Scheduled Reminders"
          subtitle={`No medication schedules set for ${activeProfile?.name || 'this profile'}. Upload a doctor's prescription to automatically generate reminder schedules, or add one manually.`}
          action={{
            label: 'Upload Prescription',
            onClick: () => navigate('/upload'),
          }}
          icon="medicine"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reminders.map((rem) => {
            const isDone = rem.is_completed;
            return (
              <div
                key={rem.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isDone
                    ? 'bg-slate-50 border-slate-200 opacity-70'
                    : 'bg-white border-slate-200/80 hover:border-teal-400 shadow-xs hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black ${
                        isDone ? 'bg-slate-200 text-slate-500' : 'bg-teal-50 text-teal-600 border border-teal-200'
                      }`}
                    >
                      💊
                    </div>
                    <div>
                      <h3 className={`text-sm font-black ${isDone ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {rem.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                          ⏰ {rem.time_of_day || '08:00 AM'}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500">
                          {rem.timing || 'Daily'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteReminder(rem.id)}
                    className="text-slate-400 hover:text-red-500 text-xs font-bold p-1 rounded-md"
                    title="Delete reminder"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <span className="text-slate-500">
                    Course: <span className="font-semibold text-slate-700">{rem.duration_days || 30} days</span>
                  </span>

                  <button
                    onClick={() => handleToggleTaken(rem)}
                    className={`py-1.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                      isDone
                        ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        : 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
                    }`}
                  >
                    <span>{isDone ? '✓ Taken' : 'Mark as Taken'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Reminder Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-slate-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">Add Medication Reminder</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReminder} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reminder Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Take Metformin 500mg"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Medicine Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Metformin"
                    value={newMedName}
                    onChange={(e) => setNewMedName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dose / Strength</label>
                  <input
                    type="text"
                    placeholder="e.g. 500 mg"
                    value={newDose}
                    onChange={(e) => setNewDose(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Time of Day</label>
                  <input
                    type="time"
                    value={newTimeOfDay}
                    onChange={(e) => setNewTimeOfDay(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Meal / Timing Instruction</label>
                <select
                  value={newTiming}
                  onChange={(e) => setNewTiming(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-teal-500"
                >
                  <option value="Morning (After Breakfast)">Morning (After Breakfast)</option>
                  <option value="Morning (Before Food)">Morning (Before Food)</option>
                  <option value="Afternoon (After Lunch)">Afternoon (After Lunch)</option>
                  <option value="Night (After Dinner)">Night (After Dinner)</option>
                  <option value="Night (Before Sleep)">Night (Before Sleep)</option>
                  <option value="Twice Daily (Morning & Night)">Twice Daily (Morning & Night)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-teal-600 hover:bg-teal-700 text-white shadow-md"
                >
                  {saving ? 'Saving…' : 'Save Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
