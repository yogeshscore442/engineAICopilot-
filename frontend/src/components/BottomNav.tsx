import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../AppContext';

export default function BottomNav() {
  const { t, openLoginModal } = useApp();
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      {/* Mobile "More" Drawer / Modal */}
      {showMore && (
        <div className="fixed inset-0 z-50 lg:hidden bg-slate-900/60 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-white rounded-t-2xl p-5 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-border-light">
              <h3 className="font-bold text-text-primary text-base">More Features / கூடுதல்</h3>
              <button
                onClick={() => setShowMore(false)}
                className="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center text-text-muted hover:text-text-primary"
              >
                ✕
              </button>
            </div>

            {/* Hospital ID Mobile Banner */}
            <button
              onClick={() => {
                setShowMore(false);
                openLoginModal();
              }}
              className="w-full p-3 rounded-xl border border-teal-300 bg-gradient-to-r from-teal-50 to-cyan-50 flex items-center justify-between text-left shadow-2xs cursor-pointer hover:border-teal-400"
            >
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-teal-600 text-white font-bold text-sm">🪪</span>
                <div>
                  <div className="font-bold text-xs text-teal-950">Hospital ID & Staff Portal</div>
                  <div className="text-[10px] text-teal-700">Login with Doctor / Staff / Patient ID</div>
                </div>
              </div>
              <span className="text-xs font-bold text-teal-800 bg-white px-2.5 py-1 rounded-md border border-teal-200 shadow-2xs">
                Switch ID
              </span>
            </button>

            <div className="grid grid-cols-2 gap-3">
              <NavLink
                to="/family"
                onClick={() => setShowMore(false)}
                className="p-3 rounded-xl border border-teal-200 bg-teal-50/50 flex items-center gap-2.5 text-sm font-medium text-teal-900 hover:bg-teal-100 col-span-2"
              >
                <span className="p-2 rounded-lg bg-teal-200 text-teal-800">ð¨âð©âð§âð¦</span>
                <div>
                  <div className="font-bold text-xs">Family Vault</div>
                  <div className="text-[10px] text-teal-700">Manage Family Member Profiles</div>
                </div>
              </NavLink>
              <NavLink
                to="/compare"
                onClick={() => setShowMore(false)}
                className="p-3 rounded-xl border border-teal-200 bg-teal-50/50 flex items-center gap-2.5 text-sm font-medium text-teal-900 hover:bg-teal-100"
              >
                <span className="p-2 rounded-lg bg-teal-200 text-teal-800">⚡</span>
                <div>
                  <div className="font-bold text-xs">Lab Diff</div>
                  <div className="text-[10px] text-teal-700">Compare 2 Reports</div>
                </div>
              </NavLink>

              <NavLink
                to="/doctor-prep"
                onClick={() => setShowMore(false)}
                className="p-3 rounded-xl border border-purple-200 bg-purple-50/50 flex items-center gap-2.5 text-sm font-medium text-purple-900 hover:bg-purple-100"
              >
                <span className="p-2 rounded-lg bg-purple-200 text-purple-800">📋</span>
                <div>
                  <div className="font-bold text-xs">Doctor Prep</div>
                  <div className="text-[10px] text-purple-700">OPD Handover Memo</div>
                </div>
              </NavLink>

              <NavLink
                to="/trends"
                onClick={() => setShowMore(false)}
                className="p-3 rounded-xl border border-border-light bg-surface-50 flex items-center gap-2.5 text-sm font-medium text-text-primary hover:bg-primary-50 hover:border-primary-300"
              >
                <span className="p-2 rounded-lg bg-teal-100 text-teal-700">📈</span>
                <span>{t('trends.title')}</span>
              </NavLink>

              <NavLink
                to="/alerts"
                onClick={() => setShowMore(false)}
                className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center gap-2.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
              >
                <span className="p-2 rounded-lg bg-amber-200 text-amber-800">⚠️</span>
                <span>{t('medicines.alertTitle')}</span>
              </NavLink>

              <NavLink
                to="/ask"
                onClick={() => setShowMore(false)}
                className="p-3 rounded-xl border border-border-light bg-surface-50 flex items-center gap-2.5 text-sm font-medium text-text-primary hover:bg-primary-50 hover:border-primary-300"
              >
                <span className="p-2 rounded-lg bg-sky-100 text-sky-700">💬</span>
                <span>{t('ask.title')}</span>
              </NavLink>

              <NavLink
                to="/abha"
                onClick={() => setShowMore(false)}
                className="p-3 rounded-xl border border-border-light bg-surface-50 flex items-center gap-2.5 text-sm font-medium text-text-primary hover:bg-primary-50 hover:border-primary-300"
              >
                <span className="p-2 rounded-lg bg-indigo-100 text-indigo-700">🆔</span>
                <span>{t('abha.title')}</span>
              </NavLink>

              <NavLink
                to="/emergency"
                onClick={() => setShowMore(false)}
                className="p-3 rounded-xl border border-rose-200 bg-rose-50/50 col-span-2 flex items-center gap-2.5 text-sm font-medium text-rose-900 hover:bg-rose-100"
              >
                <span className="p-2 rounded-lg bg-rose-200 text-rose-800">🆘</span>
                <div className="text-left">
                  <div className="font-bold">{t('emergency.title')}</div>
                  <div className="text-xs text-rose-700 font-normal">Emergency Card & QR Summary</div>
                </div>
              </NavLink>

              <NavLink
                to="/settings"
                onClick={() => setShowMore(false)}
                className="p-3 rounded-xl border border-border-light bg-surface-50 col-span-2 flex items-center gap-2.5 text-sm font-medium text-text-primary hover:bg-primary-50 hover:border-primary-300"
              >
                <span className="p-2 rounded-lg bg-slate-200 text-slate-700">⚙️</span>
                <span>{t('nav.settings')} / Language / API Mode</span>
              </NavLink>
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Bar */}
      <nav className="bottom-nav safe-area-pb">
        <div className="max-w-md mx-auto grid grid-cols-4 items-center">
          <NavLink
            to="/timeline"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 px-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-primary-700 font-bold' : 'text-text-muted hover:text-text-primary'
              }`
            }
          >
            <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span>{t('nav.timeline')}</span>
          </NavLink>

          <NavLink
            to="/upload"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 px-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-primary-700 font-bold' : 'text-text-muted hover:text-text-primary'
              }`
            }
          >
            <div className="w-7 h-7 rounded-full bg-primary-600 text-white flex items-center justify-center mb-0.5 shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <span>{t('nav.upload')}</span>
          </NavLink>

          <NavLink
            to="/medicines"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 px-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-primary-700 font-bold' : 'text-text-muted hover:text-text-primary'
              }`
            }
          >
            <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h.75m9 0h3.75m-3.75 0v3.75m0-3.75H18" />
            </svg>
            <span>{t('nav.medicines')}</span>
          </NavLink>

          <button
            onClick={() => setShowMore(!showMore)}
            className="flex flex-col items-center justify-center py-2 px-1 text-[11px] font-medium text-text-muted hover:text-text-primary transition-colors"
          >
            <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}