import { Outlet, Link } from "react-router-dom";
import { useApp } from "../AppContext";
import { api } from "../api";

export default function AppShell() {
  const { reminders, activeProfile, profileId, refreshReminders, lang } = useApp();

  const dueReminders = reminders.filter((r) => r.is_active && !r.is_completed);

  const handleMarkTaken = async (reminderId: string) => {
    try {
      await api.updateReminder(profileId, reminderId, { is_completed: true });
      await refreshReminders();
    } catch {
      // ignore
    }
  };

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Due Now Banner */}
        {dueReminders.length > 0 && (
          <div className="mb-5 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 rounded-r-2xl border border-amber-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fadeIn">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping flex-shrink-0" />
              <span className="font-extrabold text-amber-900 uppercase tracking-wider text-[10px] bg-amber-100 px-2 py-0.5 rounded-full flex-shrink-0">
                {lang === "ta" ? "இப்போது எடுக்க வேண்டும்" : lang === "hi" ? "अभी लें" : "DUE NOW"}
              </span>
              <span className="text-slate-800 font-bold truncate">
                {lang === "ta" ? `${activeProfile?.name || "உங்களுக்கு"} மருந்து நேரம்:` : `Medication for ${activeProfile?.name || "you"}:`}{" "}
                <strong className="text-amber-950 font-extrabold">{dueReminders[0].title}</strong>{" "}
                <span className="text-slate-500 font-normal">({dueReminders[0].timing || dueReminders[0].time_of_day})</span>
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-shrink-0">
              <button
                onClick={() => handleMarkTaken(dueReminders[0].id)}
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer"
              >
                {lang === "ta" ? "எடுத்துக்கொண்டேன் ✓" : "Mark Taken ✓"}
              </button>
              <Link
                to="/reminders"
                className="text-teal-800 hover:text-teal-950 font-bold text-xs underline underline-offset-2"
              >
                {lang === "ta" ? `அனைத்தும் (${dueReminders.length})` : `All (${dueReminders.length}) ➔`}
              </Link>
            </div>
          </div>
        )}

        <Outlet />
      </div>
    </div>
  );
}
