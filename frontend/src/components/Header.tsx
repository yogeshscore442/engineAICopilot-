import { Link } from 'react-router-dom';
import { useApp } from '../AppContext';
import HospitalLogo from './HospitalLogo';
import LanguageDropdown from './LanguageDropdown';

import PatientDropdown from './PatientDropdown';

export default function Header() {
  const { lang, setLang, user, activeProfile, openLoginModal } = useApp();

  return (
    <header className="screen-header">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Mobile: Advanced Logo */}
        <div className="lg:hidden flex items-center gap-2">
          <Link to="/timeline">
            <HospitalLogo size="sm" showSubtitle={false} />
          </Link>
        </div>

        {/* Desktop: Active Hospital & Patient Context */}
        <div className="hidden lg:flex items-center gap-3 text-xs">
          {/* Hospital Patient Dropdown (Click to switch account) */}
          <PatientDropdown />

          {/* Active Profile Context */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-surface-50 border border-slate-200/90 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center text-sm font-bold flex-shrink-0">
              👤
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900 truncate max-w-[170px] leading-tight">
                Viewing: {activeProfile?.name || user?.name || 'Self'}
              </p>
              <p className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">
                {activeProfile?.relation ? `Relation: ${activeProfile.relation}` : 'Primary Profile'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Hospital Patient ID Switcher Button */}
          <button
            onClick={openLoginModal}
            className="lg:hidden text-xs font-mono font-bold text-teal-800 bg-teal-50 border border-teal-300 px-2 py-1 rounded-lg"
          >
            🪪 {(user?.user_id || 'PAT').slice(0, 8)}
          </button>

          {/* Click-to-Reveal Language Dropdown */}
          <LanguageDropdown lang={lang} setLang={setLang} />
        </div>
      </div>
    </header>
  );
}