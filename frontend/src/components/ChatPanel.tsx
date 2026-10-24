import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Send,
  User,
  Volume2,
  Clock
} from 'lucide-react';
import { Card, ChatMessage, DocumentType } from '../types';
import { CardView } from './CardView';
import { SafeMarkdown } from '../utils/markdown';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  documentType: DocumentType;
  onFinishAndSummarize: () => void;
  onResetSession: () => void;
  isSessionExpired: boolean;
  onOpenMap?: () => void;
}

const RX_QUICK_CHIPS = [
  'When should I take each medicine?',
  'Explain my diagnosis and medicines simply',
  'Any side effects or warnings?',
  'Check interactions between my medicines',
  'How many tablets should I buy?',
  '🏥 Find nearest hospital & ICU',
  '💊 Find nearby 24/7 pharmacy'
];

const LAB_QUICK_CHIPS = [
  'Explain my results in simple words',
  'Which values are abnormal?',
  'What should I ask my doctor?',
  '🏥 Find nearest hospital & ICU'
];

const MAX_CHAR_LIMIT = 2000;

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  isLoading,
  documentType,
  onFinishAndSummarize,
  onResetSession,
  isSessionExpired,
  onOpenMap,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chips = documentType === 'prescription' ? RX_QUICK_CHIPS : LAB_QUICK_CHIPS;

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isLoading || isSessionExpired) return;
    setInputText('');
    await onSendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSpeech = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const clean = text.replace(/[*#_`-]/g, '');
      const u = new SpeechSynthesisUtterance(clean);
      u.rate = 1.1;
      window.speechSynthesis.speak(u);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-6 px-4 flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
      {/* Top Header Card */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-sm">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>Healthcare Copilot</span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Ask about doses, timings, food relation, interactions, or test values
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onFinishAndSummarize}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white text-xs font-semibold shadow-md shadow-brand-500/20 hover:opacity-95 transition-all min-h-[36px]"
        >
          <span>Finish &amp; Summarize</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Session Expired Recovery Flow */}
      {isSessionExpired && (
        <div className="mb-3 p-4 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span>Session expired (in-memory backend session reset). Please upload your document again to resume.</span>
          </div>
          <button
            type="button"
            onClick={onResetSession}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-all shadow-sm flex-shrink-0"
          >
            Upload Document Again
          </button>
        </div>
      )}

      {/* Chat Messages Feed */}
      <div
        className="flex-1 overflow-y-auto space-y-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40"
        aria-live="polite"
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isEmergency = msg.isEmergency;

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400 h-8 w-8 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm border border-brand-100 dark:border-brand-900">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm shadow-sm leading-relaxed ${
                  isUser
                    ? 'bg-brand-600 text-white rounded-tr-sm'
                    : isEmergency
                    ? 'bg-red-50 dark:bg-red-950/80 border-2 border-red-500 text-red-950 dark:text-red-100 rounded-tl-sm'
                    : 'bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/60 rounded-tl-sm'
                }`}
              >
                {/* Emergency instruction red callout */}
                {isEmergency && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 font-bold uppercase tracking-wider text-xs">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span>Immediate Action Required</span>
                  </div>
                )}

                <SafeMarkdown content={msg.content} />

                {/* Render any structured cards (Purchase or Images) */}
                {msg.cards && msg.cards.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.cards.map((card: Card, cIdx: number) => (
                      <CardView key={cIdx} card={card} />
                    ))}
                  </div>
                )}

                {/* Emergency map quick action card if emergency */}
                {isEmergency && onOpenMap && (
                  <div className="mt-3 p-3 rounded-xl bg-red-100 dark:bg-red-900/60 border border-red-300 dark:border-red-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🏥</span>
                      <span className="font-bold text-red-950 dark:text-red-100 text-xs">
                        Emergency Medical Map &amp; ICU Beds
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenMap}
                      className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>🗺️</span>
                      <span>Open Live Map HUD &rarr;</span>
                    </button>
                  </div>
                )}

                {/* Read aloud trigger on assistant bubbles */}
                {!isUser && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleSpeech(msg.content)}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 font-medium"
                      title="Read aloud"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      <span>Listen</span>
                    </button>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 h-8 w-8 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 h-8 w-8 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl rounded-tl-sm p-4 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-brand-500 animate-bounce" />
                <span className="h-2 w-2 rounded-full bg-brand-500 animate-bounce [animation-delay:0.2s]" />
                <span className="h-2 w-2 rounded-full bg-brand-500 animate-bounce [animation-delay:0.4s]" />
              </div>
              <span>Healthcare Copilot is analyzing clinical data…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick reply chips */}
      <div className="mt-3 overflow-x-auto pb-1 flex gap-2 no-scrollbar">
        {chips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isLoading || isSessionExpired}
            onClick={() => onSendMessage(chip)}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-all font-medium min-h-[36px]"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Form with 2000-char counter */}
      <div className="mt-2 relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500">
        <textarea
          ref={textareaRef}
          value={inputText}
          maxLength={MAX_CHAR_LIMIT}
          disabled={isLoading || isSessionExpired}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isSessionExpired ? 'Session expired. Please restart.' : 'Ask a question (e.g. "when to take Augmentin?", "side effects?")...'}
          rows={2}
          className="w-full text-xs sm:text-sm bg-transparent border-0 resize-none outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
        />

        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-[10px] text-slate-400 font-mono">
            {inputText.length} / {MAX_CHAR_LIMIT}
          </span>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[11px] text-slate-400">
              Press <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border">Enter</kbd> to send, <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border">Shift+Enter</kbd> for newline
            </span>
            <button
              type="button"
              disabled={!inputText.trim() || isLoading || isSessionExpired}
              onClick={handleSend}
              className="inline-flex items-center justify-center p-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-sm transition-all focus:outline-none min-h-[38px] min-w-[38px]"
              title="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
