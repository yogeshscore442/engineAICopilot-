import type { UserProfile } from '../types/auth';

type FloatingHudProps = {
  user: UserProfile;
  onOpenLogin: () => void;
  onOpenNodeStatus: () => void;
  onOpenEmergency: () => void;
};

export default function FloatingHud({
  user,
  onOpenLogin,
  onOpenNodeStatus,
  onOpenEmergency,
}: FloatingHudProps) {
  return (
    <aside
      aria-label="Clinical Quick Action Bar"
      className="fixed bottom-20 md:bottom-6 right-24 md:right-28 z-40 flex items-center gap-2 p-1.5 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-xl shadow-slate-900/10 text-slate-800 animate-fadeIn"
    >
      {/* Hospital ID / User Role Quick Pill */}
      <button
        onClick={onOpenLogin}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-xs font-semibold text-teal-900 transition-all group cursor-pointer"
        title="Switch Hospital ID"
      >
        <span className="text-sm">🪪</span>
        <div className="text-left hidden sm:block">
          <p className="font-mono text-[10px] text-teal-700 font-bold leading-none">{user.id}</p>
          <p className="text-[11px] font-black text-slate-900 truncate max-w-[120px]">{user.name}</p>
        </div>
        <span className="text-[9px] bg-white text-teal-800 px-1.5 py-0.5 rounded border border-teal-300 font-bold group-hover:bg-teal-600 group-hover:text-white transition-colors">
          SWITCH ID
        </span>
      </button>

      {/* Hospital Node Diagnostic Link */}
      <button
        onClick={onOpenNodeStatus}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all border border-slate-200 cursor-pointer"
        title="Check Hospital Node & ABDM Health Sync"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="hidden md:inline text-[11px] font-bold text-slate-800">Node: 18ms</span>
      </button>

      {/* Emergency SOS Trigger */}
      <button
        onClick={onOpenEmergency}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold shadow-md shadow-red-600/20 transition-all cursor-pointer"
        title="Emergency Medical Card & SOS Broadcast"
      >
        <span>🚨</span>
        <span className="hidden sm:inline">SOS</span>
      </button>
    </aside>
  );
}
