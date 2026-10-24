import { useState, useRef } from 'react';
import { useApp } from '../AppContext';
import { api } from '../api';
import ErrorState from '../components/ErrorState';
import Disclaimer from '../components/Disclaimer';

const SUGGESTED_QUESTIONS = [
  'What is my latest HbA1c result and trend?',
  'What are my current diabetic medications and food instructions?',
  'Are there any duplicate medicines in my prescriptions?',
  'What did my doctor note in my latest discharge summary?',
];

export default function Ask() {
  const { t, lang, profileId, profiles, setProfileId, activeProfile } = useApp();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<Array<{ record_id: string; field: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const [speaking, setSpeaking] = useState(false);

  const detectedOtherProfile = (() => {
    if (!profiles || profiles.length <= 1) return null;
    const qLower = question.toLowerCase();
    for (const p of profiles) {
      if (p.profile_id === profileId) continue;
      const nameParts = p.name.toLowerCase().split(" ");
      const rel = (p.relation || "").toLowerCase();
      const keywords = [...nameParts, rel];
      if (rel === "father") keywords.push("dad", "appa");
      if (rel === "mother") keywords.push("mom", "amma");
      if (rel === "son" || rel === "daughter") keywords.push("child", "kid");
      if (keywords.some((k) => k.length > 2 && qLower.includes(k))) {
        return p;
      }
    }
    return null;
  })();

  const speakAnswer = (textToSpeak: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      if (speaking) {
        setSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(textToSpeak.replace(/[#*`_]/g, ""));
      utterance.lang = lang === "ta" ? "ta-IN" : lang === "hi" ? "hi-IN" : "en-IN";
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };


  const startVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;

      // Set speech recognition language based on active app language
      recognition.lang = lang === 'ta' ? 'ta-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setQuestion(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleSend = async (queryText?: string) => {
    const q = queryText || question;
    if (!q.trim()) return;
    setQuestion(q);
    setLoading(true);
    setError(null);
    setAnswer(null);
    setSources([]);
    try {
      const result = await api.askRecords(profileId, q, lang);
      setAnswer(result.answer);
      setSources(result.sources || []);
    } catch (err) {
      const message = err && typeof err === 'object' && 'error' in err
        ? (err as { error: { message: string } }).error.message
        : 'Failed to query medical records';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="badge badge-normal text-xs font-bold uppercase tracking-wider">
            🤖 Grounded Medical RAG
          </span>
          <span className="text-xs text-text-muted">Strict Source Citation</span>
        </div>
        <h2 className="text-2xl font-bold text-text-primary mt-1">{t('ask.title')}</h2>
        <p className="text-sm text-text-secondary mt-0.5">
          Ask questions answered strictly using evidence extracted from your verified documents
        </p>
      </div>

      {/* Suggested Questions */}
      <div className="card p-4 space-y-2 bg-gradient-to-r from-teal-50/40 via-surface-50 to-white border-glow-teal">
        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
          Suggested Questions / மாதிரி கேள்விகள் / सुझाव:
        </span>
        <div className="flex flex-wrap gap-2 pt-1">
          {SUGGESTED_QUESTIONS.map((sq, i) => (
            <button
              key={i}
              onClick={() => handleSend(sq)}
              className="text-left text-xs px-3 py-2 rounded-lg bg-white border border-border-medium hover:border-primary-400 hover:text-primary-800 transition-colors shadow-2xs"
            >
              💬 {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Query Input Box with Voice Microphone Dictation */}
      <div className="card p-4 shadow-sm border-border-light relative overflow-hidden">
        {isListening && (
          <div className="mb-2 p-2 bg-rose-50 border border-rose-300 rounded-lg flex items-center justify-between text-xs text-rose-800 animate-pulse">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
              <span>Listening to your voice ({lang.toUpperCase()})… Speak now!</span>
            </span>
            <span className="font-mono text-[10px]">Listening…</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={
              isListening
                ? 'Listening to speech…'
                : lang === 'ta'
                ? 'உங்கள் மருத்துவ பதிவேடுகள் பற்றி கேளுங்கள்…'
                : lang === 'hi'
                ? 'अपने मेडिकल रिकॉर्ड्स के बारे में पूछें…'
                : t('ask.placeholder')
            }
            className="input flex-1 text-sm"
            disabled={loading}
          />

          {/* Voice Microphone Button */}
          <button
            onClick={startVoiceInput}
            type="button"
            className={`p-3 rounded-lg border transition-all flex items-center justify-center ${
              isListening
                ? 'bg-rose-600 text-white border-rose-600 shadow-md animate-bounce'
                : 'bg-surface-50 text-slate-700 border-border-medium hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300'
            }`}
            title="Speak Question (Voice Input in English / தமிழ் / हिंदी)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
          </button>

          <button
            onClick={() => handleSend()}
            disabled={loading || !question.trim()}
            className="btn-primary py-3 px-6 shadow-sm"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Searching…</span>
              </span>
            ) : (
              t('ask.send')
            )}
          </button>
        </div>
      </div>

      {error && (
        <ErrorState message={error} onRetry={() => handleSend()} />
      )}

            {/* Cross-Profile Family Member Query Alert */}
      {detectedOtherProfile && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-xs text-amber-900 shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-base">ð¡</span>
            <span>
              <strong>Family Member Query:</strong> You seem to be asking about <strong>{detectedOtherProfile.name}</strong> ({detectedOtherProfile.relation}), but your active view is set to <strong>{activeProfile?.name}</strong>.
            </span>
          </div>
          <button
            onClick={() => {
              setProfileId(detectedOtherProfile.profile_id);
              handleSend();
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-extrabold text-xs ml-3 shadow-xs cursor-pointer flex-shrink-0 transition-all"
          >
            Switch to {detectedOtherProfile.name.split(" ")[0]}'s Profile â
          </button>
        </div>
      )}

      {/* Answer Box */}
      {answer && (
        <div className="card p-6 border-l-4 border-l-teal-600 border-glow-teal shadow-md space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-base flex-shrink-0">
              AI
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-text-primary text-sm uppercase tracking-wider">
                  Grounded Synthesis Answer
                </h4>
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ✓ Sourced from Records
                </span>
                <button type="button" onClick={() => speakAnswer(answer)} className="ml-2 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-300 px-2.5 py-1 rounded-lg hover:bg-teal-100">{speaking ? "Stop Audio" : "Listen Read Aloud"}</button>
              </div>
              <p className="text-text-primary text-sm leading-relaxed bg-surface-50 p-4 rounded-xl border border-border-light">
                {answer}
              </p>
            </div>
          </div>

          {/* Source Citations */}
          {sources.length > 0 && (
            <div className="pt-3 border-t border-border-light">
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                Referenced Verification Sources:
              </p>
              <div className="flex flex-wrap gap-2">
                {sources.map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md font-mono border border-slate-200"
                  >
                    <span>📄</span>
                    <span>{s.record_id}</span>
                    <span className="text-teal-700 font-bold">[{s.field}]</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Disclaimer />
    </div>
  );
}