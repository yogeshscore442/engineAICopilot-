import { useState, useRef, useEffect } from 'react';
import { useApp } from '../AppContext';
import { api } from '../api';
import type { Language } from '../i18n';

type ChatMessage = {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  imageUrl?: string;
  timestamp: string;
  sources?: Array<{ record_id: string; field: string }>;
};

const AI_FEATURES = [
  { icon: '🎙️', label: 'Voice', sublabel: 'Tamil • Hindi • English' },
  { icon: '📷', label: 'Photo OCR', sublabel: 'Prescriptions & Labs' },
  { icon: '💬', label: 'Text', sublabel: 'Multi-language NLP' },
  { icon: '🧬', label: 'Biomarkers', sublabel: 'HbA1c, BP, Glucose' },
  { icon: '💊', label: 'Drug Safety', sublabel: 'Interaction Check' },
  { icon: '📊', label: 'Trends', sublabel: 'Longitudinal Analysis' },
];

function messageId() { return crypto.randomUUID(); }
function messageTime() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

export default function AiCopilotWidget() {
  const { lang, setLang, user, profileId } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'features'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'ai',
      text:
        lang === 'ta'
          ? `வணக்கம் ${user?.name || 'நோயாளி'}! நான் உங்கள் AI மருத்துவ உதவியாளர். குரல் (Voice), புகைப்படம் (Photo), அல்லது தட்டச்சு (Text) செய்து உரையாடுங்கள்.`
          : lang === 'hi'
          ? `नमस्ते ${user?.name || 'मरीज'}! मैं आपका एआई हेल्थ कोपायलट हूं। आवाज (Voice), फोटो (Photo), या टेक्स्ट में पूछ सकते हैं।`
          : `Hello ${user?.name || 'Patient'}! I am your Clinical AI Copilot powered by Gemini. Ask me about your records, medications, biomarkers, or upload a photo of a prescription. I speak Tamil, Hindi & English.`,
      timestamp: 'Just now',
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, loading]);

  const lastSpeechRef = useRef('');

  const toggleListening = () => {
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
      recognition.lang = lang === 'ta' ? 'ta-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
      lastSpeechRef.current = '';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setInputQuery(transcript);
        lastSpeechRef.current = transcript;
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => {
        setIsListening(false);
        const spoken = lastSpeechRef.current.trim();
        if (spoken.length >= 2) {
          handleSendMessage(spoken, true);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const speakText = (text: string, msgId: string) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang === 'ta' ? 'ta-IN' : lang === 'hi' ? 'hi-IN' : 'en-US';
    utterance.rate = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const target = lang === 'ta' ? 'ta' : lang === 'hi' ? 'hi' : 'en';
    const matchedVoice = voices.find((v) => v.lang.toLowerCase().replace('_', '-').startsWith(target));
    if (matchedVoice) utterance.voice = matchedVoice;

    utterance.onstart = () => setSpeakingMessageId(msgId);
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    window.speechSynthesis.speak(utterance);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAttachedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (customQuery?: string, isVoice: boolean = false) => {
    const q = customQuery || inputQuery;
    if (!q.trim() && !attachedImage) return;

    const userMsg: ChatMessage = {
      id: `user-${messageId()}`,
      sender: 'user',
      text: q.trim() || (lang === 'ta' ? 'மருத்துவ ஆவணத்தை ஆய்வு செய்' : 'Analyze this medical record'),
      imageUrl: attachedImage || undefined,
      timestamp: messageTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setAttachedImage(null);
    setLoading(true);

    try {
      let aiResponseText = '';
      let sources: Array<{ record_id: string; field: string }> = [];

      if (attachedImage) {
        aiResponseText = 'This chat does not extract attached images. Open Upload, submit the document, and review the extracted fields there.';
      } else {
        const res = await api.askRecords(profileId, q, lang);
        aiResponseText = res.answer;
        sources = res.sources || [];
      }

      const aiMsgId = `ai-${messageId()}`;
      const timestamp = messageTime();
      setMessages((prev) => [
        ...prev,
        {
          id: aiMsgId,
          sender: 'ai',
          text: aiResponseText,
          sources,
          timestamp,
        },
      ]);

      // If submitted via voice, automatically speak the AI's reply back!
      if (isVoice) {
        speakText(aiResponseText, aiMsgId);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${messageId()}`,
          sender: 'ai',
          text:
            lang === 'ta'
              ? 'மன்னிக்கவும், தற்காலிக பிழை. மீண்டும் முயற்சிக்கவும்.'
              : 'I could not retrieve an answer at this moment. Please try again.',
          timestamp: 'Just now',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    {
      en: 'Explain my latest HbA1c result',
      ta: 'என் சமீபத்திய HbA1c முடிவை விளக்கு',
      hi: 'मेरे हालिया HbA1c परिणाम को समझाएं',
      emoji: '🧬',
    },
    {
      en: 'Check medication interactions',
      ta: 'மருந்து தொடர்புகளை சரிபார்',
      hi: 'दवाओं की जाँच करें',
      emoji: '💊',
    },
    {
      en: 'Summarize my health records',
      ta: 'என் மருத்துவ பதிவுகளை சுருக்கு',
      hi: 'मेरे रिकॉर्ड का सारांश',
      emoji: '📋',
    },
    {
      en: 'Prepare doctor visit notes',
      ta: 'மருத்துவர் சந்திப்பு குறிப்புகள்',
      hi: 'डॉक्टर विजिट प्रेप',
      emoji: '🩺',
    },
  ];

  return (
    <div className="copilot-dock fixed z-50 select-none flex flex-col items-end gap-3">

      {/* ── Floating AI Chat Panel ── */}
      {isOpen && (
        <div
          className={`w-[360px] sm:w-[420px] rounded-3xl flex flex-col overflow-hidden transition-all duration-300 ai-copilot-panel ${
            isMinimized ? 'h-[62px]' : 'h-[600px] max-h-[88vh]'
          }`}
          style={{
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(24px)',
            border: '1.5px solid rgba(20,184,166,0.35)',
            boxShadow: '0 32px 64px -12px rgba(15,23,42,0.28), 0 0 40px -8px rgba(13,148,136,0.25)',
          }}
        >
          {/* ── Header ── */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #134e4a 50%, #1e1b4b 100%)',
              borderBottom: '1px solid rgba(20,184,166,0.3)',
            }}
          >
            {/* Brand */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #0d9488, #6366f1)',
                  boxShadow: '0 0 16px rgba(13,148,136,0.5)',
                }}
              >
                <AiBrainIcon />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-extrabold text-sm tracking-tight">Clinical AI</span>
                  <span
                    className="text-[9px] font-black px-1.5 py-0.5 rounded-md text-cyan-200"
                    style={{ background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.3)' }}
                  >
                    GEMINI
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-[10px] text-teal-300/80 font-medium">
                    Voice · Photo · Text · Multilingual
                  </p>
                </div>
              </div>
            </div>

            {/* Header controls */}
            <div className="flex items-center gap-1">
              {/* Language Switcher */}
              <div
                className="flex items-center rounded-xl p-0.5 mr-1"
                style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(20,184,166,0.25)' }}
              >
                {(['en', 'ta', 'hi'] as Language[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                      lang === l
                        ? 'bg-teal-500 text-white shadow-sm'
                        : 'text-teal-300/60 hover:text-white'
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Tab Toggle */}
              <button
                onClick={() => setActiveTab(activeTab === 'chat' ? 'features' : 'chat')}
                className="w-7 h-7 rounded-xl flex items-center justify-center text-xs transition-all cursor-pointer"
                style={{ background: 'rgba(0,0,0,0.25)', color: 'rgba(203,213,225,0.8)' }}
                title="Toggle AI Features"
              >
                {activeTab === 'chat' ? '⚡' : '💬'}
              </button>

              {/* Minimize */}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
                style={{ background: 'rgba(0,0,0,0.25)', color: 'rgba(203,213,225,0.8)' }}
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? '▢' : '—'}
              </button>

              {/* Close */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                  if (recognitionRef.current) recognitionRef.current.stop();
                }}
                className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all cursor-pointer hover:bg-rose-600"
                style={{ background: 'rgba(0,0,0,0.25)', color: 'rgba(203,213,225,0.8)' }}
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* ── Panel Body ── */}
          {!isMinimized && (
            <>
              {/* FEATURES TAB */}
              {activeTab === 'features' && (
                <div className="flex-1 overflow-y-auto p-4 scrollbar-thin bg-slate-50/80">
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">
                    All AI Capabilities
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {AI_FEATURES.map((feat) => (
                      <button
                        key={feat.label}
                        onClick={() => setActiveTab('chat')}
                        className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 transition-all text-left group cursor-pointer shadow-xs"
                      >
                        <span className="text-xl">{feat.icon}</span>
                        <div>
                          <p className="text-xs font-extrabold text-slate-800 leading-tight group-hover:text-teal-800">
                            {feat.label}
                          </p>
                          <p className="text-[9px] text-slate-400 group-hover:text-teal-600">{feat.sublabel}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Language Support */}
                  <div className="mt-4 p-3 rounded-2xl bg-gradient-to-br from-teal-50 to-indigo-50 border border-teal-200/70">
                    <p className="text-[11px] font-black text-teal-800 mb-2">🌐 Multi-Language Support</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['English', 'தமிழ் (Tamil)', 'हिंदी (Hindi)', 'More soon...'].map((l) => (
                        <span
                          key={l}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-teal-800 border border-teal-200 shadow-xs"
                        >
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Clinical Grounding Note */}
                  <div className="mt-3 p-3 rounded-2xl bg-white border border-amber-200/70">
                    <p className="text-[10px] font-bold text-amber-800">
                      ⚕️ Clinically Grounded · Responses verified against your hospital records ·
                      ABDM-integrated · Non-diagnostic AI assistance
                    </p>
                  </div>
                </div>
              )}

              {/* CHAT TAB */}
              {activeTab === 'chat' && (
                <>
                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin bg-slate-50/60">
                    {messages.map((msg) => {
                      const isAi = msg.sender === 'ai';
                      return (
                        <div key={msg.id} className={`flex gap-2.5 ${isAi ? 'justify-start' : 'justify-end'}`}>
                          {isAi && (
                            <div
                              className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shadow-xs flex-shrink-0 mt-0.5"
                              style={{ background: 'linear-gradient(135deg,#0d9488,#6366f1)' }}
                            >
                              <AiBrainIcon size={14} />
                            </div>
                          )}
                          <div
                            className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                              isAi
                                ? 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-none'
                                : 'text-white rounded-tr-none'
                            }`}
                            style={
                              !isAi
                                ? {
                                    background: 'linear-gradient(135deg,#0d9488,#0f766e)',
                                    boxShadow: '0 4px 12px rgba(13,148,136,0.3)',
                                  }
                                : {}
                            }
                          >
                            {msg.imageUrl && (
                              <div className="mb-2 rounded-xl overflow-hidden border border-white/20 max-h-40 bg-black/10">
                                <img src={msg.imageUrl} alt="Attached Record" className="w-full h-auto object-cover" />
                              </div>
                            )}
                            <div className="whitespace-pre-wrap font-medium">{msg.text}</div>

                            {msg.sources && msg.sources.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                                <span className="text-[10px] text-slate-400 font-bold">Grounded:</span>
                                {msg.sources.map((src, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[9px] font-mono bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded border border-teal-200 font-semibold"
                                  >
                                    {src.field}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div
                              className={`mt-1.5 flex items-center justify-between text-[10px] ${
                                isAi ? 'text-slate-400' : 'text-teal-200'
                              }`}
                            >
                              <span>{msg.timestamp}</span>
                              {isAi && (
                                <button
                                  onClick={() => speakText(msg.text, msg.id)}
                                  className={`flex items-center gap-1 font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                                    speakingMessageId === msg.id
                                      ? 'bg-teal-100 text-teal-800 animate-pulse'
                                      : 'hover:text-slate-700 hover:bg-slate-100'
                                  }`}
                                  title="Read Aloud"
                                >
                                  {speakingMessageId === msg.id ? '🔊 Speaking…' : '🔈 Read'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {loading && (
                      <div className="flex gap-2.5 items-center text-xs text-slate-500 bg-white p-3 rounded-2xl border border-slate-200 w-fit shadow-xs">
                        <span className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                        <span className="font-semibold text-teal-900">
                          {lang === 'ta'
                            ? 'AI ஆய்வு செய்கிறது…'
                            : lang === 'hi'
                            ? 'AI विश्लेषण कर रहा है…'
                            : 'AI is analyzing your records…'}
                        </span>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Quick Prompts */}
                  <div className="px-3 py-2 bg-white border-t border-slate-100 overflow-x-auto whitespace-nowrap scrollbar-thin flex gap-1.5">
                    {quickPrompts.map((p, idx) => {
                      const text = lang === 'ta' ? p.ta : lang === 'hi' ? p.hi : p.en;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(text)}
                          className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 hover:border-teal-300 text-[11px] font-semibold text-slate-700 transition-all cursor-pointer flex-shrink-0"
                        >
                          {p.emoji} {text}
                        </button>
                      );
                    })}
                  </div>

                  {/* Image preview */}
                  {attachedImage && (
                    <div className="px-3.5 py-1.5 bg-teal-50 border-t border-teal-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <img src={attachedImage} alt="Thumbnail" className="w-7 h-7 rounded-lg object-cover border border-teal-300" />
                        <span className="font-bold text-teal-900 text-[11px]">
                          {lang === 'ta' ? 'புகைப்படம் AI OCR ஆய்வுக்கு தயார்' : 'Photo ready for AI OCR Analysis'}
                        </span>
                      </div>
                      <button onClick={() => setAttachedImage(null)} className="text-slate-400 hover:text-rose-600 font-bold text-xs cursor-pointer">
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Voice Banner */}
                  {isListening && (
                    <div className="px-4 py-2 text-white text-xs font-bold flex items-center justify-between animate-pulse"
                      style={{ background: 'linear-gradient(90deg,#0d9488,#0891b2)' }}>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                        <span>
                          {lang === 'ta'
                            ? 'கேட்கிறது… (தமிழில் பேசுங்கள்)'
                            : lang === 'hi'
                            ? 'सुन रहा है… (हिंदी में बोलें)'
                            : 'Listening… (Speak now in your language)'}
                        </span>
                      </div>
                      <button onClick={toggleListening} className="text-white underline text-[11px] cursor-pointer">
                        Stop
                      </button>
                    </div>
                  )}

                  {/* Input Console */}
                  <div className="p-3 bg-white border-t border-slate-200">
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                      className="flex items-center gap-1.5"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePhotoSelect}
                        accept="image/*,.pdf"
                        className="hidden"
                      />

                      {/* Photo */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-700 border border-slate-200 hover:border-teal-300 flex items-center justify-center text-sm transition-all cursor-pointer flex-shrink-0 shadow-xs"
                        title="Attach Medical Photo / PDF"
                      >
                        <PhotoIcon />
                      </button>

                      {/* Voice */}
                      <button
                        type="button"
                        onClick={toggleListening}
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer flex-shrink-0 shadow-xs ${
                          isListening
                            ? 'bg-rose-600 text-white border-rose-500 animate-bounce'
                            : 'bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-700 border-slate-200 hover:border-teal-300'
                        }`}
                        title="Voice Input (Tamil, Hindi, English)"
                      >
                        <MicIcon isActive={isListening} />
                      </button>

                      {/* Text Input */}
                      <input
                        type="text"
                        value={inputQuery}
                        onChange={(e) => setInputQuery(e.target.value)}
                        placeholder={
                          lang === 'ta'
                            ? 'மருத்துவ கேள்வி கேட்கவும்…'
                            : lang === 'hi'
                            ? 'अपना सवाल पूछें…'
                            : 'Ask AI about your health records…'
                        }
                        className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-teal-500 focus:bg-white focus:outline-none transition-all shadow-inner"
                      />

                      {/* Send */}
                      <button
                        type="submit"
                        disabled={(!inputQuery.trim() && !attachedImage) || loading}
                        className="w-9 h-9 rounded-xl text-white flex items-center justify-center text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed flex-shrink-0 disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg,#0d9488,#0891b2)' }}
                        title="Send"
                      >
                        <SendIcon />
                      </button>
                    </form>

                    <p className="text-[9px] text-slate-400 text-center mt-1.5">
                      AI-assisted insights grounded to your hospital records · Non-diagnostic
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Normal & Clean AI Floating Trigger Button ── */}
      <div className="relative">
        <button
          id="ai-copilot-trigger"
          onClick={() => {
            setIsOpen(!isOpen);
            setIsMinimized(false);
          }}
          aria-label="Clinical AI Copilot"
          title="Clinical AI Copilot"
          className="w-14 h-14 rounded-full flex items-center justify-center cursor-pointer shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 bg-gradient-to-br from-teal-700 via-teal-800 to-indigo-950 border-2 border-teal-400/50 text-white"
        >
          {isOpen ? (
            <svg className="w-6 h-6 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          ) : (
            <AiBrainIcon size={28} className="text-cyan-200" animated={false} />
          )}
        </button>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes ai-scan {
          0% { transform: translateY(0); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(64px); opacity: 0; }
        }
        .animate-ai-scan {
          animation: ai-scan 2.5s ease-in-out infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out forwards;
        }
        .ai-copilot-panel {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

/* ── Icon Components ── */

function AiBrainIcon({ size = 20, className = 'text-cyan-300', animated = false }: { size?: number; className?: string; animated?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className={`${className} ${animated ? 'animate-pulse' : ''}`}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
      />
    </svg>
  );
}

function MicIcon({ isActive }: { isActive: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={isActive ? 'text-white' : 'text-slate-600'}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-slate-600">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
    </svg>
  );
}
