import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { api, type UploadProgress } from '../api';



export default function Upload() {
  const { t, lang, profileId } = useApp();
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!profileId) {
      setError('Please select or create a profile before uploading.');
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|jfif)$/i.test(file.name);
    if (!isImage && !isPdf) {
      setError('Please upload a PDF, JPG, or PNG file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be smaller than 10MB');
      return;
    }

    setError(null);
    setIsLoading(true);
    setProgress({ step: 'reading', message: t('upload.stepReading') });

    try {
      const response = await api.uploadRecord(file, setProgress, profileId);
      navigate(`/verify/${response.record_id}`);
    } catch (err) {
      const message = err && typeof err === 'object' && 'error' in err
        ? (err as { error: { message: string } }).error.message
        : 'Upload failed. Please try again.';
      setError(message);
      setProgress(null);
    } finally {
      setIsLoading(false);
    }
  }, [navigate, t, profileId]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const openCamera = () => {
    fileInputRef.current?.click();
  };

  

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ── Radiant Hero Header ── */}
      <div className="text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200/80 mb-3 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
          <span>{lang === 'ta' ? 'மருத்துவ ஆவண AI பகுப்பாய்வு' : 'Clinical AI Vision OCR & Document Decoding'}</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {lang === 'ta' ? 'மருத்துவ ஆவணங்களைப் பதிவேற்றவும்' : 'Upload & Decode Health Documents'}
        </h1>
        <p className="text-slate-600 text-sm mt-1.5 max-w-2xl leading-relaxed">
          {lang === 'ta'
            ? 'மருத்துவரின் மருந்து சீட்டு, லேப் பரிசோதனை அறிக்கை அல்லது டிஸ்சார்ஜ் ஆவணங்களைப் பதிவேற்றுங்கள். எங்களின் AI கையெழுத்தை படித்து, மருந்து அட்டவணை மற்றும் இரத்த பரிசோதனை முடிவுகளை உடனடி விளக்கத்துடன் தரும்.'
            : 'Upload or photograph any lab report, doctor prescription, or hospital discharge summary. Our Clinical AI reads handwriting, extracts medications, verifies reference ranges, and generates bilingual summaries.'}
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mt-3 text-xs">
          {[
            { icon: '🛡️', label: 'Private & Secure • Local DB' },
            { icon: '⚡', label: 'Review all extracted values' },
            { icon: '🇮🇳', label: 'ABDM & FHIR R4 Ready' },
            { icon: '🔊', label: 'Voice Audio in தமிழ் & English' },
          ].map((pill) => (
            <span
              key={pill.label}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold shadow-2xs"
            >
              <span>{pill.icon}</span>
              <span>{pill.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Upload Drag & Drop Zone ── */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer
          transition-all duration-300 overflow-hidden
          ${isDragging 
            ? 'border-teal-500 bg-teal-50/70 scale-[1.01] shadow-xl' 
            : 'border-teal-300/80 bg-gradient-to-b from-white via-teal-50/20 to-emerald-50/30 hover:border-teal-500 hover:shadow-lg hover:bg-white'}
          ${isLoading ? 'opacity-70 pointer-events-none' : ''}
        `}
        style={{
          boxShadow: isDragging ? '0 12px 35px -8px rgba(13, 148, 136, 0.25)' : '0 8px 30px -6px rgba(0, 0, 0, 0.05)',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          onChange={onInputChange}
          className="hidden"
        />

        {!progress && !isLoading && (
          <div className="space-y-4">
            <div className="relative w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/25 group-hover:scale-105 transition-transform">
              <span className="text-3xl">📄</span>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white text-teal-700 border-2 border-teal-500 flex items-center justify-center text-xs font-black shadow-sm">
                +
              </div>
            </div>

            <div>
              <p className="text-lg font-bold text-slate-900">
                {lang === 'ta' ? 'ஆவணத்தை இங்கே இழுத்துப் போடவும்' : 'Drag & drop your document here'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {lang === 'ta' ? 'PDF, JPG, PNG (அதிகபட்சம் 10MB)' : 'Supports PDF, JPG, PNG up to 10MB • Clear photos give highest accuracy'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 max-w-sm mx-auto">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openCamera(); }}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm shadow-md shadow-teal-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>📷</span>
                <span>{lang === 'ta' ? 'கேமராவில் படம் எடு' : 'Snap with Camera'}</span>
              </button>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-teal-400 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>📁</span>
                <span>{lang === 'ta' ? 'கோப்பைத் தேர்ந்தெடு' : 'Browse Files'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Uploading / Extraction Animated Stepper ── */}
        {progress && (
          <div className="py-6 max-w-md mx-auto space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center shadow-inner">
              <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            </div>

            <div>
              <p className="text-base font-bold text-slate-900">
                {lang === 'ta' ? 'AI ஆவணத்தை ஆராய்கிறது…' : 'AI is decoding medical entities…'}
              </p>
              <p className="text-xs text-teal-700 font-semibold mt-1 animate-pulse">
                {progress.message}
              </p>
            </div>

            {/* Stepper items */}
            <div className="grid grid-cols-4 gap-2 text-[10px] font-bold text-slate-500 pt-2">
              {[
                { id: 'reading', label: '1. Reading', icon: '📄' },
                { id: 'extracting', label: '2. Vision AI', icon: '🤖' },
                { id: 'checking', label: '3. Ranges', icon: '⚖️' },
                { id: 'complete', label: '4. Summary', icon: '✅' },
              ].map((step) => {
                const isCurrent = progress.step === step.id;
                const isDone = (progress.step === 'complete') || (step.id === 'reading' && progress.step !== 'reading');
                return (
                  <div
                    key={step.id}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      isCurrent
                        ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-xs'
                        : isDone
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                        : 'bg-white/60 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="text-base mb-0.5">{step.icon}</div>
                    <div className="truncate">{step.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl flex items-center justify-between text-rose-800 text-sm shadow-xs">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="px-3 py-1 rounded-lg bg-white border border-rose-200 font-bold text-xs hover:bg-rose-100 cursor-pointer"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

    </div>
  );
}
