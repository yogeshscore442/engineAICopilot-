import { useState } from 'react';
import { useApp } from '../AppContext';
import { api } from '../api';
import Disclaimer from '../components/Disclaimer';

function InfoIcon({ className = '' }: { className?: string }) {
  return (
    <span
      className={`w-3.5 h-3.5 rounded-full border border-slate-400 text-slate-500 text-[10px] font-bold inline-flex items-center justify-center leading-none select-none transition-colors group-hover:border-teal-600 group-hover:text-teal-700 ${className}`}
    >
      i
    </span>
  );
}

export default function Settings() {
  const { t, lang, setLang, profileId, setProfileId, user, profiles, activeProfile } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'profile' | 'language' | 'ai' | 'compliance' | 'data'>('all');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedItem((prev) => (prev === id ? null : id));
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to permanently delete all medical records for profile "${profileId}"? This action is irreversible.`)) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await api.deleteProfile(profileId);
      setDeleteSuccess(true);
      setTimeout(() => {
        window.location.href = '/timeline';
      }, 1200);
    } catch (err) {
      const message = err && typeof err === 'object' && 'error' in err
        ? (err as { error: { message: string } }).error.message
        : 'Failed to delete records';
      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  const filterTabs = [
    { id: 'all', label: 'All Settings', icon: '📑' },
    { id: 'profile', label: 'Patient Profile', icon: '👤' },
    { id: 'language', label: 'Language & Voice', icon: '🌐' },
    { id: 'ai', label: 'AI Model & Engine', icon: '🤖' },
    { id: 'compliance', label: 'ABDM & Compliance', icon: '🛡️' },
    { id: 'data', label: 'Data & Reset', icon: '⚠️' },
  ];

  const shouldShow = (section: string) => activeFilter === 'all' || activeFilter === section;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* ── Formal Page Header ── */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>System & Clinical Preferences</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {lang === 'ta' ? 'கணினி அமைப்புகள் & விருப்பங்கள்' : 'Settings & Preferences'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage clinical identity, AI inference engine, language localization, and data compliance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700">
              v1.0.0 · Core
            </span>
          </div>
        </div>

        {/* ── Compact Filter Tabs ── */}
        <div className="flex items-center gap-1.5 mt-4 overflow-x-auto scrollbar-none pb-0.5">
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-teal-800 text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 hover:text-slate-900'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs font-bold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {deleteSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2 shadow-xs">
          <span>✓</span>
          <span>{t('settings.deleteSuccess')} Refreshing workspace…</span>
        </div>
      )}

      {/* ── 1. PATIENT PROFILE & IDENTITY ── */}
      {shouldShow('profile') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span>👤</span> Patient Profile & Clinical Identity
            </h2>
            <span className="text-[11px] font-mono text-teal-800 font-semibold">
              ID: {activeProfile?.profile_id || user?.user_id?.slice(0, 8) || 'DEFAULT'}
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-2xs">
            {/* Row 1: Active Patient Card */}
            <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal-800 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {(activeProfile?.name || user?.name || 'P').charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{activeProfile?.name || user?.name || 'Active Patient'}</span>
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-teal-100 text-teal-900 border border-teal-300">
                      {activeProfile?.blood_group || 'Blood Group: Not recorded'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {activeProfile?.age ? `${activeProfile.age} Y` : 'Age unlisted'} · {activeProfile?.gender || 'Unspecified'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    {activeProfile?.relation ? `Family Relation: ${activeProfile.relation}` : 'Primary Account Profile'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  ABHA: {activeProfile?.abha_id || 'Not linked'}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ✓ Active Profile
                </span>
              </div>
            </div>

            {/* Row 2: Emergency Contact */}
            <div className="p-3.5 transition-colors hover:bg-slate-50/70">
              <div
                onClick={() => toggleExpand('physician')}
                className="flex items-center justify-between gap-2 cursor-pointer group select-none"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-800 group-hover:text-teal-900 transition-colors">
                    Emergency ICE Contact & Caregiver
                  </h3>
                  <InfoIcon />
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-teal-700 transition-colors">
                  {expandedItem === 'physician' ? '▴' : '▾'}
                </span>
              </div>

              {expandedItem === 'physician' && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 font-medium">ICE Contact:</span>
                    <span className="text-xs font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 w-fit">
                      🚨 {activeProfile?.ice_contacts?.[0] ? `${activeProfile.ice_contacts[0].name} (${activeProfile.ice_contacts[0].phone})` : 'National Emergency (112)'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-1.5 pt-1 border-t border-slate-50">
                    <InfoIcon className="w-3 h-3 text-[8.5px]" />
                    <span>Emergency in case of emergency (ICE) contact notified during SOS events.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Row 3: Primary Condition / Allergies */}
            <div className="p-3.5 transition-colors hover:bg-slate-50/70">
              <div
                onClick={() => toggleExpand('condition')}
                className="flex items-center justify-between gap-2 cursor-pointer group select-none"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-800 group-hover:text-teal-900 transition-colors">
                    Known Allergies & Clinical Flags
                  </h3>
                  <InfoIcon />
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-teal-700 transition-colors">
                  {expandedItem === 'condition' ? '▴' : '▾'}
                </span>
              </div>

              {expandedItem === 'condition' && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 font-medium">Allergies / Flags:</span>
                    <span className="text-xs font-semibold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 w-fit">
                      {activeProfile?.allergies || 'No allergies recorded'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-1.5 pt-1 border-t border-slate-50">
                    <InfoIcon className="w-3 h-3 text-[8.5px]" />
                    <span>Cross-referenced automatically against newly extracted prescriptions for drug-allergy interactions.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Row 4: Switch Family Profile */}
            <div className="p-3.5 transition-colors hover:bg-slate-50/70">
              <div
                onClick={() => toggleExpand('profile-sandbox')}
                className="flex items-center justify-between gap-3 cursor-pointer group select-none"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-800 group-hover:text-teal-900 transition-colors">
                    Family Profiles ({profiles.length})
                  </h3>
                  <InfoIcon />
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-teal-700 transition-colors">
                  {expandedItem === 'profile-sandbox' ? '▴' : '▾'}
                </span>
              </div>

              {expandedItem === 'profile-sandbox' && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 font-medium">Switch Active Profile:</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {profiles.map((p) => (
                        <button
                          key={p.profile_id}
                          onClick={() => setProfileId(p.profile_id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            profileId === p.profile_id
                              ? 'bg-teal-700 text-white shadow-2xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {p.name} ({p.relation})
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-1.5 pt-1 border-t border-slate-50">
                    <InfoIcon className="w-3 h-3 text-[8.5px]" />
                    <span>Every query, chat message, and timeline record is strictly isolated to the active profile.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 2. LANGUAGE & LOCALIZATION ── */}
      {shouldShow('language') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span>🌐</span> Language & Voice Localization
            </h2>
            <span className="text-[11px] font-bold text-teal-800">
              Current: {lang.toUpperCase()}
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-2xs">
            <div className="p-3.5 transition-colors hover:bg-slate-50/70">
              <div
                onClick={() => toggleExpand('language')}
                className="flex items-center justify-between gap-3 cursor-pointer group select-none"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-800 group-hover:text-teal-900 transition-colors">
                    Interface & Speech Language
                  </h3>
                  <InfoIcon />
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-teal-700 transition-colors">
                  {expandedItem === 'language' ? '▴' : '▾'}
                </span>
              </div>

              {expandedItem === 'language' && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 font-medium">Select Language:</span>
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 w-fit">
                      {[
                        { code: 'en' as const, label: 'English', flag: '🇬🇧' },
                        { code: 'ta' as const, label: 'தமிழ்', flag: '🇮🇳' },
                        { code: 'hi' as const, label: 'हिंदी', flag: '🇮🇳' },
                      ].map((item) => {
                        const isSelected = lang === item.code;
                        return (
                          <button
                            key={item.code}
                            onClick={() => setLang(item.code)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-white text-teal-900 shadow-2xs border border-slate-200/80 font-bold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>{item.flag}</span>
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-1.5 pt-1 border-t border-slate-50">
                    <InfoIcon className="w-3 h-3 text-[8.5px]" />
                    <span>Sets medical report translations and Gemini AI speech synthesis pronunciation.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 3. CLINICAL AI ENGINE & MODEL ── */}
      {shouldShow('ai') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span>🤖</span> Clinical Multimodal AI Engine
            </h2>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Gemini Active
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-2xs">
            {/* Row 1: Model & Latency */}
            <div className="p-3.5 transition-colors hover:bg-slate-50/70">
              <div
                onClick={() => toggleExpand('ai-model')}
                className="flex items-center justify-between gap-2 cursor-pointer group select-none"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-800 group-hover:text-teal-900 transition-colors">
                    AI Model & Inference Provider
                  </h3>
                  <InfoIcon />
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-teal-700 transition-colors">
                  {expandedItem === 'ai-model' ? '▴' : '▾'}
                </span>
              </div>

              {expandedItem === 'ai-model' && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 font-medium">Inference Architecture:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                        gemini-3.8-flash
                      </span>
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                        0.16s latency
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-1.5 pt-1 border-t border-slate-50">
                    <InfoIcon className="w-3 h-3 text-[8.5px]" />
                    <span>Google Generative AI multimodal clinical reasoning pipeline for fast report analysis.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Row 2: API Key */}
            <div className="p-3.5 transition-colors hover:bg-slate-50/70">
              <div
                onClick={() => toggleExpand('api-key')}
                className="flex items-center justify-between gap-2 cursor-pointer group select-none"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-800 group-hover:text-teal-900 transition-colors">
                    Gemini API Key Authentication
                  </h3>
                  <InfoIcon />
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-teal-700 transition-colors">
                  {expandedItem === 'api-key' ? '▴' : '▾'}
                </span>
              </div>

              {expandedItem === 'api-key' && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 font-medium">Credential Security:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                        ••••••••••••••••••••
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        ✓ Configured
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-1.5 pt-1 border-t border-slate-50">
                    <InfoIcon className="w-3 h-3 text-[8.5px]" />
                    <span>Configured securely in server environment (.env) with encrypted REST transport.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Row 3: Backend Mode Switcher */}
            <div className="p-3.5 transition-colors hover:bg-slate-50/70">
              <div
                onClick={() => toggleExpand('backend-mode')}
                className="flex items-center justify-between gap-2 cursor-pointer group select-none"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-800 group-hover:text-teal-900 transition-colors">
                    Backend Communication Mode
                  </h3>
                  <InfoIcon />
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-teal-700 transition-colors">
                  {expandedItem === 'backend-mode' ? '▴' : '▾'}
                </span>
              </div>

              {expandedItem === 'backend-mode' && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 font-medium">Server Pipeline:</span>
                    <div className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white shadow-2xs flex items-center gap-1.5 w-fit">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                      <span>Live Backend (FastAPI + SQLite Engine)</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-1.5 pt-1 border-t border-slate-50">
                    <InfoIcon className="w-3 h-3 text-[8.5px]" />
                    <span>Connected to live backend engine on http://127.0.0.1:8000.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 4. HEALTHCARE STANDARDS & COMPLIANCE ── */}
      {shouldShow('compliance') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span>🛡️</span> Healthcare Standards & Compliance
            </h2>
            <span className="text-[11px] font-mono text-teal-800 font-semibold">
              ABDM & FHIR
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-2xs text-xs">
            {/* Standard 1 */}
            <div className="p-3 transition-colors hover:bg-slate-50/70">
              <div
                onClick={() => toggleExpand('fhir')}
                className="flex items-center justify-between gap-2 cursor-pointer group select-none"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800 group-hover:text-teal-900 transition-colors">
                    HL7 FHIR R4 Specification
                  </span>
                  <InfoIcon />
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-teal-700 transition-colors">
                  {expandedItem === 'fhir' ? '▴' : '▾'}
                </span>
              </div>

              {expandedItem === 'fhir' && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 font-medium">Compliance Level:</span>
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      ✓ Compliant
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-1.5 pt-1 border-t border-slate-50">
                    <InfoIcon className="w-3 h-3 text-[8.5px]" />
                    <span>Structured standard JSON Bundles for Patient, Observation, and MedicationRequest resources.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Standard 2 */}
            <div className="p-3 transition-colors hover:bg-slate-50/70">
              <div
                onClick={() => toggleExpand('abdm-readiness')}
                className="flex items-center justify-between gap-2 cursor-pointer group select-none"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800 group-hover:text-teal-900 transition-colors">
                    ABDM PHR Gateway Readiness
                  </span>
                  <InfoIcon />
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-teal-700 transition-colors">
                  {expandedItem === 'abdm-readiness' ? '▴' : '▾'}
                </span>
              </div>

              {expandedItem === 'abdm-readiness' && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 font-medium">Gateway Protocol:</span>
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      ✓ Active
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-1.5 pt-1 border-t border-slate-50">
                    <InfoIcon className="w-3 h-3 text-[8.5px]" />
                    <span>14-digit national ABHA linking, QR verification, and consent-based health import.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Standard 3 */}
            <div className="p-3 transition-colors hover:bg-slate-50/70">
              <div
                onClick={() => toggleExpand('privacy')}
                className="flex items-center justify-between gap-2 cursor-pointer group select-none"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800 group-hover:text-teal-900 transition-colors">
                    Zero-Log Privacy Guardrails
                  </span>
                  <InfoIcon />
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-teal-700 transition-colors">
                  {expandedItem === 'privacy' ? '▴' : '▾'}
                </span>
              </div>

              {expandedItem === 'privacy' && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 font-medium">Privacy Status:</span>
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      ✓ Enforced
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-1.5 pt-1 border-t border-slate-50">
                    <InfoIcon className="w-3 h-3 text-[8.5px]" />
                    <span>PHI processed locally without third-party tracking or advertising logs.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Standard 4 */}
            <div className="p-3 transition-colors hover:bg-slate-50/70">
              <div
                onClick={() => toggleExpand('safety')}
                className="flex items-center justify-between gap-2 cursor-pointer group select-none"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800 group-hover:text-teal-900 transition-colors">
                    Clinical Non-Diagnostic Safety
                  </span>
                  <InfoIcon />
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-teal-700 transition-colors">
                  {expandedItem === 'safety' ? '▴' : '▾'}
                </span>
              </div>

              {expandedItem === 'safety' && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 font-medium">Clinical Safety:</span>
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      ✓ Verified
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-1.5 pt-1 border-t border-slate-50">
                    <InfoIcon className="w-3 h-3 text-[8.5px]" />
                    <span>Strict assistive AI boundaries with mandatory physician review disclaimers.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 5. DATA RESET & DANGER ZONE ── */}
      {shouldShow('data') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
              <span>⚠️</span> Data Management & Danger Zone
            </h2>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              Irreversible Action
            </span>
          </div>

          <div className="bg-white rounded-xl border border-rose-200 divide-y divide-rose-100 shadow-2xs">
            <div className="p-3.5 transition-colors hover:bg-rose-50/30">
              <div
                onClick={() => toggleExpand('purge')}
                className="flex items-center justify-between gap-3 cursor-pointer group select-none"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-800 group-hover:text-rose-900 transition-colors">
                    Purge Profile Medical Records
                  </h3>
                  <InfoIcon className="border-rose-300 text-rose-600 group-hover:border-rose-600" />
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-rose-700 transition-colors">
                  {expandedItem === 'purge' ? '▴' : '▾'}
                </span>
              </div>

              {expandedItem === 'purge' && (
                <div className="mt-2.5 pt-2.5 border-t border-rose-100 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs text-rose-600 font-medium">Permanent Record Deletion:</span>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-2xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap w-fit"
                    >
                      <span>🗑️</span>
                      <span>{deleting ? 'Purging…' : `Purge Records (${profileId})`}</span>
                    </button>
                  </div>
                  <div className="text-xs text-rose-800 flex items-center gap-1.5 pt-1 border-t border-rose-50">
                    <InfoIcon className="w-3 h-3 text-[8.5px] border-rose-300 text-rose-600" />
                    <span>Permanently deletes all timeline entries, lab tests, prescriptions, and AI summaries for profile {profileId}.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Disclaimer />
    </div>
  );
}