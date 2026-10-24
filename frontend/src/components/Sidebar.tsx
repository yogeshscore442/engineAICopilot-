import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../AppContext';
import HospitalLogo from './HospitalLogo';
import LanguageDropdown from './LanguageDropdown';
import { api } from '../api';

type NavItem = {
  to: string;
  label: string;
  icon: string;
  badge?: string;
  badgeColor?: 'teal' | 'emerald' | 'purple' | 'amber' | 'rose' | 'slate';
  isDanger?: boolean;
};

type NavGroup = {
  groupTitle: string;
  items: NavItem[];
};

export default function Sidebar() {
  const { lang, setLang, openNodeModal, profileId, activeProfile, reminders } = useApp();
  const [latestSugar, setLatestSugar] = useState<{ value: number; unit: string; flag: string } | null>(null);
  const [latestBP, setLatestBP] = useState<{ value: string; unit: string; flag: string } | null>(null);

  useEffect(() => {
    let active = true;
    if (!profileId) return;

    api.getTrends(profileId, 'Glucose')
      .then((res) => {
        if (active && res?.points?.length) {
          const pt = res.points[res.points.length - 1];
          setLatestSugar({ value: pt.value, unit: res.unit || 'mg/dL', flag: pt.flag });
        } else if (active) {
          setLatestSugar(null);
        }
      })
      .catch(() => { if (active) setLatestSugar(null); });

    api.getTrends(profileId, 'Blood Pressure')
      .then((res) => {
        if (active && res?.points?.length) {
          const pt = res.points[res.points.length - 1];
          setLatestBP({ value: String(pt.value), unit: res.unit || 'mmHg', flag: pt.flag });
        } else if (active) {
          setLatestBP(null);
        }
      })
      .catch(() => { if (active) setLatestBP(null); });

    return () => { active = false; };
  }, [profileId]);

  const dueRemindersCount = reminders.filter((r) => r.is_active && !r.is_completed).length;

  const navGroups: NavGroup[] = [
    {
      groupTitle: lang === 'ta' ? 'ஆவணங்கள் & ஸ்கேன்' : lang === 'hi' ? 'रिकॉर्ड्स और स्कैन' : 'RECORDS & AI SCAN',
      items: [
        {
          to: '/timeline',
          label: lang === 'ta' ? 'டைம்லைன்' : lang === 'hi' ? 'टाइमलाइन' : 'Health Timeline',
          icon: 'timeline',
        },
        {
          to: '/upload',
          label: lang === 'ta' ? 'பதிவேற்று & ஸ்கேன்' : lang === 'hi' ? 'अपलोड और स्कैन' : 'Upload & AI Scan',
          icon: 'upload',
          badge: 'OCR',
          badgeColor: 'teal',
        },
        {
          to: '/compare',
          label: lang === 'ta' ? 'லேப் ஒப்பீடு' : lang === 'hi' ? 'लैब रिपोर्ट तुलना' : 'Lab Diff Analyzer',
          icon: 'compare',
        },
      ],
    },
    {
      groupTitle: lang === 'ta' ? 'மருத்துவ AI & ஆலோசனை' : lang === 'hi' ? 'क्लिनिकल एआई' : 'CLINICAL AI & INSIGHTS',
      items: [
        {
          to: '/trends',
          label: lang === 'ta' ? 'டிரெண்ட்ஸ்' : lang === 'hi' ? 'बायोमार्कर्स' : 'Biomarker Trends',
          icon: 'trends',
        },
        {
          to: '/medicines',
          label: lang === 'ta' ? 'மருந்துகள்' : lang === 'hi' ? 'दवाइयां' : 'Medication Pillbox',
          icon: 'medicines',
        },
        {
          to: '/reminders',
          label: lang === 'ta' ? 'மருந்து நினைவூட்டல்' : lang === 'hi' ? 'दवा रिमाइंडर' : 'Prescription Reminders',
          icon: 'reminders',
          badge: dueRemindersCount > 0 ? `${dueRemindersCount} Due` : undefined,
          badgeColor: 'amber',
        },
        {
          to: '/wellness',
          label: lang === 'ta' ? 'நல்வாழ்வு வழிகாட்டி' : lang === 'hi' ? 'वेलनेस गाइड' : 'Clinical Wellness',
          icon: 'wellness',
        },
        {
          to: '/doctor-prep',
          label: lang === 'ta' ? 'மருத்துவர் சந்திப்பு' : lang === 'hi' ? 'डॉक्टर विजिट प्रेप' : 'Doctor Visit Prep',
          icon: 'doctor',
        },
        {
          to: '/alerts',
          label: lang === 'ta' ? 'பாதுகாப்பு எச்சரிக்கை' : lang === 'hi' ? 'दवा सुरक्षा' : 'Drug Safety Alerts',
          icon: 'alerts',
        },
      ],
    },
    {
      groupTitle: lang === 'ta' ? 'அரசு ஆபா & அவசரம்' : lang === 'hi' ? 'ஆभा और इमरजेंसी' : 'ABDM & EMERGENCY',
      items: [
        {
          to: '/abha',
          label: lang === 'ta' ? 'ஆபா (ABHA) கார்டு' : lang === 'hi' ? 'आभा (ABHA) कार्ड' : 'ABHA Health ID',
          icon: 'abha',
        },
        {
          to: '/emergency',
          label: lang === 'ta' ? 'அவசர மருத்துவ அட்டை' : lang === 'hi' ? 'इमरजेंसी मेडिकल कार्ड' : 'Emergency Medical SOS',
          icon: 'emergency',
          isDanger: true,
          badge: 'SOS',
          badgeColor: 'rose',
        },
        {
          to: '/map',
          label: lang === 'ta' ? 'மருத்துவமனை வரைபடம்' : lang === 'hi' ? 'अस्पताल और आईसीयू मैप' : 'Hospital & ICU Map',
          icon: 'map',
          badge: 'Live',
          badgeColor: 'emerald',
        },
        {
          to: '/ask',
          label: lang === 'ta' ? 'AI-யிடம் கேளுங்கள்' : lang === 'hi' ? 'एआई से पूछें' : 'Ask Clinical AI',
          icon: 'ask',
          badge: 'Voice',
          badgeColor: 'teal',
        },
        {
          to: '/family',
          label: lang === 'ta' ? 'à®à¯à®à¯à®®à¯à®ª à®µà®¾à®²à¯à®à¯' : lang === 'hi' ? 'à¤ªà¤°à¤¿à¤µà¤¾à¤° à¤µà¥à¤²à¥à¤' : 'Family Vault',
          icon: 'family',
          badge: 'Vault',
          badgeColor: 'teal',
        },
        {
          to: '/settings',
          label: lang === 'ta' ? 'அமைப்புகள்' : lang === 'hi' ? 'सेटिंग्स' : 'System Settings',
          icon: 'settings',
        },
      ],
    },
  ];

  return (
    <aside className="sidebar">
      {/* 1. Brand Header + Language Dropdown */}
      <div className="p-4 border-b border-slate-200/80 bg-white flex flex-wrap items-center justify-between gap-3">
        <HospitalLogo size="md" showSubtitle={true} className="w-full" />
        <div className="ml-auto"><LanguageDropdown lang={lang} setLang={setLang} /></div>
      </div>

      {/* 2. ABDM Network Status */}
      <div className="px-3 pt-2.5">
        <button
          onClick={openNodeModal}
          className="w-full px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100/80 border border-teal-200/80 flex items-center justify-between text-xs text-teal-900 font-bold transition-all shadow-2xs group cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="tracking-wide uppercase text-[11px] font-extrabold text-teal-900">
              ABDM Gateway: Active
            </span>
          </div>
          <span className="font-mono text-[10.5px] font-extrabold text-teal-900 bg-white px-1.5 py-0.5 rounded border border-teal-200 group-hover:bg-teal-600 group-hover:text-white transition-colors">
            Connected
          </span>
        </button>
      </div>

      {/* 3. Navigation Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-3.5 scrollbar-thin">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            <div className="px-2.5 pb-1 flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider text-slate-600 uppercase">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              <span>{group.groupTitle}</span>
            </div>

            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all duration-150 ${
                    isActive
                      ? 'bg-teal-50/90 text-teal-950 font-bold border border-teal-200 shadow-2xs border-l-4 border-l-teal-600'
                      : 'text-slate-800 hover:bg-slate-100 hover:text-slate-950 font-bold'
                  } ${item.isDanger ? 'hover:text-rose-700 hover:bg-rose-50' : ''}`
                }
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <NavIcon name={item.icon} isDanger={item.isDanger} />
                  <span className="truncate text-[13.5px] font-bold tracking-tight text-slate-800 group-hover:text-slate-950">
                    {item.label}
                  </span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[9.5px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider flex-shrink-0 ${
                      item.badgeColor === 'emerald'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold'
                        : item.badgeColor === 'amber'
                        ? 'bg-amber-50 text-amber-900 border-amber-300 font-extrabold animate-pulse'
                        : item.badgeColor === 'rose'
                        ? 'bg-rose-50 text-rose-800 border-rose-300 font-extrabold animate-pulse'
                        : 'bg-teal-50 text-teal-900 border-teal-300 font-extrabold'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* 4. Real Vitals HUD Card (From active database profile) */}
      <div className="p-3 border-t border-slate-200/90 bg-slate-50/90">
        <div className="rounded-2xl bg-white border border-slate-200/90 p-2.5 shadow-2xs">
          <div className="flex items-center justify-between mb-2 px-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                {activeProfile?.name ? `${activeProfile.name}'s Vitals` : 'Patient Vitals'}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-500">
              Verified
            </span>
          </div>

          {latestSugar || latestBP ? (
            <div className="grid grid-cols-2 gap-2">
              {latestSugar && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-amber-950">🩸 Sugar</span>
                    <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1 rounded">{latestSugar.flag}</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-sm font-black font-mono text-amber-950">{latestSugar.value}</span>
                    <span className="text-[9px] font-bold text-amber-800">{latestSugar.unit}</span>
                  </div>
                </div>
              )}

              {latestBP && (
                <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-teal-950">🫀 BP</span>
                    <span className="text-[9px] font-bold text-teal-800 bg-teal-100 px-1 rounded">{latestBP.flag}</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-sm font-black font-mono text-teal-950">{latestBP.value}</span>
                    <span className="text-[9px] font-bold text-teal-800">{latestBP.unit}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-2 text-center rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500">
              No recorded vitals yet • Upload a lab report
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function NavIcon({ name, isDanger }: { name: string; isDanger?: boolean }) {
  const config: Record<string, { from: string; to: string; shadow: string; content: React.ReactNode }> = {
    timeline: {
      from: '#0d9488', to: '#0891b2', shadow: 'rgba(13,148,136,0.35)',
      content: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
      ),
    },
    upload: {
      from: '#6366f1', to: '#8b5cf6', shadow: 'rgba(99,102,241,0.35)',
      content: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 15V5m0 0-3.5 3.5M12 5l3.5 3.5" strokeWidth={2.2} />
          <path d="M4.5 17.5A3.5 3.5 0 0 0 6 20h12a3.5 3.5 0 0 0 1.5-6.68" />
        </svg>
      ),
    },
    compare: {
      from: '#059669', to: '#10b981', shadow: 'rgba(5,150,105,0.35)',
      content: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="7" height="16" rx="1.5" />
          <rect x="14" y="4" width="7" height="16" rx="1.5" />
        </svg>
      ),
    },
    doctor: {
      from: '#7c3aed', to: '#a855f7', shadow: 'rgba(124,58,237,0.35)',
      content: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M12 11v6M9 14h6" />
        </svg>
      ),
    },
    trends: {
      from: '#0284c7', to: '#38bdf8', shadow: 'rgba(2,132,199,0.35)',
      content: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      ),
    },
    medicines: {
      from: '#0f766e', to: '#14b8a6', shadow: 'rgba(15,118,110,0.35)',
      content: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
          <path d="m8.5 8.5 7 7" />
        </svg>
      ),
    },
    reminders: {
      from: '#0ea5e9', to: '#0284c7', shadow: 'rgba(14,165,233,0.35)',
      content: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2 2" />
          <path d="M5 3 2 6M22 6l-3-3" strokeWidth={1.5} />
        </svg>
      ),
    },
    wellness: {
      from: '#10b981', to: '#059669', shadow: 'rgba(16,185,129,0.35)',
      content: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      ),
    },
    alerts: {
      from: '#d97706', to: '#f59e0b', shadow: 'rgba(217,119,6,0.35)',
      content: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
      ),
    },
    abha: {
      from: '#0f766e', to: '#0284c7', shadow: 'rgba(15,118,110,0.35)',
      content: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <path d="M2 10h20M7 15h.01M17 15h.01" />
        </svg>
      ),
    },
    emergency: {
      from: '#dc2626', to: '#ef4444', shadow: 'rgba(220,38,38,0.4)',
      content: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2Z" />
          <path d="M12 8v4M12 16h.01" strokeWidth={2.5} />
        </svg>
      ),
    },
    map: {
      from: '#059669', to: '#0d9488', shadow: 'rgba(13,148,136,0.35)',
      content: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
          <line x1="9" x2="9" y1="3" y2="18" />
          <line x1="15" x2="15" y1="6" y2="21" />
        </svg>
      ),
    },
    ask: {
      from: '#0891b2', to: '#6366f1', shadow: 'rgba(99,102,241,0.35)',
      content: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
          <path d="M9.5 9.5h.01M12 9.5h.01M14.5 9.5h.01" strokeWidth={2.4} />
        </svg>
      ),
    },
        family: {
      from: '#0f766e', to: '#0d9488', shadow: 'rgba(15,118,110,0.35)',
      content: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    settings: {
      from: '#475569', to: '#64748b', shadow: 'rgba(71,85,105,0.3)',
      content: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      ),
    },
  };

  if (isDanger || name === 'emergency') {
    return (
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg,#dc2626,#ef4444)',
          boxShadow: '0 4px 12px rgba(220,38,38,0.4)',
        }}
      >
        <div className="absolute inset-0 animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
        {config.emergency.content}
      </div>
    );
  }

  const c = config[name];
  if (!c) return null;

  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-150 group-hover:scale-110"
      style={{
        background: `linear-gradient(135deg, ${c.from}, ${c.to})`,
        boxShadow: `0 4px 10px ${c.shadow}`,
      }}
    >
      {c.content}
    </div>
  );
}
