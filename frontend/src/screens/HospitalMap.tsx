import { useState, useRef, useEffect } from 'react';
import { useApp } from '../AppContext';
import { ArrowLeft, ExternalLink, Maximize2, Minimize2, Navigation, Phone, ShieldAlert, HeartPulse, Building2, Pill, Stethoscope, Droplet } from 'lucide-react';

interface HospitalMapProps {
  onBack?: () => void;
  initialFilter?: 'all' | 'emergency' | 'hospital' | 'pharmacy' | 'clinic' | 'bloodbank';
}

export default function HospitalMap({ onBack, initialFilter = 'all' }: HospitalMapProps) {
  const app = useApp ? useApp() : { lang: 'en', activeProfile: null };
  const [lang, setLang] = useState<'en' | 'ta'>(() => (app?.lang === 'ta' ? 'ta' : 'en'));
  const activeProfile = app?.activeProfile || null;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>(initialFilter);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Send filter updates to iframe when activeFilter changes
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'SET_FILTER', filter: activeFilter },
        '*'
      );
    }
  }, [activeFilter]);

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'SET_FILTER', filter },
        '*'
      );
    }
  };

  const handleStartEmergencyNav = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'START_EMERGENCY_NAV' },
        '*'
      );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 px-2 sm:px-4 py-3">
      {/* ── Top Control & Header Bar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-start gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mt-1 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex-shrink-0"
              title={lang === 'ta' ? 'ஆவணத்திற்கு திரும்பு' : 'Back to Clinical Reader'}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 mb-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              <span>
                {lang === 'ta'
                  ? 'அவசர மருத்துவ வழிசெலுத்தல் & வரைபடம்'
                  : 'Emergency Hospital & Pharmacy Navigation HUD'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>🏥</span>
              <span>
                {lang === 'ta'
                  ? 'அருகிலுள்ள மருத்துவமனைகள் & ஐசியூ படுக்கைகள்'
                  : 'Nearby Hospitals, ICU Beds & 24/7 Pharmacies'}
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {lang === 'ta'
                ? 'பூஜ்ஜிய API கட்டணத்துடன் நேரடி செயற்கைக்கோள் வரைபடம், அவசர ஆம்புலன்ஸ் பாதை மற்றும் ஐசியூ படுக்கை நிலை.'
                : 'Zero API Key high-resolution satellite medical map with live turn-by-turn routing to nearest emergency care and 24x7 chemists.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Language Toggle Button */}
          <button
            type="button"
            onClick={() => setLang(lang === 'ta' ? 'en' : 'ta')}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            {lang === 'ta' ? 'English' : 'தமிழ் (Tamil)'}
          </button>

          {/* Emergency Direct Nav Trigger */}
          <button
            type="button"
            onClick={handleStartEmergencyNav}
            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Navigate to nearest 24/7 Trauma / Emergency facility"
          >
            <Navigation className="h-3.5 w-3.5" />
            <span>{lang === 'ta' ? 'அவசர பாதை' : 'Emergency Route'}</span>
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span>
              {isFullscreen
                ? lang === 'ta'
                  ? 'வழக்கமான திரை'
                  : 'Exit Fullscreen'
                : lang === 'ta'
                ? 'முழுத்திரை'
                : 'Fullscreen'}
            </span>
          </button>

          {/* Open in Separate Tab Link */}
          <a
            href="/map/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-teal-600/20 transition-all"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>{lang === 'ta' ? 'தனி தாவல்' : 'New Tab'}</span>
          </a>
        </div>
      </div>

      {/* ── Category Filter Quick Chips ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          type="button"
          onClick={() => handleFilterClick('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all flex-shrink-0 cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>{lang === 'ta' ? 'அனைத்து மருத்துவ வசதிகள்' : 'All Medical'}</span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterClick('emergency')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all flex-shrink-0 cursor-pointer ${
            activeFilter === 'emergency'
              ? 'bg-red-600 text-white shadow-sm shadow-red-500/20'
              : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 hover:bg-red-100'
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>🚨 {lang === 'ta' ? '24/7 அவசர சிகிச்சை & விபத்து' : '24/7 Emergency & Trauma'}</span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterClick('hospital')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all flex-shrink-0 cursor-pointer ${
            activeFilter === 'hospital'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100'
          }`}
        >
          <HeartPulse className="h-3.5 w-3.5" />
          <span>🏥 {lang === 'ta' ? 'மருத்துவமனைகள் & ICU' : 'Hospitals & ICU'}</span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterClick('pharmacy')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all flex-shrink-0 cursor-pointer ${
            activeFilter === 'pharmacy'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
          }`}
        >
          <Pill className="h-3.5 w-3.5" />
          <span>💊 {lang === 'ta' ? '24/7 மருந்தகங்கள் (Pharmacies)' : '24/7 Chemists'}</span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterClick('clinic')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all flex-shrink-0 cursor-pointer ${
            activeFilter === 'clinic'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
          }`}
        >
          <Stethoscope className="h-3.5 w-3.5" />
          <span>🩺 {lang === 'ta' ? 'கிளினிக்குகள் (Clinics)' : 'OPD Clinics'}</span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterClick('bloodbank')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all flex-shrink-0 cursor-pointer ${
            activeFilter === 'bloodbank'
              ? 'bg-rose-700 text-white shadow-sm'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100'
          }`}
        >
          <Droplet className="h-3.5 w-3.5" />
          <span>🩸 {lang === 'ta' ? 'இரத்த வங்கிகள்' : 'Blood Banks'}</span>
        </button>
      </div>

      {/* ── Embedded Leaflet Medical Navigation HUD ── */}
      <div
        className={`relative w-full rounded-2xl overflow-hidden border-2 border-slate-300 dark:border-slate-700 shadow-xl bg-slate-900 transition-all duration-300 ${
          isFullscreen
            ? 'fixed inset-0 z-50 rounded-none border-none h-screen'
            : 'h-[720px]'
        }`}
      >
        {isFullscreen && (
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-50 px-4 py-2 rounded-xl bg-slate-900/90 text-white border border-white/30 text-xs font-extrabold shadow-2xl backdrop-blur-md hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
          >
            <Minimize2 className="h-3.5 w-3.5" />
            <span>{lang === 'ta' ? 'வழக்கமான திரை' : 'Close Fullscreen'}</span>
          </button>
        )}
        <iframe
          ref={iframeRef}
          src="/map/index.html"
          title="Hospital & Emergency Medical Map"
          className="w-full h-full border-0"
          allow="geolocation *; microphone *; camera *; accelerometer *; gyroscope *;"
        />
      </div>

      {/* ── Quick Emergency Actions Banner ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-950 dark:text-red-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-sm">
            🚑
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-red-900 dark:text-red-300">
              {lang === 'ta' ? 'தேசிய ஆம்புலன்ஸ் சேவை' : 'National Ambulance'}
            </h4>
            <a
              href="tel:108"
              className="text-sm font-extrabold text-red-700 dark:text-red-400 hover:underline flex items-center gap-1"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>{lang === 'ta' ? '108-ஐ அழைக்கவும் (இலவசம்)' : 'Call 108 Emergency (Free)'}</span>
            </a>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 text-teal-950 dark:text-teal-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-sm">
            🛡️
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-teal-900 dark:text-teal-300">
              {lang === 'ta' ? 'பேரிடர் & போலீஸ் உதவி' : 'Disaster & Police Helpline'}
            </h4>
            <a
              href="tel:112"
              className="text-sm font-extrabold text-teal-800 dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>{lang === 'ta' ? '112-ஐ அழைக்கவும்' : 'Call 112 Multi-Disaster'}</span>
            </a>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-950 dark:text-emerald-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-sm">
            💊
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
              {lang === 'ta' ? 'செயலில் உள்ள நோயாளி' : 'Active Patient Profile'}
            </h4>
            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 truncate">
              {activeProfile?.name || (lang === 'ta' ? 'செயலில் உள்ள நோயாளி' : 'Active Patient')} (
              {activeProfile?.blood_group || (lang === 'ta' ? 'இரத்த வகை: குறிப்பிடப்படவில்லை' : 'Blood Group: Not recorded')})
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

