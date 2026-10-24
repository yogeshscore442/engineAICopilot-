type HospitalLogoProps = {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
};

export default function HospitalLogo({
  size = 'md',
  showSubtitle = true,
  className = '',
}: HospitalLogoProps) {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  const titleSizes = {
    sm: 'text-sm font-extrabold',
    md: 'text-base font-extrabold tracking-tight',
    lg: 'text-xl font-black tracking-tight',
  };

  const subtitleSizes = {
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-xs',
  };

  return (
    <div className={`flex items-center gap-3 select-none group cursor-pointer ${className}`}>
      {/* Advanced Holographic Neural Cross SVG Icon */}
      <div className={`relative ${iconSizes[size]} flex-shrink-0 flex items-center justify-center`}>
        {/* Soft Ambient Glow Halo */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-teal-500 via-cyan-400 to-indigo-500 blur-md opacity-40 group-hover:opacity-75 transition-opacity duration-300 animate-pulse-glow" />

        {/* Primary Logo Housing */}
        <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 border border-teal-400/40 p-1.5 shadow-lg flex items-center justify-center overflow-hidden">
          {/* Subtle Cyber Grid Background */}
          <div className="absolute inset-0 bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:6px_6px] opacity-25" />

          {/* Precision SVG Graphics */}
          <svg
            className="w-full h-full relative z-10"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="cyberTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2dd4bf" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
              <linearGradient id="neonGlow" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
              <filter id="neonBlur" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Orbital Cyber Ring */}
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="url(#cyberTealGrad)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              className="opacity-70"
            />

            {/* Neural Connection Nodes */}
            <circle cx="24" cy="4" r="2" fill="#2dd4bf" />
            <circle cx="44" cy="24" r="2" fill="#06b6d4" />
            <circle cx="24" cy="44" r="2" fill="#6366f1" />
            <circle cx="4" cy="24" r="2" fill="#38bdf8" />

            {/* Symmetrical Medical Cross Facets */}
            <rect x="20.5" y="10" width="7" height="28" rx="3.5" fill="url(#cyberTealGrad)" opacity="0.3" />
            <rect x="10" y="20.5" width="28" height="7" rx="3.5" fill="url(#cyberTealGrad)" opacity="0.3" />

            {/* Dynamic ECG Heartbeat Waveform cutting through the center */}
            <path
              d="M8 24h7l2.5-5 4 10 3.5-12 3 7h12"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#neonBlur)"
            />

            {/* Center Core Spark */}
            <circle cx="24" cy="24" r="1.5" fill="#38bdf8" />
          </svg>
        </div>
      </div>

      {/* Typography & Sub-branding */}
      <div className="pl-1.5">
        <div className="flex items-center gap-1.5">
          <span className={`bg-gradient-to-r from-teal-900 via-cyan-900 to-indigo-950 bg-clip-text text-transparent ${titleSizes[size]}`}>
            AI Health Copilot
          </span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-300">
            PRO
          </span>
        </div>
        {showSubtitle && (
          <p className={`font-semibold text-teal-700 flex items-center gap-1.5 ${subtitleSizes[size]}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            Hospital & Patient Portal
          </p>
        )}
      </div>
    </div>
  );
}
