import { useEffect, useRef, useState } from 'react';
import {
  FileText,
  HeartPulse,
  MessageSquare,
  Moon,
  Sparkles,
  Sun,
  Upload,
  FlaskConical,
  ShieldCheck,
  MapPin
} from 'lucide-react';
import { api, isMockMode, setMockMode } from './api';
import {
  AnalyzeResponse,
  ChatMessage,
  HealthResponse,
  Step
} from './types';
import { HealthBanner } from './components/HealthBanner';
import { UploadStep } from './components/UploadStep';
import { ReviewStep } from './components/ReviewStep';
import { ChatPanel } from './components/ChatPanel';
import { SummaryStep } from './components/SummaryStep';
import HospitalMap from './screens/HospitalMap';
import { mockLabReportResponse, mockPrescriptionResponse } from './mockData';
import { PQCChannelState, onPQCStateChange, initPQCChannel, resetPQCChannel } from './pqcClient';

export function App() {
  // Stepper State (In-Memory Only, never stored in web storage)
  const [step, setStep] = useState<Step>('upload');
  const [analyzeData, setAnalyzeData] = useState<AnalyzeResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [summaryText, setSummaryText] = useState<string>('');

  // UI & Network States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [mockActive, setMockActive] = useState<boolean>(isMockMode());
  const [pqcState, setPqcState] = useState<PQCChannelState | null>(null);

  // Dark mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // AbortController ref for in-flight cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // PQC Channel State Subscription & Auto-Handshake
  useEffect(() => {
    const unsub = onPQCStateChange((st) => setPqcState(st));
    if (!mockActive) {
      initPQCChannel();
    }
    return () => unsub();
  }, [mockActive]);

  // Initial Health Check
  useEffect(() => {
    let mounted = true;
    const checkHealth = async () => {
      try {
        const res = await api.getHealth();
        if (mounted) {
          setHealth(res);
          setServerError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          setServerError(err instanceof Error ? err.message : 'Server unreachable');
        }
      }
    };
    checkHealth();
    return () => {
      mounted = false;
    };
  }, [mockActive]);

  const toggleMockMode = () => {
    const next = !mockActive;
    setMockMode(next);
    setMockActive(next);
    setServerError(null);
  };

  // 1. Analyze Document Handler
  const handleAnalyze = async (file: File) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const ac = new AbortController();
    abortControllerRef.current = ac;

    setIsLoading(true);
    setError(null);
    setIsSessionExpired(false);

    try {
      const result = await api.analyze(file, ac.signal);
      setAnalyzeData(result);

      // Pre-seed greeting message in chat
      const isRx = result.document_type === 'prescription';
      const patientName = result.patient.name ? ` ${result.patient.name.split(' ')[0]}` : '';
      const initialGreeting = isRx
        ? `Hello${patientName}! I have read your prescription and computed your dosing schedule. How can I help you understand your medicines today?`
        : `Hello${patientName}! I have reviewed your laboratory diagnostic report. Feel free to ask what your values mean or which flags to discuss with your doctor.`;

      setMessages([
        {
          id: 'greeting-1',
          role: 'assistant',
          content: initialGreeting,
          timestamp: new Date(),
        },
      ]);

      setStep('review');
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // 2. Chat Query Handler
  const handleSendMessage = async (text: string) => {
    if (!analyzeData?.session_id) return;

    // Check emergency pattern locally for instant feedback if needed
    const lower = text.toLowerCase();
    const isEmergencyPrompt =
      lower.includes('chest pain') ||
      lower.includes('heart attack') ||
      lower.includes('cannot breathe') ||
      lower.includes('overdose') ||
      lower.includes('severe allergic');

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
      isEmergency: isEmergencyPrompt,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.chat(analyzeData.session_id, text);
      const isEmergencyReply =
        res.reply.startsWith('EMERGENCY') ||
        res.reply.toLowerCase().includes('call 112') ||
        res.reply.toLowerCase().includes('call 108') ||
        res.reply.toLowerCase().includes('emergency room');

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        cards: res.cards,
        timestamp: new Date(),
        isEmergency: isEmergencyReply,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes('Session expired') || (err as { statusCode?: number }).statusCode === 404) {
          setIsSessionExpired(true);
        } else {
          setError(err);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Open Direct Links (Buy or Images)
  const handleOpenLinks = async (index: number, kind: 'purchase' | 'images') => {
    if (!analyzeData?.session_id) return;
    setIsLoading(true);
    try {
      const res = await api.getLinks(analyzeData.session_id, index, kind);
      if (res.cards && res.cards.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-links-${Date.now()}`,
            role: 'assistant',
            content: `Here are the ${kind === 'purchase' ? 'pharmacy purchase' : 'packaging reference'} links for **${res.cards[0].medicine}**:`,
            cards: res.cards,
            timestamp: new Date(),
          },
        ]);
        setStep('copilot');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error('Could not fetch links'));
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Finish & Summarize
  const handleFinishAndSummarize = async () => {
    if (!analyzeData?.session_id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getSummary(analyzeData.session_id);
      setSummaryText(res.summary);
      setStep('summary');
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error('Could not generate summary'));
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Reset All State (Start Over)
  const handleResetSession = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    resetPQCChannel();
    if (!mockActive) {
      initPQCChannel();
    }
    setAnalyzeData(null);
    setMessages([]);
    setSummaryText('');
    setError(null);
    setIsSessionExpired(false);
    setStep('upload');
  };

  // Mock sample loaders for rapid demo testing
  const handleLoadMockRx = () => {
    setAnalyzeData(mockPrescriptionResponse);
    setMessages([
      {
        id: 'mock-rx-greeting',
        role: 'assistant',
        content: `Hello! I have reviewed **Kavitha Ramaswamy's** prescription from Dr. R. Selvan for Acute Sinusitis. I computed your dosing schedule for **4 medicines**. How can I help you?`,
        timestamp: new Date(),
      },
    ]);
    setStep('review');
  };

  const handleLoadMockLab = () => {
    setAnalyzeData(mockLabReportResponse);
    setMessages([
      {
        id: 'mock-lab-greeting',
        role: 'assistant',
        content: `Hello! I have analyzed **Suresh Narayanan's** diagnostic report. Notice that **Fasting Plasma Glucose (168 mg/dL)** and **HbA1c (8.2%)** are flagged as high. Feel free to ask what to discuss with your doctor.`,
        timestamp: new Date(),
      },
    ]);
    setStep('review');
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      {/* Top Health and Status Banner */}
      <HealthBanner health={health} serverError={serverError} pqcState={pqcState} />

      {/* Main App Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          {/* Brand Logo */}
          <div
            onClick={handleResetSession}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="p-2 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-slate-900 via-brand-600 to-indigo-600 dark:from-white dark:via-brand-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Healthcare Copilot
              </span>
              <span className="hidden sm:block text-[10px] text-slate-400 font-medium">
                AI Prescription &amp; Lab Reader
              </span>
            </div>
          </div>

          {/* Stepper Navigation on Tablets & Desktop */}
          {analyzeData && (
            <nav aria-label="Workflow progress" className="hidden md:flex items-center gap-1.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStep('review')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  step === 'review'
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-bold border border-brand-200 dark:border-brand-800'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>1. Review</span>
              </button>

              <span className="text-slate-300 dark:text-slate-700">&bull;</span>

              <button
                type="button"
                onClick={() => setStep('copilot')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  step === 'copilot'
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-bold border border-brand-200 dark:border-brand-800'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>2. Copilot Chat</span>
              </button>

              {summaryText && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                  <button
                    type="button"
                    onClick={() => setStep('summary')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                      step === 'summary'
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-bold border border-brand-200 dark:border-brand-800'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>3. Summary</span>
                  </button>
                </>
              )}

              <span className="text-slate-300 dark:text-slate-700">&bull;</span>
              <button
                type="button"
                onClick={() => setStep('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  step === 'map'
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>Hospital Map</span>
              </button>
            </nav>
          )}

          {/* Right Header Utilities (PQC Status + Mock Toggle + Dark Mode) */}
          <div className="flex items-center gap-2">
            {pqcState?.status === 'active' && (
              <div
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 shadow-sm"
                title={`PQC Active: FIPS 203 ML-KEM-768 & FIPS 204 ML-DSA-65\nKey ID: ${pqcState.keyId}\nFingerprint: ${pqcState.serverFingerprint}`}
              >
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Quantum-Safe</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setStep(step === 'map' ? (analyzeData ? 'review' : 'upload') : 'map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs min-h-[36px] cursor-pointer ${
                step === 'map'
                  ? 'bg-rose-600 text-white shadow-rose-600/30'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 dark:hover:bg-rose-900/60'
              }`}
              title="Emergency Hospital & 24/7 Pharmacy Navigation Map"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <MapPin className="h-3.5 w-3.5" />
              <span>{step === 'map' ? 'Exit Map' : 'Hospital Map'}</span>
            </button>

            <button
              type="button"
              onClick={toggleMockMode}
              title="Toggle Mock / Live backend mode"
              className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold border transition-all flex items-center gap-1.5 min-h-[36px] ${
                mockActive
                  ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              <span>{mockActive ? 'Mock: ON' : 'Mock: OFF'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              aria-label="Toggle dark mode"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {analyzeData && (
              <button
                type="button"
                onClick={handleResetSession}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 min-h-[36px]"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>New</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {step === 'map' && (
          <div className="p-2 sm:p-4 max-w-6xl mx-auto">
            <HospitalMap onBack={() => setStep(analyzeData ? 'review' : 'upload')} />
          </div>
        )}

        {step === 'upload' && (
          <UploadStep
            onAnalyze={handleAnalyze}
            isLoading={isLoading}
            onCancel={() => {
              if (abortControllerRef.current) abortControllerRef.current.abort();
              setIsLoading(false);
            }}
            error={error}
            onDismissError={() => setError(null)}
            onLoadMockPrescription={handleLoadMockRx}
            onLoadMockLabReport={handleLoadMockLab}
            onOpenMap={() => setStep('map')}
          />
        )}

        {step === 'review' && analyzeData && (
          <ReviewStep
            data={analyzeData}
            onGoToChat={(initialQuery) => {
              if (initialQuery) {
                handleSendMessage(initialQuery);
              }
              setStep('copilot');
            }}
            onOpenLinks={handleOpenLinks}
            onOpenMap={() => setStep('map')}
          />
        )}

        {step === 'copilot' && analyzeData && (
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            documentType={analyzeData.document_type}
            onFinishAndSummarize={handleFinishAndSummarize}
            onResetSession={handleResetSession}
            isSessionExpired={isSessionExpired}
            onOpenMap={() => setStep('map')}
          />
        )}

        {step === 'summary' && analyzeData && (
          <SummaryStep
            summaryText={summaryText}
            schedule={analyzeData.schedule}
            sessionId={analyzeData.session_id}
            signatureBundle={analyzeData.signature_bundle}
            onStartNewDocument={handleResetSession}
            onOpenMap={() => setStep('map')}
          />
        )}
      </main>

      {/* Persistent Disclaimer Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 py-3.5 px-4 text-center text-xs text-slate-500 dark:text-slate-400 print:hidden">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            <strong>Information only, not medical advice.</strong> Confirm all medicines, doses, and results with your doctor or pharmacist.
          </p>
          <p className="text-[11px] text-slate-400">
            Zero browser persistence &bull; HIPAA &amp; Privacy compliant
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
