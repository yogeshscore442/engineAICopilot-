import { useState } from 'react';
import type { PatientProfile } from '../types/auth';
import { DEMO_PATIENTS } from '../types/auth';
import HospitalLogo from './HospitalLogo';
import InfoTooltip from './InfoTooltip';

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentUser: PatientProfile;
  onLogin: (user: PatientProfile) => void;
};

export default function LoginModal({ isOpen, onClose, currentUser, onLogin }: LoginModalProps) {
  const [selectedHospital, setSelectedHospital] = useState(currentUser.hospitalName || DEMO_PATIENTS[0].hospitalName);
  const [patientId, setPatientId] = useState(currentUser.id || DEMO_PATIENTS[0].id);
  const [patientName, setPatientName] = useState(currentUser.name || DEMO_PATIENTS[0].name);
  const [pin, setPin] = useState('••••');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuickPatientSelect = (demo: PatientProfile) => {
    setSelectedHospital(demo.hospitalName);
    setPatientId(demo.id);
    setPatientName(demo.name);
    setPin('••••');
    setFeedback(`Selected: ${demo.name} (${demo.hospitalName.split(',')[0]})`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setFeedback('Connecting to Hospital ABDM Patient Records Gateway...');

    setTimeout(() => {
      const matched = DEMO_PATIENTS.find((d) => d.id.toLowerCase() === patientId.toLowerCase());

      const loggedPatient: PatientProfile = matched || {
        id: patientId || 'APL-PAT-2024-001',
        name: patientName || 'Verified Patient',
        age: 52,
        gender: 'Male',
        bloodGroup: 'O+',
        hospitalName: selectedHospital,
        hospitalCode: selectedHospital.includes('AIIMS')
          ? 'AIIMS-DEL'
          : selectedHospital.includes('Fortis')
          ? 'FORTIS-CHE'
          : 'APOLLO-CHE',
        uhid: `UHID-${patientId.replace(/[^A-Za-z0-9]/g, '')}`,
        abhaId: '91-2345-6789-0123',
        primaryDoctor: 'Dr. Arvind Swaminathan (Cardiology)',
        primaryCondition: 'Type 2 Diabetes & Mild Hypertension',
        emergencyContact: '+91 98401 23456 (Family)',
        lastSync: 'Just now',
        isLoggedIn: true,
      };

      onLogin(loggedPatient);
      setIsAuthenticating(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      {/* Holographic Glowing Modal Box */}
      <div className="relative w-full max-w-lg rounded-3xl modal-glow-popup p-6 sm:p-8 text-slate-900 overflow-hidden border border-teal-500/50 shadow-2xl bg-white/95 backdrop-blur-xl max-h-[90vh] overflow-y-auto">
        {/* Animated Accent Rim */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-600" />

        {/* Header with Logo */}
        <div className="flex items-start justify-between mb-5">
          <HospitalLogo size="md" showSubtitle={true} />
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors text-sm font-bold cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Title & Info */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-[11px] font-black uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              Patient Portal • நோயாளி உள்நுழைவு
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Login with Hospital Patient ID
            </h2>
            <InfoTooltip
              size="md"
              align="right"
              text="Enter the unique Patient ID (UHID / MRN) issued by your hospital to view your medical timeline, prescriptions, and lab tests."
            />
          </div>
        </div>

        {/* 1-Click Demo Patient Accounts */}
        <div className="mb-4 bg-gradient-to-br from-slate-50 to-teal-50/60 p-3 rounded-2xl border border-teal-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-teal-600">⚡</span> Quick Demo Patients (Click to switch):
            </p>
            <InfoTooltip
              size="sm"
              align="right"
              text="1-Click preloaded patient accounts to quickly test with verified electronic medical records."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {DEMO_PATIENTS.map((demo) => {
              const isSelected = currentUser.id === demo.id;
              return (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => handleQuickPatientSelect(demo)}
                  className={`text-left p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-teal-700 text-white border-teal-800 shadow-md font-bold'
                      : 'bg-white hover:bg-teal-50 text-slate-800 border-slate-200 hover:border-teal-400 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-black truncate">{demo.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                        isSelected ? 'bg-teal-800 text-teal-100' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {demo.bloodGroup}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] font-bold opacity-90 truncate">{demo.id}</span>
                  <span className="text-[9px] font-semibold opacity-75 truncate">{demo.hospitalName.split(',')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {feedback && (
          <div className="mb-3 p-2 rounded-xl bg-teal-100 text-teal-900 border border-teal-300 text-xs font-black flex items-center gap-2 animate-fadeIn">
            <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse"></span>
            {feedback}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Hospital Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  Select Your Hospital:
                </label>
                <InfoTooltip
                  size="sm"
                  align="left"
                  text="Select the hospital where your electronic patient health records (EHR) are registered."
                />
              </div>
            </div>
            <select
              value={selectedHospital}
              onChange={(e) => setSelectedHospital(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all shadow-sm"
            >
              <option value="Apollo Speciality Hospitals, Greams Rd">Apollo Speciality Hospitals (Greams Rd, Chennai)</option>
              <option value="AIIMS Central Hospital, New Delhi">AIIMS Central Hospital (New Delhi)</option>
              <option value="Fortis Malar Super Speciality Hospital">Fortis Malar Super Speciality Hospital</option>
              <option value="Kauvery Hospital, Alwarpet">Kauvery Hospital (Alwarpet, Chennai)</option>
              <option value="Manipal Hospital, Bangalore">Manipal Hospital (Bangalore)</option>
              <option value="Govt Multi Super Speciality Hospital">Govt Multi Super Speciality Hospital (Omandurar)</option>
            </select>
          </div>

          {/* Hospital Patient ID / UHID */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  Hospital Patient ID / UHID Number:
                </label>
                <InfoTooltip
                  size="sm"
                  align="left"
                  text="Enter your hospital-issued Patient UHID or MRN (e.g. APL-PAT-2024-001) to fetch all linked electronic health records."
                />
              </div>
              <span className="font-mono text-[10px] text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded font-black border border-teal-200">
                e.g. APL-PAT-2024-001
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                required
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="e.g. APL-PAT-2024-001 or AIIMS-MRN-9912"
                className="w-full pl-9 pr-4 py-2.5 text-sm font-mono font-black bg-white border border-slate-300 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all shadow-inner"
              />
              <span className="absolute left-3 top-3 text-teal-600 text-sm">🪪</span>
            </div>
          </div>

          {/* Patient Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  Patient Full Name:
                </label>
                <InfoTooltip
                  size="sm"
                  align="left"
                  text="Enter the full legal name of the patient as recorded during hospital registration."
                />
              </div>
            </div>
            <input
              type="text"
              required
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="e.g. Rajesh Kumar"
              className="w-full px-3 py-2 text-sm font-bold bg-white border border-slate-300 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all shadow-sm"
            />
          </div>

          {/* Access PIN / Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  Patient Portal PIN / Access Code:
                </label>
                <InfoTooltip
                  size="sm"
                  align="left"
                  text="4-digit security PIN or password for patient records portal authentication (Default: 4-digit PIN)."
                />
              </div>
              <span className="text-[10px] text-slate-400 font-bold">Default: 4-digit PIN</span>
            </div>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              className="w-full px-3 py-2 text-sm font-mono font-black tracking-widest bg-white border border-slate-300 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all shadow-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-black text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Continue as Current
            </button>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black text-white bg-gradient-to-r from-teal-600 via-teal-700 to-indigo-700 hover:from-teal-700 hover:to-indigo-800 shadow-md shadow-teal-700/20 border border-teal-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isAuthenticating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span className="font-black">Authenticating Patient ID…</span>
                </>
              ) : (
                <>
                  <span>🔐</span>
                  <span className="font-black">Login with Hospital Patient ID</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security & ABDM Footer */}
        <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-1.5 font-black text-teal-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            ABDM Patient Health Records (PHR) Compliant
          </span>
          <span className="font-mono font-black text-slate-400">FHIR-style export • Demo only</span>
        </div>
      </div>
    </div>
  );
}
