import React, { useState } from 'react';
import type { Language } from '../i18n';
import { useApp } from '../AppContext';

type LoginScreenProps = {
  lang: Language;
  setLang: (lang: Language) => void;
};

export default function LoginScreen({ lang, setLang }: LoginScreenProps) {
  const { login, register } = useApp();
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError(lang === 'ta' ? 'மின்னஞ்சல் மற்றும் கடவுச்சொல்லை உள்ளிடவும்' : 'Please enter your email and password');
      return;
    }

    if (isRegistering && !name.trim()) {
      setError(lang === 'ta' ? 'தயவுசெய்து உங்கள் பெயரை உள்ளிடவும்' : 'Please enter your full name');
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        const ok = await register(email.trim(), password.trim(), name.trim());
        if (!ok) {
          setError(lang === 'ta' ? 'பதிவு தோல்வியடைந்தது. வேறு மின்னஞ்சலை முயற்சிக்கவும்.' : 'Registration failed. Email may already be in use.');
        }
      } else {
        const ok = await login(email.trim(), password.trim());
        if (!ok) {
          setError(lang === 'ta' ? 'தவறான மின்னஞ்சல் அல்லது கடவுச்சொல்.' : 'Invalid email or password. Please try again.');
        }
      }
    } catch (err: any) {
      setError(err?.error?.message || err?.message || 'Authentication failed. Please verify the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  

  return (
    <div
      className="login-screen min-h-screen w-full flex flex-col justify-center items-center relative overflow-hidden p-4 select-none"
      style={{ background: 'linear-gradient(135deg, #091E2A 0%, #0F313E 45%, #061B24 100%)' }}
    >
      {/* Background glow meshes */}
      <div
        className="absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full pointer-events-none opacity-40"
        style={{ background: 'radial-gradient(circle, rgba(15,163,151,0.3) 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-[550px] h-[550px] rounded-full pointer-events-none opacity-40"
        style={{ background: 'radial-gradient(circle, rgba(59,155,240,0.25) 0%, transparent 70%)' }}
      />

      {/* Language Switcher in top right */}
      <div className="absolute top-5 right-5 z-20 flex items-center gap-2 bg-slate-900/60 backdrop-blur-md p-1.5 rounded-xl border border-white/10 text-xs">
        <span className="text-slate-400 font-bold px-2">🌐</span>
        {(['en', 'ta', 'hi'] as Language[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              lang === l ? 'bg-teal-500 text-white shadow-md' : 'text-slate-300 hover:text-white'
            }`}
          >
            {l === 'en' ? 'English' : l === 'ta' ? 'தமிழ்' : 'हिन्दी'}
          </button>
        ))}
      </div>

      {/* Main Glassmorphic Card */}
      <div className="relative z-10 w-full max-w-md bg-slate-900/70 backdrop-blur-xl border border-white/15 rounded-3xl p-7 sm:p-9 shadow-2xl text-white">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center text-2xl shadow-lg shadow-teal-500/25 mb-3 border border-teal-300/30">
            🩺
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Aarogya<span className="text-teal-400">AI</span> Copilot
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xs">
            {lang === 'ta'
              ? 'உங்கள் குடும்பத்திற்கான தனிப்பட்ட AI மருத்துவ உதவியாளர்'
              : lang === 'hi'
              ? 'आपके परिवार का पर्सनल क्लिनिकल एआई कोपायलट'
              : 'AI-Powered Personal & Family Health Copilot'}
          </p>
        </div>

        {/* Auth Mode Toggle */}
        <div className="flex rounded-xl bg-slate-800/80 p-1 mb-6 border border-white/5">
          <button
            type="button"
            onClick={() => { setIsRegistering(false); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              !isRegistering ? 'bg-teal-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            {lang === 'ta' ? 'உள்நுழையவும்' : lang === 'hi' ? 'साइन इन करें' : 'Sign In'}
          </button>
          <button
            type="button"
            onClick={() => { setIsRegistering(true); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              isRegistering ? 'bg-teal-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            {lang === 'ta' ? 'குடும்ப கணக்கு உருவாக்கம்' : lang === 'hi' ? 'नया परिवार खाता' : 'Create Account'}
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-medium flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Real Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                {lang === 'ta' ? 'குடும்பத் தலைவர் பெயர்' : lang === 'hi' ? 'पूरा नाम' : 'Full Name / Head of Family'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rajesh Kumar"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/70 border border-white/10 text-white text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all placeholder:text-slate-500"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              {lang === 'ta' ? 'மின்னஞ்சல்' : lang === 'hi' ? 'ईमेल' : 'Email Address'}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/70 border border-white/10 text-white text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              {lang === 'ta' ? 'கடவுச்சொல்' : lang === 'hi' ? 'पासवर्ड' : 'Password'}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/70 border border-white/10 text-white text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all placeholder:text-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/25 transition-all transform active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{lang === 'ta' ? 'சரிபார்க்கிறது…' : 'Authenticating…'}</span>
              </>
            ) : isRegistering ? (
              <span>{lang === 'ta' ? 'கணக்கை உருவாக்கவும்' : 'Create Family Account'}</span>
            ) : (
              <span>{lang === 'ta' ? 'உள்நுழைக' : 'Sign In to Health Portal'}</span>
            )}
          </button>
        </form>

        

        {/* Non-diagnostic Disclaimer */}
        <p className="text-[10px] text-slate-400 text-center mt-5 leading-normal">
          🔒 Secure local clinical database • ABDM FHIR R4 Ready • Non-diagnostic clinical AI navigator
        </p>
      </div>
    </div>
  );
}
